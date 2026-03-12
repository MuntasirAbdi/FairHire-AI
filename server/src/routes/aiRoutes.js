import { Router } from 'express';
import { rewriteJobDescription } from '../services/geminiService.js';

const router = Router();

router.post('/rewrite-job', async (req, res) => {
  try {
    const result = await rewriteJobDescription(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
