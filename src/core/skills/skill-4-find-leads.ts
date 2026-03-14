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
import { scoreCompany, ICP_THRESHOLD } from '../../lib/services/scoring.ts';
import {
  resolveGeography,
  buildApolloLocationFilter,
  checkCompanyGeography,
  buildGeographyRejectionMessage,
  buildGeographySummary,
  type GeographyConfig,
  type GeographyRejection,
} from '../../lib/services/geography.ts';
import { objectsToCsv } from '../../lib/services/csv-export.ts';
import { SkillRunTracker } from '../../lib/services/run-tracker.ts';
import { validateSkillInputs } from '../../lib/services/validation.ts';
import { buildSkillContext } from '../../lib/verticals/index.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';
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

// NOTE: ICP scoring moved to shared service at src/lib/services/scoring.ts
// Uses scoreCompany(company) which returns { total, qualifies, ... }

export async function runSkill4FindLeads(): Promise<void> {
  const tracker = new SkillRunTracker('SKILL 4: FIND LEADS (via Apollo.io)');
  tracker.step('Validate inputs');
  tracker.step('Load vertical context');
  tracker.step('Search companies (Apollo)');
  tracker.step('Score against ICP');
  tracker.step('Find decision-makers');
  tracker.step('Store in database');
  tracker.step('Write all_leads.csv');

  let offerSlug: string;
  let campaignSlug: string;
  let rl: readline.Interface | null = null;

  if (process.argv[2] && process.argv[3]) {
    offerSlug = process.argv[2];
    campaignSlug = process.argv[3];
    console.log(`  Offer: ${offerSlug}`);
    console.log(`  Campaign: ${campaignSlug}`);
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
    rl = null;
  }

  // ─── Step 1: Validate inputs ───
  tracker.startStep('Validate inputs');
  const validation = validateSkillInputs({
    offerSlug,
    campaignSlug,
    requireStrategy: true,
  });
  if (!validation.valid) {
    tracker.failStep('Validate inputs', validation.errors.join('; '));
    tracker.printSummary();
    throw new Error(`Skill 4 input validation failed:\n  ${validation.errors.join('\n  ')}`);
  }

  const strategyPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'strategy.md');
  const strategy = readFile(strategyPath);
  const { roles } = parseStrategy(strategy);
  tracker.completeStep('Validate inputs', `${roles.length} roles`);

  // ─── Step 1b: Load vertical context (if configured) ───
  tracker.startStep('Load vertical context');
  let verticalContext = '';
  let geographyConfig: GeographyConfig = resolveGeography(null);
  try {
    const sb = getSupabaseClient();
    const { data: offerRow } = await sb
      .from('offers')
      .select('id, allowed_countries, allowed_us_states')
      .eq('slug', offerSlug)
      .single();

    if (offerRow?.id) {
      const { data: campaignRow } = await sb
        .from('campaigns')
        .select('id, allowed_countries, allowed_us_states')
        .eq('offer_id', offerRow.id)
        .eq('slug', campaignSlug)
        .single();

      geographyConfig = resolveGeography(offerRow, campaignRow ?? null);

      const verticalCtx = await buildSkillContext('skill-4', offerRow.id, campaignRow?.id);
      if (verticalCtx.effectiveVertical) {
        verticalContext = verticalCtx.context;
        tracker.completeStep(
          'Load vertical context',
          `vertical="${verticalCtx.effectiveVerticalName}", sections=[${verticalCtx.loadedSections.join(', ')}]`
        );
      } else {
        tracker.completeStep('Load vertical context', 'No vertical configured — using base ICP/scoring');
      }
    } else {
      tracker.completeStep('Load vertical context', 'Skipped — offer not found in DB');
    }
  } catch (err) {
    tracker.partialStep(
      'Load vertical context',
      `Warning: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Create leads directory
  const leadsDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'leads');
  fs.mkdirSync(leadsDir, { recursive: true });

  // ─── Step 2: Search companies via Apollo ───
  tracker.startStep('Search companies (Apollo)');

  const allCompanies: ApolloCompany[] = [];
  const seenIds = new Set<string>();
  let searchFailures = 0;

  const ROLE_BATCH_SIZE = 3;
  for (let i = 0; i < roles.length; i += ROLE_BATCH_SIZE) {
    const roleBatch = roles.slice(i, i + ROLE_BATCH_SIZE);
    try {
      const companies = await searchCompaniesByHiringRoles(roleBatch, buildApolloLocationFilter(geographyConfig), ICP_EMPLOYEE_RANGES, 25);
      for (const c of companies) {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          allCompanies.push(c);
        }
      }
    } catch (err: any) {
      searchFailures++;
      tracker.warn(`Search failed for [${roleBatch.join(', ')}]: ${err.message}`);
    }
  }

  if (allCompanies.length === 0) {
    tracker.failStep('Search companies (Apollo)', `0 companies found (${searchFailures} search failures). Check APOLLO_API_KEY and account plan.`);
    tracker.printSummary();
    return;
  }
  if (searchFailures > 0) {
    tracker.partialStep('Search companies (Apollo)', `${allCompanies.length} unique companies, ${searchFailures} batch failures`, allCompanies.length);
  } else {
    tracker.completeStep('Search companies (Apollo)', `${allCompanies.length} unique companies`, allCompanies.length);
  }

  // ─── Step 3: Score against ICP (using shared scoring service) ───
  tracker.startStep('Score against ICP');
  const qualifyingCompanies = allCompanies.filter((c) => {
    const score = scoreCompany(c);
    return score.qualifies;
  });

  if (qualifyingCompanies.length === 0) {
    tracker.warn(`0/${allCompanies.length} companies met ICP threshold (${ICP_THRESHOLD}). Consider relaxing filters.`);
    tracker.partialStep('Score against ICP', `0/${allCompanies.length} qualify — threshold may be too strict`, 0);
  } else {
    tracker.completeStep('Score against ICP', `${qualifyingCompanies.length}/${allCompanies.length} qualify (≥${ICP_THRESHOLD})`, qualifyingCompanies.length);
  }

  // ─── Step 3b: Post-query geography rejection ───
  const geoRejections: GeographyRejection[] = [];
  const geoAcceptedCompanies = qualifyingCompanies.filter((company) => {
    const primaryDomain = (company as any).primary_domain;
    const domain = primaryDomain
      ? primaryDomain
      : company.website_url
        ? company.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
        : `${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
    const rejection = checkCompanyGeography(
      { name: company.name, domain, country: company.country, state: (company as any).state },
      geographyConfig,
    );
    if (rejection) {
      geoRejections.push(rejection);
      tracker.warn(buildGeographyRejectionMessage(rejection));
      return false;
    }
    return true;
  });
  console.log(buildGeographySummary(qualifyingCompanies.length, geoAcceptedCompanies.length, geoRejections, geographyConfig));

  // ─── Step 4: Find decision-makers + Step 5: Store in DB ───
  tracker.startStep('Find decision-makers');
  tracker.startStep('Store in database');

  const companiesOutput: any[] = [];
  const contactsOutput: any[] = [];
  let dbCompanyFails = 0;
  let dbContactFails = 0;
  let dmSearchFails = 0;

  for (const company of geoAcceptedCompanies) {
    const score = scoreCompany(company);
    const primaryDomain = (company as any).primary_domain;
    const domain = primaryDomain
      ? primaryDomain
      : company.website_url
        ? company.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
        : `${company.name.toLowerCase().replace(/\s+/g, '')}.com`;

    console.log(`  📝 ${company.name} (score: ${score.total}, ~${company.employee_count || '?'} employees)`);

    // Upsert company to DB
    let dbCompany;
    try {
      dbCompany = await upsertCompany({
        domain,
        name: company.name,
        employee_count: company.employee_count || null,
        funding_stage: company.funding_stage || null,
        industry: company.industry || null,
        country: company.country || 'Unknown',
        fit_score: score.total,
      });
    } catch (err: any) {
      dbCompanyFails++;
      tracker.warn(`Failed to upsert company "${company.name}": ${err.message}`);
      continue;
    }

    // Insert evidence (hiring signal) — non-fatal
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
      tracker.warn(`Failed to insert evidence for "${company.name}": ${err.message}`);
    }

    companiesOutput.push({
      id: dbCompany.id, apollo_id: company.id, domain, name: company.name,
      hiring_signal: `Hiring engineering talent`, fit_score: score.total,
      employee_count: company.employee_count, industry: company.industry,
    });

    // Find decision-makers
    let people: ApolloPerson[] = [];
    try {
      people = await searchDecisionMakers([company.id], ICP_TITLES, 5);
      console.log(`    → Found ${people.length} decision-makers`);
    } catch (err: any) {
      dmSearchFails++;
      tracker.warn(`Failed to find decision-makers at "${company.name}": ${err.message}`);
    }

    // Store contacts
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
          id: buyer.id, company_id: dbCompany.id, company_name: company.name,
          company_domain: domain, hiring_signal: `Hiring engineering talent`,
          fit_score: score.total, first_name: person.first_name, last_name: person.last_name,
          title: person.title || '', email, linkedin_url: person.linkedin_url || '',
        });
      } catch (err: any) {
        dbContactFails++;
        tracker.warn(`Failed to upsert contact ${email}: ${err.message}`);
      }
    }
  }

  // Complete decision-makers step
  if (dmSearchFails > 0 && contactsOutput.length > 0) {
    tracker.partialStep('Find decision-makers', `${contactsOutput.length} contacts found, ${dmSearchFails} company lookups failed`, contactsOutput.length);
  } else if (contactsOutput.length === 0 && qualifyingCompanies.length > 0) {
    tracker.partialStep('Find decision-makers', `0 contacts found across ${qualifyingCompanies.length} qualifying companies`, 0);
  } else {
    tracker.completeStep('Find decision-makers', `${contactsOutput.length} contacts`, contactsOutput.length);
  }

  // Complete DB step
  if (dbCompanyFails > 0 || dbContactFails > 0) {
    tracker.partialStep('Store in database', `${companiesOutput.length} companies, ${contactsOutput.length} contacts stored (${dbCompanyFails} company + ${dbContactFails} contact failures)`);
  } else {
    tracker.completeStep('Store in database', `${companiesOutput.length} companies + ${contactsOutput.length} contacts`);
  }

  // ─── Step 6: Write all_leads.csv ───
  tracker.startStep('Write all_leads.csv');

  const allLeadObjects: Record<string, unknown>[] = contactsOutput.map((c) => ({
    company_name: c.company_name,
    company_domain: c.company_domain,
    hiring_signal: c.hiring_signal,
    fit_score: c.fit_score,
    first_name: c.first_name,
    last_name: c.last_name,
    title: c.title,
    email: c.email,
    linkedin_url: c.linkedin_url,
  }));

  // Add companies without contacts (for reference)
  const companyIdsWithContacts = new Set(contactsOutput.map((c) => c.company_id));
  let companiesWithoutContacts = 0;
  for (const co of companiesOutput) {
    if (!companyIdsWithContacts.has(co.id)) {
      allLeadObjects.push({
        company_name: co.name,
        company_domain: co.domain,
        hiring_signal: co.hiring_signal,
        fit_score: co.fit_score,
        first_name: '',
        last_name: '',
        title: '',
        email: '',
        linkedin_url: '',
      });
      companiesWithoutContacts++;
    }
  }

  if (companiesWithoutContacts > 0) {
    tracker.warn(`${companiesWithoutContacts} qualifying companies had no decision-makers found — included in CSV without contact data.`);
  }

  const rows = allLeadObjects;
  const csv = objectsToCsv(allLeadObjects);
  const allLeadsPath = path.join(leadsDir, 'all_leads.csv');
  fs.writeFileSync(allLeadsPath, csv);

  // If vertical context was loaded, write it as reference alongside leads
  if (verticalContext) {
    const verticalRefPath = path.join(leadsDir, 'vertical-context.md');
    fs.writeFileSync(verticalRefPath, verticalContext);
  }

  tracker.completeStep('Write all_leads.csv', `${rows.length} rows → ${allLeadsPath}`, rows.length);

  tracker.printSummary();
  console.log(`Next: npm run skill:5 -- ${offerSlug} ${campaignSlug}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSkill4FindLeads();
}
