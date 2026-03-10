/**
 * API Route: /api/review
 * GET — Get campaign metrics summary
 *
 * Note: Stub for future Next.js API layer.
 * Full review logic runs via Skill 6 (CLI).
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';
import { computeRates } from '../../../lib/services/campaign-metrics.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign_id');

  if (!campaignId) {
    return Response.json({ error: 'campaign_id query param is required' }, { status: 400 });
  }

  const sb = getSupabaseClient();

  // Get latest metrics for this campaign
  const { data: metrics, error } = await sb
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  const rates = computeRates(metrics);

  return Response.json({
    campaign_id: campaignId,
    metrics,
    computed_rates: rates,
  });
}
