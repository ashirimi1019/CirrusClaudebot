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
  console.log('\n========================================');
  console.log('SKILL 3: CAMPAIGN COPY GENERATION');
  console.log('========================================\n');

  let offerSlug: string;
  let campaignSlug: string;
  let rl: readline.Interface | null = null;

  // Check for command line arguments first
  if (process.argv[2] && process.argv[3]) {
    offerSlug = process.argv[2];
    campaignSlug = process.argv[3];
    console.log(`✅ Using command line arguments:`);
    console.log(`  Offer: ${offerSlug}`);
    console.log(`  Campaign: ${campaignSlug}\n`);
  } else {
    // Fall back to interactive mode
    rl = createReadlineInterface();

    // Get inputs
    offerSlug = await prompt(rl, 'Enter offer slug (e.g., "talent-as-service-us"): ');
    campaignSlug = await prompt(rl, 'Enter campaign slug (e.g., "hiring-data-engineers"): ');

    rl.close();
  }

  try {

    console.log('\n📖 Reading files...');

    // Read positioning and strategy
    const positioningPath = path.join(process.cwd(), 'offers', offerSlug, 'positioning.md');
    const strategyPath = path.join(
      process.cwd(),
      'offers',
      offerSlug,
      'campaigns',
      campaignSlug,
      'strategy.md'
    );

    const positioning = readFile(positioningPath);
    const strategy = readFile(strategyPath);

    console.log('✅ Files loaded');
    console.log('\n🤖 Generating copy variants...\n');

    // Copy directory
    const copyDir = path.join(
      process.cwd(),
      'offers',
      offerSlug,
      'campaigns',
      campaignSlug,
      'copy'
    );
    fs.mkdirSync(copyDir, { recursive: true });

    // Results directory (for Skill 6 output)
    const resultsDir = path.join(
      process.cwd(),
      'offers',
      offerSlug,
      'campaigns',
      campaignSlug,
      'results'
    );
    fs.mkdirSync(resultsDir, { recursive: true });

    // Generate email variants
    console.log('📧 Generating email variants...');
    const emailVariants: Array<{ name: string; subject: string; body: string }> = [];

    for (let i = 1; i <= 3; i++) {
      const angle = getEmailAngle(i);
      const prompt = buildEmailPrompt(positioning, strategy, angle);

      try {
        const draft = await generateDraft({
          companyName: '[Company Name]',
          buyerFirstName: '[First Name]',
          buyerTitle: '[Title]',
          evidenceTitle: extractSignalFromStrategy(strategy),
          jobUrl: undefined,
        });

        emailVariants.push({
          name: `email-variant-${i}`,
          subject: draft.subject,
          body: draft.body,
        });

        console.log(`✅ Email variant ${i} generated`);
      } catch (err) {
        console.error(`❌ Error generating email ${i}:`, err);
      }
    }

    // Save email variants as consolidated markdown
    const emailMdLines: string[] = [
      `# Email Variants`,
      ``,
      `**Offer:** ${offerSlug}`,
      `**Campaign:** ${campaignSlug}`,
      `**Generated:** ${new Date().toISOString()}`,
      ``,
      `---`,
      ``,
    ];
    emailVariants.forEach((variant, idx) => {
      emailMdLines.push(`## Variant ${idx + 1}`);
      emailMdLines.push(``);
      emailMdLines.push(`**Subject:** ${variant.subject}`);
      emailMdLines.push(``);
      emailMdLines.push(variant.body);
      emailMdLines.push(``);
      emailMdLines.push(`---`);
      emailMdLines.push(``);
    });
    const emailMdPath = path.join(copyDir, 'email-variants.md');
    fs.writeFileSync(emailMdPath, emailMdLines.join('\n'));
    console.log(`💾 Saved ${emailMdPath}`);

    // Generate LinkedIn variants
    console.log('\n💼 Generating LinkedIn variants...');
    const linkedinVariants = [
      {
        name: 'linkedin-variant-1',
        content: generateLinkedInMessage1(positioning, strategy),
      },
      {
        name: 'linkedin-variant-2',
        content: generateLinkedInMessage2(positioning, strategy),
      },
      {
        name: 'linkedin-variant-3',
        content: generateLinkedInMessage3(positioning, strategy),
      },
    ];

    // Save LinkedIn variants as consolidated markdown
    const linkedinMdLines: string[] = [
      `# LinkedIn Variants`,
      ``,
      `**Offer:** ${offerSlug}`,
      `**Campaign:** ${campaignSlug}`,
      `**Generated:** ${new Date().toISOString()}`,
      ``,
      `> **INSTRUCTIONS:** Manual sending only — never automate LinkedIn.`,
      `> Wait 2-3 days after connecting before sending. Max 5-10 per day. Vary slightly — no copy-paste.`,
      ``,
      `---`,
      ``,
    ];
    linkedinVariants.forEach((variant, idx) => {
      linkedinMdLines.push(`## Variant ${idx + 1}`);
      linkedinMdLines.push(``);
      linkedinMdLines.push(variant.content);
      linkedinMdLines.push(``);
      linkedinMdLines.push(`---`);
      linkedinMdLines.push(``);
    });
    const linkedinMdPath = path.join(copyDir, 'linkedin-variants.md');
    fs.writeFileSync(linkedinMdPath, linkedinMdLines.join('\n'));
    console.log(`💾 Saved ${linkedinMdPath}`);

    // Save personalization notes
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
    const notesPath = path.join(copyDir, 'personalization-notes.md');
    fs.writeFileSync(notesPath, personalizationNotes);
    console.log(`💾 Saved ${notesPath}`);

    // Save to database
    const sb = getSupabaseClient();
    const { data: campaign, error: campaignError } = await sb
      .from('campaigns')
      .select('id')
      .eq('slug', campaignSlug)
      .single();

    if (!campaignError && campaign) {
      // Save email variants to database
      await Promise.all(
        emailVariants.map((variant, idx) =>
          sb.from('message_variants').insert({
            campaign_id: campaign.id,
            variant_name: `email-${idx + 1}`,
            channel: 'email',
            subject: variant.subject,
            body: variant.body,
          })
        )
      );

      console.log('\n✅ Saved to database');
    } else {
      console.error('❌ Failed to find campaign:', campaignError?.message);
    }

    console.log('\n========================================');
    console.log('✅ SKILL 3 COMPLETE');
    console.log('========================================');
    console.log(`\nCopy variants ready in: ${copyDir}`);
    console.log('📧 email-variants.md (3 variants)');
    console.log('💼 linkedin-variants.md (3 variants)');
    console.log('📝 personalization-notes.md');
    console.log(`\nResults folder created: ${resultsDir}`);
    console.log(`\nNext step: Run Skill 4 to find leads for this campaign`);
    console.log(`Command: npm run skill:4 -- ${offerSlug} ${campaignSlug}`);
  } catch (err) {
    console.error('❌ Error:', err);
    if (rl) {
      rl.close();
    }
    process.exit(1);
  }
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
