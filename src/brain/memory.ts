/**
 * Structured Memory Layer
 * Reads from database and builds dynamic context for LLM prompts
 * Closes the flywheel: what-works.md + variant performance → OpenAI prompts
 */

import { getSupabaseClient } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

/**
 * Get top performing subject lines across all campaigns
 * Used to guide new email generation
 */
export async function getTopPerformingSubjectLines(limit = 5): Promise<string> {
  try {
    const supabase = getSupabaseClient();

    const { data: variants, error } = await supabase
      .from('email_variant_performance')
      .select(
        `
        variant_name,
        reply_rate,
        emails_sent,
        replies,
        status
      `
      )
      .eq('status', 'active')
      .order('reply_rate', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️  Error fetching top subject lines:', error.message);
      return '';
    }

    if (!variants || variants.length === 0) {
      return '';
    }

    const lines = variants
      .filter((v) => v.reply_rate !== null && v.emails_sent >= 5)
      .map((v) => `- "${v.variant_name}" (${v.reply_rate}% reply rate from ${v.emails_sent} sends)`)
      .join('\n');

    if (!lines) return '';

    return `
PROVEN HIGH-PERFORMING SUBJECT LINES:
${lines}

Use these as inspiration - avoid phrases that underperformed.
`;
  } catch (error) {
    console.warn('⚠️  Error building top subject lines context:', error);
    return '';
  }
}

/**
 * Get top objections extracted from recent replies
 * Used to pre-handle objections in copy generation
 */
export async function getTopObjections(days = 30, limit = 5): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: objections, error } = await supabase
      .from('objection_patterns')
      .select('objection_text, frequency, category')
      .gte('created_at', sinceDate)
      .order('frequency', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️  Error fetching top objections:', error.message);
      return '';
    }

    if (!objections || objections.length === 0) {
      return '';
    }

    const lines = objections
      .map((o) => `- ${o.objection_text} (seen ${o.frequency} times)${o.category ? ` [${o.category}]` : ''}`)
      .join('\n');

    return `
TOP OBJECTIONS (LAST ${days} DAYS):
${lines}

IMPORTANT: Proactively address these objections in your email copy.
Mention solutions before they ask.
`;
  } catch (error) {
    console.warn('⚠️  Error building objections context:', error);
    return '';
  }
}

/**
 * Get what-works.md content from file system
 * This is the markdown-based learning file that Skill 6 appends to.
 * When a verticalSlug is provided, also reads the vertical-specific
 * learnings file and merges them (global base first, vertical appendix second).
 */
export async function getWhatWorks(verticalSlug?: string | null): Promise<string> {
  try {
    const parts: string[] = [];

    // Global learnings (always)
    const globalPath = path.join(process.cwd(), 'context', 'learnings', 'what-works.md');
    if (fs.existsSync(globalPath)) {
      const content = fs.readFileSync(globalPath, 'utf-8');
      const lines = content.split('\n');
      const recentLines = lines.slice(Math.max(0, lines.length - 30)).join('\n');
      parts.push(`RECENT CAMPAIGN LEARNINGS (what-works.md):\n${recentLines}`);
    }

    // Vertical-specific learnings (if active)
    if (verticalSlug) {
      const verticalPath = path.join(process.cwd(), 'context', 'verticals', verticalSlug, 'learnings', 'what-works.md');
      if (fs.existsSync(verticalPath)) {
        const vContent = fs.readFileSync(verticalPath, 'utf-8');
        const vLines = vContent.split('\n');
        const recentVLines = vLines.slice(Math.max(0, vLines.length - 20)).join('\n');
        parts.push(`VERTICAL LEARNINGS (${verticalSlug}):\n${recentVLines}`);
      }
    }

    return parts.length > 0 ? '\n' + parts.join('\n\n') + '\n' : '';
  } catch (error) {
    console.warn('⚠️  Error reading what-works.md:', error);
    return '';
  }
}

/**
 * Build complete dynamic context for OpenAI prompts
 * Combines: top subject lines + top objections + what-works.md
 * Closes the flywheel loop between database and LLM prompts
 */
export async function buildDynamicContext(campaignId?: string, verticalSlug?: string | null): Promise<string> {
  console.log('\n🧠 Building Dynamic Memory Context...');

  const [topSubjects, topObjections, whatWorks] = await Promise.all([
    getTopPerformingSubjectLines(5),
    getTopObjections(30, 5),
    getWhatWorks(verticalSlug ?? undefined),
  ]);

  const context = [topSubjects, topObjections, whatWorks].filter((c) => c.trim().length > 0).join('\n');

  if (context.trim().length > 0) {
    console.log('✅ Dynamic context built from campaign data');
  } else {
    console.log('ℹ️  No previous campaign data yet - first campaign will establish baselines');
  }

  return context;
}

/**
 * Get winning variant style from a specific campaign
 * Used for evolving new variants based on what works
 */
export async function getWinningVariantStyle(campaignId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data: winner, error } = await supabase
      .from('email_variant_performance')
      .select('variant_name, reply_rate, emails_sent')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .order('reply_rate', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error || !winner) {
      return null;
    }

    return winner.variant_name;
  } catch (error) {
    console.warn('⚠️  Error fetching winning variant:', error);
    return null;
  }
}

/**
 * Log memory status for debugging
 */
export async function logMemoryStatus(): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const [variantCount, objectionCount] = await Promise.all([
      supabase.from('email_variant_performance').select('id', { count: 'exact' }),
      supabase.from('objection_patterns').select('id', { count: 'exact' }),
    ]);

    console.log('\n🧠 Memory Status:');
    console.log(`   Email variant performance records: ${variantCount.count}`);
    console.log(`   Objection patterns: ${objectionCount.count}`);
  } catch (error) {
    console.warn('⚠️  Error logging memory status:', error);
  }
}
