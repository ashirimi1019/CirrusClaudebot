/**
 * SKILL 3: CAMPAIGN COPY
 * Generates email and LinkedIn message variants for a campaign
 * Input: Offer slug + Campaign slug
 * Output: Email and LinkedIn variants in offers/{slug}/campaigns/{campaign}/copy/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDraft } from '../../lib/clients/openai.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { SkillRunTracker } from '../../lib/services/run-tracker.ts';
import { validateSkillInputs } from '../../lib/services/validation.ts';
import { buildSkillContext } from '../../lib/verticals/index.ts';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Read files
function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export async function runSkill3CampaignCopy(): Promise<void> {
  const tracker = new SkillRunTracker('SKILL 3: CAMPAIGN COPY GENERATION');
  tracker.step('Validate inputs');
  tracker.step('Load vertical context');
  tracker.step('Generate email variants');
  tracker.step('Generate LinkedIn variants');
  tracker.step('Write copy files');
  tracker.step('Save to database');

  let offerSlug: string;
  let campaignSlug: string;
  let rl: readline.Interface | null = null;

  // Check for command line arguments first
  if (process.argv[2] && process.argv[3]) {
    offerSlug = process.argv[2];
    campaignSlug = process.argv[3];
    console.log(`  Offer: ${offerSlug}`);
    console.log(`  Campaign: ${campaignSlug}`);
  } else {
    // Fall back to interactive mode
    rl = createReadlineInterface();
    offerSlug = await prompt(rl, 'Enter offer slug (e.g., "talent-as-service-us"): ');
    campaignSlug = await prompt(rl, 'Enter campaign slug (e.g., "hiring-data-engineers"): ');
    rl.close();
    rl = null;
  }

  // ─── Step 1: Validate inputs ───
  tracker.startStep('Validate inputs');
  const validation = validateSkillInputs({
    offerSlug,
    campaignSlug,
    requirePositioning: true,
    requireStrategy: true,
  });
  if (!validation.valid) {
    tracker.failStep('Validate inputs', validation.errors.join('; '));
    tracker.printSummary();
    throw new Error(`Skill 3 input validation failed:\n  ${validation.errors.join('\n  ')}`);
  }
  tracker.completeStep('Validate inputs', `offer="${offerSlug}", campaign="${campaignSlug}"`);

  // ─── Step 1b: Load vertical context ───
  tracker.startStep('Load vertical context');
  let verticalContext = '';
  try {
    const sb = getSupabaseClient();
    const { data: offerRow } = await sb.from('offers').select('id').eq('slug', offerSlug).single();
    if (offerRow?.id) {
      const { data: campaignRow } = await sb.from('campaigns').select('id').eq('offer_id', offerRow.id).eq('slug', campaignSlug).single();
      const verticalCtx = await buildSkillContext('skill-3', offerRow.id, campaignRow?.id);
      if (verticalCtx.effectiveVertical) {
        verticalContext = verticalCtx.context;
        tracker.completeStep('Load vertical context', `vertical="${verticalCtx.effectiveVertical}", sections=[${verticalCtx.loadedSections.join(', ')}]`);
      } else {
        tracker.completeStep('Load vertical context', 'No vertical configured');
      }
    } else {
      tracker.completeStep('Load vertical context', 'Skipped — offer not found in DB');
    }
  } catch (err) {
    tracker.partialStep('Load vertical context', `Warning: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Read positioning and strategy
  const positioningPath = path.join(process.cwd(), 'offers', offerSlug, 'positioning.md');
  const strategyPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'strategy.md');
  const positioning = readFile(positioningPath);
  const strategy = readFile(strategyPath);

  // Copy + results directories
  const copyDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'copy');
  fs.mkdirSync(copyDir, { recursive: true });
  const resultsDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  // ─── Step 2: Generate email variants ───
  tracker.startStep('Generate email variants');
  const emailVariants: Array<{ name: string; subject: string; body: string }> = [];
  let emailFailures = 0;

  for (let i = 1; i <= 3; i++) {
    const angle = getEmailAngle(i);
    try {
      const draft = await generateDraft({
        companyName: '[Company Name]',
        buyerFirstName: '[First Name]',
        buyerTitle: '[Title]',
        evidenceTitle: extractSignalFromStrategy(strategy),
        jobUrl: undefined,
        additionalContext: verticalContext,
      });
      emailVariants.push({ name: `email-variant-${i}`, subject: draft.subject, body: draft.body });
      console.log(`  ✅ Email variant ${i} generated (angle: ${angle})`);
    } catch (err: any) {
      emailFailures++;
      tracker.warn(`Email variant ${i} generation failed: ${err.message}`);
    }
  }

  if (emailVariants.length === 0) {
    tracker.failStep('Generate email variants', 'All 3 email variants failed to generate');
    tracker.printSummary();
    throw new Error('Skill 3: Could not generate any email variants. Check OPENAI_API_KEY and credits.');
  } else if (emailFailures > 0) {
    tracker.partialStep('Generate email variants', `${emailVariants.length}/3 generated, ${emailFailures} failed`, emailVariants.length);
  } else {
    tracker.completeStep('Generate email variants', `${emailVariants.length} variants`, emailVariants.length);
  }

  // ─── Step 3: Generate LinkedIn variants ───
  tracker.startStep('Generate LinkedIn variants');
  const linkedinVariants = [
    { name: 'linkedin-variant-1', content: generateLinkedInMessage1(positioning, strategy) },
    { name: 'linkedin-variant-2', content: generateLinkedInMessage2(positioning, strategy) },
    { name: 'linkedin-variant-3', content: generateLinkedInMessage3(positioning, strategy) },
  ];
  tracker.completeStep('Generate LinkedIn variants', '3 variants (template-based)', 3);

  // ─── Step 4: Write copy files ───
  tracker.startStep('Write copy files');

  // Email markdown
  const emailMdLines: string[] = [
    `# Email Variants`, ``, `**Offer:** ${offerSlug}`, `**Campaign:** ${campaignSlug}`,
    `**Generated:** ${new Date().toISOString()}`, ``, `---`, ``,
  ];
  emailVariants.forEach((variant, idx) => {
    emailMdLines.push(`## Variant ${idx + 1}`, ``, `**Subject:** ${variant.subject}`, ``, variant.body, ``, `---`, ``);
  });
  fs.writeFileSync(path.join(copyDir, 'email-variants.md'), emailMdLines.join('\n'));

  // Individual .txt files (required by Skill 5)
  emailVariants.forEach((variant, idx) => {
    const txtContent = `---\nSubject: ${variant.subject}\n\n${variant.body}\n---`;
    fs.writeFileSync(path.join(copyDir, `email-variant-${idx + 1}.txt`), txtContent);
  });

  // LinkedIn markdown
  const linkedinMdLines: string[] = [
    `# LinkedIn Variants`, ``, `**Offer:** ${offerSlug}`, `**Campaign:** ${campaignSlug}`,
    `**Generated:** ${new Date().toISOString()}`, ``,
    `> **INSTRUCTIONS:** Manual sending only — never automate LinkedIn.`,
    `> Wait 2-3 days after connecting before sending. Max 5-10 per day. Vary slightly — no copy-paste.`,
    ``, `---`, ``,
  ];
  linkedinVariants.forEach((variant, idx) => {
    linkedinMdLines.push(`## Variant ${idx + 1}`, ``, variant.content, ``, `---`, ``);
  });
  fs.writeFileSync(path.join(copyDir, 'linkedin-variants.md'), linkedinMdLines.join('\n'));

  // Personalization notes
  const personalizationNotes = `# Personalization Notes

**Offer:** ${offerSlug}
**Campaign:** ${campaignSlug}
**Generated:** ${new Date().toISOString()}

---

## Placeholders to Replace

| Placeholder | Replace With | Source |
|-------------|--------------|--------|
| \`[Company Name]\` | Actual company name | Leads CSV: \`company_name\` |
| \`[Company]\` | Actual company name | Leads CSV: \`company_name\` |
| \`[First Name]\` | Contact's first name | Leads CSV: \`first_name\` |
| \`[Name]\` | Contact's first name | Leads CSV: \`first_name\` |
| \`[Title]\` | Contact's job title | Leads CSV: \`title\` |
| \`[role]\` | Hiring role detected | Leads CSV: \`hiring_signal\` |
| \`[role plural]\` | Plural of hiring role | Manually pluralize from \`hiring_signal\` |
| \`[Your name]\` | CirrusLabs | Hardcoded |

## Notes
- Skill 5 replaces these placeholders automatically when building outreach/messages.csv
- Double-check [role plural] — auto-pluralization handles common cases (Engineer→Engineers, etc.)
- Subject lines with personalization outperform generic subject lines
`;
  fs.writeFileSync(path.join(copyDir, 'personalization-notes.md'), personalizationNotes);

  tracker.completeStep('Write copy files', `${copyDir} (${emailVariants.length} email .txt + .md, linkedin .md, notes .md)`);

  // ─── Step 5: Save to database ───
  tracker.startStep('Save to database');
  const sb = getSupabaseClient();

  const { data: offerData, error: offerError } = await sb
    .from('offers').select('id').eq('slug', offerSlug).single();

  if (offerError || !offerData) {
    tracker.partialStep('Save to database', `Offer not found in DB: ${offerError?.message || 'no row'}. Copy files saved but not DB records.`);
    tracker.warn('Run Skill 1 with DB save first if the offer is not in the database.');
  } else {
    const { data: campaign, error: campaignError } = await sb
      .from('campaigns').select('id').eq('offer_id', offerData.id).eq('slug', campaignSlug).single();

    if (campaignError || !campaign) {
      tracker.partialStep('Save to database', `Campaign not found in DB: ${campaignError?.message || 'no row'}. Copy files saved but not DB records.`);
      tracker.warn('Run Skill 2 with DB save first if the campaign is not in the database.');
    } else {
      // Save each variant individually so partial failures are visible
      let dbSaved = 0;
      let dbFailed = 0;
      for (let idx = 0; idx < emailVariants.length; idx++) {
        const variant = emailVariants[idx];
        const { error: insertErr } = await sb.from('message_variants').insert({
          campaign_id: campaign.id,
          variant_name: `email-${idx + 1}`,
          channel: 'email',
          subject_line: variant.subject,
          body: variant.body,
        });
        if (insertErr) {
          dbFailed++;
          tracker.warn(`DB insert failed for email-${idx + 1}: ${insertErr.message}`);
        } else {
          dbSaved++;
        }
      }

      if (dbFailed > 0) {
        tracker.partialStep('Save to database', `${dbSaved} saved, ${dbFailed} failed`);
      } else {
        tracker.completeStep('Save to database', `${dbSaved} email variants saved to message_variants`, dbSaved);
      }
    }
  }

  tracker.printSummary();
  console.log(`Next: npm run skill:4 -- ${offerSlug} ${campaignSlug}`);
}

// Helper functions
function getEmailAngle(variant: number): string {
  const angles = [
    'Direct signal reference (lead with job posting)',
    'Problem-first angle (pain point focus)',
    'Value-first angle (what we bring)',
  ];
  return angles[variant - 1] || 'General';
}

function extractSignalFromStrategy(strategy: string): string {
  const match = strategy.match(/Signal Hypothesis.*?([^\n]+)/);
  return match ? match[1].trim() : 'hiring signal detected';
}

function buildEmailPrompt(positioning: string, strategy: string, angle: string): string {
  return `Generate a cold email based on this positioning and strategy.
Angle: ${angle}
Positioning: ${positioning}
Strategy: ${strategy}
`;
}

function generateLinkedInMessage1(positioning: string, strategy: string): string {
  return `Thanks for connecting! I noticed you're leading engineering at [Company] and [Company] is scaling the team.

We specialize in placing [role] at companies like yours. Most companies spend 3-4 months recruiting.

Would be worth a quick chat to see if it makes sense to work together.

[Your name]`;
}

function generateLinkedInMessage2(positioning: string, strategy: string): string {
  return `Hi [Name],

Quick note - I saw [Company] posted a job for [role]. Finding [role plural] takes most companies months.

We typically do it in weeks because we start with vetted candidates, not job posts.

No pressure, but thought worth flagging.

[Your name]`;
}

function generateLinkedInMessage3(positioning: string, strategy: string): string {
  return `[Name], thanks for connecting!

[Company] is at an interesting inflection point with all the hiring you're doing for [role].

This is typically where teams start feeling the pinch on recruitment timelines.

Worth a 15-min call to see if we can help accelerate it?

[Your name]`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill3CampaignCopy();
}
