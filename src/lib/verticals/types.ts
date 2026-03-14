/**
 * Vertical Playbook Types
 *
 * Each vertical (staffing, ai-data-consulting, cloud-software-delivery)
 * has 8 required markdown files under context/verticals/{slug}/.
 * These are loaded at runtime and merged with shared context.
 */

export interface VerticalPlaybook {
  slug: string;
  name: string;           // Human-readable (e.g., "Staffing")
  overview: string;       // overview.md
  icp: string;            // icp.md
  buyers: string;         // buyers.md
  signals: string;        // signals.md
  scoring: string;        // scoring.md
  messaging: string;      // messaging.md
  objections: string;     // objections.md
  proofPoints: string;    // proof-points.md
}

/** Fields that can be loaded from a playbook */
export type PlaybookField = keyof Omit<VerticalPlaybook, 'slug' | 'name'>;

/** All 8 required playbook fields */
export const PLAYBOOK_FIELDS: PlaybookField[] = [
  'overview', 'icp', 'buyers', 'signals',
  'scoring', 'messaging', 'objections', 'proofPoints',
];

/** Maps playbook field to filename */
export const FIELD_TO_FILE: Record<PlaybookField, string> = {
  overview: 'overview.md',
  icp: 'icp.md',
  buyers: 'buyers.md',
  signals: 'signals.md',
  scoring: 'scoring.md',
  messaging: 'messaging.md',
  objections: 'objections.md',
  proofPoints: 'proof-points.md',
};

/** Known verticals */
export const VERTICAL_SLUGS = ['staffing', 'ai-data-consulting', 'cloud-software-delivery'] as const;
export type VerticalSlug = (typeof VERTICAL_SLUGS)[number];

/** Vertical display names */
export const VERTICAL_NAMES: Record<VerticalSlug, string> = {
  'staffing': 'Staffing',
  'ai-data-consulting': 'AI & Data Consulting',
  'cloud-software-delivery': 'Cloud & Software Delivery',
};

/** Per-skill playbook field configuration */
export interface SkillPlaybookConfig {
  primary: PlaybookField[];
  optional: PlaybookField[];
}

/** Corrected per-skill playbook mappings */
export const SKILL_PLAYBOOK_MAP: Record<string, SkillPlaybookConfig> = {
  'skill-1': {
    primary: ['overview', 'icp', 'buyers'],
    optional: ['signals'],
  },
  'skill-2': {
    primary: ['overview', 'icp', 'buyers', 'signals', 'messaging'],
    optional: ['objections'],
  },
  'skill-3': {
    primary: ['messaging', 'objections', 'proofPoints'],
    optional: ['buyers'],
  },
  'skill-4': {
    primary: ['icp', 'buyers', 'signals', 'scoring'],
    optional: [],
  },
  'skill-5': {
    primary: ['messaging', 'objections', 'proofPoints'],
    optional: ['buyers'],
  },
  'skill-6': {
    primary: ['overview', 'messaging', 'proofPoints'],
    optional: ['objections'],
  },
};

/** Result of building skill context */
export interface SkillContextResult {
  /** Merged context string (shared base + vertical appendix) */
  context: string;
  /** Effective vertical slug, or null if no vertical */
  effectiveVertical: string | null;
  /** Human-readable vertical name, or null */
  effectiveVerticalName: string | null;
  /** Which playbook sections were loaded */
  loadedSections: PlaybookField[];
}
