import dotenv from 'dotenv'
import db from '../db/database.js'
import { MongoError } from 'mongodb'
import { eLog, nLog } from '../util/rlogger.js'

dotenv.config()
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
    eLog(`Error connecting.. ${error}`)
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

export default { init }
