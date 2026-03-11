import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offer = searchParams.get('offer') || '';
  const campaign = searchParams.get('campaign') || '';

  if (!offer) {
    return NextResponse.json({ error: 'offer is required' }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Skill 1: offer row exists in DB
  const { data: offerRows } = await sb
    .from('offers')
    .select('id')
    .eq('slug', offer)
    .limit(1);
  const skill1 = (offerRows?.length ?? 0) > 0;
  const offerId: string | null = offerRows?.[0]?.id ?? null;

  // Skill 2: campaign row exists in DB (scoped to this offer)
  let skill2 = false;
  let campaignId: string | null = null;
  if (campaign && offerId) {
    const { data: campaignRows } = await sb
      .from('campaigns')
      .select('id')
      .eq('offer_id', offerId)
      .eq('slug', campaign)
      .limit(1);
    skill2 = (campaignRows?.length ?? 0) > 0;
    campaignId = campaignRows?.[0]?.id ?? null;
  }

  // Skill 3: message_variants exist for this campaign
  let skill3 = false;
  if (campaignId) {
    const { data: variantRows } = await sb
      .from('message_variants')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1);
    skill3 = (variantRows?.length ?? 0) > 0;
  }

  // Skills 4-6: check file system for outputs
  // Local dev: check project root offers/; Vercel: check /tmp/cirrus-work
  const workDir = process.env.CIRRUS_WORK_DIR ?? path.join(process.cwd(), '..');
  const offersBase = path.join(workDir, 'offers');

  const exists = (...parts: string[]) => {
    try {
      return fs.existsSync(path.join(offersBase, ...parts));
    } catch {
      return false;
    }
  };

  const skill4 = campaign ? exists(offer, 'campaigns', campaign, 'leads', 'all_leads.csv') : false;
  // Skill 5 may write messages.csv OR enroll directly in Apollo sequences.
  // Check both file system and skill_runs table for completion.
  let skill5 = campaign ? exists(offer, 'campaigns', campaign, 'outreach', 'messages.csv') : false;
  if (!skill5 && campaignId) {
    const { data: skill5Runs } = await sb
      .from('skill_runs')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('skill_number', 5)
      .eq('status', 'success')
      .limit(1);
    skill5 = (skill5Runs?.length ?? 0) > 0;
  }
  const skill6 = campaign ? exists(offer, 'campaigns', campaign, 'results', 'learnings.md') : false;

  return NextResponse.json({ skill1, skill2, skill3, skill4, skill5, skill6 });
}
