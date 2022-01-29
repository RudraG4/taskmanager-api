const { nLog, eLog } = require('../util/rlogger')
const Task = require('../database/models/Task')

const createTask = async(request, response) => {
  const json = {}
  let subTaskIds = []
  let parentTaskId
  try {
    let subTasks = request.body.subtasks
    request.body.subtasks = []
    const parentTask = (await Task.create(request.body))
    parentTaskId = parentTask.taskid
    if (subTasks && subTasks.length) {
      subTasks = subTasks.map(async(task) => {
        task.parenttask = parentTaskId
        return await Task.create(task)
      })
    }
    subTaskIds = (await Promise.all(subTasks)).map((task) => task._id)
    parentTask.subtasks = subTaskIds
    await parentTask.save()
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

const queryTask = async(request, response) => {
  const task = await Task.findOne({ taskid: request.params.taskid }).populate('subtasks')
  response.status(200).json(task || {})
}

// TODO
const queryTasks = async(request, response) => {
  nLog('Querying Tasks')
  response.status(200).send('Tasks: ')
}

// TODO
const deleteTask = async(request, response) => {
  nLog('Deleting Task')
  response.status(200).send('Tasks: ')
}

// TODO
const updateTask = async(request, response) => {
  nLog('Updating Task')
  response.status(200).send('Tasks: ')
}

// TODO
const report = async(request, response) => {
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
