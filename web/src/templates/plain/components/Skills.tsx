import { SectionValidator } from '@/helpers/common/components/ValidSectionRenderer';
import { ChipList, SectionHeading } from '@/templates/common/palette-ui';
import type { ResumePalette } from '@/templates/common/resumePalette';
import type { ISkillItem } from '@/stores/skill.interface';

export function Skills({
  languages = [],
  frameworks = [],
  technologies = [],
  tools = [],
  databases = [],
  p,
}: {
  languages?: ISkillItem[];
  frameworks?: ISkillItem[];
  technologies?: ISkillItem[];
  tools?: ISkillItem[];
  databases?: ISkillItem[];
  p: ResumePalette;
}) {
  const merged = (languages || []).concat(frameworks || [], technologies || [], tools || [], databases || []);
  return (
    <SectionValidator value={merged}>
      <section style={{ marginBottom: 14 }}>
        <SectionHeading title="Skills" p={p} variant="underline" />
        <ChipList items={merged} p={p} variant="outline" />
      </section>
    </SectionValidator>
  );
}
