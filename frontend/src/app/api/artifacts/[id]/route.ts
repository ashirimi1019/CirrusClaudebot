/**
 * GET /api/artifacts/[id]
 *
 * Download / read a specific artifact file by its database ID.
 * Returns the raw file content with appropriate Content-Type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { WRITE_BASE } from '@/lib/vercel-paths';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const CONTENT_TYPES: Record<string, string> = {
  md: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sb = getServiceClient();
  const { data: artifact, error } = await sb
    .from('artifacts')
    .select('file_path, file_type, file_name')
    .eq('id', id)
    .single();

  if (error || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  // Resolve the full path and guard against path traversal attacks.
  // path.resolve normalises ".." segments so we can verify the result
  // stays inside WRITE_BASE.
  const resolvedBase = path.resolve(WRITE_BASE);
  const fullPath = path.resolve(WRITE_BASE, artifact.file_path);

  if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: 'File no longer exists on disk' },
      { status: 404 },
    );
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const contentType = CONTENT_TYPES[artifact.file_type] ?? 'text/plain; charset=utf-8';

  // Sanitise filename for Content-Disposition header (strip quotes & control chars)
  const safeName = (artifact.file_name || 'artifact').replace(/["\\]/g, '_').replace(/[\x00-\x1f]/g, '');

  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeName}"`,
    },
  });
}
