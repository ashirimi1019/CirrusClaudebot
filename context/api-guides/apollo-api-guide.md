# Apollo.io API Guide

## Overview

Apollo is the **only external API** used in this system. It replaces:
- TheirStack (hiring signals / company search)
- Hunter.io (decision-maker discovery)
- Instantly (email sequences + analytics)

**Base URL:** `https://api.apollo.io/api/v1`
**Auth:** `x-api-key: {APOLLO_API_KEY}` header

---

## Endpoints Used

### 1. Company Search (Skill 4 — Hiring Signals)
```
POST /mixed_companies/search
```
Find companies actively hiring for given roles.

**Key Parameters:**
```json
{
  "q_organization_job_titles": ["Data Engineer", "ML Engineer"],
  "organization_num_employees_ranges": ["51,200", "201,500", "501,1000"],
  "organization_locations": ["United States"],
  "per_page": 25,
  "page": 1
}
```

**Response:** `data.organizations[]` with `id, name, website_url, estimated_num_employees, industry, funding_stage, keywords`

### 2. People Search (Skill 4 — Decision-Makers)
```
POST /mixed_people/search
```
Find decision-makers at specific companies by Apollo organization IDs.

**Key Parameters:**
```json
{
  "organization_ids": ["apollo_org_id_1", "apollo_org_id_2"],
  "person_titles": ["CTO", "VP of Engineering", "Founder"],
  "contact_email_status": ["verified", "likely to engage"],
  "per_page": 5
}
```

**Response:** `data.people[]` with `id, first_name, last_name, title, email, linkedin_url, organization_id`

### 3. Contact Create (Skill 5)
```
POST /contacts/bulk_create
```
Create contacts in Apollo CRM for sequence enrollment.

**Key Parameters:**
```json
{
  "contacts": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "title": "CTO",
      "organization_name": "Acme Corp",
      "website_url": "https://acme.com"
    }
  ]
}
```

### 4. Sequence Management (Skill 5)
```
GET  /emailer_campaigns          — List sequences
POST /emailer_campaigns          — Create sequence
POST /emailer_steps              — Add email step
POST /emailer_campaigns/{id}/add_contact_ids — Enroll contacts
```

### 5. Sequence Metrics (Skill 6)
```
GET /emailer_campaigns/{id}      — Get sequence metrics (open_rate, reply_rate, etc.)
GET /emailer_messages?emailer_campaign_id={id}&type=reply — Get replies
```

---

## Rate Limits & Credits

| Operation | Credits Used | Notes |
|-----------|-------------|-------|
| Company search | ~0.01/search | 25 results per page |
| People search | ~0.01/search | 5-10 per company |
| Email reveal | 1 credit/email | Only for verified emails |
| Contact export | 1 credit/contact | When exporting to CSV |

**Cost per campaign:** $2-5 for 50-100 qualifying companies

---

## Error Handling

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 401 | Invalid API key | Check APOLLO_API_KEY in .env |
| 422 | Invalid parameters | Check payload structure |
| 429 | Rate limited | Wait 60s, retry |
| 500 | Apollo server error | Retry after 5min |

**Our client** (`src/lib/clients/apollo.ts`) handles all of these automatically.

---

## Tips

1. **Batch organization IDs** — Send up to 10 org IDs per people search to reduce API calls
2. **Use `per_page: 25`** — Maximum efficient page size
3. **Filter by email status** — Use `"verified"` and `"likely to engage"` to reduce bounces
4. **Dedup by org ID** — Apollo can return same company across multiple searches

---

## Sequence Best Practices

1. **3-step sequences work best:** Day 0 (intro), Day 3 (follow-up), Day 7 (breakup)
2. **Name sequences clearly:** `CirrusLabs - {campaign-slug}` for easy tracking
3. **One sequence per campaign:** Don't mix campaigns into one sequence
4. **Monitor bounce rate:** > 5% = bad list, pause and clean

---

## Getting Your API Key

1. Log in to [app.apollo.io](https://app.apollo.io)
2. Go to **Settings → Integrations → API**
3. Copy the API key
4. Add to `.env`: `APOLLO_API_KEY=your_key_here`
