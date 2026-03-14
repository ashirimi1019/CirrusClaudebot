# Cloud & Software Delivery — Ideal Customer Profile

## Primary ICP Tier: Mid-Market Companies Undergoing Cloud Transformation

The core buyer for Cloud & Software Delivery is a mid-market company (200-3000 employees) that has committed to cloud transformation but lacks the internal engineering capacity to execute at the pace the business demands.

These companies are past the "should we move to cloud?" decision. They have budget allocated, executive sponsorship, and active projects — but are bottlenecked on engineering talent, platform expertise, or delivery velocity.

## Firmographics

| Dimension | Ideal Range | Notes |
|-----------|-------------|-------|
| Employee count | 200-3000 | Large enough to have real engineering needs, small enough to value external delivery partners |
| Revenue | $50M-$1B | Can fund $150K-$500K engagements without enterprise procurement cycles |
| Funding stage | Series B+ or profitable | Must have runway/budget for multi-month engineering engagements |
| Engineering team size | 20-200 engineers | Big enough to have infrastructure needs, small enough to feel capacity pressure |
| Geography | US, UK, EU, Singapore, Australia | Markets where CirrusLabs operates and English-language delivery works |
| Industries | SaaS, fintech, e-commerce, healthtech, logistics, media | Technology-forward industries with cloud-native expectations |

### Company Stage Signals

**Best fit:**
- Series C-D companies scaling engineering rapidly
- Recently IPO'd companies modernizing legacy systems
- PE-backed companies undergoing technology transformation
- Profitable mid-market companies with tech debt from growth phase

**Acceptable fit:**
- Series B companies with strong revenue growth
- Enterprise divisions with startup-like autonomy
- Government-adjacent organizations with cloud mandates (FedRAMP, GovCloud)

**Poor fit:**
- Pre-revenue startups (can't fund delivery engagements)
- Companies with < 10 engineers (need staffing, not delivery)
- Organizations with no cloud commitment (need consulting first, not delivery)

## Technographics

Technology signals are the strongest ICP indicators for this vertical. What a company uses — and what they're adopting — reveals their cloud maturity and delivery needs.

### Cloud Maturity Stages

| Stage | Description | CirrusLabs Fit | Signal |
|-------|-------------|----------------|--------|
| **Pre-cloud** | On-prem only, no cloud workloads | Low — need strategy consulting first | No cloud job posts, legacy-only stack |
| **Cloud-exploring** | Pilot projects, single cloud account | Medium — migration accelerator entry point | First cloud-related job posts appearing |
| **Cloud-migrating** | Actively moving workloads, lift-and-shift phase | **High** — core delivery engagement | DevOps/SRE hiring surge, IaC tool adoption |
| **Cloud-native building** | New services built cloud-native, old services being refactored | **High** — managed teams and platform engineering | Kubernetes, microservices, CI/CD maturity signals |
| **Cloud-optimizing** | Mature cloud footprint, focused on cost and performance | Medium — specific optimization projects | FinOps hiring, cloud cost tools adoption |

### Technology Stack Signals

**Strong positive signals (cloud-native adoption):**
- Kubernetes / EKS / AKS / GKE in job posts or tech stack
- Terraform / Pulumi / CloudFormation mentioned
- Microservices architecture references
- CI/CD tooling: ArgoCD, GitHub Actions, GitLab CI
- Observability: Datadog, Grafana, OpenTelemetry
- Container references: Docker, container registry usage

**Moderate positive signals (cloud migration in progress):**
- AWS / Azure / GCP certifications in job requirements
- Cloud architect / cloud engineer roles being hired
- DevOps / SRE / Platform engineer roles open
- Infrastructure automation mentions

**Negative signals (pre-cloud or non-technical):**
- Only on-prem infrastructure roles
- No cloud mentions in any job posts
- Legacy-only tech stack (COBOL, mainframe) with no modernization signals
- No engineering hiring at all

## Behavioral Signals

Beyond firmographics and tech stack, certain behaviors indicate readiness to buy:

1. **Hiring surge in DevOps/SRE/Platform** — more than 3 open roles in these areas means they can't fill fast enough
2. **Job posts open > 60 days** — long-unfilled roles indicate a talent gap that external delivery can solve
3. **Multiple cloud-related roles simultaneously** — indicates a program, not a single hire
4. **Cloud migration or modernization mentioned in press/blog** — public commitment signals budget and timeline
5. **Recently raised funding with "technology" or "platform" in use-of-funds** — capital earmarked for engineering
6. **Engineering leadership changes** — new CTO/VP Eng often triggers modernization initiatives

## Disqualifiers

Even if firmographics match, these signals disqualify a lead:

| Disqualifier | Reason |
|-------------|--------|
| Active layoffs in engineering | Budget contraction, not expansion |
| No engineering team at all | Need staffing fundamentals, not delivery |
| Purely consulting/advisory company | Competitors, not customers |
| Government with strict clearance requirements | Cannot staff cleared engineers through delivery model |
| Company size < 50 employees | Too small for delivery engagement economics |
| No cloud budget or mandate | Need to sell cloud strategy first — different engagement |
| Recent negative press about outsourcing failures | May be burned on external delivery — high objection barrier |

## Organizational Patterns That Indicate Fit

**Strong fit patterns:**
- Engineering org has a dedicated Platform or Infrastructure team (even if understaffed)
- Company has a VP Engineering or CTO who reports to CEO (engineering has executive voice)
- Product and engineering are separate functions (delivery partnerships map cleanly)
- Company has used contractors or agencies before (familiar with external talent model)

**Weak fit patterns:**
- CTO is also co-founder and sole engineer (too early stage)
- All engineering is offshore with low autonomy (looking for cheaper, not better)
- Engineering reports into IT (infrastructure mindset, not product delivery)
- No product management function (unclear what to build = unclear delivery scope)

## ICP Score Alignment

The scoring rubric in `scoring.md` maps these ICP dimensions to a weighted point system. The qualification threshold is **170 points** — leads scoring below this should not be enriched with contact data (saves Apollo credits).

A lead that scores 170+ will typically have:
- Mid-market size (200-3000 employees)
- Active cloud transformation signals
- Engineering team of 20+ with open DevOps/Platform roles
- Technology stack showing cloud adoption in progress
- Budget indicators (recent funding, revenue growth, or PE backing)
