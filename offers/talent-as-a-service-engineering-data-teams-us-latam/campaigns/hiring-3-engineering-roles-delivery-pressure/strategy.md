# Campaign Strategy - Hiring 3+ Engineering Roles – Delivery Pressure

**Offer:** talent-as-a-service-engineering-data-teams-us-latam
**Campaign:** hiring-3-engineering-roles-delivery-pressure
**Generated:** 2026-02-26T00:15:32.716Z

---

## Signal Strategy

### 1. Signal Type
US-based companies with 3 or more active job postings for Software Engineers, Data Engineers, ML Engineers, or Cloud Engineers within the last 60 days are likely experiencing engineering delivery capacity pressure and are more likely to consider nearshore augmentation or pod-based scaling.

### 2. Signal Hypothesis
US-based companies with ≥3 active job postings for Software Engineers, Data Engineers, ML Engineers, or Cloud Engineers within the last 60 days are likely experiencing engineering delivery capacity pressure.

### 3. How We Detect It
How to DetectUse TheirStack job search API to query active job postings with:job_title_or = ["Software Engineer", "Backend Engineer", "Full Stack Engineer", "Data Engineer", "ML Engineer", "Cloud Engineer"]company_country_code = "US"posted_within_days = 60Aggregate results by company domain and only include companies with ≥3 matching active postings.

### 4. Primary API
TheirStack

### 5. Secondary APIs (If Needed)
None for signal detection. Parallel will be used later for buyer discovery.

---

## Targeting

### 6. Messaging Framework
Use-Case-Driven

### 7. Target Geography
United States

### 8. Company Filters
Employee size: 50–1000 OR Funding stage: Series A or higher

### 9. Buyer Filters
CTO VP Engineering Director of Engineering CIO Founder (for Series A+ startups)

---

## Expectations

### 10. Expected Volume
20 companies per run

### 11. Expected Fit %
65%

---

## API Routing

Based on the signal type `US-based companies with 3 or more active job postings for Software Engineers, Data Engineers, ML Engineers, or Cloud Engineers within the last 60 days are likely experiencing engineering delivery capacity pressure and are more likely to consider nearshore augmentation or pod-based scaling.`, Skill 4 will:

1. Call `TheirStack` to find companies with this signal
2. Use `None for signal detection. Parallel will be used later for buyer discovery.` for enrichment and buyer discovery
3. Score results against offer ICP
4. Only enrich high-scoring companies (cost optimization)
5. Find buyers matching `CTO VP Engineering Director of Engineering CIO Founder (for Series A+ startups)`
6. Verify emails before sending

---

## Messaging Angle

This campaign uses the **Use-Case-Driven}** framework.

Skill 3 will generate copy that:
- References the detected signal directly
- Speaks to their specific situation
- Creates context for conversation
- No generic filler

---

## Next Steps

**Skill 3 (Generate Copy):**
- Will generate 2-3 email variants
- Will generate 2-3 LinkedIn variants
- Will save to `copy/` directory

**Skill 4 (Find Leads):**
- Will search for companies with `US-based companies with 3 or more active job postings for Software Engineers, Data Engineers, ML Engineers, or Cloud Engineers within the last 60 days are likely experiencing engineering delivery capacity pressure and are more likely to consider nearshore augmentation or pod-based scaling.`
- Will find buyers at those companies
- Will export CSVs ready for outreach

---

## Strategy Review Checklist

- [ ] Signal is observable (API can detect it)
- [ ] Signal is relevant (correlates to buying intent)
- [ ] Messaging angle is clear
- [ ] Geographic scope defined
- [ ] Expected volume realistic
- [ ] ICP fit scoring will work
- [ ] Budget approval (expect to spend $X on Skill 4)
