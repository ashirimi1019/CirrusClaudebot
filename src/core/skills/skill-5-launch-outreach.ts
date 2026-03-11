/**
 * SKILL 5: LAUNCH OUTREACH (Apollo.io Sequences)
 * Pushes contacts directly into Apollo email sequences via API
 * Input: Offer slug + Campaign slug
 * Output: Contacts enrolled in Apollo sequence (no CSV needed)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

// Read CSV using readline (no csv-parse dependency)
async function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let headers: string[] = [];
    let isFirst = true;

    rl.on('line', (line) => {
      if (!line.trim()) return;
      // Simple CSV parser: handle quoted fields
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

// Placeholder replacement
function personalizeMessage(
  template: string,
  contact: any,
  signal: string,
  senderName: string = 'CirrusLabs'
): string {
  return template
    .replace(/\[First Name\]/g, contact.first_name || 'there')
    .replace(/\[Name\]/g, contact.first_name || '')
    .replace(/\[Company Name\]/g, contact.company_name || '')
    .replace(/\[Company\]/g, contact.company_name || '')
    .replace(/\[Your Name\]/g, senderName)
    .replace(/\[role\]/g, signal)
    .replace(/\[Role\]/g, signal)
    .replace(/\[role plural\]/g, signal + 's')
    .replace(/\[roles\]/g, signal + 's');
}

// Parse email variant file: extract subject + body
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

export interface OutreachConfig {
  apolloSequenceId?: string | null;  // null = auto-create
  autoCreateSequence?: boolean;      // skip sequence selection prompt
}

export async function runSkill5LaunchOutreach(
  offerSlugArg?: string,
  campaignSlugArg?: string,
  config?: OutreachConfig
): Promise<string | void> {
  const tracker = new SkillRunTracker('SKILL 5: LAUNCH OUTREACH (Apollo Sequences)');
  tracker.step('Validate inputs');
  tracker.step('Load contacts & copy');
  tracker.step('Select/create sequence');
  tracker.step('Add email steps');
  tracker.step('Create contacts in Apollo');
  tracker.step('Enroll in sequence');

  let offerSlug: string;
  let campaignSlug: string;
  // Auto mode if: config provided, or running from CLI with args (non-interactive)
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
    requireCopy: true,
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
    const copyDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'copy');
    const leadsPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'leads', 'all_leads.csv');

    // ─── Step 2: Load contacts & copy ───
    tracker.startStep('Load contacts & copy');
    const allLeads = await readCSV(leadsPath);
    // Only rows with an email (skip company-only rows)
    const contacts = allLeads.filter((row) => row.email && row.email.trim());

    if (contacts.length === 0) {
      tracker.failStep('Load contacts & copy', `all_leads.csv has ${allLeads.length} rows but 0 contacts with emails. Run Skill 4 again or check CSV.`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error('Skill 5: No contacts with emails found in all_leads.csv');
    }

    const variantFiles = fs.readdirSync(copyDir).filter((f) => f.startsWith('email-') && f.endsWith('.txt'));
    if (variantFiles.length === 0) {
      tracker.failStep('Load contacts & copy', `No email-*.txt files found in ${copyDir}. Run Skill 3 first.`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error(`Skill 5: No email variants found in ${copyDir}`);
    }

    const variants = variantFiles.map((file) => {
      const content = fs.readFileSync(path.join(copyDir, file), 'utf-8');
      return { name: file.replace('.txt', ''), ...parseEmailVariant(content, file) };
    });
    tracker.completeStep('Load contacts & copy', `${contacts.length} contacts, ${variants.length} email variants`);

    // ─── Step 3: Choose or create Apollo sequence ───
    tracker.startStep('Select/create sequence');
    const existingSequences = await listSequences();

    let sequence: ApolloSequence;
    const defaultSequenceName = `CirrusLabs - ${campaignSlug}`;

    if (config?.apolloSequenceId) {
      // Use explicitly provided sequence ID
      const found = existingSequences.find((s) => s.id === config.apolloSequenceId);
      if (found) {
        sequence = found;
        console.log(`✅ Using configured sequence: "${sequence.name}"`);
      } else {
        tracker.failStep('Select/create sequence', `Sequence ID "${config.apolloSequenceId}" not found in Apollo`);
        tracker.printSummary();
        if (rl) rl.close();
        throw new Error(`Sequence ID "${config.apolloSequenceId}" not found in Apollo`);
      }
    } else if (autoMode || config?.autoCreateSequence) {
      // Auto-mode: find existing sequence matching campaign name or create new one
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
    } else if (existingSequences.length > 0) {
      // Interactive: show menu
      console.log('\nExisting sequences:');
      existingSequences.forEach((s, i) => {
        console.log(`  [${i + 1}] ${s.name} (${s.num_contacts} contacts, ${s.num_steps} steps)`);
      });
      console.log(`  [N] Create new sequence`);

      const choice = await prompt(rl!, '\nSelect sequence number or N for new: ');

      if (choice.toLowerCase() === 'n') {
        const name = await prompt(rl!, `New sequence name (default: "${defaultSequenceName}"): `);
        sequence = await createSequence(name || defaultSequenceName);
        console.log(`✅ Created sequence: "${sequence.name}" (ID: ${sequence.id})`);
      } else {
        const idx = parseInt(choice) - 1;
        if (idx < 0 || idx >= existingSequences.length) {
          tracker.failStep('Select/create sequence', `Invalid selection: "${choice}"`);
          tracker.printSummary();
          if (rl) rl.close();
          throw new Error('Invalid sequence selection');
        }
        sequence = existingSequences[idx];
        console.log(`✅ Using existing sequence: "${sequence.name}"`);
      }
    } else {
      console.log(`No existing sequences found. Creating: "${defaultSequenceName}"`);
      sequence = await createSequence(defaultSequenceName);
      console.log(`✅ Created sequence: "${sequence.name}" (ID: ${sequence.id})`);
    }
    tracker.completeStep('Select/create sequence', `"${sequence.name}" (ID: ${sequence.id})`);

    // ─── Step 4: Add email steps OR update blank templates ───
    tracker.startStep('Add email steps');
    const dayOffsets = [0, 3, 7];

    if (sequence.num_steps === 0) {
      // New sequence — create steps and populate templates
      let stepFailures = 0;

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        try {
          const result = await addEmailStepToSequence(
            sequence.id,
            variant.subject,
            variant.body,
            dayOffsets[i] ?? (i * 3),
            i + 1
          );
          console.log(`  ✅ Step ${i + 1}: "${variant.subject.substring(0, 50)}..." (day ${dayOffsets[i] ?? i * 3}) [template: ${result.templateId}]`);
        } catch (stepErr: any) {
          stepFailures++;
          tracker.warn(`Failed to add email step ${i + 1}: ${stepErr.message}`);
        }
      }

      const stepsAdded = variants.length - stepFailures;
      if (stepsAdded === 0) {
        tracker.failStep('Add email steps', `All ${variants.length} step additions failed. Check Apollo API permissions.`);
      } else if (stepFailures > 0) {
        tracker.partialStep('Add email steps', `${stepsAdded}/${variants.length} steps added, ${stepFailures} failed`, stepsAdded);
      } else {
        tracker.completeStep('Add email steps', `${stepsAdded} steps created + templates populated`, stepsAdded);
      }
    } else {
      // Existing sequence — check for blank templates and update them
      console.log(`  → Sequence has ${sequence.num_steps} existing steps — checking templates...`);
      try {
        const details = await getSequenceDetails(sequence.id);
        let blanks = 0;
        let updated = 0;

        // Match each touch/template to a variant by step position order
        const sortedSteps = [...details.steps].sort((a, b) => a.position - b.position);

        for (let i = 0; i < sortedSteps.length && i < variants.length; i++) {
          const step = sortedSteps[i];
          const touch = details.touches.find((t) => t.emailer_step_id === step.id);
          if (!touch) continue;

          const template = details.templates.find((t) => t.id === touch.emailer_template_id);
          if (!template) continue;

          // Check if template is blank (no subject or empty body)
          if (!template.subject || !template.body_text) {
            blanks++;
            const variant = variants[i];
            try {
              await updateEmailTemplate(template.id, variant.subject, variant.body);
              updated++;
              console.log(`  ✅ Updated blank template for step ${i + 1}: "${variant.subject.substring(0, 50)}..."`);
            } catch (updateErr: any) {
              tracker.warn(`Failed to update template for step ${i + 1}: ${updateErr.message}`);
            }
          } else {
            console.log(`  ℹ️  Step ${i + 1} template already has content: "${template.subject?.substring(0, 40)}..."`);
          }
        }

        if (blanks === 0) {
          tracker.completeStep('Add email steps', `All ${sortedSteps.length} steps already have template content`);
        } else if (updated === blanks) {
          tracker.completeStep('Add email steps', `${updated} blank templates populated (${sortedSteps.length} steps total)`);
        } else {
          tracker.partialStep('Add email steps', `${updated}/${blanks} blank templates updated`, updated);
        }
      } catch (detailErr: any) {
        tracker.warn(`Could not check existing templates: ${detailErr.message}`);
        tracker.completeStep('Add email steps', `Sequence has ${sequence.num_steps} steps — could not verify template content`);
      }
    }

    // ─── Step 5: Create contacts in Apollo ───
    tracker.startStep('Create contacts in Apollo');

    const contactInputs = contacts.map((contact) => ({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email,
      title: contact.title || '',
      organization_name: contact.company_name || '',
      website_url: contact.company_domain ? `https://${contact.company_domain}` : undefined,
    }));

    let contactIds: string[] = [];
    try {
      const createdContacts = await bulkCreateContacts(contactInputs);
      contactIds = createdContacts.map((c) => c.id);

      if (contactIds.length === 0) {
        tracker.failStep('Create contacts in Apollo', `bulkCreateContacts returned 0 contacts. Check Apollo API response.`);
      } else if (contactIds.length < contacts.length) {
        tracker.partialStep('Create contacts in Apollo', `${contactIds.length}/${contacts.length} contacts created`, contactIds.length);
      } else {
        tracker.completeStep('Create contacts in Apollo', `${contactIds.length} contacts created`, contactIds.length);
      }
    } catch (createErr: any) {
      tracker.failStep('Create contacts in Apollo', `bulkCreateContacts failed: ${createErr.message}`);
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error(`Skill 5: Failed to create contacts in Apollo: ${createErr.message}`);
    }

    // ─── Step 6: Enroll contacts in sequence ───
    tracker.startStep('Enroll in sequence');

    let enrollmentSuccess = false;
    let sendingEmail = 'N/A';

    if (contactIds.length === 0) {
      tracker.skipStep('Enroll in sequence', 'No contacts to enroll (0 created in previous step)');
    } else {
      try {
        const emailAccounts = await getEmailAccounts();
        if (emailAccounts.length === 0) {
          tracker.partialStep('Enroll in sequence', 'No email accounts connected in Apollo. Contacts created but enrollment skipped.');
          tracker.warn('Go to Apollo Settings → Email Accounts → Connect a mailbox, then manually enroll contacts.');
        } else {
          const activeAccount = emailAccounts.find((a) => a.active);
          sendingEmail = activeAccount?.email || emailAccounts[0].email;
          console.log(`  → Sending from: ${sendingEmail}`);

          await addContactsToSequence(contactIds, sequence.id, activeAccount?.id || emailAccounts[0].id);
          enrollmentSuccess = true;
          tracker.completeStep('Enroll in sequence', `${contactIds.length} contacts enrolled, sending from ${sendingEmail}`, contactIds.length);
        }
      } catch (enrollErr: any) {
        tracker.partialStep('Enroll in sequence', `Enrollment failed: ${enrollErr.message}. Contacts created but not enrolled.`);
        tracker.warn('You can manually enroll contacts in Apollo UI.');
      }
    }

    if (rl) rl.close();

    tracker.printSummary();
    console.log(`\nResults:`);
    console.log(`  Contacts created:   ${contactIds.length}`);
    console.log(`  Sequence:           "${sequence.name}"`);
    console.log(`  Sequence ID:        ${sequence.id}`);
    console.log(`  Email steps:        ${sequence.num_steps > 0 ? sequence.num_steps : variants.length}`);
    console.log(`  Enrolled:           ${enrollmentSuccess ? contactIds.length : '0 (see warnings above)'}`);
    console.log(`  Sending from:       ${sendingEmail}`);
    if (enrollmentSuccess) {
      console.log(`\nApollo will send the sequence automatically based on your settings.`);
    } else {
      console.log(`\n⚠️  To complete: Connect an email account in Apollo, then enroll contacts manually.`);
    }
    console.log(`\nNext: Wait 7-14 days, then run Skill 6 to analyze results`);
    console.log(`  npm run skill:6`);
    console.log(`  (Save this sequence ID for Skill 6: ${sequence.id})`);

    return sequence.id;
  } catch (err: any) {
    if (rl) rl.close();
    // Re-throw — don't process.exit so callers can handle
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill5LaunchOutreach();
}
