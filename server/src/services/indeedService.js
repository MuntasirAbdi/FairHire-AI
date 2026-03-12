import { fallbackJobImport } from './fallbacks.js';
import { rewriteJobDescription } from './geminiService.js';

function parseJobKey(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('jk') || parsed.pathname.split('/').filter(Boolean).pop() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonLdJobPosting(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const node = item?.['@graph'] ? item['@graph'].find((x) => x?.['@type'] === 'JobPosting') : item;
        if (node?.['@type'] === 'JobPosting') {
          return {
            title: node.title || node.name || '',
            company: node.hiringOrganization?.name || '',
            location: node.jobLocation?.address?.addressLocality || node.jobLocation?.address?.addressRegion || '',
            description: stripHtml(node.description || '')
          };
        }
      }
    } catch {
      // ignore invalid blocks
    }
  }
  return null;
}

function extractMetaContent(html, property) {
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  return html.match(regex)?.[1]?.trim() || '';
}

function extractTitleTag(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

async function tryUrlExtraction(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 FairHireAI Demo Extractor'
      }
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const jsonLd = extractJsonLdJobPosting(html);
    if (jsonLd?.description) {
      return {
        title: jsonLd.title || extractMetaContent(html, 'og:title') || 'Imported Job Posting',
        company: jsonLd.company || 'Imported Company',
        location: jsonLd.location || 'Location not detected',
        description: jsonLd.description,
        extractionMode: 'public-page-jsonld'
      };
    }

    const description = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description');
    const title = extractMetaContent(html, 'og:title') || extractTitleTag(html);
    if (description || title) {
      return {
        title: title || 'Imported Job Posting',
        company: 'Imported Company',
        location: 'Location not detected',
        description: description || 'Job description could not be fully extracted from the public page. Paste it manually for best results.',
        extractionMode: 'public-page-meta'
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function importIndeedPosting({ url, text }) {
  if (!url && !text) throw new Error('Provide a job URL or paste a job description.');

  const partnerEnabled = Boolean(process.env.INDEED_CLIENT_ID && process.env.INDEED_CLIENT_SECRET);

  let baseJob;
  let mode = 'manual-text';
  if (text?.trim()) {
    baseJob = {
      title: 'Pasted Job Posting',
      company: 'Manual Entry',
      location: 'Unspecified',
      description: text.trim()
    };
  } else {
    const extracted = await tryUrlExtraction(url);
    if (extracted) {
      baseJob = extracted;
      mode = extracted.extractionMode;
    } else {
      baseJob = fallbackJobImport(url);
      mode = 'demo-fallback';
    }
  }

  const imported = {
    ...baseJob,
    sourceUrl: url || '',
    source: text?.trim()
      ? 'Manual paste'
      : partnerEnabled
        ? 'Indeed Partner API adapter configured'
        : mode === 'demo-fallback'
          ? 'Fallback demo adapter'
          : 'Best-effort public-page extraction',
    externalId: url ? parseJobKey(url) : 'manual-entry'
  };

  const rewritten = await rewriteJobDescription(imported);
  return {
    job: {
      ...imported,
      inclusiveDescription: rewritten.rewrittenDescription
    },
    analysis: rewritten.analysis,
    importInfo: {
      mode,
      note: text?.trim()
        ? 'Manual text was analyzed directly.'
        : mode === 'demo-fallback'
          ? 'Public extraction failed or the site blocked access, so the demo fallback was used. Paste the description manually for accurate results.'
          : 'Public job content was extracted without official Indeed credentials. Results depend on what the public page exposes.'
    },
    indeed: {
      mode: partnerEnabled ? 'partner-api-configured' : 'no-partner-api',
      note: partnerEnabled
        ? 'Add your approved Indeed partner API call pattern here once credentials and scopes are issued.'
        : 'Official Indeed partner credentials are not configured. This build uses manual paste or best-effort public extraction instead.'
    }
  };
}
