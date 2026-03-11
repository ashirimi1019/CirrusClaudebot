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

  try {
    console.log(`  → Apollo company search: roles=[${roles.join(', ')}]`);
    const response = await client.post('/mixed_companies/search', payload);
    const data = response.data;

    await logApiCall('apollo_company_search', 0.01, payload, { count: data.organizations?.length });

    const companies: ApolloCompany[] = (data.organizations || []).map((org: any) => ({
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
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Apollo company search failed: ${msg}`);
  }
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
  try {
    const response = await client.post('/mixed_people/api_search', searchPayload);
    candidates = response.data.people || [];

    await logApiCall('apollo_people_api_search', 0.01, { org_count: organizationIds.length }, { count: candidates.length });
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    throw new Error(`Apollo people search failed: ${msg}`);
  }

  if (candidates.length === 0) return [];

  // Step 2: Enrich each candidate to get email + full name + linkedin
  const enriched: ApolloPerson[] = [];

  for (const candidate of candidates) {
    if (!candidate.id) continue;

    try {
      const enrichResp = await client.post('/people/match', { id: candidate.id });
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
      // Non-fatal: skip person if enrichment fails
      console.warn(`    ⚠️ Enrichment failed for ${candidate.first_name || 'unknown'}: ${err.response?.data?.error || err.message}`);
    }
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
  try {
    const response = await client.post('/emailer_campaigns/search', { per_page: '50' });
    const data = response.data;
    return (data.emailer_campaigns || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      active: c.active !== false,
      num_steps: c.num_steps || c.emailer_steps_count || 0,
      num_contacts: c.num_contacts || c.contacts_count || 0,
      created_at: c.created_at,
    }));
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    throw new Error(`Apollo list sequences failed: ${msg}`);
  }
}

/**
 * Create a new email sequence in Apollo.
 */
export async function createSequence(name: string): Promise<ApolloSequence> {
  const client = apolloClient();
  try {
    const response = await client.post('/emailer_campaigns', {
      name,
      active: true,
    });
    const c = response.data.emailer_campaign;
    return {
      id: c.id,
      name: c.name,
      active: c.active,
      num_steps: 0,
      num_contacts: 0,
      created_at: c.created_at,
    };
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Apollo create sequence failed: ${msg}`);
  }
}

/**
 * Add an email step to an existing sequence.
 * dayOffset = 1 means wait 1 day, 3 = wait 3 days, etc.
 * Note: Apollo requires wait_mode + exact_datetime fields alongside wait_time.
 */
export async function addEmailStepToSequence(
  sequenceId: string,
  subject: string,
  body: string,
  dayOffset: number = 1,
  position: number = 1
): Promise<void> {
  const client = apolloClient();
  try {
    await client.post('/emailer_steps', {
      emailer_campaign_id: sequenceId,
      position,
      wait_time: Math.max(dayOffset, 1),  // Apollo requires positive integer
      wait_mode: 'day',
      exact_datetime: null,
      type: 'auto_email',
      emailer_template: {
        subject,
        body_html: body.replace(/\n/g, '<br>'),
        body_text: body,
      },
    });
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    throw new Error(`Apollo add sequence step failed: ${msg}`);
  }
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

    try {
      const response = await client.post('/contacts/bulk_create', {
        contacts: batch.map((c) => ({
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email || undefined,
          title: c.title || undefined,
          organization_name: c.organization_name || undefined,
          website_url: c.website_url || undefined,
        })),
      });

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
      console.log(`  ✅ Created ${created.length} contacts (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      console.warn(`  ⚠️ Batch contact create failed: ${msg}`);
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
): Promise<void> {
  if (contactIds.length === 0) return;

  const client = apolloClient();

  // Resolve email account if not provided
  let sendFromId = emailAccountId;
  if (!sendFromId) {
    const accounts = await getEmailAccounts();
    const active = accounts.find((a) => a.active);
    if (!active) throw new Error('No active email account found in Apollo. Connect a mailbox first.');
    sendFromId = active.id;
  }

  // Apollo accepts up to 100 contact IDs at a time
  const BATCH_SIZE = 100;
  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    try {
      await client.post(`/emailer_campaigns/${sequenceId}/add_contact_ids`, {
        contact_ids: batch,
        send_email_from_email_account_id: sendFromId,
      });
      console.log(`  ✅ Enrolled ${batch.length} contacts in sequence (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      console.warn(`  ⚠️ Sequence enrollment batch failed: ${msg}`);
    }
  }
}

// ─────────────────────────────────────────────
// SKILL 6: ANALYTICS
// Replaces Instantly metrics
// ─────────────────────────────────────────────

/**
 * Get aggregate metrics for a sequence.
 */
export async function getSequenceMetrics(sequenceId: string): Promise<SequenceMetrics> {
  const client = apolloClient();
  try {
    const response = await client.get(`/emailer_campaigns/${sequenceId}`);
    const c = response.data.emailer_campaign;
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
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Apollo get sequence metrics failed: ${msg}`);
  }
}

/**
 * Get reply messages for a sequence.
 */
export async function getSequenceReplies(sequenceId: string, perPage: number = 50): Promise<ApolloReply[]> {
  const client = apolloClient();
  try {
    const response = await client.get(
      `/emailer_messages?emailer_campaign_id=${sequenceId}&type=reply&per_page=${perPage}`
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
    if (err.response?.status === 404) return [];
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    throw new Error(`Apollo get replies failed: ${msg}`);
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
  try {
    const response = await client.get('/email_accounts');
    const data = response.data;
    return (data.email_accounts || []).map((a: any) => ({
      id: a.id,
      email: a.email,
      active: a.active !== false,
    }));
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Apollo get email accounts failed: ${msg}`);
  }
}
