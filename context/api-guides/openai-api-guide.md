# OpenAI API Guide

## Overview

OpenAI is used **only for Skill 3** (Campaign Copy Generation).

**Model:** `gpt-4o` (default) or `gpt-4o-mini` (cheaper)
**Cost per campaign:** ~$0.50 for 3 email + 3 LinkedIn variants
**SDK:** OpenAI Node.js SDK via `src/lib/clients/openai.ts`

---

## What We Use It For

### Email Copy Generation
Generate 3 email variants (subject + body) based on:
- The offer's positioning canvas
- The campaign's signal hypothesis
- Rules from `context/copywriting/email-principles.md`
- Examples from `context/learnings/what-works.md`

### LinkedIn Copy Generation
Generate 3 LinkedIn DM variants based on:
- The offer's positioning
- Rules from `context/copywriting/linkedin-principles.md`

---

## Prompt Structure

The system uses a **context-injection** pattern:

```
SYSTEM PROMPT:
  You are an expert B2B copywriter for a staffing company.

  Here are the email principles to follow:
  {email-principles.md content}

  Here are examples of what has worked before:
  {what-works.md content}

USER PROMPT:
  Generate 3 email variants for:
  - Offer: {positioning.md content}
  - Signal: {strategy.md signal hypothesis}
  - Target: {ICP buyer titles}

  Format each as:
  ---
  Variant N: [Name]
  Subject: [subject line]
  [blank line]
  [email body]
  ---
```

---

## Output Format

### Email Variants (`email-variants.md`)
```markdown
## Variant 1: [Name]
**Subject:** [Subject line]

**Body:**
[Email body text]

---

## Variant 2: [Name]
...
```

### LinkedIn Variants (`linkedin-variants.md`)
```markdown
## Variant 1: [Name]

[DM message text]

---
```

---

## Personalization Placeholders

Always use these exact placeholders so Skill 5 can replace them:

| Placeholder | Replaced With |
|-------------|--------------|
| `[First Name]` | Contact's first name |
| `[Company Name]` | Company name |
| `[role]` | Hiring signal (e.g., "Data Engineer") |
| `[role plural]` | Signal pluralized (e.g., "Data Engineers") |
| `[Your Name]` | Sender name (CirrusLabs) |

---

## Cost Optimization

- Use `gpt-4o-mini` for drafts, `gpt-4o` for final copy
- Cache results — don't regenerate if copy already exists
- Skill 3 checks for existing files before generating

---

## Getting Your API Key

1. Log in to [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys**
3. Create a new key
4. Add to `.env`: `OPENAI_API_KEY=your_key_here`

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Invalid key | Check OPENAI_API_KEY in .env |
| 429 | Rate limit | Wait 60s, use gpt-4o-mini instead |
| 500 | Model overloaded | Retry after 30s |
| Empty response | Bad prompt | Check context files exist and are non-empty |
