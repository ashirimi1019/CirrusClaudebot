/**
 * /api/skills/run
 *
 * Streams skill output back to the browser via Server-Sent Events.
 * Every execution is logged to the `skill_runs` table in Supabase.
 * Generated files are tracked in the `artifacts` table.
 *
 * Query params:
 *   skill    = 1–6 (required)
 *   offer    = offer slug (required for skills 2–6)
 *   campaign = campaign slug (required for skills 3–6)
 *   formData = JSON-encoded form answers (skills 1–2)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { ConsoleCapture } from '@/lib/console-capture';
import { checkSkillRunRateLimit } from '@/lib/rate-limit';
import {
  withWriteDir,
  ensureContextFiles,
  prepareInputFiles,
  WRITE_BASE,
} from '@/lib/vercel-paths';
import fs from 'fs';
import path from 'path';

// Allow up to 5 minutes for Skill 4 (Apollo API calls + lead scoring)
export const maxDuration = 300;

type FormData = Record<string, string>;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Module-level singleton — avoids creating a new connection pool per request
const adminDb = getServiceClient();

/** Extract the authenticated user ID from request cookies (non-fatal). */
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Route handler — no response cookies needed
          },
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveIds(
  offerSlug: string,
  campaignSlug: string,
): Promise<{ offerId: string | null; campaignId: string | null }> {
  const sb = adminDb;
  let offerId: string | null = null;
  let campaignId: string | null = null;

  if (offerSlug) {
    const { data: offerRows } = await sb
      .from('offers')
      .select('id')
      .eq('slug', offerSlug)
      .limit(1);
    const rows = offerRows as { id: string }[] | null;
    offerId = rows?.[0]?.id ?? null;
  }

  if (campaignSlug && offerId) {
    const { data: campaignRows } = await sb
      .from('campaigns')
      .select('id')
      .eq('offer_id', offerId)
      .eq('slug', campaignSlug)
      .limit(1);
    const rows = campaignRows as { id: string }[] | null;
    campaignId = rows?.[0]?.id ?? null;
  }

  return { offerId, campaignId };
}

// ─── Artifact definitions per skill ──────────────────────────────────────────

type ArtifactDef = {
  relPath: string;   // relative to offers/{offer}/...
  fileName: string;
  fileType: string;
  category: string;
};

function getSkillArtifacts(
  skill: number,
  offer: string,
  campaign: string,
): ArtifactDef[] {
  const offerBase = `offers/${offer}`;
  const campaignBase = `${offerBase}/campaigns/${campaign}`;

  switch (skill) {
    case 1:
      return [
        { relPath: `${offerBase}/positioning.md`, fileName: 'positioning.md', fileType: 'md', category: 'positioning' },
      ];
    case 2:
      return [
        { relPath: `${campaignBase}/strategy.md`, fileName: 'strategy.md', fileType: 'md', category: 'strategy' },
      ];
    case 3:
      return [
        { relPath: `${campaignBase}/copy/email-variants.md`, fileName: 'email-variants.md', fileType: 'md', category: 'copy' },
        { relPath: `${campaignBase}/copy/linkedin-variants.md`, fileName: 'linkedin-variants.md', fileType: 'md', category: 'copy' },
        { relPath: `${campaignBase}/copy/personalization-notes.md`, fileName: 'personalization-notes.md', fileType: 'md', category: 'copy' },
      ];
    case 4:
      return [
        { relPath: `${campaignBase}/leads/all_leads.csv`, fileName: 'all_leads.csv', fileType: 'csv', category: 'leads' },
      ];
    case 5:
      return [
        { relPath: `${campaignBase}/outreach/messages.csv`, fileName: 'messages.csv', fileType: 'csv', category: 'outreach' },
      ];
    case 6:
      return [
        { relPath: `${campaignBase}/results/learnings.md`, fileName: 'learnings.md', fileType: 'md', category: 'results' },
      ];
    default:
      return [];
  }
}

async function recordArtifacts(
  sb: ReturnType<typeof getServiceClient>,
  skill: number,
  offer: string,
  campaign: string,
  runId: string | null,
  offerId: string | null,
  campaignId: string | null,
  userId: string | null,
): Promise<void> {
  const defs = getSkillArtifacts(skill, offer, campaign);
  const rows = [];

  for (const def of defs) {
    const fullPath = path.join(WRITE_BASE, def.relPath);
    let fileSize: number | null = null;
    try {
      const stat = fs.statSync(fullPath);
      fileSize = stat.size;
    } catch {
      // File might not exist if skill didn't produce it — skip
      continue;
    }

    rows.push({
      skill_run_id: runId,
      skill_number: skill,
      offer_id: offerId,
      campaign_id: campaignId,
      user_id: userId,
      file_path: def.relPath,
      file_type: def.fileType,
      file_name: def.fileName,
      category: def.category,
      file_size_bytes: fileSize,
    });
  }

  if (rows.length > 0) {
    try {
      await sb.from('artifacts').insert(rows);
    } catch {
      // Non-fatal: artifact tracking failure should not break anything
    }
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skillParam = searchParams.get('skill');
  const offer = searchParams.get('offer') ?? '';
  const campaign = searchParams.get('campaign') ?? '';

  const skill = Number(skillParam);
  if (!skill || skill < 1 || skill > 6) {
    return new Response('Invalid skill number', { status: 400 });
  }

  // Decode optional JSON form data (Skills 1 & 2)
  let formData: FormData = {};
  const fdParam = searchParams.get('formData');
  if (fdParam) {
    try {
      formData = JSON.parse(fdParam);
    } catch {
      /* ignore malformed JSON */
    }
  }

  // Extract authenticated user — required for cost-bearing skills
  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting — 20 requests/hour per user (IP fallback)
  {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';
    const rl = await checkSkillRunRateLimit(adminDb, userId, ip);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(Math.max(0, rl.limit - rl.count)),
          'X-RateLimit-Reset': String(Math.floor(rl.resetAt.getTime() / 1000)),
        },
      });
    }
  }

  // Resolve offer/campaign IDs early for active-run lock
  const { offerId: earlyOfferId, campaignId: earlyCampaignId } = await resolveIds(offer, campaign);

  // Active-run lock — block duplicate concurrent runs for same campaign/offer
  {
    const lockField = earlyCampaignId ? 'campaign_id' : (earlyOfferId ? 'offer_id' : null);
    const lockValue = earlyCampaignId ?? earlyOfferId;
    if (lockField && lockValue) {
      const { data: runningRows } = await adminDb
        .from('skill_runs')
        .select('id, skill_number, started_at')
        .eq('status', 'running')
        .eq(lockField, lockValue)
        .limit(1);
      if (runningRows && runningRows.length > 0) {
        const running = runningRows[0] as { id: string; skill_number: number; started_at: string };
        return new Response(
          JSON.stringify({
            error: 'A skill is already running for this campaign. Please wait for it to complete.',
            runningSkill: running.skill_number,
            startedAt: running.started_at,
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }
  }

  // Validate slugs to prevent path traversal / injection
  const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$|^[a-z0-9]$/;
  if (offer && !SAFE_SLUG.test(offer)) {
    return new Response(JSON.stringify({ error: 'Invalid offer slug' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (campaign && !SAFE_SLUG.test(campaign)) {
    return new Response(JSON.stringify({ error: 'Invalid campaign slug' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* stream already closed */
        }
      };

      // Collect all log lines for persistence
      const collectedLogs: string[] = [];

      // Capture console.log/warn/error and forward every line as an SSE event
      const capture = new ConsoleCapture((line) => {
        collectedLogs.push(line);
        sendEvent({ type: 'log', text: line });
      });

      // ── Supabase skill_runs tracking ──────────────────────────────────────
      const sb = adminDb;
      const startedAt = Date.now();

      // Resolve offer/campaign IDs for foreign keys (resolved early for active-run lock)
      const offerId = earlyOfferId;
      const campaignId = earlyCampaignId;

      // Insert a "running" row so the UI can see the run started
      let runId: string | null = null;
      try {
        const { data: runRow } = await sb
          .from('skill_runs')
          .insert({
            skill_number: skill,
            status: 'running',
            offer_id: offerId,
            campaign_id: campaignId,
            user_id: userId,
            started_at: new Date(startedAt).toISOString(),
          })
          .select('id')
          .single();
        runId = runRow?.id ?? null;
      } catch {
        // Non-fatal: DB tracking failure should not block skill execution
      }

      const finaliseRun = async (exitCode: number) => {
        if (!runId) return;
        const finishedAt = Date.now();
        try {
          await sb
            .from('skill_runs')
            .update({
              status: exitCode === 0 ? 'success' : 'failed',
              exit_code: exitCode,
              log_lines: collectedLogs,
              finished_at: new Date(finishedAt).toISOString(),
              duration_ms: finishedAt - startedAt,
            })
            .eq('id', runId);
        } catch {
          /* Non-fatal */
        }

        // Record artifacts on success
        if (exitCode === 0) {
          await recordArtifacts(sb, skill, offer, campaign, runId, offerId, campaignId, userId);
        }
      };

      try {
        capture.start();

        // 1. Copy context/ from bundle → /tmp (no-op on local dev or warm Vercel instances)
        await ensureContextFiles();

        // 2. Reconstruct any missing input files from Supabase (Vercel only)
        await prepareInputFiles(skill, offer, campaign);

        // 3. Run the skill inside the patched CWD / exit guard
        await withWriteDir(async () => {
          // Skills 3–6 read offer/campaign from process.argv; patch before calling
          const savedArgv = process.argv.slice();
          process.argv = [process.argv[0], process.argv[1], offer, campaign];

          try {
            switch (skill) {
              case 1: {
                const { runSkill1NewOffer } = await import(
                  /* webpackChunkName: "skill-1" */
                  '@cirrus/skills/skill-1-new-offer'
                );
                const skill1Config = Object.keys(formData).length > 0
                  ? formData
                  : { name: offer };
                await runSkill1NewOffer(skill1Config as unknown as Parameters<typeof runSkill1NewOffer>[0]);
                break;
              }

              case 2: {
                const { runSkill2CampaignStrategy } = await import(
                  /* webpackChunkName: "skill-2" */
                  '@cirrus/skills/skill-2-campaign-strategy'
                );
                const skill2Config = Object.keys(formData).length > 0
                  ? formData
                  : { name: campaign };
                await runSkill2CampaignStrategy(
                  offer,
                  skill2Config as unknown as Parameters<typeof runSkill2CampaignStrategy>[1],
                );
                break;
              }

              case 3: {
                const { runSkill3CampaignCopy } = await import(
                  /* webpackChunkName: "skill-3" */
                  '@cirrus/skills/skill-3-campaign-copy'
                );
                await runSkill3CampaignCopy();
                break;
              }

              case 4: {
                const { runSkill4FindLeads } = await import(
                  /* webpackChunkName: "skill-4" */
                  '@cirrus/skills/skill-4-find-leads'
                );
                await runSkill4FindLeads();
                break;
              }

              case 5: {
                const { runSkill5LaunchOutreach } = await import(
                  /* webpackChunkName: "skill-5" */
                  '@cirrus/skills/skill-5-launch-outreach'
                );
                await runSkill5LaunchOutreach(offer, campaign);
                break;
              }

              case 6: {
                const { runSkill6CampaignReview } = await import(
                  /* webpackChunkName: "skill-6" */
                  '@cirrus/skills/skill-6-campaign-review'
                );
                await runSkill6CampaignReview(offer, campaign, {
                  apolloSequenceId: formData.apolloSequenceId ?? '',
                  meetings: formData.meetings ? Number(formData.meetings) : undefined,
                  closed: formData.closed ? Number(formData.closed) : undefined,
                  autoMode: true,
                });
                break;
              }
            }
          } finally {
            process.argv = savedArgv;
          }
        });

        await finaliseRun(0);
        sendEvent({ type: 'done', code: 0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // process.exit(0) throws but is actually a clean success
        if (msg === 'Skill called process.exit(0)') {
          await finaliseRun(0);
          sendEvent({ type: 'done', code: 0 });
        } else {
          collectedLogs.push(`❌ ${msg}`);
          await finaliseRun(1);
          sendEvent({ type: 'log', text: `❌ ${msg}` });
          sendEvent({ type: 'done', code: 1 });
        }
      } finally {
        capture.stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
