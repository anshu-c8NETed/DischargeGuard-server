import express from 'express';
import { upload } from '../middleware/upload.js';
import { parseDischarge, extractTextFromImage, verifyMedicine, getPlan, getMedicineImage, scanMedicine } from '../controllers/dischargeController.js';

const router = express.Router();
router.get('/plan/:patientId', getPlan);
router.get('/medicine-image', getMedicineImage);   // proxy → NIH RxImage
router.post('/parse', parseDischarge);
router.post('/ocr', upload.single('image'), extractTextFromImage);
router.post('/verify-medicine', verifyMedicine);
router.post('/scan-medicine', upload.single('image'), scanMedicine);

export default router;