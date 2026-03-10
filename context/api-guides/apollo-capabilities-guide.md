# Apollo Capabilities Guide

## What Apollo Replaces in Our Stack

| Old Tool | What It Did | Apollo Equivalent |
|----------|-------------|------------------|
| TheirStack | Company search by hiring signals | `/mixed_companies/search` with `q_organization_job_titles` |
| Hunter.io / Parallel | Find emails for decision-makers | `/mixed_people/search` with `organization_ids` |
| Instantly | Email sequences + automation | `/emailer_campaigns` + `/emailer_steps` + `/add_contact_ids` |
| Instantly (analytics) | Open/reply rate tracking | `/emailer_campaigns/{id}` with rate fields |

**Result:** One API, one key, one bill, one integration.

---

## Apollo Feature Map

### People Intelligence
- Email discovery (verified + likely to engage)
- Phone numbers (direct + mobile)
- LinkedIn profiles
- Job title + seniority
- Company affiliation history

### Company Intelligence
- Employee count (estimated)
- Industry + keywords
- Funding stage + amount
- Location (city, state, country)
- Technology stack
- Open job postings

### Outreach Automation
- Email sequences (multi-step)
- Automatic scheduling
- A/B variant support
- Reply detection
- Bounce + unsubscribe handling

### Analytics
- Open rate, reply rate, bounce rate
- Per-contact status tracking
- Sequence performance metrics
- Individual reply content

---

## Data Quality Notes

### Emails
- **Verified:** Confirmed deliverable (safest, use first)
- **Likely to engage:** Apollo predicts > 50% chance of delivery
- **Unverified:** Unknown — use with care
- **Unavailable:** Email not found — skip these

### Employee Count
- Apollo uses `estimated_num_employees` — typically within ±20% of actual
- Cross-reference with LinkedIn if precision matters

### Funding Stage
- Apollo tracks: `seed`, `series_a`, `series_b`, `series_c`, `ipo`, `acquired`, `unfunded`
- Not always up to date — treat as approximate signal

---

## Apollo Limits (Know Before You Search)

| Limit | Default | Notes |
|-------|---------|-------|
| Results per page | 25 | Max per `/search` call |
| Max pages | 500 | 12,500 results max per query |
| Bulk contact create | 100 per call | Batch larger lists |
| Sequence enrollment | 100 per call | Batch larger lists |
| API rate limit | Varies by plan | 429 = slow down |

---

## Account Setup Checklist

Before running Skill 4 or 5:

- [ ] Apollo account created (app.apollo.io)
- [ ] Email account connected (Settings → Email Accounts)
- [ ] API key created (Settings → Integrations → API)
- [ ] Key added to `.env` as `APOLLO_API_KEY`
- [ ] Test with: `npm run skill:4 -- test-offer test-campaign`

---

## When Apollo Returns Empty Results

### Company Search Returns 0
- Check `q_organization_job_titles` — titles must match Apollo's taxonomy
- Try broader titles: "Engineer" instead of "Data Engineer"
- Remove location filter and test globally first

### People Search Returns 0
- Check `organization_ids` — must be valid Apollo org IDs (from company search)
- Relax `person_titles` — try just `["CTO"]` to test
- Remove `contact_email_status` filter to see if people exist at all

### Email Enrollment Fails
- Verify email account is connected and active in Apollo
- Check `send_email_from_email_account_id` is valid
- Confirm sequence exists and has at least 1 step

---

## Apollo vs Alternatives (Why We Chose Apollo)

| Criterion | Apollo | TheirStack + Hunter + Instantly |
|-----------|--------|---------------------------------|
| Setup | 1 API key | 3+ API keys, 3 accounts |
| Monthly cost | $99-$299/mo | $200-$500/mo combined |
| Data overlap | Unified DB | Separate DBs, sync issues |
| Sequences | Built-in | Separate tool (Instantly) |
| Analytics | Built-in | Separate tool |
| Support | 24/7 | Variable |

The simplification alone is worth the switch.
