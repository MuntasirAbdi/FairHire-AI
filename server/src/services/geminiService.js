import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing. Gemini cannot run.');
}

const client = new GoogleGenAI({ apiKey });

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error('Gemini raw response:', text);
    throw new Error('Gemini did not return valid JSON.');
  }
  return JSON.parse(match[0]);
}

export async function rewriteJobDescription(job) {
  const prompt = `
You are a fairness-focused hiring assistant.

Rewrite this job description to remove gender-coded or exclusionary language while keeping the role requirements the same.

Return ONLY JSON. Do NOT wrap JSON in markdown code blocks.

{
  "rewrittenDescription": "...",
  "analysis": {
    "inclusivityScore": 0,
    "clarityScore": 0,
    "detectedBiases": [
      {"phrase": "...", "reason": "..."}
    ]
  }
}

Job Title: ${job.title || ''}
Company: ${job.company || ''}
Location: ${job.location || ''}
Description:
${job.description || ''}
`;

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned an empty response.');

    return extractJson(text);
  } catch (error) {
    console.error('Gemini rewrite failed:', error);
    throw new Error(error?.message || 'Gemini rewrite failed.');
  }
}

export async function analyzeApplicant(job, applicant) {
  const prompt = `
You are evaluating a job candidate fairly for a hiring platform demo.

Do not penalize career breaks, caregiving, non-linear career paths, or lack of elite-school prestige.

Return ONLY JSON. Do NOT wrap it in markdown.

{
  "blindProfile": {
    "alias": "Candidate XYZ"
  },
  "analysis": {
    "matchScore": 0,
    "potentialScore": 0,
    "fairnessConfidence": 0,
    "summary": "...",
    "strengths": ["..."],
    "concerns": ["..."]
  }
}

Job Title: ${job.title || ''}
Company: ${job.company || ''}
Location: ${job.location || ''}

Job Description:
${job.description || ''}

Applicant Resume:
${applicant.resumeText || ''}

Career Break Context:
${applicant.careerBreakContext || 'None'}
`;

  const response = await client.models.generateContent({
    model,
    contents: prompt
  });

  const text = response.text;

  if (!text) {
    throw new Error('Gemini returned an empty response for applicant analysis.');
  }

  return extractJson(text);
}