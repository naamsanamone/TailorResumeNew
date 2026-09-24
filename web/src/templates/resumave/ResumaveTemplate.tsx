import { useContext } from 'react';
import {
  SortableRegion,
  SortableTemplateSection,
  useSectionLayoutRuntime,
} from '@/helpers/section-layout';
import { StateContext } from '@/modules/builder/resume/ResumeLayout';
import { pageStyle } from '@/templates/common/palette-ui';
import { useResumePalette } from '@/templates/common/resumePalette';
import type { ResumePalette } from '@/templates/common/resumePalette';
import type { IWorkIntrf, IEducation, IAwards, IItem } from '@/stores/index.interface';
import { ProjectsSection, CertificationsSection, AchievementsSection, VolunteerSection } from '@/templates/common/SharedSections';

const Header = ({ basics, p }: { basics: any; p: ResumePalette }) => {
  const linkedin = basics.profiles?.find((pr: any) => pr.network.toLowerCase() === 'linkedin');
  const github = basics.profiles?.find((pr: any) => pr.network.toLowerCase() === 'github');
  return (
  <div style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: `2px solid ${p.primary}` }}>
    <h1 style={{ fontSize: '22px', fontWeight: 700, color: p.text, margin: 0, fontFamily: p.headingFont }}>{basics.name}</h1>
    {basics.label && <div style={{ fontSize: '12px', color: p.primary, fontWeight: 500, marginTop: '2px' }}>{basics.label}</div>}
    <div style={{ fontSize: '10px', color: p.muted, marginTop: '5px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {basics.phone && <span>{basics.phone}</span>}
      {basics.email && <><span>|</span><span>{basics.email}</span></>}
      {basics.location?.city && <><span>|</span><span>{basics.location.city}</span></>}
      {basics.url && <><span>|</span><span>{basics.url}</span></>}
      {linkedin && <><span>|</span><a href={linkedin.url} style={{ color: p.primary, textDecoration: 'none' }}>LinkedIn</a></>}
      {github && <><span>|</span><a href={github.url} style={{ color: p.primary, textDecoration: 'none' }}>GitHub</a></>}
    </div>
  </div>
  );
};

const Heading = ({ title, p }: { title: string; p: ResumePalette }) => (
  <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: p.text, margin: '14px 0 6px', paddingBottom: '3px', borderBottom: `2px solid ${p.primary}`, fontFamily: p.headingFont }}>{title}</h2>
);

const Summary = ({ summary, p }: { summary: string; p: ResumePalette }) =>
  summary ? (<div><Heading title="Professional Summary" p={p} /><p style={{ fontSize: '11px', color: p.text, lineHeight: 1.5, margin: 0 }}>{summary}</p></div>) : null;

const Work = ({ work, p }: { work: IWorkIntrf[]; p: ResumePalette }) =>
  work.length ? (
    <div>
      <Heading title="Experience" p={p} />
      {work.map((w) => (
        <div key={w.id} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '12px', color: p.text }}>{w.position}</strong>
            <span style={{ fontSize: '10px', color: p.muted }}>{w.years}</span>
          </div>
          <div style={{ fontSize: '11px', color: p.primary }}>{w.name}</div>
          {w.highlights.length > 0 && (
            <ul style={{ paddingLeft: '14px', margin: '3px 0 0' }}>
              {w.highlights.map((h, i) => <li key={i} style={{ fontSize: '11px', color: p.text, lineHeight: 1.5 }}>{h}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  ) : null;

const Education = ({ education, p }: { education: IEducation[]; p: ResumePalette }) =>
  education.length ? (
    <div>
      <Heading title="Education" p={p} />
      {education.map((e) => (
        <div key={e.id} style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '12px', color: p.text }}>{e.institution}</strong>
            <span style={{ fontSize: '10px', color: p.muted }}>{e.startDate ? `${new Date(e.startDate.toString()).getFullYear()}` : ''}{e.endDate ? ` – ${new Date(e.endDate.toString()).getFullYear()}` : ''}</span>
          </div>
          <div style={{ fontSize: '11px', color: p.muted, fontStyle: 'italic' }}>{e.studyType}{e.area ? ` in ${e.area}` : ''}</div>
        </div>
      ))}
    </div>
  ) : null;

const Skills = ({
  languages = [],
  frameworks = [],
  technologies = [],
  tools = [],
  databases = [],
  p,
}: {
  languages?: IItem[];
  frameworks?: IItem[];
  technologies?: IItem[];
  tools?: IItem[];
  databases?: IItem[];
  p: ResumePalette;
}) => {
  const cats = [
    { label: 'Languages', items: languages || [] },
    { label: 'Frameworks', items: frameworks || [] },
    { label: 'Technologies', items: technologies || [] },
    { label: 'Tools', items: tools || [] },
    { label: 'Databases', items: databases || [] },
  ].filter(c => c.items.length > 0);
  return cats.length ? (
    <div>
      <Heading title="Technical Skills" p={p} />
      {cats.map((c, i) => (
        <div key={i} style={{ fontSize: '11px', color: p.text, marginBottom: '2px' }}>
          <strong>{c.label}: </strong>{c.items.map(s => s.name).join(', ')}
        </div>
      ))}
    </div>
  ) : null;
};

const Awards = ({ awards, p }: { awards: IAwards[]; p: ResumePalette }) =>
  awards.length ? (
    <div>
      <Heading title="Awards & Achievements" p={p} />
      {awards.map((a) => (
        <div key={a.id} style={{ marginBottom: '4px' }}>
          <strong style={{ fontSize: '11px', color: p.text }}>{a.title}</strong>
          {a.awarder && <span style={{ fontSize: '10px', color: p.muted }}> — {a.awarder}</span>}
        </div>
      ))}
    </div>
  ) : null;

export default function ResumaveTemplate() {
  const data = useContext(StateContext);
  const { regions } = useSectionLayoutRuntime();
  const p = useResumePalette();

  const renderSection = (id: string) => {
    switch (id) {
      case 'summary': return <Summary summary={data.basics.summary} p={p} />;
      case 'work': return <Work work={data.work} p={p} />;
      case 'education': return <Education education={data.education} p={p} />;
      case 'skills': return <Skills languages={data.skills.languages} frameworks={data.skills.frameworks} technologies={data.skills.technologies} tools={data.skills.tools} databases={data.skills.databases} p={p} />;
      case 'awards': return <AchievementsSection achievementsHtml={data.activities.achievementsHtml} p={p} />;
      case 'projects': return <ProjectsSection involvements={data.activities.involvements} p={p} />;
      case 'certifications': return <CertificationsSection achievements={data.activities.achievements} p={p} />;
      case 'volunteer_exp': return <VolunteerSection volunteer={data.volunteer} p={p} />;
      default: return null;
    }
  };

  return (
    <div style={{ ...pageStyle(p), padding: '36px 44px' }}>
      <Header basics={data.basics} p={p} />
      <SortableRegion regionId="main" items={regions.main}>
        {(id) => (<SortableTemplateSection key={id} id={id}>{renderSection(id)}</SortableTemplateSection>)}
      </SortableRegion>
    </div>
  );
}
