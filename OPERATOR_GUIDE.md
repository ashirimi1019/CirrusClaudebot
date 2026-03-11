# CirrusLabs Operator Guide

> Signal-driven outbound automation — complete reference for running the 6-skill pipeline via the dashboard.

---

## 1. Logging In

1. Go to **[https://cirrus-claudebot.vercel.app](https://cirrus-claudebot.vercel.app)**
2. Click **Continue with Google** and authenticate with your Google account
3. You will land on the **Dashboard** home page showing KPI cards and recent activity
4. Your name and avatar appear in the bottom-left corner of the sidebar when signed in

> **Local dev:** Run `npm run dev` inside `frontend/` (port 3001), then visit `http://localhost:3001`

---

## 2. Creating or Opening a Campaign

### Create a new offer + campaign (first time)

1. Click **Offers** in the left sidebar
2. Click **New Offer** (top-right)
3. Fill in the offer name (e.g. *Talent As A Service - US*) — this runs **Skill 1** and generates `positioning.md`
4. After Skill 1 completes, you land on the **Offer detail** page
5. Click **New Campaign**
6. Enter your signal hypothesis (e.g. *Companies hiring Data Engineers in the US*)
7. Submit — this runs **Skill 2** and creates `strategy.md`
8. You are taken to the **Campaign dashboard**

### Open an existing campaign

- **Via Offers:** Sidebar → **Offers** → click an offer card → click a campaign row
- **Via Campaigns:** Sidebar → **Campaigns** → find the campaign in the table → hover the row and click **Open →**

---

## 3. Running Skills 1–6 in Order

Open a campaign and select the **Pipeline** tab. Six skill cards are displayed in sequence with status badges.

| Skill | Name | What it does | Approx. cost |
|-------|------|-------------|-------------|
| 1 | New Offer | Defines the 13-section positioning canvas | Free |
| 2 | Campaign Strategy | Signal targeting, messaging framework, buyer filters | Free |
| 3 | Campaign Copy | Generates 3 email + 3 LinkedIn variants via OpenAI | ~$0.50 |
| 4 | Find Leads | Searches Apollo.io for companies + decision-makers | ~$2–5 |
| 5 | Launch Outreach | Auto-personalises placeholders, exports `messages.csv` | Free |
| 6 | Campaign Review | Analyses results, saves learnings to `what-works.md` | Free |

### Running a skill

1. Click the **Run** button on any unlocked skill card
2. A live log panel opens below the stepper — output streams in real time via SSE
3. The status badge changes: **Locked → Ready → Running → Done**
4. Each skill unlocks the next automatically once its output files exist
5. Skills must be run **in order** — you cannot run Skill 4 before Skills 1–3 are complete

> **Cost warning:** Skill 4 calls the Apollo.io API and consumes credits (~200–500 credits per campaign). Run Skills 1–3 first to validate copy before spending credits on leads.

---

## 4. Viewing Outputs

Each campaign dashboard has four tabs:

| Tab | Content |
|-----|---------|
| **Pipeline** | Live skill runner, status per step, streaming logs |
| **Leads** | Table of companies and decision-makers found by Skill 4 (`all_leads.csv`) |
| **Copy** | Rendered email variants and LinkedIn DM variants from Skill 3 |
| **Results** | Learnings markdown from Skill 6 (`results/learnings.md`) |

You can also view the raw positioning file for any offer by clicking **Positioning File** on the Offer detail page — this opens the markdown file directly in your browser.

---

## 5. Reviewing Old Campaigns

1. Click **Campaigns** in the sidebar
2. The table lists all campaigns across all offers with:
   - **Status** — Draft / Active / Complete (derived from whether messages have been sent and how long ago)
   - **Sent** — total messages sent
   - **Contacts** — decision-makers discovered
   - **Reply Rate** — from `campaign_metrics`
   - **Meetings** — meetings booked
3. Use the **filter tabs** (All / Active / Complete / Draft) to narrow the list
4. Click **Open →** (appears on row hover) to jump to the full campaign dashboard
5. The **Analytics** page (`/dashboard/analytics`) shows aggregate KPIs and a pipeline funnel across all campaigns

---

## 6. Exporting CSV

CSV export is available on both the **Companies** and **Contacts** pages:

1. Sidebar → **Companies** (or **Contacts**)
2. Click the **CSV** button in the top-right corner
3. A `.csv` file downloads immediately containing all records in the current view

Skill 4 also writes a combined CSV directly to disk:
```
offers/{offer-slug}/campaigns/{campaign-slug}/leads/all_leads.csv
```
This file contains one row per contact with full company context and is ready for direct import into Apollo sequences.

---

## 7. Exporting XLSX

XLSX export follows the same flow as CSV:

1. Sidebar → **Companies** (or **Contacts**)
2. Click the **XLSX** button in the top-right corner
3. A `.xlsx` file downloads with all records formatted as a spreadsheet

Skill 5 also exports a personalised outreach file to disk:
```
offers/{offer-slug}/campaigns/{campaign-slug}/outreach/messages.csv
```
All placeholders (`[Company Name]`, `[First Name]`, `[role]`) are auto-replaced — this file is ready to upload to Apollo sequences with zero manual editing.

---

## 8. Known Limitations

| Area | Limitation |
|------|-----------|
| **Skill 5 / Apollo sequences** | Apollo's sequence listing API returns 404 on some account plans. The outreach `messages.csv` is still generated correctly — manually upload it to Apollo → Sequences as a workaround. |
| **LinkedIn automation** | LinkedIn DM sending is **not automated**. `linkedin-variants.md` is generated by Skill 3, but sending must be done manually from the CEO account (max 5–10 actions/day to avoid bans). |
| **Skill 4 Apollo credits** | Each campaign consumes ~200–500 Apollo credits. Skills 1–3 are completely free — validate your strategy and copy before running Skill 4. |
| **Open Rate metric** | Apollo does not expose open-rate data via API. The Analytics and Campaigns pages show Reply Rate and Meetings Booked instead. |
| **Duplicate offers** | The system does not deduplicate offers with the same name. Use unique, descriptive offer names to avoid confusion. |
| **Status check is file-based** | The Pipeline status badge checks whether output files exist on disk (`positioning.md`, `strategy.md`, etc.). If files are deleted, skills will appear unlocked even if DB records exist. |
| **Session scope** | All data is scoped to your Supabase project. Multiple users share the same database — campaigns created by one user are visible to all. |
| **Local vs. production** | Running skills locally writes output files to your local `offers/` directory. The production Vercel dashboard reads from Supabase — file-based outputs (CSVs, markdown) are only visible when running locally or if files are committed to the repo. |

---

## Quick Reference

```
Dashboard home      /dashboard
Offers list         /dashboard/offers
New offer           /dashboard/offers/new
Offer detail        /dashboard/offers/{offer-slug}
New campaign        /dashboard/offers/{offer-slug}/campaigns/new
Campaign dashboard  /dashboard/offers/{offer-slug}/campaigns/{campaign-slug}
All campaigns       /dashboard/campaigns
Companies           /dashboard/companies
Contacts            /dashboard/contacts
Analytics           /dashboard/analytics
Settings            /dashboard/settings
```

---

*Last updated: March 2026*
