import dotenv from 'dotenv'
import db from './db/database.js'
import { eLog, nLog } from './util/rlogger.js'

dotenv.config()
const port = process.env.PORT || 5000
const RETRY_COUNT = process.env.RETRY_COUNT || 3

const init = async (app) => {
  try {
    if (app) {
      await db.connectDB()
      await db.initCollection()
      app.listen(port, nLog(`Server is listening on port ${port}`))
      process.on('beforeExit', db.disconnectDB)
      process.on('SIGINT', db.disconnectDB)
    }
  } catch (e) {
    eLog(`Error connecting.. ${e}`)
    if (init.retry <= RETRY_COUNT) {
      nLog(`Retrying... ${init.retry}`)
      init.retry++
      init(app)
    }
  }
}

init.retry = 1

export default { init }
