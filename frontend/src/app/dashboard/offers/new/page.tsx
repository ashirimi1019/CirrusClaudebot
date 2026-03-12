'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { LogPanel } from '@/components/ui/log-panel';
import { useSkillRunner } from '@/lib/useSkillRunner';

interface OfferForm {
  name: string;
  category: string;
  targetCustomer: string;
  customerProblem: string;
  whyNow: string;
  customerAlternative: string;
  observableSuccess: string;
  valueProp: string;
  differentiators: string;
  salesModel: string;
  objectionHandlers: string;
  goToMarket: string;
  pricingPackaging: string;
  successStories: string;
}

const DEFAULTS: OfferForm = {
  name: '',
  category: 'Staffing / Talent as a Service',
  targetCustomer: 'Series A+ startups and growth-stage companies scaling engineering teams',
  customerProblem: 'Takes 3–4 months to hire vetted engineers via traditional recruiting',
  whyNow: 'AI adoption is accelerating demand for specialized talent',
  customerAlternative: 'In-house recruiting or traditional staffing agencies',
  observableSuccess: 'Hire vetted engineers in 3–4 weeks instead of months',
  valueProp: 'Pre-vetted engineering talent placed in weeks, not months',
  differentiators: 'Signal-driven sourcing, vetted talent pool, faster placement',
  salesModel: 'Contingency placement or retained search',
  objectionHandlers: 'Cost concerns, quality skepticism, timeline doubts',
  goToMarket: 'Signal-driven outbound: target companies actively hiring engineers',
  pricingPackaging: '15–20% annual salary placement fee or monthly retainer',
  successStories: 'Placed 5 engineers at a Series B fintech in 4 weeks',
};

function Field({
  label,
  field,
  form,
  onChange,
  hint,
  multiline,
}: {
  label: string;
  field: keyof OfferForm;
  form: OfferForm;
  onChange: (f: keyof OfferForm, v: string) => void;
  hint?: string;
  multiline?: boolean;
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

export default function NewOfferPage() {
  const router = useRouter();
  const [form, setForm] = useState<OfferForm>(DEFAULTS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = useCallback((field: keyof OfferForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Pass form data as extraParams so the hook encodes them for Skill 1
  const { logs, isRunning, exitCode, run, logEndRef } = useSkillRunner(
    1,
    '',
    '',
    form as unknown as Record<string, string>,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    run();
  };

  // Auto-redirect to offers list after success
  // Redirect to the list page rather than guessing the slug — the backend
  // may slugify differently (e.g. add a numeric suffix for duplicates).
  React.useEffect(() => {
    if (exitCode === 0) {
      setTimeout(() => router.push('/dashboard/offers'), 1500);
    }
  }, [exitCode, router]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/offers"
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Offer</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Run Skill 1 — fill out the 13-section positioning canvas
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Required: Offer name */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <Field
            label="Offer Name *"
            field="name"
            form={form}
            onChange={handleChange}
            hint='e.g. "Talent As A Service - US"'
          />
        </div>

        {/* Canvas sections (collapsible) */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <span>Positioning Canvas (13 sections)</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <Field label="1. Category" field="category" form={form} onChange={handleChange} />
              <Field
                label="2. Target Customer"
                field="targetCustomer"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field
                label="3. Customer Problem"
                field="customerProblem"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field label="4. Why Now" field="whyNow" form={form} onChange={handleChange} multiline />
              <Field
                label="5. Customer Alternative"
                field="customerAlternative"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="6. Observable Success"
                field="observableSuccess"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field
                label="7. Value Proposition"
                field="valueProp"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="8. Differentiators"
                field="differentiators"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field
                label="9. Sales Model"
                field="salesModel"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="10. Objection Handlers"
                field="objectionHandlers"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field
                label="11. Go-to-Market"
                field="goToMarket"
                form={form}
                onChange={handleChange}
                multiline
              />
              <Field
                label="12. Pricing & Packaging"
                field="pricingPackaging"
                form={form}
                onChange={handleChange}
              />
              <Field
                label="13. Success Stories / Proof"
                field="successStories"
                form={form}
                onChange={handleChange}
                multiline
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isRunning || !form.name.trim()}
          className={`w-full py-2.5 text-sm font-medium rounded-lg border transition-all ${
            isRunning || !form.name.trim()
              ? 'bg-neutral-800 border-neutral-700 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isRunning ? 'Running Skill 1…' : 'Run Skill 1 — Create Offer'}
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
              ✅ Offer created! Redirecting…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
