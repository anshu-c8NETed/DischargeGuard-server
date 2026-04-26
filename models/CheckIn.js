import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  tookMedicine: Boolean,
  feeling: { type: String, enum: ['good', 'bad'] },
  riskScore: Number
}, { timestamps: true });

export default mongoose.model('CheckIn', checkInSchema);