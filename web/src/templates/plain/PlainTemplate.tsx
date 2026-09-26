import { useContext } from 'react';

import {
  SortableRegion,
  SortableTemplateSection,
  useSectionLayoutRuntime,
} from '@/helpers/section-layout';
import { StateContext } from '@/modules/builder/resume/ResumeLayout';
import { pageStyle } from '@/templates/common/palette-ui';
import { useResumePalette } from '@/templates/common/resumePalette';
import { ProjectsSection, CertificationsSection, AchievementsSection, VolunteerSection, CustomSectionRenderer } from '@/templates/common/SharedSections';
import { useCustomSectionsStore } from '@/stores/customSections';

import { Education } from './components/Education';
import { Header } from './components/Header';
import { Skills } from './components/Skills';
import { Summary } from './components/Summary';
import { Work } from './components/Work';

export default function PlainTemplate() {
  const data = useContext(StateContext);
  const { regions } = useSectionLayoutRuntime();
  const resumePalette = useResumePalette();
  const customSections = useCustomSectionsStore((state) => state.customSections);
  const basics = data.basics;

  const renderSection = (sectionId: string) => {
    const customSec = customSections.find((cs) => cs.id === sectionId);
    if (customSec) {
      return <CustomSectionRenderer section={customSec} p={resumePalette} />;
    }

    switch (sectionId) {
      case 'summary':
        return <Summary summary={basics.summary || basics.objective} p={resumePalette} />;
      case 'skills':
        return (
          <Skills
            languages={data.skills.languages}
            frameworks={data.skills.frameworks}
            technologies={data.skills.technologies}
            tools={data.skills.tools}
            databases={data.skills.databases}
            p={resumePalette}
          />
        );
      case 'work':
        return <Work work={data.work} p={resumePalette} />;
      case 'education':
        return <Education education={data.education} p={resumePalette} />;
      case 'projects':
        return <ProjectsSection involvements={data.activities.involvements} p={resumePalette} />;
      case 'certifications':
        return <CertificationsSection achievements={data.activities.achievements} p={resumePalette} />;
      case 'awards':
        return <AchievementsSection achievementsHtml={data.activities.achievementsHtml} p={resumePalette} />;
      case 'volunteer_exp':
        return <VolunteerSection volunteer={data.volunteer} p={resumePalette} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ ...pageStyle(resumePalette), padding: '40px 48px' }}>
      <Header basics={basics} p={resumePalette} />
      <SortableRegion regionId="main" items={regions.main}>
        {(id) => (
          <SortableTemplateSection key={id} id={id}>
            {renderSection(id)}
          </SortableTemplateSection>
        )}
      </SortableRegion>
    </div>
  );
}
