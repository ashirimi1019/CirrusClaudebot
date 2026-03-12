/**
 * SKILL 5: INTELLIGENT OUTREACH ENGINE (Apollo.io Sequences)
 *
 * Classifies companies & contacts, groups into segments, generates per-segment
 * email variants, creates one Apollo sequence per segment, and routes contacts.
 *
 * 12-step intelligent flow:
 *  1.  Validate inputs
 *  2.  Load contacts from CSV + context files
 *  3.  Classify companies via OpenAI (batched)
 *  4.  Apply low-confidence fallback / needs-review
 *  5.  Classify contacts for buyer-persona adaptation
 *  6.  Build segment groups
 *  7.  Merge small segments (<3 contacts)
 *  8.  Generate per-segment email variants via OpenAI
 *  9.  Save intelligence to DB (outreach_intelligence + campaign_companies)
 * 10.  Save message_variants + generated_artifacts to DB
 * 11.  Create Apollo sequences per segment + add email steps
 * 12.  Bulk create contacts in Apollo + enroll in correct sequence
 *
 * Backward compat: `skipIntelligence: true` falls back to old static behavior.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import readline from 'readline';

import {
  listSequences,
  createSequence,
  addEmailStepToSequence,
  bulkCreateContacts,
  addContactsToSequence,
  getEmailAccounts,
  getSequenceDetails,
  updateEmailTemplate,
  type ApolloSequence,
} from '../../lib/clients/apollo.ts';
import { SkillRunTracker } from '../../lib/services/run-tracker.ts';
import { validateSkillInputs } from '../../lib/services/validation.ts';
import {
  classifyCompanies,
  classifyContacts,
  buildSegmentGroups,
  mergeSmallSegments,
  enrichLeadsWithAdaptations,
  applyLowConfidenceFallback,
} from '../../lib/services/intelligence.ts';
import { generateAllSegmentVariants } from '../../lib/services/segment-copy.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';
import type {
  LeadRow,
  SegmentGroup,
  IntelligentOutreachConfig,
  CompanyClassification,
} from '../../types/intelligence.ts';
import {
  OFFER_TYPE_LABELS,
  SERVICE_LINE_LABELS,
  LOW_CONFIDENCE_THRESHOLD,
} from '../../types/intelligence.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Re-export config type for callers
export type { IntelligentOutreachConfig };

// Also export old name for backward compat
export type OutreachConfig = IntelligentOutreachConfig;

// ─── CSV Helpers (preserved from original) ──────────────────────────────────

async function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let headers: string[] = [];
    let isFirst = true;

    rl.on('line', (line) => {
      if (!line.trim()) return;
      const values = parseCSVLine(line);
      if (isFirst) {
        headers = values;
        isFirst = false;
      } else {
        const row: any = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        rows.push(row);
      }
    });

    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Readline Helpers ───────────────────────────────────────────────────────

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

// ─── Variant file parsing (for static fallback) ─────────────────────────────

function parseEmailVariant(content: string, fileName: string): { subject: string; body: string } {
  const parts = content.split('---');
  let subject = '';
  let body = '';

  if (parts.length >= 2) {
    const middle = parts[1].trim();
    const lines = middle.split('\n');
    for (const line of lines) {
      if (line.startsWith('Subject:')) {
        subject = line.replace('Subject:', '').trim();
        break;
      }
    }
    const blankIdx = middle.indexOf('\n\n');
    body = blankIdx !== -1 ? middle.substring(blankIdx + 2).trim() : middle;
  }

  if (!subject || !body) {
    subject = subject || `Email from CirrusLabs`;
    body = body || content;
  }

  return { subject, body };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: Intelligent Outreach Engine
// ═══════════════════════════════════════════════════════════════════════════════

export async function runSkill5LaunchOutreach(
  offerSlugArg?: string,
  campaignSlugArg?: string,
  config?: IntelligentOutreachConfig
): Promise<string | void> {
  const skipIntelligence = config?.skipIntelligence === true;

  const tracker = new SkillRunTracker(
    skipIntelligence
      ? 'SKILL 5: LAUNCH OUTREACH (Static Mode)'
      : 'SKILL 5: INTELLIGENT OUTREACH ENGINE'
  );

  // Register all steps up front
  tracker.step('Validate inputs');
  tracker.step('Load contacts & context');
  if (!skipIntelligence) {
    tracker.step('Classify companies');
    tracker.step('Apply low-confidence handling');
    tracker.step('Classify contacts');
    tracker.step('Build segments');
    tracker.step('Merge small segments');
    tracker.step('Generate segment variants');
    tracker.step('Save intelligence to DB');
    tracker.step('Save variants & artifacts');
  } else {
    tracker.step('Load copy variants');
  }
  tracker.step('Create Apollo sequences');
  tracker.step('Add email steps');
  tracker.step('Create contacts in Apollo');
  tracker.step('Enroll in sequences');

  // ─── Resolve offer/campaign slugs ───
  let offerSlug: string;
  let campaignSlug: string;
  const cliMode = !!(process.argv[2] && process.argv[3]);
  const autoMode = !!(config?.autoCreateSequence || config?.apolloSequenceId || cliMode);
  const rl = autoMode ? null : createReadlineInterface();

  if (offerSlugArg && campaignSlugArg) {
    offerSlug = offerSlugArg;
    campaignSlug = campaignSlugArg;
    console.log(`✅ Pipeline mode: offer=${offerSlug}, campaign=${campaignSlug}\n`);
  } else if (process.argv[2] && process.argv[3]) {
    offerSlug = process.argv[2];
    campaignSlug = process.argv[3];
    console.log(`✅ Using command line arguments:`);
    console.log(`  Offer: ${offerSlug}`);
    console.log(`  Campaign: ${campaignSlug}\n`);
  } else {
    offerSlug = await prompt(rl!, 'Enter offer slug: ');
    campaignSlug = await prompt(rl!, 'Enter campaign slug: ');
  }

  // ─── Step 1: Validate inputs ───
  tracker.startStep('Validate inputs');
  const validation = validateSkillInputs({
    offerSlug,
    campaignSlug,
    requireCopy: skipIntelligence,  // only required in static mode
    requireLeads: true,
  });
  if (!validation.valid) {
    tracker.failStep('Validate inputs', validation.errors.join('; '));
    tracker.printSummary();
    if (rl) rl.close();
    throw new Error(`Skill 5 input validation failed:\n  ${validation.errors.join('\n  ')}`);
  }
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((w) => tracker.warn(w));
  }
  tracker.completeStep('Validate inputs', `offer="${offerSlug}", campaign="${campaignSlug}"`);

  try {
    // Paths
    const campaignDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug);
    const copyDir = path.join(campaignDir, 'copy');
    const leadsPath = path.join(campaignDir, 'leads', 'all_leads.csv');

    // ─── Step 2: Load contacts & context ───
    tracker.startStep(skipIntelligence ? 'Load copy variants' : 'Load contacts & context');

    const allLeads = await readCSV(leadsPath);
    const contacts: LeadRow[] = allLeads
      .filter((row) => row.email && row.email.trim())
      .map((row) => ({
        company_name: row.company_name || '',
        company_domain: row.company_domain || '',
        hiring_signal: row.hiring_signal || '',
        fit_score: row.fit_score || '',
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        title: row.title || '',
        email: row.email || '',
        linkedin_url: row.linkedin_url || '',
      }));

    if (contacts.length === 0) {
      const stepName = skipIntelligence ? 'Load copy variants' : 'Load contacts & context';
      tracker.failStep(stepName, `all_leads.csv has ${allLeads.length} rows but 0 contacts with emails.`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error('Skill 5: No contacts with emails found in all_leads.csv');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STATIC MODE (skipIntelligence) — fallback to old single-sequence behavior
    // ═════════════════════════════════════════════════════════════════════════
    if (skipIntelligence) {
      // Load email variant files
      const variantFiles = fs.readdirSync(copyDir).filter((f) => f.startsWith('email-') && f.endsWith('.txt'));
      if (variantFiles.length === 0) {
        tracker.failStep('Load copy variants', `No email-*.txt files found in ${copyDir}. Run Skill 3 first.`);
        tracker.printSummary();
        if (rl) rl.close();
        throw new Error(`Skill 5: No email variants found in ${copyDir}`);
      }
      const variants = variantFiles.map((file) => {
        const content = fs.readFileSync(path.join(copyDir, file), 'utf-8');
        return { name: file.replace('.txt', ''), ...parseEmailVariant(content, file) };
      });
      tracker.completeStep('Load copy variants', `${contacts.length} contacts, ${variants.length} email variants`);

      // Run old static flow
      return await runStaticOutreach(tracker, contacts, variants, campaignSlug, config, autoMode, rl);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // INTELLIGENT MODE — classification → segmentation → per-segment outreach
    // ═════════════════════════════════════════════════════════════════════════

    tracker.completeStep('Load contacts & context', `${contacts.length} contacts loaded from CSV`);

    // ─── Step 3: Classify companies ───
    tracker.startStep('Classify companies');
    const classifications = await classifyCompanies(contacts);
    const reviewCount = classifications.filter((c) => c.needs_review).length;
    tracker.completeStep(
      'Classify companies',
      `${classifications.length} companies classified (${reviewCount} needs review)`,
      classifications.length
    );

    // ─── Step 4: Apply low-confidence handling ───
    tracker.startStep('Apply low-confidence handling');
    let fallbackCount = 0;
    const processedClassifications = classifications.map((c) => {
      if (c.confidence < LOW_CONFIDENCE_THRESHOLD) {
        fallbackCount++;
        return applyLowConfidenceFallback(c);
      }
      return c;
    });
    if (fallbackCount > 0) {
      tracker.completeStep('Apply low-confidence handling', `${fallbackCount}/${classifications.length} flagged for review`);
    } else {
      tracker.completeStep('Apply low-confidence handling', 'All classifications above confidence threshold');
    }

    // ─── Step 5: Classify contacts ───
    tracker.startStep('Classify contacts');
    const adaptations = await classifyContacts(contacts, processedClassifications);
    enrichLeadsWithAdaptations(contacts, adaptations);
    tracker.completeStep('Classify contacts', `${adaptations.length} contacts adapted`, adaptations.length);

    // ─── Step 6: Build segments ───
    tracker.startStep('Build segments');
    let segments = buildSegmentGroups(contacts, processedClassifications);
    const segmentSummary = segments
      .map((s) => `${s.segment_key} (${s.contacts.length} contacts, ${s.companies.length} companies)`)
      .join(', ');
    tracker.completeStep('Build segments', `${segments.length} segments: ${segmentSummary}`, segments.length);

    // ─── Step 7: Merge small segments ───
    tracker.startStep('Merge small segments');
    const beforeCount = segments.length;
    segments = mergeSmallSegments(segments);
    const merged = beforeCount - segments.length;
    if (merged > 0) {
      tracker.completeStep('Merge small segments', `${merged} small segments merged → ${segments.length} active segments`);
    } else {
      tracker.completeStep('Merge small segments', `All ${segments.length} segments above minimum size`);
    }

    // ─── Step 8: Generate per-segment email variants ───
    tracker.startStep('Generate segment variants');
    segments = await generateAllSegmentVariants(segments);
    const totalVariants = segments.reduce((sum, s) => sum + (s.variants?.length || 0), 0);
    tracker.completeStep('Generate segment variants', `${totalVariants} variants across ${segments.length} segments`, totalVariants);

    // ─── Step 9: Save intelligence to DB ───
    tracker.startStep('Save intelligence to DB');
    try {
      await saveIntelligenceToDB(processedClassifications, contacts, campaignSlug, offerSlug);
      tracker.completeStep('Save intelligence to DB', `${processedClassifications.length} company classifications + ${contacts.length} contact records saved`);
    } catch (err: any) {
      tracker.partialStep('Save intelligence to DB', `DB save failed (non-fatal): ${err.message}`);
    }

    // ─── Step 10: Save variants & artifacts ───
    tracker.startStep('Save variants & artifacts');
    try {
      await saveVariantsAndArtifacts(segments, campaignSlug, offerSlug);
      tracker.completeStep('Save variants & artifacts', `${totalVariants} variants + artifact metadata saved`);
    } catch (err: any) {
      tracker.partialStep('Save variants & artifacts', `DB save failed (non-fatal): ${err.message}`);
    }

    // ─── Step 11: Create Apollo sequences per segment + add email steps ───
    tracker.startStep('Create Apollo sequences');
    let sequencesCreated = 0;
    let sequenceFailed = 0;

    for (const segment of segments) {
      const segLabel = `${OFFER_TYPE_LABELS[segment.offer_type]} - ${SERVICE_LINE_LABELS[segment.service_line]}`;
      const seqName = `CirrusLabs - ${campaignSlug} - ${segment.segment_key}`;

      try {
        const sequence = await createSequence(seqName);
        segment.apollo_sequence_id = sequence.id;
        sequencesCreated++;
        console.log(`  ✅ Created sequence: "${seqName}" (ID: ${sequence.id})`);
      } catch (err: any) {
        sequenceFailed++;
        console.error(`  ❌ Failed to create sequence "${seqName}": ${err.message}`);
      }
    }

    if (sequenceFailed === 0) {
      tracker.completeStep('Create Apollo sequences', `${sequencesCreated} sequences created`, sequencesCreated);
    } else if (sequencesCreated > 0) {
      tracker.partialStep('Create Apollo sequences', `${sequencesCreated} created, ${sequenceFailed} failed`, sequencesCreated);
    } else {
      tracker.failStep('Create Apollo sequences', `All ${sequenceFailed} sequence creations failed`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error('Skill 5: Failed to create any Apollo sequences');
    }

    // ─── Add email steps to each sequence ───
    tracker.startStep('Add email steps');
    const dayOffsets = [0, 3, 7];
    let totalStepsAdded = 0;
    let totalStepsFailed = 0;

    for (const segment of segments) {
      if (!segment.apollo_sequence_id || !segment.variants) continue;

      for (let i = 0; i < segment.variants.length; i++) {
        const variant = segment.variants[i];
        try {
          const result = await addEmailStepToSequence(
            segment.apollo_sequence_id,
            variant.subject,
            variant.body,
            dayOffsets[i] ?? (i * 3),
            i + 1
          );
          totalStepsAdded++;
          console.log(`  ✅ ${segment.segment_key} Step ${i + 1}: "${variant.subject.substring(0, 50)}..." [template: ${result.templateId}]`);
        } catch (err: any) {
          totalStepsFailed++;
          console.error(`  ❌ ${segment.segment_key} Step ${i + 1} failed: ${err.message}`);
        }
      }
    }

    if (totalStepsFailed === 0) {
      tracker.completeStep('Add email steps', `${totalStepsAdded} steps added across ${sequencesCreated} sequences`, totalStepsAdded);
    } else {
      tracker.partialStep('Add email steps', `${totalStepsAdded} added, ${totalStepsFailed} failed`, totalStepsAdded);
    }

    // ─── Step 12: Bulk create contacts + enroll per segment ───
    tracker.startStep('Create contacts in Apollo');
    let totalCreated = 0;
    let totalCreateFailed = 0;
    const segmentContactIds = new Map<string, string[]>(); // segment_key → apolloContactIds

    for (const segment of segments) {
      if (!segment.apollo_sequence_id) continue;

      const contactInputs = segment.contacts.map((c) => ({
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        email: c.email,
        title: c.title || '',
        organization_name: c.company_name || '',
        website_url: c.company_domain ? `https://${c.company_domain}` : undefined,
      }));

      try {
        const created = await bulkCreateContacts(contactInputs);
        const ids = created.map((c) => c.id);
        segmentContactIds.set(segment.segment_key, ids);
        totalCreated += ids.length;
        console.log(`  ✅ ${segment.segment_key}: ${ids.length} contacts created`);
      } catch (err: any) {
        totalCreateFailed += segment.contacts.length;
        console.error(`  ❌ ${segment.segment_key}: bulkCreateContacts failed: ${err.message}`);
      }
    }

    if (totalCreateFailed === 0) {
      tracker.completeStep('Create contacts in Apollo', `${totalCreated} contacts created`, totalCreated);
    } else if (totalCreated > 0) {
      tracker.partialStep('Create contacts in Apollo', `${totalCreated} created, ${totalCreateFailed} failed`, totalCreated);
    } else {
      tracker.failStep('Create contacts in Apollo', `All ${totalCreateFailed} contact creations failed`);
    }

    // ─── Enroll contacts in sequences ───
    tracker.startStep('Enroll in sequences');
    let totalEnrolled = 0;
    let enrollmentFailed = 0;
    let sendingEmail = 'N/A';

    // Get email account once
    let emailAccountId: string | undefined;
    try {
      const emailAccounts = await getEmailAccounts();
      if (emailAccounts.length > 0) {
        const activeAccount = emailAccounts.find((a) => a.active) || emailAccounts[0];
        emailAccountId = activeAccount.id;
        sendingEmail = activeAccount.email;
        console.log(`  → Sending from: ${sendingEmail}`);
      } else {
        tracker.warn('No email accounts connected in Apollo. Contacts created but not enrolled.');
      }
    } catch (err: any) {
      tracker.warn(`Failed to get email accounts: ${err.message}`);
    }

    if (emailAccountId) {
      for (const segment of segments) {
        if (!segment.apollo_sequence_id) continue;
        const contactIds = segmentContactIds.get(segment.segment_key) || [];
        if (contactIds.length === 0) continue;

        try {
          await addContactsToSequence(contactIds, segment.apollo_sequence_id, emailAccountId);
          totalEnrolled += contactIds.length;
          console.log(`  ✅ ${segment.segment_key}: ${contactIds.length} enrolled in sequence`);
        } catch (err: any) {
          enrollmentFailed += contactIds.length;
          console.error(`  ❌ ${segment.segment_key}: enrollment failed: ${err.message}`);
        }
      }
    }

    if (totalEnrolled > 0 && enrollmentFailed === 0) {
      tracker.completeStep('Enroll in sequences', `${totalEnrolled} contacts enrolled, sending from ${sendingEmail}`, totalEnrolled);
    } else if (totalEnrolled > 0) {
      tracker.partialStep('Enroll in sequences', `${totalEnrolled} enrolled, ${enrollmentFailed} failed`, totalEnrolled);
    } else if (totalCreated > 0) {
      tracker.partialStep('Enroll in sequences', 'Contacts created but enrollment failed. Enroll manually in Apollo.');
    } else {
      tracker.skipStep('Enroll in sequences', 'No contacts to enroll');
    }

    if (rl) rl.close();

    // ─── Print Summary ───
    tracker.printSummary();
    printIntelligenceSummary(segments, processedClassifications, totalCreated, totalEnrolled, sendingEmail);

    // Return the first sequence ID for backward compat
    return segments[0]?.apollo_sequence_id || undefined;

  } catch (err: any) {
    if (rl) rl.close();
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC MODE: Old single-sequence behavior (when skipIntelligence = true)
// ═══════════════════════════════════════════════════════════════════════════════

async function runStaticOutreach(
  tracker: SkillRunTracker,
  contacts: LeadRow[],
  variants: Array<{ name: string; subject: string; body: string }>,
  campaignSlug: string,
  config?: IntelligentOutreachConfig,
  autoMode?: boolean,
  rl?: readline.Interface | null
): Promise<string | void> {

  // ─── Select/create sequence ───
  tracker.startStep('Create Apollo sequences');
  const existingSequences = await listSequences();
  let sequence: ApolloSequence;
  const defaultSequenceName = `CirrusLabs - ${campaignSlug}`;

  if (config?.apolloSequenceId) {
    const found = existingSequences.find((s) => s.id === config.apolloSequenceId);
    if (found) {
      sequence = found;
      console.log(`✅ Using configured sequence: "${sequence.name}"`);
    } else {
      tracker.failStep('Create Apollo sequences', `Sequence ID "${config.apolloSequenceId}" not found`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error(`Sequence ID "${config.apolloSequenceId}" not found in Apollo`);
    }
  } else if (autoMode) {
    const existing = existingSequences.find((s) =>
      s.name.toLowerCase().includes(campaignSlug.toLowerCase())
    );
    if (existing) {
      sequence = existing;
      console.log(`✅ Auto-selected existing sequence: "${sequence.name}"`);
    } else {
      sequence = await createSequence(defaultSequenceName);
      console.log(`✅ Auto-created sequence: "${sequence.name}" (ID: ${sequence.id})`);
    }
  } else if (rl && existingSequences.length > 0) {
    console.log('\nExisting sequences:');
    existingSequences.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.name} (${s.num_contacts} contacts, ${s.num_steps} steps)`);
    });
    console.log(`  [N] Create new sequence`);
    const choice = await prompt(rl, '\nSelect sequence number or N for new: ');
    if (choice.toLowerCase() === 'n') {
      const name = await prompt(rl, `New sequence name (default: "${defaultSequenceName}"): `);
      sequence = await createSequence(name || defaultSequenceName);
    } else {
      const idx = parseInt(choice) - 1;
      if (idx < 0 || idx >= existingSequences.length) {
        tracker.failStep('Create Apollo sequences', `Invalid selection: "${choice}"`);
        tracker.printSummary();
        if (rl) rl.close();
        throw new Error('Invalid sequence selection');
      }
      sequence = existingSequences[idx];
    }
  } else {
    sequence = await createSequence(defaultSequenceName);
    console.log(`✅ Created sequence: "${sequence.name}" (ID: ${sequence.id})`);
  }
  tracker.completeStep('Create Apollo sequences', `"${sequence.name}" (ID: ${sequence.id})`);

  // ─── Add email steps ───
  tracker.startStep('Add email steps');
  const dayOffsets = [0, 3, 7];

  if (sequence.num_steps === 0) {
    let stepFailures = 0;
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      try {
        const result = await addEmailStepToSequence(
          sequence.id, variant.subject, variant.body,
          dayOffsets[i] ?? (i * 3), i + 1
        );
        console.log(`  ✅ Step ${i + 1}: "${variant.subject.substring(0, 50)}..." [template: ${result.templateId}]`);
      } catch (err: any) {
        stepFailures++;
        tracker.warn(`Failed to add step ${i + 1}: ${err.message}`);
      }
    }
    const added = variants.length - stepFailures;
    if (added === 0) tracker.failStep('Add email steps', 'All steps failed');
    else if (stepFailures > 0) tracker.partialStep('Add email steps', `${added}/${variants.length} added`, added);
    else tracker.completeStep('Add email steps', `${added} steps created`, added);
  } else {
    // Existing sequence — check/update blank templates
    console.log(`  → Sequence has ${sequence.num_steps} existing steps — checking templates...`);
    try {
      const details = await getSequenceDetails(sequence.id);
      let blanks = 0, updated = 0;
      const sortedSteps = [...details.steps].sort((a, b) => a.position - b.position);
      for (let i = 0; i < sortedSteps.length && i < variants.length; i++) {
        const step = sortedSteps[i];
        const touch = details.touches.find((t) => t.emailer_step_id === step.id);
        if (!touch) continue;
        const template = details.templates.find((t) => t.id === touch.emailer_template_id);
        if (!template) continue;
        if (!template.subject || !template.body_text) {
          blanks++;
          try {
            await updateEmailTemplate(template.id, variants[i].subject, variants[i].body);
            updated++;
            console.log(`  ✅ Updated blank template for step ${i + 1}`);
          } catch (err: any) { tracker.warn(`Failed to update template step ${i + 1}: ${err.message}`); }
        }
      }
      if (blanks === 0) tracker.completeStep('Add email steps', `All ${sortedSteps.length} steps have content`);
      else tracker.completeStep('Add email steps', `${updated}/${blanks} blank templates populated`);
    } catch (err: any) {
      tracker.completeStep('Add email steps', `Sequence has ${sequence.num_steps} steps — could not verify templates`);
    }
  }

  // ─── Create contacts ───
  tracker.startStep('Create contacts in Apollo');
  const contactInputs = contacts.map((c) => ({
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    email: c.email,
    title: c.title || '',
    organization_name: c.company_name || '',
    website_url: c.company_domain ? `https://${c.company_domain}` : undefined,
  }));

  let contactIds: string[] = [];
  try {
    const created = await bulkCreateContacts(contactInputs);
    contactIds = created.map((c) => c.id);
    if (contactIds.length === 0) tracker.failStep('Create contacts in Apollo', '0 contacts created');
    else if (contactIds.length < contacts.length) tracker.partialStep('Create contacts in Apollo', `${contactIds.length}/${contacts.length}`, contactIds.length);
    else tracker.completeStep('Create contacts in Apollo', `${contactIds.length} contacts created`, contactIds.length);
  } catch (err: any) {
    tracker.failStep('Create contacts in Apollo', err.message);
    tracker.printSummary();
    if (rl) rl.close();
    throw err;
  }

  // ─── Enroll ───
  tracker.startStep('Enroll in sequences');
  if (contactIds.length === 0) {
    tracker.skipStep('Enroll in sequences', 'No contacts to enroll');
  } else {
    try {
      const emailAccounts = await getEmailAccounts();
      if (emailAccounts.length === 0) {
        tracker.partialStep('Enroll in sequences', 'No email accounts connected. Enroll manually.');
      } else {
        const active = emailAccounts.find((a) => a.active) || emailAccounts[0];
        await addContactsToSequence(contactIds, sequence.id, active.id);
        tracker.completeStep('Enroll in sequences', `${contactIds.length} enrolled, sending from ${active.email}`, contactIds.length);
      }
    } catch (err: any) {
      tracker.partialStep('Enroll in sequences', `Enrollment failed: ${err.message}`);
    }
  }

  if (rl) rl.close();
  tracker.printSummary();
  return sequence.id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB Persistence Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function saveIntelligenceToDB(
  classifications: CompanyClassification[],
  contacts: LeadRow[],
  campaignSlug: string,
  offerSlug: string
): Promise<void> {
  const sb = getSupabaseClient();

  // Resolve campaign_id
  const { data: campaignRow } = await sb
    .from('campaigns')
    .select('id')
    .eq('slug', campaignSlug)
    .limit(1)
    .single();

  const campaignId = campaignRow?.id;
  if (!campaignId) {
    console.log('  ⚠️ Campaign not found in DB — skipping intelligence save');
    return;
  }

  // Save company-level intelligence to outreach_intelligence table
  for (const c of classifications) {
    // Look up company_id by domain
    const { data: companyRow } = await sb
      .from('companies')
      .select('id')
      .eq('domain', c.company_domain)
      .limit(1)
      .single();

    await sb.from('outreach_intelligence').insert({
      campaign_id: campaignId,
      company_id: companyRow?.id || null,
      offer_type: c.offer_type,
      service_line: c.service_line,
      segment_key: c.segment_key,
      messaging_angle: c.messaging_angle,
      rationale: c.rationale,
      confidence: c.confidence,
      needs_review: c.needs_review || false,
      fallback_applied: c.fallback_applied || false,
      raw_classification: c as any,
    });
  }

  // Upsert campaign_companies with contact-level intelligence
  // Group by company domain — pick highest-confidence contact per company
  const companyContactMap = new Map<string, typeof contacts[0]>();
  for (const lead of contacts) {
    if (!lead.segment_key || !lead.company_domain) continue;
    const domain = lead.company_domain.toLowerCase().trim();
    const existing = companyContactMap.get(domain);
    if (!existing || (lead.intelligence_confidence || 0) > (existing.intelligence_confidence || 0)) {
      companyContactMap.set(domain, lead);
    }
  }

  let contactSaveCount = 0;
  for (const [domain, lead] of companyContactMap) {
    const { data: companyRow } = await sb
      .from('companies')
      .select('id')
      .eq('domain', domain)
      .limit(1)
      .single();

    if (companyRow?.id) {
      const { error } = await sb
        .from('campaign_companies')
        .upsert(
          {
            campaign_id: campaignId,
            company_id: companyRow.id,
            segment_key: lead.segment_key,
            buyer_persona_angle: lead.buyer_persona_angle,
            contact_rationale: lead.contact_rationale,
            intelligence_confidence: lead.intelligence_confidence,
            needs_review: lead.needs_review || false,
          },
          { onConflict: 'campaign_id,company_id' }
        );

      if (error) {
        console.error(`  ⚠️ Failed to upsert campaign_company for ${domain}: ${error.message}`);
      } else {
        contactSaveCount++;
      }
    }
  }

  console.log(`  → Saved ${classifications.length} company classifications + ${contactSaveCount} campaign_company intelligence rows to DB`);
}

async function saveVariantsAndArtifacts(
  segments: SegmentGroup[],
  campaignSlug: string,
  offerSlug: string
): Promise<void> {
  const sb = getSupabaseClient();

  // Resolve campaign_id
  const { data: campaignRow } = await sb
    .from('campaigns')
    .select('id')
    .eq('slug', campaignSlug)
    .limit(1)
    .single();

  const campaignId = campaignRow?.id;
  if (!campaignId) return;

  // Save message_variants with segment_key
  for (const segment of segments) {
    if (!segment.variants) continue;

    for (const variant of segment.variants) {
      await sb.from('message_variants').insert({
        campaign_id: campaignId,
        channel: 'email',
        variant_name: `${segment.segment_key} - Variant ${variant.variant_number}`,
        subject_line: variant.subject,
        body: variant.body,
        segment_key: segment.segment_key,
      });
    }
  }

  // Save generated_artifacts for tracking
  const totalVariants = segments.reduce((sum, s) => sum + (s.variants?.length || 0), 0);
  await sb.from('generated_artifacts').insert({
    campaign_id: campaignId,
    skill_id: 'skill-5',
    artifact_name: `Intelligent Outreach - ${segments.length} segments, ${totalVariants} variants`,
    artifact_type: 'outreach_intelligence',
    metadata: {
      segments: segments.map((s) => ({
        segment_key: s.segment_key,
        companies: s.companies.length,
        contacts: s.contacts.length,
        variants: s.variants?.length || 0,
        apollo_sequence_id: s.apollo_sequence_id,
      })),
    },
  });

  console.log(`  → Saved ${totalVariants} message variants + artifact metadata`);
}

// ─── Print Summary ──────────────────────────────────────────────────────────

function printIntelligenceSummary(
  segments: SegmentGroup[],
  classifications: CompanyClassification[],
  totalCreated: number,
  totalEnrolled: number,
  sendingEmail: string
): void {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`  INTELLIGENT OUTREACH SUMMARY`);
  console.log(`${'━'.repeat(60)}`);

  // Classification stats
  const highConf = classifications.filter((c) => c.confidence >= 0.75).length;
  const medConf = classifications.filter((c) => c.confidence >= LOW_CONFIDENCE_THRESHOLD && c.confidence < 0.75).length;
  const lowConf = classifications.filter((c) => c.confidence < LOW_CONFIDENCE_THRESHOLD).length;
  console.log(`\n  Company Classifications: ${classifications.length}`);
  console.log(`    High confidence (≥0.75):  ${highConf}`);
  console.log(`    Medium (0.65-0.74):       ${medConf}`);
  console.log(`    Low / needs review (<0.65): ${lowConf}`);

  // Segment breakdown
  console.log(`\n  Active Segments: ${segments.length}`);
  for (const seg of segments) {
    const label = `${OFFER_TYPE_LABELS[seg.offer_type]} × ${SERVICE_LINE_LABELS[seg.service_line]}`;
    console.log(`    ${seg.segment_key}`);
    console.log(`      ${label}`);
    console.log(`      Companies: ${seg.companies.length} | Contacts: ${seg.contacts.length} | Variants: ${seg.variants?.length || 0}`);
    if (seg.apollo_sequence_id) {
      console.log(`      Apollo Sequence: ${seg.apollo_sequence_id}`);
    }
  }

  // Enrollment
  console.log(`\n  Contacts created:  ${totalCreated}`);
  console.log(`  Contacts enrolled: ${totalEnrolled}`);
  console.log(`  Sending from:      ${sendingEmail}`);

  if (totalEnrolled > 0) {
    console.log(`\n  ✅ Apollo will send sequences automatically based on your settings.`);
  } else if (totalCreated > 0) {
    console.log(`\n  ⚠️  Contacts created but not enrolled. Connect email account in Apollo, then enroll manually.`);
  }

  console.log(`\n  Next: Wait 7-14 days, then run Skill 6 to analyze results`);
  console.log(`    npm run skill:6 -- <offer-slug> <campaign-slug>`);
  console.log(`${'━'.repeat(60)}\n`);
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill5LaunchOutreach();
}
