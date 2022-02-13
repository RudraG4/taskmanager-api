import { Success, Failure } from '../dto/dto.js'
import User from '../models/User.js'
import * as bcrypt from 'bcrypt'

const findByEmail = async (email) => {
  if (email) {
    return await User.findOne({ email })
      .select('-__v -_id')
  }
  return null
}

const findByUserName = async (username, selectFields = '') => {
  if (username) {
    const select = '-__v -_id ' + selectFields
    return await User.findOne({ username })
      .select(select)
  }
  return null
}

export const signup = async (request, response) => {
  try {
    const data = request.body
    const _user = await findByUserName(data.username)
    if (_user) {
      return Failure(response, 200, `${data.username} username is not available`)
    }
    const _email = await findByEmail(data.email)
    if (_email) {
      return Failure(response, 200, `${data.username} email is already used`)
    }
    const salt = await bcrypt.genSalt()
    data.password = await bcrypt.hash(data.password, salt)
    await User.create(data)
    delete data.password
    return Success(response, 200, data)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

export const findUser = async (request, response) => {
  try {
    const { username } = request.params
    const _user = await findByUserName(username, '-password')
    if (!_user) {
      return Failure(response, 200, `${username} username is not available`)
    }
    return Success(response, 200, _user)
  } catch (error) {
    return Failure(response, 500, error)
  }
}
