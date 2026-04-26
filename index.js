import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dischargeRoutes from './routes/discharge.js';
import checkinRoutes from './routes/checkin.js';
import patientRoutes from './routes/patient.js';

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/discharge', dischargeRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/patient', patientRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});