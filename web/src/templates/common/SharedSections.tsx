/**
 * Shared section components that all templates can use.
 * These render Projects, Certifications/Achievements, Awards, and Volunteer sections.
 * Templates import and use these in their renderSection switch/case.
 */

import type { ResumePalette } from '@/templates/common/resumePalette';
import type { IVolunteer } from '@/stores/index.interface';

/* ─── Section Heading (reusable) ─── */
export const SectionHeading = ({
  title,
  p,
  style,
}: {
  title: string;
  p: ResumePalette;
  style?: React.CSSProperties;
}) => (
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
    {title}
  </h2>
);

/* ─── Projects (from activities.involvements HTML) ─── */
export const ProjectsSection = ({
  involvements,
  p,
}: {
  involvements: string;
  p: ResumePalette;
}) => {
  if (!involvements) return null;
  return (
    <div>
      <SectionHeading title="Projects" p={p} />
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
}: {
  achievements: string;
  p: ResumePalette;
}) => {
  if (!achievements) return null;
  return (
    <div>
      <SectionHeading title="Certifications" p={p} />
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
}: {
  achievementsHtml: string;
  p: ResumePalette;
}) => {
  if (!achievementsHtml) return null;
  return (
    <div>
      <SectionHeading title="Achievements" p={p} />
      <div
        style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: achievementsHtml }}
      />
    </div>
  );
};

/* ─── Volunteer ─── */
export const VolunteerSection = ({
  volunteer,
  p,
}: {
  volunteer: IVolunteer[];
  p: ResumePalette;
}) => {
  if (!volunteer || volunteer.length === 0) return null;
  return (
    <div>
      <SectionHeading title="Volunteer Experience" p={p} />
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
