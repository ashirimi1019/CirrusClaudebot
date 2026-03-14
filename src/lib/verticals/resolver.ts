/**
 * Effective Vertical Resolver
 *
 * Single source of truth: campaign.vertical_id ?? offer.default_vertical_id
 * Called once per skill run — never duplicated.
 */

import { getSupabaseClient } from '../supabase.ts';

export interface EffectiveVerticalResult {
  verticalSlug: string | null;
  verticalName: string | null;
  source: 'campaign' | 'offer' | 'none';
}

/**
 * Resolve the effective vertical for a given offer (and optionally campaign).
 *
 * Resolution order:
 *   1. campaign.vertical_id (if campaignId provided and campaign has a vertical)
 *   2. offer.default_vertical_id
 *   3. null (no vertical — use shared context only)
 */
export async function getEffectiveVertical(
  offerId: string,
  campaignId?: string
): Promise<EffectiveVerticalResult> {
  const supabase = getSupabaseClient();

  // Check campaign override first
  if (campaignId) {
    const { data: campaign, error: campaignErr } = await supabase
      .from('campaigns')
      .select('vertical_id')
      .eq('id', campaignId)
      .single();

    if (campaignErr) console.warn('[getEffectiveVertical] campaign query error:', campaignErr.message);

    if (campaign?.vertical_id) {
      const vertical = await lookupVertical(campaign.vertical_id);
      if (vertical) {
        return { ...vertical, source: 'campaign' };
      }
    }
  }

  // Fall back to offer default
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('default_vertical_id')
    .eq('id', offerId)
    .single();

  if (offerErr) console.warn('[getEffectiveVertical] offer query error:', offerErr.message);

  if (offer?.default_vertical_id) {
    const vertical = await lookupVertical(offer.default_vertical_id);
    if (vertical) {
      return { ...vertical, source: 'offer' };
    }
  }

  // No vertical configured
  return { verticalSlug: null, verticalName: null, source: 'none' };
}

async function lookupVertical(
  verticalId: string
): Promise<{ verticalSlug: string; verticalName: string } | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('verticals')
    .select('slug, name')
    .eq('id', verticalId)
    .single();

  if (!data) return null;
  return { verticalSlug: data.slug, verticalName: data.name };
}
