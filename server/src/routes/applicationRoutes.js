import { Router } from 'express';
import { analyzeApplicant } from '../services/geminiService.js';
import { createId, readDb, writeDb } from '../utils/fileDb.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = readDb();
  res.json({ applications: db.applications });
});

router.post('/', async (req, res) => {
  try {
    const { jobId, name, email, resumeText, careerBreakContext } = req.body;
    if (!jobId || !name || !email || !resumeText) {
      return res.status(400).json({ error: 'jobId, name, email, and resumeText are required' });
    }

    const db = readDb();
    const job = db.jobs.find((entry) => entry.id === jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const scored = await analyzeApplicant(job, { resumeText, careerBreakContext });

    const application = {
      id: createId('app'),
      jobId,
      name,
      email,
      resumeText,
      careerBreakContext: careerBreakContext || '',
      ...scored,
      createdAt: new Date().toISOString()
    };

    db.applications.unshift(application);
    writeDb(db);
    res.status(201).json({ application });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
