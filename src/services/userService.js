import { Success, Failure } from '../dto/dto.js'
import User from '../models/User.js'

export const findByUserNameOrEmail = async ({ username, email }, selectFields = '') => {
  if (username || email) {
    const select = '-__v ' + selectFields
    return await User.findOne({ $or: [{ username }, { email }] })
      .select(select)
  }
  return null
}

const findUser = async (request, response) => {
  try {
    const { username } = request.params
    const user = await findByUserNameOrEmail({ username }, '-password')
    if (!user) {
      return Failure(response, 200, `${username} username is not available`)
    }
    return Success(response, 200, user.toJSON())
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const createUser = async (request, response) => {
  try {
    const user = await User.create(request.body)
    return Success(response, 200, user.toJSON())
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const updateUser = async (request, response) => {
  try {
    const payload = request.body
    const { username } = request.params
    const options = { runValidators: true, new: true, lean: true, projection: { _id: 0, __v: 0, password: 0 } }
    const updatedUser = User.findOneAndUpdate({ username }, payload, options)
    return Success(response, 200, updatedUser.toJSON())
  } catch (error) {
    return Failure(response, 500, error)
  }
}

export default {
  createUser,
  updateUser,
  findUser
}
