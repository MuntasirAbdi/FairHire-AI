import { Router } from 'express';
import { createId, readDb, writeDb } from '../utils/fileDb.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = readDb();
  res.json({ jobs: db.jobs });
});

router.post('/', (req, res) => {
  const { title, company, location, description, sourceUrl, originalDescription, inclusiveDescription } = req.body;
  if (!title || !company || !description) {
    return res.status(400).json({ error: 'title, company, and description are required' });
  }

  const db = readDb();
  const job = {
    id: createId('job'),
    title,
    company,
    location: location || 'Unspecified',
    description,
    sourceUrl: sourceUrl || '',
    originalDescription: originalDescription || description,
    inclusiveDescription: inclusiveDescription || description,
    createdAt: new Date().toISOString()
  };
  db.jobs.unshift(job);
  writeDb(db);
  res.status(201).json({ job });
});

export default router;
