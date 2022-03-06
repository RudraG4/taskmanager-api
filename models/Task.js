import mongoose from 'mongoose'
import Sequence from './Sequence.js'
import { TaskState, TaskPrority } from './TaskConstants.js'
import User from './User.js'

const TaskStructure = {
  projectid: {
    type: mongoose.Types.ObjectId,
    ref: 'project',
    required: [true, 'Project Id is required']
  },
  parenttask: String,
  taskid: {
    type: String,
    index: true,
    unique: true
  },
  taskname: {
    type: String,
    required: [true, 'Task Name is required'],
    maxLength: [100, 'Task Name exceeds max size 100']
  },
  description: {
    type: String,
    maxLength: [250, 'Description exceeds max size 250']
  },
  priority: {
    type: String,
    default: TaskPrority.LOW,
    validate: {
      validator: (v) => !(v && ![...Object.values(TaskPrority)].includes(v)),
      message: props => `Unsupported value ${props.value} for priority`
    }
  },
  tasktype: String,
  lanename: String,
  starttime: Date,
  endtime: Date,
  assignee: {
    type: String,
    validate: {
      validator: async (username) => {
        try {
          if (username) {
            const user = await User.findOne({ username }).lean()
            if (!user) return false
          }
          return true
        } catch (error) {
          return false
        } 
      },
      message: props => `${props.value} is not a valid user`
    }
  },
  status: {
    type: String,
    default: TaskState.NEW,
    validate: {
      validator: (v) => !(v && ![...Object.values(TaskState)].includes(v)),
      message: props => `Unsupported value ${props.value} for status`
    }
  },
  subtasks: [{
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'task'
  }],
  tags: [String],
  links: [String],
  comments: [{
    body: { type: String, required: [true, 'Comment cannot be empty'], maxLength: [250, 'Comment exceeds max size 250'] },
    date: { type: Date, default: Date.now }
  }],
  created: {
    type: Date,
    immutable: true,
    default: Date.now
  },
  updated: {
    type: Date,
    immutable: true
  }
}

const TaskSchema = new mongoose.Schema(TaskStructure)

// Pre Hook(middleware) for the model. Auto Increment and Save
TaskSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const sequence = await Sequence.findOneAndUpdate({ model: 'Task', field: 'taskid' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true })
      this.taskid = `T-${('00' + sequence.seq).slice(-2)}`
    } else {
      this.updated = new Date().toISOString()
    }
    next()
  } catch (error) {
    next(error)
  }
})

export default mongoose.model('task', TaskSchema)
