import mongoose from 'mongoose'

const userStructure = {
  id: mongoose.Types.ObjectId,
  username: {
    type: String,
    required: [true, 'Username is required'],
    immutable: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: (v) => {
        // TODO
      },
      message: props => `${props.value} is not a valid email`
    }
  },
  mobile: {
    type: String,
    default: '',
    validate: {
      validator: (v) => {
        // TODO
      },
      message: props => `${props.value} is not a valid number`
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: ''
  },
  signupDate: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}
const UserSchema = new mongoose.Schema(userStructure)

export default mongoose.model('user', UserSchema)
