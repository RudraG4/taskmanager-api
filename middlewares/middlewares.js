import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import cors from 'cors'
import ratelimit from 'express-rate-limit'
import express from 'express'
import path from 'path'
import logger from 'morgan'
import { Failure } from '../dto/dto.js'
import auth from '../services/authService.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  methods: 'GET,POST,PATCH,DELETE',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept'],
  maxAge: 2500,
  optionsSuccessStatus: 200
}

const rateLimitOptions = {
  windowMs: process.env.RATE_LIMIT_REFRESH_TIME,
  max: process.env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false
}

export const basic = [
  process.env.NODE_ENV === 'dev' ? logger('dev') : logger('common'),
  helmet(),
  cors(corsOptions),
  ratelimit(rateLimitOptions),
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  express.static(path.join(__dirname, 'public'))
]

export const authenticate = async (request, response, next) => {
  try {
    const headers = request.headers
    if (headers.authorization && headers.authorization.startsWith('Bearer')) {
      const token = headers.authorization.split(' ')[1]
      const user = await auth.authenticate(token)
      if (user) {
        request.user = user
        next()
      } else {
        return Failure(response, 401, 'unauthorized_client')
      }
    } else {
      return Failure(response, 401, 'unauthorized_client')
    }
  } catch (err) {
    return Failure(response, 401, err)
  }
}
