/**
 * SKILL 4: FIND LEADS (Apollo.io)
 * Finds companies with hiring signals and their decision-makers via Apollo
 * Input: Offer slug + Campaign slug
 * Output: all_leads.csv with company + contact data
 * ⚠️  WARNING: This skill uses Apollo API credits!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  searchCompaniesByHiringRoles,
  searchDecisionMakers,
  type ApolloCompany,
  type ApolloPerson,
} from '../../lib/clients/apollo.ts';
import { upsertCompany } from '../../lib/db/companies.ts';
import { insertEvidence } from '../../lib/db/evidence.ts';
import { upsertContact } from '../../lib/db/contacts.ts';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ICP buyer titles (from icp-framework.md)
const ICP_TITLES = [
  'CTO',
  'VP of Engineering',
  'VP Engineering',
  'Director of Engineering',
  'Head of Engineering',
  'Founder',
  'Co-Founder',
  'CIO',
];

// Default employee ranges matching ICP (50-5000)
const ICP_EMPLOYEE_RANGES = ['51,200', '201,500', '501,1000', '1001,5000'];

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(filePath, 'utf-8');
}

// Parse strategy.md to extract roles and geography
function parseStrategy(strategy: string): { roles: string[]; geography: string[] } {
  // Try to extract roles from the signal hypothesis section
  const hypothesisMatch = strategy.match(/Signal Hypothesis\s*\n+([^\n#]+)/);
  const geoMatch = strategy.match(/Target Geography\s*\n+([^\n#]+)/);

  // Default engineering roles aligned with the campaign
  const defaultRoles = [
    'Data Engineer',
    'Machine Learning Engineer',
    'Backend Engineer',
    'Software Engineer',
    'Cloud Engineer',
    'DevOps Engineer',
    'Platform Engineer',
    'AI Engineer',
    'Data Scientist',
    'Full Stack Engineer',
  ];

  const geography = geoMatch
    ? geoMatch[1].split(',').map((g) => g.trim()).filter(Boolean)
    : ['United States'];

  return { roles: defaultRoles, geography };
}

// ICP scoring (from icp-framework.md)
function scoreCompanyAgainstICP(company: ApolloCompany): number {
  let score = 0;

  // Active hiring signal (already detected by search) = 100 pts
  score += 100;

  // Company size
  const size = company.employee_count || company.estimated_num_employees || 0;
  if (size >= 50 && size <= 1000) score += 50;
  else if (size > 1000 && size <= 5000) score += 30;

  // Funding stage
  if (company.funding_stage && company.funding_stage !== 'unfunded') score += 30;

  // Tech keywords (cloud, data, engineering)
  const techKeywords = ['aws', 'cloud', 'data', 'machine learning', 'saas', 'api', 'platform'];
  const companyKeywords = (company.keywords || []).join(' ').toLowerCase();
  if (techKeywords.some((k) => companyKeywords.includes(k))) score += 20;

  return score;
}

export async function runSkill4FindLeads(): Promise<void> {
  console.log('\n========================================');
  console.log('SKILL 4: FIND LEADS (via Apollo.io)');
  console.log('⚠️  WARNING: This skill uses Apollo API credits!');
  console.log('========================================\n');

  let offerSlug: string;
  let campaignSlug: string;
  let rl: readline.Interface | null = null;

  if (process.argv[2] && process.argv[3]) {
    offerSlug = process.argv[2];
    campaignSlug = process.argv[3];
    console.log(`✅ Using command line arguments:`);
    console.log(`  Offer: ${offerSlug}`);
    console.log(`  Campaign: ${campaignSlug}\n`);
  } else {
    rl = createReadlineInterface();
    offerSlug = await prompt(rl, 'Enter offer slug: ');
    campaignSlug = await prompt(rl, 'Enter campaign slug: ');
    const confirm = await prompt(rl, 'This will use Apollo API credits. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      rl.close();
      return;
    }
    rl.close();
  }

  try {
    // Read strategy
    const strategyPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'strategy.md');
    const strategy = readFile(strategyPath);
    const { roles, geography } = parseStrategy(strategy);

    console.log('📍 Parsed from strategy:');
    console.log(`  Roles: ${roles.slice(0, 3).join(', ')}... (+${roles.length - 3} more)`);
    console.log(`  Geography: ${geography.join(', ')}\n`);

    // Create leads directory
    const leadsDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'leads');
    fs.mkdirSync(leadsDir, { recursive: true });

    // ─── STEP 1: Find companies with hiring signals via Apollo ───
    console.log('🔍 Searching Apollo for companies hiring engineering talent...\n');

    // Search in batches of roles (Apollo keyword search)
    const allCompanies: ApolloCompany[] = [];
    const seenIds = new Set<string>();

    // Split into batches of 3 roles for more targeted searches
    const ROLE_BATCH_SIZE = 3;
    for (let i = 0; i < roles.length; i += ROLE_BATCH_SIZE) {
      const roleBatch = roles.slice(i, i + ROLE_BATCH_SIZE);
      try {
        const companies = await searchCompaniesByHiringRoles(
          roleBatch,
          geography,
          ICP_EMPLOYEE_RANGES,
          25
        );
        for (const c of companies) {
          if (!seenIds.has(c.id)) {
            seenIds.add(c.id);
            allCompanies.push(c);
          }
        }
      } catch (err: any) {
        console.warn(`  ⚠️ Search failed for [${roleBatch.join(', ')}]: ${err.message}`);
      }
    }

    console.log(`\n✅ Total unique companies found: ${allCompanies.length}`);

    if (allCompanies.length === 0) {
      console.log('\n⚠️  No companies found. Check your APOLLO_API_KEY and account plan.');
      return;
    }

    // ─── STEP 2: Score + filter against ICP ───
    console.log('\n📊 Scoring companies against ICP (threshold: 170 pts)...');
    const qualifyingCompanies = allCompanies.filter((c) => {
      const score = scoreCompanyAgainstICP(c);
      return score >= 170;
    });

    console.log(`✅ ${qualifyingCompanies.length} / ${allCompanies.length} companies qualify (score ≥ 170)`);

    // ─── STEP 3: Find decision-makers + store in DB ───
    console.log('\n👥 Finding decision-makers at qualifying companies...\n');

    const companiesOutput: any[] = [];
    const contactsOutput: any[] = [];

    for (const company of qualifyingCompanies) {
      const score = scoreCompanyAgainstICP(company);
      const domain = company.website_url
        ? company.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
        : `${company.name.toLowerCase().replace(/\s+/g, '')}.com`;

      console.log(`📝 ${company.name} (score: ${score}, ~${company.employee_count || '?'} employees)`);

      // Upsert company to DB
      let dbCompany;
      try {
        dbCompany = await upsertCompany({
          domain,
          name: company.name,
          size_min: company.employee_count || null,
          size_max: null,
          funding_stage: company.funding_stage || null,
          country: company.country || geography[0] || 'US',
        });
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to upsert company: ${err.message}`);
        continue;
      }

      // Insert evidence (hiring signal)
      try {
        await insertEvidence({
          company_id: dbCompany.id,
          type: 'job_post',
          title: `Hiring engineering talent (detected via Apollo)`,
          raw_json: { apollo_id: company.id, keywords: company.keywords },
          source: 'apollo',
          posted_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to insert evidence: ${err.message}`);
      }

      companiesOutput.push({
        id: dbCompany.id,
        apollo_id: company.id,
        domain,
        name: company.name,
        hiring_signal: `Hiring engineering talent`,
        fit_score: score,
        employee_count: company.employee_count,
        industry: company.industry,
      });

      // Find decision-makers
      let people: ApolloPerson[] = [];
      try {
        people = await searchDecisionMakers([company.id], ICP_TITLES, 5);
        console.log(`  → Found ${people.length} decision-makers`);
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to find decision-makers: ${err.message}`);
      }

      // Store buyers + build contacts list
      for (const person of people) {
        if (!person.email) continue;

        const email = person.email.toLowerCase().trim();

        try {
          const buyer = await upsertContact({
            company_id: dbCompany.id,
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title || '',
            email,
            linkedin_url: person.linkedin_url || null,
            apollo_contact_id: person.id || null,
            enriched_at: new Date().toISOString(),
          });

          contactsOutput.push({
            id: buyer.id,
            company_id: dbCompany.id,
            company_name: company.name,
            company_domain: domain,
            hiring_signal: `Hiring engineering talent`,
            fit_score: score,
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title || '',
            email,
            linkedin_url: person.linkedin_url || '',
          });
        } catch (err: any) {
          console.warn(`  ⚠️ Failed to upsert buyer ${email}: ${err.message}`);
        }
      }
    }

    // ─── STEP 4: Write all_leads.csv ───
    console.log('\n💾 Writing all_leads.csv...');

    const header = 'company_name,company_domain,hiring_signal,fit_score,first_name,last_name,title,email,linkedin_url';

    const rows = contactsOutput.map((c) =>
      `"${c.company_name}","${c.company_domain}","${c.hiring_signal}","${c.fit_score}","${c.first_name}","${c.last_name}","${c.title}","${c.email}","${c.linkedin_url}"`
    );

    // Also add companies without contacts (for reference)
    const companyIdsWithContacts = new Set(contactsOutput.map((c) => c.company_id));
    for (const co of companiesOutput) {
      if (!companyIdsWithContacts.has(co.id)) {
        rows.push(`"${co.name}","${co.domain}","${co.hiring_signal}","${co.fit_score}","","","","",""`);
      }
    }

    const csv = [header, ...rows].join('\n');
    const allLeadsPath = path.join(leadsDir, 'all_leads.csv');
    fs.writeFileSync(allLeadsPath, csv);

    console.log('\n========================================');
    console.log('✅ SKILL 4 COMPLETE');
    console.log('========================================');
    console.log(`\nResults:`);
    console.log(`  Companies found:        ${allCompanies.length}`);
    console.log(`  Qualifying (ICP ≥ 170): ${qualifyingCompanies.length}`);
    console.log(`  Decision-makers found:  ${contactsOutput.length}`);
    console.log(`\nOutput: ${allLeadsPath}`);
    console.log(`\nNext step: npm run skill:5 -- ${offerSlug} ${campaignSlug}`);
  } catch (err: any) {
    console.error('❌ Error:', err.message || err);
    if (rl) rl.close();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill4FindLeads();
}
