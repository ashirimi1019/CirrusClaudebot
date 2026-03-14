# AI & Data Consulting — Buyer Personas

## Persona 1: VP of Data / Chief Data Officer

### Profile
- **Title variants:** VP Data, VP Data Engineering, Chief Data Officer, SVP Data & Analytics
- **Reports to:** CTO, CEO, or COO
- **Team size they manage:** 5-30 (or building from scratch)
- **Tenure in role:** Often < 18 months (newly created role or recent hire)

### Pain Points
- Inherited a messy data landscape with no documentation or lineage
- Board/CEO expects "AI strategy" but the foundation (data platform, quality, governance) isn't there yet
- Can't hire fast enough — senior data talent market is brutal
- Needs to show impact within 6 months or risks losing executive support
- Drowning in ad-hoc requests from business teams while trying to build infrastructure

### What They Buy
- Data platform architecture and implementation (modernize the stack)
- Data strategy and roadmap (what to build, in what order, with what team)
- Fractional senior support while they build their permanent team
- ML/AI readiness assessment (are we actually ready, or do we need to fix data first?)

### Decision Criteria
1. **Practitioner credibility** — Have you actually built data platforms, or do you just advise?
2. **Speed to impact** — Can you show a win in the first 30 days?
3. **Knowledge transfer** — Will my team learn from yours, or will we be dependent forever?
4. **Architecture opinion** — Do you have a point of view on the right stack, or are you tool-agnostic to a fault?
5. **Team quality** — Who specifically will be on my project? (Not bait-and-switch with juniors)

### Buying Process
- Discovery call → technical deep dive with their senior data person → proposal → procurement/legal → SOW
- Often starts with a small assessment ($15-30K) to test working relationship
- Expansion happens when the first engagement delivers tangible results

### How to Reach Them
- Email > LinkedIn (they're busy, not browsing LinkedIn)
- Reference their specific data stack or hiring patterns in the opening
- Avoid "let me show you a demo" — they want a conversation, not a pitch

---

## Persona 2: CTO / VP Engineering (Acting as Data Leader)

### Profile
- **Title variants:** CTO, VP Engineering, SVP Engineering
- **Context:** Company hasn't hired a dedicated data leader yet; CTO owns data by default
- **Team:** Engineering team of 20-100, data responsibilities are distributed across backend engineers

### Pain Points
- Data work keeps pulling engineering resources away from product development
- "We should do ML" pressure from CEO/board but no one on the team has ML production experience
- Data pipelines are brittle, maintained by one person who built them 3 years ago
- Doesn't have time to evaluate data tools, design data architecture, or hire a data team
- Knows they need a VP Data but doesn't know what good looks like for that hire

### What They Buy
- Assessment of current data landscape + recommendation for what to build vs. buy
- Architecture design for a modern data platform (so they stop building from scratch)
- Help defining and hiring the VP Data / Head of Data role
- Initial ML feasibility study — is it worth investing in ML for their use cases?
- Short-term data engineering support to unblock the product team

### Decision Criteria
1. **Don't waste my time** — CTOs are stretched thin; be concise, specific, and action-oriented
2. **Understand engineering culture** — They don't want consultants who produce PowerPoints
3. **Code-level credibility** — Can your people actually write production code, or just draw diagrams?
4. **Clear scope** — Fixed-scope engagements with defined deliverables, not open-ended advisory
5. **Pragmatism** — Recommend the simplest thing that works, not the most complex architecture

### Buying Process
- Shorter cycle (2-4 weeks for mid-market)
- Often a direct decision — CTO has budget authority for $50-150K engagements
- No procurement gauntlet unless enterprise
- May start with a 2-week paid assessment

### How to Reach Them
- Short, direct emails referencing a specific technical pain (e.g., their Airflow job postings)
- GitHub, technical blog, or conference presence builds credibility
- Referrals from other CTOs are the strongest channel

---

## Persona 3: VP Analytics / Head of Business Intelligence

### Profile
- **Title variants:** VP Analytics, Head of BI, Director of Analytics, Head of Data Analytics
- **Reports to:** CFO, COO, CMO, or CDO
- **Team:** 3-15 analysts, often heavy on BI tools (Tableau, Looker) but light on engineering

### Pain Points
- Team is stuck in "dashboard factory" mode — fulfilling requests, not driving insights
- Data quality issues undermine trust in analytics ("the numbers don't match")
- Self-serve analytics vision but reality is everyone asks the analytics team for everything
- Want to introduce predictive analytics / ML but team doesn't have the skills
- Spend 60% of time cleaning and preparing data instead of analyzing it

### What They Buy
- Analytics strategy and operating model redesign
- Data quality improvement and governance frameworks
- Self-serve analytics implementation (semantic layer, curated datasets, training)
- Predictive analytics pilot (churn prediction, demand forecasting, customer segmentation)
- Upskilling / training for analytics team on SQL, Python, or ML basics

### Decision Criteria
1. **Business outcome focus** — Don't talk about technology; talk about business impact
2. **Empathy for their team** — They're protective of their analysts; don't imply they're doing it wrong
3. **Quick wins** — Show how to fix the most painful data quality issue in week 1
4. **Sustainable change** — They've seen consultants come and go; they want lasting improvement
5. **Executive communication** — Can you help them make the case to leadership for more investment?

### Buying Process
- Longer discovery (they want to understand your approach deeply)
- Often need budget approval from their boss (CFO, COO)
- Pilot-oriented: "Let's start with one use case and prove it works"
- Budget: $30-100K for initial engagement

---

## Persona 4: Head of ML / Director of Machine Learning

### Profile
- **Title variants:** Head of ML, Director of ML Engineering, VP Machine Learning, Head of AI
- **Reports to:** CTO, VP Engineering, or CDO
- **Team:** 2-10 ML engineers / data scientists

### Pain Points
- Models work in notebooks but fail in production (MLOps gap)
- No standardized ML pipeline — every model is a snowflake
- Spending 80% of time on data preparation and feature engineering, 20% on actual modeling
- Can't get reliable, clean data from the data engineering team
- Leadership expects "AI magic" but doesn't understand the infrastructure investment required
- Model monitoring, retraining, and governance are afterthoughts

### What They Buy
- MLOps platform design and implementation (CI/CD for models, experiment tracking, model registry)
- Feature store architecture
- Model monitoring and observability setup
- ML infrastructure assessment ("why do our models keep breaking in production?")
- Best practices and process design for ML team workflows

### Decision Criteria
1. **Deep ML engineering expertise** — Have you deployed models at scale? What frameworks?
2. **Infrastructure-first thinking** — They know the problem isn't the model, it's the platform
3. **Hands-on support** — Pair programming with their ML engineers, not just advisory
4. **Open-source preference** — They typically prefer MLflow, Kubeflow, etc. over proprietary solutions
5. **Realistic timelines** — Don't promise production ML in 2 weeks

### Buying Process
- Highly technical evaluation (expect code reviews, architecture whiteboarding)
- Budget often comes from engineering (CTO approval)
- Shorter cycle (2-4 weeks) because the need is usually urgent
- May start with a 1-week architecture review

---

## Cross-Persona Patterns

### Universal Truths for AI & Data Consulting Buyers
- They're skeptical of consultants (burned before by strategy-only firms)
- They value practitioners over advisors (show code, not slides)
- Speed to first deliverable matters more than comprehensive scope
- Knowledge transfer is always a stated requirement (even if not always prioritized)
- They buy people, not firms — the specific team matters enormously

### Common Buying Triggers
- New funding round with data/AI mandate from investors
- New data leader hired (first 90 days, building their plan)
- Failed internal project (ML model that never made it to production)
- Competitive pressure ("our competitor launched an AI feature")
- Regulatory requirement (data governance, model explainability)
- Board-level directive to "become data-driven"

### Engagement Expansion Path
1. **Assessment / Discovery** ($15-30K, 2-4 weeks) — Prove credibility
2. **Strategy / Roadmap** ($40-80K, 4-8 weeks) — Define the plan
3. **Implementation** ($100-300K, 3-6 months) — Build the thing
4. **Fractional Leadership** ($25-40K/month) — Ongoing strategic guidance
5. **Team Building Support** — Help them hire permanent data team
