import mongoose from 'mongoose'
import * as bcrypt from 'bcrypt'

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
      validator: (v) => /^[a-zA-Z0-9-_.+]+@[a-zA-Z0-9.-]+$/.test(v),
      message: props => `${props.value} is not a valid email`
    }
  },
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    minLength: 1,
    maxLength: 250
  },
  avatar: String,
  mobile: {
    type: String,
    default: '',
    validate: {
      validator: (v) => { if (v) { return /^(\+\d{1,3}[- ]?)?\d{10}$/.test(v) } return true },
      message: props => `${props.value} is not a valid mobile number`
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

UserSchema.pre('save', async function (next) {
  if (!this.isNew && !this.isModified('password')) {
    return next()
  }
  const salt = await bcrypt.genSalt()
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

UserSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  delete user._id
  delete user.__v
  return user
}

export default mongoose.model('user', UserSchema)
