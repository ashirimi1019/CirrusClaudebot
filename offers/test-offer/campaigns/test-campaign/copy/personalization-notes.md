# Personalization Notes

**Offer:** test-offer
**Campaign:** test-campaign
**Generated:** 2026-03-11T05:46:28.019Z

---

## Placeholders to Replace

| Placeholder | Replace With | Source |
|-------------|--------------|--------|
| `[Company Name]` | Actual company name | Leads CSV: `company_name` |
| `[Company]` | Actual company name | Leads CSV: `company_name` |
| `[First Name]` | Contact's first name | Leads CSV: `first_name` |
| `[Name]` | Contact's first name | Leads CSV: `first_name` |
| `[Title]` | Contact's job title | Leads CSV: `title` |
| `[role]` | Hiring role detected | Leads CSV: `hiring_signal` |
| `[role plural]` | Plural of hiring role | Manually pluralize from `hiring_signal` |
| `[Your name]` | CirrusLabs | Hardcoded |

## Notes
- Skill 5 replaces these placeholders automatically when building outreach/messages.csv
- Double-check [role plural] — auto-pluralization handles common cases (Engineer→Engineers, etc.)
- Subject lines with personalization outperform generic subject lines
