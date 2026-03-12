/**
 * Apollo.io API Client
 * Replaces: theirstack.ts (hiring signals), parallel.ts (decision-makers), instantly.ts (sequences)
 *
 * Covers:
 *  - Company search with hiring filters (Skill 4)
 *  - People/decision-maker search (Skill 4)
 *  - Contact creation + sequence enrollment (Skill 5)
 *  - Sequence metrics + replies (Skill 6)
 */

import axios from 'axios';
import { getSupabaseClient } from '../supabase.ts';
import { withRetry, isTransientError } from '../services/retry.ts';

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error('APOLLO_API_KEY is not set in environment variables');
  return key;
}

function apolloClient() {
  return axios.create({
    baseURL: APOLLO_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': getApiKey(),
    },
    timeout: 30000,
  });
}

async function logApiCall(tool_name: string, estimated_cost: number, request_payload: any, response_data: any) {
  try {
    const sb = getSupabaseClient();
    await sb.from('tool_usage').insert({
      tool_name,
      action_name: tool_name,
      units_used: 1,
      estimated_cost,
      metadata_json: { request: request_payload, response: response_data },
    });
  } catch {
    // Non-fatal: log silently
  }
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ApolloCompany {
  id: string;
  name: string;
  website_url: string | null;
  linkedin_url: string | null;
  employee_count: number | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  funding_stage: string | null;
  estimated_num_employees: number | null;
  keywords: string[];
  primary_domain?: string | null;
  revenue?: number | null;
  founded_year?: number | null;
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string | null;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  organization_id: string | null;
  organization_name: string | null;
}

export interface ApolloSequence {
  id: string;
  name: string;
  active: boolean;
  num_steps: number;
  num_contacts: number;
  created_at: string;
}

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  organization_name: string | null;
}

export interface SequenceMetrics {
  id: string;
  name: string;
  contacts_count: number;
  emails_sent: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

export interface ApolloReply {
  id: string;
  contact_name: string;
  contact_email: string;
  body_text: string;
  created_at: string;
  sentiment: string | null;
}

export interface EmailAccount {
  id: string;
  email: string;
  active: boolean;
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  email?: string;
  title?: string;
  organization_name?: string;
  website_url?: string;
}

// ─────────────────────────────────────────────
// SKILL 4: HIRING SIGNAL DETECTION
// Replaces TheirStack
// ─────────────────────────────────────────────

/**
 * Search for companies that are actively hiring for given roles.
 * Uses Apollo's mixed_companies/search with keyword + employee filters.
 */
export async function searchCompaniesByHiringRoles(
  roles: string[],
  locations: string[] = ['United States'],
  employeeRanges: string[] = ['11,50', '51,200', '201,500', '501,1000', '1001,5000'],
  perPage: number = 25
): Promise<ApolloCompany[]> {
  // Input validation
  if (!roles || roles.length === 0) {
    console.warn('  ⚠️ searchCompaniesByHiringRoles called with empty roles array — returning []');
    return [];
  }

  const client = apolloClient();

  // Use job title search to find companies actively hiring these roles
  const payload: Record<string, any> = {
    q_organization_job_titles: roles,
    organization_num_employees_ranges: employeeRanges,
    page: 1,
    per_page: perPage,
  };

  // Add location filter if provided
  if (locations.length > 0) {
    payload.organization_locations = locations;
  }

  console.log(`  → Apollo company search: roles=[${roles.join(', ')}]`);

  const response = await withRetry(
    () => client.post('/mixed_companies/search', payload),
    { label: 'apollo_company_search', maxAttempts: 3 }
  );
  const data = response.data;

  await logApiCall('apollo_company_search', 0.01, payload, { count: data.organizations?.length });

  const raw = data.organizations || [];
  if (raw.length === 0) {
    console.warn(`  ⚠️ Apollo returned 0 companies for roles=[${roles.join(', ')}]`);
    return [];
  }

  const companies: ApolloCompany[] = raw.map((org: any) => ({
    id: org.id,
    name: org.name,
    website_url: org.website_url || org.primary_domain ? `http://${org.primary_domain}` : null,
    linkedin_url: org.linkedin_url || null,
    employee_count: org.estimated_num_employees || org.num_employees || null,
    industry: org.industry || org.sic_codes?.[0] || null,
    city: org.city || null,
    state: org.state || null,
    country: org.country || null,
    funding_stage: org.latest_funding_stage || (org.publicly_traded_symbol ? 'ipo' : null),
    estimated_num_employees: org.estimated_num_employees || null,
    keywords: org.keywords || org.sic_codes || [],
    // Extra fields from mixed_companies/search
    primary_domain: org.primary_domain || null,
    revenue: org.organization_revenue || null,
    founded_year: org.founded_year || null,
  }));

  console.log(`  ✅ Found ${companies.length} companies`);
  return companies;
}

// ─────────────────────────────────────────────
// SKILL 4: DECISION-MAKER DISCOVERY
// Replaces Hunter.io (parallel.ts)
// ─────────────────────────────────────────────

/**
 * Find decision-makers at specific companies by Apollo organization IDs.
 *
 * Uses 2-step flow:
 *  1. /mixed_people/api_search — discover people (returns IDs, first names, titles)
 *  2. /people/match — enrich each person (returns email, full name, linkedin)
 *
 * Note: /mixed_people/search was deprecated by Apollo in early 2026.
 */
export async function searchDecisionMakers(
  organizationIds: string[],
  titles: string[] = [
    'CTO',
    'VP of Engineering',
    'VP Engineering',
    'Director of Engineering',
    'Head of Engineering',
    'Founder',
    'Co-Founder',
    'CIO',
  ],
  perPage: number = 10
): Promise<ApolloPerson[]> {
  if (organizationIds.length === 0) return [];

  const client = apolloClient();

  // Step 1: Search for people (new endpoint — returns limited data)
  const searchPayload = {
    organization_ids: organizationIds,
    person_titles: titles,
    page: 1,
    per_page: perPage,
  };

  let candidates: any[] = [];
  const searchResponse = await withRetry(
    () => client.post('/mixed_people/api_search', searchPayload),
    { label: 'apollo_people_api_search', maxAttempts: 3 }
  );
  candidates = searchResponse.data.people || [];

  await logApiCall('apollo_people_api_search', 0.01, { org_count: organizationIds.length }, { count: candidates.length });

  if (candidates.length === 0) {
    console.warn(`  ⚠️ Apollo returned 0 people candidates for ${organizationIds.length} organization(s)`);
    return [];
  }

  // Step 2: Enrich each candidate to get email + full name + linkedin
  const enriched: ApolloPerson[] = [];
  let enrichFailures = 0;

  for (const candidate of candidates) {
    if (!candidate.id) continue;

    try {
      const enrichResp = await withRetry(
        () => client.post('/people/match', { id: candidate.id }),
        { label: `apollo_enrich_${candidate.first_name || 'unknown'}`, maxAttempts: 2, swallowOnExhaust: true }
      );
      if (!enrichResp) { enrichFailures++; continue; }

      const p = enrichResp.data.person;

      if (p) {
        enriched.push({
          id: p.id,
          first_name: p.first_name || candidate.first_name || '',
          last_name: p.last_name || '',
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          title: p.title || candidate.title || null,
          email: p.email || null,
          email_status: p.email_status || null,
          linkedin_url: p.linkedin_url || null,
          organization_id: p.organization_id || null,
          organization_name: p.organization?.name || p.organization_name || null,
        });

        await logApiCall('apollo_people_enrich', 0.03, { person_id: candidate.id }, { email: !!p.email });
      }
    } catch (err: any) {
      enrichFailures++;
      console.warn(`    ⚠️ Enrichment failed for ${candidate.first_name || 'unknown'}: ${err.response?.data?.error || err.message}`);
    }
  }

  if (enrichFailures > 0) {
    console.warn(`  ⚠️ ${enrichFailures}/${candidates.length} enrichment(s) failed — ${enriched.length} enriched successfully`);
  }

  return enriched;
}

// ─────────────────────────────────────────────
// SKILL 5: SEQUENCE MANAGEMENT
// Replaces Instantly
// ─────────────────────────────────────────────

/**
 * List all email sequences (campaigns) in Apollo.
 * Note: GET /emailer_campaigns is deprecated (404). Use POST /emailer_campaigns/search instead.
 */
export async function listSequences(): Promise<ApolloSequence[]> {
  const client = apolloClient();

  const response = await withRetry(
    () => client.post('/emailer_campaigns/search', { per_page: '50' }),
    { label: 'apollo_list_sequences', maxAttempts: 3 }
  );
  const data = response.data;
  const sequences = (data.emailer_campaigns || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    active: c.active !== false,
    num_steps: c.num_steps || c.emailer_steps_count || 0,
    num_contacts: c.num_contacts || c.contacts_count || 0,
    created_at: c.created_at,
  }));

  if (sequences.length === 0) {
    console.warn('  ⚠️ No sequences found in Apollo account');
  }
  return sequences;
}

/**
 * Search for an existing Apollo sequence by exact name match.
 * Returns the first matching sequence or null.
 */
export async function searchSequenceByName(name: string): Promise<ApolloSequence | null> {
  if (!name) return null;
  const client = apolloClient();

  try {
    const response = await withRetry(
      () => client.post('/emailer_campaigns/search', {
        q_name: name,
        per_page: '10',
      }),
      { label: 'apollo_search_sequence_by_name', maxAttempts: 2 }
    );

    const sequences = response.data.emailer_campaigns || [];
    // Apollo's q_name does partial matching — we need exact match
    const exact = sequences.find((c: any) => c.name === name);
    if (exact) {
      return {
        id: exact.id,
        name: exact.name,
        active: exact.active !== false,
        num_steps: exact.num_steps || exact.emailer_steps_count || 0,
        num_contacts: exact.num_contacts || exact.contacts_count || 0,
        created_at: exact.created_at,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a new email sequence in Apollo.
 */
export async function createSequence(name: string): Promise<ApolloSequence> {
  if (!name || name.trim() === '') {
    throw new Error('createSequence: sequence name is required');
  }
  const client = apolloClient();

  const response = await withRetry(
    () => client.post('/emailer_campaigns', { name, active: true }),
    { label: 'apollo_create_sequence', maxAttempts: 2 }
  );
  const c = response.data.emailer_campaign;
  if (!c?.id) {
    throw new Error('Apollo createSequence returned no campaign data — check API key permissions');
  }
  return {
    id: c.id,
    name: c.name,
    active: c.active,
    num_steps: 0,
    num_contacts: 0,
    created_at: c.created_at,
  };
}

/**
 * Add an email step to an existing sequence and populate the template.
 * dayOffset = 1 means wait 1 day, 3 = wait 3 days, etc.
 *
 * IMPORTANT: Apollo's POST /emailer_steps creates a blank template — it ignores
 * inline emailer_template content. We must follow up with PUT /emailer_templates/{id}
 * to populate the subject and body.
 */
export async function addEmailStepToSequence(
  sequenceId: string,
  subject: string,
  body: string,
  dayOffset: number = 1,
  position: number = 1
): Promise<{ stepId: string; touchId: string; templateId: string }> {
  if (!sequenceId) throw new Error('addEmailStepToSequence: sequenceId is required');
  if (!subject || !body) throw new Error('addEmailStepToSequence: subject and body are required');

  const client = apolloClient();

  // Step 1: Create the step (this also creates a blank touch + template)
  const stepRes = await withRetry(
    () => client.post('/emailer_steps', {
      emailer_campaign_id: sequenceId,
      position,
      wait_time: Math.max(dayOffset, 1),
      wait_mode: 'day',
      exact_datetime: null,
      type: 'auto_email',
    }),
    { label: `apollo_add_step_${position}`, maxAttempts: 2 }
  );

  const stepId = stepRes.data.emailer_step?.id;
  const touchId = stepRes.data.emailer_touch?.id;
  const templateId = stepRes.data.emailer_template?.id;

  if (!templateId) {
    console.warn(`  ⚠️ Step ${position} created but no template ID returned — template content will be blank`);
    return { stepId: stepId || '', touchId: touchId || '', templateId: '' };
  }

  // Step 2: Populate the template via PUT /emailer_templates/{id}
  await withRetry(
    () => client.put(`/emailer_templates/${templateId}`, {
      subject,
      body_html: body.replace(/\n/g, '<br>'),
      body_text: body,
    }),
    { label: `apollo_update_template_${position}`, maxAttempts: 2 }
  );

  return { stepId: stepId || '', touchId: touchId || '', templateId };
}

/**
 * Update an existing Apollo email template's subject + body.
 * Used to fix blank templates on existing sequence steps.
 */
export async function updateEmailTemplate(
  templateId: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!templateId) throw new Error('updateEmailTemplate: templateId is required');
  const client = apolloClient();

  await withRetry(
    () => client.put(`/emailer_templates/${templateId}`, {
      subject,
      body_html: body.replace(/\n/g, '<br>'),
      body_text: body,
    }),
    { label: `apollo_update_template_${templateId.substring(0, 8)}`, maxAttempts: 2 }
  );
}

/**
 * Get sequence details including steps, touches, and templates.
 * Returns the full sequence data needed to inspect/update templates.
 */
export async function getSequenceDetails(sequenceId: string): Promise<{
  steps: Array<{ id: string; position: number; wait_time: number }>;
  touches: Array<{ id: string; emailer_step_id: string; emailer_template_id: string; status: string }>;
  templates: Array<{ id: string; subject: string | null; body_html: string; body_text: string }>;
}> {
  const client = apolloClient();

  const res = await withRetry(
    () => client.get(`/emailer_campaigns/${sequenceId}`),
    { label: 'apollo_get_sequence_details', maxAttempts: 2 }
  );

  const data = res.data;
  return {
    steps: (data.emailer_steps || []).map((s: any) => ({
      id: s.id,
      position: s.position,
      wait_time: s.wait_time,
    })),
    touches: (data.emailer_touches || []).map((t: any) => ({
      id: t.id,
      emailer_step_id: t.emailer_step_id,
      emailer_template_id: t.emailer_template_id,
      status: t.status,
    })),
    templates: (data.emailer_templates || []).map((t: any) => ({
      id: t.id,
      subject: t.subject,
      body_html: t.body_html || '',
      body_text: t.body_text || '',
    })),
  };
}

/**
 * Bulk create contacts in Apollo CRM.
 * Returns array of created contacts with their Apollo IDs.
 */
export async function bulkCreateContacts(contacts: ContactInput[]): Promise<ApolloContact[]> {
  if (contacts.length === 0) return [];

  const client = apolloClient();

  // Apollo bulk create accepts up to 100 at a time
  const BATCH_SIZE = 100;
  const allCreated: ApolloContact[] = [];

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      const response = await withRetry(
        () => client.post('/contacts/bulk_create', {
          contacts: batch.map((c) => ({
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email || undefined,
            title: c.title || undefined,
            organization_name: c.organization_name || undefined,
            website_url: c.website_url || undefined,
          })),
        }),
        { label: `apollo_bulk_create_batch_${batchNum}`, maxAttempts: 2 }
      );

      const data = response.data;
      // Bulk create returns { created_contacts: [...], existing_contacts: [...] }
      const rawContacts = [
        ...(data.created_contacts || []),
        ...(data.existing_contacts || []),
        ...(data.contacts || []),  // fallback
      ];
      const created: ApolloContact[] = rawContacts.map((c: any) => ({
        id: c.id,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        email: c.email || null,
        title: c.title || null,
        organization_name: c.organization_name || null,
      }));

      allCreated.push(...created);
      console.log(`  ✅ Created ${created.length} contacts (batch ${batchNum})`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      console.warn(`  ⚠️ Batch ${batchNum} contact create failed after retries: ${msg}`);
    }
  }

  return allCreated;
}

/**
 * Add contacts to an Apollo sequence for automated email sending.
 */
export async function addContactsToSequence(
  contactIds: string[],
  sequenceId: string,
  emailAccountId?: string
): Promise<{ enrolled: number; failed: number }> {
  if (contactIds.length === 0) return { enrolled: 0, failed: 0 };
  if (!sequenceId) throw new Error('addContactsToSequence: sequenceId is required');

  const client = apolloClient();

  // Resolve email account if not provided
  let sendFromId = emailAccountId;
  if (!sendFromId) {
    const accounts = await getEmailAccounts();
    const active = accounts.find((a) => a.active);
    if (!active) throw new Error('No active email account found in Apollo. Connect a mailbox in Apollo Settings → Email Accounts first.');
    sendFromId = active.id;
  }

  // Apollo accepts up to 100 contact IDs at a time
  const BATCH_SIZE = 100;
  let enrolled = 0;
  let failed = 0;

  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      await withRetry(
        () => client.post(`/emailer_campaigns/${sequenceId}/add_contact_ids`, {
          contact_ids: batch,
          emailer_campaign_id: sequenceId,
          send_email_from_email_account_id: sendFromId,
          sequence_no_email: true,
          sequence_unverified_email: true,
          sequence_active_in_other_campaigns: true,
          sequence_finished_in_other_campaigns: true,
        }),
        { label: `apollo_enroll_batch_${batchNum}`, maxAttempts: 2 }
      );
      enrolled += batch.length;
      console.log(`  ✅ Enrolled ${batch.length} contacts in sequence (batch ${batchNum})`);
    } catch (err: any) {
      failed += batch.length;
      const msg = err.response?.data?.message || err.message;
      console.warn(`  ⚠️ Sequence enrollment batch ${batchNum} failed after retries: ${msg}`);
    }
  }

  if (failed > 0) {
    console.warn(`  ⚠️ Enrollment summary: ${enrolled} enrolled, ${failed} failed`);
  }
  return { enrolled, failed };
}

// ─────────────────────────────────────────────
// SKILL 6: ANALYTICS
// Replaces Instantly metrics
// ─────────────────────────────────────────────

/**
 * Get aggregate metrics for a sequence.
 */
export async function getSequenceMetrics(sequenceId: string): Promise<SequenceMetrics> {
  if (!sequenceId) throw new Error('getSequenceMetrics: sequenceId is required');

  const client = apolloClient();
  const response = await withRetry(
    () => client.get(`/emailer_campaigns/${sequenceId}`),
    { label: 'apollo_get_sequence_metrics', maxAttempts: 3 }
  );
  const c = response.data.emailer_campaign;
  if (!c) {
    throw new Error(`Apollo returned no data for sequence "${sequenceId}" — check if the sequence exists`);
  }
  return {
    id: c.id,
    name: c.name,
    contacts_count: c.num_contacts || 0,
    emails_sent: c.num_send_email_steps || 0,
    open_rate: c.open_rate || 0,
    reply_rate: c.reply_rate || 0,
    bounce_rate: c.bounce_rate || 0,
    unsubscribe_rate: c.unsubscribe_rate || 0,
  };
}

/**
 * Get reply messages for a sequence.
 */
export async function getSequenceReplies(sequenceId: string, perPage: number = 50): Promise<ApolloReply[]> {
  if (!sequenceId) throw new Error('getSequenceReplies: sequenceId is required');

  const client = apolloClient();
  try {
    const response = await withRetry(
      () => client.get(`/emailer_messages?emailer_campaign_id=${sequenceId}&type=reply&per_page=${perPage}`),
      {
        label: 'apollo_get_replies',
        maxAttempts: 3,
        // 404 is expected when no messages sent yet — don't retry it
        retryIf: (err) => err?.response?.status !== 404 && isTransientError(err),
      }
    );
    const data = response.data;
    return (data.emailer_messages || []).map((m: any) => ({
      id: m.id,
      contact_name: m.contact?.name || 'Unknown',
      contact_email: m.contact?.email || '',
      body_text: m.body_text || m.body_html || '',
      created_at: m.created_at,
      sentiment: m.sentiment || null,
    }));
  } catch (err: any) {
    // 404 is expected when no messages have been sent yet
    if (err?.response?.status === 404) {
      console.warn('  ⚠️ No replies found (sequence may not have sent emails yet)');
      return [];
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
// SHARED: EMAIL ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Get all connected email accounts in Apollo.
 * Used to determine which mailbox sends the sequence.
 */
export async function getEmailAccounts(): Promise<EmailAccount[]> {
  const client = apolloClient();
  const response = await withRetry(
    () => client.get('/email_accounts'),
    { label: 'apollo_get_email_accounts', maxAttempts: 3 }
  );
  const data = response.data;
  const accounts = (data.email_accounts || []).map((a: any) => ({
    id: a.id,
    email: a.email,
    active: a.active !== false,
  }));
  if (accounts.length === 0) {
    console.warn('  ⚠️ No email accounts connected in Apollo. Go to Apollo Settings → Email Accounts to connect one.');
  }
  return accounts;
}
