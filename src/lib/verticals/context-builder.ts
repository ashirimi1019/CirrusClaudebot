/**
 * Centralized Skill Context Builder
 *
 * buildSkillContext(skillId, offerId, campaignId?) is the single entry point
 * for all skills to get their merged context (shared base + vertical appendix).
 *
 * Rules:
 * - Shared context is NEVER replaced — vertical context is APPENDED
 * - Each skill gets only the playbook fields it needs (per SKILL_PLAYBOOK_MAP)
 * - Effective vertical is resolved once via getEffectiveVertical()
 * - Logs vertical resolution + loaded sections for every skill run
 */

import { getEffectiveVertical } from './resolver.ts';
import { loadPlaybookFields } from './loader.ts';
import type { SkillContextResult, PlaybookField } from './types.ts';
import { SKILL_PLAYBOOK_MAP, FIELD_TO_FILE } from './types.ts';

/**
 * Build the merged context for a skill run.
 *
 * @param skillId - e.g. 'skill-1', 'skill-2', etc.
 * @param offerId - UUID of the offer
 * @param campaignId - UUID of the campaign (optional, used for vertical override)
 * @returns SkillContextResult with merged context string and metadata
 */
export async function buildSkillContext(
  skillId: string,
  offerId: string,
  campaignId?: string
): Promise<SkillContextResult> {
  // 1. Resolve effective vertical (single call, never duplicated)
  const resolved = await getEffectiveVertical(offerId, campaignId);

  // 2. If no vertical, return empty context (skill uses shared files as before)
  if (!resolved.verticalSlug) {
    console.log(`  [Vertical] ${skillId}: No vertical configured (source: ${resolved.source})`);
    return {
      context: '',
      effectiveVertical: null,
      effectiveVerticalName: null,
      loadedSections: [],
    };
  }

  // 3. Get skill's playbook field configuration
  const config = SKILL_PLAYBOOK_MAP[skillId];
  if (!config) {
    console.warn(`  [Vertical] ${skillId}: No playbook mapping defined, skipping vertical context`);
    return {
      context: '',
      effectiveVertical: resolved.verticalSlug,
      effectiveVerticalName: resolved.verticalName,
      loadedSections: [],
    };
  }

  // 4. Load required + optional fields from the vertical playbook
  const allFields = [...config.primary, ...config.optional];
  const loaded = loadPlaybookFields(resolved.verticalSlug, allFields);

  // 5. Build the vertical context appendix
  const sections: string[] = [];
  const loadedSections: PlaybookField[] = [];

  for (const field of allFields) {
    const content = loaded[field];
    if (content && content.trim()) {
      const filename = FIELD_TO_FILE[field];
      sections.push(`--- VERTICAL: ${resolved.verticalName} — ${filename} ---\n${content}`);
      loadedSections.push(field);
    }
  }

  const context = sections.length > 0
    ? `\n\n=== VERTICAL CONTEXT: ${resolved.verticalName} ===\n\n${sections.join('\n\n')}`
    : '';

  // 6. Log what was resolved and loaded
  console.log(`  [Vertical] ${skillId}: vertical="${resolved.verticalSlug}" (source: ${resolved.source})`);
  console.log(`  [Vertical] ${skillId}: loaded sections=[${loadedSections.join(', ')}]`);
  if (config.primary.some(f => !loaded[f])) {
    const missing = config.primary.filter(f => !loaded[f]);
    console.warn(`  [Vertical] ${skillId}: MISSING primary sections=[${missing.join(', ')}]`);
  }

  return {
    context,
    effectiveVertical: resolved.verticalSlug,
    effectiveVerticalName: resolved.verticalName,
    loadedSections,
  };
}
