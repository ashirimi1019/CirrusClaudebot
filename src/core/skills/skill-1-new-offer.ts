/**
 * SKILL 1: NEW OFFER - POSITIONING CANVAS
 * Creates a complete offer positioning
 * Input: Offer name (interactive) OR config object (automated pipeline)
 * Output: offers/{slug}/positioning.md + database entry
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../../lib/supabase.ts';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface OfferConfig {
  name: string;
  category: string;
  targetCustomer: string;
  customerProblem: string;
  whyNow: string;
  customerAlternative: string;
  observableSuccess: string;
  valueProp: string;
  differentiators: string;
  salesModel: string;
  objectionHandlers: string;
  goToMarket: string;
  pricingPackaging: string;
  successStories: string;
}

interface PositioningInput extends OfferConfig {
  offerName: string;
  offerSlug: string;
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 100);
}

/**
 * Run Skill 1.
 * - If `config` is provided: runs silently using config values (pipeline mode)
 * - If no `config`: falls back to interactive CLI prompts
 * Returns the offer slug.
 */
export async function runSkill1NewOffer(config?: OfferConfig): Promise<string> {
  console.log('\n========================================');
  console.log('SKILL 1: NEW OFFER - POSITIONING CANVAS');
  console.log('========================================\n');

  let input: PositioningInput;

  if (config) {
    // ── AUTOMATED MODE ──
    console.log(`📋 Config mode: using "${config.name}"`);
    const offerSlug = generateSlug(config.name);
    input = { ...config, offerName: config.name, offerSlug };
  } else {
    // ── INTERACTIVE MODE ──
    const rl = createReadlineInterface();
    try {
      const offerName = await prompt(rl, 'Enter offer name (e.g., "Talent As A Service - US"): ');
      const offerSlug = generateSlug(offerName);
      console.log(`\n✅ Offer slug: ${offerSlug}`);
      console.log('\nWalk through the 13 sections of the positioning canvas.\n');

      input = {
        offerName,
        offerSlug,
        name: offerName,
        category: await prompt(rl, '1. CATEGORY - What type of service?: '),
        targetCustomer: await prompt(rl, '2. TARGET CUSTOMER - Who are we selling to? (Be specific): '),
        customerProblem: await prompt(rl, '3. CUSTOMER PROBLEM - What pain point makes them say yes?: '),
        whyNow: await prompt(rl, '4. WHY NOW - What makes them care today?: '),
        customerAlternative: await prompt(rl, '5. CUSTOMER ALTERNATIVE - What would they do instead?: '),
        observableSuccess: await prompt(rl, '6. OBSERVABLE SUCCESS - How would they measure success?: '),
        valueProp: await prompt(rl, '7. VALUE PROPOSITION - One-line pitch: '),
        differentiators: await prompt(rl, '8. KEY DIFFERENTIATORS - Why us, not them?: '),
        salesModel: await prompt(rl, '9. SALES MODEL - How do we work?: '),
        objectionHandlers: await prompt(rl, '10. OBJECTION HANDLERS - What will they ask?: '),
        goToMarket: await prompt(rl, '11. GO-TO-MARKET - How do we reach them?: '),
        pricingPackaging: await prompt(rl, '12. PRICING & PACKAGING - How do we price?: '),
        successStories: await prompt(rl, '13. SUCCESS STORIES / PROOF POINTS - Real examples?: '),
      };
      rl.close();
    } catch (err) {
      rl.close();
      throw err;
    }
  }

  // Create directory structure
  const offersDir = path.join(process.cwd(), 'offers', input.offerSlug);
  fs.mkdirSync(path.join(offersDir, 'campaigns'), { recursive: true });
  fs.mkdirSync(path.join(offersDir, 'leads'), { recursive: true });
  fs.mkdirSync(path.join(offersDir, 'results'), { recursive: true });

  // Write positioning.md
  const positioningPath = path.join(offersDir, 'positioning.md');
  fs.writeFileSync(positioningPath, generatePositioningMarkdown(input));
  console.log(`✅ Positioning saved: ${positioningPath}`);

  // Save to database
  const sb = getSupabaseClient();
  const { error } = await sb.from('offers').upsert(
    {
      name: input.offerName,
      slug: input.offerSlug,
      positioning: {
        category: input.category,
        targetCustomer: input.targetCustomer,
        customerProblem: input.customerProblem,
        whyNow: input.whyNow,
        customerAlternative: input.customerAlternative,
        observableSuccess: input.observableSuccess,
        valueProp: input.valueProp,
        differentiators: input.differentiators,
        salesModel: input.salesModel,
        objectionHandlers: input.objectionHandlers,
        goToMarket: input.goToMarket,
        pricingPackaging: input.pricingPackaging,
        successStories: input.successStories,
      },
    },
    { onConflict: 'slug' }
  );

  if (error) {
    console.warn(`⚠️ Database warning: ${error.message}`);
  } else {
    console.log('✅ Saved to database');
  }

  console.log('\n========================================');
  console.log('✅ SKILL 1 COMPLETE');
  console.log('========================================');
  console.log(`\nNext: npm run skill:2`);

  return input.offerSlug;
}

function generatePositioningMarkdown(input: PositioningInput): string {
  return `# Positioning Canvas - ${input.offerName}

Generated: ${new Date().toISOString()}

---

## 1. Category
${input.category}

---

## 2. Target Customer
${input.targetCustomer}

---

## 3. Customer Problem (Observable Trigger)
${input.customerProblem}

---

## 4. Why Now (Timeliness)
${input.whyNow}

---

## 5. Customer Alternative (What They'd Do Instead)
${input.customerAlternative}

---

## 6. Observable Success Signal
${input.observableSuccess}

---

## 7. Primary Value Proposition (One Line)
${input.valueProp}

---

## 8. Key Differentiators (Why Us, Not Them?)
${input.differentiators}

---

## 9. Sales Model (How We Work)
${input.salesModel}

---

## 10. Objection Handlers (What They'll Ask)
${input.objectionHandlers}

---

## 11. Go-to-Market Strategy (How We Tell Them)
${input.goToMarket}

---

## 12. Pricing & Packaging
${input.pricingPackaging}

---

## 13. Success Stories / Proof Points
${input.successStories}

---

## Ready for Next Steps

This positioning is now ready for:
- **Skill 2:** Design campaigns (different signals, different angles)
- **Skill 3:** Generate copy (email variants, LinkedIn variants)
- **Skill 4:** Find leads (search with ICP, find buyers)
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill1NewOffer();
}
