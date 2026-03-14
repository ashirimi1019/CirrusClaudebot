/**
 * SKILL 2: CAMPAIGN STRATEGY
 * Designs signal strategy for a campaign
 * Input: Offer slug + campaign config (automated pipeline) OR interactive CLI
 * Output: offers/{slug}/campaigns/{campaign}/strategy.md + database entry
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { SkillRunTracker } from '../../lib/services/run-tracker.ts';
import { validateSkillInputs } from '../../lib/services/validation.ts';
import { buildSkillContext } from '../../lib/verticals/index.ts';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CampaignConfig {
  name: string;
  signalType: string;
  signalHypothesis: string;
  detectionMethod: string;
  primaryAPI: string;
  secondaryAPIs: string;
  messagingFramework: string;
  targetGeography: string;
  companyFilters: string;
  buyerFilters: string;
  expectedVolume: string;
  expectedFit: string;
  vertical_id?: string;
}

interface CampaignStrategyInput extends CampaignConfig {
  offerSlug: string;
  campaignName: string;
  campaignSlug: string;
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 100);
}

async function readPositioning(offerSlug: string): Promise<string> {
  const positioningPath = path.join(process.cwd(), 'offers', offerSlug, 'positioning.md');
  if (!fs.existsSync(positioningPath)) {
    throw new Error(`Positioning not found. Run Skill 1 first for offer: ${offerSlug}`);
  }
  return fs.readFileSync(positioningPath, 'utf-8');
}

/**
 * Run Skill 2.
 * - If `offerSlug` + `config` are provided: runs silently (pipeline mode)
 * - If no `config`: falls back to interactive CLI prompts
 * Returns the campaign slug.
 */
export async function runSkill2CampaignStrategy(offerSlug?: string, config?: CampaignConfig): Promise<string> {
  const tracker = new SkillRunTracker('SKILL 2: CAMPAIGN STRATEGY');
  tracker.step('Validate inputs');
  tracker.step('Gather strategy input');
  tracker.step('Write strategy.md');
  tracker.step('Save to database');
  tracker.step('Load vertical context');

  let input: CampaignStrategyInput;

  // ─── Step 1: Validate ───
  tracker.startStep('Validate inputs');

  if (offerSlug && config) {
    // ── AUTOMATED MODE ──
    if (!config.name || config.name.trim() === '') {
      tracker.failStep('Validate inputs', 'config.name is required but was empty');
      tracker.printSummary();
      throw new Error('Skill 2: config.name is required. Provide a non-empty campaign name.');
    }
    const validation = validateSkillInputs({ offerSlug, requirePositioning: true });
    if (!validation.valid) {
      tracker.failStep('Validate inputs', validation.errors.join('; '));
      tracker.printSummary();
      throw new Error(`Skill 2 input validation failed:\n  ${validation.errors.join('\n  ')}`);
    }
    tracker.completeStep('Validate inputs', `offer="${offerSlug}"`);

    // ── Step 2: Gather input (config mode) ──
    tracker.startStep('Gather strategy input');
    console.log(`📋 Config mode: offer="${offerSlug}", campaign="${config.name}"`);
    const campaignSlug = generateSlug(config.name);
    input = { ...config, offerSlug, campaignName: config.name, campaignSlug };
    tracker.completeStep('Gather strategy input', `campaign="${campaignSlug}"`);
  } else {
    tracker.completeStep('Validate inputs', 'Interactive mode — will validate after prompt');

    // ── INTERACTIVE MODE ──
    tracker.startStep('Gather strategy input');
    const rl = createReadlineInterface();
    try {
      const resolvedOfferSlug = offerSlug || await prompt(rl, 'Enter offer slug: ');
      if (!resolvedOfferSlug) {
        rl.close();
        tracker.failStep('Gather strategy input', 'Offer slug cannot be empty');
        tracker.printSummary();
        throw new Error('Skill 2: Offer slug is required.');
      }

      // Validate positioning exists
      const validation = validateSkillInputs({ offerSlug: resolvedOfferSlug, requirePositioning: true });
      if (!validation.valid) {
        rl.close();
        tracker.failStep('Gather strategy input', validation.errors.join('; '));
        tracker.printSummary();
        throw new Error(`Skill 2 input validation failed:\n  ${validation.errors.join('\n  ')}`);
      }
      console.log('✅ Positioning loaded\n');

      const campaignName = await prompt(rl, 'Campaign name (e.g., "Hiring Data Engineers - Q1"): ');
      if (!campaignName) {
        rl.close();
        tracker.failStep('Gather strategy input', 'Campaign name cannot be empty');
        tracker.printSummary();
        throw new Error('Skill 2: Campaign name is required.');
      }
      const campaignSlug = generateSlug(campaignName);
      console.log(`\n✅ Campaign slug: ${campaignSlug}`);
      console.log('\nLet\'s design your signal strategy.\n');

      input = {
        offerSlug: resolvedOfferSlug,
        campaignName,
        campaignSlug,
        name: campaignName,
        signalType: await prompt(rl, '1. What signal are we targeting? (e.g., "Active job posting"): '),
        signalHypothesis: await prompt(rl, '2. Signal hypothesis (e.g., "Companies hiring for Data Engineers"): '),
        detectionMethod: await prompt(rl, '3. How to detect this? (e.g., "Apollo.io company search with hiring keywords"): '),
        primaryAPI: await prompt(rl, '4. Primary API (e.g., "Apollo.io"): '),
        secondaryAPIs: await prompt(rl, '5. Secondary APIs if needed (e.g., "Apollo.io enrichment (built-in)"): '),
        messagingFramework: await prompt(rl, '6. Messaging framework - PVP or Use-Case-Driven?: '),
        targetGeography: await prompt(rl, '7. Target geography (e.g., "US, Brazil, Mexico"): '),
        companyFilters: await prompt(rl, '8. Company filters (e.g., "Series A+, 50-1000 employees"): '),
        buyerFilters: await prompt(rl, '9. Buyer filters (e.g., "CTO, VP Engineering, Founder"): '),
        expectedVolume: await prompt(rl, '10. Expected volume (e.g., "20-30 companies per search"): '),
        expectedFit: await prompt(rl, '11. Expected fit % (e.g., "60% will match ICP"): '),
      };
      rl.close();
      tracker.completeStep('Gather strategy input', `campaign="${input.campaignSlug}"`);
    } catch (err) {
      rl.close();
      throw err;
    }
  }

  // ─── Step 3: Write strategy file ───
  tracker.startStep('Write strategy.md');
  const campaignDir = path.join(process.cwd(), 'offers', input.offerSlug, 'campaigns', input.campaignSlug);
  fs.mkdirSync(path.join(campaignDir, 'copy'), { recursive: true });

  const strategyPath = path.join(campaignDir, 'strategy.md');
  fs.writeFileSync(strategyPath, generateStrategyMarkdown(input));
  tracker.completeStep('Write strategy.md', strategyPath);

  // ─── Step 4: Save to database ───
  tracker.startStep('Save to database');
  const sb = getSupabaseClient();
  const { data: offer, error: offerLookupErr } = await sb
    .from('offers')
    .select('id')
    .eq('slug', input.offerSlug)
    .single();

  if (offerLookupErr || !offer) {
    tracker.partialStep('Save to database', `Offer "${input.offerSlug}" not found in DB (${offerLookupErr?.message || 'no row'}). Strategy file saved, but no DB record.`);
    tracker.warn('Run Skill 1 first if this offer has not been saved to the database.');
  } else {
    const { error } = await sb.from('campaigns').upsert(
      {
        offer_id: offer.id,
        name: input.campaignName,
        slug: input.campaignSlug,
        strategy: {
          signal_type: input.signalType,
          signal_hypothesis: input.signalHypothesis,
          primary_api: input.primaryAPI,
          messaging_framework: input.messagingFramework,
        },
        vertical_id: config?.vertical_id || null,
      },
      { onConflict: 'offer_id,slug' }
    );
    if (error) {
      tracker.partialStep('Save to database', `DB upsert warning: ${error.message}`);
    } else {
      tracker.completeStep('Save to database', 'Upserted campaign record');
    }
  }

  // ─── Step 5: Load vertical context (if configured) ───
  tracker.startStep('Load vertical context');
  try {
    // Look up offer + campaign IDs for vertical resolution
    const { data: offerRow } = await sb
      .from('offers')
      .select('id')
      .eq('slug', input.offerSlug)
      .single();

    if (offerRow?.id) {
      const { data: campaignRow } = await sb
        .from('campaigns')
        .select('id')
        .eq('offer_id', offerRow.id)
        .eq('slug', input.campaignSlug)
        .single();

      const verticalCtx = await buildSkillContext('skill-2', offerRow.id, campaignRow?.id);
      if (verticalCtx.effectiveVertical) {
        // Append vertical context to the strategy file
        const existingContent = fs.readFileSync(strategyPath, 'utf-8');
        fs.writeFileSync(strategyPath, existingContent + '\n' + verticalCtx.context);
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

  tracker.printSummary();
  console.log(`Next: npm run skill:3 -- ${input.offerSlug} ${input.campaignSlug}`);

  return input.campaignSlug;
}

function generateStrategyMarkdown(input: CampaignStrategyInput): string {
  return `# Campaign Strategy - ${input.campaignName}

**Offer:** ${input.offerSlug}
**Campaign:** ${input.campaignSlug}
**Generated:** ${new Date().toISOString()}

---

## Signal Strategy

### 1. Signal Type
${input.signalType}

### 2. Signal Hypothesis
${input.signalHypothesis}

### 3. How We Detect It
${input.detectionMethod}

### 4. Primary API
${input.primaryAPI}

### 5. Secondary APIs (If Needed)
${input.secondaryAPIs}

---

## Targeting

### 6. Messaging Framework
${input.messagingFramework}

### 7. Target Geography
${input.targetGeography}

### 8. Company Filters
${input.companyFilters}

### 9. Buyer Filters
${input.buyerFilters}

---

## Expectations

### 10. Expected Volume
${input.expectedVolume}

### 11. Expected Fit %
${input.expectedFit}

---

## API Routing

Based on signal type \`${input.signalType}\`, Skill 4 will:

1. Call \`${input.primaryAPI}\` to find companies with this signal
2. Use \`${input.secondaryAPIs}\` for enrichment and buyer discovery
3. Score results against offer ICP
4. Only enrich high-scoring companies (cost optimization)
5. Find buyers matching \`${input.buyerFilters}\`

---

## Strategy Review Checklist

- [ ] Signal is observable (API can detect it)
- [ ] Signal is relevant (correlates to buying intent)
- [ ] Messaging angle is clear
- [ ] Geographic scope defined
- [ ] Expected volume realistic
- [ ] ICP fit scoring will work
- [ ] Budget approval (expect to spend $X on Skill 4)
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill2CampaignStrategy();
}
