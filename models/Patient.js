import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  language: { type: String, enum: ['hi-IN', 'te-IN', 'en-IN'], default: 'hi-IN' }
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);