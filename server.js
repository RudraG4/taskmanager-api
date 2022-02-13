import { fileURLToPath } from 'url'
import logger from 'morgan'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import express from 'express'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import cors from 'cors'
import ratelimit from 'express-rate-limit'
import { marked } from 'marked'
import { eLog, nLog } from './util/rlogger.js'
import signupRoute from './routes/signupRoute.js'
import userRoute from './routes/userRoute.js'
import tasksRoute from './routes/tasksRoute.js'
import db from './db/connection.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const port = process.env.PORT || 5000
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  methods: 'GET,POST,PATCH,DELETE',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept'],
  maxAge: 2500,
  optionsSuccessStatus: 200
}

const ratelimitter = ratelimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 100, // 100 Requests
  standardHeaders: true,
  legacyHeaders: false
})

const app = express()
if (process.env.NODE_ENV === 'dev') {
  app.use(logger('dev'))
} else {
  app.use(logger('common'))  
}
app.use(helmet())
app.use(cors(corsOptions))
app.use(ratelimitter)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/v1', signupRoute)
app.use('/api/v1/users', userRoute)
app.use('/api/v1/tasks', tasksRoute)

app.get('/', async (req, res) => {
  const readmePath = path.resolve(__dirname, 'README.md')
  await fs.readFile(readmePath, (err, data) => {
    if (err) {
      return res.status(500).send(err)
    }
    return res.status(200).send(marked.parse(data.toString()))
  })
})

app.use((request, response) => {
  return response.status(404).send({ status: 404, error: 'Not Found' })
})

const init = async () => {
  try {
    await db.connectDB()
    app.listen(port, nLog(`Server is listening on port ${port}`))
  } catch (e) {
    eLog(`Error connecting.. ${e}`)
  }
}

init()

process.on('beforeExit', db.disconnectDB)
process.on('SIGINT', db.disconnectDB)
