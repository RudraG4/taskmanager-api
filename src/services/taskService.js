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
  let parentTaskId
  let subTaskIds = []
  try {    
    await validate(request.body)

    const data = request.body
    let subTasks = data.subtasks || []
    delete data.subtasks
    
    const parentTask = await Task.create(data)
    parentTaskId = parentTask.taskid

    if (subTasks && subTasks.length) {
      subTasks = subTasks.map((subtask) => createSubTask(parentTask, subtask))
      subTaskIds = (await Promise.all(subTasks)).map((task) => task._id)
    }

    Task.emit('task-created', { parentTask, subTasks })
    return Success(response, 201, { taskid: parentTaskId })
  } catch (error) {
    eLog(`Error: ${error.message}`)
    Task.emit('task-create-error', { parentTaskId, subTaskIds })
    return Failure(response, 500, error)
  }
}

const createSubTask = async (parentTask, data) => {
  const subTaskDoc = {
    parenttask: parentTask.taskid,
    projectid: parentTask.projectid,
    taskname: data.taskname,
    description: data.description,
    priority: data.priority,
    assignee: data.assignee
  }
  const subTask = await Task.create(subTaskDoc)
  Task.emit('subtask-created', { parentTask, subTask })
  return subTask
}

const addSubTask = async (request, response) => {
  try {
    const subtask = request.body
    const parenttaskid = request.params.taskid
    const parenttask = await Task.findOne({ taskid: parenttaskid, projectid: subtask.projectid })
    if (_.isEmpty(parenttask)) {
      return Failure(response, 400, 'No matching parenttask found in project')
    }
    return Success(response, 201, await createSubTask(parenttask, subtask))
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const editSubTask = async (request, response) => {
  try {
    const data = request.body
    const parentTask = request.params.taskid
    const subTaskId = request.params.subtaskid
    const subTask = await Task.findOne({ parenttask: parentTask, taskid: subTaskId, projectid: data.projectid })
    if (_.isEmpty(subTask)) {
      return Failure(response, 400, 'No matching parenttask found in project')
    }
    if (_.has(data, 'taskname')) subTask.taskname = data.taskname
    if (_.has(data, 'description')) subTask.description = data.description
    if (_.has(data, 'priority')) subTask.priority = data.priority
    if (_.has(data, 'tags')) subTask.tags = data.tags || []
    if (_.has(data, 'links')) subTask.links = data.links || []
    if (_.has(data, 'status')) subTask.status = data.status
    const subTaskDetails = await subTask.save()
    return Success(response, 200, subTaskDetails)
  } catch (error) {
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
    if (_.isEmpty(task.parenttask)) {
      if (_.has(data, 'starttime')) task.starttime = data.starttime
      if (_.has(data, 'endtime')) task.endtime = data.endtime
      await validate(task)
    }
    const updatedTask = await Task.findOneAndUpdate({ taskid, projectid }, task, { runValidators: true, new: true, lean: true, projection: { _id: 0, __v: 0 } })
    Task.emit('task-updated', updatedTask)
    return Success(response, 200, updatedTask)
  } catch (error) {
    eLog(`Error: ${error.message}`)
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
    if (!_.isEmpty(task.parenttask)) {
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

// TODO
const report = async (request, response) => {
  nLog('Reporting Task')
  return Success(response, 200, 'Tasks: ')
}

Task.on('task-created', ({ parentTask, subTasks }) => {
  /** TODO: Trigger Mail Notification */
  nLog('task-created: parentTask ' + parentTask.taskid)
})

Task.on('task-updated', (updatedTask) => {
  /** TODO: Trigger Mail Notification */
  nLog('task-updated: updatedTask ' + updatedTask.taskid)
})

Task.on('task-create-error', ({ parentTaskId, subTaskIds }) => {
  nLog('task-create-error: parentTaskId ' + parentTaskId)
  nLog('task-create-error: subTaskIds ' + subTaskIds)
  if (parentTaskId && subTaskIds) {
    process.nextTick(async () => {
      await Task.deleteMany({ $or: [{ taskid: { $regex: parentTaskId + '.*' } }, { _id: { $in: subTaskIds } }] })
    })
  }
})

Task.on('subtask-created', async ({ parentTask, subTask }) => {
  try {
    nLog('subtask-created: parentTask ' + parentTask.taskid)
    nLog('subtask-created: subTask ' + subTask.taskid)
    if (parentTask) {
      parentTask.subtasks.push(subTask._id)
      await parentTask.save()
    }
  } catch (error) {
    
  }
})

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
