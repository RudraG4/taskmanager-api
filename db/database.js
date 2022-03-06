import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { nLog } from '../util/rlogger.js'
import models from '../models/models.js'

dotenv.config()

const MONGO_USERNAME = encodeURIComponent(process.env.MONGO_USERNAME)
const MONGO_PASSWORD = encodeURIComponent(process.env.MONGO_PASSWORD)
const CLUSTER = process.env.MONGO_CLUSTER
const DATABASE = process.env.MONGO_DATABASE
const URI = `mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@${CLUSTER}.jqa5m.mongodb.net/${DATABASE}?retryWrites=true&w=majority`

const OPTIONS = {
  useNewUrlParser: true,
  autoCreate: true
}

const connectDB = () => {
  nLog(`Connecting to Database...${DATABASE}`)
  return mongoose.connect(URI, OPTIONS)
}

const disconnectDB = (callback) => {
  nLog(`Disconnecting from Database...${DATABASE}`)
  return mongoose.disconnect(callback)
}

const initCollection = async () => {
  const collections = Object.keys(models).map(model => models[model].createCollection())
  return await Promise.all(collections)
}

export default {
  connectDB,
  disconnectDB,
  initCollection
}