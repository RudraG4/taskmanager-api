import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cors from 'cors'
import ratelimit from 'express-rate-limit'
import express from 'express'
import path from 'path'
import logger from 'morgan'

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

export default [
  process.env.NODE_ENV === 'dev' ? logger('dev') : logger('common'),
  helmet(),
  cors(corsOptions),
  ratelimit(rateLimitOptions),
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  cookieParser(),
  express.static(path.join(__dirname, 'public'))
]
