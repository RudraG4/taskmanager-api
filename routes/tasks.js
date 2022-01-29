import express from 'express'
import taskController from '../controller/taskController.js'

const tasks = express.Router()

// Create a new Task
tasks.post('/', taskController.createTask)

// Query All Tasks
tasks.get('/', taskController.queryTasks)

// Query a specific Task
tasks.get('/:taskid', taskController.queryTask)

// Delete a specific Task
tasks.delete('/:taskid', taskController.deleteTask)

// Update a specific Task
tasks.patch('/:taskid', taskController.updateTask)

// Query Task Report(Completed, InProgress, Todo etc.)
tasks.get('/report', taskController.report)

export default tasks
