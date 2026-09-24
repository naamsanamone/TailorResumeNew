import AchievementsLayout from '@/modules/builder/editor/modules/achievements/AchievementsLayout';
import BasicLayout from '@/modules/builder/editor/modules/basic/BasicLayout';
import CertificationsLayout from '@/modules/builder/editor/modules/certifications/CertificationsLayout';
import EducationLayout from '@/modules/builder/editor/modules/education/EducationLayout';
import ExperienceLayout from '@/modules/builder/editor/modules/experience/ExperienceLayout';
import ProjectsLayout from '@/modules/builder/editor/modules/projects/ProjectsLayout';
import { ReactNode } from 'react';
import SkillsLayout from '@/modules/builder/editor/modules/skills/SkillsLayout';
import TailorLayout from '@/modules/builder/editor/modules/tailor/TailorLayout';
import VolunteeringLayout from '@/modules/builder/editor/modules/volunteering/VolunteeringLayout';

export const headers: {
  [key: string]: { title: string; component: () => ReactNode };
} = {
  tailor: { title: 'Tailor Resume', component: TailorLayout },
  'basic-details': { title: 'Basic details', component: BasicLayout },
  'skills-and-expertise': {
    title: 'Skills and expertise',
    component: SkillsLayout,
  },
  education: { title: 'Education', component: EducationLayout },
  experience: { title: 'Experience', component: ExperienceLayout },
  projects: { title: 'Projects', component: ProjectsLayout },
  certifications: { title: 'Certifications', component: CertificationsLayout },
  achievements: { title: 'Achievements', component: AchievementsLayout },
  volunteering: { title: 'Volunteering', component: VolunteeringLayout },
};
