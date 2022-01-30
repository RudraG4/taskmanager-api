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

const isOverlapping = async (starttime, endtime) => {
  let query = Task.find()
  if (starttime) {
    query = query.where('endtime').gte(starttime)
  }
  if (endtime) {
    query = query.where('starttime').lte(endtime)
  }
  if (!_.isEmpty(query.getFilter())) {
    query = query.where('status').in([TaskState.PLANNED, TaskState.INPROGRESS])
    return await query.count()
  }
  return Promise.resolve(0)
}

const createTask = async (request, response) => {
  let subTaskIds = []
  let subTasks = []
  let parentTaskId
  const data = request.body
  const json = {}
  try {
    if ((data.starttime && !isValidDate(data.starttime)) || (data.endtime && !isValidDate(data.endtime))) {
      json.status = 'failure'
      json.error = 'Invalid date format. Valid format YYYY-MM-DD HH:mm:ss'
      response.status(400)
      return response.json(json)
    }

    if (data.starttime) data.starttime = moment.utc(data.starttime)
    if (data.endtime) data.endtime = moment.utc(data.endtime)

    if (await isOverlapping(data.starttime, data.endtime)) {
      json.status = 'failure'
      json.error = 'Overlapping task start/endtime with one or more other tasks'
      response.status(400)
      return response.json(json)
    }

    if (!_.isEmpty(data.subtasks)) {
      subTasks = data.subtasks
      data.subtasks = []
    }
    const parentTask = (await Task.create(data))
    parentTaskId = parentTask.taskid

    if (subTasks && subTasks.length) {
      subTasks = subTasks.map(async (task) => {
        task.parenttask = parentTaskId
        return await Task.create(task)
      })
      subTaskIds = (await Promise.all(subTasks)).map((task) => task._id)
    }
    if (subTaskIds.length) {
      parentTask.subtasks = subTaskIds
      await parentTask.save()
    }

    json.status = 'success'
    json.task = parentTaskId
    response.status(200)
  } catch (e) {
    eLog(`Error: ${e.message}`)

    if (parentTaskId) {
      subTaskIds.push(parentTaskId)
    }
    if (subTaskIds.length) {
      await Task.deleteMany({ taskid: { $in: subTaskIds } })
    }

    json.status = 'failure'
    json.error = e.errors || e.message
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
    return response.status(500).json({ result: {}, status: 'failure', error: e.message })
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
    nLog('Filter ' + JSON.stringify(query.getFilter()))
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
    return response.status(500).json({ results: [], status: 'failure', error: e.message })
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
    return response.status(200).json({ results: await Task.findByIdAndDelete(task._id, { projection: { _id: 1, taskid: 1 } }) || {}, status: 'success' })
  } catch (e) {
    eLog(`Error: ${e.message}`)
    return response.status(500).json({ status: 'failure', error: e.message })
  }
}

// TODO
const updateTask = async (request, response) => {
  nLog('Updating Task')
  response.status(200).send('Tasks: ')
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
