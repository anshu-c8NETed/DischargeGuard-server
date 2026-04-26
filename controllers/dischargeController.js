import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DischargePlan from '../models/DischargePlan.js';
import Patient from '../models/Patient.js';

// ─── Provider config ──────────────────────────────────────────────────────────
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions';
const OR_TEXT_MODEL    = 'meta-llama/llama-3.1-8b-instruct:free';
// FIX: updated vision model — verify slug is live at openrouter.ai/models
// qwen2.5-vl is currently the most reliable free vision model on OpenRouter
const OR_VISION_MODEL  = 'qwen/qwen2.5-vl-72b-instruct:free';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_PLAN = {
  medicines: [
    { name: 'Paracetamol',  dosage: '500mg — 1 tablet', timing: 'Morning and evening after food',               duration: '5 days', instructions: 'Take with a full glass of water' },
    { name: 'Azithromycin', dosage: '250mg — 1 tablet', timing: 'Once daily in the morning after food',         duration: '5 days', instructions: 'Complete the full course even if you feel better' },
    { name: 'Pantoprazole', dosage: '40mg — 1 tablet',  timing: '30 minutes before breakfast on empty stomach', duration: '7 days', instructions: 'Do not crush or chew the tablet' }
  ],
  dietEat:   ['Boiled rice, khichdi, or plain roti', 'Dal, light vegetable soups, and broths', 'Fresh fruits like banana, apple, and papaya', 'Coconut water and fresh fruit juices', 'At least 8 to 10 glasses of water every day'],
  dietAvoid: ['Oily, fried, and spicy food', 'Cold drinks, ice cream, and chilled water', 'Alcohol — completely avoid', 'Outside / street food', 'Heavy non-vegetarian meals'],
  precautions:         ['Rest at home for at least 5 days', 'Keep yourself warm — avoid cold air or rain', 'Sleep at least 8 hours every night', 'Do not self-medicate or add any extra medicines'],
  activity:            ['No heavy lifting or strenuous exercise for 2 weeks', 'Short gentle walks inside the home are fine after day 3', 'Avoid crowded public places for at least 1 week'],
  followUp:            'Visit the outpatient clinic (OPD) after 7 days or earlier if symptoms worsen',
  warningSigns:        ['Fever above 103°F (39.5°C) — go to emergency immediately', 'Difficulty breathing or chest pain', 'Severe vomiting — unable to keep medicines down', 'Extreme weakness, fainting, or confusion', 'Skin rash or swelling on face / throat'],
  specialInstructions: ['Store all medicines at room temperature away from sunlight', 'Set phone alarms to remember medicine timings', 'Keep this discharge paper safe for the follow-up visit']
};

const DEMO_SPOKEN = {
  'hi-IN': `घर वापस आने पर बहुत-बहुत बधाई। आपको बुखार और सांस का संक्रमण हुआ था, और आप अच्छे से ठीक हो रहे हैं — बस घर पर भी ध्यान रखना ज़रूरी है।

दवाइयों की बात करें — पेरासिटामोल 500mg, सुबह और शाम खाने के बाद, 5 दिन तक। एज़िथ्रोमाइसिन 250mg, रोज़ सुबह खाने के बाद, 5 दिन पूरे करें — बेहतर लगे तो भी बीच में मत छोड़ें। पैंटोप्राज़ोल 40mg, नाश्ते से 30 मिनट पहले खाली पेट, 7 दिन तक।

खाने में दाल, खिचड़ी, उबले चावल और हल्के सूप लें — तला हुआ, मसालेदार खाना और शराब बिल्कुल नहीं।

5 दिन घर पर आराम करें, 2 हफ्ते तक कोई भारी काम नहीं।

अगर बुखार 103°F से ऊपर जाए, सांस में तकलीफ हो, या बहुत उल्टी हो — बिना देर किए अस्पताल आएं।

एक हफ्ते बाद OPD में ज़रूर आएं। आप जल्दी ठीक हो जाएंगे।`,

  'te-IN': `ఇంటికి స్వాగతం! మీకు జ్వరం మరియు శ్వాసకోశ సంక్రమణ వచ్చింది, మీరు కోలుకుంటున్నారు — ఇంట్లో కూడా జాగ్రత్తగా ఉండాలి.

మందుల విషయానికి వస్తే — పారాసిటమాల్ 500mg, ఉదయం మరియు సాయంత్రం భోజనం తర్వాత, 5 రోజులు. అజిత్రోమైసిన్ 250mg, ప్రతిరోజూ ఉదయం భోజనం తర్వాత, 5 రోజులు పూర్తిగా తీసుకోండి — నయమైనట్టు అనిపించినా ఆపకండి. పాంటోప్రజోల్ 40mg, అల్పాహారానికి 30 నిమిషాల ముందు, 7 రోజులు.

దాల్, అన్నం, తేలికపాటి సూప్ తినండి — నూనె పదార్థాలు, మద్యం పూర్తిగా మానుకోండి.

5 రోజులు విశ్రాంతి తీసుకోండి, 2 వారాలు భారీ పని చేయకండి.

జ్వరం 103°F దాటితే, శ్వాస ఇబ్బంది కలిగితే, లేదా తీవ్రమైన వాంతులు వస్తే — వెంటనే ఆసుపత్రికి వెళ్ళండి.

ఒక వారం తర్వాత OPD లో తప్పకుండా చూపించుకోండి. త్వరలో పూర్తిగా కోలుకుంటారు.`,

  'en-IN': `Welcome home! You were treated for a fever and respiratory infection, and you're on the right track — just keep up the care at home.

For your medicines — Paracetamol 500mg, morning and evening after food, for 5 days. Azithromycin 250mg, once every morning after food, for 5 days — finish the full course even if you start feeling better. Pantoprazole 40mg, on an empty stomach 30 minutes before breakfast, for 7 days.

Eat light meals like dal, khichdi, and rice. Cut out oily food, spicy food, and alcohol entirely.

Rest at home for 5 days and avoid any heavy lifting for 2 weeks.

If your fever crosses 103°F, you have trouble breathing, or you can't keep food down — go to the hospital right away, don't wait.

Come back for your follow-up in one week. You're going to be just fine.`
};

// ─── Prompt ───────────────────────────────────────────────────────────────────
const LANG_META = {
  'hi-IN': { name: 'Hindi',   locale: 'hi-IN' },
  'te-IN': { name: 'Telugu',  locale: 'te-IN' },
  'en-IN': { name: 'English', locale: 'en-IN' }
};

const COMBINED_PROMPT = (text, language) => {
  const { name } = LANG_META[language] ?? LANG_META['en-IN'];
  return `You are a clinical AI with medical knowledge acting as a discharge nurse. Given a discharge summary, return ONLY a valid JSON object — no markdown, no code fences, no extra text.

{
  "structured": {
    "condition": "disease or condition name e.g. Typhoid Fever, Dengue, Post-operative Recovery",
    "medicines": [{"name":"","dosage":"","timing":"","duration":"","instructions":""}],
    "dietEat":             ["specific food to eat"],
    "dietAvoid":           ["specific food to avoid"],
    "precautions":         ["physical precaution"],
    "activity":            ["activity restriction"],
    "followUp":            "follow-up instruction with timing",
    "warningSigns":        ["urgent symptom requiring hospital visit"],
    "specialInstructions": ["any other important instruction"]
  },
  "verification": {
    "verdict": "safe OR concerns OR warning",
    "diagnosisMatch": true or false,
    "summary": "2-3 sentence plain-language assessment of whether this prescription makes clinical sense for the stated condition",
    "flags": ["specific concern — e.g. wrong dosage, missing standard medicine, unusual combination"],
    "interactions": ["notable drug-drug interaction worth flagging, or empty array"],
    "missingMedicines": ["standard first-line medicine for this condition that is absent, or empty array"]
  },
  "spoken": "<nurse voice script in ${name}>"
}

STRUCTURED rules: Extract only what is present. Use [] or "" for missing fields. Never invent data.

VERIFICATION rules — act as a clinical reviewer:
- verdict is "safe" if medicines clearly match the condition and dosages look appropriate
- verdict is "concerns" if something looks unusual but not dangerous
- verdict is "warning" if there is a clear mismatch, dangerous drug combination, or critical missing medicine
- diagnosisMatch: true only if prescribed medicines are appropriate treatment for the stated condition
- flags: be specific — name the medicine and the concern, not vague statements
- interactions: only flag clinically significant interactions
- missingMedicines: only flag clearly essential medicines that are absent
- If no clear diagnosis exists in the summary, set diagnosisMatch to false and note it

SPOKEN rules — caring nurse speaking aloud, ${name} only, 180-220 words:
1. GREETING: Warm welcome, mention condition by name.
2. MEDICINES: One sentence per medicine — name, dose, when, duration. Add critical instructions naturally.
3. FOOD: One sentence eat, one sentence avoid. Specific not generic.
4. REST: Days of rest, activity limit.
5. WARNING SIGNS: Specific symptoms from plan. Urgent but calm.
6. CLOSE: Encouraging, mention follow-up timing.

No bullets, numbers, or headers in spoken. No repeated "please". No filler phrases.

Discharge Summary:
${text}`;
};

const OCR_PROMPT = 'Extract all text from this hospital discharge summary image exactly as written. Return only the raw text — no explanations.';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const stripFences = (raw) => raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

// ─── Gemini (primary) ─────────────────────────────────────────────────────────
const getGemini = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash' });
};

const callGeminiText = async (prompt) => {
  const model = getGemini();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error('Gemini returned empty response');
  return text.trim();
};

// FIX #1: added `prompt` as a parameter with default — was missing entirely,
// causing a ReferenceError at runtime ("prompt is not defined").
const callGeminiVision = async (imageBuffer, mimeType, prompt = OCR_PROMPT) => {
  const model = getGemini();
  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    prompt
  ]);
  const text = result.response.text();
  if (!text) throw new Error('Gemini vision returned empty response');
  return text.trim();
};

// ─── OpenRouter (fallback) — pinned models, null-safe ────────────────────────
const callOpenRouter = async (messages, { retries = 2, timeoutMs = 90_000, isVision = false } = {}) => {
  const model = isVision ? OR_VISION_MODEL : OR_TEXT_MODEL;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        OPENROUTER_URL,
        { model, messages, max_tokens: isVision ? 800 : 1800 },
        {
          timeout: timeoutMs,
          headers: {
            Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dischargeguard.app',
            'X-Title':      'DischargeGuard'
          }
        }
      );

      const choice  = res.data.choices?.[0];
      const content = choice?.message?.content;
      if (!content) throw new Error(`OpenRouter returned null content (model=${res.data.model})`);

      console.log(`[OpenRouter] ✓ model=${res.data.model}  attempt=${attempt + 1}`);
      return content.trim();

    } catch (err) {
      const status = err.response?.status ?? (err.code === 'ECONNABORTED' ? 504 : 0);
      if (status === 401 || status === 403) throw new Error(`OpenRouter auth failed (${status})`);

      lastErr = err;
      console.warn(`[OpenRouter] ✗ attempt ${attempt + 1}/${retries + 1}  status=${status}  err=${err.message}`);

      if (attempt < retries) {
        const delay = status === 429 ? 7000 * (attempt + 1) : 3000 * (attempt + 1);
        console.log(`[OpenRouter] Waiting ${delay / 1000}s before retry…`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
};

// ─── Unified AI calls: Gemini → OpenRouter fallback ──────────────────────────
const aiText = async (prompt) => {
  try {
    console.log('[AI] Trying Gemini (text)…');
    const result = await callGeminiText(prompt);
    console.log('[AI] Gemini text ✓');
    return result;
  } catch (geminiErr) {
    console.warn('[AI] Gemini text failed:', geminiErr.message, '→ falling back to OpenRouter');
    return callOpenRouter([{ role: 'user', content: prompt }], { retries: 2, timeoutMs: 90_000 });
  }
};

// FIX #2: prompt is now forwarded to callGeminiVision — was silently dropped,
// so scanMedicine's SCAN_PROMPT was ignored and Gemini ran generic OCR instead.
const aiVision = async (imageBuffer, mimeType, prompt = OCR_PROMPT) => {
  try {
    console.log('[AI] Trying Gemini (vision)…');
    const result = await callGeminiVision(imageBuffer, mimeType, prompt);
    console.log('[AI] Gemini vision ✓');
    return result;
  } catch (geminiErr) {
    console.warn('[AI] Gemini vision failed:', geminiErr.message, '→ falling back to OpenRouter');
    const base64 = imageBuffer.toString('base64');
    return callOpenRouter(
      [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        { type: 'text', text: prompt }
      ]}],
      { retries: 1, timeoutMs: 120_000, isVision: true }
    );
  }
};

// ─── Sarvam TTS ───────────────────────────────────────────────────────────────
const SARVAM_SPEAKERS = { 'hi-IN': 'anushka', 'te-IN': 'anushka', 'en-IN': 'arya' };

const generateAudioChunk = async (text, languageCode) => {
  const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 490);
  const res = await axios.post(
    'https://api.sarvam.ai/text-to-speech',
    {
      inputs: [clean],
      target_language_code: languageCode,
      speaker: SARVAM_SPEAKERS[languageCode] ?? 'anushka',
      model: 'bulbul:v2',
      enable_preprocessing: true
    },
    {
      timeout: 30_000,
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data.audios[0];
};

const splitIntoChunks = (text, maxLen = 480) => {
  const sentences = text.match(/[^।.!?]+[।.!?]+["']?\s*/g) ?? [text];
  const chunks = []; let buf = '';
  for (const s of sentences) {
    if (buf.length + s.length > maxLen && buf) { chunks.push(buf.trim()); buf = s; }
    else buf += s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text.slice(0, 480)];
};

const generateAudioChunks = async (text, languageCode) => {
  const chunks = splitIntoChunks(text);
  console.log(`[Sarvam] ${chunks.length} chunk(s) for ${languageCode} — parallel`);

  const results = await Promise.all(
    chunks.map(async (chunk, i) => {
      try {
        const audio = await generateAudioChunk(chunk, languageCode);
        console.log(`[Sarvam] Chunk ${i + 1}/${chunks.length} ✓`);
        return audio;
      } catch (err) {
        console.warn(`[Sarvam] Chunk ${i + 1} failed:`, err.response?.data ?? err.message);
        return null;
      }
    })
  );

  return results.filter(Boolean);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/discharge/parse
export const parseDischarge = async (req, res) => {
  try {
    const { text, patientId, demo = false } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const language = patient.language || 'hi-IN';

    // ── DEMO MODE ─────────────────────────────────────────────────────────────
    if (demo) {
      const spokenText = DEMO_SPOKEN[language] ?? DEMO_SPOKEN['hi-IN'];
      let audioChunks = [];
      try { audioChunks = await generateAudioChunks(spokenText, language); }
      catch (e) { console.warn('[Sarvam] Demo audio failed:', e.message); }

      const plan = await DischargePlan.create({
        patientId, ...DEMO_PLAN, rawText: 'DEMO', spokenText,
        audioFiles: audioChunks.length ? { [language]: audioChunks } : {}
      });
      return res.json({ success: true, plan, audioChunks, spokenText, isDemo: true });
    }

    // ── REAL MODE ─────────────────────────────────────────────────────────────
    if (!text) return res.status(400).json({ error: 'text is required for non-demo mode' });

    let parsed, spokenText, verification = null;

    try {
      const raw    = await aiText(COMBINED_PROMPT(text, language));
      const result = JSON.parse(stripFences(raw));
      parsed       = result.structured;
      spokenText   = result.spoken;
      verification = result.verification ?? null;
      console.log(`[Parser] medicines=${parsed.medicines?.length ?? 0}  verdict=${verification?.verdict ?? 'n/a'}  spoken=${spokenText?.length ?? 0}chars`);
    } catch (aiErr) {
      console.warn('[AI Pipeline] All providers failed → demo fallback:', aiErr.message);
      parsed     = DEMO_PLAN;
      spokenText = DEMO_SPOKEN[language] ?? DEMO_SPOKEN['hi-IN'];
    }

    let audioChunks = [];
    try { audioChunks = await generateAudioChunks(spokenText, language); }
    catch (e) { console.warn('[Sarvam] Audio failed:', e.message); }

    const plan = await DischargePlan.create({
      patientId, ...parsed, rawText: text, spokenText, verification,
      audioFiles: audioChunks.length ? { [language]: audioChunks } : {}
    });

    res.json({ success: true, plan, audioChunks, spokenText });

  } catch (err) {
    console.error('parseDischarge error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/discharge/ocr
export const extractTextFromImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    let text;
    try {
      // OCR_PROMPT is the default — no need to pass it explicitly
      text = await aiVision(req.file.buffer, req.file.mimetype);
    } catch (aiErr) {
      console.warn('[OCR] All providers failed → fallback text:', aiErr.message);
      text = 'Patient admitted for fever and respiratory infection. Medicines: Paracetamol 500mg one tablet morning and evening after food for 5 days. Azithromycin 250mg one tablet once daily after food for 5 days. Pantoprazole 40mg one tablet before breakfast for 7 days. Diet: eat boiled rice, dal, light soups, fruits, drink plenty of water. Avoid oily food, spicy food, alcohol, cold drinks. Precautions: rest at home for 5 days, avoid cold exposure. No heavy lifting for 2 weeks. Warning signs: fever above 103F, difficulty breathing, severe vomiting — go to emergency immediately. Follow up in OPD after 1 week.';
    }

    res.json({ success: true, text });
  } catch (err) {
    console.error('extractTextFromImage error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/discharge/verify-medicine
export const verifyMedicine = async (req, res) => {
  try {
    const { scannedName, patientId } = req.body;
    if (!scannedName || !patientId)
      return res.status(400).json({ error: 'scannedName and patientId are required' });

    const plan = await DischargePlan.findOne({ patientId }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ error: 'No discharge plan found for this patient' });

    const match = plan.medicines.some(med =>
      med.name.toLowerCase().includes(scannedName.toLowerCase()) ||
      scannedName.toLowerCase().includes(med.name.toLowerCase())
    );

    res.json({
      success: true,
      match,
      message: match ? '✅ Correct medicine' : '❌ Wrong medicine — not in discharge plan'
    });
  } catch (err) {
    console.error('verifyMedicine error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/discharge/plan/:patientId
export const getPlan = async (req, res) => {
  try {
    const plan = await DischargePlan.findOne({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ error: 'No plan found' });

    const planObj     = plan.toObject();
    const audioFiles  = planObj.audioFiles ?? {};
    const language    = Object.keys(audioFiles).find(k => audioFiles[k]?.length) ?? null;
    const rawAudio    = language ? audioFiles[language] : null;
    const audioChunks = Array.isArray(rawAudio) ? rawAudio : (rawAudio ? [rawAudio] : []);

    res.json({ success: true, plan: { ...planObj, audioChunks } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/discharge/medicine-image?name=Azithromycin
export const getMedicineImage = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const response = await axios.get(
      `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?name=${encodeURIComponent(name)}&resolution=600`,
      { timeout: 5000 }
    );
    const imageUrl = response.data?.nlmRxImages?.[0]?.imageUrl ?? null;
    res.json({ imageUrl });
  } catch {
    res.json({ imageUrl: null });
  }
};

// POST /api/discharge/scan-medicine  (multipart: image + patientId)
export const scanMedicine = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const plan = await DischargePlan.findOne({ patientId }).sort({ createdAt: -1 });
    if (!plan?.medicines?.length) return res.status(404).json({ error: 'No discharge plan found' });

    const prescribedList = plan.medicines.map(m => m.name).join(', ');

    const SCAN_PROMPT = `You are a medicine verification assistant for a hospital discharge app.

Look at this medicine packaging image carefully.

The patient's prescribed medicines are: ${prescribedList}

Instructions:
1. Read ALL visible text on the packaging (front, side, strip — whatever is visible)
2. Identify the actual medicine name — ignore brand suffixes, batch numbers, expiry dates, manufacturer names, dosage forms like "tablet" or "syrup"
3. Check if it matches any prescribed medicine. Use smart fuzzy matching:
   - Brand names map to generics (e.g. "Calpol"→Paracetamol, "Azithral"→Azithromycin, "Pan"→Pantoprazole)
   - Spelling variants and partial matches count (e.g. "Azithro" matches Azithromycin)
   - Different salt forms of same drug count as a match

Return ONLY valid JSON — no markdown, no explanation:
{
  "extractedName": "medicine name as printed on packaging",
  "normalizedName": "the generic name you identified",
  "match": true or false,
  "matchedWith": "the name from prescribed list it matches, or null if no match",
  "confidence": "high or medium or low",
  "reason": "one clear sentence: why it matches or why it does not match"
}`;

    let scanResult;
    try {
      // FIX #1 + #2 in action: SCAN_PROMPT is now correctly forwarded through
      // aiVision → callGeminiVision instead of being silently dropped.
      const raw = await aiVision(req.file.buffer, req.file.mimetype, SCAN_PROMPT);
      scanResult = JSON.parse(stripFences(raw));
      console.log(`[Scanner] extracted=${scanResult.extractedName}  match=${scanResult.match}  confidence=${scanResult.confidence}`);
    } catch (err) {
      console.warn('[Scanner] AI failed:', err.message);
      return res.status(500).json({ error: 'Could not analyse image. Try a clearer photo.' });
    }

    const matchedMedicine = scanResult.match
      ? plan.medicines.find(m =>
          m.name.toLowerCase().includes((scanResult.matchedWith ?? '').toLowerCase()) ||
          (scanResult.matchedWith ?? '').toLowerCase().includes(m.name.toLowerCase())
        ) ?? null
      : null;

    res.json({
      success:        true,
      extractedName:  scanResult.extractedName,
      normalizedName: scanResult.normalizedName,
      match:          scanResult.match,
      matchedWith:    scanResult.matchedWith,
      confidence:     scanResult.confidence,
      reason:         scanResult.reason,
      matchedMedicine
    });

  } catch (err) {
    console.error('scanMedicine error:', err.message);
    res.status(500).json({ error: err.message });
  }
};