# Cloud & Software Delivery — Observable Signals

## Signal Philosophy

Every signal in this document must be **observable through available data sources** — primarily Apollo.io job post data, company technographics, and firmographic data. Signals that sound good but cannot be queried are useless for automated campaigns.

Signals are ranked by **strength** (how strongly they correlate with buying intent) and **freshness** (how recent the signal needs to be to remain relevant).

## Signal Tier 1: Strong Buying Intent

These signals indicate a company is actively trying to build cloud/platform capability and struggling with capacity.

### 1.1 Hiring for DevOps / SRE / Platform Engineering Roles

**What it means:** Company is investing in infrastructure capability but can't fill roles fast enough.

**Observable data:**
- Job posts with titles: DevOps Engineer, Site Reliability Engineer, Platform Engineer, Infrastructure Engineer, Cloud Engineer
- Multiple open roles (3+) in these areas = capacity crisis
- Roles open > 45 days = talent gap they can't solve through hiring

**Apollo query mapping:**
- `person_titles`: ["DevOps Engineer", "SRE", "Site Reliability Engineer", "Platform Engineer", "Infrastructure Engineer", "Cloud Engineer"]
- `organization_num_employees_ranges`: ["201,500", "501,1000", "1001,5000"]
- Filter for companies with 3+ matching job posts

**Freshness:** Job posts within last 60 days. Older posts may have been filled.

**Strength:** High — direct indicator of infrastructure investment and capacity gap.

---

### 1.2 Kubernetes / Container Adoption Signals

**What it means:** Company is adopting cloud-native architecture and needs expertise to execute.

**Observable data:**
- Job posts mentioning Kubernetes, K8s, EKS, AKS, GKE, container orchestration
- Job requirements listing Docker, container runtime, Helm charts
- New roles specifically for Kubernetes (vs. legacy infrastructure roles)

**Apollo query mapping:**
- `q_organization_keyword_tags`: ["kubernetes", "containers", "docker"]
- Job post content search for: Kubernetes, EKS, AKS, GKE, Helm, container orchestration
- `currently_using_any_of_technology_uids`: ["kubernetes", "docker"]

**Freshness:** Within last 90 days. Kubernetes adoption is a multi-quarter initiative.

**Strength:** High — Kubernetes adoption is complex and most mid-market teams lack deep expertise.

---

### 1.3 Cloud Migration Mentioned in Job Posts or Company Description

**What it means:** Company has committed to cloud migration and is staffing for it.

**Observable data:**
- Job descriptions referencing "cloud migration," "lift and shift," "re-platforming," "modernization"
- Company descriptions mentioning "digital transformation" or "cloud-first"
- Cloud architect roles being hired alongside migration-related language

**Apollo query mapping:**
- Job post content search: "cloud migration", "modernization", "re-platform"
- `q_organization_keyword_tags`: ["cloud migration", "digital transformation"]

**Freshness:** Within last 90 days.

**Strength:** High — explicit migration commitment means budget is allocated.

---

## Signal Tier 2: Moderate Buying Intent

These signals indicate cloud investment but don't directly signal a delivery capacity gap.

### 2.1 Infrastructure-as-Code Tooling Adoption

**What it means:** Company is maturing their infrastructure practices — may need help accelerating.

**Observable data:**
- Job posts requiring Terraform, Pulumi, CloudFormation, Ansible
- Technology stack includes IaC tools (Apollo technographics)
- Dedicated infrastructure automation roles

**Apollo query mapping:**
- `currently_using_any_of_technology_uids`: ["terraform", "pulumi", "ansible"]
- Job post search for: Terraform, Pulumi, infrastructure as code, IaC

**Freshness:** Within last 90 days.

**Strength:** Medium — indicates maturity trajectory but not necessarily a delivery gap.

---

### 2.2 CI/CD Pipeline Modernization Signals

**What it means:** Company is improving deployment processes — may be moving from legacy CI to modern pipelines.

**Observable data:**
- Job posts mentioning ArgoCD, GitHub Actions, GitLab CI, Spinnaker
- Job posts indicating Jenkins migration or CI/CD modernization
- Release engineering or deployment automation roles

**Apollo query mapping:**
- `currently_using_any_of_technology_uids`: ["github_actions", "gitlab", "argocd", "jenkins"]
- Job post content: "CI/CD", "deployment pipeline", "release automation"

**Freshness:** Within last 60 days.

**Strength:** Medium — pipeline modernization is often a bounded project (good delivery accelerator entry point).

---

### 2.3 Cloud Certification Programs

**What it means:** Organization is investing in cloud skills — indicates commitment but also skill gaps.

**Observable data:**
- Job posts listing AWS/Azure/GCP certifications as requirements or preferred
- Company mentions of certification programs or cloud training initiatives
- Partnership status with cloud providers (AWS Partner, Azure Partner)

**Apollo query mapping:**
- Job post content: "AWS certified", "Azure certified", "GCP certified", "cloud certification"
- `q_organization_keyword_tags`: ["AWS Partner", "Azure Partner", "Google Cloud Partner"]

**Freshness:** Within last 120 days.

**Strength:** Medium — certification investment signals cloud commitment and current capability gaps.

---

### 2.4 Observability and Monitoring Stack Adoption

**What it means:** Company is investing in production reliability — often accompanies cloud migration.

**Observable data:**
- Job posts mentioning Datadog, Grafana, Prometheus, New Relic, OpenTelemetry
- SRE roles focused on observability
- Incident management tool adoption (PagerDuty, OpsGenie)

**Apollo query mapping:**
- `currently_using_any_of_technology_uids`: ["datadog", "grafana", "prometheus", "new_relic"]

**Freshness:** Within last 90 days.

**Strength:** Medium — observability investment often signals production complexity that needs support.

---

## Signal Tier 3: Contextual Signals

These signals add context but are not strong enough to drive outreach alone.

### 3.1 SOC 2 / Compliance Initiatives

**What it means:** Company needs to formalize infrastructure security and compliance — often drives infrastructure modernization.

**Observable data:**
- Job posts mentioning SOC 2, HIPAA, PCI-DSS compliance
- Security engineer or compliance roles being hired alongside infrastructure roles
- Company pursuing compliance certification for the first time

**Apollo query mapping:**
- Job post content: "SOC 2", "compliance", "security audit"
- `q_organization_keyword_tags`: ["SOC 2", "HIPAA", "PCI"]

**Freshness:** Within last 120 days.

**Strength:** Low-medium — compliance drives infrastructure work but isn't a direct delivery signal.

---

### 3.2 Legacy Tech Stack Decline

**What it means:** Company is moving away from legacy systems — indicates modernization initiative.

**Observable data:**
- Declining job posts for legacy technologies (on-prem, .NET Framework, monolith-specific roles)
- Simultaneously increasing cloud-native job posts
- Technology stack showing both legacy and modern tools (transition phase)

**Apollo query mapping:**
- Compare historical job post patterns (requires longitudinal data)
- Technology stack showing mixed old/new: Java + Kubernetes, .NET + Azure

**Freshness:** Pattern over last 6 months.

**Strength:** Low — requires pattern analysis, not a single data point.

---

### 3.3 Recent Funding with Technology Focus

**What it means:** Company has capital earmarked for technology investment.

**Observable data:**
- Series B+ funding within last 12 months
- Press releases mentioning "technology platform" or "engineering" in use of funds
- Rapid engineering hiring following funding round

**Apollo query mapping:**
- `latest_funding_date_range`: last 12 months
- `latest_funding_amount_range`: $20M+
- Cross-reference with engineering hiring surge

**Freshness:** Within last 12 months.

**Strength:** Low-medium — funding creates budget but doesn't directly signal delivery need.

---

## Signal Combinations (Compound Signals)

The strongest leads exhibit multiple signals simultaneously. Compound signals should be scored higher than individual signals.

| Combination | Interpretation | Score Multiplier |
|-------------|----------------|-----------------|
| DevOps hiring + Kubernetes adoption | Active cloud-native transition with capacity gap | 1.5x |
| Cloud migration language + IaC tooling | Committed migration with automation investment | 1.3x |
| 3+ DevOps roles open > 45 days | Critical capacity gap, urgent need | 1.5x |
| Recent funding + engineering hiring surge | Funded growth, likely need delivery support | 1.3x |
| Compliance initiative + infrastructure modernization | Regulatory driver accelerating cloud adoption | 1.2x |

## Signal Freshness Rules

| Signal Type | Maximum Age | Reason |
|-------------|-------------|--------|
| Job posts | 60 days | Roles may be filled or cancelled |
| Funding events | 12 months | Budget allocation takes time |
| Technology adoption | 90 days | Tech stack changes slowly |
| Compliance initiatives | 120 days | Compliance timelines are long |
| Company description changes | 180 days | Strategic positioning evolves slowly |

## Mapping to Campaign Strategy

When building a campaign in Skill 2, select 2-3 signals from Tier 1-2 as the primary targeting criteria. Use Tier 3 signals as enrichment data for personalization, not as primary selection filters.

Example campaign signal hypothesis:
> "Target mid-market companies (200-3000 employees) that are hiring for 3+ DevOps/Platform Engineering roles AND show Kubernetes adoption signals. These companies have committed to cloud-native architecture but lack the internal capacity to execute."
