import { config } from 'dotenv'
import db from '../database/database.js'
import { MongoError } from 'mongodb'
import { eLog, nLog } from '../util/rlogger.js'
import DEBUG from 'debug'

config()
const PORT = process.env.PORT || 5000
const RETRY_COUNT = process.env.RETRY_COUNT || 3

const init = async (app) => {
  try {
    if (app) {
      await db.connectDB()
      await db.initCollection()
      app.listen(PORT, nLog(`Server is listening on port ${PORT}`))
      process.on('beforeExit', db.disconnectDB)
      process.on('SIGINT', db.disconnectDB)
    }
  } catch (error) {
    eLog(`Error.. ${error}`)
    if (error instanceof MongoError) {
      if (init.retry <= RETRY_COUNT) {
        nLog(`Retrying... ${init.retry}`)
        init.retry++
        init(app)
      }
    }
    process.exit(1) 
  }
}

init.retry = 1

process.on('uncaughtException', (error) => {
  DEBUG(`uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  DEBUG(err)
  DEBUG('Unhandled Rejection:', {
    name: err.name,
    message: err.message || err
  })
  process.exit(1)
})

export default { init }
