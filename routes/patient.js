import express from 'express';
import Patient from '../models/Patient.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;