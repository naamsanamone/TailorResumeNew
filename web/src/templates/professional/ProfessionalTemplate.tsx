import React, { useContext } from 'react';

import AboutMe from './components/AboutMe';
import Achievements from './components/Achievements';
import BasicIntro from './components/BasicIntro';
import { Education } from './components/Education';
import Involvement from './components/Involvement';
import { Objective } from './components/Objective';
import RatedSkills from './components/RatedSkills';
import { Section } from './components/Section';
import { SectionValidator } from '@/helpers/common/components/ValidSectionRenderer';
import {
  SortableRegion,
  SortableTemplateSection,
  useSectionLayoutRuntime,
} from '@/helpers/section-layout';
import { StateContext } from '@/modules/builder/resume/ResumeLayout';
import UnratedSkills from './components/UnratedSkills';
import Work from './components/Work';
import styled from '@emotion/styled';
import { useCustomSectionsStore } from '@/stores/customSections';

const ResumeContainer = styled.div`
  display: flex;
  min-height: 100%;
  padding: 40px 25px;
  column-gap: 10px;

  @media print {
    border: none;
    height: auto;
  }
`;

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 66%;
  row-gap: 20px;
  min-height: 100%;

  @media print {
    height: auto;
  }
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 34%;
  row-gap: 20px;
  min-height: 100%;
  font-size: 12px;

  @media print {
    height: auto;
  }
`;

export default function ProfessionalTemplate() {
  const resumeData = useContext(StateContext);
  const { regions } = useSectionLayoutRuntime();
  const customSections = useCustomSectionsStore((state) => state.customSections);
  const skills = resumeData.skills;
  const involvements = resumeData.activities.involvements;
  const achievements = resumeData.activities.achievements;

  const renderLeft = (sectionId: string) => {
    const customSec = customSections.find((cs) => cs.id === sectionId);
    if (customSec && customSec.content && customSec.content.trim()) {
      return (
        <Section title={customSec.title}>
          <div
            style={{ fontSize: '11px', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: customSec.content }}
          />
        </Section>
      );
    }

    switch (sectionId) {
      case 'summary': {
        const summaryText = resumeData.basics.summary || resumeData.basics.objective;
        return (
          <SectionValidator value={summaryText}>
            <Section title="Profile">
              <AboutMe summary={summaryText} profileImage={resumeData.basics.image} />
            </Section>
          </SectionValidator>
        );
      }
      case 'work':
        return (
          <SectionValidator value={resumeData.work}>
            <Section title="Work Experience">
              <Work work={resumeData.work} />
            </Section>
          </SectionValidator>
        );
      case 'involvement':
        return (
          <SectionValidator value={involvements}>
            <Section title="Key Projects / Involvements">
              <Involvement data={involvements} />
            </Section>
          </SectionValidator>
        );
      case 'achievements':
        return (
          <SectionValidator value={achievements}>
            <Section title="Certificates and Awards">
              <Achievements data={achievements} />
            </Section>
          </SectionValidator>
        );
      case 'projects':
        return involvements ? (
          <Section title="Projects">
            <Involvement data={involvements} />
          </Section>
        ) : null;
      case 'certifications':
        return achievements ? (
          <Section title="Certifications">
            <Achievements data={achievements} />
          </Section>
        ) : null;
      case 'awards':
        return resumeData.activities?.achievementsHtml ? (
          <Section title="Achievements">
            <div
              style={{ fontSize: '11px', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: resumeData.activities.achievementsHtml }}
            />
          </Section>
        ) : null;
      case 'volunteer_exp':
        return resumeData.volunteer?.length ? (
          <SectionValidator value={resumeData.volunteer}>
            <Section title="Volunteer Experience">
              {resumeData.volunteer.map((v: any) => (
                <div key={v.id} style={{ marginBottom: 6 }}>
                  <strong style={{ fontSize: '12px' }}>{v.position}</strong>
                  <div style={{ fontSize: '11px', color: '#666' }}>{v.organization}</div>
                  {v.summary && <p style={{ fontSize: '11px', margin: '2px 0 0' }}>{v.summary}</p>}
                </div>
              ))}
            </Section>
          </SectionValidator>
        ) : null;
      default:
        return null;
    }
  };

  const renderRight = (sectionId: string) => {
    const customSec = customSections.find((cs) => cs.id === sectionId);
    if (customSec && customSec.content && customSec.content.trim()) {
      return (
        <Section title={customSec.title}>
          <div
            style={{ fontSize: '11px', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: customSec.content }}
          />
        </Section>
      );
    }

    switch (sectionId) {
      case 'summary': {
        const summaryText = resumeData.basics.summary || resumeData.basics.objective;
        return (
          <SectionValidator value={summaryText}>
            <Section title="Profile">
              <AboutMe summary={summaryText} profileImage={resumeData.basics.image} />
            </Section>
          </SectionValidator>
        );
      }
      case 'objective':
        return (
          <SectionValidator value={resumeData.basics.objective}>
            <Section title="Career Objective">
              <Objective objective={resumeData.basics.objective} />
            </Section>
          </SectionValidator>
        );
      case 'tech_expertise':
        return (
          <SectionValidator value={skills.languages.concat(skills.frameworks)}>
            <Section title="Technical expertise">
              <RatedSkills items={skills.languages.concat(skills.frameworks)} />
            </Section>
          </SectionValidator>
        );
      case 'skills_exposure':
        return (
          <SectionValidator value={skills.technologies.concat(skills.libraries, skills.databases)}>
            <Section title="Skills / Exposure">
              <UnratedSkills
                items={skills.technologies.concat(skills.libraries, skills.databases)}
              />
            </Section>
          </SectionValidator>
        );
      case 'methodology':
        return (
          <SectionValidator value={skills.practices}>
            <Section title="Methodology/Approach">
              <UnratedSkills items={skills.practices} />
            </Section>
          </SectionValidator>
        );
      case 'tools':
        return (
          <SectionValidator value={skills.tools}>
            <Section title="Tools">
              <UnratedSkills items={skills.tools} />
            </Section>
          </SectionValidator>
        );
      case 'education':
        return (
          <SectionValidator value={resumeData.education}>
            <Section title="Education">
              <Education education={resumeData.education} />
            </Section>
          </SectionValidator>
        );
      case 'certifications':
        return achievements ? (
          <Section title="Certifications">
            <Achievements data={achievements} />
          </Section>
        ) : null;
      case 'awards':
        return resumeData.activities?.achievementsHtml ? (
          <Section title="Achievements">
            <div
              style={{ fontSize: '11px', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: resumeData.activities.achievementsHtml }}
            />
          </Section>
        ) : null;
      case 'volunteer_exp':
        return resumeData.volunteer?.length ? (
          <Section title="Volunteer Experience">
            {resumeData.volunteer.map((v: any) => (
              <div key={v.id} style={{ marginBottom: 6 }}>
                <strong style={{ fontSize: '12px' }}>{v.position}</strong>
                <div style={{ fontSize: '11px', color: '#666' }}>{v.organization}</div>
                {v.summary && <p style={{ fontSize: '11px', margin: '2px 0 0' }}>{v.summary}</p>}
              </div>
            ))}
          </Section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <ResumeContainer>
      <LeftSection>
        <Section
          title={resumeData.basics?.name}
          profiles={resumeData.basics.profiles}
          portfolioUrl={resumeData.basics.url}
          titleClassname="text-xl font-medium"
        >
          <BasicIntro basics={resumeData.basics} />
        </Section>
        <SortableRegion regionId="left" items={regions.left} className="flex flex-col gap-5">
          {(id) => (
            <SortableTemplateSection key={id} id={id}>
              {renderLeft(id) ?? renderRight(id)}
            </SortableTemplateSection>
          )}
        </SortableRegion>
      </LeftSection>

      <RightSection>
        <SortableRegion regionId="right" items={regions.right} className="flex flex-col gap-5">
          {(id) => (
            <SortableTemplateSection key={id} id={id}>
              {renderRight(id) ?? renderLeft(id)}
            </SortableTemplateSection>
          )}
        </SortableRegion>
      </RightSection>
    </ResumeContainer>
  );
}
