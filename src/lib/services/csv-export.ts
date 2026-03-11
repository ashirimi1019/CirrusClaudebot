/**
 * CSV Export Service
 * Handles CSV generation for leads and outreach files.
 * Includes row validation and warnings for data quality.
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert an array of objects to CSV string.
 * Uses the keys of the first object as headers.
 * Warns on empty input.
 */
export function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    console.warn('  ⚠️ objectsToCsv called with 0 rows — CSV will be empty');
    return '';
  }

  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');

  let emptyFieldCount = 0;
  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? '';
        if (val === '' || val === null || val === undefined) emptyFieldCount++;
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  if (emptyFieldCount > rows.length * headers.length * 0.3) {
    console.warn(`  ⚠️ CSV has ${emptyFieldCount} empty fields across ${rows.length} rows — data may be sparse`);
  }

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Write CSV to a file, creating directories as needed.
 * Returns the number of rows written.
 */
export function writeCsv(filePath: string, rows: Record<string, unknown>[]): number {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const csv = objectsToCsv(rows);
  fs.writeFileSync(filePath, csv, 'utf-8');
  console.log(`  💾 Wrote ${rows.length} rows to ${path.basename(filePath)}`);
  return rows.length;
}

/**
 * Build the standard campaign-export.csv rows from contacts + companies.
 * Filters out rows with no email and warns about data quality.
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
  let skippedNoEmail = 0;
  let missingName = 0;

  const rows: LeadRow[] = [];
  for (const c of contacts) {
    if (!c.email || c.email.trim() === '') {
      skippedNoEmail++;
      continue;
    }
    if (!c.first_name || c.first_name.trim() === '') {
      missingName++;
    }
    rows.push({
      company_name: c.company_name || '',
      company_domain: c.company_domain || '',
      hiring_signal: c.hiring_signal || '',
      fit_score: c.fit_score ?? '',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      title: c.title || '',
      email: c.email || '',
      linkedin_url: c.linkedin_url || '',
    });
  }

  if (skippedNoEmail > 0) {
    console.warn(`  ⚠️ buildLeadRows: skipped ${skippedNoEmail} contacts with no email`);
  }
  if (missingName > 0) {
    console.warn(`  ⚠️ buildLeadRows: ${missingName} contacts have no first_name`);
  }
  return rows;
}
