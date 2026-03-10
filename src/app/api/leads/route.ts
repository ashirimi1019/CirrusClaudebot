/**
 * API Route: /api/leads
 * GET — List contacts for a campaign
 *
 * Note: Stub for future Next.js API layer.
 * The actual lead-finding logic runs via Skill 4 (CLI).
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign_id');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (!campaignId) {
    return Response.json({ error: 'campaign_id query param is required' }, { status: 400 });
  }

  const sb = getSupabaseClient();

  // Get companies in this campaign, joined with contacts
  const { data, error } = await sb
    .from('campaign_companies')
    .select(`
      id,
      status,
      added_at,
      companies (
        id, name, domain, fit_score, size_min, funding_stage,
        contacts (
          id, first_name, last_name, title, email, linkedin_url, fit_score
        )
      )
    `)
    .eq('campaign_id', campaignId)
    .order('added_at', { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ leads: data, count: data?.length || 0 });
}
