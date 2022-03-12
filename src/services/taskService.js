import _ from 'lodash'
import moment from 'moment'
import Task from '../models/Task.js'
import { TaskState } from '../models/TaskConstants.js'
import { Success, Paginate, Failure } from '../dto/dto.js'
import { nLog, eLog } from '../util/rlogger.js'

const isValidDate = (datetime) => moment(datetime, 'YYYY-MM-DD HH:mm:ss').isValid()

const formatToUTC = (datetime) => datetime ? moment.utc(datetime).format('YYYY-MM-DD HH:mm:ss') : datetime

const formatter = (tasks) => {
  if (_.isEmpty(tasks)) return tasks
  if (!_.isArray(tasks)) tasks = [tasks]
  return tasks.map((task) => {
    task.starttime = formatToUTC(task.starttime)
    task.endtime = formatToUTC(task.endtime)
    task.subtasks = formatter(task.subtasks)
    return task
  })
}

const isOverlapping = async (starttime, endtime, taskid) => {
  if (!starttime && !endtime) return 0
  let query = Task.find()
  if (starttime) query = query.where('endtime').gte(starttime)
  if (endtime) query = query.where('starttime').lte(endtime)
  if (taskid) query = query.where('taskid').ne(taskid)
  query = query.where('status').in([TaskState.PLANNED, TaskState.INPROGRESS])
  return await query.count()
}

const validate = async (task) => {
  if ((task.starttime && !isValidDate(task.starttime)) || (task.endtime && !isValidDate(task.endtime))) {
    throw new Error('Invalid date format. Valid format YYYY-MM-DD HH:mm:ss')
  }

  if (task.starttime) task.starttime = moment.utc(task.starttime)
  if (task.endtime) task.endtime = moment.utc(task.endtime)

  if (await isOverlapping(task.starttime, task.endtime, task.taskid)) {
    throw new Error('Task start/endtime overlaps with one or more other tasks')
  }
}

const createTask = async (request, response) => {
  let subTaskIds = []
  let parentTaskId
  const data = request.body
  try {
    let subTasks = []
    if (!_.isEmpty(data.subtasks)) {
      subTasks = data.subtasks
      data.subtasks = []
    }

    await validate(data)
    const parentTask = await Task.create(data)
    parentTaskId = parentTask.taskid

    if (subTasks && subTasks.length) {
      subTasks = subTasks.map((subtask) => {
        subtask = {
          projectid: data.projectid,
          parenttask: parentTaskId,
          taskname: subtask.taskname,
          description: subtask.description,
          priority: data.priority,
          assignee: subtask.assignee || data.assignee
        }
        return Task.create(subtask)
      })
      subTaskIds = (await Promise.all(subTasks)).map((task) => task._id)
      if (subTaskIds.length) {
        parentTask.subtasks = subTaskIds
        await parentTask.save()
      }
    }
    return Success(response, 200, { taskid: parentTaskId })
  } catch (error) {
    eLog(`Error: ${error.message}`)
    if (parentTaskId) {
      setTimeout(async () =>
        await Task.deleteMany({ $or: [{ taskid: { $regex: parentTaskId + '.*' } }, { _id: { $in: subTaskIds } }] }),
      1000)
    }
    return Failure(response, 500, error)
  }
}

const queryTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const { projectid } = request.query
    const task = await Task.findOne({ taskid, projectid })
      .select('-__v -_id')
      .lean()
      .populate('subtasks', '-__v -_id')
      .transform(formatter).limit(1)
    return Success(response, 200, task && task.length ? task[0] : {})
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const queryTasks = async (request, response) => {
  try {
    const { starttime, endtime, status, tags, taskid, projectid } = request.query
    const limit = parseInt(request.query.limit, 10) || 1000
    const page = parseInt(request.query.page, 10) || 1

    if ((starttime && !isValidDate(starttime)) || (endtime && !isValidDate(endtime))) {
      return Failure(response, 400, 'Invalid date format. Valid format YYYY-MM-DD HH:mm:ss')
    }
    let query = Task.find()
    if (starttime) {
      query = query.where('starttime').gte(moment.utc(starttime))
    }
    if (endtime) {
      query = query.where('endtime').lte(moment.utc(endtime))
    }
    if (status) {
      query = query.where('status').equals(status)
    }
    if (tags) {
      query = query.where('tags').in(tags.split(','))
    }
    if (taskid) {
      query = query.where('taskid').equals(taskid)
    }
    query = query.where('projectid').equals(projectid)
    query = query.where('parenttask').equals(null)
    const total = await Task.countDocuments(query.getFilter()).exec()
    const tasks = await query
      .sort({ starttime: 1, taskid: 1 })
      .select('-_id -__v')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .populate('subtasks', '-__v -_id -links -tags -comments')
      .transform(formatter)
      .exec()
    return Paginate(response, 200, { results: tasks || [], limit, total: total, totalpages: Math.ceil(total / limit, 10), currentpage: page })
  } catch (error) {
    eLog(`Error: ${error.message}`)
    return Failure(response, 500, error)
  }
}

const deleteTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const { projectid } = request.query
    const task = await Task.findOne({ taskid, projectid })
    if (_.isEmpty(task)) {
      return Failure(response, 404, 'No matching task found')
    }
    if (task.subtasks && task.subtasks.length) {
      await Task.deleteMany({ _id: { $in: task.subtasks } })
    }
    const deleteRecord = await Task.findByIdAndDelete(task._id, { projection: { _id: 1, taskid: 1 } })
    if (task.parenttask) {
      const parenttask = await Task.findOne({ taskid: task.parenttask })
      if (parenttask && parenttask.subtasks && parenttask.subtasks.indexOf(deleteRecord._id) !== -1) {
        parenttask.subtasks.splice(parenttask.subtasks.indexOf(deleteRecord._id), 1)
        parenttask.save()
      }
    }
    return Success(response, 200, deleteRecord)
  } catch (error) {
    eLog(`Error: ${error.message}`)
    return Failure(response, 500, error)
  }
}

const updateTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const { projectid } = request.query
    const task = await Task.findOne({ taskid, projectid })
    if (_.isEmpty(task)) {
      return Failure(response, 404, 'No matching task found')
    }
    const data = request.body
    if (_.has(data, 'taskname')) task.taskname = data.taskname
    if (_.has(data, 'description')) task.description = data.description
    if (_.has(data, 'priority')) task.priority = data.priority
    if (_.has(data, 'tags')) task.tags = data.tags || []
    if (_.has(data, 'links')) task.links = data.links || []
    if (_.has(data, 'status')) task.status = data.status
    if (!task.parenttask) {
      if (_.has(data, 'starttime')) task.starttime = data.starttime
      if (_.has(data, 'endtime')) task.endtime = data.endtime
      await validate(task)
    }
    return Success(response, 200, await Task.findOneAndUpdate({ taskid, projectid }, task, { runValidators: true, new: true, lean: true, projection: { _id: 0, __v: 0 } }) || {})
  } catch (error) {
    eLog(`Error: ${error.message}`)
    return Failure(response, 500, error)
  }
}

const addSubTask = async (request, response) => {
  try {
    const data = request.body
    const parenttask = request.params.taskid
    const task = await Task.findOne({ taskid: parenttask, projectid: data.projectid })
    if (!task) {
      return Failure(response, 400, 'No matching parenttask found in project')
    }
    const subtask = {
      projectid: task.projectid,
      parenttask,
      taskname: data.taskname,
      description: data.description,
      priority: data.priority || task.priority,
      assignee: data.assignee || task.assignee
    }
    const subtaskdetails = await Task.create(subtask)
    task.subtasks.push(subtaskdetails._id)
    await task.save()
    return Success(response, 200, subtaskdetails)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const editSubTask = async (request, response) => {
  try {
    const data = request.body
    const parenttask = request.params.taskid
    const subtaskid = request.params.subtaskid
    const subtask = await Task.findOne({ parenttask, taskid: subtaskid, projectid: data.projectid })
    if (!subtask) {
      return Failure(response, 400, 'No matching parenttask found in project')
    }
    if (_.has(data, 'taskname')) subtask.taskname = data.taskname
    if (_.has(data, 'description')) subtask.description = data.description
    if (_.has(data, 'priority')) subtask.priority = data.priority
    if (_.has(data, 'tags')) subtask.tags = data.tags || []
    if (_.has(data, 'links')) subtask.links = data.links || []
    if (_.has(data, 'status')) subtask.status = data.status
    const subtaskdetails = await subtask.save()
    return Success(response, 200, subtaskdetails)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

// TODO
const report = async (request, response) => {
  nLog('Reporting Task')
  return Success(response, 200, 'Tasks: ')
}

export default {
  createTask,
  queryTasks,
  queryTask,
  deleteTask,
  updateTask,
  addSubTask,
  editSubTask,
  report
}
