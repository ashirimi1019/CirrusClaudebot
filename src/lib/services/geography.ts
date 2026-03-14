/**
 * geography.ts — Single source of truth for geography enforcement
 *
 * All geography logic lives here. No other file should hardcode country lists,
 * state lists, or allowlist logic. Skills read from DB-backed config via helpers
 * exported from this module.
 *
 * Resolution order (mirrors vertical inheritance pattern):
 *   campaign.allowed_countries ?? offer.allowed_countries ?? DEFAULT_ALLOWED_COUNTRIES
 *   campaign.allowed_us_states ?? offer.allowed_us_states ?? null (null = all states)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default countries when no offer/campaign config is set. */
export const DEFAULT_ALLOWED_COUNTRIES: string[] = [
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

/** Canonical country name → Apollo-compatible location string mappings.
 *  Apollo uses full country names in organization_locations filter. */
export const COUNTRY_APOLLO_NAMES: Record<string, string> = {
  'United States': 'United States',
  Canada: 'Canada',
  Mexico: 'Mexico',
  Brazil: 'Brazil',
  Argentina: 'Argentina',
  Chile: 'Chile',
  Colombia: 'Colombia',
  Peru: 'Peru',
  Uruguay: 'Uruguay',
};

/** All US state names (full names, as Apollo returns them). */
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

/** Country names that are out of scope by default.
 *  Used for rejection logging to provide helpful context. */
export const OUT_OF_SCOPE_BY_DEFAULT: string[] = [
  'Singapore',
  'India',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Sweden',
  'Denmark',
  'Norway',
  'Finland',
  'Japan',
  'South Korea',
  'China',
  'Hong Kong',
  'Taiwan',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'Thailand',
  'Vietnam',
  'United Arab Emirates',
  'Saudi Arabia',
  'Israel',
  'South Africa',
  'Nigeria',
  'Kenya',
  'New Zealand',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeographyConfig {
  allowedCountries: string[];
  /** null means all US states are allowed when US is in allowedCountries */
  allowedUsStates: string[] | null;
}

export interface GeographyRejection {
  companyName: string;
  companyDomain: string;
  country: string | null;
  state: string | null;
  reason: 'country_not_allowed' | 'us_state_not_allowed' | 'country_unknown';
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the effective geography config for a campaign run.
 * Mirrors the vertical inheritance pattern:
 *   campaign override → offer default → system default
 */
export function resolveGeography(
  offerConfig: {
    allowed_countries?: string[] | null;
    allowed_us_states?: string[] | null;
  } | null,
  campaignConfig?: {
    allowed_countries?: string[] | null;
    allowed_us_states?: string[] | null;
  } | null,
): GeographyConfig {
  const allowedCountries =
    (campaignConfig?.allowed_countries?.length
      ? campaignConfig.allowed_countries
      : null) ??
    (offerConfig?.allowed_countries?.length
      ? offerConfig.allowed_countries
      : null) ??
    DEFAULT_ALLOWED_COUNTRIES;

  const allowedUsStates =
    campaignConfig?.allowed_us_states !== undefined
      ? campaignConfig.allowed_us_states
      : offerConfig?.allowed_us_states !== undefined
        ? offerConfig.allowed_us_states
        : null; // null = all states allowed

  return { allowedCountries, allowedUsStates };
}

// ---------------------------------------------------------------------------
// Allowlist checking
// ---------------------------------------------------------------------------

/** Case-insensitive country allowlist check. */
export function isCountryAllowed(
  country: string | null | undefined,
  allowedCountries: string[],
): boolean {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  return allowedCountries.some((c) => c.toLowerCase() === normalized);
}

/** US state allowlist check. null allowedUsStates = all states allowed. */
export function isUsStateAllowed(
  state: string | null | undefined,
  allowedUsStates: string[] | null,
): boolean {
  if (!allowedUsStates) return true; // null means all states allowed
  if (!state) return true; // no state info = don't reject on state grounds
  const normalized = state.trim().toLowerCase();
  return allowedUsStates.some((s) => s.toLowerCase() === normalized);
}

/**
 * Full company geography check.
 * Returns null if allowed, or a GeographyRejection describing why it was rejected.
 */
export function checkCompanyGeography(
  company: {
    name: string;
    domain: string;
    country?: string | null;
    state?: string | null;
  },
  config: GeographyConfig,
): GeographyRejection | null {
  const { allowedCountries, allowedUsStates } = config;

  if (!company.country) {
    return {
      companyName: company.name,
      companyDomain: company.domain,
      country: null,
      state: company.state ?? null,
      reason: 'country_unknown',
    };
  }

  if (!isCountryAllowed(company.country, allowedCountries)) {
    return {
      companyName: company.name,
      companyDomain: company.domain,
      country: company.country,
      state: company.state ?? null,
      reason: 'country_not_allowed',
    };
  }

  // Only apply state filter when company is in US
  const countryNorm = company.country.trim().toLowerCase();
  if (
    countryNorm === 'united states' &&
    allowedUsStates !== null &&
    !isUsStateAllowed(company.state, allowedUsStates)
  ) {
    return {
      companyName: company.name,
      companyDomain: company.domain,
      country: company.country,
      state: company.state ?? null,
      reason: 'us_state_not_allowed',
    };
  }

  return null; // allowed
}

// ---------------------------------------------------------------------------
// Apollo query helpers
// ---------------------------------------------------------------------------

/**
 * Build the `organization_locations` array for Apollo API queries.
 * Converts allowed countries to Apollo-compatible location strings.
 * When US states are specified, adds each state as an Apollo location alongside "United States".
 */
export function buildApolloLocationFilter(config: GeographyConfig): string[] {
  const { allowedCountries, allowedUsStates } = config;

  const locations: string[] = [];

  for (const country of allowedCountries) {
    const apolloName = COUNTRY_APOLLO_NAMES[country] ?? country;

    if (apolloName === 'United States' && allowedUsStates !== null && allowedUsStates.length > 0) {
      // When specific US states are selected, add each state individually.
      // Apollo supports state-level location filtering.
      for (const state of allowedUsStates) {
        locations.push(state);
      }
    } else {
      locations.push(apolloName);
    }
  }

  return locations;
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

/** Build a structured rejection log message for a company. */
export function buildGeographyRejectionMessage(rejection: GeographyRejection): string {
  switch (rejection.reason) {
    case 'country_not_allowed':
      return `[GEOGRAPHY REJECT] ${rejection.companyName} (${rejection.companyDomain}) — country "${rejection.country}" not in allowed list`;
    case 'us_state_not_allowed':
      return `[GEOGRAPHY REJECT] ${rejection.companyName} (${rejection.companyDomain}) — US state "${rejection.state}" not in allowed states`;
    case 'country_unknown':
      return `[GEOGRAPHY REJECT] ${rejection.companyName} (${rejection.companyDomain}) — country unknown, skipping`;
    default:
      return `[GEOGRAPHY REJECT] ${rejection.companyName} (${rejection.companyDomain}) — rejected`;
  }
}

/** Summarize a batch of rejections for end-of-skill logging. */
export function buildGeographySummary(
  total: number,
  accepted: number,
  rejections: GeographyRejection[],
  config: GeographyConfig,
): string {
  const rejected = rejections.length;
  const lines: string[] = [
    `[GEOGRAPHY] Allowed countries: ${config.allowedCountries.join(', ')}`,
    config.allowedUsStates
      ? `[GEOGRAPHY] Allowed US states: ${config.allowedUsStates.join(', ')}`
      : `[GEOGRAPHY] US states: all`,
    `[GEOGRAPHY] Results — total: ${total}, accepted: ${accepted}, rejected: ${rejected}`,
  ];

  if (rejected > 0) {
    const byCountry: Record<string, number> = {};
    for (const r of rejections) {
      const key = r.country ?? 'unknown';
      byCountry[key] = (byCountry[key] ?? 0) + 1;
    }
    lines.push(
      `[GEOGRAPHY] Rejected by country: ${Object.entries(byCountry)
        .map(([c, n]) => `${c} (${n})`)
        .join(', ')}`,
    );
  }

  return lines.join('\n');
}
