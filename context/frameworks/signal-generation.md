# Signal Generation Guide - CirrusLabs

**Principle:** Signals must be observable (detectable by an API), relevant (correlate to hiring need), timely (indicate current/near-term need), and specific (narrow the audience).

---

## Primary Signal: Active Hiring

### The Signal
**Definition:** Company posted a job for Data Engineer, ML Engineer, Cloud Architect, or Software Engineer within the last 0-30 days.

**Why this signal?**
- ✅ **Observable:** TheirStack API detects real job postings in real-time
- ✅ **Relevant:** Job posting = someone approved hiring budget + they've started recruiting
- ✅ **Timely:** If posted in last 7 days, they're actively interviewing NOW
- ✅ **Specific:** We can filter by role, location, company

**Detection Method:**
```
API: TheirStack
Query: {
  job_title_or: ["Data Engineer", "ML Engineer", "Cloud Architect", "Software Engineer"],
  company_country_code_or: ["US", "MX", "BR", "CO"],
  date_posted: last_7_days,
  limit: 25
}
Result: Company name, domain, job title, job URL, posted date
```

**Example:**
- "TechCorp posted 'Senior Data Engineer - Remote' on 2026-02-23"
- Our email: "I saw TechCorp is hiring Senior Data Engineers [link]. We place 3-4 data engineers yearly at companies like yours..."

**Strength:** HIGH - This is the strongest signal. If someone is hiring, they have budget and timeline.

**Cost:** ~$0.20-0.50 per search

**Pod selling angle:** If we find 2+ roles at the same company, pitch pod selling instead of individual placement.

---

## Secondary Signals

### Hiring Signal: Specific Verticals
**Definition:** Company posted for Data Modernization, AI/ML, Cloud Platform, or DevOps roles.

**Why?**
- These roles indicate larger engineering initiatives
- Pod selling is very likely (3-5 people needed)
- Higher budget approval
- Longer-term projects

**Detection:** TheirStack job posting search filtered by title keywords
**Example:** "Acme is hiring 4 roles: ML Engineer, ML Ops, Data Engineer, Data Scientist"
**Angle:** "Pod selling - full AI/ML team buildout"

---

### Company Growth Signal
**Definition:** Company headcount grew 10%+ in last 6 months.

**Why?**
- Growth requires hiring
- Indicates budget availability
- Shows momentum
- Lower hiring urgency than active job posting, but good indicator

**Detection Method:**
```
API: Parallel
Query: {
  company_domain: "techcorp.com",
  employee_count_range: [50, 1000]
}
Result: Current employees, historical employee counts
```

**Example:**
- "TechCorp grew from 150 → 180 employees (6 months ago)"
- Our research: "They're adding headcount, likely hiring for engineering"

**Strength:** MEDIUM - Good secondary signal, not as strong as active posting

**Cost:** ~$0.10-0.50 per company

---

### Funding Signal
**Definition:** Company announced funding (Series B, Series C, growth round) in last 30-60 days.

**Why?**
- Fresh capital triggers hiring waves
- Budget approved for next 6-12 months
- Growth-oriented company

**Detection Method:**
```
API: Exa (AI web search)
Query: "[Company name] funding" OR "[Company name] Series B"
Result: News articles, press releases
```

**Example:**
- "StartupXYZ raised $50M Series B"
- Our research: "They'll be hiring aggressively for 6 months"

**Strength:** MEDIUM-HIGH - Good predictor, but hiring may take 4-6 weeks after funding

**Cost:** ~$0.10-0.30 per search

---

### Tech Stack Signal
**Definition:** Company uses modern tech stack (AWS, GCP, Azure, Databricks, Kafka, etc.) indicating engineering sophistication.

**Why?**
- Tech-forward companies hire continuously
- They understand quality hiring
- Willing to pay for senior talent
- Tech stack matches our expertise

**Detection Method:**
```
API: Parallel
Query: {
  company_domain: "techcorp.com",
  tech_stack: ["AWS", "Kubernetes", "Databricks", "Apache Kafka"]
}
Result: Technologies used by company
```

**Example:**
- "TechCorp uses AWS, Kubernetes, Databricks, and Kafka"
- Our research: "They need senior engineers who know these tools"

**Strength:** LOW-MEDIUM - Good for targeting quality buyers, not a direct hiring signal

**Cost:** Included in Parallel company search (~$0.10-0.50)

---

### Leadership/Market Signal
**Definition:** Company announced new CTO, VP Engineering, or CEO in last 30-60 days.

**Why?**
- New leaders often build new teams
- They have mandate to hire and modernize
- Leadership changes = reorganization = hiring

**Detection Method:**
```
API: Exa (AI web search)
Query: "[Company name] hires new CTO" OR "[Company name] VP Engineering"
Result: News, LinkedIn, press releases
```

**Example:**
- "TechCorp hired Jane Doe as new VP Engineering"
- Our research: "New VP usually builds new team - likely hiring"

**Strength:** MEDIUM - Good indicator, but not immediate hiring need

**Cost:** ~$0.10-0.30 per search

---

## Signal Hierarchy (For Prioritization)

### Tier 1: Immediate Action (Hire within 1-2 weeks)
1. **Active job posting** (0-7 days old) - Book meetings THIS week
2. **Multiple open roles** (2+ positions) - Pod selling opportunity

### Tier 2: Near-term (Hire within 2-4 weeks)
3. **Recent funding** (within 30 days) - Hiring wave starting
4. **Job posting** (8-30 days old) - Still actively recruiting
5. **Leadership change** (CTO/VP hired in last 30 days)

### Tier 3: Future opportunity (Hire within 1-3 months)
6. **Headcount growth** (10%+ in last 6 months)
7. **Tech stack match** (modern stack, likely hiring soon)

### Tier 4: Baseline ICP match (No specific signal yet)
8. **Right company size** + **Right location** - Generic company search

---

## Signal Combination (Multiplier Effect)

Strongest combinations:

| Signals | Strength | Example |
|---------|----------|---------|
| Active hiring + multiple roles | 🔴 URGENT | "2+ Data/ML/Cloud roles posted this week" |
| Active hiring + recent funding | 🔴 URGENT | "Hired Data Engineer + just raised Series B" |
| Active hiring + leadership change | 🟡 HIGH | "Hiring for cloud architect + new CTO" |
| Active hiring + growth signal | 🟡 HIGH | "Growing headcount + posting for engineers" |
| Recent funding + growth + right size | 🟢 GOOD | "Funded, growing, right size, but no job posting YET" |
| Right size + tech match + right location | 🟢 OKAY | "Good company, but no hiring signal yet" |

---

## Region-Specific Signals

### US Market
- **Primary signal:** Active job posting
- **Secondary:** Funding announcements
- **Market:** Mature, fast decisions, high budgets

### LATAM Market (Brazil)
- **Primary signal:** Headcount growth + funding
- **Secondary:** Active job posting
- **Market:** Emerging, growth startups, international hiring

### LATAM Market (Mexico)
- **Primary signal:** Active job posting from tech hubs (Mexico City, Monterrey)
- **Secondary:** VC-funded startups
- **Market:** Fast-growing startup scene

---

## Signal NOT to Use (Non-Observable)

❌ **Avoid these** - They're not detectable:
- "Company needs engineers" (too vague)
- "CEO is frustrated with team" (opinion, not observable)
- "Company has budget" (can't verify)
- "They're probably hiring" (guessing)
- "I saw their website" (not a signal, just observation)

✅ **Only use** what an API can find:
- Job postings ✅
- News articles ✅
- Company data (size, growth) ✅
- Tech stack ✅
- Funding announcements ✅

---

## Signal to API Routing

| Signal | API to Use | Cost | Example |
|--------|-----------|------|---------|
| Active job posting | TheirStack | $0.20-0.50 | "hiring Data Engineer" |
| Company growth | Parallel | $0.10-0.50 | "grew to 180 employees" |
| Funding news | Exa | $0.10-0.30 | "Series B raised" |
| Tech stack | Parallel | (included) | "using AWS" |
| Leadership change | Exa | $0.10-0.30 | "new CTO hired" |
| General ICP match | Parallel | $0.10-0.50 | "50-1000 employees, US" |

---

## Campaign Signal Strategy Template

When creating a campaign, define:

```
Campaign: [name]
Primary Signal: [which signal are we targeting?]
API: [which API detects it?]
Cost: [expected cost]
Expected Volume: [how many companies per search?]
Expected Fit: [% of results that match ICP?]
Outreach Angle: [what do we say based on this signal?]

Example:
Campaign: Q1 Data Engineer Hiring
Primary Signal: Active job posting for Data Engineer
API: TheirStack
Cost: $0.30 per search
Expected Volume: 20-30 companies per search
Expected Fit: 60% (many will be too small or non-tech)
Outreach Angle: "I saw you're hiring Data Engineers. We specialize in placing senior DE's at growth-stage tech companies."
```

---

## Key Principle

**You are only as good as your signals.**

Vague signals = unfocused outreach = low reply rates.
Observable signals = targeted outreach = high reply rates.

Every signal in this system must answer: "What API detects this?"
If you can't answer that question, it's not a valid signal for this system.
