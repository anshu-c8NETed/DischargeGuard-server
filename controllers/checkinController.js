import CheckIn from '../models/CheckIn.js';

export const submitCheckin = async (req, res) => {
  try {
    const { patientId, tookMedicine, feeling } = req.body;

    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    if (typeof tookMedicine !== 'boolean') return res.status(400).json({ error: 'tookMedicine must be a boolean' });
    if (!['good', 'bad'].includes(feeling)) return res.status(400).json({ error: 'feeling must be "good" or "bad"' });

    // Rule-based risk scoring
    let riskScore = 0;
    if (!tookMedicine) riskScore += 30;
    if (feeling === 'bad') riskScore += 40;

    // FIX: query strictly for yesterday's date window so we don't match today's
    // check-ins (the old $gte: yesterday matched anything in the last 24h,
    // including the current submission, so the +20 penalty almost never fired).
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const missedYesterday = await CheckIn.findOne({
      patientId,
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }
    });
    if (!missedYesterday) riskScore += 20;

    const checkin = await CheckIn.create({
      patientId,
      tookMedicine,
      feeling,
      riskScore
    });

    res.json({ success: true, checkin, riskScore });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCheckins = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const checkins = await CheckIn.find({ patientId }).sort({ createdAt: 1 });
    res.json({ success: true, checkins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};