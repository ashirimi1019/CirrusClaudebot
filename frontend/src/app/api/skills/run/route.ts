/**
 * /api/skills/run
 *
 * Streams skill output back to the browser via Server-Sent Events.
 *
 * On LOCAL dev: identical to before — the existing local files are used directly.
 * On VERCEL:    skills are imported via webpack aliases (no child_process.spawn),
 *               writes land in /tmp/cirrus-work, and process.cwd() is patched.
 *
 * Query params:
 *   skill    = 1–6 (required)
 *   offer    = offer slug (required for skills 2–6)
 *   campaign = campaign slug (required for skills 3–6)
 *   formData = JSON-encoded form answers (skills 1–2)
 */

import { NextRequest } from 'next/server';
import { ConsoleCapture } from '@/lib/console-capture';
import {
  withWriteDir,
  ensureContextFiles,
  prepareInputFiles,
} from '@/lib/vercel-paths';

// Allow up to 5 minutes for Skill 4 (Apollo API calls + lead scoring)
export const maxDuration = 300;

type FormData = Record<string, string>;

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
      formData = JSON.parse(decodeURIComponent(fdParam));
    } catch {
      /* ignore malformed JSON */
    }
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

      // Capture console.log/warn/error and forward every line as an SSE event
      const capture = new ConsoleCapture((line) => sendEvent({ type: 'log', text: line }));

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
                // OfferConfig shape matches the 13-field form.
                // If formData is empty (pipeline re-run), fall back to offer slug as name.
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
                // If formData is empty (pipeline re-run), fall back to campaign slug as name.
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

        sendEvent({ type: 'done', code: 0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // process.exit(0) throws but is actually a clean success
        if (msg === 'Skill called process.exit(0)') {
          sendEvent({ type: 'done', code: 0 });
        } else {
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
