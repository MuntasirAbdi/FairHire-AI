import { useEffect, useMemo, useState } from 'react';

const initialEmployerForm = {
  title: '',
  company: '',
  location: '',
  description: '',
  originalDescription: '',
  inclusiveDescription: '',
  sourceUrl: ''
};

const initialApplicantForm = {
  name: '',
  email: '',
  resumeText: '',
  careerBreakContext: ''
};

function StatCard({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="muted tiny">{hint}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function ScorePill({ label, score }) {
  return <span className="score-pill">{label}: {score}</span>;
}

export default function App() {
  const [view, setView] = useState('employer');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [employerForm, setEmployerForm] = useState(initialEmployerForm);
  const [applicantForm, setApplicantForm] = useState(initialApplicantForm);
  const [analysis, setAnalysis] = useState(null);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function fetchData() {
    const [jobsRes, appsRes] = await Promise.all([
      fetch('/api/jobs').then((r) => r.json()),
      fetch('/api/applications').then((r) => r.json())
    ]);
    setJobs(jobsRes.jobs || []);
    setApplications(appsRes.applications || []);
    if (!selectedJobId && jobsRes.jobs?.length) {
      setSelectedJobId(jobsRes.jobs[0].id);
    }
  }

  useEffect(() => {
    fetchData().catch(() => setError('Failed to load data. Start the backend first.'));
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId]
  );

  const rankedApplications = useMemo(() => {
    if (!selectedJob) return [];
    return applications
      .filter((app) => app.jobId === selectedJob.id)
      .sort((a, b) => (b.analysis?.potentialScore || 0) - (a.analysis?.potentialScore || 0));
  }, [applications, selectedJob]);

  async function importIndeed() {
    setImporting(true);
    setError('');
    try {
      const res = await fetch('/api/indeed/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: employerForm.sourceUrl, text: employerForm.description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setEmployerForm((prev) => ({
        ...prev,
        title: data.job.title || '',
        company: data.job.company || '',
        location: data.job.location || '',
        description: data.job.description || '',
        originalDescription: data.job.description || '',
        inclusiveDescription: data.job.inclusiveDescription || ''
      }));
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function rewriteWithGemini() {
    setError('');
    const res = await fetch('/api/ai/rewrite-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: employerForm.title,
        description: employerForm.description,
        company: employerForm.company,
        location: employerForm.location
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Rewrite failed');
      return;
    }
    setEmployerForm((prev) => ({
      ...prev,
      originalDescription: prev.description,
      inclusiveDescription: data.rewrittenDescription
    }));
    setAnalysis(data.analysis);
  }

  async function publishJob() {
    setPublishing(true);
    setError('');
    try {
      const payload = {
        ...employerForm,
        description: employerForm.inclusiveDescription || employerForm.description
      };
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setEmployerForm(initialEmployerForm);
      await fetchData();
      setSelectedJobId(data.job.id);
      setView('applicant');
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  async function submitApplication() {
    if (!selectedJob) {
      setError('Publish or select a job first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...applicantForm, jobId: selectedJob.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Application failed');
      setApplicantForm(initialApplicantForm);
      await fetchData();
      setView('employer');
      setSelectedJobId(selectedJob.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="badge">GDG Showcase • Women in Tech</span>
          <h1>FairHire AI</h1>
          <p className="hero-copy">
            Import a job post, detect exclusionary language, rewrite it with Gemini, and review applicants through blind, potential-based screening.
          </p>
        </div>
        <div className="hero-actions">
          <button className={view === 'employer' ? 'active' : ''} onClick={() => setView('employer')}>Hiring Team</button>
          <button className={view === 'applicant' ? 'active' : ''} onClick={() => setView('applicant')}>Applicant</button>
        </div>
      </header>

      <main className="layout-grid">
        <aside className="sidebar">
          <StatCard label="Jobs Published" value={jobs.length} hint="Live in local storage file" />
          <StatCard label="Applications" value={applications.length} hint="Scored with Gemini" />
          <StatCard label="Bias Review" value={analysis?.detectedBiases?.length || 0} hint="Current draft" />

          <SectionCard title="Current jobs" subtitle="Switch between published openings.">
            <div className="job-list">
              {jobs.length === 0 ? <p className="muted">No jobs yet.</p> : null}
              {jobs.map((job) => (
                <button
                  key={job.id}
                  className={`job-chip ${job.id === selectedJobId ? 'selected' : ''}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <strong>{job.title}</strong>
                  <span>{job.company}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </aside>

        <section className="main-panel">
          {error ? <div className="error-banner">{error}</div> : null}

          {view === 'employer' ? (
            <>
              <SectionCard
                title="Employer dashboard"
                subtitle="Paste a job link or the full job description, then sanitize and publish it."
                right={<span className="badge soft">Hiring side</span>}
              >
                <div className="form-grid">
                  <label>
                    Job link
                    <div className="inline-row">
                      <input
                        value={employerForm.sourceUrl}
                        onChange={(e) => setEmployerForm({ ...employerForm, sourceUrl: e.target.value })}
                        placeholder="https://ca.indeed.com/viewjob?jk=... or any public job URL"
                      />
                      <button onClick={importIndeed} disabled={importing}>{importing ? 'Importing...' : 'Import from link'}</button>
                    </div>
                  </label>
                  <label className="full-span">
                    Or paste the full job description
                    <textarea
                      rows={6}
                      value={employerForm.description}
                      onChange={(e) => setEmployerForm({ ...employerForm, description: e.target.value })}
                      placeholder="Paste the full job description here if you do not want to rely on a link import. This is the most reliable mode."
                    />
                  </label>
                  <label>
                    Job title
                    <input value={employerForm.title} onChange={(e) => setEmployerForm({ ...employerForm, title: e.target.value })} />
                  </label>
                  <label>
                    Company
                    <input value={employerForm.company} onChange={(e) => setEmployerForm({ ...employerForm, company: e.target.value })} />
                  </label>
                  <label>
                    Location
                    <input value={employerForm.location} onChange={(e) => setEmployerForm({ ...employerForm, location: e.target.value })} />
                  </label>
                </div>

                <div className="double-grid">
                  <label>
                    Original description
                    <textarea
                      value={employerForm.description}
                      onChange={(e) => setEmployerForm({ ...employerForm, description: e.target.value })}
                      rows={10}
                    />
                  </label>
                  <label>
                    Inclusive rewritten description
                    <textarea
                      value={employerForm.inclusiveDescription}
                      onChange={(e) => setEmployerForm({ ...employerForm, inclusiveDescription: e.target.value })}
                      rows={10}
                    />
                  </label>
                </div>

                <div className="inline-row wrap">
                  <button onClick={rewriteWithGemini}>Rewrite with Gemini</button>
                  <button className="primary" onClick={publishJob} disabled={publishing}>
                    {publishing ? 'Publishing...' : 'Publish opening'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Bias analysis" subtitle="Gemini flags problematic wording and explains why it matters. Manual paste is the most reliable import mode without official partner API access.">
                {!analysis ? <p className="muted">Run an import or rewrite first.</p> : null}
                {analysis ? (
                  <>
                    <div className="pill-row wrap">
                      <ScorePill label="Inclusivity" score={analysis.inclusivityScore} />
                      <ScorePill label="Clarity" score={analysis.clarityScore} />
                    </div>
                    <ul className="insight-list">
                      {analysis.detectedBiases.map((item) => (
                        <li key={item.phrase}>
                          <strong>{item.phrase}</strong>
                          <span>{item.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </SectionCard>

              <SectionCard title="Applicant rankings" subtitle="Blind, potential-based review for the selected job.">
                {!selectedJob ? <p className="muted">Publish a job to see rankings.</p> : null}
                <div className="ranking-grid">
                  {rankedApplications.map((app) => (
                    <article className="ranking-card" key={app.id}>
                      <h3>{app.blindProfile.alias}</h3>
                      <div className="pill-row wrap">
                        <ScorePill label="Match" score={app.analysis.matchScore} />
                        <ScorePill label="Potential" score={app.analysis.potentialScore} />
                        <ScorePill label="Fairness confidence" score={app.analysis.fairnessConfidence} />
                      </div>
                      <p>{app.analysis.summary}</p>
                      <div className="small-block">
                        <strong>Strengths</strong>
                        <ul>
                          {app.analysis.strengths.map((s) => <li key={s}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="small-block">
                        <strong>Concerns</strong>
                        <ul>
                          {app.analysis.concerns.map((c) => <li key={c}>{c}</li>)}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              </SectionCard>
            </>
          ) : (
            <>
              <SectionCard title="Applicant portal" subtitle="Apply to the current opening without identity-heavy signals influencing first-pass review." right={<span className="badge soft">Applicant side</span>}>
                <div className="job-preview card-subtle">
                  {selectedJob ? (
                    <>
                      <h3>{selectedJob.title}</h3>
                      <p className="muted">{selectedJob.company} • {selectedJob.location}</p>
                      <p>{selectedJob.description}</p>
                    </>
                  ) : (
                    <p className="muted">No job selected yet.</p>
                  )}
                </div>

                <div className="form-grid">
                  <label>
                    Full name
                    <input value={applicantForm.name} onChange={(e) => setApplicantForm({ ...applicantForm, name: e.target.value })} />
                  </label>
                  <label>
                    Email
                    <input value={applicantForm.email} onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })} />
                  </label>
                </div>

                <label>
                  Resume text
                  <textarea
                    rows={11}
                    value={applicantForm.resumeText}
                    onChange={(e) => setApplicantForm({ ...applicantForm, resumeText: e.target.value })}
                    placeholder="Paste the resume here. For a hackathon demo, text paste is faster and more reliable than file parsing."
                  />
                </label>

                <label>
                  Optional context for a career break or caregiving history
                  <textarea
                    rows={4}
                    value={applicantForm.careerBreakContext}
                    onChange={(e) => setApplicantForm({ ...applicantForm, careerBreakContext: e.target.value })}
                    placeholder="This context is passed to the model with explicit instructions not to penalize it."
                  />
                </label>

                <button className="primary" onClick={submitApplication} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit application'}
                </button>
              </SectionCard>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
