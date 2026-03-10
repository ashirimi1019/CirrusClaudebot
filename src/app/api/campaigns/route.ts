/**
 * API Route: /api/campaigns
 * GET  — List campaigns (optionally filtered by offer_id)
 * POST — Create a campaign (mirrors Skill 2)
 *
 * Note: Stub for future Next.js API layer.
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offerId = url.searchParams.get('offer_id');

  const sb = getSupabaseClient();
  let query = sb
    .from('campaigns')
    .select('id, offer_id, slug, name, signal_type, status, created_at')
    .order('created_at', { ascending: false });

  if (offerId) {
    query = query.eq('offer_id', offerId);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ campaigns: data });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, string>;

  if (!body.offer_id || !body.slug) {
    return Response.json(
      { error: 'Missing required fields: offer_id, slug' },
      { status: 400 }
    );
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('campaigns')
    .upsert({
      offer_id: body.offer_id,
      slug: body.slug,
      name: body.name || null,
      signal_hypothesis: body.signal_hypothesis || null,
      signal_type: body.signal_type || null,
      messaging_framework: body.messaging_framework || null,
      status: body.status || 'draft',
      strategy: body.strategy || null,
      strategy_summary: body.strategy_summary || null,
    }, { onConflict: 'offer_id,slug' })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ campaign: data }, { status: 201 });
}
