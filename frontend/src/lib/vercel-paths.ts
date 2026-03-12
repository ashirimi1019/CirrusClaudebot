/**
 * vercel-paths.ts
 *
 * Handles path management for running skills inside Vercel serverless functions:
 *   - Detects if we're running on Vercel
 *   - Finds the monorepo root inside the deployment bundle
 *   - Provides a writable scratch area (/tmp/cirrus-work on Vercel, repo root locally)
 *   - Copies static context/ files from the bundle to /tmp on cold start
 *   - Reconstructs required input files from Supabase before each skill run
 *   - Patches process.cwd() + process.exit() for the duration of a skill run
 */

import path from 'path';
import fs from 'fs';

// ─── Environment detection ────────────────────────────────────────────────────

export const IS_VERCEL = !!(process.env.VERCEL || process.env.VERCEL_ENV);

// ─── Repo root discovery ──────────────────────────────────────────────────────

/**
 * Walk up from the initial cwd looking for a sentinel file (CLAUDE.md or
 * src/core/skills).  On Vercel, outputFileTracingRoot = monorepo root so the
 * Next.js standalone bundle lands at /var/task.
 */
function findRepoRoot(): string {
  if (process.env.CIRRUS_REPO_ROOT) return process.env.CIRRUS_REPO_ROOT;

  // On Vercel the deployment root is /var/task (Next.js standalone)
  const candidates = IS_VERCEL
    ? ['/var/task', process.cwd()]
    : [process.cwd()];

  for (const start of candidates) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (
        fs.existsSync(path.join(dir, 'CLAUDE.md')) ||
        fs.existsSync(path.join(dir, 'src', 'core', 'skills'))
      ) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return IS_VERCEL ? '/var/task' : process.cwd();
}

export const REPO_ROOT = findRepoRoot();

/**
 * All skill file writes go here.  On Vercel only /tmp is writable; locally we
 * write directly into the repo so files land at the expected paths.
 */
export const WRITE_BASE = IS_VERCEL ? '/tmp/cirrus-work' : REPO_ROOT;

// ─── Context file copying ─────────────────────────────────────────────────────

let contextCopied = false;

/**
 * Copy the static context/ directory from the deployment bundle into /tmp so
 * skills can read email-principles.md etc. via process.cwd().
 * Safe to call multiple times — only runs once per cold start.
 */
export async function ensureContextFiles(): Promise<void> {
  if (!IS_VERCEL || contextCopied) return;

  const srcContext = path.join(REPO_ROOT, 'context');
  const dstContext = path.join(WRITE_BASE, 'context');

  if (!fs.existsSync(srcContext)) {
    console.warn('[vercel-paths] context/ not found at', srcContext);
    return;
  }

  copyDirRecursive(srcContext, dstContext);
  contextCopied = true;
  console.log('[vercel-paths] context/ ready at', dstContext);
}

function copyDirRecursive(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// ─── Supabase client (server-side only) ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role key (bypasses RLS); fall back to anon key for reads
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

// ─── Input file reconstruction ───────────────────────────────────────────────

/**
 * Before running a skill on Vercel, reconstruct the files it expects to find on
 * disk (positioning.md, strategy.md, copy/, leads/) from Supabase data.
 * On local dev, real files already exist — this is a no-op.
 */
export async function prepareInputFiles(
  skillNum: number,
  offerSlug: string,
  campaignSlug?: string,
): Promise<void> {
  if (!IS_VERCEL) return;

  const supabase = await getAdminClient();
  if (!supabase) return;

  const offerDir = path.join(WRITE_BASE, 'offers', offerSlug);
  fs.mkdirSync(offerDir, { recursive: true });

  // Skills 2–6 need positioning.md
  if (skillNum >= 2 && offerSlug) {
    const posFile = path.join(offerDir, 'positioning.md');
    if (!fs.existsSync(posFile)) {
      const { data: offer } = await supabase
        .from('offers')
        .select('name, category, positioning, positioning_summary')
        .eq('slug', offerSlug)
        .single();

      if (offer) {
        const pos = (offer.positioning as Record<string, string>) ?? {};
        fs.writeFileSync(posFile, buildPositioningMd(offer.name, offer.category, pos, offer.positioning_summary), 'utf8');
        console.log('[vercel-paths] reconstructed positioning.md');
      }
    }
  }

  if (!campaignSlug) return;

  const campaignDir = path.join(offerDir, 'campaigns', campaignSlug);
  fs.mkdirSync(campaignDir, { recursive: true });

  // Skills 3–6 need strategy.md
  if (skillNum >= 3) {
    const stratFile = path.join(campaignDir, 'strategy.md');
    if (!fs.existsSync(stratFile)) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('name, signal_type, signal_hypothesis, messaging_framework, strategy, strategy_summary')
        .eq('slug', campaignSlug)
        .single();

      if (campaign) {
        const strat = (campaign.strategy as Record<string, string>) ?? {};
        fs.writeFileSync(stratFile, buildStrategyMd(campaign.name || campaignSlug, campaign, strat), 'utf8');
        console.log('[vercel-paths] reconstructed strategy.md');
      }
    }
  }

  // Skills 5–6 need copy files + leads CSV
  if (skillNum >= 5) {
    await reconstructCopyFiles(supabase, campaignSlug, campaignDir);
    await reconstructLeadsCSV(supabase, campaignSlug, campaignDir);
  }
}

// ─── Markdown reconstruction helpers ─────────────────────────────────────────

function buildPositioningMd(
  name: string,
  category: string | null,
  pos: Record<string, string>,
  summary: string | null,
): string {
  return `# Offer Positioning: ${name}

## Category
${pos.category ?? category ?? ''}

## Target Customer
${pos.targetCustomer ?? ''}

## Customer Problem
${pos.customerProblem ?? ''}

## Why Now
${pos.whyNow ?? ''}

## Customer Alternative
${pos.customerAlternative ?? ''}

## Observable Success
${pos.observableSuccess ?? ''}

## Value Proposition
${pos.valueProp ?? ''}

## Differentiators
${pos.differentiators ?? ''}

## Sales Model
${pos.salesModel ?? ''}

## Objection Handlers
${pos.objectionHandlers ?? ''}

## Go-to-Market
${pos.goToMarket ?? ''}

## Pricing & Packaging
${pos.pricingPackaging ?? ''}

## Success Stories / Proof
${pos.successStories ?? ''}
${summary ? `\n---\n\n## Summary\n${summary}\n` : ''}
---
_Reconstructed from Supabase: ${new Date().toISOString()}_
`;
}

function buildStrategyMd(
  name: string,
  campaign: Record<string, unknown>,
  strat: Record<string, string>,
): string {
  return `# Campaign Strategy: ${name}

## Signal Type
${(campaign.signal_type as string) ?? strat.signalType ?? ''}

## Signal Hypothesis
${(campaign.signal_hypothesis as string) ?? strat.signalHypothesis ?? ''}

## Detection Method
${strat.detectionMethod ?? ''}

## Messaging Framework
${(campaign.messaging_framework as string) ?? strat.messagingFramework ?? 'PVP'}

## Target Geography
${strat.targetGeography ?? 'US'}

## Company Filters
${strat.companyFilters ?? 'Series A+, 50-1000 employees'}

## Buyer Persona Filters
${strat.buyerFilters ?? 'CTO, VP Engineering, Founder'}

## Primary API
${strat.primaryAPI ?? 'Apollo.io'}

## Expected Volume
${strat.expectedVolume ?? '20-30 companies per search'}
${(campaign.strategy_summary as string) ? `\n---\n\n## Summary\n${campaign.strategy_summary as string}\n` : ''}
---
_Reconstructed from Supabase: ${new Date().toISOString()}_
`;
}

// ─── Copy file reconstruction ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reconstructCopyFiles(supabase: any, campaignSlug: string, campaignDir: string): Promise<void> {
  const copyDir = path.join(campaignDir, 'copy');
  fs.mkdirSync(copyDir, { recursive: true });

  const emailFile = path.join(copyDir, 'email-variants.md');
  if (fs.existsSync(emailFile)) return;

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('slug', campaignSlug)
    .single();

  if (!campaign?.id) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variants } = await supabase
    .from('message_variants')
    .select('channel, variant_name, subject_line, body')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  if (!variants?.length) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailVars = variants.filter((v: any) => v.channel === 'email');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liVars = variants.filter((v: any) => v.channel === 'linkedin');

  if (emailVars.length) {
    const content = emailVars
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any, i: number) =>
        `## Email Variant ${i + 1}: ${v.variant_name ?? ''}\n\n**Subject:** ${v.subject_line ?? ''}\n\n${v.body ?? ''}`,
      )
      .join('\n\n---\n\n');
    fs.writeFileSync(emailFile, content, 'utf8');

    // Also write individual .txt files — required by Skill 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emailVars.forEach((v: any, i: number) => {
      const txtPath = path.join(copyDir, `email-variant-${i + 1}.txt`);
      fs.writeFileSync(txtPath, `---\nSubject: ${v.subject_line ?? ''}\n\n${v.body ?? ''}\n---`, 'utf8');
    });
    console.log('[vercel-paths] reconstructed email-variants.md + .txt files');
  }

  if (liVars.length) {
    const content = liVars
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any, i: number) =>
        `## LinkedIn Variant ${i + 1}: ${v.variant_name ?? ''}\n\n${v.body ?? ''}`,
      )
      .join('\n\n---\n\n');
    fs.writeFileSync(path.join(copyDir, 'linkedin-variants.md'), content, 'utf8');
    console.log('[vercel-paths] reconstructed linkedin-variants.md');
  }
}

// ─── Leads CSV reconstruction ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reconstructLeadsCSV(supabase: any, campaignSlug: string, campaignDir: string): Promise<void> {
  const leadsDir = path.join(campaignDir, 'leads');
  fs.mkdirSync(leadsDir, { recursive: true });

  const leadsFile = path.join(leadsDir, 'all_leads.csv');
  if (fs.existsSync(leadsFile)) return;

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('slug', campaignSlug)
    .single();

  if (!campaign?.id) return;

  // Join campaign_contacts → contacts → companies via foreign keys
  const { data: rows } = await supabase
    .from('campaign_contacts')
    .select(`
      contacts (
        first_name, last_name, title, email, linkedin_url,
        companies ( name, domain, fit_score )
      ),
      campaign_companies ( signal_details, fit_score )
    `)
    .eq('campaign_id', campaign.id);

  if (!rows?.length) return;

  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = 'company_name,company_domain,hiring_signal,job_url,posted_at,fit_score,first_name,last_name,title,email,linkedin_url';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = rows.map((r: any) => {
    const c = r.contacts;
    const co = Array.isArray(c?.companies) ? c.companies[0] : c?.companies;
    const sig = Array.isArray(r.campaign_companies) ? r.campaign_companies[0] : r.campaign_companies;
    return [
      co?.name ?? '', co?.domain ?? '',
      sig?.signal_details ?? '', '', '',
      co?.fit_score ?? sig?.fit_score ?? '',
      c?.first_name ?? '', c?.last_name ?? '',
      c?.title ?? '', c?.email ?? '', c?.linkedin_url ?? '',
    ].map(q).join(',');
  });

  fs.writeFileSync(leadsFile, [header, ...lines].join('\n'), 'utf8');
  console.log('[vercel-paths] reconstructed all_leads.csv with', lines.length, 'rows');
}

// ─── process.cwd + process.exit patching ────────────────────────────────────

/**
 * Run `fn` with:
 *   - process.cwd() returning WRITE_BASE so skills resolve paths correctly
 *   - process.exit() throwing instead of killing the Next.js process
 *
 * Both are restored in a finally block.
 */
export async function withWriteDir<T>(fn: () => Promise<T>): Promise<T> {
  const originalCwd = process.cwd;
  const originalExit = process.exit;

  fs.mkdirSync(WRITE_BASE, { recursive: true });
  process.cwd = () => WRITE_BASE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).exit = (code?: number) => {
    throw new Error(`Skill called process.exit(${code ?? 0})`);
  };

  try {
    return await fn();
  } finally {
    process.cwd = originalCwd;
    process.exit = originalExit;
  }
}
