# CirrusLabs - Agentic Claude Bot System

**System Type:** Agent-based (not workflow-based)
**Architecture:** 6 Sequential Skills reading context files
**Status:** ✅ Complete MVP

---

## System Overview

This is a **signal-driven outbound campaign automation system** for CirrusLabs's staffing business.

**Core Principle:** Experts encode their knowledge in markdown context files. The agent system reads those files and adapts intelligently to each offer and campaign.

Instead of:
- Static workflows (like Clay)
- Manual configuration every time
- Generic outreach

This system:
- Reads your ICP framework
- Reads your email principles
- Reads your signal strategy
- Adapts to each campaign automatically
- Improves itself through learnings

---

## The 6 Skills

### Skill 1: New Offer (File-based, no cost)
**Input:** Offer name ("Talent As A Service - US")
**Process:** Walk through 13-section positioning canvas
**Output:** `offers/{slug}/positioning.md` + database record
**Command:** `npm run skill:1`

### Skill 2: Campaign Strategy (File-based, no cost)
**Input:** Offer slug + signal hypothesis
**Process:** Design signal targeting strategy, choose messaging framework
**Output:** `offers/{slug}/campaigns/{campaign}/strategy.md` + database record
**Command:** `npm run skill:2`

### Skill 3: Campaign Copy (LLM cost ~$0.50)
**Input:** Offer slug + campaign slug
**Process:** Generate 3 email variants + 3 LinkedIn variants using OpenAI, guided by email-principles.md
**Output:** Markdown files in `offers/{slug}/campaigns/{campaign}/copy/`
- `email-variants.md` — 3 email variants with subject + body
- `linkedin-variants.md` — 3 LinkedIn DM variants
- `personalization-notes.md` — placeholder reference guide
**Command:** `npm run skill:3 -- {offer-slug} {campaign-slug}`

### Skill 4: Find Leads (API cost ~$2-5)
**Input:** Offer slug + campaign slug
**Process:**
  1. Call Apollo.io → Search companies by hiring signals (10 engineering roles)
  2. Score against ICP — skip enriching non-matches (saves credits)
  3. Call Apollo.io → Find decision-makers for qualifying companies
  4. Deduplicate by email + domain
  5. Store companies + contacts in database
**Output:** `offers/{slug}/campaigns/{campaign}/leads/all_leads.csv`
- Combined format: company_name, domain, hiring_signal, first_name, last_name, title, email, linkedin_url
**Command:** `npm run skill:4 -- {offer-slug} {campaign-slug}`

### Skill 5: Launch Outreach (File-based, no cost)
**Input:** Offer slug + campaign slug
**Process:** Load copy variants + leads CSV, auto-replace placeholders, export for Apollo sequences
**Output:** `offers/{slug}/campaigns/{campaign}/outreach/messages.csv`
- Placeholders replaced automatically: [Company Name], [First Name], [role], etc.
**Command:** `npm run skill:5 -- {offer-slug} {campaign-slug}`

### Skill 6: Campaign Review (Analysis, no cost)
**Input:** Campaign results (manual input from Apollo analytics)
**Process:** Analyze metrics, calculate reply/meeting/buyer rates, identify winners, update learnings
**Output:** `offers/{slug}/campaigns/{campaign}/results/learnings.md` + updated `context/learnings/what-works.md`
**Command:** `npm run skill:6 -- {offer-slug} {campaign-slug}`

---

## How to Run a Campaign (End-to-End)

```bash
# 1. Create offer positioning
npm run skill:1
# → Prompts interactively through 13-section canvas
# → Output: offers/talent-as-service-us/positioning.md

# 2. Design campaign strategy
npm run skill:2
# → Prompts for signal hypothesis + messaging framework
# → Output: offers/.../campaigns/hiring-data-engineers/strategy.md

# 3. Generate email & LinkedIn copy
npm run skill:3 -- talent-as-service-us hiring-data-engineers
# → Output: copy/email-variants.md, linkedin-variants.md, personalization-notes.md

# 4. Find leads via Apollo.io (COSTS ~$2-5 in API credits)
npm run skill:4 -- talent-as-service-us hiring-data-engineers
# → WARNING: Calls Apollo API, consumes credits
# → Output: leads/all_leads.csv (company + contact in one row)

# 5. Build outreach messages (auto-personalizes placeholders)
npm run skill:5 -- talent-as-service-us hiring-data-engineers
# → Output: outreach/messages.csv (ready for Apollo sequences)

# 6. Upload to Apollo sequences
# → Go to Apollo → Sequences → Create sequence
# → Import messages.csv
# → Launch campaign
# → Wait 7-14 days for results

# 7. Analyze results
npm run skill:6 -- talent-as-service-us hiring-data-engineers
# → Input: Reply count, meetings, closed deals, feedback
# → Output: results/learnings.md + updated what-works.md
```

---

## Context Files (Your Expertise)

All skills read from `/context/`:

### Frameworks
- `frameworks/icp-framework.md` — Who you target, scoring rules, disqualifiers
- `frameworks/positioning-canvas.md` — 13-section positioning template
- `frameworks/signal-generation-guide.md` — Signal hierarchy, Apollo query mapping, freshness rules
- `frameworks/signal-brainstorming-template.md` — Template for new campaign signal design
- `frameworks/contact-finding-guide.md` — Decision-maker discovery strategy

### Copywriting
- `copywriting/email-principles.md` — Subject lines, body structure, CTAs (injected into Skill 3 prompts)
- `copywriting/linkedin-principles.md` — CEO account safety, DM strategy

### Principles
- `principles/permissionless-value.md` — Value-first outreach checklist
- `principles/use-case-driven.md` — Use-case mapping per hiring role
- `principles/mistakes-to-avoid.md` — 17 specific mistakes to avoid

### API Guides
- `api-guides/apollo-capabilities-guide.md` — Apollo feature map, data quality notes, setup
- `api-guides/apollo-api-guide.md` — Endpoints, rate limits, error handling
- `api-guides/openai-api-guide.md` — Prompt structure, output format, cost
- `api-guides/supabase-guide.md` — Tables, setup, useful queries

### Learnings
- `learnings/what-works.md` — Campaign results (grows over time, informs future copy)

---

## Database Schema

All stored in Supabase:

| Table | Purpose |
|-------|---------|
| `offers` | Offer definitions + positioning |
| `companies` | Discovered companies + ICP scores |
| `evidence` | Hiring signals (job posts, funding events) |
| `contacts` | Decision-makers (CTOs, VPs, Eng Managers) |
| `campaigns` | Campaign strategies + status |
| `campaign_companies` | Which companies are in which campaigns |
| `message_variants` | Email/LinkedIn copy variants per campaign |
| `messages` | Sent messages + tracking status |
| `tool_usage` | API cost tracking per tool call |

Migration file: `supabase/migrations/001_apollo_gtm_schema.sql`

---

## The Flywheel

```
Campaign 1 runs
  ↓
Skill 6 analyzes results
  ↓
Updates context/learnings/what-works.md
  ↓
Campaign 2 reads updated learnings
  ↓
Skills 1-3 adapt based on what worked
  ↓
Campaign 2 performs better
  ↓
...repeat
```

Each iteration gets smarter.

---

## API Clients (Already Built)

| Client | File | Purpose |
|--------|------|---------|
| Apollo.io | `src/lib/clients/apollo.ts` | Company search, contact discovery, sequences, analytics |
| OpenAI | `src/lib/clients/openai.ts` | Email + LinkedIn copy generation (Skill 3) |
| Supabase | `src/lib/supabase.ts` | Database client + TypeScript types |

All clients:
- ✅ TypeScript typed
- ✅ Error handling + retries
- ✅ Cost logging to `tool_usage` table
- ✅ Deduplication-safe

**Apollo.io is the single platform**: replaces TheirStack (hiring signals) + Hunter.io/Parallel (contacts) + Instantly (sequences + analytics)

---

## File Organization

```
CirrusLabs/
├── context/                          ← Your expertise (14 files)
│   ├── frameworks/                   (icp, positioning-canvas, signal-guide, signal-template, contact-finding)
│   ├── copywriting/                  (email-principles, linkedin-principles)
│   ├── principles/                   (permissionless-value, use-case-driven, mistakes-to-avoid)
│   ├── api-guides/                   (apollo-capabilities, apollo-api, openai-api, supabase)
│   └── learnings/
│       └── what-works.md             ← Grows with each campaign
│
├── offers/                           ← Per-offer + per-campaign data
│   └── {offer-slug}/
│       ├── positioning.md            (Skill 1 output)
│       └── campaigns/
│           └── {campaign-slug}/
│               ├── strategy.md       (Skill 2 output)
│               ├── copy/             (Skill 3 output)
│               │   ├── email-variants.md
│               │   ├── linkedin-variants.md
│               │   └── personalization-notes.md
│               ├── leads/            (Skill 4 output)
│               │   └── all_leads.csv
│               ├── outreach/         (Skill 5 output)
│               │   └── messages.csv
│               └── results/          (Skill 6 output)
│                   └── learnings.md
│
├── src/
│   ├── lib/
│   │   ├── clients/
│   │   │   ├── apollo.ts             ← Primary platform (company + contact search)
│   │   │   └── openai.ts             ← Copy generation
│   │   ├── db/
│   │   │   ├── companies.ts
│   │   │   ├── contacts.ts           ← replaces buyers.ts
│   │   │   └── evidence.ts
│   │   ├── services/
│   │   │   ├── scoring.ts            ← ICP scoring (threshold: 170 pts)
│   │   │   ├── deduplication.ts      ← Email + domain dedup
│   │   │   ├── personalization.ts    ← Placeholder replacement
│   │   │   ├── campaign-metrics.ts   ← Rate computation
│   │   │   ├── csv-export.ts         ← CSV building
│   │   │   └── logging.ts            ← Console + DB logging
│   │   └── supabase.ts               ← Client + TypeScript types
│   │
│   ├── types/                        ← Shared TypeScript interfaces
│   │   ├── offer.ts, company.ts, contact.ts, campaign.ts
│   │   ├── message.ts, metrics.ts, api.ts
│   │
│   ├── core/
│   │   └── skills/                   ← 6 Skill implementations
│   │       ├── skill-1-new-offer.ts
│   │       ├── skill-2-campaign-strategy.ts
│   │       ├── skill-3-campaign-copy.ts
│   │       ├── skill-4-find-leads.ts
│   │       ├── skill-5-launch-outreach.ts
│   │       └── skill-6-campaign-review.ts
│   │
│   ├── scripts/
│   │   └── seed-context.ts           ← Validates context files exist
│   │
│   └── app/api/                      ← Next.js API stubs (future web UI)
│       ├── offers/route.ts
│       ├── campaigns/route.ts
│       ├── leads/route.ts
│       ├── copy/route.ts
│       └── review/route.ts
│
├── scripts/                          ← Entry points (npm run skill:N)
│   └── run-skill-{1-6}-*.ts
│
├── supabase/
│   └── migrations/
│       └── 001_apollo_gtm_schema.sql ← Full DB schema
│
├── package.json
├── .env                              ← Copy from .env.example
├── .env.example                      ← All required vars documented
└── CLAUDE.md                         ← This file
```

---

## Configuration & Customization

### Target Roles (in context/frameworks/signal-generation.md)
Change to match your hiring needs:
```
Data Engineer, ML Engineer, Cloud Architect, Software Engineer
```

### ICP (in context/frameworks/icp-framework.md)
Define your ideal customer:
```
- Startups: Series A+ ($20M+)
- SMBs: 50-1000 employees
- Enterprises: 1000+
```

### Email Principles (in context/copywriting/email-principles.md)
Your winning email patterns:
```
- No generic filler
- Reference signal directly
- Short (100-150 words)
```

### Positioning (in context/frameworks/positioning-canvas.md)
13 sections that define your offer:
```
Category, Target, Problem, Why Now, Alternative, Success Signal,
Value Prop, Differentiators, Sales Model, Objections, GTM, Pricing, Proof
```

---

## Cost Breakdown

### Free
- Skill 1: New Offer ($0)
- Skill 2: Campaign Strategy ($0)
- Skill 3: Campaign Copy (~$0.50 OpenAI)
- Skill 5: Build outreach CSV ($0)
- Skill 6: Review + learnings ($0)

### Apollo Credits (Skill 4)
- Company search: ~1 credit per result
- Contact enrichment: ~1 credit per contact
- Email verification: included in Apollo plan
- **Estimated: 200-500 credits per campaign** (varies by plan)

**Total per full campaign:** ~$2-5 in Apollo credits + $0.50 OpenAI

### Cost Optimization Rules
1. Score companies against ICP BEFORE enriching contacts (saves credits)
2. ICP threshold: 170 pts — don't enrich below this
3. Search 10 roles in one skill run (bulk, not one-by-one)
4. Only contact decision-makers (CTO, VP Eng, Eng Manager) — not all employees

---

## Safety & Best Practices

### LinkedIn Safety
- ✅ Email outreach primary (safest)
- ✅ LinkedIn is secondary (manual CEO sending only)
- ✅ Never automate LinkedIn DMs (account ban risk)
- ✅ Max 5-10 LinkedIn actions per day
- ❌ No copy-paste identical messages
- ❌ No mass connection spamming

### Email Safety
- ✅ Apollo verifies emails automatically (use `email_status: 'verified'` filter)
- ✅ Respect business hours (9am-5pm recipient time)
- ✅ Monitor bounce rate (<5%)
- ✅ Stagger sends (5-10 per hour via Apollo sequences)
- ❌ Don't send generic emails — signals must be referenced
- ❌ Don't blast same message everywhere

### Deduplication
- Don't email same person twice — `contacts` table tracks by email
- Don't contact same company too much — max 2-3 people per company
- `campaign_companies` table tracks which companies are already in a campaign

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill 1 won't run | Check `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in .env |
| Skill 2 won't find positioning | Run Skill 1 first, check `offers/{slug}/positioning.md` exists |
| Skill 3 copy fails | Check `OPENAI_API_KEY` has credits; check `email-principles.md` exists |
| Skill 4 leads fails | Check `APOLLO_API_KEY`; check Apollo account has remaining credits |
| CSV exports are empty | Check Skill 4 ran successfully; check contacts table has rows |
| Database errors | Verify migration applied: `supabase/migrations/001_apollo_gtm_schema.sql` |
| contacts table missing | Run migration in Supabase dashboard SQL editor |
| tool_usage table missing | Run migration (replaces old api_logs table) |

---

## Key Principles

1. **Context is Everything** - System is as good as your framework files
2. **Signals Must Be Observable** - Every signal must map to an API
3. **Test Before Scaling** - Skills 1-3 are free, Skills 4+ cost money
4. **Measure Everything** - Database logs track costs, results track ROI
5. **Iterate Fast** - Each campaign improves based on learnings
6. **Humans in Control** - No auto-sending, manual approval always

---

## Deployment Options

### Option 1: Local Development (Current)
- Run Skills on your laptop
- `npm run skill:1` through `skill:6`
- Manual initiation each time

### Option 2: Scheduled Agent (Future)
- Migrate to Claude Agent SDK
- Run autonomously on schedule
- Skill 1-6 trigger automatically
- Results email to you nightly

### Option 3: Cloud Deployment (Future)
- Host on AWS/GCP/Azure
- Trigger via API or webhook
- Full automation with monitoring
- Alert on campaign milestones

---

## Getting Started

### Pre-Skill 1 Checklist
- [ ] Customize context files (icp-framework.md, email-principles.md, etc.)
- [ ] Create Supabase project
- [ ] Import database schema from supabase_schema.sql

### Pre-Skill 4 Checklist
- [ ] All API keys in .env (TheirStack, Parallel, OpenAI)
- [ ] Supabase connected and tested
- [ ] Campaign strategy written (Skill 2 output)
- [ ] ICP defined and saved

### Pre-Skill 5 Checklist
- [ ] Copy variants generated (Skill 3 output)
- [ ] Leads found and verified (Skill 4 output)
- [ ] Sales engagement platform set up (Instantly recommended)

---

## Next Steps

1. ✅ System built and ready
2. ⏳ Verify Supabase setup
3. ⏳ Test Skill 1 (New Offer)
4. ⏳ Test Skill 2 (Campaign Strategy)
5. ⏳ Test Skill 3 (Copy generation)
6. ⏳ Run Skill 4 with small budget ($5 test)
7. ⏳ Launch to Instantly
8. ⏳ Run Skill 6 after 2 weeks
9. ⏳ Iterate based on learnings

---

## Support & Documentation

- **README.md** - Quick overview
- **AGENTIC_SYSTEM_READY.md** - Full explanation
- **RESTRUCTURING_PROGRESS.md** - What was built
- `/context/` - All expertise frameworks (read to understand system)

---

## Key Files to Know

### Most Important
- `context/frameworks/icp-framework.md` - Define who you're targeting
- `context/copywriting/email-principles.md` - Define what works
- `context/learnings/what-works.md` - Results from campaigns (grows over time)

### Implementation
- `src/core/skills/` - The 6 Skills (agentic logic)
- `src/lib/clients/` - API integrations
- `src/lib/db/` - Database operations

### Execution
- `scripts/run-skill-*.ts` - Entry points
- `package.json` - npm run skill:1-6

---

## The Vision

This system turns **static campaigns into learning systems**.

Traditional outbound:
- Build list → Send email → Hope → Repeat

This system:
- Define ICP → Detect signals → Generate copy → Find leads → Send → Measure → Learn → Update ICP → Repeat (better)

Each iteration improves because the system learns from previous results.

That's the agentic advantage.

---

**Status:** ✅ Complete and Ready
**Time to Campaign:** 30 minutes (Skills 1-6)
**Time to Results:** 2 weeks (wait for replies)
**Improvement:** Measurable in 3-5 campaigns

Let's go.
