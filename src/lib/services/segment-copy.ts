/**
 * Segment Copy Service
 * Generates per-segment email variants via OpenAI.
 * Each active segment gets 3 tailored email variants.
 */

import { generateSegmentVariants } from '../clients/openai.ts';
import type { SegmentGroup, SegmentVariant } from '../../types/intelligence.ts';
import { OFFER_TYPE_LABELS, SERVICE_LINE_LABELS } from '../../types/intelligence.ts';

/**
 * Generate email variants for all active segments.
 * Returns the same segments array with `variants` populated.
 */
export async function generateAllSegmentVariants(
  segments: SegmentGroup[],
  contextDir?: string,
  additionalContext?: string
): Promise<SegmentGroup[]> {
  console.log(`\n  → Generating email variants for ${segments.length} segment(s)...\n`);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const label = `${OFFER_TYPE_LABELS[segment.offer_type]} × ${SERVICE_LINE_LABELS[segment.service_line]}`;

    console.log(`  [${i + 1}/${segments.length}] Segment: ${segment.segment_key}`);
    console.log(`    Label: ${label}`);
    console.log(`    Companies: ${segment.companies.length}, Contacts: ${segment.contacts.length}`);

    // Build context for the segment
    const dominantTitles = getDominantTitles(segment);
    const sampleSignals = getSampleSignals(segment);
    const sampleCompanies = segment.companies.slice(0, 5);

    try {
      const variants = await generateSegmentVariants(
        segment.segment_key,
        {
          offer_type: segment.offer_type,
          service_line: segment.service_line,
          company_count: segment.companies.length,
          sample_companies: sampleCompanies,
          dominant_buyer_titles: dominantTitles,
          sample_signals: sampleSignals,
        },
        additionalContext ? { additionalContext } : undefined
      );

      segment.variants = variants;
      console.log(`    ✅ Generated ${variants.length} variants`);

      for (const v of variants) {
        console.log(`      Variant ${v.variant_number}: "${v.subject.substring(0, 60)}..."`);
      }
    } catch (err: any) {
      console.error(`    ❌ Failed to generate variants: ${err.message}`);
      // Create fallback variants so the segment can still proceed
      segment.variants = createFallbackVariants(segment);
      console.log(`    ⚠️ Using ${segment.variants.length} fallback variants`);
    }

    console.log('');
  }

  return segments;
}

/**
 * Extract the most common buyer titles from a segment's contacts.
 */
function getDominantTitles(segment: SegmentGroup): string[] {
  const titleCounts = new Map<string, number>();

  for (const contact of segment.contacts) {
    const title = contact.title?.trim();
    if (!title) continue;
    titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
  }

  return Array.from(titleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title]) => title);
}

/**
 * Extract sample hiring signals from a segment's contacts.
 */
function getSampleSignals(segment: SegmentGroup): string[] {
  const signals = new Set<string>();

  for (const contact of segment.contacts) {
    const signal = contact.hiring_signal?.trim();
    if (signal && signals.size < 5) {
      signals.add(signal);
    }
  }

  return Array.from(signals);
}

/**
 * Create minimal fallback variants when OpenAI generation fails.
 * Uses Apollo template variables so they still work in sequences.
 */
function createFallbackVariants(segment: SegmentGroup): SegmentVariant[] {
  const serviceLabel = SERVICE_LINE_LABELS[segment.service_line];

  return [
    {
      segment_key: segment.segment_key,
      variant_number: 1,
      subject: '{{company}} hiring {{title}}?',
      body: `Hi {{first_name}},\n\nI saw {{company}} is hiring for {{title}} and wanted to reach out. Finding qualified ${serviceLabel.toLowerCase()} engineers typically takes 3-4 months, but we consistently reduce this to 3-4 weeks.\n\nAt CirrusLabs, we specialize in placing engineers for companies like yours. Does Tuesday at 2pm or Thursday at 10am work for a brief 15-minute chat?\n\nBest,\nAshir`,
    },
    {
      segment_key: segment.segment_key,
      variant_number: 2,
      subject: '{{company}} + {{title}} = Quick Fit?',
      body: `Hi {{first_name}},\n\nI noticed {{company}} is looking for {{title}} talent. We placed 5 similar engineers last quarter at companies like yours — average time to fill was 3 weeks.\n\nWould a quick 15-minute call this week make sense to explore if we can help?\n\nBest,\nAshir`,
    },
    {
      segment_key: segment.segment_key,
      variant_number: 3,
      subject: "Is {{company}}'s search over?",
      body: `Hi {{first_name}},\n\nMost companies spend 3-4 months filling ${serviceLabel.toLowerCase()} roles. We've been helping teams like {{company}} cut that to weeks.\n\nDoes a quick chat Tuesday at 2pm or Thursday at 10am work to see if there's a fit?\n\nBest,\nAshir`,
    },
  ];
}
