# API Routing Guide - CirrusLabs

**Purpose:** When Skill 2 (Campaign Strategy) or Skill 4 (Find Leads) needs to search for signals, this guide determines which API to call.

---

## Signal to API Routing Matrix

| Signal Type | Recommended API | Why | Query | Cost | Expected Results |
|---|---|---|---|---|---|
| **Hiring: Data Engineer** | TheirStack | Real-time job postings | `job_title: "Data Engineer"` | $0.20-0.50 | 5-20 companies/search |
| **Hiring: ML Engineer** | TheirStack | Real-time job postings | `job_title: "ML Engineer"` | $0.20-0.50 | 5-15 companies/search |
| **Hiring: Cloud Architect** | TheirStack | Real-time job postings | `job_title: "Cloud Architect"` | $0.20-0.50 | 3-10 companies/search |
| **Hiring: Software Engineer** | TheirStack | Real-time job postings | `job_title: "Software Engineer"` | $0.20-0.50 | 15-30 companies/search |
| **Headcount: 50-1000 employees** | Parallel | Company data filtering | `employee_count: 50-1000` | $0.10-0.50 | 100s companies |
| **Recent Funding (Series A+)** | Exa | News/web search | `"Series B" OR "Series A" [company]` | $0.10-0.30 | 1-5 companies/search |
| **Tech Stack: AWS/Cloud** | Parallel | Company tech profiles | `tech_stack: "AWS"` | $0.10-0.50 | 10-50 companies |
| **General ICP Match** | Parallel | Default search | `size: 50-1000, location: US` | $0.10-0.50 | 50-200 companies |
| **Leadership: New CTO** | Exa | News search | `"new CTO hired" [company]` | $0.10-0.30 | 1-3 companies/search |
| **Email Verification** | Leadmagic | Email finding & verification | `email: john@company.com` | $0.50-2.00 | 90%+ accuracy |

---

## API Selection Logic (Decision Tree)

When Skill 4 (Find Leads) runs, it should follow this logic:

```
Is there a specific hiring signal?
  ├─ YES → Use TheirStack for job posting search
  │   └─ Extract roles, locations, company info
  │
  ├─ NO → Are we filtering by company characteristics?
  │   ├─ YES → Use Parallel for company search
  │   │   └─ Filter by size, location, tech stack, growth
  │   │
  │   ├─ NO → Are we looking for funding or news?
  │   │   └─ Use Exa for web search
  │   │
  │   └─ DEFAULT → Parallel company search with ICP filters

After finding companies:
  ├─ Check fit against ICP before enriching
  ├─ Call Parallel → Find decision-makers (titles: CTO, VP Eng, etc.)
  ├─ Get emails via Parallel
  ├─ Verify emails with Leadmagic (optional, but recommended)
  └─ Deduplicate before saving to database
```

---

## Cost Optimization Strategy

### Phase 1: Research (Finding Companies) - CHEAP
```
1. TheirStack: Search for job postings ($0.20-0.50 per search)
   → Returns: 5-20 companies per search

2. Parallel: Search by company size/location ($0.10-0.50 per search)
   → Returns: 100s of results

Cost: ~$0.20-0.50 to find 20 companies
```

### Phase 2: Qualification (Check ICP Fit) - MEDIUM
```
1. Check ICP scoring in Parallel results:
   - Right size? ✅
   - Growing? ✅
   - Tech-forward? ✅

DO NOT enrich non-matching companies
This saves 80% of enrichment costs

Cost: ~$0 (just database lookups)
```

### Phase 3: Enrichment (Get Decision-Makers) - EXPENSIVE
```
1. Only enrich companies that scored HIGH on ICP
2. Parallel: Find decision-makers ($0.10-0.50 per company)
   → Returns: 2-5 people per company

3. Leadmagic: Verify emails ($0.50-2.00 per email)
   → Only verify emails we'll actually use

Cost: ~$1.50-3.00 per qualified company
```

### Cost Minimization Rules
✅ **DO:**
- Filter in Parallel BEFORE enriching (ICP check = free)
- Only enrich companies scoring 170+ points
- Batch searches (search for 5 roles at once, not one per role)
- Verify emails only for decision-makers we'll contact

❌ **DON'T:**
- Enrich every company found (expensive!)
- Verify emails for every person in company
- Search for roles one at a time
- Enrich companies that don't meet size criteria

---

## API Query Examples

### Example 1: Find Data Engineers Hiring in US

**Skill 2 Strategy Decision:**
```
Campaign: Q1 Data Engineers - US
Signal: Active hiring for Data Engineer
API: TheirStack
```

**Skill 4 Find Leads Execution:**
```
Step 1: Search with TheirStack
  Query: {
    job_title_or: ["Data Engineer", "Senior Data Engineer"],
    company_country_code_or: ["US"],
    date_posted: [last_7_days],
    limit: 25
  }

  Results:
    - TechCorp.com, "Senior Data Engineer", posted 2026-02-23
    - Acme.io, "Data Engineer", posted 2026-02-21
    - StartupXYZ.com, "Data Engineer", posted 2026-02-20
    [... 22 more companies]

Step 2: Score against ICP (in database, no API cost)
  - TechCorp: 150 employees, Series A ✅ (Score: 170 points)
  - Acme: 15 employees, pre-revenue ❌ (Score: 90 points - skip)
  - StartupXYZ: 200 employees, Series B ✅ (Score: 220 points)

Step 3: Enrich ONLY qualified companies (2 out of 25)
  Query Parallel for each qualified company:
    - Find: CTO, VP Eng, Director of Eng, Founder
    - Get: name, email, LinkedIn, title
    - Cost: ~$0.30-0.50 per company × 2 = ~$0.60

Step 4: Verify emails (Leadmagic, optional)
  - Verify: john@techcorp.com, jane@startupxyz.com
  - Cost: ~$1.00-2.00 per email
  - Save cost: Only verify if reply rate matters (yes)

Total cost: $0.60 (Parallel) + $1.50-2.00 (Leadmagic) = ~$2.10
Result: 25 companies searched, 2 qualified, 4-8 decision-makers found
```

---

### Example 2: Find Series B Companies in Brazil

**Skill 2 Strategy Decision:**
```
Campaign: Q1 Series B Hiring - Brazil
Signal: Recent funding announcement
API: Exa (news search)
```

**Skill 4 Find Leads Execution:**
```
Step 1: Search with Exa for Series B funding news
  Query: "Series B funding Brazil tech startups" (recent)
  Results: 5-10 companies with funding news

Step 2: Search Parallel for each funded company
  Query: Get employee count, location, tech stack
  Cost: ~$0.10-0.50 per company × 8 = ~$0.80

Step 3: Score against ICP
  - Pre-revenue but funded → Wait 30-60 days before outreach
  - Already 50+ employees + Series B → Perfect ICP fit

Step 4: Find decision-makers (only for high-fit)
  Query Parallel: Find CTO, VP Eng, Founder
  Cost: ~$0.30-0.50 per company × 3 high-fit = ~$0.90

Total cost: ~$1.70-2.20
Result: 8 funded companies, 3 matched ICP, 6-12 decision-makers
```

---

## When to Use Each API

### ✅ Use TheirStack When:
- You want to find companies actively hiring
- You have specific job titles to search for
- You want job URLs (proof of hiring)
- You want real-time data (posted in last 7 days)
- **Cost:** ~$0.20-0.50 per search

### ✅ Use Parallel When:
- You want to find companies by size/location/tech
- You want to find decision-makers at a company
- You want company enrichment (employees, funding, growth)
- You want to check ICP fit
- **Cost:** ~$0.10-0.50 per company

### ✅ Use Exa When:
- You're searching for recent news (funding, leadership changes)
- You want context beyond structured data
- You want to verify information
- **Cost:** ~$0.10-0.30 per search

### ✅ Use Leadmagic When:
- You found a person and need to verify their email
- You need to find secondary emails
- You need phone numbers
- **Cost:** $0.50-2.00 per person

---

## Deduplication Rules (Prevent Double Work)

### Company-Level Deduplication
```
Before enriching: Check if company.domain already in database
  ✅ If YES → Use existing company record, don't call API again
  ❌ If NO → Enrich with Parallel, then save
```

### Contact-Level Deduplication
```
Before emailing: Check if contact.email already in database
  ✅ If YES → Skip enrichment, use existing record
  ✅ If already in THIS campaign → Don't message twice
  ❌ If NO → Find email with Parallel/Leadmagic, then save
```

### Why Deduplicate?
- Save 50-80% on API costs
- Don't message same person twice (spam risk)
- Maintain data quality (one source of truth per person)
- Track campaign participation (don't oversend)

---

## API Limits & Rate Limiting

| API | Daily Limit | Per Request | How to Handle |
|---|---|---|---|
| TheirStack | 1000s | 25-100 per search | Batch multiple roles/regions in one search |
| Parallel | 1000s | Reasonable | Spread calls across day |
| Exa | 1000s | Reasonable | Don't spam searches |
| Leadmagic | Limited by credits | Verify only needed emails | Check company first, then decide |

---

## API Failure Fallback

If API fails or limits reached:

```
TheirStack fails → Fall back to Parallel (generic company search by size)
Parallel fails → Fall back to Exa (web search)
Leadmagic not available → Email verification omitted (send at own risk)
```

---

## Summary: Right API for Right Signal

| Goal | API | Cost | Speed |
|------|-----|------|-------|
| Find companies hiring NOW | TheirStack | $0.20-0.50 | Fast |
| Find decision-makers | Parallel | $0.10-0.50 | Fast |
| Verify it's the right person | Parallel + Leadmagic | $0.50-2.50 | Medium |
| Find companies by ICP | Parallel | $0.10-0.50 | Medium |
| Find recent news/funding | Exa | $0.10-0.30 | Medium |
| **Full pipeline per company** | All 3 | $1.50-3.50 | 5-10 min |

**Best Practice:** Start with TheirStack + Parallel. Add Exa and Leadmagic when you need those specific signals.
