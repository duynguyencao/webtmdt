import mongoose from 'mongoose'

const orderCounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
})

export default mongoose.model('OrderCounter', orderCounterSchema)

