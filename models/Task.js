import mongoose from 'mongoose'
import Sequence from './Sequence.js'
import STATES from './TaskState.js'

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
  tasktype: {
    type: String,
    required: [true, 'Task Type (SwimLane) is required']
  },
  starttime: Date,
  endtime: Date,
  userid: {
    type: String,
    required: [true, 'User is required']
  },
  status: {
    type: String,
    default: STATES.NEW,
    validate: {
      validator: (v) => !(v && ![...Object.values(STATES)].includes(v)),
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
    body: { type: String, required: [true, 'Comment Body is required'], maxLength: [250, 'Comment exceeds max size 250'] },
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
      if (this.parenttask) {
        this.taskid = `${this.parenttask}#T-${('00' + sequence.seq).slice(-2)}`
      } else {
        this.taskid = `T-${('00' + sequence.seq).slice(-2)}`
      }
    } else {
      this.updated = new Date().toISOString()
    }
    next()
  } catch (error) {
    next(error)
  }
})

export default mongoose.model('task', TaskSchema)
