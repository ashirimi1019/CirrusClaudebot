# Cloud & Software Delivery — Buyer Personas

## Overview

Cloud & Software Delivery is sold to **engineering leaders** who own delivery outcomes and infrastructure decisions. The economic buyer is typically a VP or C-level; the technical evaluator is a Director or Senior Manager who will work with the delivery team daily.

Unlike staffing (where HR or talent acquisition may be involved), Cloud Delivery purchases are driven entirely by engineering and technology leadership.

## Primary Buyer: VP of Engineering

**Title variations:** VP Engineering, SVP Engineering, VP Software Development, VP Product Engineering

**Responsibilities:**
- Owns engineering output and delivery velocity
- Manages engineering headcount and budget
- Accountable for shipping product features on time
- Reports to CTO or CEO

**Pain points:**
- Cannot hire fast enough to meet product roadmap commitments
- Engineering team is spending 40%+ of time on infrastructure instead of product features
- Release cycle is too slow — monthly deploys when the business needs weekly or daily
- Technical debt from growth phase is dragging down velocity
- Board/CEO pressure to deliver more with constrained headcount

**Decision criteria:**
- Can this team actually ship production code in our stack?
- How fast can they ramp and become productive?
- Do they integrate with our processes (PRs, standups, sprint ceremonies) or run separately?
- What is the accountability model — are they responsible for outcomes or just effort?
- Reference checks from similar companies and tech stacks

**Buying process:**
1. Identifies delivery bottleneck or capacity gap
2. Gets budget approval (often from CTO or CFO)
3. Evaluates 2-3 delivery partners on technical capability and culture fit
4. Runs a pilot engagement (4-8 weeks) with the top candidate
5. Expands to full engagement if pilot succeeds

**How to sell to this persona:**
- Lead with delivery speed — "shipping in your stack within 2 weeks"
- Show engineering credibility through technical content (architecture case studies, open-source contributions)
- Offer a low-risk pilot as the entry point
- Emphasize integration with their existing processes, not a separate silo

---

## Secondary Buyer: CTO

**Title variations:** CTO, Chief Technology Officer, Chief Architect

**Responsibilities:**
- Sets technology strategy and architecture direction
- Owns build vs. buy vs. partner decisions
- Manages cloud infrastructure strategy
- Reports to CEO

**Pain points:**
- Cloud migration timeline is slipping because internal team lacks platform expertise
- Architecture decisions are being made ad hoc without proper patterns
- Cannot attract senior infrastructure talent at current compensation levels
- Technical debt is compounding — needs a dedicated modernization initiative
- Board expects cloud cost optimization but team is still learning

**Decision criteria:**
- Does this partner have genuine cloud architecture expertise (not just reskinned staff aug)?
- Can they bring best practices we haven't seen internally?
- Will they upskill our team in the process or create dependency?
- What is their experience with our specific cloud platform and tech stack?
- Are their engineers senior enough to make architecture decisions, or do I need to hand-hold?

**How to sell to this persona:**
- Lead with architecture and engineering quality, not speed
- Demonstrate deep cloud platform expertise (AWS Well-Architected, Kubernetes patterns, IaC maturity)
- Emphasize knowledge transfer — "your team will be stronger after we leave"
- Share architecture decision records and engineering standards
- Position as a technical partner, not a vendor

---

## Technical Evaluator: Director of Platform Engineering

**Title variations:** Director of Platform Engineering, Director of Infrastructure, Director of DevOps, Head of SRE

**Responsibilities:**
- Owns internal developer platform and infrastructure
- Manages CI/CD pipelines, cloud accounts, and deployment processes
- Runs the SRE/DevOps team
- Reports to VP Engineering or CTO

**Pain points:**
- Team is underwater — maintaining existing infrastructure leaves no capacity for new platform initiatives
- Developers are waiting on infrastructure provisioning (slow inner loop)
- Cloud costs are growing faster than usage — no FinOps discipline
- Need to implement Kubernetes but team has never run it in production
- Observability gaps — incidents take too long to diagnose

**Decision criteria:**
- Can their engineers pair with my team and actually improve our platform?
- Do they understand our infrastructure (not just theoretical cloud knowledge)?
- Will they follow our standards or introduce their own patterns that we'll need to maintain?
- Are they willing to work in our repos, our CI/CD, our tooling?
- Can they handle on-call and production support, or just greenfield building?

**How to sell to this persona:**
- Lead with specific platform engineering expertise — Kubernetes, Terraform, CI/CD patterns
- Show willingness to work within their existing tooling and standards
- Offer to own a specific platform capability (observability, CI/CD, infrastructure automation)
- Demonstrate production experience — not just building, but operating and troubleshooting
- Emphasize embedded collaboration, not handoff-based delivery

---

## Influencer: Head of DevOps / SRE Manager

**Title variations:** Head of DevOps, SRE Manager, Infrastructure Manager, Cloud Engineering Lead

**Responsibilities:**
- Hands-on technical leadership of DevOps/SRE team
- Makes tooling and implementation decisions
- Evaluates technical capability of external partners
- Reports to Director or VP

**Pain points:**
- Team is too small for the scope of infrastructure work needed
- Specific skill gaps (e.g., Kubernetes expertise, Terraform modules, observability)
- Alert fatigue and incident response burden leaving no time for improvement projects
- Need to build something (service mesh, deployment pipeline, monitoring stack) but no bandwidth

**Decision criteria:**
- Can their engineers debug a production Kubernetes issue at 2am? (production-grade skill level)
- Do they know the tools we use or will there be a ramp-up period?
- Can they write Terraform that meets our module standards?
- Will I have to review every PR or can they work autonomously?

**How to sell to this persona:**
- Technical credibility above all else — share code samples, architecture patterns, tool expertise
- Offer a specific deliverable they need but can't get to (e.g., "we'll build your deployment pipeline in 4 weeks")
- Be honest about ramp-up time on their specific stack
- Respect their standards and processes — offer to follow, not replace

---

## Decision-Making Dynamics

### Typical buying committee:
1. **VP Engineering or CTO** — economic buyer, approves budget
2. **Director of Platform/Infrastructure** — technical evaluator, runs day-to-day
3. **Head of DevOps/SRE** — influencer, validates technical capability
4. **CFO or Finance** — approves spend above $200K (usually rubber stamp if VP/CTO sponsors)

### Common approval process:
- Deal size < $100K: VP Engineering can approve alone
- Deal size $100K-$300K: VP Engineering + CTO approval
- Deal size > $300K: Requires CFO or executive team approval
- Pilot engagements ($30K-$80K): Usually VP Engineering approval only

### Timing patterns:
- Budget cycles: Q4 planning for next year, Q1 for mid-year adjustments
- Trigger events: New CTO hire, board mandate, failed migration attempt, major incident
- Urgency drivers: Product launch deadline, compliance deadline, competitive pressure
- Typical sales cycle: 3-6 weeks for pilot, 6-12 weeks for full engagement
