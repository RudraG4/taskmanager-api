import express from 'express'
import taskService from '../services/taskService.js'

const tasks = express.Router()

// Create a new Task
tasks.post('/', taskService.createTask)

// Query All Tasks
tasks.get('/', taskService.queryTasks)

// Query a specific Task
tasks.get('/:taskid', taskService.queryTask)

// Delete a specific Task
tasks.delete('/:taskid', taskService.deleteTask)

// Update a specific Task
tasks.patch('/:taskid', taskService.updateTask)

// Add a subtask
tasks.post('/:taskid/subtask', taskService.addSubTask)

// Update a subtask
tasks.patch('/:taskid/subtask/:subtaskid', taskService.editSubTask)

// Query Task Report(Completed, InProgress, Todo etc.)
tasks.get('/report', taskService.report)

export default tasks
