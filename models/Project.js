import mongoose from 'mongoose'

const projectStructure = {
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

export default mongoose.model('project', projectSchema)
