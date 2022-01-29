const _ = require('lodash')
const { nLog, eLog } = require('../util/rlogger')
const Task = require('../database/models/Task')

const createTask = async (request, response) => {
  const json = {}
  let subTaskIds = []
  let parentTaskId
  try {
    let subTasks = request.body.subtasks
    request.body.subtasks = []
    const parentTask = (await Task.create(request.body))
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
    json.message = 'success'
    json.task = parentTaskId
  } catch (e) {
    if (parentTaskId) {
      subTaskIds.push(parentTaskId)
    }
    if (subTaskIds.length) {
      await Task.deleteMany({ taskid: { $in: subTaskIds } })
    }
    eLog(`Error: ${e.message}`)
    json.message = 'error'
    json.errorMessage = e.message
  }
  response.status(200)
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
    return response.status(200).json({ result: task || {}, message: 'success' })
  } catch (e) {
    return response.status(500).json({ result: {}, message: 'error', errorMessage: e.message })
  }
}

const queryTasks = async (request, response) => {
  try {
    const { starttime, endtime, status, tags, taskid, limit = 1000 } = request.query
    let query = Task.find()
    if (starttime) {
      query = query.where('starttime').gte(new Date(starttime).toISOString())
    }
    if (endtime) {
      query = query.where('endtime').lte(new Date(endtime).toISOString())
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
      .exec()
    return response.status(200).json({ results: tasks || [], message: 'success' })
  } catch (e) {
    eLog(`Error: ${e.message}`)
    return response.status(500).json({ results: [], message: 'error', errorMessage: e.message })
  }
}

const deleteTask = async (request, response) => {
  try {
    const { taskid } = request.params
    const task = await Task.findOne({ taskid })
    if (_.isEmpty(task)) {
      return response.status(200).json({ message: 'error', errorMessage: 'No matching task found' })
    }
    if (task.subtasks && task.subtasks.length) {
      await Task.deleteMany({ _id: { $in: task.subtasks } })
    }
    return response.status(200).json({ results: await Task.findByIdAndDelete(task._id, { projection: { _id: 1, taskid: 1 } }) || {}, message: 'success' })
  } catch (e) {
    eLog(`Error: ${e.message}`)
    return response.status(500).json({ message: 'error', errorMessage: e.message })
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

module.exports = {
  createTask,
  queryTasks,
  queryTask,
  deleteTask,
  updateTask,
  report
}
