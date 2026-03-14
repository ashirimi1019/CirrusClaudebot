# Staffing Vertical — Observable Signals

## Signal Philosophy

Every staffing outreach email should reference something real and observable. "I noticed you're hiring" is the minimum bar — the best signals are specific, timely, and connected to a plausible staffing need.

Signals are ranked by strength (how likely they indicate a staffing need) and observability (how easily the signal can be detected via APIs and public data).

---

## Tier 1: Strong Signals (High Intent)

### 1. Active Job Posts for CirrusLabs Specialization Areas
**Signal:** Company has open requisitions for data engineers, ML engineers, cloud architects, or backend engineers.
**Why it matters:** Direct evidence of need for the exact roles CirrusLabs fills.
**Observable via:** Apollo job search, LinkedIn job posts, company careers page
**Freshness requirement:** Posted within the last 30 days
**Outreach angle:** "I saw you're looking for a [specific role]. We have pre-vetted candidates who can start within 2-3 weeks."

### 2. Multiple Open Reqs for the Same Role
**Signal:** Company has 3+ open positions for the same role type (e.g., 4 data engineer openings).
**Why it matters:** Multiple openings suggest internal recruiting cannot keep up with demand — classic staffing opportunity.
**Observable via:** Apollo organization job postings endpoint, LinkedIn job count
**Freshness requirement:** Multiple roles posted within 60 days
**Outreach angle:** "Hiring [number] [role] at once is tough through internal channels alone. We specialize in exactly this."

### 3. Stale Job Posts (Open 60+ Days)
**Signal:** Engineering role has been open for 2+ months without being filled.
**Why it matters:** Extended time-to-fill indicates the company is struggling to find qualified candidates — the core problem staffing solves.
**Observable via:** Job post date comparison (posted_at vs current date)
**Freshness requirement:** Role must still be active (not expired/closed)
**Outreach angle:** "I noticed your [role] has been open since [month]. That's a hard hire — we typically fill similar roles in 2-3 weeks."

### 4. Contractor/Temp Roles Posted
**Signal:** Company posts roles explicitly labeled as contract, temp, or freelance for engineering positions.
**Why it matters:** They are already open to non-FTE engagement models — lowest friction path to a staffing conversation.
**Observable via:** Job post filters for employment type (contract, temp)
**Freshness requirement:** Posted within last 45 days
**Outreach angle:** "I saw you're open to contract engineers for [role]. We have candidates on our bench ready to interview this week."

---

## Tier 2: Moderate Signals (Likely Intent)

### 5. Funding Round in Last 12 Months
**Signal:** Company announced Series B+ funding or raised $20M+.
**Why it matters:** Post-funding companies almost always scale engineering headcount. The board expects growth milestones, and hiring is the biggest bottleneck.
**Observable via:** Apollo organization enrichment, Crunchbase, news APIs
**Freshness requirement:** Funding within last 12 months (6 months is optimal)
**Outreach angle:** "Congrats on the [Series X]. Based on what we've seen with similar companies post-raise, scaling the data/ML team is usually the first bottleneck."

### 6. Hiring Velocity Spike
**Signal:** Company posted 5+ new engineering roles in the last 30 days (significantly above their normal rate).
**Why it matters:** A sudden increase in engineering hiring signals a project ramp, expansion, or strategic shift — all create staffing opportunities.
**Observable via:** Apollo job posting counts over time, LinkedIn hiring activity
**Freshness requirement:** Spike must be recent (last 30 days vs. prior 30 days)
**Outreach angle:** "I noticed [Company] has ramped up engineering hiring significantly this month. When teams scale fast, staffing augmentation can bridge the gap while your internal recruiting pipeline catches up."

### 7. Engineering Leadership Change
**Signal:** New VP of Engineering, CTO, or Head of Engineering joined within last 6 months.
**Why it matters:** New engineering leaders typically reshape teams, bring in trusted vendors, and accelerate hiring to establish their agenda.
**Observable via:** LinkedIn profile changes, Apollo people search with recent start dates
**Freshness requirement:** Leadership change within last 6 months
**Outreach angle:** "I saw you recently joined [Company] as [title]. New engineering leaders often need to move fast on hiring — we can help with [specific role types]."

### 8. Product Launch or Expansion Announcement
**Signal:** Company announces new product, new market entry, or major feature release.
**Why it matters:** Product expansion creates project-specific engineering demand that often exceeds existing team capacity.
**Observable via:** Press releases, company blog, news APIs, social media
**Freshness requirement:** Announcement within last 3 months
**Outreach angle:** "I read about [Company]'s [product/expansion]. Building that out usually means scaling the [data/backend/infra] team — that's exactly where we help."

---

## Tier 3: Weak Signals (Possible Intent)

### 9. Technology Migration or Platform Rebuild
**Signal:** Company mentions migrating to cloud, rebuilding data platform, or adopting new ML infrastructure.
**Why it matters:** Migrations require specialized skills for a bounded period — ideal for contract staffing.
**Observable via:** Engineering blog posts, conference talks, job post descriptions mentioning migration
**Freshness requirement:** Mentioned within last 6 months
**Outreach angle:** "[Technology] migrations need specialists who've done it before. We have engineers who've completed [similar migrations] and can start quickly."

### 10. Acquisition or Merger
**Signal:** Company acquired another company or was acquired.
**Why it matters:** Post-acquisition integration requires additional engineering capacity for system consolidation, data migration, and platform unification.
**Observable via:** News APIs, Apollo organization events, Crunchbase
**Freshness requirement:** Acquisition within last 6 months
**Outreach angle:** "Post-acquisition integrations always need more engineering hands than planned. We can provide [specific capability] engineers for the integration sprint."

### 11. Engineering Team Attrition
**Signal:** Multiple engineers leaving the company (visible via LinkedIn profile changes showing departures).
**Why it matters:** Attrition creates backfill urgency — the team is shrinking while the work stays the same.
**Observable via:** LinkedIn company page (departures), Glassdoor reviews mentioning turnover
**Freshness requirement:** Observable pattern in last 3 months
**Outreach angle:** Approach carefully — do not reference attrition directly. Instead, reference the open roles that result from it.

### 12. Conference Sponsorship or Hiring Events
**Signal:** Company sponsors data/ML/cloud conferences or hosts recruiting events.
**Why it matters:** Investment in hiring events indicates active need and budget allocation for talent acquisition.
**Observable via:** Conference sponsor lists, Eventbrite, Meetup.com
**Freshness requirement:** Event within last 3 months
**Outreach angle:** "I saw [Company] at [conference] — sounds like you're investing heavily in [area]. We specialize in placing engineers in exactly that space."

---

## Signal Combinations (Highest Priority)

The strongest outreach targets combine multiple signals. Prioritize leads that match two or more:

| Combination | Priority | Why |
|------------|----------|-----|
| Active job posts + stale roles (60+ days) | Highest | They need the role AND cannot fill it internally |
| Funding round + hiring velocity spike | Highest | Capital + action = immediate staffing need |
| Multiple open reqs + contractor roles posted | High | Volume need + openness to non-FTE |
| New eng leadership + hiring spike | High | New leader building their team fast |
| Product launch + active hiring | High | Project-driven urgency with real timeline |
| Funding + no active hiring yet | Moderate | Capital deployed but hiring not started — early outreach |

---

## Signal-to-Apollo Query Mapping

| Signal | Apollo Feature | Query Parameters |
|--------|---------------|-----------------|
| Active job posts | Organization Job Postings | job_title filter for target roles |
| Multiple open reqs | Organization Job Postings | count by role type |
| Stale job posts | Organization Job Postings | posted_at date comparison |
| Contractor roles | Organization Job Postings | employment_type filter |
| Funding round | Organization Enrichment | latest_funding_date, funding_amount |
| Hiring velocity | Organization Job Postings | posted_at within 30 days, count |
| Leadership change | People Search | title + started_at date filter |
| Company size | Organization Search | num_employees_ranges filter |

---

## Signal Freshness Rules

| Signal Type | Maximum Age | Notes |
|------------|-------------|-------|
| Job posts | 30 days | Older posts may be filled or abandoned |
| Funding rounds | 12 months | Impact on hiring diminishes after 12 months |
| Leadership changes | 6 months | New leaders act fast, then settle in |
| Product announcements | 3 months | Hiring driven by launch fades after 90 days |
| Acquisitions | 6 months | Integration work peaks in first 6 months |
| Contractor posts | 45 days | Contract roles fill fast or get pulled |
