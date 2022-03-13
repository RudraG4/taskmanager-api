import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { createUser, findByEmail, findByUserName } from './userService.js'
import { Success, Failure } from '../dto/dto.js'
import * as bcrypt from 'bcrypt'

dotenv.config()
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
    const data = request.body
    const _user = await findByUserName(data.username)
    if (_user) {
      const _links = { signin: { href: `${request.baseUrl}/signin` } }
      return Failure(response, 200, `${data.username} username is not available`, _links)
    }
    const _email = await findByEmail(data.email)
    if (_email) {
      return Failure(response, 200, `${data.username} email is already used`)
    }
    const salt = await bcrypt.genSalt()
    data.password = await bcrypt.hash(data.password, salt)
    request.body = data
    return await createUser(request, response)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const signin = async (request, response) => {
  try {
    const data = request.body
    const _user = await findByUserName(data.username)
    if (!_user) {
      const _links = { signup: { href: `${request.baseUrl}/signup` } }
      return Failure(response, 200, `${data.username} user doesnot exists`, _links)
    }
    if (await bcrypt.compare(data.password, _user.password)) {
      const signPayload = {
        email: _user.email, 
        user: _user.username, 
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

const authenticate = async (token) => {  
  try {
    const { payload } = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS)
    return await findByUserName(payload.user, '-password')
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error('invalid access_token')
    }
  }
}

export default {
  signup,
  signin,
  authenticate
}
