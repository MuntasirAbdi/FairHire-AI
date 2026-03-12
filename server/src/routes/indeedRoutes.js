import { Router } from 'express';
import { importIndeedPosting } from '../services/indeedService.js';

const router = Router();

router.post('/import', async (req, res) => {
  try {
    const result = await importIndeedPosting({
      url: req.body.url,
      text: req.body.text
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
