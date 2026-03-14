# AI & Data Consulting — Observable Signals

## Signal Hierarchy

Signals are ranked by intent strength. Higher-tier signals indicate a company is actively looking to invest in AI/data capabilities. Lower-tier signals indicate latent need that may require education before conversion.

---

## Tier 1: High-Intent Signals (Active Buying Window)

### Signal 1.1: Hiring First Senior Data Leader
**What to look for:** Job postings for CDO, VP Data, Head of Data, VP Analytics, Head of ML — especially when the company has never had this role before.
**Why it matters:** Company has decided to invest in data capabilities and is building the function. A newly hired leader often needs external support to build their team and platform quickly.
**Observable via:**
- Apollo job postings: title keywords "Chief Data Officer", "VP Data", "Head of Data", "VP Analytics", "Head of Machine Learning"
- Filter: companies with 200-5000 employees, posted within last 30 days
- Bonus signal: Same company posting multiple data roles simultaneously (building a team)

**Apollo query mapping:**
- `person_titles`: ["Chief Data Officer", "VP Data", "VP Data Engineering", "Head of Data", "VP Analytics", "Head of Machine Learning"]
- `organization_num_employees_ranges`: ["201,500", "501,1000", "1001,5000"]
- Filter for job postings aged < 30 days

### Signal 1.2: Failed Data Leadership Search
**What to look for:** A data leadership role that was posted 60-90+ days ago, is still open, or was recently removed without being filled.
**Why it matters:** The company tried to hire a senior data leader and couldn't find one. This is the ideal entry point for fractional data leadership.
**Observable via:**
- Apollo: search for data leadership roles posted > 60 days ago still showing as active
- LinkedIn: role posted, then removed, with no new hire announcement
- Glassdoor: continued postings for same senior data role over multiple months

### Signal 1.3: Multiple Data Engineering Roles Posted Simultaneously
**What to look for:** 3+ data-related roles (data engineer, analytics engineer, ML engineer) posted within the same 2-week window.
**Why it matters:** Company is building or scaling a data team. They need architecture guidance, not just bodies.
**Observable via:**
- Apollo job search: `q_organization_job_titles` with data engineering keywords
- Group by company, filter for 3+ openings in data roles within 14-day window
- Job descriptions mentioning "greenfield", "from scratch", "building the team"

### Signal 1.4: Funding Round Mentioning AI/Data
**What to look for:** Recent Series B+ funding announcement where the press release or founder quote mentions AI, machine learning, data platform, or analytics as a strategic priority.
**Why it matters:** Money has been raised specifically for data/AI initiatives. Budget exists. Timeline is short (investors expect results).
**Observable via:**
- Apollo organization search: `latest_funding_date_range` within last 90 days
- Cross-reference with Crunchbase or press mentions of "AI", "machine learning", "data-driven"
- Filter: Series B and above, $20M+ raise

---

## Tier 2: Medium-Intent Signals (Need Exists, Timing Uncertain)

### Signal 2.1: Modern Data Stack Adoption Without Maturity
**What to look for:** Company uses Snowflake, Databricks, or BigQuery but is still posting for basic data engineering roles, suggesting they've bought tools but haven't gotten value yet.
**Why it matters:** They've invested in the platform but are struggling with implementation. Classic consulting engagement: help them get ROI from tools they already own.
**Observable via:**
- Apollo technographics: `currently_using_any_of_technology_uids` for snowflake, databricks, bigquery
- Cross-reference with job postings for data engineers (indicates they need implementation help)
- Company blog posts about "migrating to Snowflake" or "adopting dbt"

### Signal 2.2: Job Descriptions Mentioning Specific Pain Points
**What to look for:** Data role job descriptions that include phrases like: "data quality", "pipeline reliability", "self-serve analytics", "ML in production", "data governance", "reduce technical debt"
**Observable via:**
- Apollo job search with keyword matching in job descriptions
- Focus keywords: "data quality issues", "pipeline maintenance", "technical debt", "greenfield data platform", "first data hire"
**Why it matters:** These phrases reveal specific, articulable pain — not generic hiring. The company knows what hurts and is trying to fix it.

### Signal 2.3: Data Tool Adoption Signals
**What to look for:** Company recently adopted (within 6 months) tools like dbt, Airflow, Dagster, MLflow, Great Expectations, or Atlan.
**Why it matters:** They're investing in the modern data stack but likely need implementation expertise to do it well. The tool purchase decision has been made; now they need help getting value.
**Observable via:**
- Apollo technographics for recently adopted tools
- GitHub activity (new repos with dbt models, Airflow DAGs)
- Job descriptions mentioning specific tools as "nice to have" (means they're evaluating)

### Signal 2.4: Leadership Change in Data/Tech
**What to look for:** New CTO, CDO, VP Engineering, or VP Data joined the company within the last 90 days.
**Why it matters:** New leaders make changes. A new data leader especially will want to put their stamp on the data strategy and often brings in trusted external partners to move fast.
**Observable via:**
- Apollo people search: filter by recent title changes or job start dates
- LinkedIn profile updates (new role announcements)
- Press releases about executive appointments

---

## Tier 3: Latent Signals (Need May Exist, Requires Education)

### Signal 3.1: Competitor AI/ML Launch
**What to look for:** A direct competitor of the target company launched an AI-powered feature, ML-driven product, or data analytics offering.
**Why it matters:** Creates urgency. "Our competitor has AI and we don't" is a powerful motivator for boards and CEOs.
**Observable via:**
- Industry press monitoring for AI feature announcements
- Product Hunt launches in target company's category
- Requires manual research or news monitoring tools

### Signal 3.2: Regulatory Data Requirements
**What to look for:** Industry-specific regulations requiring data governance, model explainability, data lineage, or audit trails (e.g., EU AI Act, HIPAA data requirements, SOX compliance for analytics).
**Why it matters:** Compliance deadlines create non-negotiable urgency. The company must act, and external consultants often move faster than internal teams.
**Observable via:**
- Industry vertical + regulatory timeline mapping
- Job postings mentioning compliance, governance, or regulatory frameworks
- Conference attendance at data governance events

### Signal 3.3: Employee Reviews Mentioning Data Problems
**What to look for:** Glassdoor or Blind reviews from data/engineering employees mentioning "data quality", "broken pipelines", "no data strategy", "outdated tools", "data team is understaffed"
**Why it matters:** Employees are feeling the pain. If it's visible externally, leadership is likely hearing about it internally too.
**Observable via:**
- Glassdoor review monitoring (manual or via scraping tools)
- Blind threads about specific companies
- Reddit/HN posts from employees about data challenges

### Signal 3.4: Conference Attendance or Speaking
**What to look for:** Company representatives attending or speaking at data/AI conferences (Snowflake Summit, dbt Coalesce, Data Council, MLConf, AI Summit).
**Why it matters:** They're actively learning and investing time in the data space. Lower intent than hiring signals but indicates strategic interest.
**Observable via:**
- Conference speaker lists and attendee directories
- LinkedIn posts about attending conferences
- Company blog posts about conference takeaways

---

## Signal Combinations (Compound Scoring)

The strongest leads show multiple signals simultaneously:

| Combination | Score Boost | Why |
|-------------|------------|-----|
| Hiring data leader + recent funding | +40 pts | Budget + intent confirmed |
| Modern data stack + multiple data engineer postings | +30 pts | Tools bought, need implementation |
| New CDO/VP Data (< 90 days) + 3+ data roles posted | +35 pts | New leader building team fast |
| Failed ML project (job removed) + posting for ML lead | +30 pts | Tried, failed, now ready for help |
| Funding round + AI mentioned in press + data roles posted | +50 pts | Full alignment: money, strategy, action |

## Signal Freshness Rules

| Signal Type | Freshness Window | Notes |
|------------|-----------------|-------|
| Job postings | < 30 days optimal, < 60 days acceptable | Older postings may be filled or stale |
| Funding rounds | < 90 days | After 90 days, budget is allocated and consulting window narrows |
| Leadership changes | < 90 days | New leaders act fast; after 90 days they've likely picked partners |
| Tool adoption | < 6 months | Early adoption = most need for implementation help |
| Employee reviews | < 6 months | Older complaints may have been addressed |

## Apollo-Specific Query Templates

### High-Intent Lead Search
```
Organization search:
- organization_num_employees_ranges: ["201,500", "501,1000", "1001,5000"]
- q_organization_job_titles: ["Data Engineer", "ML Engineer", "Analytics Engineer", "Data Scientist"]
- latest_funding_date_range: { min: "<90 days ago>" }
- currently_using_any_of_technology_uids: ["snowflake", "databricks", "bigquery"]
```

### Data Leadership Hire Search
```
People search:
- person_titles: ["Chief Data Officer", "VP Data", "Head of Data Engineering", "VP Analytics", "Head of Machine Learning"]
- person_seniorities: ["vp", "c_suite", "director"]
- organization_num_employees_ranges: ["201,500", "501,1000", "1001,5000"]
```
