/**
 * GET /api/artifacts
 *
 * List artifacts for the current user, with optional filters.
 *
 * Query params (all optional):
 *   offer    = offer slug
 *   campaign = campaign slug
 *   skill    = skill number (1–6)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Module-level singleton — avoids creating a new connection pool per request
const adminDb = getServiceClient();

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offerSlug = searchParams.get('offer');
  const campaignSlug = searchParams.get('campaign');
  const skillParam = searchParams.get('skill');

  const userId = await getUserId(request);
  const sb = adminDb;

  // Build query — join with skill_runs for status/timestamps
  let query = sb
    .from('artifacts')
    .select(`
      id,
      skill_number,
      file_path,
      file_type,
      file_name,
      category,
      file_size_bytes,
      created_at,
      skill_run_id,
      offer_id,
      campaign_id,
      skill_runs (
        id,
        status,
        started_at,
        finished_at,
        duration_ms
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Filter by user if authenticated
  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Filter by skill number
  if (skillParam) {
    query = query.eq('skill_number', Number(skillParam));
  }

  // Filter by offer/campaign via slug → ID resolution
  if (offerSlug || campaignSlug) {
    let offerId: string | null = null;
    let campaignId: string | null = null;

    if (offerSlug) {
      const { data: offerRows } = await sb
        .from('offers')
        .select('id')
        .eq('slug', offerSlug)
        .limit(1);
      offerId = (offerRows as { id: string }[] | null)?.[0]?.id ?? null;
      if (offerId) {
        query = query.eq('offer_id', offerId);
      }
    }

    if (campaignSlug && offerId) {
      const { data: campaignRows } = await sb
        .from('campaigns')
        .select('id')
        .eq('offer_id', offerId)
        .eq('slug', campaignSlug)
        .limit(1);
      campaignId = (campaignRows as { id: string }[] | null)?.[0]?.id ?? null;
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
