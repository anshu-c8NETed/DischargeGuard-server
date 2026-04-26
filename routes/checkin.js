import express from 'express';
import { submitCheckin, getCheckins } from '../controllers/checkinController.js';

const router = express.Router();

router.post('/', submitCheckin);
router.get('/:patientId', getCheckins);

export default router;