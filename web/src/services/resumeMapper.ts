/**
 * Data mapper: converts between frontend Zustand stores ↔ backend ResumeSection[] format
 */

import type { IBasics, IWorkIntrf, IEducation, IAwards, IItem, IVolunteer } from '@/stores/index.interface';

/* ────────────── Backend Section Types ────────────── */

interface ResumeSection {
  name: string;
  type: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  headline?: string;
  text?: string;
  categories?: Record<string, string>;
  items?: string[];
  entries?: any[];
}

export function extractBulletsFromHtml(html: string): string[] {
  if (!html) return [];
  const matches = html.match(/<li[^>]*>(.*?)<\/li>/gi);
  if (matches && matches.length > 0) {
    return matches
      .map((li) => li.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
  }
  const text = html.replace(/<[^>]+>/g, '\n').trim();
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

export function bulletsToHtml(bullets: string[]): string {
  if (!bullets || bullets.length === 0) return '';
  const clean = bullets.map((b) => {
    let s = (b || '').replace(/\*\*(.*?)\*\*/g, '$1');
    s = s.replace(/\*/g, '').trim();
    return `<li>${s}</li>`;
  });
  return `<ul>${clean.join('')}</ul>`;
}

/* ────────────── Frontend → Backend ────────────── */

export function zustandToSections(
  basics: IBasics,
  work: IWorkIntrf[],
  education: IEducation[],
  skills: { languages: IItem[]; frameworks: IItem[]; technologies: IItem[]; tools: IItem[]; databases: IItem[] },
  awards: IAwards[],
  volunteer: IVolunteer[],
  activities?: { involvements: string; achievements: string }
): ResumeSection[] {
  const sections: ResumeSection[] = [];

  // Header
  const linkedinProfile = basics.profiles?.find(
    (p) => p.network.toLowerCase() === 'linkedin'
  );
  const githubProfile = basics.profiles?.find(
    (p) => p.network.toLowerCase() === 'github'
  );

  sections.push({
    name: 'Header',
    type: 'header',
    fullName: basics.name,
    email: basics.email,
    phone: basics.phone,
    location: basics.location?.city || '',
    linkedin: linkedinProfile?.url || '',
    github: githubProfile?.url || '',
    portfolio: basics.url || '',
    headline: basics.label || '',
  });

  // Summary (supports basics.summary or basics.objective)
  const summaryText = basics.summary || basics.objective || '';
  if (summaryText) {
    sections.push({
      name: 'Summary',
      type: 'summary',
      text: summaryText,
    });
  }

  // Experience
  if (work.length > 0) {
    sections.push({
      name: 'Experience',
      type: 'experience',
      entries: work.map((w) => {
        const fromHtml = extractBulletsFromHtml(w.summary || '');
        const bullets = fromHtml.length > 0 ? fromHtml : (w.highlights || []).filter(Boolean);
        const dateRange = w.years || [w.startDate, w.endDate || (w.isWorkingHere ? 'Present' : '')].filter(Boolean).join(' – ');
        return {
          title: w.position,
          company: w.name,
          location: '',
          duration: dateRange,
          bullets,
        };
      }),
    });
  }

  // Education
  if (education.length > 0) {
    sections.push({
      name: 'Education',
      type: 'education',
      entries: education.map((e) => {
        const dateRange = [e.startDate, e.endDate || (e.isStudyingHere ? 'Present' : '')].filter(Boolean).join(' – ');
        const yearParts = [dateRange, e.score ? `GPA: ${e.score}` : ''].filter(Boolean);
        return {
          institution: e.institution,
          degree: `${e.studyType}${e.area ? ' in ' + e.area : ''}`,
          location: '',
          year: yearParts.join(' | '),
        };
      }),
    });
  }


  // Skills
  const skillCategories: Record<string, string> = {};
  if (skills.languages.length) skillCategories['Languages'] = skills.languages.map((s) => s.name).join(', ');
  if (skills.frameworks.length) skillCategories['Frameworks'] = skills.frameworks.map((s) => s.name).join(', ');
  if (skills.technologies.length) skillCategories['Technologies'] = skills.technologies.map((s) => s.name).join(', ');
  if (skills.tools.length) skillCategories['Tools'] = skills.tools.map((s) => s.name).join(', ');
  if (skills.databases.length) skillCategories['Databases'] = skills.databases.map((s) => s.name).join(', ');

  if (Object.keys(skillCategories).length > 0) {
    sections.push({
      name: 'Skills',
      type: 'skills',
      categories: skillCategories,
    });
  }

  // Projects (from activities.involvements)
  if (activities?.involvements) {
    const projectBullets = extractBulletsFromHtml(activities.involvements);
    if (projectBullets.length > 0) {
      sections.push({
        name: 'Projects',
        type: 'projects',
        items: projectBullets,
      });
    }
  }

  // Certifications (from activities.achievements)
  if (activities?.achievements) {
    const certBullets = extractBulletsFromHtml(activities.achievements);
    if (certBullets.length > 0) {
      sections.push({
        name: 'Certifications',
        type: 'list',
        items: certBullets,
      });
    }
  }

  // Custom User Sections
  try {
    const { useCustomSectionsStore } = require('@/stores/customSections');
    const customSections = useCustomSectionsStore.getState().customSections;
    for (const cs of customSections) {
      if (cs.content && cs.content.trim()) {
        const bullets = extractBulletsFromHtml(cs.content);
        sections.push({
          name: cs.title,
          type: 'list',
          items: bullets.length > 0 ? bullets : [cs.content.replace(/<[^>]+>/g, '').trim()],
        });
      }
    }
  } catch (e) {
    // ignore in environments where store might not be available
  }

  return sections;
}

/* ────────────── Backend → Frontend (apply tailored data) ────────────── */

export interface TailoredUpdates {
  summary?: string;
  label?: string;
  experiences?: { index: number; highlights: string[] }[];
  skills?: {
    languages?: IItem[];
    frameworks?: IItem[];
    technologies?: IItem[];
    tools?: IItem[];
    databases?: IItem[];
  };
}

/**
 * Parse tailored sections from backend into partial updates for Zustand stores.
 * Does NOT apply them — returns the updates so UI can show diff first.
 */
export function sectionsToUpdates(tailoredSections: ResumeSection[]): TailoredUpdates {
  const updates: TailoredUpdates = {};

  for (const sec of tailoredSections) {
    const type = (sec.type || '').toLowerCase();

    // Header → label update
    if (type === 'header' && sec.headline) {
      updates.label = sec.headline;
    }

    // Summary → summary text
    if (type === 'summary' && sec.text) {
      updates.summary = sec.text;
    }

    // Experience → bullet updates
    if (type === 'experience' && sec.entries) {
      updates.experiences = sec.entries.map((entry: any, i: number) => ({
        index: i,
        highlights: (entry.bullets || []).filter(Boolean),
      }));
    }

    // Skills → skill store updates
    if (type === 'skills' && sec.categories) {
      const cats = sec.categories;
      updates.skills = {};

      if (cats['Languages']) {
        updates.skills.languages = parseSkillString(cats['Languages']);
      }
      if (cats['Frameworks']) {
        updates.skills.frameworks = parseSkillString(cats['Frameworks']);
      }
      if (cats['Technologies']) {
        updates.skills.technologies = parseSkillString(cats['Technologies']);
      }
      if (cats['Tools']) {
        updates.skills.tools = parseSkillString(cats['Tools']);
      }
      if (cats['Databases']) {
        updates.skills.databases = parseSkillString(cats['Databases']);
      }
    }
  }

  return updates;
}

function parseSkillString(val: string | string[]): IItem[] {
  const arr = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val;
  return arr.map((name) => ({ name: String(name), level: 0 }));
}
