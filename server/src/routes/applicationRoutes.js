import { Router } from 'express';
import multer from 'multer';
import { extractText } from 'unpdf';
import { readDb, writeDb, createId } from '../utils/fileDb.js';
import { analyzeApplicant } from '../services/geminiService.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return cb(new Error('Only PDF files are allowed.'));
    }

    cb(null, true);
  }
});

router.get('/', async (_req, res) => {
  const db = await readDb();
  res.json({ applications: db.applications || [] });
});

router.post('/', upload.single('resumeFile'), async (req, res) => {
  try {
    console.log("APPLICATION ROUTE HIT");
    console.log("BODY:", req.body);
    console.log("FILE NAME:", req.file?.originalname);
    console.log("FILE TYPE:", req.file?.mimetype);
    console.log("FILE SIZE:", req.file?.size);
    const { jobId, name, email, resumeText, careerBreakContext } = req.body;

    if (!jobId || !name || !email) {
      return res.status(400).json({
        error: 'jobId, name, and email are required.'
      });
    }

    const db = await readDb();
    const job = (db.jobs || []).find((j) => j.id === jobId);

    if (!job) {
      return res.status(404).json({ error: 'Selected job not found.' });
    }

    let finalResumeText = (resumeText || '').trim();

    if (!finalResumeText && req.file) {
  try {
    console.log('STARTING PDF EXTRACTION');

    const uint8 = new Uint8Array(req.file.buffer);
    const result = await extractText(uint8);

    console.log('RAW PDF RESULT:', result);

    const rawText = Array.isArray(result?.text)
  ? result.text.join(' ')
  : String(result?.text || '');

finalResumeText = rawText.replace(/\s+/g, ' ').trim();

    console.log('EXTRACTED RESUME TEXT:');
    console.log(finalResumeText);
    console.log('TEXT LENGTH:', finalResumeText.length);
  } catch (pdfError) {
    console.error('PDF parse failed:', pdfError);
    return res.status(400).json({
      error: 'Could not read text from the uploaded PDF.'
    });
  }
}
console.log('FINAL RESUME TEXT BEFORE VALIDATION:', finalResumeText);
    if (!finalResumeText) {
      return res.status(400).json({
        error: 'This PDF appears to contain no readable text. Please paste the resume text or upload a text-based PDF.'
      });
    }

    const geminiResult = await analyzeApplicant(job, {
      name,
      email,
      resumeText: finalResumeText,
      careerBreakContext
    });

    const application = {
      id: createId('app'),
      jobId,
      name,
      email,
      resumeText: finalResumeText,
      careerBreakContext: careerBreakContext || '',
      resumeFileName: req.file?.originalname || '',
      blindProfile: geminiResult.blindProfile,
      analysis: geminiResult.analysis,
      createdAt: new Date().toISOString()
    };

    db.applications = [...(db.applications || []), application];
    await writeDb(db);

    res.status(201).json({ application });
  } catch (error) {
    console.error('Application submission failed:', error);
    res.status(500).json({
      error: error.message || 'Application analysis failed.'
    });
  }
});

export default router;