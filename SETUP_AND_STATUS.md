# CirrusLabs - Hiring Signal Outbound Engine
## Setup & Implementation Status

**Last Updated:** February 24, 2026
**Project Status:** MVP Complete - Ready for Configuration & Testing
**Environment:** Production-ready Next.js 14 application

---

## 📋 Project Overview

This is a **signal-driven outbound automation system** that:

1. **Discovers** companies actively hiring for target roles (Data Engineer, ML Engineer, Cloud Engineer, etc.)
2. **Identifies** the right decision-makers (CTO, VP Engineering, Founder, etc.)
3. **Generates** evidence-based email drafts automatically
4. **Manages** human-in-the-loop review and approval
5. **Exports** approved messages to sales engagement tools like Instantly

The system is **not** a generic email blaster. It's a repeatable pipeline that starts with proof (hiring signals) instead of guesswork.

---

## ✅ What's Already Built

### Core Infrastructure
- ✅ **Next.js 14 application** with TypeScript, Tailwind CSS, Shadcn UI
- ✅ **API routes** for all operations (research, buyer discovery, draft generation, export)
- ✅ **Supabase integration** with full database schema
- ✅ **Three core agents** that orchestrate the pipeline
- ✅ **Five API client integrations** ready to connect

### Three Agent System

#### 1. **Research Agent** (`core/researchAgent.ts`)
- Calls TheirStack API to find companies with hiring signals
- Searches for target roles (configurable in `/app/api/actions/route.ts`)
- Stores companies + evidence in database
- Deduplicates by domain
- Hard-capped at 25 results per run for cost control

#### 2. **Buyer Discovery Agent** (`core/buyerAgent.ts`)
- Calls Parallel API to find decision-makers at discovered companies
- Filters by ICP titles: CTO, VP Engineering, Director of Engineering, Founder, CIO
- Stores buyers with email, LinkedIn URL, and enrichment timestamp
- Deduplicates by email to prevent double-enrichment
- Capped at 5 buyers per company

#### 3. **Draft Generation Agent** (`core/draftAgent.ts`)
- Fetches recent evidence for each buyer's company
- Calls OpenAI (gpt-4o) with strict rules:
  - No generic filler ("hope this finds you well")
  - No hallucinations ("saw your website")
  - Must reference hiring evidence directly
  - Returns structured JSON: `{ subject, body }`
- Stores drafts as "pending" for human review
- One draft per buyer (no multi-variant generation yet)

### Frontend Dashboard & UI

#### Dashboard (`app/page.tsx`)
- Real-time stat cards (Companies, Buyers, Pending/Approved Drafts)
- Three action buttons:
  - **Run Research** → Find hiring signals
  - **Run Buyer Discovery** → Find decision-makers
  - **Generate Drafts** → Create email drafts
- Last run result display with JSON
- Clean, minimal design

#### Draft Review (`app/drafts/page.tsx`)
- Table view of all drafts (pending, approved, rejected)
- Expandable body preview
- Approve / Reject / Reset buttons
- "Export CSV" button to download approved drafts in Instantly format
- Pending/Approved counts at top

### Database Schema
- ✅ Complete Supabase schema (see `supabase_schema.sql`)
- Tables: `companies`, `evidence`, `buyers`, `drafts`, `api_logs`
- Foreign key relationships, indexes, and enums all configured
- RLS policies ready (commented, for optional production use)

### API Clients (Ready to Connect)
- ✅ **TheirStack** (`lib/clients/theirstack.ts`) - Job posting search
- ✅ **Parallel** (`lib/clients/parallel.ts`) - Decision-maker discovery
- ✅ **OpenAI** (`lib/clients/openai.ts`) - Email draft generation
- ✅ **API logging** (`lib/db/apiLogs.ts`) - Cost tracking & debugging

### Build Status
- ✅ Builds without errors
- ✅ TypeScript strict mode enabled
- ✅ All routes typed and validated
- ✅ Ready to run

---

## 🚀 What You Need to Do (Setup Steps)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project (choose region close to your users)
3. Go to **Settings → API**
4. Copy your `Project URL` and `Anon Key`

### Step 2: Create Database Tables
1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase_schema.sql` from this repository
4. Paste it into the SQL editor
5. Click **Run**
6. Verify that 5 tables are created: `companies`, `evidence`, `buyers`, `drafts`, `api_logs`

### Step 3: Update Environment Variables
Edit `.env` and set:

```
# Supabase (from Step 1)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# API Keys (sign up for each)
THEIRSTACK_API_KEY=your_theirstack_key
PARALLEL_API_KEY=your_parallel_key
OPENAI_API_KEY=your_openai_key

# Optional - for future integrations
EXA_API_KEY=
LEADMAGIC_API_KEY=
PERPLEXITY_API_KEY=
```

### Step 4: Sign Up for APIs
- **TheirStack** (https://theirstack.com) - Job posting search (~$0.20-0.50 per search)
- **Parallel** (https://parallelhq.com) - People discovery (~$0.10-0.50 per company)
- **OpenAI** (https://platform.openai.com) - Text generation for drafts (~$0.02-0.05 per draft)

### Step 5: Run the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 6: Test the Pipeline
1. **Click "Run Research"**
   - Should find ~10-25 companies hiring for target roles
   - Check Supabase: `companies` table should have new rows
   - Check `evidence` table for job posting details

2. **Click "Run Buyer Discovery"**
   - Should find ~5-10 decision-makers from discovered companies
   - Check `buyers` table for new contacts with emails
   - Each buyer should be linked to a company

3. **Click "Generate Drafts"**
   - Should create ~5-10 email drafts
   - Check `drafts` table for pending drafts
   - Each draft should reference the hiring signal

4. **Go to /drafts page**
   - See table of all pending drafts
   - Click to expand and preview email body
   - Click "Approve" to mark for export
   - Click "Export CSV" to download approved drafts

5. **Upload CSV to Instantly**
   - The CSV has columns: `first_name,last_name,email,company,subject,body`
   - This format works directly with Instantly's bulk upload

---

## 🔧 Configuration & Customization

### Target Roles (for Research Agent)
Edit `/app/api/actions/route.ts` line 52-59 to change which roles to search for:

```typescript
const summary = await runResearchCampaign({
  roles: [
    'Machine Learning Engineer',      // ← Change these
    'Data Engineer',
    'Cloud Architect',
    'MLOps Engineer',
    'Data Platform Engineer',
  ],
  country: 'US',                       // ← Change country
  limit: 25,                           // ← Change limit
});
```

### Buyer Titles (ICP)
Edit `/core/buyerAgent.ts` line 25-33 to target different decision-makers:

```typescript
const ICP_TITLES = [
  'CTO',                               // ← Edit these
  'VP Engineering',
  'VP of Engineering',
  'Director of Engineering',
  'CIO',
  'Founder',
  'Co-Founder',
];
```

### Email Draft Prompt
Edit `/lib/clients/openai.ts` function `buildPrompt()` to customize:
- Tone (currently "direct, peer-level, no flattery")
- Word count (currently 150 words max)
- Specific rules or disclaimers
- Company/role-specific logic

### Batch Sizes & Cost Control
- Research: max 25 companies per run (edit `MAX_RESULTS` in `core/researchAgent.ts`)
- Buyers: max 10 companies, max 5 buyers per company (edit in `core/buyerAgent.ts`)
- Drafts: max 20 buyers per run (edit in `core/draftAgent.ts`)
- All API calls are logged with latency and status for debugging

---

## 📊 Database Schema Overview

### companies
```sql
id (uuid)           -- Primary key
domain (text)       -- UNIQUE: company.com
name (text)         -- company name (optional)
size_min (int)      -- employee range min
size_max (int)      -- employee range max
funding_stage (text)-- Series A, Series B, etc.
country (text)      -- US, UK, etc.
created_at (ts)     -- when discovered
```

### evidence
```sql
id (uuid)           -- Primary key
company_id (uuid)   -- FK to companies
type (enum)         -- job_post, tech_signal, funding, news
title (text)        -- "Senior Data Engineer" or "Series B Funding"
raw_json (jsonb)    -- full API response (for future analysis)
source (text)       -- theirstack, parallel, exa, etc.
posted_at (ts)      -- when signal was created
created_at (ts)     -- when we discovered it
```

### buyers
```sql
id (uuid)           -- Primary key
company_id (uuid)   -- FK to companies
first_name (text)   -- buyer first name
last_name (text)    -- buyer last name
title (text)        -- CTO, VP Engineering, Founder, etc.
email (text)        -- UNIQUE: for deduplication + sending
linkedin_url (text) -- for manual outreach
enriched_at (ts)    -- when we fetched this data
created_at (ts)     -- when discovered
```

### drafts
```sql
id (uuid)           -- Primary key
buyer_id (uuid)     -- FK to buyers (who gets the email)
evidence_id (uuid)  -- FK to evidence (which signal triggered it)
subject (text)      -- email subject line
body (text)         -- email body (under 150 words)
status (enum)       -- pending, approved, rejected
created_at (ts)     -- when drafted
```

### api_logs
```sql
id (uuid)           -- Primary key
tool (enum)         -- theirstack, parallel, openai, etc.
endpoint (text)     -- API URL called
request_payload (jsonb) -- what we sent
response_summary (jsonb)-- status, tokens, count, etc.
latency_ms (int)    -- how long it took
status_code (int)   -- 200, 401, 429, 500, etc.
created_at (ts)     -- when called
```

---

## 💰 Cost Tracking

Every API call is logged to `api_logs` table. You can query:

```sql
SELECT tool, COUNT(*) as calls, ROUND(AVG(latency_ms)) as avg_latency
FROM api_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY tool
ORDER BY calls DESC;
```

Approximate costs per run:
- **Research (1 run):** ~$0.50 (25 companies)
- **Buyer Discovery (1 run):** ~$1.50 (10 companies × 5 buyers × $0.03)
- **Draft Generation (1 run):** ~$0.50 (20 buyers × $0.02-0.05 per draft)
- **Total per full pipeline run:** ~$2.50

---

## 🔐 Safety Features

### Human-in-the-Loop Approval
- No emails are sent automatically
- All drafts marked "pending" for review
- Only "approved" drafts are exported
- Rejected drafts stay in system for analysis

### Deduplication
- Companies deduplicated by domain (no duplicate companies)
- Buyers deduplicated by email (no duplicate buyers)
- Safe upserts prevent API cost waste

### Rate Limiting & Cost Control
- Hard caps on companies per run (25 max)
- Hard caps on buyers per company (5 max)
- Hard caps on drafts per run (20 max)
- API logging for cost audits

### Email Safety
- Subject line + body validation
- No generic filler patterns in drafts
- Evidence requirement (won't draft without proof)
- Export as CSV for review before sending

---

## 🎯 Next Steps After Setup

### Immediate (Day 1)
1. ✅ Set up Supabase project
2. ✅ Create tables (run SQL schema)
3. ✅ Set environment variables
4. ✅ Run `npm run dev`
5. ✅ Test pipeline with small batch

### Short-term (Week 1)
- Customize target roles and titles for your niche
- Test CSV export in Instantly
- Run 5-10 full pipelines to gather data
- Monitor `api_logs` for costs and errors

### Medium-term (Week 2-3)
- Add filtering by company size/revenue (in database queries)
- Implement ICP scoring (not yet built)
- Add LinkedIn verification step (not yet built)
- Build campaign tracking (results, reply rates)

### Future Enhancements (Roadmap)
- **Multi-variant copy generation** (A/B test different angles)
- **Signal weighting** (some signals are higher intent than others)
- **ICP scoring system** (rate companies 0-100 fit)
- **Email verification** via Leadmagic before sending
- **Reply tracking** integration
- **CRM sync** for pipeline visibility
- **Campaign analytics** dashboard

---

## 🐛 Troubleshooting

### "Missing SUPABASE_URL in environment"
- Check .env file has `SUPABASE_URL=`
- Make sure URL starts with `https://`

### "TheirStack API error 401"
- API key is wrong or expired
- Check .env: `THEIRSTACK_API_KEY=`

### "Database error: relation 'companies' does not exist"
- You haven't run the SQL schema yet
- Go to Supabase SQL Editor and run `supabase_schema.sql`

### "No drafts are being generated"
- Check that buyers exist for companies (`buyers` table should have rows)
- Check that evidence exists for buyers' companies (`evidence` table should have rows)
- Check OpenAI logs in `api_logs` for errors

### CSV export has blank emails
- Some buyers may not have emails from Parallel API
- Instantly can't send to blank emails, so these will be skipped
- This is why email verification is important (future feature)

---

## 📞 Support

For issues:
1. Check `api_logs` table for error details
2. Look at console output for stack traces
3. Verify all required environment variables are set
4. Review troubleshooting section above
5. Check API provider dashboards (TheirStack, Parallel, OpenAI) for rate limits or errors

---

## 📜 License

This is a custom system built for CirrusLabs. Do not redistribute without permission.

---

**Ready to go!** Start with Step 1 of the setup guide above.
