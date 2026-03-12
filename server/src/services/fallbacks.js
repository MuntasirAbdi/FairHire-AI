export function fallbackJobImport(url) {
  return {
    title: 'Software Engineer Intern',
    company: 'Demo Company',
    location: 'Remote / Toronto, ON',
    description: `We are looking for a rockstar engineer who can dominate a fast-paced environment, aggressively solve problems, and own delivery from start to finish. Applicants should be fearless, competitive, and willing to work long hours when needed. Strong React, JavaScript, communication, and product instincts required. Imported from ${url || 'manual entry'}.`
  };
}

export function fallbackRewrite(job) {
  return {
    rewrittenDescription: `We are looking for a collaborative engineer who thrives in a fast-paced environment, solves problems thoughtfully, and contributes to delivery from start to finish. Applicants should communicate clearly, learn quickly, and work well across teams. Strong React, JavaScript, communication, and product instincts are important.${job.location ? ` This role is based in ${job.location}.` : ''}`,
    analysis: {
      inclusivityScore: 91,
      clarityScore: 87,
      detectedBiases: [
        { phrase: 'rockstar engineer', reason: 'This phrase can discourage qualified applicants who do not identify with exaggerated performance language.' },
        { phrase: 'dominate', reason: 'Aggressive wording is commonly associated with exclusionary job language.' },
        { phrase: 'fearless, competitive', reason: 'These signals can reduce application rates from strong candidates, especially in underrepresented groups.' }
      ]
    }
  };
}

export function fallbackApplicantAnalysis({ resumeText, careerBreakContext }) {
  const lower = `${resumeText} ${careerBreakContext}`.toLowerCase();
  const strengths = [];
  if (lower.includes('react')) strengths.push('Evidence of front-end development with React');
  if (lower.includes('python')) strengths.push('Shows practical Python familiarity');
  if (lower.includes('lead')) strengths.push('Leadership or initiative appears in the profile');
  if (strengths.length === 0) strengths.push('Relevant project-based evidence present');

  return {
    blindProfile: { alias: `Candidate ${Math.random().toString(36).slice(2, 5).toUpperCase()}` },
    analysis: {
      matchScore: Math.min(95, 72 + strengths.length * 6),
      potentialScore: Math.min(97, 78 + strengths.length * 5),
      fairnessConfidence: 92,
      summary: careerBreakContext
        ? 'Candidate shows relevant evidence and the submitted career-break context was treated neutrally during analysis.'
        : 'Candidate shows relevant evidence and was evaluated through a blind first-pass review.',
      strengths,
      concerns: ['Production-scale evidence may need validation in interview.']
    }
  };
}
