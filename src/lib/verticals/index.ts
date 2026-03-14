/**
 * Vertical Playbook System — Public API
 */

export { buildSkillContext } from './context-builder.ts';
export { getEffectiveVertical } from './resolver.ts';
export { loadVerticalPlaybook, loadPlaybookFields, validatePlaybook } from './loader.ts';
export type {
  VerticalPlaybook,
  PlaybookField,
  SkillPlaybookConfig,
  SkillContextResult,
  VerticalSlug,
} from './types.ts';
export {
  PLAYBOOK_FIELDS,
  FIELD_TO_FILE,
  SKILL_PLAYBOOK_MAP,
  VERTICAL_SLUGS,
  VERTICAL_NAMES,
} from './types.ts';
