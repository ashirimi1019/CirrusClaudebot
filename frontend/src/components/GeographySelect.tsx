'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ── Supported country list (mirrors DEFAULT_ALLOWED_COUNTRIES in geography.ts) ──

export const SUPPORTED_COUNTRIES: string[] = [
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Uruguay',
];

// ── US states (mirrors US_STATES in geography.ts) ───────────────────────────

export const US_STATES: string[] = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia',
];

// ── Shared checkbox styles ───────────────────────────────────────────────────

const pillCls = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer select-none transition-colors',
    active
      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300',
  );

// ── Props ────────────────────────────────────────────────────────────────────

export interface GeographySelectProps {
  /** Selected country names. Empty array = system default (all 9 countries). */
  countries: string[];
  onCountriesChange: (countries: string[]) => void;
  /** Selected US state names. Empty array = all US states. Only relevant when United States is selected. */
  usStates: string[];
  onUsStatesChange: (states: string[]) => void;
  /** If true, show a "Inherit from offer" header note instead of "System default" */
  showInherit?: boolean;
  /** Text displayed beneath the component */
  helperText?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GeographySelect({
  countries,
  onCountriesChange,
  usStates,
  onUsStatesChange,
  showInherit = false,
  helperText,
}: GeographySelectProps) {
  const usSelected = countries.includes('United States');

  const toggleCountry = (country: string) => {
    if (countries.includes(country)) {
      const next = countries.filter((c) => c !== country);
      onCountriesChange(next);
      // If deselecting US, clear state filter too
      if (country === 'United States') {
        onUsStatesChange([]);
      }
    } else {
      onCountriesChange([...countries, country]);
    }
  };

  const toggleState = (state: string) => {
    if (usStates.includes(state)) {
      onUsStatesChange(usStates.filter((s) => s !== state));
    } else {
      onUsStatesChange([...usStates, state]);
    }
  };

  const allCountriesSelected = countries.length === 0;
  const noCountrySelected = countries.length === 0;

  return (
    <div className="space-y-3">
      {/* Country pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400">Countries</span>
          {noCountrySelected ? (
            <span className="text-[10px] text-neutral-500">
              {showInherit ? 'Inherit from offer' : 'System default (all 9)'}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { onCountriesChange([]); onUsStatesChange([]); }}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED_COUNTRIES.map((country) => {
            const active = countries.includes(country);
            return (
              <button
                key={country}
                type="button"
                onClick={() => toggleCountry(country)}
                className={pillCls(active)}
                aria-pressed={active}
              >
                {country}
              </button>
            );
          })}
        </div>
      </div>

      {/* US States — only shown when United States is selected */}
      {usSelected && (
        <div className="pl-3 border-l border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">US States</span>
            {usStates.length === 0 ? (
              <span className="text-[10px] text-neutral-500">All states (no restriction)</span>
            ) : (
              <button
                type="button"
                onClick={() => onUsStatesChange([])}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Clear ({usStates.length} selected)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {US_STATES.map((state) => {
              const active = usStates.includes(state);
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => toggleState(state)}
                  className={pillCls(active)}
                  aria-pressed={active}
                >
                  {state}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-600 mt-1.5">
            Leave empty to allow all US states. Select specific states to restrict.
          </p>
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <p className="text-xs text-neutral-500">{helperText}</p>
      )}
    </div>
  );
}

// ── Read-only display (campaign detail page) ─────────────────────────────────

export interface GeographyDisplayProps {
  countries: string[];
  usStates: string[];
  source: 'campaign' | 'offer' | 'system';
  isDefault?: boolean;
}

export function GeographyDisplay({ countries, usStates, source, isDefault }: GeographyDisplayProps) {
  const sourceLabel =
    source === 'campaign'
      ? '(campaign override)'
      : source === 'offer'
        ? '(from offer)'
        : '(system default)';

  const sourceColor =
    source === 'campaign'
      ? 'text-indigo-400/60'
      : source === 'offer'
        ? 'text-violet-400/60'
        : 'text-neutral-500';

  const displayCountries = countries.length > 0 ? countries : ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Uruguay'];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {displayCountries.map((c) => (
          <span
            key={c}
            className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300"
          >
            {c}
          </span>
        ))}
        <span className={`text-[10px] ${sourceColor}`}>{sourceLabel}</span>
      </div>
      {usStates.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-2 border-l border-neutral-800">
          <span className="text-[10px] text-neutral-500">US states:</span>
          {usStates.map((s) => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
              {s}
            </span>
          ))}
        </div>
      )}
      {source !== 'campaign' && countries.length === 0 && (
        <p className="text-[10px] text-neutral-600 pl-0.5">All 9 Americas markets</p>
      )}
    </div>
  );
}
