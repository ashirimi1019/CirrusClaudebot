# Cloud & Software Delivery — Vertical Overview

## What This Vertical Covers

Cloud & Software Delivery is CirrusLabs' engagement model for companies that need engineering teams to **build, migrate, and ship software** — not just advise on it. This covers:

- **Cloud migration**: Moving workloads from on-prem or legacy hosting to AWS, Azure, or GCP
- **Cloud-native development**: Building new applications on containerized, microservices-based architectures
- **Platform engineering**: Standing up internal developer platforms, CI/CD pipelines, and infrastructure-as-code foundations
- **Software delivery acceleration**: Increasing deployment frequency, reducing cycle time, and improving release reliability for existing engineering organizations
- **Managed delivery teams**: Ongoing embedded teams that own feature delivery, maintenance, or entire product modules

## How This Differs from Staffing

Staffing sells **people**. Cloud & Software Delivery sells **outcomes**.

| Dimension | Staffing | Cloud & Software Delivery |
|-----------|----------|---------------------------|
| Unit of sale | Headcount (contractor hours) | Deliverables (migrated services, shipped features, running platform) |
| Accountability | Client manages output | CirrusLabs owns delivery commitments |
| Pricing | Hourly/monthly rate per person | Project-based, milestone-based, or managed team retainer |
| Success metric | Seat filled, retention | Deployment frequency, migration completed, system uptime |
| Risk model | Client bears execution risk | Shared or CirrusLabs-owned execution risk |

A staffing engagement puts a DevOps engineer on the client's team. A Cloud Delivery engagement migrates 30 microservices to Kubernetes with defined milestones, acceptance criteria, and CirrusLabs accountability for the outcome.

## How This Differs from AI & Data Consulting

AI & Data Consulting is **advisory and analytical** — helping companies build data strategies, implement ML models, and architect data platforms. Cloud & Software Delivery is **engineering execution** — writing code, building infrastructure, shipping production systems.

There is overlap when AI workloads need cloud infrastructure (ML training pipelines, model serving). In those cases, Cloud Delivery provides the infrastructure layer while AI Consulting owns the model and data layer.

## Market Positioning

CirrusLabs positions Cloud & Software Delivery as **engineering partnership, not outsourcing**. The distinction matters because:

1. **Partnership** implies shared context, embedded collaboration, and long-term alignment
2. **Outsourcing** implies throw-it-over-the-wall specs and offshore body shops
3. Buyers who have been burned by outsourcing need to see a fundamentally different model

Core value proposition: **Ship faster with engineering teams that integrate into your stack, your processes, and your standards — without the 6-month hiring cycle.**

## Key Metrics for This Vertical

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Average deal size | $150K-$500K | Mid-market sweet spot for project-based work |
| Engagement duration | 3-12 months | Long enough for meaningful delivery, short enough to prove value |
| Expansion rate | 40%+ of clients expand scope | Indicator of delivery quality and trust |
| Deployment frequency improvement | 3-10x within first quarter | Primary outcome metric clients care about |
| Time to productive team | < 3 weeks | Speed of ramp differentiates from hiring |

## Engagement Models

### 1. Project-Based Delivery
Fixed scope, defined milestones, clear acceptance criteria. Best for migrations, platform builds, and greenfield applications.

### 2. Managed Delivery Teams
Ongoing teams (3-8 engineers) embedded in client workflows. Own a product area, service, or platform component. Monthly retainer with defined capacity.

### 3. Delivery Accelerators
Short (4-8 week) engagements to unblock specific bottlenecks: CI/CD pipeline setup, Kubernetes migration for a single service, observability stack implementation. Often serve as entry points that expand.

## Technology Focus Areas

- **Cloud platforms**: AWS (primary), Azure, GCP
- **Containers & orchestration**: Kubernetes, ECS, Docker
- **Infrastructure as code**: Terraform, Pulumi, CloudFormation
- **CI/CD**: GitHub Actions, GitLab CI, ArgoCD, Jenkins migration
- **Observability**: Datadog, Grafana, Prometheus, OpenTelemetry
- **Languages**: Go, Python, TypeScript, Java/Kotlin, Rust
- **Architecture**: Microservices, event-driven, serverless, API-first

## Vertical-Specific Campaign Signals

The strongest buying signals for Cloud & Software Delivery are:

1. **Hiring for DevOps/SRE/Platform roles** — indicates capacity gap in infrastructure
2. **Legacy tech stack job posts declining** — signals active migration away from old systems
3. **Kubernetes/container-related job posts appearing** — signals cloud-native adoption in progress
4. **Cloud certification programs** — indicates organizational commitment to cloud transformation
5. **Infrastructure tooling adoption** (Terraform, Pulumi mentions in job posts) — signals IaC maturity stage

These signals are operationalized in `signals.md` with Apollo query mappings.
