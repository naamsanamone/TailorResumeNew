import { SectionValidator } from '@/helpers/common/components/ValidSectionRenderer';
import { formatDateRange, SectionHeading } from '@/templates/common/palette-ui';
import type { ResumePalette } from '@/templates/common/resumePalette';

export function Education({ education, p }: { education: any[]; p: ResumePalette }) {
  return (
    <SectionValidator value={education}>
      <section>
        <SectionHeading title="Education" p={p} variant="underline" />
        {education.map((e: any) => (
          <div key={e.id} style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>
              {e.studyType} — {e.area}
            </div>
            <div style={{ color: p.muted, fontSize: 10.5 }}>
              {e.institution}
              {formatDateRange(e.startDate, e.endDate, e.isStudyingHere)
                ? ` · ${formatDateRange(e.startDate, e.endDate, e.isStudyingHere)}`
                : ''}
            </div>
          </div>
        ))}
      </section>
    </SectionValidator>
  );
}
