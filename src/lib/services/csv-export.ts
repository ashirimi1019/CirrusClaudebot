/**
 * CSV Export Service
 * Handles CSV generation for leads and outreach files
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert an array of objects to CSV string.
 * Uses the keys of the first object as headers.
 */
export function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');

  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Write CSV to a file, creating directories as needed.
 */
export function writeCsv(filePath: string, rows: Record<string, unknown>[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, objectsToCsv(rows), 'utf-8');
}

/**
 * Build the standard campaign-export.csv rows from contacts + companies.
 */
export interface LeadRow {
  company_name: string;
  company_domain: string;
  hiring_signal: string;
  fit_score: number | string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string;
}

export function buildLeadRows(
  contacts: Array<{
    company_name: string;
    company_domain: string;
    hiring_signal: string;
    fit_score: number | null;
    first_name: string | null;
    last_name: string | null;
    title: string | null;
    email: string | null;
    linkedin_url: string | null;
  }>
): LeadRow[] {
  return contacts.map((c) => ({
    company_name: c.company_name || '',
    company_domain: c.company_domain || '',
    hiring_signal: c.hiring_signal || '',
    fit_score: c.fit_score ?? '',
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    title: c.title || '',
    email: c.email || '',
    linkedin_url: c.linkedin_url || '',
  }));
}
