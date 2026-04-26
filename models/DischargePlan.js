import mongoose from 'mongoose';

const dischargePlanSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },

  condition:    String,   // e.g. "Typhoid Fever", "Dengue", extracted by AI

  // Clinical verification of the full prescription
  verification: {
    verdict:           String,   // "safe" | "concerns" | "warning"
    diagnosisMatch:    Boolean,
    summary:           String,
    flags:             [String],
    interactions:      [String],
    missingMedicines:  [String]
  },

  medicines: [{
    name:         String,
    dosage:       String,
    timing:       String,
    duration:     String,
    instructions: String
  }],

  dietEat:   [String],
  dietAvoid: [String],

  precautions:          [String],
  activity:             [String],
  followUp:             String,
  warningSigns:         [String],
  specialInstructions:  [String],

  rawText:    String,
  spokenText: String,

  audioFiles: { type: mongoose.Schema.Types.Mixed, default: {} }

}, { timestamps: true });

export default mongoose.model('DischargePlan', dischargePlanSchema);