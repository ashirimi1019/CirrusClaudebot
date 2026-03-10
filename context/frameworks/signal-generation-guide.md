# Signal Generation Guide

## What Is a Hiring Signal?

A hiring signal is observable evidence that a company needs something you sell.

For CirrusLabs (staffing/consulting), the primary signal is:
**A company actively posting jobs for engineering talent they can't fill internally.**

This tells us:
- They have budget approved (job posting = headcount approved)
- They have an active need right now
- They're open to solutions (posting = they're trying to solve it)
- The decision-maker is feeling the pain (hiring is hard)

---

## Signal Hierarchy

### Tier 1: Strongest Signals (Use First)
| Signal | What It Means | Apollo Query |
|--------|--------------|-------------|
| Actively hiring Data/ML/Cloud Engineers | Technical talent shortage | `q_organization_job_titles: ["Data Engineer", "ML Engineer"]` |
| Multiple open engineering roles (5+) | Scaling rapidly, overwhelmed | `organization_num_jobs_range: {min: 5}` |
| Job posted 0-14 days ago | Pain is fresh, timing is right | `organization_job_posted_at_range` |

### Tier 2: Amplifying Signals (Add to Scoring)
| Signal | What It Means | Source |
|--------|--------------|--------|
| Series A/B funding (last 12 months) | Growth budget available | Apollo funding_stage |
| 50-500 employees | Too big to ignore, small enough to care | Apollo employee_count |
| SaaS/Tech/API keywords | Buys tech services | Apollo keywords |

### Tier 3: Disqualifying Signals (Skip These)
| Signal | Why Skip |
|--------|----------|
| Staffing/recruiting company | Competitor |
| < 10 employees | No budget |
| Only non-tech roles posted | Different need |
| Government/public sector | Long sales cycle, procurement hell |

---

## Signal-to-Apollo Query Mapping

### Engineering Hiring Signal
```
POST /api/v1/mixed_companies/search
{
  "q_organization_job_titles": ["Data Engineer", "ML Engineer", "Backend Engineer", "Cloud Engineer"],
  "organization_num_employees_ranges": ["51,200", "201,500", "501,1000"],
  "organization_locations": ["United States"],
  "per_page": 25
}
```

### Growth Signal (Funding + Hiring)
```
POST /api/v1/mixed_companies/search
{
  "latest_funding_date_range": {"min": "2024-01-01"},
  "q_organization_job_titles": ["Software Engineer", "Engineering Manager"],
  "per_page": 25
}
```

---

## Signal Freshness Rules

| Signal Age | Action |
|-----------|--------|
| 0-7 days | Priority contact (pain is fresh) |
| 8-30 days | Standard outreach |
| 31-90 days | Still worth contacting |
| 90+ days | Skip (may have solved it) |

---

## Campaign Signal Ideas (by Role You Place)

### Data Engineers
- Companies hiring: "Data Engineer", "Analytics Engineer", "Data Platform"
- Pain: Data pipeline backlog, data quality issues, growing data team

### ML Engineers
- Companies hiring: "ML Engineer", "Machine Learning", "AI Engineer"
- Pain: Models in notebooks, no MLOps, need to productionize

### Cloud/DevOps
- Companies hiring: "Cloud Engineer", "Platform Engineer", "Site Reliability"
- Pain: AWS costs spiraling, no internal cloud expertise

### Full Stack / Backend
- Companies hiring: "Full Stack", "Backend Engineer", "Software Engineer"
- Pain: Product roadmap blocked, no senior engineers

---

## How to Validate a New Signal

Before building a campaign, answer:
1. Can you find 100+ companies with this signal via Apollo? → If < 50, too narrow
2. Does this signal predict budget for staffing? → Role posts = approved budget
3. Is the timing right? → Posted < 30 days = yes
4. Can you reach the decision-maker? → CTO/VP Eng at 50-1000 employee companies = yes

If all 4 pass → green light for campaign
