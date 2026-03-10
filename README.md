# CirrusLabs - Hiring Signal Outbound Engine

A **signal-driven outbound automation system** that discovers companies actively hiring, identifies decision-makers, generates evidence-based email drafts, and exports them for sending via sales engagement platforms.

**Status:** ✅ Production Ready - MVP Complete

---

## 🎯 The Core Idea

Traditional outbound starts with lists. This system starts with proof.

Instead of:
- Static databases (Apollo, LinkedIn searches)
- Broad filters (industry, employee count)
- Generic outreach

This system does:
1. **Detect Intent** → Find companies actively hiring relevant roles (using job postings)
2. **Target Buyers** → Identify CTO, VP Eng, Director of Eng, Founders
3. **Generate Evidence-First Copy** → Reference specific hiring signals in emails
4. **Human Review** → Approve drafts before export
5. **Export for Sending** → CSV format for Instantly, Smartlead, or other tools

Result: **Higher reply rates, better qualification, repeatable scaling**.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- API keys: TheirStack, Parallel, OpenAI

### 2. Setup (5 minutes)

```bash
# Clone or cd into project
cd "path/to/Claude Agent"

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update .env with your Supabase credentials and API keys
# SUPABASE_URL, SUPABASE_ANON_KEY, THEIRSTACK_API_KEY, PARALLEL_API_KEY, OPENAI_API_KEY
```

### 3. Create Database (2 minutes)

1. Log into your Supabase project
2. Go to **SQL Editor**
3. Create new query
4. Copy entire contents of `supabase_schema.sql`
5. Paste and click **Run**

### 4. Start App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test the Pipeline

**Dashboard** (`/`)
- Click **"Run Research"** → Find ~10-25 companies hiring for target roles
- Click **"Run Buyer Discovery"** → Find ~5-10 decision-makers
- Click **"Generate Drafts"** → Create email drafts

**Draft Review** (`/drafts`)
- See all pending drafts
- Click to preview email body
- Approve/Reject/Reset
- Click **"Export CSV"** to download

**Upload to Instantly**
- CSV columns: `first_name,last_name,email,company,subject,body`
- Works directly with Instantly's bulk upload

---

## 📊 How It Works

### Three Core Agents

#### 1. Research Agent
```
Input: Target roles (Data Engineer, ML Engineer, etc.)
  ↓
Call TheirStack API for job postings
  ↓
Extract: company_name, domain, job_title, job_url, posted_at
  ↓
Store in database (deduplicated by domain)
  ↓
Output: 10-25 companies with hiring signals
```

#### 2. Buyer Discovery Agent
```
Input: Companies from Research Agent
  ↓
Call Parallel API for each company
  ↓
Filter by ICP titles (CTO, VP Eng, Director, Founder, CIO)
  ↓
Extract: first_name, last_name, title, email, linkedin_url
  ↓
Output: 5-10 decision-makers per company
```

#### 3. Draft Generation Agent
```
Input: Buyers + their company's hiring evidence
  ↓
For each buyer:
  - Fetch company & recent job posting
  - Call OpenAI with strict prompt (no filler, reference evidence)
  - Return: { subject, body }
  ↓
Store drafts as "pending" for review
  ↓
Output: Email drafts ready for approval
```

### Pipeline Safety
- **No auto-sending** - All drafts pending approval
- **Deduplication** - Companies by domain, buyers by email
- **Cost control** - Hard caps on batch sizes (25 companies, 10 processed, 20 drafts)
- **Logging** - Every API call tracked for auditing

---

## 🛠️ Configuration

### Target Roles
Edit `/app/api/actions/route.ts` line 52:
```typescript
roles: [
  'Machine Learning Engineer',
  'Data Engineer',
  'Cloud Architect',
  'MLOps Engineer',
]
```

### Buyer Titles (ICP)
Edit `/core/buyerAgent.ts` line 25:
```typescript
const ICP_TITLES = [
  'CTO',
  'VP Engineering',
  'Director of Engineering',
  'Founder',
];
```

### Email Prompt
Edit `/lib/clients/openai.ts` function `buildPrompt()` to customize:
- Tone and style
- Word count (default 150)
- Specific rules or disclaimers

---

## 📁 Project Structure

```
app/
  ├── page.tsx                 # Dashboard with stats + action buttons
  ├── drafts/page.tsx         # Draft review & CSV export
  ├── api/
  │   ├── actions/route.ts    # Orchestrates all 3 agents
  │   ├── drafts/route.ts     # List drafts
  │   ├── drafts/[id]/route.ts # Update draft status
  │   └── export/route.ts     # CSV export
  ├── layout.tsx              # App layout + styling
  └── globals.css             # Tailwind + custom styles

core/
  ├── researchAgent.ts        # Find hiring companies (TheirStack)
  ├── buyerAgent.ts          # Find decision-makers (Parallel)
  └── draftAgent.ts          # Generate drafts (OpenAI)

lib/
  ├── clients/
  │   ├── theirstack.ts      # TheirStack API integration
  │   ├── parallel.ts        # Parallel API integration
  │   └── openai.ts          # OpenAI draft generation
  ├── db/
  │   ├── companies.ts       # Company CRUD
  │   ├── evidence.ts        # Evidence CRUD
  │   ├── buyers.ts          # Buyer CRUD + upsert
  │   ├── drafts.ts          # Draft CRUD
  │   └── apiLogs.ts         # API logging
  └── supabase.ts            # Supabase client & types

components/
  └── ui/                    # Shadcn UI components

supabase_schema.sql          # Database schema (run in Supabase SQL editor)
SETUP_AND_STATUS.md          # Detailed setup guide
.env.example                 # Environment variables template
```

---

## 🗄️ Database Schema

### companies
Stores discovered companies with hiring signals
- `id, domain (UNIQUE), name, size_min, size_max, funding_stage, country, created_at`

### evidence
Stores hiring signals (job postings, tech signals, funding, news)
- `id, company_id (FK), type, title, raw_json, source, posted_at, created_at`

### buyers
Stores decision-makers with email
- `id, company_id (FK), first_name, last_name, title, email (UNIQUE), linkedin_url, enriched_at, created_at`

### drafts
Stores email drafts with status (pending/approved/rejected)
- `id, buyer_id (FK), evidence_id (FK), subject, body, status, created_at`

### api_logs
Tracks all API calls for cost auditing
- `id, tool, endpoint, request_payload, response_summary, latency_ms, status_code, created_at`

---

## 💰 Costs (Approximate)

Per full pipeline run (Research → Buyers → Drafts):
- **Research (25 companies):** ~$0.50
- **Buyer Discovery (50 people):** ~$1.50
- **Draft Generation (20 drafts):** ~$0.40
- **Total:** ~$2.40 per run

All API calls logged for detailed cost auditing.

---

## ✨ Key Features

✅ **Evidence-First** - Emails reference actual hiring signals, not guesses
✅ **Human-in-the-Loop** - Approve before sending
✅ **Deduplication** - Smart upserting prevents waste
✅ **Cost Control** - Hard caps + logging
✅ **Exportable** - Direct to Instantly format
✅ **Scalable** - Run multiple times per day
✅ **TypeScript** - Full type safety
✅ **Clean UI** - Minimal dashboard + draft review

---

## 🔄 Typical Workflow

### Day 1: Setup
1. Create Supabase project
2. Run SQL schema
3. Set environment variables
4. Start app (`npm run dev`)

### Day 2-3: Testing
1. Run Research → observe companies found
2. Run Buyer Discovery → observe buyers found
3. Run Draft Generation → observe draft quality
4. Tweak roles, titles, or email prompt
5. Export ~20 approved drafts

### Week 1+: Scaling
1. Run pipeline daily or multiple times per day
2. Monitor reply rates in Instantly
3. Approve best performers
4. Iterate on roles, titles, email angles

---

## 🚧 Future Roadmap

- [ ] **Multi-variant copy generation** (A/B test different hooks)
- [ ] **ICP scoring system** (qualify leads 0-100)
- [ ] **Email verification** (Leadmagic integration)
- [ ] **Reply tracking** integration
- [ ] **Campaign analytics** dashboard
- [ ] **Signal weighting** (some signals = higher intent)
- [ ] **CRM sync** for pipeline visibility
- [ ] **LinkedIn connection tracking** (for manual outreach)

---

## 📖 Documentation

- **Setup Guide:** See `SETUP_AND_STATUS.md` for detailed walkthrough
- **CLAUDE.md:** Original system design (for reference)
- **Database Schema:** `supabase_schema.sql` with helpful queries

---

## 🐛 Troubleshooting

**"Missing SUPABASE_URL"**
- Check .env file has all required variables
- Make sure URL starts with `https://`

**"TheirStack API error 401"**
- Check API key in .env
- Verify key isn't expired

**"Relation 'companies' does not exist"**
- Run supabase_schema.sql in SQL editor

**"No drafts generated"**
- Check `buyers` and `evidence` tables have rows
- Verify OpenAI API key works
- Check `api_logs` for errors

---

## 📞 Support

For issues:
1. Check `api_logs` table for error details
2. Review console output for stack traces
3. Verify environment variables are set
4. Check API provider dashboards for rate limits

---

## ⚖️ License

Custom system built for CirrusLabs. Do not redistribute.

---

**Ready to go!** Start with `npm run dev` and check `SETUP_AND_STATUS.md` for detailed setup steps.
