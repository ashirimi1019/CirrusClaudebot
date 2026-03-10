# CirrusLabs - Agentic Claude Bot System

**System Type:** Agent-based (not workflow-based)
**Architecture:** 6 Sequenti Skills reading context files
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
**Process:** Generate 2-3 email variants + 2-3 LinkedIn variants using OpenAI
**Output:** Text files in `offers/{slug}/campaigns/{campaign}/copy/`
**Command:** `npm run skill:3`

### Skill 4: Find Leads (API cost $2-5)
**Input:** Offer slug + campaign slug
**Process:**
  1. Call TheirStack → Find companies with hiring signals
  2. Score against ICP (cost-optimize: don't enrich non-matches)
  3. Call Parallel → Find decision-makers
  4. Deduplicate emails
  5. Store in database
**Output:** CSVs in `offers/{slug}/campaigns/{campaign}/leads/`
**Command:** `npm run skill:4`

### Skill 5: Launch Outreach (File-based, no cost)
**Input:** Offer slug + campaign slug
**Process:** Load copy variants + contacts, personalize, export for Instantly
**Output:** `messages.csv` ready for sales platform upload
**Command:** `npm run skill:5`

### Skill 6: Campaign Review (Analysis, no cost)
**Input:** Campaign results (manual input from Instantly/tracker)
**Process:** Analyze metrics, calculate reply rate, identify winners, update learnings
**Output:** `learnings.md` + updated `context/learnings/what-works.md`
**Command:** `npm run skill:6`

---

## How to Run a Campaign (End-to-End)

```bash
# 1. Create offer positioning
npm run skill:1
# → Input: "Talent As A Service - US"
# → Output: offers/talent-as-service-us/positioning.md

# 2. Design campaign strategy
npm run skill:2
# → Input: "talent-as-service-us", "hiring-data-engineers"
# → Output: offers/.../campaigns/hiring-data-engineers/strategy.md

# 3. Generate email & LinkedIn copy
npm run skill:3
# → Input: offer slug, campaign slug
# → Output: copy/email-variant-{1-3}.txt, linkedin-variant-{1-3}.txt

# 4. Find leads (COSTS MONEY ~$2-5)
npm run skill:4
# → WARNING: Calls APIs, will charge your accounts
# → Output: leads/companies.csv, leads/contacts.csv

# 5. Create outreach messages
npm run skill:5
# → Input: leads CSVs + copy variants
# → Output: outreach/messages.csv

# 6. Upload to Instantly
# → Download messages.csv
# → Import into Instantly
# → Launch campaign
# → Wait 7-14 days for results

# 7. Analyze results
npm run skill:6
# → Input: Reply count, meetings, closed deals, feedback
# → Output: learnings.md + updated what-works.md
```

---

## Context Files (Your Expertise)

All skills read from `/context/`:

### Frameworks
- **icp-framework.md** - Who you target, scoring rules, disqualifiers
- **signal-generation.md** - What signals matter, why, how to detect
- **api-routing-guide.md** - Which API for each signal, cost optimization
- **positioning-canvas.md** - 13-section positioning template
- **contact-finding-guide.md** - Decision-maker discovery strategy

### Copywriting
- **email-principles.md** - Subject lines, body structure, CTAs
- **linkedin-principles.md** - CEO account safety, DM strategy

### Learnings
- **what-works.md** - Campaign results (fills over time, informs future campaigns)

---

## Database Schema (5 Tables)

All stored in Supabase:

| Table | Purpose |
|-------|---------|
| `offers` | Offer definitions + positioning |
| `companies` | Discovered companies + signals |
| `evidence` | Hiring signals (job posts, funding, etc.) |
| `buyers` | Decision-makers (CTOs, VPs, etc.) |
| `campaigns` | Campaign strategies + copy variants |
| `campaign_contacts` | Which contacts in which campaigns |
| `drafts` | Email drafts + status (pending/approved/rejected) |
| `api_logs` | Cost tracking + API calls |

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

Ready to use:

- **TheirStack** (`lib/clients/theirstack.ts`) - Job posting search
- **Parallel** (`lib/clients/parallel.ts`) - Company + people discovery
- **OpenAI** (`lib/clients/openai.ts`) - Draft generation
- **Supabase** (`lib/supabase.ts`) - Database + types

All have:
- ✅ Proper TypeScript typing
- ✅ Error handling
- ✅ API logging for cost tracking
- ✅ Deduplication rules

---

## File Organization

```
career-source-group/
├── context/                          ← Your expertise (8 files)
│   ├── frameworks/ (5 files)
│   ├── copywriting/ (2 files)
│   └── learnings/ (1 file)
│
├── offers/                           ← Per-campaign data
│   └── {offer-slug}/
│       ├── positioning.md            (Skill 1 output)
│       ├── campaigns/
│       │   └── {campaign-slug}/
│       │       ├── strategy.md       (Skill 2 output)
│       │       ├── copy/             (Skill 3 output)
│       │       ├── leads/            (Skill 4 output)
│       │       └── outreach/         (Skill 5 output)
│       └── results/
│           └── {campaign}-learnings.md (Skill 6 output)
│
├── src/
│   ├── lib/
│   │   ├── clients/ (API integrations)
│   │   ├── db/ (Database modules)
│   │   └── supabase.ts (Client + types)
│   │
│   └── core/
│       └── skills/ (6 Skill implementations)
│           ├── skill-1-new-offer.ts
│           ├── skill-2-campaign-strategy.ts
│           ├── skill-3-campaign-copy.ts
│           ├── skill-4-find-leads.ts
│           ├── skill-5-launch-outreach.ts
│           └── skill-6-campaign-review.ts
│
├── scripts/ (Entry points)
│   ├── run-skill-1-new-offer.ts
│   ├── run-skill-2-campaign-strategy.ts
│   ├── run-skill-3-campaign-copy.ts
│   ├── run-skill-4-find-leads.ts
│   ├── run-skill-5-launch-outreach.ts
│   └── run-skill-6-campaign-review.ts
│
├── supabase_schema.sql (Database schema)
├── package.json (CLI scripts)
├── .env (Environment variables)
└── CLAUDE.md (Original - this is updated version)
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

### Free (Phases 1-3)
- Skill 1: New Offer ($0)
- Skill 2: Campaign Strategy ($0)
- Skill 3: Campaign Copy (~$0.50 OpenAI)

### Costs Money (Phase 4+)
- **Skill 4: Find Leads** ($2-5 per campaign)
  - TheirStack: $0.20-0.50 per search
  - Parallel: $0.10-0.50 per company
  - Leadmagic: $0.50-2.00 per email verification
- **Skill 5:** Free (just export)
- **Skill 6:** Free (just analysis)

**Total per full campaign:** $2.50-5.50

### Cost Optimization Rules
1. Check ICP fit BEFORE enriching (ICP check = free, enrichment = $$)
2. Only enrich companies scoring 170+ points
3. Batch searches (5 roles at once, not one per role)
4. Verify emails only for final contacts (not everyone)

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
- ✅ Verify emails before sending (Leadmagic)
- ✅ Respect business hours (9am-5pm recipient time)
- ✅ Monitor bounce rate (<5%)
- ✅ Stagger sends (5-10 per hour, not 100)
- ❌ Don't send generic emails
- ❌ Don't blast same message everywhere

### Deduplication
- Don't email same person twice (track by email)
- Don't email same company too much (max 2-3 people)
- Check campaign_contacts table before adding

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill 1 won't run | Make sure Supabase is set up and .env has credentials |
| Skill 2 won't find positioning | Run Skill 1 first, check offers/ directory |
| Skill 3 (copy) fails | Check OpenAI API key and account has credits |
| Skill 4 (leads) fails | Check all API keys (TheirStack, Parallel); warn about costs |
| CSV exports are empty | Check that Skill 4 found companies and buyers |
| Database errors | Verify Supabase schema imported correctly |

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
- **SETUP_AND_STATUS.md** - Original setup (outdated, keep for reference)
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
**Time to Campaign:** 30 minutes (Skill 1-6)
**Time to Results:** 2 weeks (wait for replies)
**Improvement:** Measurable in 3-5 campaigns

Let's go.
