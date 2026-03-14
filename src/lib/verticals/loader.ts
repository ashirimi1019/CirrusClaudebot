/**
 * Vertical Playbook Loader
 *
 * File-convention loader: reads 8 markdown files from context/verticals/{slug}/
 * and returns a typed VerticalPlaybook object.
 */

import fs from 'fs';
import path from 'path';
import type { VerticalPlaybook, PlaybookField } from './types.ts';
import { FIELD_TO_FILE, PLAYBOOK_FIELDS } from './types.ts';

const VERTICALS_DIR = path.join(process.cwd(), 'context', 'verticals');

/**
 * Load a full vertical playbook from context/verticals/{slug}/.
 * Returns null if the vertical directory doesn't exist.
 * Missing individual files get empty strings (logged as warnings).
 */
export function loadVerticalPlaybook(slug: string): VerticalPlaybook | null {
  const verticalDir = path.join(VERTICALS_DIR, slug);

  if (!fs.existsSync(verticalDir)) {
    return null;
  }

  // Read name from overview.md first line (# Title) or fall back to slug
  const overviewPath = path.join(verticalDir, 'overview.md');
  let name = slug;
  if (fs.existsSync(overviewPath)) {
    const firstLine = fs.readFileSync(overviewPath, 'utf-8').split('\n')[0];
    if (firstLine.startsWith('# ')) {
      name = firstLine.slice(2).trim();
    }
  }

  const playbook: VerticalPlaybook = {
    slug,
    name,
    overview: '',
    icp: '',
    buyers: '',
    signals: '',
    scoring: '',
    messaging: '',
    objections: '',
    proofPoints: '',
  };

  for (const field of PLAYBOOK_FIELDS) {
    const filename = FIELD_TO_FILE[field];
    const filePath = path.join(verticalDir, filename);
    try {
      playbook[field] = fs.readFileSync(filePath, 'utf-8');
    } catch {
      console.warn(`  Warning: Missing playbook file ${slug}/${filename}`);
      playbook[field] = '';
    }
  }

  return playbook;
}

/**
 * Load only specific fields from a vertical playbook.
 * More efficient when a skill only needs a subset.
 */
export function loadPlaybookFields(
  slug: string,
  fields: PlaybookField[]
): Partial<Record<PlaybookField, string>> {
  const verticalDir = path.join(VERTICALS_DIR, slug);
  const result: Partial<Record<PlaybookField, string>> = {};

  if (!fs.existsSync(verticalDir)) return result;

  for (const field of fields) {
    const filename = FIELD_TO_FILE[field];
    const filePath = path.join(verticalDir, filename);
    try {
      result[field] = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Optional fields that are missing get silently skipped
    }
  }

  return result;
}

/**
 * Validate that all 8 required playbook files exist for a vertical.
 * Returns list of missing files.
 */
export function validatePlaybook(slug: string): string[] {
  const verticalDir = path.join(VERTICALS_DIR, slug);
  const missing: string[] = [];

  if (!fs.existsSync(verticalDir)) {
    return PLAYBOOK_FIELDS.map(f => FIELD_TO_FILE[f]);
  }

  for (const field of PLAYBOOK_FIELDS) {
    const filename = FIELD_TO_FILE[field];
    if (!fs.existsSync(path.join(verticalDir, filename))) {
      missing.push(filename);
    }
  }

  return missing;
}
