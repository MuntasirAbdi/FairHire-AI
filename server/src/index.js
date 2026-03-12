import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import aiRoutes from './routes/aiRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import indeedRoutes from './routes/indeedRoutes.js';
import jobRoutes from './routes/jobRoutes.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || null
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/indeed', indeedRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

app.listen(port, () => {
  console.log(`FairHire server running on http://localhost:${port}`);
  console.log('Gemini key loaded:', Boolean(process.env.GEMINI_API_KEY));
  console.log('Gemini model:', process.env.GEMINI_MODEL);
});