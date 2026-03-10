/**
 * Deduplication Service
 * Handles domain extraction and deduplication of companies/contacts
 */

/**
 * Extract clean domain from a company's website URL.
 * Falls back to guessing from company name.
 */
export function extractDomain(websiteUrl: string | null, companyName: string): string {
  if (websiteUrl) {
    return websiteUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/^www\./, '')
      .split('/')[0]; // strip any path
  }
  // Fallback: guess domain from company name
  return `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
}

/**
 * Deduplicate an array of items by a key function.
 * Returns only the first occurrence of each key.
 */
export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate companies by their id field.
 */
export function deduplicateCompanies<T extends { id: string }>(companies: T[]): T[] {
  return deduplicateBy(companies, (c) => c.id);
}

/**
 * Normalize an email address for deduplication.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if an email looks valid (basic check).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
