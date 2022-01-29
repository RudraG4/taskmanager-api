import mongoose from 'mongoose'

const sequenceSchema = new mongoose.Schema({
  model: { type: String, required: true },
  field: { type: String, required: true },
  seq: { type: Number, default: 0 }
})

sequenceSchema.index({ field: 1, model: 1 }, { unique: true, required: true, index: -1 })

export default mongoose.model('sequence', sequenceSchema)
