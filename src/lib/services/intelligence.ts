/**
 * Intelligence Service
 * Orchestrates company classification, contact-level buyer adaptation,
 * segment grouping, small-segment merging, and low-confidence fallback.
 */

import {
  classifyCompanyBatch,
  generateContactMessagingAdaptation,
} from '../clients/openai.ts';
import type {
  CompanyClassification,
  CompanyClassificationInput,
  ContactMessagingAdaptation,
  LeadRow,
  SegmentGroup,
  SegmentKey,
  OfferType,
  ServiceLine,
} from '../../types/intelligence.ts';
import {
  LOW_CONFIDENCE_THRESHOLD,
  MIN_SEGMENT_SIZE,
} from '../../types/intelligence.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function buildSegmentKey(offerType: OfferType, serviceLine: ServiceLine): SegmentKey {
  return `${offerType}:${serviceLine}` as SegmentKey;
}

function parseSegmentKey(key: SegmentKey): { offer_type: OfferType; service_line: ServiceLine } {
  const [offer_type, service_line] = key.split(':') as [OfferType, ServiceLine];
  return { offer_type, service_line };
}

/** Default fallback segment for low-confidence classifications */
const DEFAULT_FALLBACK_SEGMENT: { offer_type: OfferType; service_line: ServiceLine } = {
  offer_type: 'individual_placement',
  service_line: 'software_development',
};

// ─── 1. Company Classification ──────────────────────────────────────────────

/**
 * Classify all unique companies from leads via OpenAI.
 * Deduplicates by domain, batches 5-10 per API call.
 */
export async function classifyCompanies(
  leads: LeadRow[],
  contextDir?: string,
  verticalContext?: string
): Promise<CompanyClassification[]> {
  // Deduplicate by company_domain — one classification per company
  const domainMap = new Map<string, CompanyClassificationInput>();

  for (const lead of leads) {
    const domain = lead.company_domain?.toLowerCase().trim();
    if (!domain || domainMap.has(domain)) continue;

    // Collect all buyer titles for this company
    const titlesForCompany = leads
      .filter((l) => l.company_domain?.toLowerCase().trim() === domain)
      .map((l) => l.title)
      .filter(Boolean);

    domainMap.set(domain, {
      company_name: lead.company_name,
      domain,
      hiring_signal: lead.hiring_signal || '',
      fit_score: lead.fit_score,
      buyer_titles: titlesForCompany,
    });
  }

  const uniqueCompanies = Array.from(domainMap.values());
  console.log(`  → ${uniqueCompanies.length} unique companies to classify (from ${leads.length} leads)`);

  if (uniqueCompanies.length === 0) return [];

  // Batch 5-10 companies per API call
  const BATCH_SIZE = 8;
  const allClassifications: CompanyClassification[] = [];

  for (let i = 0; i < uniqueCompanies.length; i += BATCH_SIZE) {
    const batch = uniqueCompanies.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uniqueCompanies.length / BATCH_SIZE);

    console.log(`  → Classifying batch ${batchNum}/${totalBatches} (${batch.length} companies)...`);

    try {
      const results = await classifyCompanyBatch(batch, { verticalContext });
      allClassifications.push(...results);
    } catch (err: any) {
      console.error(`  ❌ Batch ${batchNum} classification failed: ${err.message}`);
      // Apply fallback for failed batch — mark all as needs_review
      for (const company of batch) {
        allClassifications.push(
          applyLowConfidenceFallback({
            company_name: company.company_name,
            company_domain: company.domain,
            offer_type: DEFAULT_FALLBACK_SEGMENT.offer_type,
            service_line: DEFAULT_FALLBACK_SEGMENT.service_line,
            segment_key: buildSegmentKey(DEFAULT_FALLBACK_SEGMENT.offer_type, DEFAULT_FALLBACK_SEGMENT.service_line),
            messaging_angle: 'General staffing support for engineering needs',
            rationale: `Classification failed (API error) — using default fallback segment`,
            confidence: 0.0,
            needs_review: true,
            fallback_applied: true,
          })
        );
      }
    }
  }

  return allClassifications;
}

// ─── 2. Contact-Level Buyer Adaptation ──────────────────────────────────────

/**
 * Generate buyer-persona messaging adaptation for each contact.
 * Groups contacts with their company classification context.
 */
export async function classifyContacts(
  leads: LeadRow[],
  classifications: CompanyClassification[],
  contextDir?: string
): Promise<ContactMessagingAdaptation[]> {
  // Build domain → classification lookup
  const classMap = new Map<string, CompanyClassification>();
  for (const c of classifications) {
    classMap.set(c.company_domain.toLowerCase().trim(), c);
  }

  // Build contact inputs with company context
  const contactInputs = leads
    .filter((lead) => lead.email && lead.title)
    .map((lead) => {
      const domain = lead.company_domain?.toLowerCase().trim();
      const companyClass = classMap.get(domain || '');
      return {
        company_domain: lead.company_domain,
        company_name: lead.company_name,
        contact_email: lead.email,
        contact_name: `${lead.first_name} ${lead.last_name}`.trim(),
        title: lead.title,
        offer_type: companyClass?.offer_type || DEFAULT_FALLBACK_SEGMENT.offer_type,
        service_line: companyClass?.service_line || DEFAULT_FALLBACK_SEGMENT.service_line,
        messaging_angle: companyClass?.messaging_angle || 'General staffing support',
      };
    });

  console.log(`  → ${contactInputs.length} contacts to adapt messaging for`);

  if (contactInputs.length === 0) return [];

  // Batch contacts for API calls (10-20 per call)
  const BATCH_SIZE = 15;
  const allAdaptations: ContactMessagingAdaptation[] = [];

  for (let i = 0; i < contactInputs.length; i += BATCH_SIZE) {
    const batch = contactInputs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(contactInputs.length / BATCH_SIZE);

    console.log(`  → Adapting batch ${batchNum}/${totalBatches} (${batch.length} contacts)...`);

    try {
      const results = await generateContactMessagingAdaptation(batch);
      allAdaptations.push(...results);
    } catch (err: any) {
      console.error(`  ❌ Batch ${batchNum} contact adaptation failed: ${err.message}`);
      // Create default adaptations for failed batch
      for (const contact of batch) {
        allAdaptations.push({
          company_domain: contact.company_domain,
          contact_email: contact.contact_email,
          contact_name: contact.contact_name,
          title: contact.title,
          buyer_persona_angle: `Tailored for ${contact.title} — ${contact.messaging_angle}`,
          contact_rationale: 'Default adaptation (API call failed)',
          intelligence_confidence: 0.0,
          needs_review: true,
        });
      }
    }
  }

  return allAdaptations;
}

// ─── 3. Segment Grouping ────────────────────────────────────────────────────

/**
 * Group leads into segments based on company classifications.
 * Each lead is assigned to the segment matching its company's classification.
 */
export function buildSegmentGroups(
  leads: LeadRow[],
  classifications: CompanyClassification[]
): SegmentGroup[] {
  // Build domain → classification lookup
  const classMap = new Map<string, CompanyClassification>();
  for (const c of classifications) {
    classMap.set(c.company_domain.toLowerCase().trim(), c);
  }

  // Group leads by segment_key
  const segmentMap = new Map<SegmentKey, SegmentGroup>();

  for (const lead of leads) {
    const domain = lead.company_domain?.toLowerCase().trim();
    const companyClass = classMap.get(domain || '');

    // Determine segment
    const offerType = companyClass?.offer_type || DEFAULT_FALLBACK_SEGMENT.offer_type;
    const serviceLine = companyClass?.service_line || DEFAULT_FALLBACK_SEGMENT.service_line;
    const segmentKey = buildSegmentKey(offerType, serviceLine);

    // Enrich lead with classification data
    lead.segment_key = segmentKey;
    if (companyClass) {
      lead.needs_review = companyClass.needs_review;
    }

    // Get or create segment group
    let group = segmentMap.get(segmentKey);
    if (!group) {
      group = {
        segment_key: segmentKey,
        offer_type: offerType,
        service_line: serviceLine,
        companies: [],
        contacts: [],
      };
      segmentMap.set(segmentKey, group);
    }

    // Add company domain if not already present
    if (domain && !group.companies.includes(domain)) {
      group.companies.push(domain);
    }

    group.contacts.push(lead);
  }

  return Array.from(segmentMap.values());
}

// ─── 4. Small Segment Merging ───────────────────────────────────────────────

/**
 * Merge segments with fewer than minSize contacts into the nearest larger segment.
 * Preference: same offer_type first, then nearest service_line.
 */
export function mergeSmallSegments(
  groups: SegmentGroup[],
  minSize: number = MIN_SEGMENT_SIZE
): SegmentGroup[] {
  if (groups.length <= 1) return groups;

  // Separate into viable and small segments
  const viable: SegmentGroup[] = [];
  const small: SegmentGroup[] = [];

  for (const group of groups) {
    if (group.contacts.length >= minSize) {
      viable.push(group);
    } else {
      small.push(group);
    }
  }

  // If no viable segments, just return all groups as-is (can't merge into nothing)
  if (viable.length === 0) {
    console.log(`  ⚠️ All ${groups.length} segments are below minimum size (${minSize}). Keeping as-is.`);
    return groups;
  }

  // Merge each small segment into its nearest viable segment
  for (const smallGroup of small) {
    const target = findNearestSegment(smallGroup, viable);
    console.log(`  → Merging segment ${smallGroup.segment_key} (${smallGroup.contacts.length} contacts) → ${target.segment_key}`);

    // Move contacts
    for (const contact of smallGroup.contacts) {
      contact.segment_key = target.segment_key;
      target.contacts.push(contact);
    }

    // Move companies
    for (const domain of smallGroup.companies) {
      if (!target.companies.includes(domain)) {
        target.companies.push(domain);
      }
    }
  }

  return viable;
}

/**
 * Find the nearest viable segment to merge into.
 * Priority: same offer_type > same service_line > largest segment.
 */
function findNearestSegment(source: SegmentGroup, viable: SegmentGroup[]): SegmentGroup {
  // 1. Same offer_type — pick the largest
  const sameOfferType = viable.filter((g) => g.offer_type === source.offer_type);
  if (sameOfferType.length > 0) {
    return sameOfferType.reduce((a, b) => (a.contacts.length >= b.contacts.length ? a : b));
  }

  // 2. Same service_line — pick the largest
  const sameServiceLine = viable.filter((g) => g.service_line === source.service_line);
  if (sameServiceLine.length > 0) {
    return sameServiceLine.reduce((a, b) => (a.contacts.length >= b.contacts.length ? a : b));
  }

  // 3. Fallback — largest segment overall
  return viable.reduce((a, b) => (a.contacts.length >= b.contacts.length ? a : b));
}

// ─── 5. Low-Confidence Fallback ─────────────────────────────────────────────

/**
 * Apply conservative fallback for low-confidence classifications.
 * - Sets needs_review = true
 * - Marks fallback_applied = true
 * - Keeps the existing classification (doesn't change segment) unless confidence is 0
 */
export function applyLowConfidenceFallback(
  classification: CompanyClassification
): CompanyClassification {
  if (classification.confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return classification;
  }

  return {
    ...classification,
    needs_review: true,
    fallback_applied: true,
    // Only force default segment if confidence is extremely low (API failure)
    ...(classification.confidence === 0
      ? {
          offer_type: DEFAULT_FALLBACK_SEGMENT.offer_type,
          service_line: DEFAULT_FALLBACK_SEGMENT.service_line,
          segment_key: buildSegmentKey(DEFAULT_FALLBACK_SEGMENT.offer_type, DEFAULT_FALLBACK_SEGMENT.service_line),
        }
      : {}),
  };
}

// ─── 6. Enrich Leads with Contact Adaptation ────────────────────────────────

/**
 * Merge contact-level adaptations back onto lead rows.
 * Matches by email or (domain + name) for robustness.
 */
export function enrichLeadsWithAdaptations(
  leads: LeadRow[],
  adaptations: ContactMessagingAdaptation[]
): LeadRow[] {
  // Build lookup: email → adaptation
  const emailMap = new Map<string, ContactMessagingAdaptation>();
  const nameMap = new Map<string, ContactMessagingAdaptation>();

  for (const a of adaptations) {
    if (a.contact_email) {
      emailMap.set(a.contact_email.toLowerCase().trim(), a);
    }
    if (a.contact_name && a.company_domain) {
      nameMap.set(`${a.company_domain.toLowerCase()}:${a.contact_name.toLowerCase()}`, a);
    }
  }

  for (const lead of leads) {
    // Try email match first, then domain+name
    const adaptation =
      emailMap.get(lead.email?.toLowerCase().trim() || '') ||
      nameMap.get(`${(lead.company_domain || '').toLowerCase()}:${`${lead.first_name} ${lead.last_name}`.trim().toLowerCase()}`);

    if (adaptation) {
      lead.buyer_persona_angle = adaptation.buyer_persona_angle;
      lead.contact_rationale = adaptation.contact_rationale;
      lead.intelligence_confidence = adaptation.intelligence_confidence;
      lead.needs_review = adaptation.needs_review || lead.needs_review;
    }
  }

  return leads;
}
