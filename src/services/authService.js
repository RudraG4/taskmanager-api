import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
import { nanoid } from 'nanoid'
import { Success, Failure } from '../dto/dto.js'
import User from '../models/User.js'
import cache from '../database/cache.js'

config()

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const JWT_ACCESS_EXPIRY = parseInt(process.env.JWT_ACCESS_EXPIRY, 10) || 900
const JWT_REFRESH_EXPIRY = parseInt(process.env.JWT_REFRESH_EXPIRY, 10) || 1800

const JWT_ACCESS_SIGN_OPTION = {
  expiresIn: JWT_ACCESS_EXPIRY
}

const JWT_REFRESH_SIGN_OPTION = {
  expiresIn: JWT_REFRESH_EXPIRY
}

const JWT_VERIFY_OPTIONS = {
  complete: true
}

const findByUserNameOrEmail = async ({ username, email }, selectFields = '') => {
  if (username || email) {
    const select = '-__v ' + selectFields
    return await User.findOne({ $or: [{ username }, { email }] })
      .select(select).exec()
  }
  return null
}

const generateAccessToken = (payLoad) => {
  if (!payLoad) {
    return null
  }
  const signPayload = {
    userinfo: {
      email: payLoad.email,
      username: payLoad.username,
      usid: `${payLoad._id}_${Date.now()}`
    },
    createat: Date.now()
  }
  return jwt.sign(signPayload, JWT_ACCESS_SECRET, JWT_ACCESS_SIGN_OPTION)
}

const generateRefreshToken = (payLoad) => {
  if (!payLoad) {
    return null
  }
  const signPayload = { ...payLoad, createat: Date.now() }
  return jwt.sign(signPayload, JWT_REFRESH_SECRET, JWT_REFRESH_SIGN_OPTION)
}

const signup = async (request, response) => {
  try {
    const { username, email, password, fullname } = request.body
    if (!username || !email || !password || !fullname) {
      return Failure(response, 400, 'username, email, password, fullname is required')
    }
    const user = await findByUserNameOrEmail({ username, email }, '-password')
    if (user) {
      return Failure(response, 409, 'Username/Email already exists. Try sigining in', { signin: { href: `${request.baseUrl}/signin` } })
    }
    const newUser = (await User.create(request.body)).toJSON()
    User.emit('signup-success', newUser)
    return Success(response, 201, newUser)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const signin = async (request, response) => {
  try {
    const { username, email, password } = request.body
    if (!username && !email) {
      return Failure(response, 401, 'username/email is required')
    }
    if (!password) {
      return Failure(response, 401, 'password is required')
    }
    const user = await findByUserNameOrEmail({ username, email })
    if (!user) {
      return Failure(response, 401, 'User doesnot exist. Try signing up', { signup: { href: `${request.baseUrl}/signup` } })
    }
    if (!await user.comparePassword(password)) {
      return Failure(response, 401, 'Incorrect password')
    }
    const accessToken = generateAccessToken({ username: user.username, email: user.email, _id: user._id })
    const refreshToken = generateRefreshToken({ username: user.username, email: user.email })
    user.refreshToken = refreshToken
    await user.save()
    const cookieOptions = {
      maxAge: JWT_REFRESH_EXPIRY,
      expires: JWT_REFRESH_EXPIRY,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    }
    response.cookie('JWTRT', refreshToken, cookieOptions)
    return Success(response, 200, { access_token: accessToken, expires_in: JWT_ACCESS_EXPIRY, token_type: 'Bearer' })
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const signout = async (request, response) => {
  try {
    const cookies = request.cookies
    if (!cookies?.JWTRT) {
      return Success(response, 204)
    }
    const refreshToken = cookies.JWTRT
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    }
    const user = await User.findOne({ refreshToken }).exec()
    if (!user) {
      response.clearCookie('JWTRT', cookieOptions)
      return Success(response, 204)
    }
    user.refreshToken = ''
    await user.save()
    response.clearCookie('JWTRT', cookieOptions)
    return Success(response, 200, 'Success')
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const refresh = async (request, response) => {
  try {
    const cookies = request.cookies
    if (!cookies?.JWTRT) {
      return Success(response, 204)
    }
    const refreshToken = cookies.JWTRT
    const { payload: { userinfo } } = jwt.verify(refreshToken, JWT_REFRESH_SECRET, JWT_VERIFY_OPTIONS)
    const user = await findByUserNameOrEmail(userinfo, '-password')
    if (!user) {
      return Failure(response, 401, 'User no longer exists')
    }
    const accessToken = generateAccessToken({ username: user.username, email: user.email, _id: user._id })
    return Success(response, 200, { access_token: accessToken, expires_in: JWT_ACCESS_EXPIRY, token_type: 'Bearer' })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return Failure(response, 401, 'Invalid refresh_token')
    }
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
    const pwdResetKey = [nanoid(), nanoid(), nanoid()].join('.')
    cache.set(pwdResetKey, JSON.stringify({ username: user.username, email: user.email }))
    const result = { resetkey: pwdResetKey, username: user.username, email: user.email }
    User.emit('password-reset-init', result)
    return Success(response, 200, result)
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
    if (!cacheValue) {
      return Failure(response, 400, 'Password Reset key has been expired or is invalid')
    }
    const user = await findByUserNameOrEmail(JSON.parse(cacheValue), '+_id')
    if (!user) {
      return Failure(response, 400, 'Username/Email is incorrect')
    }
    user.password = newpassword
    user.markModified('password')
    await user.save()
    User.emit('password-reset-success', user)
    return Success(response, 200, 'Password Reset successfuly')
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const authenticate = async (jwtToken) => {
  try {
    if (jwtToken) {
      const { payload: { userinfo } } = jwt.verify(jwtToken, JWT_ACCESS_SECRET, JWT_VERIFY_OPTIONS)
      return await findByUserNameOrEmail(userinfo, '-password')
    }
    return null
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access_token')
    }
  }
}

export default {
  signup,
  signin,
  signout,
  refresh,
  forgetpassword,
  resetpassword,
  authenticate
}
