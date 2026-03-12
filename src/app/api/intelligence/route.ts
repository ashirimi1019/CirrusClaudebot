/**
 * API Route: /api/intelligence
 * GET — Retrieve outreach intelligence data for a campaign
 *
 * Query params:
 *   campaign (required) — campaign ID (uuid)
 *   company  (optional) — filter by company ID (uuid)
 *
 * Returns:
 *   { intelligence: OutreachIntelligence[], contacts: ContactIntelligence[] }
 */

import { getSupabaseClient } from '../../../lib/supabase.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign');
  const companyId = url.searchParams.get('company');

  if (!campaignId) {
    return Response.json(
      { error: 'Missing required query parameter: campaign' },
      { status: 400 },
    );
  }

  const sb = getSupabaseClient();

  // ── 1. Company-level intelligence ──────────────────────────────────────────
  let intelligenceQuery = sb
    .from('outreach_intelligence')
    .select(`
      id,
      campaign_id,
      company_id,
      offer_type,
      service_line,
      segment_key,
      messaging_angle,
      rationale,
      confidence,
      needs_review,
      fallback_applied,
      created_at,
      companies ( id, name, domain, fit_score, industry, employee_count )
    `)
    .eq('campaign_id', campaignId)
    .order('confidence', { ascending: true }); // low-confidence first for review

  if (companyId) {
    intelligenceQuery = intelligenceQuery.eq('company_id', companyId);
  }

  const { data: intelligence, error: intError } = await intelligenceQuery;

  if (intError) {
    return Response.json({ error: intError.message }, { status: 500 });
  }

  // ── 2. Contact-level intelligence (from campaign_contacts) ─────────────────
  let contactsQuery = sb
    .from('campaign_contacts')
    .select(`
      id,
      contact_id,
      company_id,
      segment_key,
      offer_type,
      service_line,
      buyer_persona_angle,
      contact_rationale,
      intelligence_confidence,
      needs_review,
      outreach_intelligence_id,
      contacts ( id, first_name, last_name, title, email ),
      companies ( id, name, domain )
    `)
    .eq('campaign_id', campaignId)
    .not('segment_key', 'is', null) // only return contacts with intelligence
    .order('intelligence_confidence', { ascending: true });

  if (companyId) {
    contactsQuery = contactsQuery.eq('company_id', companyId);
  }

  const { data: contacts, error: ctError } = await contactsQuery;

  if (ctError) {
    return Response.json({ error: ctError.message }, { status: 500 });
  }

  // ── 3. Segment summary ─────────────────────────────────────────────────────
  // Aggregate segment distribution from intelligence data
  const segmentCounts = new Map<string, { count: number; needsReview: number }>();
  for (const row of (intelligence ?? [])) {
    const key = (row as any).segment_key as string;
    const entry = segmentCounts.get(key) || { count: 0, needsReview: 0 };
    entry.count++;
    if ((row as any).needs_review) entry.needsReview++;
    segmentCounts.set(key, entry);
  }

  const segments = Array.from(segmentCounts.entries()).map(([key, stats]) => ({
    segment_key: key,
    company_count: stats.count,
    needs_review_count: stats.needsReview,
  }));

  return Response.json({
    intelligence: intelligence ?? [],
    contacts: contacts ?? [],
    segments,
  });
}
