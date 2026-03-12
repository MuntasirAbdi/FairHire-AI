import { GoogleGenAI } from '@google/genai';
import { fallbackApplicantAnalysis, fallbackRewrite } from './fallbacks.js';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash';
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}$/);
  if (!match) throw new Error('Model did not return JSON.');
  return JSON.parse(match[0]);
}

export async function rewriteJobDescription(job) {
  if (!client) return fallbackRewrite(job);

  const prompt = `You are a fairness-focused hiring assistant. Rewrite this job posting to reduce gender-coded or exclusionary language while preserving the role requirements.
Return strict JSON with this shape:
{
  "rewrittenDescription": "...",
  "analysis": {
    "inclusivityScore": 0,
    "clarityScore": 0,
    "detectedBiases": [{"phrase": "...", "reason": "..."}]
  }
}
Job title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}`;

  const response = await client.models.generateContent({
    model,
    contents: prompt
  });

  return extractJson(response.text);
}

export async function analyzeApplicant(job, applicant) {
  if (!client) return fallbackApplicantAnalysis(applicant);

  const prompt = `You are evaluating a candidate fairly for a Women-in-Tech demo platform.
Do not penalize career breaks, caregiving, or non-linear paths.
Return strict JSON with this shape:
{
  "blindProfile": {"alias": "Candidate ABC"},
  "analysis": {
    "matchScore": 0,
    "potentialScore": 0,
    "fairnessConfidence": 0,
    "summary": "...",
    "strengths": ["..."],
    "concerns": ["..."]
  }
}
Job description: ${job.description}
Resume: ${applicant.resumeText}
Career break context: ${applicant.careerBreakContext || 'None provided'}`;

  const response = await client.models.generateContent({
    model,
    contents: prompt
  });

  return extractJson(response.text);
}
