import { Success, Failure } from '../dto/dto.js'
import User from '../models/User.js'

export const findByEmail = async (email) => {
  if (email) {
    return await User.findOne({ email })
      .select('-__v -_id')
  }
  return null
}

export const findByUserName = async (username, selectFields = '') => {
  if (username) {
    const select = '-__v -_id ' + selectFields
    return await User.findOne({ username })
      .select(select)
  }
  return null
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

export const createUser = async (request, response) => {
  try {
    const userData = request.body
    await User.create(userData)
    delete userData.password
    return Success(response, 200, userData)
  } catch (error) {
    return Failure(response, 500, error)
  }
}
