/**
 * API Route: /api/copy
 * GET  — List message variants for a campaign
 * POST — Trigger copy generation (mirrors Skill 3)
 *
 * Note: Stub for future Next.js API layer.
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign_id');
  const channel = url.searchParams.get('channel'); // 'email' | 'linkedin'

  if (!campaignId) {
    return Response.json({ error: 'campaign_id query param is required' }, { status: 400 });
  }

  const sb = getSupabaseClient();
  let query = sb
    .from('message_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (channel) {
    query = query.eq('channel', channel);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ variants: data, count: data?.length || 0 });
}

export async function POST(request: Request) {
  // Stub: In production this would trigger the Skill 3 copy generation
  // asynchronously and return a job ID for polling.
  return Response.json(
    {
      message: 'Copy generation not yet available via API. Run: npm run skill:3 -- {offer} {campaign}',
      status: 'not_implemented',
    },
    { status: 501 }
  );
}
