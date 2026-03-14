# Section 4 Vertical UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add operator-facing vertical selection UI so users can assign a default vertical on offers, optionally override it on campaigns, and see the effective vertical displayed clearly across the dashboard.

**Architecture:** A shared `VerticalSelect` dropdown component fetches active verticals from Supabase and renders wherever vertical assignment is needed. Vertical IDs flow through existing form state → JSON-encoded `formData` → skill upsert — no new data pipeline required. Display of the effective vertical on campaign detail resolves `campaign.vertical_id ?? offer.default_vertical_id` client-side after expanding the existing Supabase queries to include those fields.

**Tech Stack:** Next.js App Router, React client components, Supabase browser client (`createClient()`, anon key, RLS disabled), TypeScript, Tailwind CSS

---

## Clarification Decisions (Locked In)

These were confirmed by the operator before implementation:

1. **`default_vertical_id` on offer:** Optional — blank is allowed, not required
2. **Campaign override default:** Blank/"Inherit from offer" — do NOT pre-populate; show inherited value as helper text: `"Inheriting from offer: {verticalName}"`
3. **Vertical dropdown contents:** Only rows where `active = true`
4. **Effective vertical display scope:** Offer form, campaign form, campaign detail page, campaign list table (if easy/low-risk)
5. **UI complexity:** Simple first pass — clean dropdown + helper text. Campaign detail shows a compact badge with source label: `"Source: Campaign override"` / `"Source: Offer default"` / `"Source: None"`

---

## File Map

| Action | File | What Changes |
|--------|------|-------------|
| **CREATE** | `frontend/src/components/VerticalSelect.tsx` | New shared dropdown component — loads active verticals from Supabase, renders `<select>` |
| **MODIFY** | `frontend/src/app/dashboard/offers/new/page.tsx` | Add `default_vertical_id` to `OfferForm` type; add `VerticalSelect` field; pass in formData |
| **MODIFY** | `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` | Add `vertical_id` to `CampaignForm` type; add `VerticalSelect` with inherit option; show offer default as helper text |
| **MODIFY** | `src/core/skills/skill-1-new-offer.ts` | Add `default_vertical_id: formData.default_vertical_id \|\| null` to DB upsert |
| **MODIFY** | `src/core/skills/skill-2-campaign-strategy.ts` | Add `vertical_id: formData.vertical_id \|\| null` to DB upsert |
| **MODIFY** | `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` | Expand offer + campaign queries to fetch `vertical_id`/`default_vertical_id`; add `EffectiveVerticalBadge` in top bar |
| **MODIFY** | `frontend/src/app/dashboard/campaigns/page.tsx` | Add `vertical_id, verticals(name, slug)` to Supabase select; add Vertical column to table |
| **MODIFY** | `primer.md` | Record Section 4 decisions, files changed, validation steps |

---

## Chunk 1: Shared Component + Offer Form + Campaign Form

### Task 1: Create `VerticalSelect` Component

**Files:**
- Create: `frontend/src/components/VerticalSelect.tsx`

- [ ] **Step 1: Write the component**

```typescript
// frontend/src/components/VerticalSelect.tsx
"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface VerticalOption {
  id: string;
  slug: string;
  name: string;
}

interface VerticalSelectProps {
  value: string;
  onChange: (value: string) => void;
  showInherit?: boolean; // If true, first option is blank "Inherit from offer"
  className?: string;
  disabled?: boolean;
}

export function VerticalSelect({
  value,
  onChange,
  showInherit = false,
  className,
  disabled = false,
}: VerticalSelectProps) {
  const [verticals, setVerticals] = useState<VerticalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("verticals")
      .select("id, slug, name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setVerticals(data as VerticalOption[]);
        setLoading(false);
      });
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={cn(
        "w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white",
        "focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {showInherit ? (
        <option value="">Inherit from offer</option>
      ) : (
        <option value="">Select vertical (optional)</option>
      )}
      {verticals.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors (component is new, no conflicts)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/VerticalSelect.tsx
git commit -m "feat: add VerticalSelect shared dropdown component"
```

---

### Task 2: Offer New Form — Add `default_vertical_id` Field

**Files:**
- Modify: `frontend/src/app/dashboard/offers/new/page.tsx`

- [ ] **Step 1: Read the current form to understand exact field structure**

Read `frontend/src/app/dashboard/offers/new/page.tsx` and note:
- The `OfferForm` interface (13 fields, no `default_vertical_id` currently)
- The `Field` component pattern and how fields are rendered
- Where `extraParams` / `formData` is built before calling `useSkillRunner`

- [ ] **Step 2: Add `default_vertical_id` to `OfferForm` interface**

Find the `OfferForm` interface (will look like):
```typescript
type OfferForm = {
  offerName: string;
  // ... 12 other fields
};
```

Add the new field:
```typescript
type OfferForm = {
  offerName: string;
  // ... 12 other fields
  default_vertical_id: string;
};
```

Update the initial state to include it:
```typescript
const [form, setForm] = useState<OfferForm>({
  // ... existing fields
  default_vertical_id: "",
});
```

- [ ] **Step 3: Add the import for VerticalSelect**

At the top of the file, add:
```typescript
import { VerticalSelect } from "@/components/VerticalSelect";
```

- [ ] **Step 4: Add the vertical selector field to the form JSX**

Find the section where `Field` components are rendered. After the last `Field` in the form (or after the positioning/offer fields section, before the submit button), add:

```tsx
{/* Vertical */}
<div className="space-y-1.5">
  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
    Vertical
  </label>
  <VerticalSelect
    value={form.default_vertical_id}
    onChange={(val) => setForm((f) => ({ ...f, default_vertical_id: val }))}
  />
  <p className="text-xs text-neutral-600">
    Optional. Sets the default vertical playbook for all campaigns under this offer.
  </p>
</div>
```

- [ ] **Step 5: Verify `default_vertical_id` flows into formData**

The existing pattern encodes form state as `formData=JSON.stringify(form)` (or similar). Since `default_vertical_id` is now part of the `form` state object, it will automatically be included. No additional change needed if the encoding is `JSON.stringify(form)`.

If `extraParams` is used, locate where formData is assembled and confirm `default_vertical_id` is included. Example — if formData is built manually:
```typescript
// Verify this covers default_vertical_id — if it uses spread/JSON.stringify(form) it does automatically
const formData = JSON.stringify(form); // ✅ includes default_vertical_id
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/offers/new/page.tsx
git commit -m "feat: add default_vertical_id field to offer creation form"
```

---

### Task 3: Campaign New Form — Add `vertical_id` Field with Inheritance UX

**Files:**
- Modify: `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx`

- [ ] **Step 1: Read the current campaign form**

Read `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` and note:
- The `CampaignForm` interface (no `vertical_id` currently)
- How `offerSlug` is accessed (likely `params.offerSlug` or via `useParams()`)
- How `formData` is assembled
- Where existing `useEffect` hooks live (to add offer vertical lookup alongside them)

- [ ] **Step 2: Add imports**

```typescript
import { VerticalSelect } from "@/components/VerticalSelect";
import { createClient } from "@/lib/supabase";
```

(If `createClient` is already imported, skip that line.)

- [ ] **Step 3: Add `vertical_id` to `CampaignForm` interface**

Find the `CampaignForm` interface and add:
```typescript
type CampaignForm = {
  campaignName: string;
  // ... other fields
  vertical_id: string;
};
```

Update the initial state:
```typescript
const [form, setForm] = useState<CampaignForm>({
  // ... existing fields
  vertical_id: "",
});
```

- [ ] **Step 4: Add state for offer's inherited vertical**

After existing state declarations, add:
```typescript
const [offerDefaultVerticalName, setOfferDefaultVerticalName] = useState<string | null>(null);
```

- [ ] **Step 5: Add useEffect to load offer's current default vertical**

After the existing `useEffect` hooks (or alongside them if there's a generic data-loading effect), add:

```typescript
useEffect(() => {
  if (!offerSlug) return;
  const supabase = createClient();
  (async () => {
    // Get offer's default_vertical_id
    const { data: offerData } = await supabase
      .from("offers")
      .select("default_vertical_id")
      .eq("slug", offerSlug)
      .single();
    if (!offerData?.default_vertical_id) return;
    // Get the vertical name
    const { data: vertData } = await supabase
      .from("verticals")
      .select("name")
      .eq("id", offerData.default_vertical_id)
      .single();
    if (vertData?.name) setOfferDefaultVerticalName(vertData.name);
  })();
}, [offerSlug]);
```

- [ ] **Step 6: Add the vertical selector field to the form JSX**

Find where `Field` components are rendered. Add the vertical field (after the core campaign fields, before submit):

```tsx
{/* Vertical Override */}
<div className="space-y-1.5">
  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
    Vertical Override
  </label>
  <VerticalSelect
    value={form.vertical_id}
    onChange={(val) => setForm((f) => ({ ...f, vertical_id: val }))}
    showInherit={true}
  />
  <p className="text-xs text-neutral-600">
    {offerDefaultVerticalName
      ? `Inheriting from offer: ${offerDefaultVerticalName}`
      : "Leave blank to inherit from offer. No vertical assigned to this offer."}
  </p>
</div>
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx
git commit -m "feat: add vertical_id override field to campaign creation form"
```

---

## Chunk 2: Skill Persistence + Campaign Detail Display

### Task 4: Skill 1 — Persist `default_vertical_id` to DB

**Files:**
- Modify: `src/core/skills/skill-1-new-offer.ts`

- [ ] **Step 1: Read the current upsert block**

Read `src/core/skills/skill-1-new-offer.ts` and locate the block:
```typescript
await sb.from('offers').upsert({
  name: input.offerName,
  slug: input.offerSlug,
  // ... other fields
})
```

- [ ] **Step 2: Add `default_vertical_id` to the upsert**

In the upsert object, add:
```typescript
await sb.from('offers').upsert({
  name: input.offerName,
  slug: input.offerSlug,
  // ... other fields
  default_vertical_id: formData?.default_vertical_id || null,
})
```

Note: `formData` is the parsed JSON from the API route. The field name `default_vertical_id` must match exactly what the offer new form sends.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors (column already exists in DB, TypeScript types should be permissive or already include it)

If Supabase types don't include `default_vertical_id` in the `offers` insert type, either update the generated types or add a cast: `(upsertPayload as any)`.

- [ ] **Step 4: Commit**

```bash
git add src/core/skills/skill-1-new-offer.ts
git commit -m "feat: persist default_vertical_id in skill-1 offer upsert"
```

---

### Task 5: Skill 2 — Persist `vertical_id` to DB

**Files:**
- Modify: `src/core/skills/skill-2-campaign-strategy.ts`

- [ ] **Step 1: Read the current campaign upsert**

Read `src/core/skills/skill-2-campaign-strategy.ts` and locate:
```typescript
await sb.from('campaigns').upsert({
  offer_id: ...,
  name: ...,
  slug: ...,
  // ...
}, { onConflict: 'offer_id,slug' })
```

- [ ] **Step 2: Add `vertical_id` to the upsert**

```typescript
await sb.from('campaigns').upsert({
  offer_id: ...,
  name: ...,
  slug: ...,
  // ... existing fields
  vertical_id: formData?.vertical_id || null,
}, { onConflict: 'offer_id,slug' })
```

An empty string from the form's "Inherit from offer" option must persist as `null`, not as `""`. The `|| null` handles this since `""` is falsy.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Same caveat as Task 4 for generated types.

- [ ] **Step 4: Commit**

```bash
git add src/core/skills/skill-2-campaign-strategy.ts
git commit -m "feat: persist vertical_id in skill-2 campaign upsert"
```

---

### Task 6: Campaign Detail Page — Effective Vertical Badge in Top Bar

**Files:**
- Modify: `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx`

This is the largest change. The page is ~1800 lines. Be surgical — only modify the query section and top bar render section.

- [ ] **Step 1: Read the current ID resolution block**

Read the file and locate:
```typescript
// Offer lookup — approximately:
const { data: offerData } = await supabase
  .from('offers')
  .select('id')
  .eq('slug', offerSlug)
  .single();

// Campaign lookup — approximately:
const { data: campaignData } = await supabase
  .from('campaigns')
  .select('id, name')
  .eq('offer_id', offerData.id)
  .eq('slug', campaignSlug)
  .single();
```

Note the exact field names and variable names used.

- [ ] **Step 2: Expand offer query to include `default_vertical_id`**

Change:
```typescript
.select('id')
```
To:
```typescript
.select('id, default_vertical_id')
```

- [ ] **Step 3: Expand campaign query to include `vertical_id`**

Change:
```typescript
.select('id, name')
```
To:
```typescript
.select('id, name, vertical_id')
```

- [ ] **Step 4: Add state for vertical display info**

After the existing state declarations (near `const [campaignName, setCampaignName] = useState`), add:

```typescript
const [effectiveVertical, setEffectiveVertical] = useState<{
  name: string;
  source: 'campaign' | 'offer' | 'none';
} | null>(null);
```

- [ ] **Step 5: Add vertical resolution logic after queries complete**

After the campaign query completes (and `setCampaignId(campaignData.id)` etc.), add:

```typescript
// Resolve effective vertical
const verticalId = campaignData.vertical_id ?? offerData.default_vertical_id ?? null;
const source = campaignData.vertical_id
  ? 'campaign'
  : offerData.default_vertical_id
  ? 'offer'
  : 'none';

if (verticalId) {
  const supabase2 = createClient();
  const { data: vertData } = await supabase2
    .from('verticals')
    .select('name')
    .eq('id', verticalId)
    .single();
  if (vertData?.name) {
    setEffectiveVertical({ name: vertData.name, source });
  }
} else {
  setEffectiveVertical({ name: '', source: 'none' });
}
```

Note: `supabase2` is used to avoid variable shadowing if `supabase` is already defined in scope. Alternatively reuse the same client — adjust to match existing patterns in the file.

- [ ] **Step 6: Add the `EffectiveVerticalBadge` inline component**

Add this small function near the top of the file (before the main component, after helper imports):

```typescript
function EffectiveVerticalBadge({
  vertical,
}: {
  vertical: { name: string; source: 'campaign' | 'offer' | 'none' } | null;
}) {
  if (!vertical || vertical.source === 'none') {
    return (
      <span className="inline-flex items-center text-[10px] text-neutral-600 px-2 py-0.5 rounded border border-neutral-800">
        No vertical
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-medium">
      {vertical.name}
      <span className="text-indigo-500/60 font-normal">
        {vertical.source === 'campaign' ? 'override' : 'offer default'}
      </span>
    </span>
  );
}
```

- [ ] **Step 7: Add the badge to the top bar**

Locate the top bar section (approximately lines 922-948 based on prior analysis). The structure is:

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-gray-500 font-mono">{offerSlug}</span>
  <span className="text-gray-700">/</span>
  <h1 className="text-sm font-semibold text-white truncate">{campaignName ?? campaignSlug}</h1>
</div>
```

Add the badge after the `<h1>` on the same flex row, or as a second line below:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs text-gray-500 font-mono">{offerSlug}</span>
  <span className="text-gray-700">/</span>
  <h1 className="text-sm font-semibold text-white truncate">{campaignName ?? campaignSlug}</h1>
  <EffectiveVerticalBadge vertical={effectiveVertical} />
</div>
```

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors. If `vertical_id` or `default_vertical_id` are not in the Supabase-generated types, use a type cast on the query result: `const campaignData = raw as { id: string; name: string; vertical_id: string | null }`.

- [ ] **Step 9: Commit**

```bash
git add "frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx"
git commit -m "feat: show effective vertical badge in campaign detail top bar"
```

---

## Chunk 3: Campaigns List Column + Primer Update

### Task 7: Campaigns List — Add Optional Vertical Column

**Files:**
- Modify: `frontend/src/app/dashboard/campaigns/page.tsx`

This is low-risk — adding a new column to an existing table, expanding an existing query. The current query is `"*, campaign_metrics(*), offers(slug)"`.

- [ ] **Step 1: Expand the `Campaign` type**

Current:
```typescript
type Campaign = {
  id: string;
  slug: string;
  name: string;
  offer_id: string;
  strategy: Record<string, string> | null;
  created_at: string;
  campaign_metrics: CampaignMetric[];
  offers: { slug: string } | null;
};
```

Add:
```typescript
type Campaign = {
  id: string;
  slug: string;
  name: string;
  offer_id: string;
  strategy: Record<string, string> | null;
  created_at: string;
  campaign_metrics: CampaignMetric[];
  offers: { slug: string } | null;
  verticals: { name: string; slug: string } | null;  // ← new
};
```

- [ ] **Step 2: Expand the Supabase select query**

Current:
```typescript
.select("*, campaign_metrics(*), offers(slug)")
```

Change to:
```typescript
.select("*, campaign_metrics(*), offers(slug), verticals(name, slug)")
```

Note: PostgREST resolves FK relationships automatically. The FK on `campaigns.vertical_id → verticals.id` means `verticals(name, slug)` will join correctly. If the FK name is ambiguous (multiple FKs from campaigns to verticals), use the explicit hint: `verticals!campaigns_vertical_id_fkey(name, slug)`.

- [ ] **Step 3: Add Vertical to the table header**

Current header array:
```typescript
{["Campaign", "Status", "Sent", "Contacts", "Reply Rate", "Meetings", "Created", ""].map(...)}
```

Change to:
```typescript
{["Campaign", "Status", "Vertical", "Sent", "Contacts", "Reply Rate", "Meetings", "Created", ""].map(...)}
```

- [ ] **Step 4: Add Vertical cell to each table row**

Current row cells start with:
```tsx
<td className="px-5 py-4">  {/* Campaign name + slug */}
<td className="px-5 py-4">  {/* Status */}
<td className="px-5 py-4 text-neutral-300">{m?.total_messages...}</td>  {/* Sent */}
```

After the Status `<td>` and before the Sent `<td>`, add:
```tsx
<td className="px-5 py-4">
  {c.verticals?.name ? (
    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-medium">
      {c.verticals.name}
    </span>
  ) : (
    <span className="text-neutral-600">—</span>
  )}
</td>
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors. If Supabase generated types don't include `verticals` on the campaigns row, cast the `data` result:
```typescript
if (data) setCampaigns(data as Campaign[]);
```
This cast already exists — it will accept the new shape.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/campaigns/page.tsx
git commit -m "feat: add vertical column to campaigns list table"
```

---

### Task 8: Update `primer.md`

**Files:**
- Modify: `primer.md`

- [ ] **Step 1: Update Implementation Status in Vertical Architecture section**

Find:
```
- ⏳ Section 4: UI changes (vertical selector, inheritance display) — not yet designed
```

Replace with:
```
- ✅ Section 4: UI changes — vertical selector on offer + campaign forms, effective vertical badge on campaign detail + campaigns list
```

- [ ] **Step 2: Update Current Known Limitations**

Find:
```
- **Vertical UI not built:** No vertical selector in dashboard yet (Section 4 pending)
```

Replace with:
```
- **Vertical UI complete (Section 4):** Vertical selector on offer/campaign forms; effective vertical badge in campaign detail top bar and campaigns list. See Change Log 2026-03-13 Section 4.
```

- [ ] **Step 3: Add Section 4 entry to Change Log**

After the existing 2026-03-13 entry (vertical playbook content), add:

```markdown
### 2026-03-13 — Section 4: Vertical UI Implementation

**UI Decisions (locked in before implementation):**
- `default_vertical_id` is optional on offer creation (blank is allowed)
- Campaign override defaults to blank/"Inherit from offer"; never pre-populated with offer default; helper text shows "Inheriting from offer: {name}"
- Active verticals only (`active = true`) shown in dropdown
- Effective vertical shown on: offer form, campaign form, campaign detail top bar, campaigns list table
- Simple first pass: clean dropdown + helper text; campaign detail badge shows name + source label ("override" / "offer default" / "No vertical")

**Files changed:**
- `frontend/src/components/VerticalSelect.tsx` — NEW — shared dropdown, loads active verticals from Supabase, `showInherit` prop for campaign form
- `frontend/src/app/dashboard/offers/new/page.tsx` — added `default_vertical_id` to `OfferForm`, added `VerticalSelect` field with helper text
- `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/new/page.tsx` — added `vertical_id` to `CampaignForm`, added `VerticalSelect` with inherit mode, useEffect to load offer's default vertical name for helper text
- `src/core/skills/skill-1-new-offer.ts` — added `default_vertical_id: formData?.default_vertical_id || null` to offers upsert
- `src/core/skills/skill-2-campaign-strategy.ts` — added `vertical_id: formData?.vertical_id || null` to campaigns upsert
- `frontend/src/app/dashboard/offers/[offerSlug]/campaigns/[campaignSlug]/page.tsx` — expanded queries to include `vertical_id`/`default_vertical_id`, added `EffectiveVerticalBadge` inline component, added badge to top bar
- `frontend/src/app/dashboard/campaigns/page.tsx` — added `verticals(name, slug)` to select, added Vertical column to table
- `primer.md` — updated with Section 4 status, decisions, and change log

**Data flow:**
- Vertical options: browser Supabase `verticals WHERE active=true ORDER BY name`
- Offer save: `formData.default_vertical_id || null` → `offers.default_vertical_id` via Skill 1 upsert
- Campaign save: `formData.vertical_id || null` → `campaigns.vertical_id` via Skill 2 upsert
- Effective vertical display: `campaign.vertical_id ?? offer.default_vertical_id` resolved client-side in campaign detail

**Edge cases handled:**
- Empty string from "Inherit from offer" dropdown persists as `null` (handled by `|| null` in upsert)
- Campaign with no vertical and offer with no vertical → shows "No vertical" badge
- Offer with no active verticals in DB → dropdown shows only placeholder option

**Recommended next priority after Section 4:**
1. Make scoring vertical-configurable — `scoring.ts` currently uses hardcoded tech keywords; vertical `scoring.md` should influence ICP scoring weights
2. Skills 4 & 5: actively consume vertical context — currently informational only
3. Run live skill execution with vertical: "Talent As A Service - US" has `default_vertical_id = staffing`; run Skills 1-6 to verify context appears in outputs
```

- [ ] **Step 4: Update "What Should Be Worked On Next"**

Find:
```
1. **Design Section 4 (UI)** — Vertical selector on offer/campaign forms, inheritance display on campaign detail
```

Replace with:
```
1. ✅ **Section 4 (UI) complete** — Vertical selector on offer/campaign forms, effective vertical badge on campaign detail + campaigns list
2. **Make scoring vertical-configurable** — `scoring.ts` currently hardcoded; vertical `scoring.md` should influence ICP scoring weights
3. **Skills 4 & 5: actively consume vertical context** — Both load context via `buildSkillContext()` but currently only log/display it
4. **Run live skill execution with vertical** — "Talent As A Service - US" now has `default_vertical_id = staffing`; run Skills 1-6 via dashboard or CLI to verify context appears in outputs
```

- [ ] **Step 5: Commit**

```bash
git add primer.md
git commit -m "docs: update primer.md with Section 4 UI implementation"
```

---

## Validation Checklist

After completing all tasks, run the following checks:

- [ ] `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- [ ] Navigate to `/dashboard/offers/new` — Vertical dropdown renders, loads 3 active verticals (Staffing, AI/Data Consulting, Cloud/Software Delivery), no error
- [ ] Submit new offer with a vertical selected — Skill 1 runs, check DB: `SELECT default_vertical_id FROM offers WHERE slug = '{new-slug}'` — should match selected ID
- [ ] Submit new offer without a vertical — `default_vertical_id` should be `null` in DB
- [ ] Navigate to `/dashboard/offers/{slug}/campaigns/new` — Vertical dropdown renders with "Inherit from offer" as first option; if offer has `default_vertical_id`, helper text shows "Inheriting from offer: {name}"
- [ ] Submit campaign with a vertical override — check DB: `SELECT vertical_id FROM campaigns WHERE slug = '{slug}'`
- [ ] Submit campaign without override (blank) — `vertical_id` should be `null` in DB
- [ ] Navigate to a campaign detail page — effective vertical badge appears in top bar; shows correct name + source label
- [ ] Campaign with `vertical_id` set: badge shows "override" source
- [ ] Campaign with no `vertical_id` but offer has `default_vertical_id`: badge shows "offer default" source
- [ ] Campaign where neither is set: badge shows "No vertical"
- [ ] Navigate to `/dashboard/campaigns` — Vertical column visible; rows with a vertical show badge; rows without show "—"

---

## Notes for Implementer

1. **PostgREST FK join syntax:** If `verticals(name, slug)` fails in the campaigns list query due to FK ambiguity (two FKs from the same table), use `verticals!campaigns_vertical_id_fkey(name, slug)`. The FK name follows Supabase's `{table}_{column}_fkey` convention.

2. **Supabase generated types:** If generated types in `frontend/src/lib/database.types.ts` don't include `default_vertical_id`/`vertical_id`, the runtime still works (RLS is off, PostgREST returns all columns). TypeScript casts with `as Campaign[]` or `as any` are acceptable here and are already used in these files.

3. **The `createClient()` import path:** In frontend files, the browser client is at `@/lib/supabase`. Confirm with the existing imports in whichever file you're editing.

4. **Skill upsert type conflicts:** The skill files use `src/lib/supabase.ts` (server-side client). If the TypeScript `Database` type doesn't include `default_vertical_id`/`vertical_id` on the insert types, add a `// @ts-ignore` comment on that line or cast the upsert object. Do not regenerate types during this task.

5. **`EffectiveVerticalBadge` placement in campaign detail:** If the exact top bar markup has changed since the plan was written (the file is large and frequently updated), adapt the placement to keep the badge on the same visual line as the campaign name. The structural principle is: badge follows the `<h1>{campaignName}</h1>` element.
