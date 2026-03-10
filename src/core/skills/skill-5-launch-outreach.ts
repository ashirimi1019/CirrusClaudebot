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
  type ApolloSequence,
} from '../../lib/clients/apollo.ts';
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
  console.log('\n========================================');
  console.log('SKILL 5: LAUNCH OUTREACH (Apollo Sequences)');
  console.log('========================================\n');

  let offerSlug: string;
  let campaignSlug: string;
  const autoMode = !!(config?.autoCreateSequence || config?.apolloSequenceId);
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

  try {
    // Paths
    const copyDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'copy');
    const leadsPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'leads', 'all_leads.csv');

    if (!fs.existsSync(leadsPath)) {
      throw new Error(`all_leads.csv not found. Run Skill 4 first.\nExpected: ${leadsPath}`);
    }

    // ─── Step 1: Load contacts ───
    console.log('📖 Loading leads and copy...');
    const allLeads = await readCSV(leadsPath);
    // Only rows with an email (skip company-only rows)
    const contacts = allLeads.filter((row) => row.email && row.email.trim());
    console.log(`✅ ${contacts.length} contacts with emails loaded`);

    // ─── Step 2: Load email variants ───
    const variantFiles = fs.readdirSync(copyDir).filter((f) => f.startsWith('email-') && f.endsWith('.txt'));
    if (variantFiles.length === 0) throw new Error(`No email variants found in ${copyDir}. Run Skill 3 first.`);

    const variants = variantFiles.map((file) => {
      const content = fs.readFileSync(path.join(copyDir, file), 'utf-8');
      return { name: file.replace('.txt', ''), ...parseEmailVariant(content, file) };
    });
    console.log(`✅ ${variants.length} email variants loaded\n`);

    // ─── Step 3: Choose or create Apollo sequence ───
    console.log('🔗 Loading Apollo sequences...');
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
        if (idx < 0 || idx >= existingSequences.length) throw new Error('Invalid selection');
        sequence = existingSequences[idx];
        console.log(`✅ Using existing sequence: "${sequence.name}"`);
      }
    } else {
      console.log(`No existing sequences found. Creating: "${defaultSequenceName}"`);
      sequence = await createSequence(defaultSequenceName);
      console.log(`✅ Created sequence: "${sequence.name}" (ID: ${sequence.id})`);
    }

    // ─── Step 4: Add email steps to sequence (if new sequence) ───
    if (sequence.num_steps === 0) {
      console.log(`\n📧 Adding ${variants.length} email steps to sequence...`);
      // Day offsets: first email day 0, follow-ups day 3 and day 7
      const dayOffsets = [0, 3, 7];

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const signal = contacts[0]?.hiring_signal || 'engineering talent';
        // Use a generic version of the first contact for step templates
        const templateSubject = variant.subject;
        const templateBody = variant.body;

        await addEmailStepToSequence(
          sequence.id,
          templateSubject,
          templateBody,
          dayOffsets[i] ?? (i * 3),
          i + 1
        );
        console.log(`  ✅ Step ${i + 1}: "${templateSubject.substring(0, 50)}..." (day ${dayOffsets[i] ?? i * 3})`);
      }
    } else {
      console.log(`\nℹ️  Sequence already has ${sequence.num_steps} steps — skipping step creation`);
    }

    // ─── Step 5: Personalize + create contacts in Apollo ───
    console.log(`\n👥 Creating ${contacts.length} contacts in Apollo CRM...`);

    const contactInputs = contacts.map((contact) => ({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email,
      title: contact.title || '',
      organization_name: contact.company_name || '',
      website_url: contact.company_domain ? `https://${contact.company_domain}` : undefined,
    }));

    const createdContacts = await bulkCreateContacts(contactInputs);
    const contactIds = createdContacts.map((c) => c.id);

    console.log(`✅ ${createdContacts.length} contacts created in Apollo`);

    // ─── Step 6: Enroll contacts in sequence ───
    console.log(`\n🚀 Enrolling contacts in sequence "${sequence.name}"...`);

    // Check email accounts
    const emailAccounts = await getEmailAccounts();
    if (emailAccounts.length === 0) {
      throw new Error('No email accounts connected in Apollo. Go to Apollo Settings → Email Accounts and connect a mailbox first.');
    }
    const activeAccount = emailAccounts.find((a) => a.active);
    console.log(`  → Sending from: ${activeAccount?.email || emailAccounts[0].email}`);

    await addContactsToSequence(contactIds, sequence.id, activeAccount?.id || emailAccounts[0].id);

    if (rl) rl.close();

    console.log('\n========================================');
    console.log('✅ SKILL 5 COMPLETE');
    console.log('========================================');
    console.log(`\nLaunched:`);
    console.log(`  Contacts enrolled:  ${contactIds.length}`);
    console.log(`  Sequence:           "${sequence.name}"`);
    console.log(`  Sequence ID:        ${sequence.id}`);
    console.log(`  Email steps:        ${variants.length}`);
    console.log(`  Sending from:       ${activeAccount?.email || 'Apollo default'}`);
    console.log(`\nApollo will send the sequence automatically based on your settings.`);
    console.log(`\nNext: Wait 7-14 days, then run Skill 6 to analyze results`);
    console.log(`  npm run skill:6`);
    console.log(`  (Save this sequence ID for Skill 6: ${sequence.id})`);

    return sequence.id;
  } catch (err: any) {
    console.error('❌ Error:', err.message || err);
    if (rl) rl.close();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill5LaunchOutreach();
}
