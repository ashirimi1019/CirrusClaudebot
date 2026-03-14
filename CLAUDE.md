# CirrusLabs — Signal-Driven Outbound Automation

**Stack:** TypeScript · Next.js (frontend) · Supabase · Apollo.io · OpenAI
**Deployment:** https://cirrus-claudebot.vercel.app
**GitHub:** https://github.com/ashirimi1019/CirrusClaudebot

---

## primer.md — Read This First

> **`primer.md` is the living memory of this project.** Read it before making any changes. Update it after every change.

**Rules:**
1. **Read `primer.md` before any changes** — latest architecture, vertical status, known limitations, change history
2. **Update `primer.md` after every change** — code, schema, config, UI, prompts
3. `primer.md` supersedes all other docs when there's a conflict

---

## System Overview

Signal-driven outbound campaign automation for CirrusLabs's staffing/consulting business.

**Core loop:** Define ICP → Detect signals → Generate copy → Find leads → Send → Measure → Learn → Repeat (better)

Expert knowledge lives in `.md` files under `context/`. The 6 skills read those files and adapt intelligently to each offer and campaign.

---

## The 6 Skills

| Skill | Command | Cost | Output |
|-------|---------|------|--------|
| 1 — New Offer | `npm run skill:1` | Free | `offers/{slug}/positioning.md` + DB record |
| 2 — Campaign Strategy | `npm run skill:2` | Free | `offers/{slug}/campaigns/{campaign}/strategy.md` + DB record |
| 3 — Campaign Copy | `npm run skill:3 -- {offer} {campaign}` | ~$0.50 OpenAI | `copy/email-variants.md`, `linkedin-variants.md`, `personalization-notes.md` |
| 4 — Find Leads | `npm run skill:4 -- {offer} {campaign}` | ~$2-5 Apollo | `leads/all_leads.csv` (company+contact per row) |
| 5 — Launch Outreach | `npm run skill:5 -- {offer} {campaign}` | Free | Apollo sequences created; `outreach/messages.csv` |
| 6 — Campaign Review | `npm run skill:6 -- {offer} {campaign}` | Free | `results/learnings.md` + updated `what-works.md` |

### End-to-End Campaign

```bash
npm run skill:1                                                      # Create offer (interactive)
npm run skill:2                                                      # Campaign strategy (interactive)
npm run skill:3 -- talent-as-service-us hiring-data-engineers       # Generate copy
npm run skill:4 -- talent-as-service-us hiring-data-engineers       # Find leads (costs Apollo credits)
npm run skill:5 -- talent-as-service-us hiring-data-engineers       # Launch to Apollo sequences
npm run skill:6 -- talent-as-service-us hiring-data-engineers       # Review + update learnings
```

---

## Frontend (Dashboard)

```bash
cd frontend && npm run dev          # Dev server — http://localhost:3000
cd frontend && npm run build        # Production build
cd frontend && npx tsc --noEmit     # TypeScript check — MUST pass before committing
```

**Dashboard:** http://localhost:3000/dashboard
**Vercel:** https://cirrus-claudebot.vercel.app

---

## Database Schema

**Supabase** — 7 migrations applied (`supabase/migrations/001` through `007`):

| Table | Purpose |
|-------|---------|
| `offers` | Offer definitions + positioning; `default_vertical_id` FK, `allowed_countries/states` |
| `companies` | Discovered companies + ICP scores |
| `evidence` | Hiring signals |
| `contacts` | Decision-makers — UNIQUE on email |
| `campaigns` | Strategies + status; `vertical_id` FK, `allowed_countries/states` |
| `campaign_companies` | Company ↔ campaign membership |
| `message_variants` | Email/LinkedIn copy per campaign |
| `messages` | Sent messages + tracking |
| `tool_usage` | API cost tracking per call |
| `skill_runs` | Skill execution history + SSE log lines |
| `verticals` | 3 verticals: staffing, ai-data-consulting, cloud-software-delivery |
| `company_intelligence` | OpenAI classification per company |
| `contact_intelligence` | Contact-level segment assignment |
| `segment_summaries` | Per-campaign segment rollups |
| `campaign_sequences` | Apollo sequences — UNIQUE(campaign_id, segment_key) |

**RLS:** Disabled — anon key can read all tables.

---

## Context Files (Your Expertise)

All skills read from `context/`:

```
context/
  frameworks/      icp-framework.md, positioning-canvas.md, signal-generation-guide.md,
                   signal-brainstorming-template.md, contact-finding-guide.md
  copywriting/     email-principles.md, linkedin-principles.md
  principles/      permissionless-value.md, use-case-driven.md, mistakes-to-avoid.md
  api-guides/      apollo-capabilities-guide.md, apollo-api-guide.md, openai-api-guide.md, supabase-guide.md
  learnings/       what-works.md  ← grows with each campaign
  verticals/       staffing/, ai-data-consulting/, cloud-software-delivery/  (8 .md files each)
```

---

## Vertical System

3 verticals supported: **staffing**, **ai-data-consulting**, **cloud-software-delivery**

- Playbooks: 8 `.md` files each under `context/verticals/{slug}/` (overview, icp, buyers, signals, scoring, messaging, objections, proof-points)
- Resolution: `campaign.vertical_id ?? offer.default_vertical_id`
- Entry point: `buildSkillContext(skillId, offerId, campaignId?)` in `src/lib/verticals/`
- All 6 skills call `buildSkillContext()` — appends vertical context to prompts/files
- **Scoring is still hardcoded** in `scoring.ts` — vertical `scoring.md` is informational only, not programmatically applied

---

## Geography Filtering (Skill 4)

- Default allowed scope: **Americas** — United States, Canada, Mexico, Brazil, Argentina, Chile, Colombia, Peru, Uruguay
- Singapore, India, UK, Australia, and other out-of-scope countries are logged as `[GEOGRAPHY REJECT]` and excluded **before** contact enrichment (saves Apollo credits)
- Override per offer or campaign via `allowed_countries` + `allowed_us_states` DB columns (migration 007)
- Resolution: `campaign.allowed_countries ?? offer.allowed_countries ?? DEFAULT_ALLOWED_COUNTRIES`
- All geography logic in `src/lib/services/geography.ts` — no other file should hardcode country lists
- **Frontend UI not yet built** — set overrides directly in Supabase if needed

---

## File Organization

```
├── context/                     ← Expert knowledge (.md files — edit these to tune the system)
├── offers/                      ← Per-offer + per-campaign outputs
│   └── {offer-slug}/
│       ├── positioning.md
│       └── campaigns/{campaign-slug}/
│           ├── strategy.md
│           ├── copy/            email-variants.md, linkedin-variants.md, personalization-notes.md
│           ├── leads/           all_leads.csv
│           ├── outreach/        messages.csv
│           └── results/         learnings.md
│
├── src/
│   ├── core/skills/             skill-1 through skill-6 (core agentic logic)
│   ├── lib/
│   │   ├── clients/             apollo.ts, openai.ts
│   │   ├── db/                  companies.ts, contacts.ts, evidence.ts
│   │   ├── services/            scoring.ts, geography.ts, deduplication.ts,
│   │   │                        personalization.ts, intelligence.ts, csv-export.ts
│   │   ├── verticals/           types.ts, loader.ts, resolver.ts, context-builder.ts, index.ts
│   │   └── supabase.ts
│   └── types/                   offer.ts, company.ts, contact.ts, campaign.ts, message.ts, metrics.ts, api.ts
│
├── frontend/                    ← Next.js dashboard (separate npm workspace)
│   └── src/
│       ├── app/dashboard/       offers/, campaigns/, companies/, contacts/, analytics/
│       ├── app/api/skills/      SSE skill runner endpoints
│       ├── components/          VerticalSelect.tsx, shared UI
│       └── lib/                 supabase.ts (browser client), useSkillRunner.ts
│
├── scripts/                     run-skill-{1-6}-*.ts (entry points)
├── supabase/migrations/         001 through 007
├── .env                         copy from .env.example
└── primer.md                    ← Living project memory (authoritative)
```

---

## API Clients

| Client | File | Purpose |
|--------|------|---------|
| Apollo.io | `src/lib/clients/apollo.ts` | Company search, contact discovery, sequences, enrollment |
| OpenAI | `src/lib/clients/openai.ts` | Copy generation (Skill 3), company classification (Skill 5) |
| Supabase | `src/lib/supabase.ts` | DB client — service role for API routes, anon key for browser |

**Apollo.io is the single platform** — company search + contact enrichment + sequences + analytics.

---

## Frontend Architecture

### Data Layer Split
- CLI skills write to **filesystem** (`offers/{slug}/...`) — DB records may or may not exist
- Dashboard list pages query **Supabase directly** from browser (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Campaign detail **Pipeline tab** uses server-side `/api/skills/status` (checks filesystem)
- Campaign detail **other tabs** (Leads, Copy, Intelligence, Results) use browser-side Supabase — require DB records
- If offers/campaigns list is empty but direct URLs work → DB is empty, not a frontend bug

### Key Frontend Files
- `frontend/src/lib/supabase.ts` — Browser Supabase client (singleton, anon key)
- `frontend/src/lib/useSkillRunner.ts` — Shared SSE skill runner hook
- `frontend/src/components/VerticalSelect.tsx` — Shared vertical dropdown (loads active verticals from DB)
- `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` — Campaign detail (~1800 lines); has local `useCampaignSkillRunner` hook — changes to shared hook must be mirrored here

---

## Gotchas & Non-Obvious Patterns

### TypeScript
- **~60 pre-existing TS errors** exist in `src/core/skills/*.ts` — caused by `.ts` extension imports + top-level await ESM patterns. These pre-date current work; do NOT treat as regressions when you see them.
- `cd frontend && npx tsc --noEmit` — frontend must stay at **0 errors** before every commit

### Supabase
- PostgREST `.single()` returns HTTP 406 when 0 rows match — caught silently by try/catch in frontend
- RLS is disabled — anon key can read/write all tables
- FK join in PostgREST: `.select('default_vertical_id, verticals(name)')` — no alias hint needed for single FK

### Vertical Inheritance
- Resolution: `campaign.vertical_id ?? offer.default_vertical_id`
- Empty string `""` from frontend forms → coerced to `null` by `|| null` in skill upserts → prevents FK violation
- `VerticalSelect` with `showInherit={true}` = "Inherit from offer" as blank option

### Geography
- All geography logic in `src/lib/services/geography.ts` — single source of truth
- Default scope is Americas — SG/IN/UK excluded unless you set `allowed_countries` on the offer/campaign in Supabase

### Cost Optimization (Skill 4)
- Companies are **ICP-scored BEFORE contact enrichment** — threshold 170 pts; below-threshold companies never enriched (saves Apollo credits)
- Geography rejection also runs before enrichment for the same reason

---

## Environment Variables

```bash
# Required — CLI skills
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APOLLO_API_KEY=
OPENAI_API_KEY=

# Required — Frontend
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional (used by some analytics features)
SUPABASE_ANON_KEY=
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill 1 won't run | Check `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in .env |
| Skill 2 won't find positioning | Run Skill 1 first; check `offers/{slug}/positioning.md` exists |
| Skill 3 copy fails | Check `OPENAI_API_KEY` has credits; check `email-principles.md` exists |
| Skill 4 leads fails | Check `APOLLO_API_KEY`; check Apollo account has remaining credits |
| Skill 4 returns 0 results | Geography filter may be excluding all companies — check `[GEOGRAPHY REJECT]` logs |
| CSV exports empty | Check Skill 4 ran successfully; check contacts table has rows |
| Database errors | Run all 7 migrations (001–007) in Supabase SQL editor |
| Frontend shows empty lists | DB is empty — run Skills 1-4 first via CLI or dashboard |
| TypeScript errors in skills/ | ~60 pre-existing errors are expected; only fix errors in `frontend/` |

---

## Pre-Launch Checklists

### Before Skill 1
- [ ] Customize `context/frameworks/icp-framework.md` and `context/copywriting/email-principles.md`
- [ ] Create Supabase project; run all 7 migrations
- [ ] Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Before Skill 4 (costs money)
- [ ] `APOLLO_API_KEY` set with sufficient credits (~200-500 per campaign)
- [ ] Skills 1-3 complete (positioning + strategy + copy exist)
- [ ] ICP defined in `context/frameworks/icp-framework.md`

### Before Skill 5
- [ ] Skill 3 output exists (`copy/email-variants.md`)
- [ ] Skill 4 output exists (`leads/all_leads.csv` with contacts)

---

## Safety

### Email
- Apollo verifies emails automatically — use `email_status: 'verified'` filter
- Monitor bounce rate (<5%); stagger sends 5-10/hour via Apollo sequences
- Never blast same generic message — signals must be referenced

### LinkedIn
- Manual only — never automate LinkedIn DMs (account ban risk)
- Max 5-10 LinkedIn actions per day via CEO account

### Deduplication
- `contacts(email)` UNIQUE constraint prevents duplicate enrichment
- `campaign_sequences(campaign_id, segment_key)` UNIQUE prevents duplicate sequences
- `campaign_companies` tracks which companies are in each campaign
