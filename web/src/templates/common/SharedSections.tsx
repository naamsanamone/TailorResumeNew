/**
 * Shared section components that all templates can use.
 * These render Projects, Certifications/Achievements, Awards, Volunteer, and Custom sections.
 * Templates import and use these in their renderSection switch/case.
 */

import type { ResumePalette } from '@/templates/common/resumePalette';
import type { IVolunteer } from '@/stores/index.interface';
import { useCustomSectionsStore } from '@/stores/customSections';

/* ─── Section Heading (reusable) ─── */
export const SectionHeading = ({
  title,
  p,
  style,
  sectionId,
}: {
  title: string;
  p: ResumePalette;
  style?: React.CSSProperties;
  sectionId?: string;
}) => {
  const customTitle = useCustomSectionsStore((s) =>
    sectionId ? s.sectionTitles[sectionId] : undefined
  );
  const displayTitle = customTitle && customTitle.trim() ? customTitle : title;

  return (
    <h2
      style={{
        fontSize: '13px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        color: p.primary,
        margin: '12px 0 6px',
        paddingBottom: '3px',
        borderBottom: `1.5px solid ${p.primary}`,
        fontFamily: p.headingFont,
        letterSpacing: '0.5px',
        ...style,
      }}
    >
      {displayTitle}
    </h2>
  );
};

/* ─── Projects (from activities.involvements HTML) ─── */
export const ProjectsSection = ({
  involvements,
  p,
  title,
}: {
  involvements: string;
  p: ResumePalette;
  title?: string;
}) => {
  if (!involvements) return null;
  return (
    <div>
      <SectionHeading title={title || 'Projects'} sectionId="projects" p={p} />
      <div
        style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: involvements }}
      />
    </div>
  );
};

/* ─── Certifications (from activities.achievements HTML) ─── */
export const CertificationsSection = ({
  achievements,
  p,
  title,
}: {
  achievements: string;
  p: ResumePalette;
  title?: string;
}) => {
  if (!achievements) return null;
  return (
    <div>
      <SectionHeading title={title || 'Certifications'} sectionId="certifications" p={p} />
      <div
        style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: achievements }}
      />
    </div>
  );
};

/* ─── Achievements (from activities.achievementsHtml HTML) ─── */
export const AchievementsSection = ({
  achievementsHtml,
  p,
  title,
}: {
  achievementsHtml: string;
  p: ResumePalette;
  title?: string;
}) => {
  if (!achievementsHtml) return null;
  return (
    <div>
      <SectionHeading title={title || 'Achievements'} sectionId="achievements" p={p} />
      <div
        style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: achievementsHtml }}
      />
    </div>
  );
};

/* Backwards compatibility alias */
export const AwardsSection = AchievementsSection;

/* ─── Volunteer ─── */
export const VolunteerSection = ({
  volunteer,
  p,
  title,
}: {
  volunteer: IVolunteer[];
  p: ResumePalette;
  title?: string;
}) => {
  if (!volunteer || volunteer.length === 0) return null;
  return (
    <div>
      <SectionHeading title={title || 'Volunteer Experience'} sectionId="volunteering" p={p} />
      {volunteer.map((v) => (
        <div key={v.id} style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '11px', color: p.text }}>{v.position}</strong>
            <span style={{ fontSize: '10px', color: p.muted }}>
              {v.startDate ? new Date(v.startDate).getFullYear() : ''}
              {v.endDate ? ` – ${new Date(v.endDate).getFullYear()}` : v.isVolunteeringNow ? ' – Present' : ''}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: p.primary }}>{v.organization}</div>
          {v.summary && (
            <p style={{ fontSize: '10px', color: p.text, margin: '2px 0 0' }}>{v.summary}</p>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── Custom User-Added Sections ─── */
export const CustomSectionRenderer = ({
  section,
  p,
}: {
  section: { id: string; title: string; content: string };
  p: ResumePalette;
}) => {
  if (!section.content || !section.content.trim()) return null;
  return (
    <div style={{ marginBottom: '10px' }}>
      <SectionHeading title={section.title} sectionId={section.id} p={p} />
      <div
        style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: section.content }}
      />
    </div>
  );
};
