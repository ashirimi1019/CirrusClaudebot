/**
 * Validation Service
 * Input validation for skills, API calls, and data quality.
 * All errors are readable and actionable.
 */

import fs from 'fs';
import path from 'path';

// ─── Skill Input Validation ─────────────────────────────────────────────────

export interface SkillInputValidation {
  offerSlug: string;
  campaignSlug?: string;
  requirePositioning?: boolean;
  requireStrategy?: boolean;
  requireCopy?: boolean;
  requireLeads?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that required skill inputs exist.
 * Returns readable errors telling the operator exactly what's missing and what to do.
 */
export function validateSkillInputs(input: SkillInputValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const base = process.cwd();

  if (!input.offerSlug || input.offerSlug.trim() === '') {
    errors.push('Offer slug is required. Provide it as a CLI argument or in config.');
  }

  if (input.offerSlug) {
    const offerDir = path.join(base, 'offers', input.offerSlug);
    if (!fs.existsSync(offerDir)) {
      errors.push(`Offer directory not found: ${offerDir}. Run Skill 1 first.`);
    }

    if (input.requirePositioning) {
      const posPath = path.join(offerDir, 'positioning.md');
      if (!fs.existsSync(posPath)) {
        errors.push(`positioning.md not found at ${posPath}. Run Skill 1 first.`);
      }
    }

    if (input.campaignSlug) {
      const campaignDir = path.join(offerDir, 'campaigns', input.campaignSlug);

      if (input.requireStrategy) {
        const stratPath = path.join(campaignDir, 'strategy.md');
        if (!fs.existsSync(stratPath)) {
          errors.push(`strategy.md not found at ${stratPath}. Run Skill 2 first.`);
        }
      }

      if (input.requireCopy) {
        const copyDir = path.join(campaignDir, 'copy');
        if (!fs.existsSync(copyDir)) {
          errors.push(`Copy directory not found at ${copyDir}. Run Skill 3 first.`);
        } else {
          const variantFiles = fs.readdirSync(copyDir).filter(f => f.startsWith('email-') && f.endsWith('.txt'));
          if (variantFiles.length === 0) {
            errors.push(`No email variant .txt files found in ${copyDir}. Run Skill 3 first.`);
          }
        }
      }

      if (input.requireLeads) {
        const leadsPath = path.join(campaignDir, 'leads', 'all_leads.csv');
        if (!fs.existsSync(leadsPath)) {
          errors.push(`all_leads.csv not found at ${leadsPath}. Run Skill 4 first.`);
        }
      }
    } else if (input.requireStrategy || input.requireCopy || input.requireLeads) {
      errors.push('Campaign slug is required for this skill. Provide it as a CLI argument or in config.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Data Quality Validation ────────────────────────────────────────────────

/**
 * Validate a contact row before DB insert or CSV export.
 * Returns null if valid, or a reason string if invalid.
 */
export function validateContactRow(contact: {
  email?: string | null;
  first_name?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
}): string | null {
  if (!contact.email || contact.email.trim() === '') {
    return 'missing email';
  }
  if (!isValidEmail(contact.email)) {
    return `invalid email format: "${contact.email}"`;
  }
  if (!contact.first_name || contact.first_name.trim() === '') {
    return 'missing first_name';
  }
  return null; // valid
}

/**
 * Validate a company row before DB insert.
 */
export function validateCompanyRow(company: {
  domain?: string | null;
  name?: string | null;
}): string | null {
  if (!company.domain || company.domain.trim() === '') {
    return 'missing domain';
  }
  if (!company.name || company.name.trim() === '') {
    return 'missing company name';
  }
  // Basic domain format check
  if (!/^[a-z0-9]+([\-.][a-z0-9]+)*\.[a-z]{2,}$/i.test(company.domain)) {
    return `suspicious domain format: "${company.domain}"`;
  }
  return null;
}

/**
 * Validate a CSV row has all required fields populated.
 */
export function validateExportRow(row: Record<string, string>, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      return `missing required field: ${field}`;
    }
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Assert a value is truthy, throwing an actionable error if not.
 */
export function assertExists<T>(
  value: T | null | undefined,
  label: string,
  hint?: string
): asserts value is T {
  if (value === null || value === undefined) {
    const msg = `${label} is missing or null.${hint ? ` ${hint}` : ''}`;
    throw new Error(msg);
  }
}

/**
 * Assert database query succeeded and returned data.
 */
export function assertDbResult<T>(
  data: T | null,
  error: any,
  label: string
): asserts data is T {
  if (error) {
    throw new Error(`Database error (${label}): ${error.message || JSON.stringify(error)}`);
  }
  if (!data) {
    throw new Error(`Database returned no data for: ${label}`);
  }
}
