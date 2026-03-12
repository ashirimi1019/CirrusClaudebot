# Duplicate Contact Handling — Implementation Plan

**Date:** 2026-03-12
**Author:** Claude (audit-driven plan)
**Scope:** Backend + DB migration + export dedup — no frontend changes required

---

## Root Cause Analysis

### Problem Statement
Running Skill 4 or Skill 5 multiple times (or across campaigns) creates duplicate contacts, duplicate campaign-company linkages, and duplicate message_variants. The `campaign_contacts` bridge table exists in the schema but is **never populated**, breaking contact-level campaign tracking and the Intelligence API route.

### Five Root Causes

| # | Root Cause | Location | Impact |
|---|-----------|----------|--------|
| 1 | `upsertContact()` deduplicates **only by email** | `src/lib/db/contacts.ts:52` | Contacts without email or with different emails for the same person create duplicates |
| 2 | `campaign_contacts` table is **never written to** | All skills skip it | Intelligence API returns empty contacts; variant evolution has no data; no contact-level campaign tracking |
| 3 | Apollo contact IDs created in Skill 5 are **never synced back** to Supabase | `skill-5-launch-outreach.ts:456-459` | DB contacts lack `apollo_contact_id`, making reconciliation impossible |
| 4 | `message_variants` has **no uniqueness constraint** | `skill-5-launch-outreach.ts:829-838` | Re-running Skill 5 inserts duplicate variant rows |
| 5 | CSV/XLSX exports perform **no deduplication** | `csv-export.ts`, `export-xlsx.ts` | Same contact exported multiple times if DB has duplicates |

### Existing Protections (Working)

- `contacts.email` has a `UNIQUE` constraint — email-based dedup works
- `campaign_companies` has `UNIQUE(campaign_id, company_id)` — company-level dedup works
- `campaign_contacts` has `UNIQUE(campaign_id, contact_id)` — will work once populated
- Skill 4 does `email.toLowerCase().trim()` before upsert — basic normalization exists

---

## File Structure Map

```
Files Changed:
  supabase/migrations/004_dedup_constraints.sql          ← NEW (DB constraints + indexes)
  src/lib/services/deduplication.ts                      ← MODIFY (add normalization + cascade matching)
  src/lib/db/contacts.ts                                 ← MODIFY (enhanced upsert with cascade dedup)
  src/core/skills/skill-5-launch-outreach.ts             ← MODIFY (populate campaign_contacts + sync Apollo IDs)
  src/lib/services/csv-export.ts                         ← MODIFY (dedup before export)
  frontend/src/lib/export-xlsx.ts                        ← MODIFY (dedup before export)

Files Read-Only (reference):
  src/core/skills/skill-4-find-leads.ts                  ← context only (already calls upsertContact correctly)
  supabase/migrations/001_initial_schema.sql             ← existing schema reference
  supabase/migrations/003_outreach_intelligence.sql      ← existing intelligence schema reference
  src/app/api/intelligence/route.ts                      ← reads campaign_contacts (will work once populated)
```

---

## Implementation Tasks

### Task 1: Database Migration — Uniqueness Constraints + Indexes

**File:** `supabase/migrations/004_dedup_constraints.sql` (NEW)

**What:** Add partial unique indexes for nullable dedup fields, add uniqueness constraint on `message_variants`, and add composite index for name-based matching fallback.

```sql
-- ============================================================================
-- 004_dedup_constraints.sql
-- Adds database-level protections against duplicate contacts and variants
-- ============================================================================

-- 1. Partial unique index on apollo_contact_id (only when NOT NULL)
--    Prevents two contacts from sharing the same Apollo ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_apollo_contact_id_unique
  ON contacts (apollo_contact_id)
  WHERE apollo_contact_id IS NOT NULL;

-- 2. Partial unique index on linkedin_url (only when NOT NULL and not empty)
--    Prevents duplicate contacts with same LinkedIn profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_linkedin_url_unique
  ON contacts (linkedin_url)
  WHERE linkedin_url IS NOT NULL AND linkedin_url != '';

-- 3. Composite index for name+company fallback matching
--    Enables fast lookups for the name-based dedup cascade
CREATE INDEX IF NOT EXISTS idx_contacts_name_company
  ON contacts (lower(first_name), lower(last_name), company_id);

-- 4. Unique constraint on message_variants to prevent duplicate inserts on re-run
--    Same campaign + same variant_name = same variant (safe to upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_variants_campaign_variant
  ON message_variants (campaign_id, variant_name)
  WHERE variant_name IS NOT NULL;

-- 5. Unique constraint on outreach_intelligence to prevent duplicate rows on re-run
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_intelligence_campaign_company
  ON outreach_intelligence (campaign_id, company_id)
  WHERE campaign_id IS NOT NULL AND company_id IS NOT NULL;

-- 6. Add segment_key + intelligence columns to campaign_contacts if missing
--    (These may already exist from migration 003 — DO NOTHING if so)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'segment_key'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN segment_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'buyer_persona_angle'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN buyer_persona_angle text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'contact_rationale'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN contact_rationale text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'intelligence_confidence'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN intelligence_confidence real;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'needs_review'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN needs_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'apollo_contact_id'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN apollo_contact_id text;
  END IF;
END $$;
```

**Verify:** Run in Supabase SQL editor. Confirm indexes appear in `pg_indexes` for `contacts` table.

---

### Task 2: Enhanced Deduplication Service — Normalization + Multi-Field Matching

**File:** `src/lib/services/deduplication.ts` (MODIFY)

**What:** Add LinkedIn URL normalization, name normalization, and a cascade contact matching function that tries multiple strategies in priority order.

**Add after existing code (line 55):**

```typescript
/**
 * Normalize a LinkedIn URL for comparison.
 * Strips protocol, www, trailing slashes, query params, and locale prefixes.
 * Returns lowercase cleaned URL or empty string.
 *
 * Examples:
 *   "https://www.linkedin.com/in/john-doe/" → "linkedin.com/in/john-doe"
 *   "https://uk.linkedin.com/in/john-doe?trk=abc" → "linkedin.com/in/john-doe"
 */
export function normalizeLinkedInUrl(url: string | null | undefined): string {
  if (!url || url.trim() === '') return '';
  let cleaned = url.toLowerCase().trim();

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // Strip www and country-code subdomains (uk., fr., de., etc.)
  cleaned = cleaned.replace(/^(www\.|[a-z]{2}\.)?(linkedin\.com)/, '$2');

  // Strip query params and hash
  cleaned = cleaned.split('?')[0].split('#')[0];

  // Strip trailing slash
  cleaned = cleaned.replace(/\/+$/, '');

  return cleaned;
}

/**
 * Normalize a name for fuzzy matching.
 * Lowercases, trims, collapses whitespace, removes common suffixes.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|phd|md|mba|cpa)\b\.?/gi, '')
    .trim();
}

/**
 * Contact matching priority cascade.
 * Returns the matching contact ID if found, or null.
 *
 * Priority order:
 *   1. apollo_contact_id (exact)
 *   2. email (normalized, exact)
 *   3. linkedin_url (normalized, exact)
 *   4. first_name + last_name + company_id (normalized)
 *
 * Each level short-circuits — first match wins.
 */
export interface ContactMatchCandidate {
  apollo_contact_id?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_id: string;
}

export interface ContactMatchResult {
  matched: boolean;
  existing_id: string | null;
  match_method: 'apollo_contact_id' | 'email' | 'linkedin_url' | 'name_company' | 'none';
}

export async function findExistingContact(
  candidate: ContactMatchCandidate,
  supabaseClient: any,
): Promise<ContactMatchResult> {
  const noMatch: ContactMatchResult = { matched: false, existing_id: null, match_method: 'none' };

  // 1. Match by apollo_contact_id
  if (candidate.apollo_contact_id) {
    const { data } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('apollo_contact_id', candidate.apollo_contact_id)
      .limit(1)
      .single();
    if (data?.id) {
      return { matched: true, existing_id: data.id, match_method: 'apollo_contact_id' };
    }
  }

  // 2. Match by email
  if (candidate.email) {
    const normalized = normalizeEmail(candidate.email);
    if (isValidEmail(normalized)) {
      const { data } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('email', normalized)
        .limit(1)
        .single();
      if (data?.id) {
        return { matched: true, existing_id: data.id, match_method: 'email' };
      }
    }
  }

  // 3. Match by LinkedIn URL
  if (candidate.linkedin_url) {
    const normalizedUrl = normalizeLinkedInUrl(candidate.linkedin_url);
    if (normalizedUrl.includes('linkedin.com/in/')) {
      // Must query all contacts and normalize in-app (Postgres can't normalize LinkedIn URLs)
      const { data: linkedinMatches } = await supabaseClient
        .from('contacts')
        .select('id, linkedin_url')
        .eq('company_id', candidate.company_id)
        .not('linkedin_url', 'is', null);

      if (linkedinMatches?.length) {
        const match = linkedinMatches.find(
          (c: { linkedin_url: string }) => normalizeLinkedInUrl(c.linkedin_url) === normalizedUrl
        );
        if (match) {
          return { matched: true, existing_id: match.id, match_method: 'linkedin_url' };
        }
      }
    }
  }

  // 4. Match by first_name + last_name + company_id
  if (candidate.first_name && candidate.last_name && candidate.company_id) {
    const fn = normalizeName(candidate.first_name);
    const ln = normalizeName(candidate.last_name);
    if (fn && ln) {
      const { data: nameMatches } = await supabaseClient
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('company_id', candidate.company_id);

      if (nameMatches?.length) {
        const match = nameMatches.find(
          (c: { first_name: string | null; last_name: string | null }) =>
            normalizeName(c.first_name) === fn && normalizeName(c.last_name) === ln
        );
        if (match) {
          return { matched: true, existing_id: match.id, match_method: 'name_company' };
        }
      }
    }
  }

  return noMatch;
}

/**
 * Deduplicate contacts array by email (in-memory, for export pipelines).
 * Returns deduplicated array keeping the first occurrence.
 */
export function deduplicateContactsByEmail<T extends { email?: string | null }>(contacts: T[]): T[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    if (!c.email) return true; // keep contacts without email (can't dedup them)
    const key = normalizeEmail(c.email);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

---

### Task 3: Enhanced `upsertContact()` with Cascade Matching

**File:** `src/lib/db/contacts.ts` (MODIFY)

**What:** Before inserting, run the cascade match. If a match is found, UPDATE the existing row (enrich) instead of creating a new one. Normalize all fields before write.

**Replace the entire file with:**

```typescript
import { getSupabaseClient, Contact } from '../supabase.ts';
import { withRetry, isTransientError } from '../services/retry.ts';
import {
  normalizeEmail,
  isValidEmail,
  normalizeLinkedInUrl,
  normalizeName,
  findExistingContact,
  ContactMatchResult,
} from '../services/deduplication.ts';

/** Retry predicate for Supabase: retry on network errors and 5xx/503 */
function isTransientDbError(error: any): boolean {
  if (error?.status >= 500) return true;
  if (error?.code === 'PGRST301') return true;
  return isTransientError(error);
}

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
 *
 * Returns: { contact, matchMethod } — the upserted Contact and how it was matched.
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
  const normalizedLinkedin = data.linkedin_url ? normalizeLinkedInUrl(data.linkedin_url) : null;
  // Store the original-cased linkedin for display, but use normalized for matching
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
      { label: `db_update_contact_${normalizedEmail}`, maxAttempts: 2, retryIf: isTransientDbError }
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
    { label: `db_upsert_contact_${normalizedEmail}`, maxAttempts: 2, retryIf: isTransientDbError }
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
```

---

### Task 4: Populate `campaign_contacts` in Skill 5

**File:** `src/core/skills/skill-5-launch-outreach.ts` (MODIFY)

**What:** After creating contacts in Apollo and getting their Apollo IDs back, (a) sync Apollo IDs to Supabase contacts table, and (b) insert rows into `campaign_contacts` with intelligence metadata.

**4a — After `bulkCreateContacts` returns (after line 459), add Apollo ID sync:**

Find this block (lines 455-460):
```typescript
        const created = await bulkCreateContacts(contactInputs);
        const ids = created.map((c) => c.id);
        segmentContactIds.set(segment.segment_key, ids);
        totalCreated += ids.length;
        console.log(`  ✅ ${segment.segment_key}: ${ids.length} contacts created`);
```

Replace with:
```typescript
        const created = await bulkCreateContacts(contactInputs);
        const ids = created.map((c) => c.id);
        segmentContactIds.set(segment.segment_key, ids);
        totalCreated += ids.length;
        console.log(`  ✅ ${segment.segment_key}: ${ids.length} contacts created`);

        // Sync Apollo contact IDs back to Supabase
        for (let i = 0; i < created.length && i < segment.contacts.length; i++) {
          const apolloId = created[i].id;
          const email = segment.contacts[i].email;
          if (apolloId && email) {
            try {
              await sb.from('contacts')
                .update({ apollo_contact_id: apolloId, updated_at: new Date().toISOString() })
                .eq('email', email.toLowerCase().trim());
            } catch { /* best-effort sync */ }
          }
        }
```

**4b — After `saveIntelligenceToDB` function (after line 805), add a new function:**

```typescript
async function populateCampaignContacts(
  segments: SegmentGroup[],
  campaignSlug: string,
): Promise<number> {
  const sb = getSupabaseClient();

  const { data: campaignRow } = await sb
    .from('campaigns')
    .select('id')
    .eq('slug', campaignSlug)
    .limit(1)
    .single();

  const campaignId = campaignRow?.id;
  if (!campaignId) {
    console.warn('  ⚠️ populateCampaignContacts: campaign not found');
    return 0;
  }

  let inserted = 0;
  for (const segment of segments) {
    for (const contact of segment.contacts) {
      if (!contact.email) continue;

      // Look up the contact's DB id by email
      const { data: contactRow } = await sb
        .from('contacts')
        .select('id')
        .eq('email', contact.email.toLowerCase().trim())
        .limit(1)
        .single();

      if (!contactRow?.id) continue;

      const { error } = await sb
        .from('campaign_contacts')
        .upsert(
          {
            campaign_id: campaignId,
            contact_id: contactRow.id,
            segment_key: segment.segment_key,
            buyer_persona_angle: contact.buyer_persona_angle || null,
            contact_rationale: contact.contact_rationale || null,
            intelligence_confidence: contact.intelligence_confidence || null,
            needs_review: contact.needs_review || false,
            outreach_status: 'pending',
          },
          { onConflict: 'campaign_id,contact_id' }
        );

      if (!error) inserted++;
    }
  }

  console.log(`  → Populated ${inserted} campaign_contacts rows`);
  return inserted;
}
```

**4c — Call `populateCampaignContacts` inside the main skill execution.**

Find the call to `saveIntelligenceToDB(...)` and add after it:
```typescript
    await populateCampaignContacts(segments, campaignSlug);
```

---

### Task 5: Prevent Duplicate `message_variants` on Re-Run

**File:** `src/core/skills/skill-5-launch-outreach.ts` (MODIFY)

**What:** Change `message_variants` insert to upsert using the new unique index.

Find (lines 829-837):
```typescript
      await sb.from('message_variants').insert({
        campaign_id: campaignId,
        channel: 'email',
        variant_name: `${segment.segment_key} - Variant ${variant.variant_number}`,
        subject_line: variant.subject,
        body: variant.body,
        segment_key: segment.segment_key,
      });
```

Replace with:
```typescript
      await sb.from('message_variants').upsert(
        {
          campaign_id: campaignId,
          channel: 'email',
          variant_name: `${segment.segment_key} - Variant ${variant.variant_number}`,
          subject_line: variant.subject,
          body: variant.body,
          segment_key: segment.segment_key,
        },
        { onConflict: 'campaign_id,variant_name' }
      );
```

---

### Task 6: Dedup Before CSV Export

**File:** `src/lib/services/csv-export.ts` (MODIFY)

**What:** Deduplicate contacts by email before building lead rows.

Add import at top:
```typescript
import { deduplicateContactsByEmail } from './deduplication.ts';
```

Modify `buildLeadRows` (line 88):
```typescript
  // Deduplicate before building rows
  const dedupedContacts = deduplicateContactsByEmail(contacts);
  const skippedDupes = contacts.length - dedupedContacts.length;
  if (skippedDupes > 0) {
    console.warn(`  ⚠️ buildLeadRows: removed ${skippedDupes} duplicate contacts by email`);
  }

  const rows: LeadRow[] = [];
  for (const c of dedupedContacts) {
```

(Replace the existing `for (const c of contacts)` loop start.)

---

### Task 7: Dedup Before XLSX Export

**File:** `frontend/src/lib/export-xlsx.ts` (MODIFY)

**What:** Deduplicate rows by email column (if present) before export.

Add at the top of `exportToXlsx`, after the empty check:
```typescript
  // Deduplicate by email if the column exists
  if ('email' in rows[0]) {
    const seen = new Set<string>();
    const before = rows.length;
    rows = rows.filter((r) => {
      const email = String(r.email || '').toLowerCase().trim();
      if (!email) return true;
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    if (rows.length < before) {
      console.log(`XLSX export: deduplicated ${before - rows.length} duplicate emails`);
    }
  }
```

Change `rows` parameter to `let rows` to allow reassignment:
```typescript
export function exportToXlsx(
  inputRows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): void {
  let rows = [...inputRows];
  if (rows.length === 0) return;
```

---

## Verification Checklist

### TypeScript Check
```bash
cd "C:/Users/ashir/Claude Agent" && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Database Verification
```sql
-- Verify new indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'contacts' AND indexname LIKE '%unique%';
SELECT indexname FROM pg_indexes WHERE tablename = 'message_variants';

-- Verify no existing duplicates violate new constraints
-- (Run BEFORE applying migration to see if cleanup is needed)
SELECT apollo_contact_id, COUNT(*) FROM contacts
  WHERE apollo_contact_id IS NOT NULL
  GROUP BY apollo_contact_id HAVING COUNT(*) > 1;

SELECT linkedin_url, COUNT(*) FROM contacts
  WHERE linkedin_url IS NOT NULL AND linkedin_url != ''
  GROUP BY linkedin_url HAVING COUNT(*) > 1;
```

### Test Scenarios

1. **Email dedup:** Call `upsertContact` twice with same email, different name → should UPDATE, not create second row
2. **Apollo ID dedup:** Call `upsertContact` with existing apollo_contact_id but different email → should match and update
3. **LinkedIn dedup:** Call `upsertContact` with `linkedin.com/in/johndoe/` then `www.linkedin.com/in/johndoe` → should match
4. **Name+company dedup:** Call `upsertContact` with `John`, `Doe`, company_id_X, then `john`, `doe`, company_id_X → should match
5. **Re-run Skill 5:** Run twice on same campaign → `message_variants` count should NOT double
6. **campaign_contacts populated:** After Skill 5 run, `SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = X` should be > 0
7. **Export dedup:** Export contacts with duplicates in DB → CSV/XLSX should have unique emails only

---

## Edge Cases & Limitations

| Edge Case | Handling |
|-----------|----------|
| Contact has no email | Cannot cascade-match by email; will rely on apollo_contact_id, linkedin, or name+company |
| Two people with same name at same company | Name+company match returns first found — could mis-match. Mitigated by checking email and linkedin first |
| LinkedIn URL changes format over time | Normalized comparison handles protocol/subdomain/trailing slash differences |
| Apollo returns `existing_contacts` (not `created_contacts`) | Currently treated same as created — Skill 5 should check both arrays for ID sync |
| Multiple campaigns for same contact | `campaign_contacts.UNIQUE(campaign_id, contact_id)` prevents double-linking within a campaign; same contact in different campaigns is correct and allowed |
| Migration fails due to existing duplicate apollo_contact_ids | Pre-migration cleanup query provided in verification section; duplicates must be resolved manually before migration |

---

## Build Order

1. Run pre-migration duplicate check queries (Verification section)
2. Apply `004_dedup_constraints.sql` migration
3. Modify `src/lib/services/deduplication.ts` (Task 2)
4. Modify `src/lib/db/contacts.ts` (Task 3)
5. Modify `src/core/skills/skill-5-launch-outreach.ts` (Tasks 4 + 5)
6. Modify `src/lib/services/csv-export.ts` (Task 6)
7. Modify `frontend/src/lib/export-xlsx.ts` (Task 7)
8. Run `npx tsc --noEmit` on both root and frontend
9. Run test scenarios from Verification section
