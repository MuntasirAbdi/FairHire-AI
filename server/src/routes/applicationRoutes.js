import { Router } from 'express';
import { readDb, writeDb, createId } from '../utils/fileDb.js';
import { analyzeApplicant } from '../services/geminiService.js';

const router = Router();

router.get('/', async (_req, res) => {
  const db = await readDb();
  res.json({ applications: db.applications || [] });
});

router.post('/', async (req, res) => {
  try {
    const { jobId, name, email, resumeText, careerBreakContext } = req.body;

    if (!jobId || !name || !email || !resumeText) {
      return res.status(400).json({ error: 'jobId, name, email, and resumeText are required.' });
    }

    const db = await readDb();
    const job = (db.jobs || []).find((j) => j.id === jobId);

    if (!job) {
      return res.status(404).json({ error: 'Selected job not found.' });
    }

    const geminiResult = await analyzeApplicant(job, {
      name,
      email,
      resumeText,
      careerBreakContext
    });

    const application = {
      id: createId('app'),
      jobId,
      name,
      email,
      resumeText,
      careerBreakContext: careerBreakContext || '',
      blindProfile: geminiResult.blindProfile,
      analysis: geminiResult.analysis,
      createdAt: new Date().toISOString()
    };

    db.applications = [...(db.applications || []), application];
    await writeDb(db);

    res.status(201).json({ application });
  } catch (error) {
    console.error('Application submission failed:', error);
    res.status(500).json({ error: error.message || 'Application analysis failed.' });
  }
});

export default router;