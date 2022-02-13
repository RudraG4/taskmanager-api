import _ from 'lodash'
import moment from 'moment'
import Task from '../database/models/Task.js'
import TaskState from '../database/models/TaskState.js'
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

const validate = async (task, parent) => {
  if ((task.starttime && !isValidDate(task.starttime)) || (task.endtime && !isValidDate(task.endtime))) {
    throw new Error('Invalid date format. Valid format YYYY-MM-DD HH:mm:ss')
  }

  if (task.starttime) task.starttime = moment.utc(task.starttime)
  if (task.endtime) task.endtime = moment.utc(task.endtime)

  if (parent) {
    task.parenttask = parent.taskid
    if (parent.starttime && task.starttime && !moment(task.starttime).isBetween(parent.starttime, parent.endtime, undefined, '[]')) {
      throw new Error('Subtask start/endtime must be within parents timeline')
    }
    if (parent.endtime && task.endtime && !moment(task.endtime).isBetween(parent.starttime, parent.endtime, undefined, '[]')) {
      throw new Error('Subtask start/endtime must be within parents timeline')
    }
  } else if (await isOverlapping(task.starttime, task.endtime, task.taskid)) {
    throw new Error('Task start/endtime overlaps with one or more other tasks')
  }
}

const create = async (task, parent) => {
  await validate(task, parent)
  return Task.create(task)
}

const createTask = async (request, response) => {
  let subTaskIds = []
  let parentTaskId
  const data = request.body
  const json = {}
  try {
    let subTasks = []
    if (!_.isEmpty(data.subtasks)) {
      subTasks = data.subtasks
      data.subtasks = []
    }

    const parentTask = await create(data)
    parentTaskId = parentTask.taskid

    if (subTasks && subTasks.length) {
      subTasks = subTasks.map((subtask) => create(subtask, parentTask))
      subTaskIds = (await Promise.all(subTasks)).map((task) => task._id)
      if (subTaskIds.length) {
        parentTask.subtasks = subTaskIds
        await parentTask.save()
      }
    }

    json.status = 'success'
    json.task = parentTaskId
    response.status(200)
  } catch (e) {
    eLog(`Error: ${e.message}`)

    if (parentTaskId) {
      setTimeout(async () =>
        await Task.deleteMany({ $or: [{ taskid: { $regex: parentTaskId + '.*' } }, { _id: { $in: subTaskIds } }] }),
      1000)
    }

    json.status = 'failure'
    json.error = e.message
    response.status(500)
  }
  nLog(`Returning: ${JSON.stringify(json)}`)
  return response.json(json)
}

const queryTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const task = await Task.findOne({ taskid })
      .select('-__v')
      .lean()
      .populate('subtasks', '-__v')
      .transform(formatter)
    return response.status(200).json({ result: task || {}, status: 'success' })
  } catch (e) {
    return response.status(500).json({ status: 'failure', error: e.message })
  }
}

const queryTasks = async (request, response) => {
  try {
    const { starttime, endtime, status, tags, taskid, limit = 1000 } = request.query
    if ((starttime && !isValidDate(starttime)) || (endtime && !isValidDate(endtime))) {
      return response.status(400)
        .json({ status: 'failure', error: 'Invalid date format. Valid format YYYY-MM-DD HH:mm:ss' })
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
    if (_.isEmpty(query.getFilter())) {
      query = query.where('parenttask').equals(null)
    }
    const tasks = await query.limit(+limit)
      .sort('+starttime')
      .select('-__v')
      .lean()
      .populate('subtasks', '-__v')
      .transform(formatter)
      .exec()
    return response.status(200).json({ results: tasks || [], status: 'success' })
  } catch (e) {
    eLog(`Error: ${e.message}`)
    return response.status(500).json({ status: 'failure', error: e.message })
  }
}

const deleteTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const task = await Task.findOne({ taskid })
    if (_.isEmpty(task)) {
      return response.status(200).json({ status: 'failure', error: 'No matching task found' })
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
    return response.status(200).json({ result: deleteRecord || {}, status: 'success' })
  } catch (e) {
    eLog(`Error: ${e.message}`)
    return response.status(500).json({ status: 'failure', error: e.message })
  }
}

const updateTask = async (request, response) => {
  const json = {}
  try {
    const { taskid } = request.params
    const task = await Task.findOne({ taskid })
    if (_.isEmpty(task)) {
      return response.status(200).json({ status: 'failure', error: 'No matching task found' })
    }
    const data = request.body
    if (_.has(data, 'description')) task.description = data.description
    if (_.has(data, 'starttime')) task.starttime = data.starttime
    if (_.has(data, 'endtime')) task.endtime = data.endtime
    if (_.has(data, 'tags')) task.tags = data.tags || []
    if (_.has(data, 'links')) task.links = data.links || []
    if (_.has(data, 'status')) task.status = data.status
    let parentTask
    if (task.parenttask) parentTask = await Task.findOne({ taskid: task.parenttask })
    await validate(task, parentTask)
    json.status = 'success'
    json.result = await Task.updateOne({ taskid }, task, { runValidators: true, new: true })
    response.status(200)
  } catch (e) {
    eLog(`Error: ${e.message}`)
    json.status = 'failure'
    json.error = e.message
    response.status(500)
  }
  nLog(`Returning: ${JSON.stringify(json)}`)
  return response.json(json)
}

// TODO
const report = async (request, response) => {
  nLog('Reporting Task')
  response.status(200).send('Tasks: ')
}

export default {
  createTask,
  queryTasks,
  queryTask,
  deleteTask,
  updateTask,
  report
}
