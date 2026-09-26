import { useContext } from 'react';

import {
  SortableRegion,
  SortableTemplateSection,
  useSectionLayoutRuntime,
} from '@/helpers/section-layout';
import { StateContext } from '@/modules/builder/resume/ResumeLayout';
import { pageStyle } from '@/templates/common/palette-ui';
import { useResumePalette, withAlpha } from '@/templates/common/resumePalette';
import { ProjectsSection, CertificationsSection, AchievementsSection, VolunteerSection, CustomSectionRenderer } from '@/templates/common/SharedSections';
import { useCustomSectionsStore } from '@/stores/customSections';

import { AsideIntro } from './components/AsideIntro';
import { Education } from './components/Education';
import { MainIntro } from './components/MainIntro';
import { Projects } from './components/Projects';
import { Skills } from './components/Skills';
import { Summary } from './components/Summary';
import { Work } from './components/Work';

export default function SidebarRightTemplate() {
  const data = useContext(StateContext);
  const { regions } = useSectionLayoutRuntime();
  const resumePalette = useResumePalette();
  const customSections = useCustomSectionsStore((state) => state.customSections);
  const basics = data.basics;

  const renderMain = (sectionId: string) => {
    const customSec = customSections.find((cs) => cs.id === sectionId);
    if (customSec) {
      return <CustomSectionRenderer section={customSec} p={resumePalette} />;
    }

    switch (sectionId) {
      case 'summary':
        return <Summary summary={basics.summary || basics.objective} p={resumePalette} />;
      case 'work':
        return <Work work={data.work} p={resumePalette} />;
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

  const renderSidebar = (sectionId: string) => {
    const customSec = customSections.find((cs) => cs.id === sectionId);
    if (customSec) {
      return <CustomSectionRenderer section={customSec} p={resumePalette} />;
    }

    switch (sectionId) {
      case 'skills':
        return (
          <Skills items={data.skills.languages.concat(data.skills.frameworks)} p={resumePalette} />
        );
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
    <div style={{ ...pageStyle(resumePalette), display: 'grid', gridTemplateColumns: '1fr 32%' }}>
      <main style={{ padding: '34px 28px' }}>
        <MainIntro basics={basics} p={resumePalette} />
        <SortableRegion regionId="main" items={regions.main}>
          {(id) => (
            <SortableTemplateSection key={id} id={id}>
              {renderMain(id) ?? renderSidebar(id)}
            </SortableTemplateSection>
          )}
        </SortableRegion>
      </main>
      <aside
        style={{
          background: withAlpha(resumePalette.primary, 0.06),
          padding: '34px 22px',
          borderLeft: `4px solid ${resumePalette.accent}`,
        }}
      >
        <AsideIntro basics={basics} p={resumePalette} />
        <SortableRegion regionId="sidebar" items={regions.sidebar}>
          {(id) => (
            <SortableTemplateSection key={id} id={id}>
              {renderSidebar(id) ?? renderMain(id)}
            </SortableTemplateSection>
          )}
        </SortableRegion>
      </aside>
    </div>
  );
}