import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
import { nanoid } from 'nanoid'
import userService, { findByUserNameOrEmail } from './userService.js'
import { Success, Failure } from '../dto/dto.js'
import cache from '../database/cache.js'
import User from '../models/User.js'

config()

const JWT_SECRET = process.env.JWT_SECRET
const EXPIRY = parseInt(process.env.JWT_EXPIRY, 10) || 86400

const SIGN_OPTIONS = {
  expiresIn: EXPIRY
}

const VERIFY_OPTIONS = {
  complete: true
}

const signup = async (request, response) => {
  try {
    const { username, email } = request.body
    const user = await findByUserNameOrEmail({ username, email }, '-password')
    if (user) {      
      const _links = { signin: { href: `${request.baseUrl}/signin` } }
      return Failure(response, 200, 'Username/Email already exists. Try sigining in', _links)
    }
    return await userService.createUser(request, response)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const signin = async (request, response) => {
  try {
    const { username, email, password } = request.body    
    const user = await findByUserNameOrEmail({ username, email })
    if (!user) {
      const _links = { signup: { href: `${request.baseUrl}/signup` } }
      return Failure(response, 200, 'User doesnot exist. Try signing up', _links)
    }
    if (await user.comparePassword(password)) {
      const signPayload = {
        email, 
        username, 
        url: `${request.baseUrl}${request.url}`,
        scope: 'read:admin'
      }
      const token = jwt.sign(signPayload, JWT_SECRET, SIGN_OPTIONS)
      const result = { access_token: token, expires_in: EXPIRY, token_type: 'Bearer' }
      return Success(response, 200, result)
    }
    return Failure(response, 401, 'Incorrect username or password')
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const forgetpassword = async (request, response) => {
  try {
    const { username, email } = request.body
    if (!username && !email) {
      return Failure(response, 400, 'Username/Email cannot be empty')
    }
    const user = await findByUserNameOrEmail({ username, email }, '-password')
    if (!user) {
      return Failure(response, 400, 'Username/Email is incorrect')
    }
    const pwdResetKey = nanoid()
    cache.set(pwdResetKey, JSON.stringify({ username: user.username, email: user.email }))
    return Success(response, 200, { resetkey: pwdResetKey, username: user.username, email: user.email })
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const resetpassword = async (request, response) => {
  try {
    const { resetkey, newpassword } = request.body
    if (!resetkey && !newpassword) {
      return Failure(response, 400, 'Password Reset params cannot be empty')
    }
    const cacheValue = cache.take(resetkey)
    if (cacheValue) {
      const user = await findByUserNameOrEmail(JSON.parse(cacheValue), '+_id')
      if (!user) {
        return Failure(response, 400, 'Username/Email is incorrect')
      }
      user.password = newpassword    
      user.markModified('password')
      await user.save()
      return Success(response, 200, 'Password Reset successfuly')
    }
    return Failure(response, 400, 'Password Reset key has been expired or is invalid')
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const authenticate = async (token) => {  
  try {
    if (token) {
      const { payload } = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS)
      return await findByUserNameOrEmail({ username: payload.user }, '-password')
    } 
    return null
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('invalid access_token')
    }
  }
}

export default {
  signup,
  signin,
  forgetpassword,
  resetpassword,
  authenticate
}
