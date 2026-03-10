/**
 * Logging Service
 * Structured logging for skills and API calls
 */

import { getSupabaseClient } from '../supabase.ts';
import type { ToolUsageInput } from '../../types/api.ts';

/**
 * Log a tool/API call to the tool_usage table.
 * Non-fatal — errors are swallowed.
 */
export async function logToolUsage(usage: ToolUsageInput): Promise<void> {
  try {
    const sb = getSupabaseClient();
    await sb.from('tool_usage').insert({
      campaign_id: usage.campaign_id || null,
      tool_name: usage.tool_name,
      action_name: usage.action_name || null,
      units_used: usage.units_used ?? 1,
      estimated_cost: usage.estimated_cost ?? null,
      request_payload: usage.request_payload || null,
      response_summary: usage.response_summary
        ? usage.response_summary.substring(0, 500)
        : null,
      called_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Simple console logger with prefix.
 */
export const log = {
  info: (msg: string) => console.log(`  ℹ️  ${msg}`),
  success: (msg: string) => console.log(`  ✅ ${msg}`),
  warn: (msg: string) => console.warn(`  ⚠️  ${msg}`),
  error: (msg: string) => console.error(`  ❌ ${msg}`),
  step: (msg: string) => console.log(`\n${msg}`),
};
