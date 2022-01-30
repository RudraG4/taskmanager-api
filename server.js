import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import tasks from './routes/tasks.js' // Task Routes
import { marked } from 'marked' // Markdown parser
import { rLog, eLog, nLog } from './util/rlogger.js' // Simple Colored Loggers
import db from './database/connection.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(rLog)

app.use('/api/v1/tasks', tasks)

app.get('/', async (req, res) => {
  const readmePath = path.resolve(__dirname, 'README.md')
  await fs.readFile(readmePath, (err, data) => {
    if (err) {
      return res.status(500).send(err)
    }
    return res.status(200).send(marked.parse(data.toString()))
  })
})

const run = async () => {
  try {
    await db.connectDB()
    app.listen(port, nLog(`Server is listening on port ${port}`))
  } catch (e) {
    eLog(`Error connecting.. ${e}`)
  }
}

run()

process.on('beforeExit', db.disconnectDB)
process.on('SIGINT', db.disconnectDB)
