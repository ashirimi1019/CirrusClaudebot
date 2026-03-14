import { getSupabaseClient, Contact } from '../supabase.ts';
import { withRetry } from '../services/retry.ts';
import {
  normalizeEmail,
  isValidEmail,
  normalizeLinkedInUrl,
  findExistingContact,
  type ContactMatchResult,
} from '../services/deduplication.ts';
import { isTransientDbError } from './utils.ts';

export interface UpsertContactInput {
  company_id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  email?: string | null;
  email_status?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  apollo_contact_id?: string | null;
  fit_score?: number | null;
  enriched_at?: string | null;
}

/**
 * Upsert a contact with multi-field cascade deduplication.
 *
 * Match priority:
 *   1. apollo_contact_id (exact)
 *   2. email (normalized)
 *   3. linkedin_url (normalized)
 *   4. first_name + last_name + company_id (normalized)
 *
 * If a match is found, the existing contact is UPDATED (enriched) with any
 * new non-null fields. If no match, a new contact is inserted.
 */
export async function upsertContact(
  data: UpsertContactInput,
): Promise<Contact> {
  if (!data.company_id) {
    throw new Error('upsertContact: company_id is required');
  }

  const sb = getSupabaseClient();

  // Normalize fields before any operation
  const normalizedEmail = data.email ? normalizeEmail(data.email) : null;
  // Store the original-cased linkedin for display, normalize for matching
  const linkedinForStorage = data.linkedin_url?.trim() || null;

  // Require email for insert (existing behavior preserved)
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new Error('upsertContact: valid email is required (used as conflict key)');
  }

  // Build the row data with normalized fields
  const rowData = {
    company_id: data.company_id,
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
    title: data.title?.trim() || null,
    seniority: data.seniority?.trim() || null,
    department: data.department?.trim() || null,
    email: normalizedEmail,
    email_status: data.email_status || null,
    phone: data.phone?.trim() || null,
    linkedin_url: linkedinForStorage,
    apollo_contact_id: data.apollo_contact_id || null,
    fit_score: data.fit_score ?? null,
    enriched_at: data.enriched_at || null,
  };

  // Try cascade match first
  const matchResult: ContactMatchResult = await findExistingContact(
    {
      apollo_contact_id: data.apollo_contact_id,
      email: normalizedEmail,
      linkedin_url: linkedinForStorage,
      first_name: data.first_name,
      last_name: data.last_name,
      company_id: data.company_id,
    },
    sb,
  );

  if (matchResult.matched && matchResult.existing_id) {
    // UPDATE existing contact — enrich with new non-null fields only
    const updateFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(rowData)) {
      if (value !== null && value !== undefined && value !== '') {
        updateFields[key] = value;
      }
    }
    updateFields.updated_at = new Date().toISOString();

    const { data: updated, error } = await withRetry(
      () => sb
        .from('contacts')
        .update(updateFields)
        .eq('id', matchResult.existing_id!)
        .select()
        .single(),
      { label: `db_update_contact_${normalizedEmail}`, maxAttempts: 2, retryIf: isTransientDbError },
    );

    if (error) {
      throw new Error(`upsertContact update failed for "${normalizedEmail}" (matched by ${matchResult.match_method}): ${error.message}`);
    }
    return updated as Contact;
  }

  // No match found — INSERT via Supabase upsert (email unique constraint is the final safety net)
  const { data: result, error } = await withRetry(
    () => sb
      .from('contacts')
      .upsert(rowData, { onConflict: 'email' })
      .select()
      .single(),
    { label: `db_upsert_contact_${normalizedEmail}`, maxAttempts: 2, retryIf: isTransientDbError },
  );

  if (error) {
    throw new Error(`upsertContact failed for "${normalizedEmail}": ${error.message || JSON.stringify(error)}`);
  }
  if (!result) {
    throw new Error(`upsertContact returned no data for "${normalizedEmail}"`);
  }
  return result as Contact;
}

export async function getContactsByCompanyId(companyId: string): Promise<Contact[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getContactsByCompanyId failed: ${error.message}`);
  return data as Contact[];
}

export async function getContactByEmail(email: string): Promise<Contact | null> {
  const sb = getSupabaseClient();
  const normalized = normalizeEmail(email);

  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('email', normalized)
    .single();

  if (error) return null;
  return data as Contact;
}
