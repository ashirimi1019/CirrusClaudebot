# Contact Finding Guide - CirrusLabs

**Used by:** Skill 4 (Find Leads) to search for and validate decision-makers
**Output:** Contacts in database (buyers table) + CSV export for outreach

---

## ICP Decision-Maker Targets (Ranked by Effectiveness)

### Tier 1: Highest Priority (Best Reply Rate)
1. **CTO** (Chief Technology Officer)
   - **Authority:** Full hiring control + budget ownership
   - **Where to find:** LinkedIn title "CTO", Parallel search
   - **How to reach:** Email direct (easiest)
   - **Expected reply rate:** ~50% (highest)
   - **Why:** They FEEL the hiring pain directly

2. **VP of Engineering** / **VP Engineering**
   - **Authority:** Own entire engineering org
   - **Where to find:** LinkedIn "VP of Engineering", Parallel
   - **How to reach:** Email + LinkedIn follow-up
   - **Expected reply rate:** ~35%
   - **Why:** They think in terms of team capacity

### Tier 2: High Priority (Good Reply Rate)
3. **Director of Engineering** / **Engineering Manager**
   - **Authority:** Hiring for their team
   - **Where to find:** LinkedIn "Director of Engineering", Parallel
   - **How to reach:** Email (they're busy)
   - **Expected reply rate:** ~25%
   - **Why:** They have specific role needs

4. **Director of Data** / **Head of Data**
   - **Authority:** Hiring for data/analytics roles
   - **Where to find:** LinkedIn "Director of Data", Parallel
   - **How to reach:** Email
   - **Expected reply rate:** ~30% (for data-specific roles)
   - **Why:** Data projects require teams

5. **CIO** (Chief Information Officer) - Enterprise Only
   - **Authority:** Infrastructure + modernization budgets
   - **Where to find:** LinkedIn "CIO", Parallel
   - **How to reach:** Email + LinkedIn
   - **Expected reply rate:** ~20% (very busy)
   - **Why:** Cloud migration = team needs

### Tier 3: Founder/Co-founder (Use Carefully)
6. **Founder** / **Co-founder** / **CEO**
   - **Authority:** Full decision-making power
   - **Where to find:** LinkedIn company page, Parallel
   - **How to reach:** Email (NOT LinkedIn DMs - they get too many)
   - **Expected reply rate:** ~10-15% (very busy, lots of noise)
   - **Why:** They have bandwidth but are busy
   - **⚠️ Warning:** Don't make this your primary target - too much competition

---

## Contact Search Strategy (By Company Stage)

### Early-Stage Startup (Series A/B, <100 people)
**Who to target:**
1. CTO (if exists)
2. VP Eng (if exists)
3. Founder/CEO (likely running hiring themselves)

**Why:** Small companies move fast. CTOs have final say.

**Search keywords:**
- "CTO at [Company]"
- "Chief Technology Officer [Company]"
- "VP Engineering [Company] Series A"

---

### Growth-Stage Startup (Series B/C, 100-500 people)
**Who to target:**
1. VP of Engineering (primary)
2. CTO (secondary)
3. Director of Engineering (tertiary)

**Why:** VP created hiring infrastructure. They make placement decisions.

**Search keywords:**
- "VP of Engineering [Company]"
- "VP Engineering [Company]"
- "Head of Engineering [Company]"

---

### Mid-Market / SMB (50-1000 people)
**Who to target:**
1. VP of Engineering
2. Director of Engineering
3. CTO (if exists)

**Why:** These companies have middle management. VPs are decision-makers.

**Search keywords:**
- "VP Engineering [Company]"
- "Director of Engineering [Company]"
- "Engineering Manager [Company]"

---

### Enterprise (1000+ people)
**Who to target:**
1. CIO (Infrastructure/Platform projects)
2. VP of Engineering (Product engineering)
3. Director of Engineering (specific team needs)

**Why:** Large organizations have layers. CIOs own infrastructure budgets.

**Search keywords:**
- "CIO at [Company]"
- "Chief Information Officer [Company]"
- "VP of Engineering [Company]"

---

## Contact Search Workflow (What Skill 4 Does)

### Step 1: Prepare List of Companies
Input: Companies found by TheirStack or Parallel search
Example: 25 companies with hiring signals

### Step 2: For Each Company, Search for Decision-Makers

**Query Parallel:**
```
Query: {
  company_domain: "techcorp.com",
  job_titles: [
    "CTO",
    "VP of Engineering",
    "VP Engineering",
    "Director of Engineering",
    "CIO",
    "Founder",
    "Co-founder"
  ],
  limit: 10 (get up to 10 people matching titles)
}

Response: {
  first_name: "John",
  last_name: "Doe",
  title: "VP of Engineering",
  email: "john@techcorp.com",
  linkedin_url: "https://linkedin.com/in/johndoe",
  phone: null,
  raw_json: {...}
}
```

### Step 3: Extract and Deduplicate
- Extract: first_name, last_name, title, email, linkedin_url
- Check: Have we already emailed john@techcorp.com? (dedup by email)
- If YES → Skip
- If NO → Continue

### Step 4: Verify Email (Optional but Recommended)

**Query Leadmagic:**
```
Query: {
  email: "john@techcorp.com",
  company_domain: "techcorp.com"
}

Response: {
  email: "john@techcorp.com",
  verified: true,  // or false = likely invalid
  confidence: 0.95,  // or 0.65 = risky
  alternative_emails: ["john.doe@techcorp.com"],
  phone: "+1-555-123-4567"
}
```

**Decision:**
- Verified: true + confidence: 0.95 → Use the email ✅
- Verified: true + confidence: 0.65 → Use with caution ⚠️
- Verified: false → Don't email (bounce risk) ❌

### Step 5: Store in Database

**Save to contacts/buyers table:**
```
{
  company_id: "uuid-of-techcorp",
  first_name: "John",
  last_name: "Doe",
  title: "VP of Engineering",
  email: "john@techcorp.com",
  linkedin_url: "https://linkedin.com/in/johndoe",
  phone: "+1-555-123-4567",
  email_verified: true,
  enriched_at: "2026-02-24T10:00:00Z"
}
```

### Step 6: Export to CSV (For Outreach)

**Columns:**
```
first_name, last_name, title, email, company, company_domain, linkedin_url, phone
John, Doe, VP of Engineering, john@techcorp.com, TechCorp, techcorp.com, https://linkedin.com/in/johndoe, +1-555-123-4567
```

---

## Contact Quality Scoring

### Good Contact (✅ Email this person)
✅ Email verified or high confidence
✅ Title matches ICP (CTO, VP Eng, Director)
✅ Company matches ICP (size, location, funding)
✅ Not a recruiter (check LinkedIn)
✅ Not a generic email (no noreply@, support@, etc.)

### Risky Contact (⚠️ Use caution)
⚠️ Email confidence 0.65-0.80 (might bounce)
⚠️ Title is "Engineering Manager" (lower authority)
⚠️ 4000+ LinkedIn connections (might not be active)
⚠️ Email address is non-standard (fname.lname@company.com vs fname@company.com)

### Bad Contact (❌ Don't email)
❌ Email unverified or very low confidence
❌ Title is "Recruiter", "HR", "Talent Acquisition"
❌ Generic email (support@, hello@, noreply@)
❌ No email address available
❌ Company doesn't match ICP

---

## LinkedIn Signal Checking (Optional Enhancement)

Before emailing, you can check LinkedIn profile:

```
LinkedIn signals that person is likely to reply:
✅ Recently active (posted in last 2 weeks)
✅ Has employees (people follow them)
✅ Endorsements for relevant skills
✅ 500+ connections (active, but not too many)

LinkedIn signals they might NOT reply:
❌ Last activity 6+ months ago (might be inactive)
❌ Generic profile photo (might be placeholder account)
❌ 10000+ connections (likely not reading DMs)
❌ No recent company updates (check LinkedIn company page)
```

---

## Contact Finding by Signal Type

### If Signal = "Hiring for Data Engineer"
**Best contact types:**
- CTO (will know technical needs)
- VP of Engineering (owns hiring)
- Director of Data (if data-specific hire)

**Email angle:**
"I saw you're hiring Data Engineers. We specialize in placing senior data engineers..."

---

### If Signal = "Series B Funding"
**Best contact types:**
- Founder/CEO (likely running hiring post-funding)
- VP of Engineering (scaling team)

**Email angle:**
"Congrats on Series B. Now comes the fun part—scaling the team. We typically help companies like you..."

---

### If Signal = "General Company Fit (No Specific Signal)"
**Best contact types:**
- CTO (if small company)
- VP of Engineering (if mid-size)
- Director of Engineering (if large company)

**Email angle:**
"[Company] is in a growth phase where engineering matters. We help companies like yours..."

---

## Enrichment Sequence (Cost Optimization)

### Option 1: Email Only (Cheapest)
```
1. Find contact via Parallel (cost: $0.10-0.50)
2. Use email from Parallel (no verification cost)
3. Email directly
Cost: $0.10-0.50 per company
Risk: 5-10% bounce rate (some invalid emails)
```

### Option 2: Email + Verification (Recommended)
```
1. Find contact via Parallel (cost: $0.10-0.50)
2. Verify email via Leadmagic (cost: $0.50-2.00)
3. Email verified contacts only
Cost: $0.60-2.50 per company
Risk: <1% bounce rate (very safe)
Benefit: Reputation protected (no spam traps)
```

### Option 3: Email + Phone (Premium)
```
1. Find contact via Parallel (cost: $0.10-0.50)
2. Get phone via Leadmagic (cost: $0.50-2.00)
3. Email with option to call
Cost: $0.60-2.50 per company
Benefit: Phone follow-up if email doesn't work
```

**Recommendation:** Option 2 (Email + Verification) - Balances cost and safety.

---

## Common Issues & Solutions

### Issue 1: Email Not in Parallel Results
**Problem:** Company found, but no email address
**Solution:** Use Leadmagic to search for email independently
**Cost:** $0.50-2.00
**Risk:** Might not find it anyway (private company)

### Issue 2: Only Generic Email Found (support@, hello@)
**Problem:** Parallel returned generic email instead of personal
**Solution:** Skip this person or try phone (Leadmagic)
**Cost:** Skip saves money, phone adds $1-2
**Recommendation:** Skip (generic emails unlikely to reply)

### Issue 3: Email Verification Failed
**Problem:** Leadmagic says "not verified"
**Solution:** Either skip (safest) or risk it (5-10% bounce)
**Cost:** Skipping saves enrichment cost, but loses potential lead
**Recommendation:** Skip if confidence <0.80. Send if confidence >0.90.

### Issue 4: Too Many Contacts at One Company
**Problem:** Parallel found 10 CTOs at same company (unlikely)
**Solution:** Rank by seniority. Only email top 2-3
**Example:**
  - John Doe, CTO (email)
  - Jane Smith, VP Engineering (email)
  - Mike Johnson, Engineering Manager (skip)
  - ... (rest skip)
**Reason:** Don't email whole company. Don't double-message. Spam risk.

---

## Deduplication Rules

### Don't Email Same Person Twice
```
Before emailing john@techcorp.com:
✅ Check: Has this email been in ANY previous campaign?
✅ If YES → Skip this person
✅ If NO → Email them

This prevents spam complaints and LinkedIn flags
```

### Don't Email Whole Company
```
Before emailing from same company:
✅ Limit to 2-3 decision-makers per company
✅ Reason: They might talk to each other
✅ Also: LinkedIn might flag mass emails to same company
```

### Don't Email if Already Contacted
```
Check campaign_contacts table:
✅ If john@techcorp.com is in campaign X → Don't add to campaign Y
✅ Exception: 30+ days have passed + different offer
```

---

## Summary: Contact Finding Checklist

- [ ] Search Parallel for decision-maker titles (CTO, VP, Director)
- [ ] Get their email address (direct or search if missing)
- [ ] Verify email via Leadmagic (optional but recommended)
- [ ] Check if this person was already contacted (dedup)
- [ ] Check if >2 people from same company (limit per company)
- [ ] Store in database (buyers table) with verification status
- [ ] Export to CSV for outreach
- [ ] Remove bouncy/generic emails before final export

---

## Contact Finding by Region

### US Market
- **Most reliable source:** LinkedIn + Parallel
- **Best titles:** CTO, VP, Director
- **Email format:** Usually firstname@company.com or f.lastname@company.com
- **Verification needed:** Recommended (many invalid emails online)

### Brazil Market
- **Most reliable source:** LinkedIn (Parallel less complete)
- **Best titles:** CTO, VP (smaller companies, fewer layers)
- **Email format:** Varies (often @company.com.br)
- **Verification needed:** Essential (many typos in LinkedIn)

### Mexico Market
- **Most reliable source:** LinkedIn + Company websites
- **Best titles:** Founder (startups very small), CTO, VP
- **Email format:** Usually @company.com (some .mx)
- **Verification needed:** Recommended

---

## Quality Gates Before Outreach

**Before exporting contacts for outreach, check:**

1. ✅ Email is verified or high confidence
2. ✅ Title is in our target list (CTO, VP, Director, etc.)
3. ✅ No duplicates (same email in different companies)
4. ✅ Not already emailed in previous campaigns
5. ✅ Company matches ICP (size, location, funding)
6. ✅ Contact info is current (enriched in last 90 days)

**If any fail:** Filter them out before export.

---

## Success Metric

Good contact finding should result in:
- 3-5 contacts per company (you want options)
- 80%+ email verification rate (safe to send)
- <5% duplicate rate (good dedup)
- >25% reply rate (when outreach lands)

If you're getting <20% reply rate, problem might be:
1. Wrong titles (emailing non-decision-makers)
2. Bad emails (unverified, generic)
3. Bad signal (companies not actually hiring)
4. Bad copy (weak email messaging)
