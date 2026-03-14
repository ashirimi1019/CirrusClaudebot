# Staffing — Lead Scoring Guide

> This file provides qualitative scoring philosophy and a suggested weighted model for evaluating staffing leads. These weights are starter guidance — adjust based on campaign results and vertical learnings.

---

## Scoring Philosophy

**Urgency > Fit.**

In staffing, the highest-value leads are companies with immediate, unfilled hiring needs. A Series B startup desperately trying to fill 5 data engineer roles is a better lead than a Fortune 500 with a vague "always hiring" posture — even if the Fortune 500 is a bigger logo.

Key principle: **Observable urgency signals matter more than company profile alone.** A company actively posting roles, losing engineers, or scaling after funding is far more likely to engage than one that merely fits the ICP on paper.

---

## Suggested Weighted Scoring Model (300-Point Scale)

> These weights align with the existing `scoring.ts` threshold of 170 points. Leads scoring 170+ should be enriched for contacts; below 170, skip enrichment to save API credits.

### Dimension 1: Hiring Signal Strength (0–100 points)

| Signal Factor | Points | Criteria |
|--------------|--------|----------|
| Active job postings for target roles | 0–40 | 40 = 5+ open roles matching our placement capabilities; 20 = 2–4 roles; 10 = 1 role; 0 = no matching roles |
| Role seniority alignment | 0–20 | 20 = senior/staff/lead roles (higher bill rates); 10 = mid-level; 5 = junior only |
| Posting freshness | 0–20 | 20 = posted within 7 days; 10 = 8–30 days; 5 = 31–60 days; 0 = 60+ days |
| Hiring velocity indicator | 0–20 | 20 = multiple roles posted in last 30 days (team build-out); 10 = steady hiring; 0 = single stale post |

### Dimension 2: Company Profile Fit (0–100 points)

| Profile Factor | Points | Criteria |
|---------------|--------|----------|
| Company size (employees) | 0–25 | 25 = 100–2,000 (sweet spot for staffing); 15 = 50–99 or 2,001–5,000; 10 = 5,001–10,000; 5 = <50 or >10,000 |
| Funding stage / financial health | 0–25 | 25 = Series A–C with recent round; 15 = Series D+ or profitable growth; 10 = bootstrapped profitable; 5 = pre-seed/seed |
| Industry alignment | 0–25 | 25 = tech, fintech, healthtech, e-commerce (high engineering density); 15 = SaaS, enterprise software; 10 = other tech-adjacent; 5 = non-tech |
| Geography | 0–25 | 25 = primary markets (US, Singapore); 15 = secondary markets (UK, Canada, Australia); 10 = EMEA; 5 = other |

### Dimension 3: Engagement Likelihood (0–100 points)

| Engagement Factor | Points | Criteria |
|------------------|--------|----------|
| Decision-maker accessibility | 0–30 | 30 = VP Eng/CTO with verified email; 20 = Eng Manager with email; 10 = HR/TA lead only; 0 = no contacts found |
| Prior agency usage signals | 0–25 | 25 = known to use staffing agencies (job posts mention agency, LinkedIn shows contract hires); 10 = unknown; 0 = explicitly anti-agency |
| Company hiring pain indicators | 0–25 | 25 = roles open 60+ days (struggling to fill); 15 = roles open 30–59 days; 5 = roles open <30 days; 0 = no pain signal |
| Competitor displacement opportunity | 0–20 | 20 = using generalist agency (opportunity to upgrade); 10 = no known agency; 0 = using specialized competitor |

---

## Scoring Tiers

| Tier | Score Range | Action | Rationale |
|------|------------|--------|-----------|
| 🔥 Hot | 220–300 | Enrich + prioritize outreach | Strong signals + great fit + high engagement likelihood |
| ✅ Strong | 170–219 | Enrich + standard outreach | Good signals or fit, worth pursuing |
| 🟡 Warm | 120–169 | Monitor, do not enrich yet | Some potential but missing key signals — revisit next quarter |
| ⬜ Low | < 120 | Skip | Poor fit or no urgency signals — not worth the API credits |

---

## Disqualification Criteria (Automatic Score = 0)

Skip these companies regardless of other signals:

- **No engineering roles posted** and no other hiring urgency signals
- **Company size < 20 employees** — unlikely to use external staffing for engineering
- **Government/public sector** without explicit contractor procurement process
- **Companies with active hiring freezes** (check recent news, layoff trackers)
- **Competitors** — other staffing/recruiting agencies
- **Companies outside serviceable geography** — no timezone overlap with CirrusLabs delivery

---

## Alignment with Existing Scoring System

The existing `scoring.ts` uses a 170-point threshold with hardcoded tech keyword bonuses. This scoring guide adds vertical-specific context:

- **What stays the same:** The 170-point enrichment threshold, the basic company profile scoring, the tech keyword bonus system
- **What this guide adds:** Hiring signal strength weighting (urgency emphasis), engagement likelihood factors, staffing-specific disqualification rules
- **Future integration:** When `scoring.ts` becomes vertical-configurable, these weights should be loadable from this file. Until then, use this guide for manual lead review and Skill 6 learnings analysis.

---

## Quick Reference: What Makes a Great Staffing Lead?

1. **Multiple open engineering roles** posted in the last 2 weeks (urgency)
2. **Series A–C company** or mid-market with 100–2,000 employees (budget + need)
3. **VP Engineering or CTO** with verified contact info (reachable decision-maker)
4. **Roles open for 30+ days** (pain — they're struggling to fill internally)
5. **Tech-forward industry** with high engineering density (fintech, e-commerce, SaaS)
6. **Located in US or Singapore** (CirrusLabs primary markets)
