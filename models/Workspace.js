import mongoose from 'mongoose'

const workspaceStructure = {
  workspaceid: mongoose.Types.ObjectId,
  workspacename: {
    type: String,
    required: [true, 'workspacename is required'],
    unique: true,
    maxlength: [250, 'Workspace name exceeds maximum 250 chars']
  },
  createdby: {
    type: String,
    required: true
  },
  createdat: {
    type: Date,
    immutable: true,
    default: Date.now
  }
}

const workspaceSchema = new mongoose.Schema(workspaceStructure)

workspaceSchema.pre('save', function (next) {
  if (this.isNew) {
    this.workspaceid = this._id
  }
  next()
})

export default mongoose.model('workspace', workspaceSchema)
