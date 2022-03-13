import dotenv from 'dotenv'
import mongoose from 'mongoose'
import models from '../models/models.js'
import { nLog } from '../util/rlogger.js'

dotenv.config()

const URI = process.env.MONGO_URI
const OPTIONS = {
  useNewUrlParser: true,
  autoCreate: true
}
let isConnected = false
let currentConnection

const connectDB = async () => {
  if (!URI) {
    throw new Error('DATABASE or MONGO_URI is not configured')
  }
  const connection = await mongoose.connect(URI, OPTIONS)
  if (connection && connection.connections) {
    currentConnection = connection.connections[0]
    nLog(`Connected to Database @ ${currentConnection.host}:${currentConnection.port} `)
    isConnected = true
  }
  return connection
}

const disconnectDB = (callback) => {
  if (isConnected) {
    nLog(`Disconnecting from Database @ ${currentConnection.host}:${currentConnection.port} `)
    mongoose.disconnect(callback)
    isConnected = false
  }
}

const initCollection = async () => {
  if (isConnected) {
    const collections = Object.keys(models).map(model => models[model].createCollection())
    return await Promise.all(collections)
  }
}

export default {
  connectDB,
  disconnectDB,
  initCollection
}
