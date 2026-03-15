# CirrusLabs GTM System — Primer

> **This is the living memory of the project.** Read this before making any changes. Update it after every change.

---

## Project Purpose

Signal-driven outbound campaign automation for CirrusLabs's staffing/consulting business. Experts encode knowledge in markdown context files; an agent system reads those files and adapts intelligently to each offer and campaign.

**Core loop:** Define ICP → Detect signals → Generate copy → Find leads → Send → Measure → Learn → Repeat (better)

---

## Architecture Summary

- **Type:** Agent-based, 6 sequential skills
- **Stack:** TypeScript, Next.js (frontend), Supabase (DB), Apollo.io (leads/sequences), OpenAI (copy/classification)
- **Deployment:** Vercel (https://cirrus-claudebot.vercel.app)
- **GitHub:** https://github.com/ashirimi1019/CirrusClaudebot
- **Branch:** `fix/duplicate-contacts-and-sequences` (current), `main` (production)

### The 6 Skills

| Skill | Purpose | Cost | Key Inputs | Key Outputs |
|-------|---------|------|------------|-------------|
| 1 | New Offer | Free | Interactive prompts | `offers/{slug}/positioning.md`, DB record |
| 2 | Campaign Strategy | Free | Offer slug + signal hypothesis | `strategy.md`, DB record |
| 3 | Campaign Copy | ~$0.50 | Offer + campaign slugs | `email-variants.md`, `linkedin-variants.md`, `personalization-notes.md` |
| 4 | Find Leads | ~$2-5 | Offer + campaign slugs | `all_leads.csv` (combined company+contact), DB records |
| 5 | Launch Outreach | Free | Offer + campaign slugs | Apollo sequences, messages, intelligence classifications |
| 6 | Campaign Review | Free | Campaign results | `learnings.md`, updated `what-works.md` |

### API Clients

| Client | File | Purpose |
|--------|------|---------|
| Apollo.io | `src/lib/clients/apollo.ts` | Company search, contact discovery, sequences, enrollment |
| OpenAI | `src/lib/clients/openai.ts` | Copy generation, company classification |
| Supabase | `src/lib/supabase.ts` | Database client (singleton, anon key for browser, service role for API) |

---

## Database Schema

**Supabase** — 8 migrations applied:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: offers, companies, evidence, contacts, campaigns, campaign_companies, message_variants, messages, tool_usage |
| `002_user_ownership_and_artifacts.sql` | User ownership fields, skill_runs table, artifacts |
| `003_outreach_intelligence.sql` | Intelligence tables: company_intelligence, contact_intelligence, segment_summaries |
| `004_dedup_constraints.sql` | UNIQUE constraint on contacts(email) |
| `005_campaign_sequences.sql` | campaign_sequences table with UNIQUE(campaign_id, segment_key) |
| `006_verticals.sql` | verticals table, FK columns on offers + campaigns |
| `007_geography.sql` | allowed_countries + allowed_us_states (jsonb) on offers + campaigns |
| `008_rate_limiting.sql` | `rate_limit_buckets` table + `increment_rate_limit` RPC — applied 2026-03-15, verified ✅ |

**Key tables:** offers, companies, contacts, campaigns, campaign_companies, message_variants, messages, tool_usage, skill_runs, company_intelligence, contact_intelligence, segment_summaries, campaign_sequences, verticals, rate_limit_buckets

**RLS:** Disabled (commented out in migration) — anon key can read all tables.

---

## Vertical Architecture (Section 3 Implemented ✅)

### Status: Skill-by-skill integration complete, per-vertical learnings complete

### Approved Decisions

1. **Model C — Inheritance + Override:**
   - `offers.default_vertical_id` (FK to verticals) — sets the default
   - `campaigns.vertical_id` (nullable FK to verticals) — overrides if set
   - Resolver: `campaign.vertical_id ?? offer.default_vertical_id`
   - Single function: `getEffectiveVertical(offerId, campaignId?)`

2. **Approach A — File-Convention Loader:**
   - Playbooks live at `context/verticals/{slug}/` (8 required .md files each)
   - `loadVerticalPlaybook(slug)` reads all 8 files, returns typed `VerticalPlaybook`
   - `validatePlaybook(slug)` checks all required files exist
   - Shared context is never replaced — vertical context is appended

3. **Context Merging:**
   - `buildSkillContext(skillId, offerId, campaignId?)` — centralized helper
   - Resolves effective vertical, loads shared + vertical context, returns merged string
   - Each skill gets only the playbook fields it needs
   - Effective vertical is logged for every skill run

4. **Three Verticals Planned:**
   - `staffing` — Contract/perm tech talent placement
   - `ai-data-consulting` — AI/ML/data strategy & implementation
   - `cloud-software-delivery` — Cloud migration, platform engineering, custom dev

5. **Playbook Interface:**
   ```typescript
   interface VerticalPlaybook {
     slug: string;
     name: string;        // Human-readable (e.g., "Staffing")
     overview: string;    // overview.md
     icp: string;         // icp.md
     buyers: string;      // buyers.md
     signals: string;     // signals.md
     scoring: string;     // scoring.md
     messaging: string;   // messaging.md
     objections: string;  // objections.md
     proofPoints: string; // proof-points.md
   }
   ```

6. **Skill-by-Skill Playbook Usage (approved):**
   - Skill 1: overview, icp, buyers, signals
   - Skill 2: overview, signals, messaging, objections
   - Skill 3: messaging, objections, proofPoints (appended after email-principles.md)
   - Skill 4: icp, buyers, signals, scoring (scoring.ts becomes configurable)
   - Skill 5: messaging, buyers, scoring
   - Skill 6: overview, messaging, proofPoints + writes per-vertical learnings

### Implementation Status
- ✅ Section 1: DB schema (verticals table, FK columns) — migration `006_verticals.sql`
- ✅ Section 2: File-convention loader (`src/lib/verticals/`) — loader, resolver, context-builder, types
- ✅ Section 3: Skill-by-skill integration — all 6 skills use `buildSkillContext()`
- ✅ Section 5: Per-vertical learnings — Skill 6 writes to both global + vertical-specific `what-works.md`; `memory.ts` reads both
- ✅ Migration 006 applied to live Supabase — verticals table created, 3 verticals seeded, FK columns on offers + campaigns
- ✅ Vertical playbook content authored — 24 `.md` files across 3 verticals (see Change Log 2026-03-13)
- ✅ End-to-end validation performed — loader, resolver, context-builder, skill integration all verified
- ✅ Section 4: UI implemented — `VerticalSelect` component, offer/campaign create forms, campaign detail badge, campaigns list column, skill upserts wired

---

## Key Files & Folders

### Skills (Core Logic)
| File | Lines | Purpose |
|------|-------|---------|
| `src/core/skills/skill-1-new-offer.ts` | ~254 | Interactive offer creation, writes positioning.md |
| `src/core/skills/skill-2-campaign-strategy.ts` | ~289 | Reads positioning, creates strategy.md |
| `src/core/skills/skill-3-campaign-copy.ts` | ~311 | OpenAI copy generation, loads email-principles.md |
| `src/core/skills/skill-4-find-leads.ts` | ~335 | Apollo company search + contact enrichment, ICP scoring |
| `src/core/skills/skill-5-launch-outreach.ts` | ~1278 | Classification, segmentation, Apollo sequences, enrollment |
| `src/core/skills/skill-6-campaign-review.ts` | ~382 | Analytics, learnings update |

### Verticals
| File | Purpose |
|------|---------|
| `src/lib/verticals/types.ts` | Playbook interface, field-to-file mapping, skill-to-playbook mapping, vertical slugs |
| `src/lib/verticals/loader.ts` | Reads `.md` files from `context/verticals/{slug}/`, validates playbook completeness |
| `src/lib/verticals/resolver.ts` | `getEffectiveVertical(offerId, campaignId?)` — campaign override ?? offer default |
| `src/lib/verticals/context-builder.ts` | `buildSkillContext(skillId, offerId, campaignId?)` — loads shared + vertical context per skill |
| `src/lib/verticals/index.ts` | Barrel exports |

### Services
| File | Purpose |
|------|---------|
| `src/lib/services/scoring.ts` | ICP scoring (threshold 170 pts, hardcoded tech keywords — vertical scoring.md loaded but not yet programmatically applied) |
| `src/lib/services/geography.ts` | Geography filtering — resolveGeography(), checkCompanyGeography(), buildApolloLocationFilter(), rejection logging |
| `src/lib/services/deduplication.ts` | Email + domain dedup |
| `src/lib/services/personalization.ts` | Placeholder replacement |
| `src/lib/services/intelligence.ts` | Company classification, segment grouping |
| `src/lib/services/csv-export.ts` | CSV building with dedup |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` | Campaign detail (~1800 lines) — Pipeline, Leads, Copy, Intelligence, Results tabs; includes `EffectiveVerticalBadge` |
| `frontend/src/app/dashboard/offers/new/page.tsx` | Offer creation form; includes `VerticalSelect` with `default_vertical_id` |
| `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` | Campaign creation form; includes `VerticalSelect` with inherit hint |
| `frontend/src/app/dashboard/campaigns/page.tsx` | Campaigns list; includes Vertical column |
| `frontend/src/components/VerticalSelect.tsx` | Shared vertical dropdown — loads active verticals from Supabase, `showInherit` prop |
| `frontend/src/lib/supabase.ts` | Browser Supabase client (singleton, anon key) |
| `frontend/src/lib/useSkillRunner.ts` | Shared SSE skill runner hook |

### Context (Expertise Files)
```
context/
  frameworks/      — icp-framework.md, positioning-canvas.md, signal-generation-guide.md, signal-brainstorming-template.md, contact-finding-guide.md
  copywriting/     — email-principles.md, linkedin-principles.md
  principles/      — permissionless-value.md, use-case-driven.md, mistakes-to-avoid.md
  api-guides/      — apollo-capabilities-guide.md, apollo-api-guide.md, openai-api-guide.md, supabase-guide.md
  learnings/       — what-works.md
  verticals/       — Per-vertical playbook directories (staffing, ai-data-consulting, cloud-software-delivery); learnings/ subdirs auto-created by Skill 6
```

---

## Implementation Conventions

- **Markdown-first:** Expert knowledge lives in `.md` files under `context/`, not in code
- **CLI entry points:** `npm run skill:1` through `skill:6` (scripts in `scripts/`)
- **Dashboard API routes:** `/api/skills/` endpoints trigger skills via SSE
- **Supabase browser client:** Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no RLS)
- **Cost optimization:** Score companies against ICP BEFORE enriching contacts (threshold: 170 pts)
- **Deduplication:** contacts(email) UNIQUE constraint, campaign_sequences(campaign_id, segment_key) UNIQUE
- **TypeScript validation:** `cd frontend && npx tsc --noEmit` before committing

---

## Current Known Limitations

- **Scoring is hardcoded:** `scoring.ts` has fixed tech keywords — vertical `scoring.md` can guide but doesn't yet override programmatic scoring
- **Vertical playbook files authored:** All 24 files complete (3 verticals × 8 playbooks). Content is rich first-pass (~80-150 lines each), distinct per vertical, with no fabricated claims. Placeholder templates use `[brackets]` for case-study specifics.
- **Vertical UI built (Section 4 complete):** `VerticalSelect` component, offer/campaign create forms, campaign detail badge, campaigns list column. End-to-end live test (create offer with vertical → confirm badge in dashboard) not yet performed.
- **Apollo API quirks:** Sequence enrollment can 422 on duplicates (handled with dedup)
- **RLS disabled:** Supabase tables are fully accessible via anon key
- **campaign detail page is large:** ~1800 lines, could benefit from component extraction

---

## Data Snapshot (March 12, 2026)

- 84 companies (19 ICP-200 top tier, 65 ICP-170 strong match)
- 243 contacts enriched
- 5 campaigns total
- Markets: Singapore + US
- All signals: job_post (actively hiring engineering roles)

---

## Change Log

### 2026-03-15 — Geography UI (operator-facing)

**Goal:** Give operators dashboard control over geography scope — previously only configurable directly in Supabase.

**Scope decisions:**
- **Create forms only** — no inline edit or separate edit pages in this pass
- **9-country supported list** — United States, Canada, Mexico, Brazil, Argentina, Chile, Colombia, Peru, Uruguay (mirrors `DEFAULT_ALLOWED_COUNTRIES`)
- **Campaign blank = inherit** — mirrors the vertical pattern; blank means inherit from offer (or system default)
- **Campaign detail = effective geography + source label** — shows whether geography comes from campaign override, offer, or system default

**Files changed:**
- `frontend/src/components/GeographySelect.tsx` (NEW) — `GeographySelect` (pill multi-select + US states sub-select) + `GeographyDisplay` (read-only display with source label)
- `frontend/src/app/dashboard/offers/new/page.tsx` — added Geography section after Vertical
- `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` — added Geography Override section with inherit text + offer country preview
- `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` — compact geography badge in top bar + full `GeographyDisplay` in Pipeline tab
- `src/core/skills/skill-1-new-offer.ts` — added `allowed_countries` + `allowed_us_states` to `OfferConfig` interface + DB upsert
- `src/core/skills/skill-2-campaign-strategy.ts` — added `allowed_countries` + `allowed_us_states` to `CampaignConfig` interface + DB upsert

**UX behavior:**
- Country pills — click to toggle; empty = system default
- US states sub-panel — appears only when United States is selected; empty = all states
- Campaign form inherit text — shows offer's countries when available: *"Inheriting from offer: United States, Canada…"*
- Campaign detail top bar — compact badge: *"🌍 3 countries (override)"*
- Campaign detail Pipeline tab — full `GeographyDisplay` card showing all countries + source label

**Deferred:** Edit forms (offer + campaign), broader country list expansion, geography filter in Leads tab

---

### 2026-03-14 — Stale-lock cleanup for active-run lock (commit c59ad00)

**Goal:** Prevent stuck `running` rows from permanently blocking future skill runs when a prior run crashed, was Vercel-killed, or otherwise failed to finalize.

**Root cause:** `finaliseRun()` is called in named exception branches but NOT in the `finally` block. If Vercel terminates the handler at `maxDuration` (5 min), the `skill_runs` row stays `status='running'` forever, permanently blocking the active-run lock.

**Design decisions:**
- **Stale threshold:** 10 minutes (`STALE_LOCK_MS = 10 * 60 * 1000`) — 2× Vercel's 5-minute hard limit; conservative enough to avoid false positives
- **Terminal status:** `status='failed'` with `log_lines = ['[stale-lock cleanup] Prior run exceeded stale threshold and was auto-closed']` — no new status values, no frontend ripple effects
- **Stale detection:** Based solely on `started_at` (existing column) — no schema changes, no heartbeat yet
- **Heartbeat / `updated_at`:** Deferred; documented as a future hardening improvement below

**How it works (inline in the active-run lock check):**
1. Lock check finds a `running` row for the same campaign/offer
2. Age = `Date.now() - new Date(started_at).getTime()`
3. If age > 10 min → stale: update row to `failed` + log_lines note, log warning, fall through to allow new run
4. If age ≤ 10 min → fresh: log it, return 409 as before
5. Stale update is non-fatal (try/catch) — new run is allowed even if the update fails

**Files changed:** `frontend/src/app/api/skills/run/route.ts`

**No migration needed** — uses existing `started_at`, `status`, `log_lines`, `finished_at` columns.

**Future hardening:** Add `updated_at` to `skill_runs` and emit a heartbeat update every N log lines inside the stream. This would allow shrinking the stale threshold from 10 min to the actual elapsed time since last activity, making stale detection more precise.

---

### 2026-03-14 — Supabase-backed rate limiting + active-run lock (commits 24e45b9, d5fba22)

**Goal:** Replace Upstash-based rate limiting (which was a dead no-op — env vars never set) with a Supabase-backed implementation that works immediately with the existing stack.

**Why Upstash was replaced:**
- Upstash is not available in this environment; env vars were never set so rate limiting was always disabled
- Supabase is already the persistence layer — no new external service needed
- Minimizing stack sprawl is preferred for an operator-facing internal tool

**What was implemented:**

*Rate limiting (Supabase-backed):*
- New table: `rate_limit_buckets` (`key`, `route`, `window_start`, `count`, `last_request_at`, UNIQUE on `(key, route, window_start)`)
- New Postgres function: `increment_rate_limit(p_key, p_route, p_limit, p_window_seconds)` — atomically upserts (INSERT ... ON CONFLICT DO UPDATE) and returns `(allowed, count, reset_at)`
- Fixed hourly window (`date_trunc('hour', NOW())`)
- Identity: `user:<userId>` (primary) → `ip:<ip>` (fallback); since `/api/skills/run` requires auth, userId is always available
- Threshold: **20 requests/hour**
- Fails open on DB error (does not block legitimate requests)
- Returns 429 with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on breach

*Active-run lock:*
- After rate limit check, before slug validation: queries `skill_runs` for `status='running'` rows
- Scoped to `campaign_id` when available, falls back to `offer_id` (Skills 1-2 before campaign exists)
- Returns 409 with `{ error, runningSkill, startedAt }` if a concurrent run is detected
- TOCTOU race closed: `skill_runs` INSERT now happens BEFORE stream construction (outer handler scope), not inside the SSE stream callback — the active-run lock check reliably sees the row

*Cleanup:*
- Removed `@upstash/ratelimit` and `@upstash/redis` packages from `frontend/package.json`
- `.env.example` Upstash section replaced with note that rate limiting is Supabase-backed
- `frontend/src/lib/rate-limit.ts` fully rewritten (no Upstash references)

**Files changed:**
- `supabase/migrations/008_rate_limiting.sql` (NEW)
- `frontend/src/lib/rate-limit.ts` (full rewrite)
- `frontend/src/app/api/skills/run/route.ts` (rate limit + active-run lock + TOCTOU fix)
- `frontend/package.json` + `frontend/package-lock.json` (Upstash removed)
- `.env.example` (Upstash section removed)

**Migration 008 applied 2026-03-15 ✅** — `rate_limit_buckets` table and `increment_rate_limit` RPC verified in production. Rate limiting and active-run lock are now live.

**Remaining gap (documented, not implemented):** If Vercel forcefully terminates a handler mid-cleanup, a `skill_runs` row could be left as `status='running'` permanently, blocking the active-run lock until manually resolved. Mitigation: a stale-run cleanup job or periodic background function that marks rows older than 10 minutes as `status='stale'`. Low priority for internal use.

---

### 2026-03-14 — Six-Phase Intelligence Sprint (commits 4716e17 → d9a00ab)

**Goal:** Make vertical context actively drive runtime behavior (not just logging), fix a metrics denominator bug, close the learnings read-back gap, add API rate limiting, and replace static LinkedIn templates with OpenAI-generated dynamic variants.

**Phase 1 — Skill 4 vertical-aware role list** (commits 4716e17, 34e5bb1)
- **Root issue:** `parseStrategy()` returned the same 10 generic roles regardless of vertical; `verticalCtx.effectiveVertical` was available but never used for role targeting
- **Fix:** Added `VERTICAL_ROLE_MAP` (3 verticals × 10 roles each, distinct per vertical domain) to `skill-4-find-leads.ts`; changed `const { roles }` → `let { roles }`; role list is now overridden inside the vertical context try block when a matching key is found
- **Files:** `src/core/skills/skill-4-find-leads.ts`
- **Validation:** Different verticals produce different Apollo search role lists; logs show which roles were applied and first 3 for quick debugging

**Phase 2 — Skill 5 vertical-aware classification** (commit 260e31f)
- **Root issue:** `classifyCompanyBatch()` used a hardcoded "staffing company" system prompt for all verticals; classification framing was independent of vertical context
- **Fix:** Added `verticalContext?: string` to `classifyCompanyBatch` `contextFiles` param; system prompt now uses the first meaningful line of `verticalContext` as the offering descriptor when present, falls back to "staffing company" when absent; `classifyCompanies()` in `intelligence.ts` accepts and forwards `verticalContext`; Skill 5 call site passes `verticalContext || undefined`
- **Files:** `src/lib/clients/openai.ts`, `src/lib/services/intelligence.ts`, `src/core/skills/skill-5-launch-outreach.ts`
- **Validation:** Caller-side `|| undefined` correctly gates whitespace-only strings before they reach the classifier

**Phase 3 — Fix Apollo reply-rate denominator** (commit 944591a)
- **Root issue:** `emails_sent` in `getSequenceMetrics()` was mapped to `c.num_send_email_steps` (sequence step count, 1-5) instead of email delivery volume
- **Fix:** Changed to `c.num_sent_emails ?? c.emails_sent_count ?? c.num_contacts ?? 0`; uses nullish coalescing (not `||`) to correctly handle 0 delivery count; comment documents the field semantics and fallback rationale
- **Files:** `src/lib/clients/apollo.ts`
- **Remaining uncertainty:** `num_sent_emails` is the best-supported field based on code inspection; runtime validation with a live campaign recommended

**Phase 4 — Per-vertical learnings read-back** (commit c344779)
- **Root issue:** `buildDynamicContext()` accepted only `campaignId`; `getWhatWorks()` already supported vertical-specific file loading but was never passed a `verticalSlug`; the flywheel was write-only for vertical learnings
- **Fix:** Added `verticalSlug?: string | null` as 2nd param to `buildDynamicContext` in `memory.ts` → forwarded to `getWhatWorks`; updated `buildDynamicContextFn` type in `openai.ts` to accept `verticalSlug`; added `verticalSlug` to `contextFiles` for `generateSegmentVariants`; added 4th positional param to `generateAllSegmentVariants` in `segment-copy.ts`; Skills 3 and 5 extract `effectiveVerticalSlug` before their try blocks and pass it downstream
- **Files:** `src/brain/memory.ts`, `src/lib/clients/openai.ts`, `src/lib/services/segment-copy.ts`, `src/core/skills/skill-3-campaign-copy.ts`, `src/core/skills/skill-5-launch-outreach.ts`

**Phase 5 — Rate limiting** (commit 2437272)
- **Root issue:** `/api/skills/run` had no rate limiting; repeated hits could spend unbounded Apollo/OpenAI credits
- **Fix:** Created `frontend/src/lib/rate-limit.ts` — `skillRunLimiter` singleton using `@upstash/ratelimit` + `@upstash/redis`; `slidingWindow(10, '1 h')` per IP; gracefully returns `null` when env vars absent (local dev no-op); applied to `/api/skills/run/route.ts` before any skill execution; returns 429 with `X-RateLimit-*` headers on breach; added `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to `.env.example`
- **Files:** `frontend/src/lib/rate-limit.ts` (new), `frontend/src/app/api/skills/run/route.ts`, `.env.example`
- **Required deployment step:** Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars; until then rate limiting is disabled

**Phase 6 — LinkedIn dynamic variants** (commit d9a00ab)
- **Root issue:** `skill-3` generated LinkedIn messages from static template strings; positioning/strategy/flywheel context were not used; variants were trivially similar
- **Fix:** Added `LinkedInVariant` interface and `generateLinkedInVariants()` to `openai.ts`; uses `gpt-4o-mini` with JSON response format; injects full `linkedin-principles.md` (no truncation), `positioningContext`, `strategyContext`, optional flywheel context via `buildDynamicContextFn`; requires 3 meaningfully distinct variants by angle; falls back to renamed `generateLinkedInFallback1/2/3()` functions on error; `skill-3` now attempts dynamic generation first with fallback to static on exception
- **Files:** `src/lib/clients/openai.ts`, `src/core/skills/skill-3-campaign-copy.ts`

**All changes:** Frontend TypeScript: 0 errors throughout. ~60 pre-existing ESM errors in `src/core/skills/*.ts` unchanged.

---

### 2026-03-14 — Full codebase bug fix pass (28 fixes, commit b658b95)

**Source:** 5-agent code review across all codebase sections

**Critical fixes (data corruption + security):**
- `apollo.ts`: operator precedence bug fixed — `website_url` now correctly computed for all companies; `http://` → `https://`
- `skill-4`: CSV injection fixed — replaced hand-rolled template literal CSV with `objectsToCsv()` (proper `""` escaping)
- `skill-5`: Apollo contact ID sync now matches by email, not array position
- `geography.ts`: `buildApolloLocationFilter` now adds `"United States"` when state filter is active
- `geography.ts`: unknown country now passes through (not hard-rejected) when US is in allowlist
- `api/skills/run`: returns 401 when unauthenticated — prevents credit spend
- `api/skills/run` + `status`: slug params validated against safe pattern before `path.join()`

**Campaign quality fixes:**
- `skill-3`: `angle` variable now passed to `generateDraft()` — 3 variants get 3 different angle instructions
- `skill-3`: `extractSignalFromStrategy` regex fixed — captures content below heading, not heading text
- `openai.ts`: system prompt persona is now dynamic based on vertical context presence (not always "staffing")

**Frontend fixes:**
- `metricsLoading` can no longer get stuck — `.catch()` added
- Intelligence tab: `Promise.all` wraps all 3 queries before clearing loading
- Campaign detail: cancellation guard added to nested offer/campaign fetch
- Campaigns list: `deriveStatus` uses most recent metrics (sorted DESC)
- `useSkillRunner` + `useCampaignSkillRunner`: `EventSource` closed on unmount
- `vercel-paths.ts`: `contextCopied` race replaced with Promise singleton
- All API routes: Supabase service client is now a module-level singleton

**Type safety:**
- `supabase.ts`: `Offer` + `Campaign` interfaces now include `allowed_countries`/`allowed_us_states`
- `supabase.ts`: `country: string | null` (was non-nullable)
- `supabase.ts`: `CampaignCompany.offer_type`/`service_line` now proper union types
- `types/company.ts` + `scoring.ts`: `revenue_score` added to `IcpScore` and return value

**Config/cleanup:**
- `package.json`: removed dead `googleapis` dependency + `sheets:sync` script
- `.env.example`: added `NEXT_PUBLIC_*` variants (what frontend routes actually read)
- `scoring.md`: fixed broken backtick refs in ai-data + cloud-software-delivery verticals
- `icp-framework.md`: added note clarifying vertical icp.md overrides geography
- `src/lib/db/utils.ts`: new file — `isTransientDbError` extracted from 3 duplicate locations
- `apollo.ts`: `per_page` string literals → integers

**Files changed:** 28 files + 1 new (`src/lib/db/utils.ts`)
**Frontend TypeScript:** 0 errors after all changes

---

### 2026-03-14 — Geography filtering added to Skill 4

**What:** Geography enforcement system for Skill 4 (Find Leads).

**Files added/modified:**
- `src/lib/services/geography.ts` (NEW) — Single source of truth for all geography logic: `resolveGeography()`, `checkCompanyGeography()`, `buildApolloLocationFilter()`, rejection + summary logging helpers
- `supabase/migrations/007_geography.sql` (NEW) — Adds `allowed_countries` + `allowed_us_states` (jsonb) to both `offers` and `campaigns` tables
- `src/core/skills/skill-4-find-leads.ts` (MODIFIED) — Reads geo config from DB on startup, passes `buildApolloLocationFilter()` to Apollo query, runs post-query `checkCompanyGeography()` rejection pass before contact enrichment

**Resolution order (mirrors vertical inheritance):**
- `campaign.allowed_countries ?? offer.allowed_countries ?? DEFAULT_ALLOWED_COUNTRIES`
- `campaign.allowed_us_states ?? offer.allowed_us_states ?? null` (null = all states)

**Default scope:** Americas — United States, Canada, Mexico, Brazil, Argentina, Chile, Colombia, Peru, Uruguay

**Behavior:** Singapore, India, UK, etc. are logged with `[GEOGRAPHY REJECT]` messages and excluded before contact enrichment (saves Apollo credits). Summary line printed at end of Skill 4 run.

**Migration 007 applied to live Supabase** — both columns added to offers + campaigns tables.

**Geography UI shipped 2026-03-15 ✅** — See Geography UI section below for full scope decisions.

---

### 2026-03-13 — Section 4 vertical UI implemented

**Status:** COMPLETE

**What was built:** Operator-facing vertical selection UI across offer creation, campaign creation, campaign detail, and campaigns list. All 7 code tasks executed.

**Files created/modified:**

| File | Change |
|------|--------|
| `frontend/src/components/VerticalSelect.tsx` | NEW — shared vertical dropdown component |
| `frontend/src/app/dashboard/offers/new/page.tsx` | MODIFIED — added `default_vertical_id` field + VerticalSelect |
| `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` | MODIFIED — added `vertical_id` field + VerticalSelect with inherit hint |
| `src/core/skills/skill-1-new-offer.ts` | MODIFIED — `default_vertical_id: config?.default_vertical_id \|\| null` in DB upsert |
| `src/core/skills/skill-2-campaign-strategy.ts` | MODIFIED — `vertical_id: config?.vertical_id \|\| null` in DB upsert |
| `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` | MODIFIED — `EffectiveVerticalBadge` in campaign detail top bar |
| `frontend/src/app/dashboard/campaigns/page.tsx` | MODIFIED — Vertical column added to campaigns list table |

**New shared component — `VerticalSelect.tsx`:**
- Located at `frontend/src/components/VerticalSelect.tsx`
- `"use client"` React component with `useEffect` for data loading
- Loads active verticals from `verticals` table (`active = true`) via browser Supabase client (`createClient()` from `@/lib/supabase`)
- Props: `value: string`, `onChange: (value: string) => void`, `showInherit?: boolean`, `className?: string`, `disabled?: boolean`
- `showInherit=false` (default) → blank option label: `"Select vertical (optional)"`
- `showInherit=true` → blank option label: `"Inherit from offer"`
- Verticals ordered by name; loading state disables the select; unmount cleanup via `cancelled` flag; Supabase errors handled gracefully (sets loading=false)
- Uses `cn()` utility for Tailwind class merging; styled to match dashboard dark theme

**Vertical option loading:**
- Query: `verticals` table, filtered `active = true`, ordered by `name` ascending
- Returns: `id`, `slug`, `name` fields
- Loaded fresh on each component mount; no global caching

**Offer create form (`offers/new/page.tsx`):**
- `default_vertical_id: string` added to `OfferForm` interface and `DEFAULTS` object (defaults to `""`)
- `VerticalSelect` rendered in its own card section below the positioning canvas, above the submit button
- `showInherit` not set (defaults to `false`) — renders "Select vertical (optional)" placeholder
- Helper text: "Optional. Sets the default vertical playbook for all campaigns under this offer."
- Value passed as part of `form as unknown as Record<string, string>` → `extraParams` in `useSkillRunner` → forwarded to Skill 1 API

**Campaign create form (`campaigns/new/page.tsx`):**
- `vertical_id: string` added to `CampaignForm` interface and `DEFAULTS` object (defaults to `""`)
- `useEffect` fetches the offer's `default_vertical_id` and `verticals(name)` via FK join on mount; stores resolved name in `offerVerticalName` state
- `VerticalSelect` rendered with `showInherit={true}` — renders "Inherit from offer" as blank option
- Helper text is dynamic:
  - When offer has a default vertical: `"Inheriting from offer: {verticalName}"`
  - When offer has no default vertical: `"Leave blank to inherit the vertical from the offer."`
- Value passed as part of spread form object → `extraParams` in `useSkillRunner` → forwarded to Skill 2 API

**Inheritance/override behavior:**

| Surface | Behavior |
|---------|----------|
| Offer create form | Standalone dropdown; no inheritance concept |
| Campaign create form | Blank = inherit from offer (shown with dynamic helper text); selecting a value = explicit override |
| Campaign detail badge (`EffectiveVerticalBadge`) | Resolves `campaign.vertical_id` first, falls back to `offer.default_vertical_id`; shows "(override)" or "(offer)" source label; renders nothing if neither is set |
| Campaigns list table | Shows `campaigns.vertical_id → verticals(name)` directly (campaign-level only, no offer fallback) |

**Backend wire-up:**
- Skill 1 (`skill-1-new-offer.ts`): `default_vertical_id: config?.default_vertical_id || null` — `|| null` coerces empty string `""` to `null`, preventing FK violation on upsert
- Skill 2 (`skill-2-campaign-strategy.ts`): `vertical_id: config?.vertical_id || null` — same pattern
- `OfferConfig.default_vertical_id?: string` and `CampaignConfig.vertical_id?: string` interfaces already typed as optional

**FK join pattern:**
- `offers` query in campaign create: `.select('default_vertical_id, verticals(name)')` — no alias hint needed (offers has one FK to verticals)
- `EffectiveVerticalBadge` in campaign detail: queries both `campaigns.vertical_id → verticals(name)` and `offers.default_vertical_id → verticals(name)`
- Type safety: cast as `(data as any)?.verticals?.name` since generated DB types do not include joined tables

**Validation performed:**
- `cd frontend && npx tsc --noEmit` run after each file change
- Zero NEW TypeScript errors introduced by Section 4 changes
- Pre-existing ~60 errors are from `.ts` extension imports in skill files and top-level await ESM patterns — these pre-date Section 4 and are unrelated

**Edge cases and notes:**
- Empty string `""` sent by frontend when no vertical selected → coerced to `null` by `|| null` in skill upserts — prevents FK constraint violation
- Campaigns list Vertical column uses campaign-level vertical only (no offer fallback resolution); `EffectiveVerticalBadge` in campaign detail page does full two-step resolution
- `VerticalSelect` is the single source of truth for vertical dropdown rendering — used in both forms; no duplication

**Recommended next action:**
Run end-to-end demo with a vertical-aware offer + campaign to validate the full resolution chain in production: create offer with staffing vertical → confirm `default_vertical_id` saved → create campaign → confirm badge shows "(offer)" → create second campaign with an explicit vertical override → confirm badge updates to "(override)".

---

### 2026-03-13 — Section 4 UI implementation plan authored

**What:** Written full implementation plan for operator-facing vertical selection UI.
**Plan file:** `docs/superpowers/plans/2026-03-13-section-4-vertical-ui.md` (837 lines, 8 tasks, 3 chunks)

**Clarification decisions locked in:**
- `default_vertical_id` on offer forms: **optional** — blank/no vertical is valid
- Campaign vertical override default: **blank/"Inherit from offer"** — never pre-populated; helper text shows `"Inheriting from offer: {verticalName}"` when offer has a default set
- Vertical dropdown contents: **active verticals only** (`active = true` from `verticals` table)
- Effective vertical display scope: offer form (below vertical select), campaign form (inherit hint), campaign detail page (badge with source label), campaigns list table (new Vertical column)
- UI complexity: **simple first pass** — clean `<select>` dropdown with helper text; campaign detail shows compact badge: `{verticalName} [override | offer default | No vertical]`

**Files to be created/modified (8 total):**
- NEW: `frontend/src/components/VerticalSelect.tsx` — shared reusable vertical dropdown (loads active verticals from Supabase, supports blank/inherit option)
- MODIFY: `frontend/src/app/dashboard/offers/new/page.tsx` — add vertical select to offer creation form
- MODIFY: `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` — add optional vertical override to campaign creation form with "Inheriting from offer: X" helper
- MODIFY: `src/core/skills/skill-1-new-offer.ts` — include `default_vertical_id` in DB upsert
- MODIFY: `src/core/skills/skill-2-campaign-strategy.ts` — include `vertical_id` in DB upsert
- MODIFY: `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` — add `EffectiveVerticalBadge` component; query `vertical_id` + `offers.default_vertical_id`, resolve client-side
- MODIFY: `frontend/src/app/dashboard/campaigns/page.tsx` — add Vertical column, update query to join verticals
- MODIFY: `primer.md` — update with completed Section 4 status

**How inheritance/override is represented in the UI:**
- Resolution order mirrors backend: `campaign.vertical_id ?? offer.default_vertical_id`
- Campaign form shows `"Inheriting from offer: {verticalName}"` below the dropdown when blank is selected and offer has a default
- Campaign detail badge always shows effective vertical with source label
- No dual-state confusion — one badge, one source label, one truth

**Technical notes:**
- `VerticalSelect` uses browser Supabase client (`createClient()` from `frontend/src/lib/supabase.ts`)
- PostgREST FK join: `verticals(name, slug)` in select; if ambiguous, use `verticals!campaigns_vertical_id_fkey(name, slug)`
- Empty string `""` from form → `|| null` in skill upserts → correct `null` in DB
- No new API routes needed; all vertical option loading is client-side

**Validation to perform after execution:**
- Offer form loads vertical dropdown with 3 active verticals
- Offer form saves `default_vertical_id` (UUID or null) correctly
- Campaign form shows inherit hint when offer has a default vertical
- Campaign form saves `vertical_id` as null when "Inherit from offer" is selected
- Campaign detail badge shows correct effective vertical with correct source label
- Campaigns list shows Vertical column
- Editing existing records preserves current values
- `npx tsc --noEmit` passes with zero errors

**Status:** Plan written, not yet executed.

---

### 2026-03-13 — Vertical playbook content authored + end-to-end validation

**Phase 1: Content Authoring (24 files)**
- **What:** Authored all 24 vertical playbook markdown files (3 verticals × 8 files each)
- **Content depth:** Rich first-pass, ~80-150 lines per file, operational and GTM-usable
- **Content rules applied:** No fake client names, no fake performance numbers, no fabricated case studies. Placeholder templates use `[brackets]` for case-study specifics. Each vertical is meaningfully distinct.
- **ICP tier:** Single primary tier per vertical (highest-value GTM tier)
- **Scoring format:** Qualitative prose + weighted scoring table with 4 dimensions per vertical

**Files created:**
```
context/verticals/staffing/
  overview.md, icp.md, buyers.md, signals.md, messaging.md, objections.md, proof-points.md, scoring.md

context/verticals/ai-data-consulting/
  overview.md, icp.md, buyers.md, signals.md, messaging.md, objections.md, proof-points.md, scoring.md

context/verticals/cloud-software-delivery/
  overview.md, icp.md, buyers.md, signals.md, messaging.md, objections.md, proof-points.md, scoring.md
```

**Vertical content summary:**
- **Staffing:** Targets mid-market/enterprise tech companies (200-5000 employees, Series B+ or $50M+ revenue) hiring data/cloud/backend engineers. Buyers: VP Engineering, CTO, Hiring Manager, TA Director. Messaging: speed-to-fill, pre-vetted bench, embedded vs body-shop differentiation. Scoring weighted: Hiring Velocity (35%), Technical Fit (25%), Company Profile (25%), Engagement Signals (15%).
- **AI/Data Consulting:** Targets mid-market companies (100-2000 employees) in AI adoption phase with data maturity gaps. Buyers: CDO, VP Analytics, CTO, Head of ML. Messaging: strategy-to-production, MLOps maturity, data architecture modernization. Scoring weighted: AI Readiness (30%), Data Maturity (25%), Org Profile (25%), Engagement Signals (20%).
- **Cloud/Software Delivery:** Targets mid-market/enterprise (200-5000 employees) in cloud migration or platform modernization. Buyers: VP Engineering, CTO, VP Infrastructure, Director Platform Engineering. Messaging: velocity recovery, platform engineering, migration de-risk. Scoring weighted: Technical Environment (30%), Migration Urgency (25%), Org Profile (25%), Engagement Signals (20%).

**Phase 2: End-to-End Validation**

*What was validated:*
1. ✅ **Loader infrastructure:** `loadPlaybookFields()` successfully loads all 8 files for all 3 verticals. `validatePlaybook()` confirms all required files present. All 18 skill+vertical combos load with zero missing primary fields.
2. ✅ **Migration 006 applied:** `verticals` table created in live Supabase with 3 seeded rows (staffing, ai-data-consulting, cloud-software-delivery). FK columns on offers + campaigns confirmed.
3. ✅ **Resolver path:** Set `default_vertical_id = staffing` on "Talent As A Service - US" offer. SQL query confirmed `COALESCE(campaign.vertical_id, offer.default_vertical_id)` resolves correctly to `staffing` for the "hiring-data-engineers-q1" campaign.
4. ✅ **Skill integration trace:** All 6 skill files import and call `buildSkillContext()`. Skills 1, 2, 6 append context to files. Skill 3 passes context to OpenAI prompts. Skills 4, 5 load context (informational/logging only).
5. ✅ **Context-builder logic:** Confirmed correct field-mapping per skill, correct section formatting, missing-field warnings, and no-vertical fallback behavior.
6. ✅ **Per-vertical learnings:** `memory.ts` reads both global + vertical-specific `what-works.md`. Skill 6 writes to both.

*What was NOT validated (requires live execution):*
- Full CLI skill run with vertical context (requires interactive prompts, API keys, Apollo credits)
- Actual OpenAI prompt output quality with vertical context appended (Skill 3)
- Actual Apollo search behavior influenced by vertical ICP (Skill 4 — loads context but doesn't programmatically use it)
- Dashboard UI display of vertical information (Section 4 not built)

*Observed issues:*
- **Skills 4 & 5 load but don't actively use vertical context** — they call `buildSkillContext()` for logging/display but don't adapt their Apollo queries or sequence strategy based on vertical playbook data. This is informational-only usage. To make vertical context actionable for these skills, additional code changes would be needed.
- **`scoring.ts` remains hardcoded** — the vertical `scoring.md` is loaded and can guide operator decisions, but the programmatic ICP scoring function uses fixed keywords/weights regardless of vertical.
- **Vertical UUIDs in Supabase:** staffing=`dab6e231-c603-43ed-afb1-c7ea04c850c6`, ai-data-consulting=`e49d5549-8fb9-430e-a0be-2079f48ebf7a`, cloud-software-delivery=`6b2f96e9-15d9-4861-97c6-5b4decca16be`

**Files also modified:**
- `primer.md` — updated with complete validation results and content summary
- Deleted: `_validate_verticals.ts` (temporary validation script, no longer needed)
- Supabase live data: `offers.default_vertical_id` set on "Talent As A Service - US" offer

### 2026-03-13 — primer.md created
- **What:** Created `primer.md` as living project memory; updated `CLAUDE.md` to reference it
- **Why:** Required continuity document for multi-session development
- **Files:** `primer.md` (new), `CLAUDE.md` (updated)

### 2026-03-13 — Vertical architecture implemented (Sections 1-3, 5)
- **What:** Full vertical agent architecture — DB schema, file-convention loader, centralized context builder, all 6 skills integrated, per-vertical learnings flywheel
- **Why:** System supports 3 verticals (staffing, AI/data consulting, cloud/software delivery) with shared core + vertical-specific playbooks
- **Files added:** `src/lib/verticals/` (types.ts, loader.ts, resolver.ts, context-builder.ts, index.ts), migration `006_verticals.sql`
- **Files edited:** All 6 skill files (vertical context injection), `src/brain/memory.ts` (vertical-aware learnings reader)
- **Key design:** `buildSkillContext(skillId, offerId, campaignId?)` — single entry point; `getEffectiveVertical()` — campaign.vertical_id ?? offer.default_vertical_id
- **Remaining:** Section 4 (UI vertical selector), vertical playbook content authoring (24 .md files)

### 2026-03-12 — Duplicate contact & sequence fixes
- **What:** Supabase UNIQUE constraints, Apollo dedup before enroll, XLSX/CSV export dedup, idempotent sequence creation
- **Why:** Duplicate contacts and sequences were being created on re-runs
- **Files:** apollo.ts, contacts.ts, deduplication.ts, csv-export.ts, export-xlsx.ts, skill-5-launch-outreach.ts, migrations 004+005
- **Commit:** a9967ca

### 2026-03-12 — Skill 5 Intelligence UI/UX polish
- **What:** Intelligence summary bar, needs-review banner, Skill 5 run outcome panel, rich segment cards, expandable contact rows, section dividers, copy tab headers, variant card subject upgrade, leads tab persona visibility bump
- **Why:** Raw intelligence data needed operator-console-level polish
- **Files:** `frontend/.../campaigns/[campaignSlug]/page.tsx`

### 2026-03-12 — Full demo run verified
- **What:** All 6 skills run end-to-end via Vercel dashboard
- **Data:** 84 companies, 243 contacts, 5 campaigns

### 2026-03-11-12 — Production-readiness hardening
- **What:** Input validation, error recovery, Apollo API deprecation fixes, blank template repair, SSE exitCode bug, path traversal block, slug race conditions, CSV export wiring, env fallbacks
- **Files:** 12+ files across skills, services, frontend
- **Commits:** Multiple (see git log)

---

## What Should Be Worked On Next

1. **Run end-to-end demo with a vertical-aware offer** — Section 4 UI is complete; validate the full resolution chain in production: create offer with staffing vertical → create campaign → confirm `EffectiveVerticalBadge` shows "(offer)" → add campaign override → confirm badge updates to "(override)"
2. ~~**Geography UI**~~ — ✅ Shipped 2026-03-15. See Geography UI section in Change Log.
3. **Make scoring vertical-configurable** — `scoring.ts` currently hardcoded; vertical `scoring.md` should influence ICP scoring weights
4. ~~**Skills 4 & 5: actively consume vertical context**~~ ✅ DONE (2026-03-14 sprint)
5. ~~**LinkedIn variants**~~ ✅ DONE (2026-03-14 sprint)
6. ~~**Per-vertical learnings read-back**~~ ✅ DONE (2026-03-14 sprint)
7. ~~**Rate limiting**~~ ✅ DONE (2026-03-14 sprint)
8. **Skill 6 flywheel quality (Q6)** — `what-works.md` entries default to `email-variant-1`/`CTO` in auto-mode; derive from Apollo analytics
9. **`useCampaignSkillRunner` deduplication (U3)** — Still a manual copy of `useSkillRunner` + `runningSkill` state; extract to shared parameterised hook
10. **`xlsx` package (U6)** — `xlsx@0.18.5` has known CVEs and is abandoned; replace with `exceljs`
11. **Verify Apollo `num_sent_emails` field at runtime** — fallback chain `num_sent_emails ?? emails_sent_count ?? num_contacts` is best-supported from code inspection; confirm with a live campaign that the correct delivery volume is returned
12. ~~**Upstash Redis setup for production rate limiting**~~ ✅ REPLACED — Supabase-backed rate limiting implemented; apply migration 008 in Supabase SQL editor to activate
13. ~~**Apply migration 008 in Supabase SQL editor**~~ — ✅ Applied 2026-03-15. `rate_limit_buckets` table and `increment_rate_limit` RPC verified. Smoke test passed (allowed=true, count=1). One stale `running` skill_run row from 2026-03-12 found and manually closed as `failed`.
14. **Stale-run lock cleanup** — if Vercel terminates a handler mid-flight, a `skill_runs` row can be stuck as `status='running'` permanently, blocking active-run lock; add a periodic cleanup job or Supabase Edge Function cron to mark rows older than 10 minutes as `status='stale'`
