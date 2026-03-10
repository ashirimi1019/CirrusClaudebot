import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Map skill number → script filename
const SKILL_SCRIPTS: Record<string, string> = {
  '1': 'scripts/run-skill-1-new-offer.ts',
  '2': 'scripts/run-skill-2-campaign-strategy.ts',
  '3': 'scripts/run-skill-3-campaign-copy.ts',
  '4': 'scripts/run-skill-4-find-leads.ts',
  '5': 'scripts/run-skill-5-launch-outreach.ts',
  '6': 'scripts/run-skill-6-campaign-review.ts',
};

/**
 * Build stdin answers for Skill 1 (New Offer).
 * Order matches the readline prompts in skill-1-new-offer.ts.
 */
function buildSkill1Stdin(data: Record<string, string>): string {
  return [
    data.name || '',
    data.category || '',
    data.targetCustomer || '',
    data.customerProblem || '',
    data.whyNow || '',
    data.customerAlternative || '',
    data.observableSuccess || '',
    data.valueProp || '',
    data.differentiators || '',
    data.salesModel || '',
    data.objectionHandlers || '',
    data.goToMarket || '',
    data.pricingPackaging || '',
    data.successStories || '',
  ].join('\n') + '\n';
}

/**
 * Build stdin answers for Skill 2 (Campaign Strategy).
 * Order matches the readline prompts in skill-2-campaign-strategy.ts.
 */
function buildSkill2Stdin(data: Record<string, string>): string {
  return [
    data.offer || '',           // offer slug (if not provided via first prompt)
    data.campaignName || '',
    data.signalType || '',
    data.signalHypothesis || '',
    data.detectionMethod || '',
    data.primaryAPI || 'Apollo.io',
    data.secondaryAPIs || 'Apollo.io enrichment (built-in)',
    data.messagingFramework || 'PVP',
    data.targetGeography || 'US',
    data.companyFilters || 'Series A+, 50-1000 employees',
    data.buyerFilters || 'CTO, VP Engineering, Founder',
    data.expectedVolume || '20-30 companies per search',
    data.expectedFit || '60% will match ICP',
  ].join('\n') + '\n';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get('skill');
  const offer = searchParams.get('offer') || '';
  const campaign = searchParams.get('campaign') || '';

  if (!skill || !SKILL_SCRIPTS[skill]) {
    return new Response('Invalid skill number', { status: 400 });
  }

  const scriptPath = SKILL_SCRIPTS[skill];
  // The frontend runs from /frontend, monorepo root is one level up
  const monorepoRoot = path.join(process.cwd(), '..');

  // Build CLI args
  const args = ['--loader', 'ts-node/esm', scriptPath];
  // Skills 3-6 accept offer + campaign as argv[2] and argv[3]
  if (['3', '4', '5', '6'].includes(skill)) {
    if (offer) args.push(offer);
    if (campaign) args.push(campaign);
  }

  // Decode optional JSON-encoded form data (used by Skills 1 and 2)
  const formDataParam = searchParams.get('formData');
  let formData: Record<string, string> = {};
  if (formDataParam) {
    try {
      formData = JSON.parse(decodeURIComponent(formDataParam));
    } catch {
      // ignore parse errors
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn('node', args, {
        cwd: monorepoRoot,
        // Pass parent env so dotenv can supplement with root .env values
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Pipe stdin answers for interactive skills
      try {
        if (skill === '1') {
          const stdin = buildSkill1Stdin(formData);
          child.stdin.write(stdin);
          child.stdin.end();
        } else if (skill === '2') {
          const stdin = buildSkill2Stdin({ offer, ...formData });
          child.stdin.write(stdin);
          child.stdin.end();
        } else {
          child.stdin.end();
        }
      } catch {
        child.stdin.end();
      }

      const sendEvent = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // stream may already be closed
        }
      };

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line) sendEvent({ type: 'log', text: line });
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line) sendEvent({ type: 'log', text: line });
        }
      });

      child.on('close', (code) => {
        sendEvent({ type: 'done', code: code ?? 0 });
        try { controller.close(); } catch { /* already closed */ }
      });

      child.on('error', (err) => {
        sendEvent({ type: 'error', message: err.message });
        try { controller.close(); } catch { /* already closed */ }
      });
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
