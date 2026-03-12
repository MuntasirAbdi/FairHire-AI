import { Router } from "express";
import { importIndeedJob } from "../services/indeedService.js";

const router = Router();

router.post("/import", async (req, res) => {
  try {
    const { url, pastedText } = req.body;

    const job = await importIndeedJob({ url, pastedText });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;