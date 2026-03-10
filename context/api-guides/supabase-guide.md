# Supabase Guide

## Overview

Supabase is the **primary database** for this system.

**Technology:** PostgreSQL (via Supabase)
**SDK:** `@supabase/supabase-js`
**Client:** `src/lib/supabase.ts` → `getSupabaseClient()`

---

## Tables

| Table | Purpose |
|-------|---------|
| `offers` | Offer definitions and positioning |
| `companies` | Discovered companies with hiring signals |
| `evidence` | Hiring signals (job posts, funding, news) |
| `contacts` | Decision-makers (CTO, VP Eng, Founder) |
| `campaigns` | Campaign strategies |
| `campaign_companies` | Which companies are in which campaigns |
| `message_variants` | Email/LinkedIn copy variants |
| `messages` | Individual outreach messages sent |
| `drafts` | Email drafts pending approval |
| `campaign_metrics` | Aggregate performance metrics |
| `tool_usage` | API call logs + cost tracking |
| `reply_sentiment` | Classified replies |
| `objection_patterns` | Recurring objections across campaigns |
| `lead_quality_scores` | ICP scoring records |
| `campaign_replies` | Raw replies before processing |

---

## Setup

### 1. Create Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Copy the **Project URL** and **anon key**

### 2. Run Schema Migration
1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL

### 3. Configure Environment
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
# OR for server-side (preferred):
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## Key Operations

### Upsert a Company
```typescript
import { upsertCompany } from './src/lib/db/companies.ts';

const company = await upsertCompany({
  domain: 'acme.com',
  name: 'Acme Corp',
  size_min: 200,
  funding_stage: 'series_b',
  country: 'US',
});
```

### Upsert a Contact (Decision-Maker)
```typescript
import { upsertContact } from './src/lib/db/contacts.ts';

const contact = await upsertContact({
  company_id: company.id,
  first_name: 'John',
  last_name: 'Smith',
  title: 'CTO',
  email: 'john@acme.com',
  apollo_contact_id: 'apollo_id_here',
});
```

### Log API Usage
```typescript
import { logToolUsage } from './src/lib/services/logging.ts';

await logToolUsage({
  tool_name: 'apollo_company_search',
  units_used: 25,
  estimated_cost: 0.01,
  campaign_id: campaign.id,
});
```

---

## Auth & Keys

| Key Type | Use Case | Permissions |
|----------|----------|-------------|
| `anon` key | Client-side (browser) | Limited by RLS |
| `service_role` key | Server-side (Node.js) | Full access, bypasses RLS |

**For this CLI system:** Always use `SUPABASE_SERVICE_ROLE_KEY` in production.

**Important:** Never expose the `service_role` key to the browser.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Row not found` | Record doesn't exist | Check domain/email uniqueness |
| `duplicate key value` | Upsert conflict | Check `ON CONFLICT` clause in migration |
| `permission denied` | RLS policy blocking | Use service_role key server-side |
| `relation does not exist` | Schema not migrated | Run 001_initial_schema.sql |
| `invalid input syntax` | Type mismatch | Check column types in schema |

---

## Useful Queries

```sql
-- Count records by table
SELECT
  (SELECT count(*) FROM companies) as companies,
  (SELECT count(*) FROM contacts) as contacts,
  (SELECT count(*) FROM campaigns) as campaigns,
  (SELECT count(*) FROM tool_usage) as api_calls;

-- Recent companies with signals
SELECT c.name, c.domain, count(e.id) as signals
FROM companies c
LEFT JOIN evidence e ON c.id = e.company_id
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 20;

-- API cost this month
SELECT tool_name, sum(units_used) as calls, sum(estimated_cost) as cost
FROM tool_usage
WHERE called_at > NOW() - INTERVAL '30 days'
GROUP BY tool_name
ORDER BY cost DESC;
```
