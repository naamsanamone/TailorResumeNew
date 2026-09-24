/* oxlint-disable typescript/no-explicit-any */
import { getRegistryEntryByTemplateId } from '@/templates/registry';
import { useCustomSectionsStore } from '@/stores/customSections';

/** Uses registry rules so templates stay in sync with SectionValidator “has content” checks. */
export function getAllowedSectionIdsForTemplate(templateId: string, resumeData: any): Set<string> {
  const entry = getRegistryEntryByTemplateId(templateId);
  if (!entry) return new Set();

  const allowedSectionIds = new Set<string>();
  for (const rule of entry.sectionRules) {
    if (rule.when(resumeData)) allowedSectionIds.add(rule.sectionId);
  }

  // Include user-defined custom sections that have content
  const customSections = useCustomSectionsStore.getState().customSections;
  for (const cs of customSections) {
    if (cs.content && cs.content.trim()) {
      allowedSectionIds.add(cs.id);
    }
  }

  return allowedSectionIds;
}
