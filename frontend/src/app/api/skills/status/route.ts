import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offer = searchParams.get('offer') || '';
  const campaign = searchParams.get('campaign') || '';

  if (!offer) {
    return NextResponse.json({ error: 'offer is required' }, { status: 400 });
  }

  // Monorepo root (frontend runs from /frontend, root is one level up)
  const monorepoRoot = path.join(process.cwd(), '..');
  const offersBase = path.join(monorepoRoot, 'offers');

  const exists = (...parts: string[]) =>
    fs.existsSync(path.join(offersBase, ...parts));

  return NextResponse.json({
    skill1: exists(offer, 'positioning.md'),
    skill2: campaign ? exists(offer, 'campaigns', campaign, 'strategy.md') : false,
    skill3: campaign ? exists(offer, 'campaigns', campaign, 'copy', 'email-variants.md') : false,
    skill4: campaign ? exists(offer, 'campaigns', campaign, 'leads', 'all_leads.csv') : false,
    skill5: campaign ? exists(offer, 'campaigns', campaign, 'outreach', 'messages.csv') : false,
    skill6: campaign ? exists(offer, 'campaigns', campaign, 'results', 'learnings.md') : false,
  });
}
