'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { LogPanel } from '@/components/ui/log-panel';
import { useSkillRunner } from '@/lib/useSkillRunner';
import { VerticalSelect } from '@/components/VerticalSelect';
import { GeographySelect } from '@/components/GeographySelect';
import { createClient } from '@/lib/supabase';

interface CampaignForm {
  campaignName: string;
  signalType: string;
  signalHypothesis: string;
  detectionMethod: string;
  primaryAPI: string;
  secondaryAPIs: string;
  messagingFramework: string;
  targetGeography: string;
  companyFilters: string;
  buyerFilters: string;
  expectedVolume: string;
  expectedFit: string;
  vertical_id: string;
  allowed_countries: string[];
  allowed_us_states: string[];
}

const DEFAULTS: CampaignForm = {
  campaignName: '',
  signalType: 'Active job posting',
  signalHypothesis: 'Companies hiring for Data Engineers need staffing support',
  detectionMethod: 'Apollo.io company search with hiring keywords',
  primaryAPI: 'Apollo.io',
  secondaryAPIs: 'Apollo.io enrichment (built-in)',
  messagingFramework: 'PVP',
  targetGeography: 'US, Brazil, Mexico',
  companyFilters: 'Series A+, 50-1000 employees',
  buyerFilters: 'CTO, VP Engineering, Founder',
  expectedVolume: '20-30 companies per search',
  expectedFit: '60% will match ICP',
  vertical_id: '',
  allowed_countries: [],
  allowed_us_states: [],
};

function Field({
  label,
  field,
  form,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  field: keyof CampaignForm;
  form: CampaignForm;
  onChange: (f: keyof CampaignForm, v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const cls =
    'w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          value={form[field]}
          onChange={(e) => onChange(field, e.target.value)}
          className={`${cls} resize-none`}
          placeholder={hint}
        />
      ) : (
        <input
          type="text"
          value={form[field]}
          onChange={(e) => onChange(field, e.target.value)}
          className={cls}
          placeholder={hint}
        />
      )}
    </div>
  );
}

export default function NewCampaignPage() {
  const { offerSlug } = useParams<{ offerSlug: string }>();
  const router = useRouter();
  const [form, setForm] = useState<CampaignForm>(DEFAULTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offerVerticalName, setOfferVerticalName] = useState<string>('');
  const [offerAllowedCountries, setOfferAllowedCountries] = useState<string[]>([]);

  useEffect(() => {
    if (!offerSlug) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('offers')
      .select('default_vertical_id, allowed_countries, verticals(name)')
      .eq('slug', offerSlug)
      .single()
      .then(({ data }: { data: { default_vertical_id: string | null; allowed_countries: string[] | null; verticals: { name: string } | null } | null }) => {
        if (!cancelled) {
          const name = data?.verticals?.name;
          if (name) setOfferVerticalName(name);
          setOfferAllowedCountries(data?.allowed_countries ?? []);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [offerSlug]);

  const handleChange = useCallback((field: keyof CampaignForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // useSkillRunner for Skill 2 — passes offerSlug + all form fields
  const { logs, isRunning, exitCode, run, logEndRef } = useSkillRunner(
    2,
    offerSlug,
    '',
    { ...form, name: form.campaignName } as unknown as Record<string, string>,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.campaignName.trim()) return;
    run();
  };

  // Auto-redirect after success
  // Redirect to the offer detail page rather than guessing the campaign slug —
  // the backend may slugify differently (e.g. add a numeric suffix for duplicates).
  React.useEffect(() => {
    if (exitCode === 0) {
      setTimeout(
        () => router.push(`/dashboard/offers/${offerSlug}`),
        1500,
      );
    }
  }, [exitCode, offerSlug, router]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/offers/${offerSlug}`}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Campaign</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Offer: <span className="font-mono text-gray-400">{offerSlug}</span>
            {' · '}Run Skill 2 — design signal strategy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campaign name */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <Field
            label="Campaign Name *"
            field="campaignName"
            form={form}
            onChange={handleChange}
            hint='e.g. "Hiring Data Engineers - Q1"'
          />
        </div>

        {/* Signal hypothesis (most important field after name) */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <Field
            label="Signal Hypothesis"
            field="signalHypothesis"
            form={form}
            onChange={handleChange}
            multiline
            hint="What signal indicates a company needs you right now?"
          />
        </div>

        {/* Advanced strategy fields (collapsible) */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <span>Strategy Details</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <Field
                label="1. Signal Type"
                field="signalType"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="3. Detection Method"
                field="detectionMethod"
                form={form}
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="4. Primary API"
                  field="primaryAPI"
                  form={form}
                  onChange={handleChange}
                />
                <Field
                  label="5. Secondary APIs"
                  field="secondaryAPIs"
                  form={form}
                  onChange={handleChange}
                />
              </div>
              <Field
                label="6. Messaging Framework"
                field="messagingFramework"
                form={form}
                onChange={handleChange}
                hint="PVP or Use-Case-Driven"
              />
              <Field
                label="7. Target Geography"
                field="targetGeography"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="8. Company Filters"
                field="companyFilters"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="9. Buyer Filters"
                field="buyerFilters"
                form={form}
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="10. Expected Volume"
                  field="expectedVolume"
                  form={form}
                  onChange={handleChange}
                />
                <Field
                  label="11. Expected Fit %"
                  field="expectedFit"
                  form={form}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Vertical override */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Vertical Override
          </label>
          <VerticalSelect
            value={form.vertical_id}
            onChange={(v) => setForm((f) => ({ ...f, vertical_id: v }))}
            showInherit={true}
          />
          <p className="text-xs text-neutral-500 mt-1">
            {offerVerticalName
              ? `Inheriting from offer: ${offerVerticalName}`
              : 'Leave blank to inherit the vertical from the offer.'}
          </p>
        </div>

        {/* Geography override */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <label className="block text-xs font-medium text-gray-400 mb-3">
            Geography Override
          </label>
          <GeographySelect
            countries={form.allowed_countries}
            onCountriesChange={(v) => setForm((f) => ({ ...f, allowed_countries: v }))}
            usStates={form.allowed_us_states}
            onUsStatesChange={(v) => setForm((f) => ({ ...f, allowed_us_states: v }))}
            showInherit={true}
            helperText={
              form.allowed_countries.length === 0
                ? offerAllowedCountries.length > 0
                  ? `Inheriting from offer: ${offerAllowedCountries.join(', ')}`
                  : 'Leave blank to inherit geography from the offer (or system default: all 9 Americas markets).'
                : undefined
            }
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isRunning || !form.campaignName.trim()}
          className={`w-full py-2.5 text-sm font-medium rounded-lg border transition-all ${
            isRunning || !form.campaignName.trim()
              ? 'bg-neutral-800 border-neutral-700 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isRunning ? 'Running Skill 2…' : 'Run Skill 2 — Create Campaign'}
        </button>
      </form>

      {/* Log output */}
      {(logs.length > 0 || isRunning) && (
        <div className="mt-6">
          <LogPanel
            logs={logs}
            isRunning={isRunning}
            exitCode={exitCode}
            logEndRef={logEndRef}
          />
          {exitCode === 0 && (
            <p className="text-center text-green-400 text-sm mt-3">
              ✅ Campaign created! Redirecting…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
