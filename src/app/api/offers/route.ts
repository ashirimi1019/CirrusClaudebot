/**
 * API Route: /api/offers
 * GET  — List all offers
 * POST — Create a new offer (mirrors Skill 1)
 *
 * Note: This is a stub for a future Next.js API layer.
 * Currently the system is CLI-only. These routes would be
 * activated when moving to Option 2/3 deployment (see CLAUDE.md).
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';

export async function GET() {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('offers')
    .select('id, slug, name, description, category, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ offers: data });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, string>;

  if (!body.slug || !body.name || !body.positioning) {
    return Response.json(
      { error: 'Missing required fields: slug, name, positioning' },
      { status: 400 }
    );
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('offers')
    .upsert({
      slug: body.slug,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      target_market: body.target_market || null,
      positioning_summary: body.positioning_summary || null,
      icp_summary: body.icp_summary || null,
      buyer_summary: body.buyer_summary || null,
      positioning: body.positioning,
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ offer: data }, { status: 201 });
}
