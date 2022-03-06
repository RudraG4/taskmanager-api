import mongoose from 'mongoose'

const projectStructure = {
  workspaceid: {
    type: mongoose.Types.ObjectId,
    ref: 'workspace'
  },
  projectid: mongoose.Types.ObjectId,
  projectname: {
    type: String,
    required: [true, 'projectname is required'],
    unique: true,
    maxlength: [250, 'projectname exceeds maximum 250 characters']
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

const projectSchema = new mongoose.Schema(projectStructure)

projectSchema.pre('save', function (next) {
  if (this.isNew) {
    this.projectid = this._id
  }
  next()
})

export default mongoose.model('project', projectSchema)
