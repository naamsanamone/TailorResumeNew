/**
 * Apply parsed resume sections (from backend /api/parse/resume) into Zustand stores.
 * This maps the backend ResumeSection[] format into the frontend store format.
 */

import { useBasicDetails } from '@/stores/basic';
import { useExperiences } from '@/stores/experience';
import { useEducations } from '@/stores/education';
import {
  useDatabases,
  useFrameworks,
  useLanguages,
  useLibraries,
  usePractices,
  useTechnologies,
  useTools,
} from '@/stores/skills';
import { useAwards } from '@/stores/awards';
import { useVoluteeringStore } from '@/stores/volunteering';
import { useActivity } from '@/stores/activity';
import type { ResumeSection } from '@/services/api';
import type { IItem } from '@/stores/index.interface';

function parseSkillString(val: string | string[] | undefined): IItem[] {
  if (!val) return [];
  const arr = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val;
  return arr.map((name) => ({ name: String(name), level: 0 }));
}

/**
 * Map a "categories" dict from the backend into the 5 skill stores.
 * Handles both "Languages: Java, Python" format and flat items.
 */
function mapSkillCategories(categories?: Record<string, string>, items?: string[]) {
  const result = {
    languages: [] as IItem[],
    frameworks: [] as IItem[],
    technologies: [] as IItem[],
    tools: [] as IItem[],
    databases: [] as IItem[],
  };

  if (categories) {
    for (const [cat, skills] of Object.entries(categories)) {
      const catLower = cat.toLowerCase();
      const parsed = parseSkillString(skills);

      if (catLower.includes('language') || catLower.includes('programming')) {
        result.languages.push(...parsed);
      } else if (catLower.includes('framework') || catLower.includes('librar')) {
        result.frameworks.push(...parsed);
      } else if (catLower.includes('database') || catLower.includes('db') || catLower.includes('data store')) {
        result.databases.push(...parsed);
      } else if (catLower.includes('tool') || catLower.includes('devops') || catLower.includes('cloud') || catLower.includes('platform')) {
        result.tools.push(...parsed);
      } else {
        // Default to technologies for anything else
        result.technologies.push(...parsed);
      }
    }
  }

  // If we have flat items but no categories, put them all in technologies
  if (items && items.length > 0 && Object.keys(categories || {}).length === 0) {
    result.technologies = items.map((name) => ({ name, level: 0 }));
  }

  return result;
}

export function applyParsedSections(sections: ResumeSection[]): void {
  let foundProjects = '';
  let foundCertifications = '';
  let foundAchievementsHtml = '';

  for (const sec of sections) {
    const type = (sec.type || '').toLowerCase();

    if (type === 'header') {
      const profiles = [];

      // Helper to ensure URL has protocol
      const ensureUrl = (url: string) => {
        if (!url) return '';
        if (!url.startsWith('http')) return 'https://' + url;
        return url;
      };

      // Extract LinkedIn URL
      let linkedinUrl = sec.linkedin || '';
      if (!linkedinUrl) {
        // Scan all string values in section for linkedin URL
        for (const val of Object.values(sec)) {
          if (typeof val === 'string' && /linkedin\.com\/in\//i.test(val)) {
            const match = val.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i);
            if (match) linkedinUrl = match[0];
          }
        }
      }
      if (linkedinUrl) {
        profiles.push({ network: 'linkedin', username: '', url: ensureUrl(linkedinUrl) });
      }

      // Extract GitHub URL
      let githubUrl = sec.github || '';
      if (!githubUrl) {
        for (const val of Object.values(sec)) {
          if (typeof val === 'string' && /github\.com\//i.test(val)) {
            const match = val.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i);
            if (match) githubUrl = match[0];
          }
        }
      }
      if (githubUrl) {
        profiles.push({ network: 'github', username: '', url: ensureUrl(githubUrl) });
      }

      // Extract portfolio/other URL
      let portfolioUrl = sec.portfolio || sec.url || '';
      if (portfolioUrl) {
        portfolioUrl = ensureUrl(portfolioUrl);
      }

      useBasicDetails.getState().reset({
        name: sec.fullName || '',
        label: sec.headline || '',
        image: '',
        email: sec.email || '',
        phone: sec.phone || '',
        url: portfolioUrl,
        summary: useBasicDetails.getState().values.summary || '',
        objective: '',
        location: {
          address: '',
          postalCode: '',
          city: sec.location || '',
          countryCode: '',
          region: '',
        },
        relExp: '',
        totalExp: '',
        profiles,
      } as never);
    }

    if (type === 'summary' && sec.text) {
      // Update summary on the basic details store
      const current = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({
        ...current,
        summary: sec.text,
      } as never);
    }

    if (type === 'experience' && sec.entries) {
      const work = sec.entries.map((entry: any, i: number) => ({
        id: `uploaded-exp-${i}`,
        name: entry.company || '',
        position: entry.title || '',
        url: '',
        startDate: null,
        endDate: null,
        summary: (entry.bullets || []).length > 0
          ? `<ul>${(entry.bullets as string[]).map((b: string) => `<li>${b}</li>`).join('')}</ul>`
          : '',
        years: entry.duration || '',
        highlights: entry.bullets || [],
        isWorkingHere: false,
        website: '',
      }));
      useExperiences.getState().reset(work as never);
    }

    if (type === 'education' && sec.entries) {
      const edu = sec.entries.map((entry: any, i: number) => {
        // Parse degree into studyType + area
        const degreeStr = entry.degree || '';
        let studyType = degreeStr;
        let area = '';
        const inMatch = degreeStr.match(/^(.+?)\s+in\s+(.+)$/i);
        if (inMatch) {
          studyType = inMatch[1].trim();
          area = inMatch[2].trim();
        }

        return {
          id: `uploaded-edu-${i}`,
          institution: entry.institution || '',
          url: '',
          studyType,
          area,
          startDate: null,
          endDate: null,
          isStudyingHere: false,
          score: entry.year?.replace(/^GPA:\s*/i, '') || '',
          courses: [],
          website: '',
        };
      });
      useEducations.getState().reset(edu as never);
    }

    if (type === 'skills') {
      const mapped = mapSkillCategories(sec.categories, sec.items);
      if (mapped.languages.length) useLanguages.getState().reset(mapped.languages as never);
      if (mapped.frameworks.length) useFrameworks.getState().reset(mapped.frameworks as never);
      if (mapped.technologies.length) useTechnologies.getState().reset(mapped.technologies as never);
      if (mapped.tools.length) useTools.getState().reset(mapped.tools as never);
      if (mapped.databases.length) useDatabases.getState().reset(mapped.databases as never);
    }

    // Projects → activities.involvements (HTML)
    if (type === 'projects') {
      if (sec.entries && sec.entries.length > 0) {
        const bullets = sec.entries.flatMap((entry: any) => {
          const entryBullets = entry.bullets || [];
          const header = entry.name || entry.title || '';
          if (header && entryBullets.length > 0) {
            return [`<strong>${header}</strong>: ${entryBullets.join('; ')}`];
          }
          return entryBullets.length > 0 ? entryBullets : header ? [header] : [];
        });
        if (bullets.length > 0) {
          foundProjects = `<ul>${bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>`;
        }
      } else if (sec.items && sec.items.length > 0) {
        foundProjects = `<ul>${sec.items.map((b: string) => `<li>${b}</li>`).join('')}</ul>`;
      } else if (sec.text) {
        const lines = sec.text.split('\n').filter((l: string) => l.trim().length > 0);
        foundProjects = `<ul>${lines.map((l: string) => `<li>${l.replace(/^[•\-–·*▪►○\d+\.]\s*/, '').trim()}</li>`).join('')}</ul>`;
      }
    }


    // Certifications / List sections → activities.achievements (HTML)
    const isCertSec = (sec.name || '').toLowerCase().match(/certif|license|course/i);
    if (isCertSec) {
      if (sec.items && sec.items.length > 0) {
        foundCertifications = `<ul>${sec.items.map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
      } else if (sec.text) {
        const lines = sec.text.split('\n').filter((l: string) => l.trim().length > 0);
        foundCertifications = `<ul>${lines.map((l: string) => `<li>${l.replace(/^[•\-–·*▪►○\d+\.]\s*/, '').trim()}</li>`).join('')}</ul>`;
      }
    }

    // Awards/Achievements/Honors → achievementsHtml (HTML)
    const isAchievementSec = (sec.name || '').toLowerCase().match(/award|honor|achievement/i);
    if (isAchievementSec) {
      if (sec.items && sec.items.length > 0) {
        foundAchievementsHtml = `<ul>${sec.items.map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
      } else if (sec.text) {
        const lines = sec.text.split('\n').filter((l: string) => l.trim().length > 0);
        foundAchievementsHtml = `<ul>${lines.map((l: string) => `<li>${l.replace(/^[•\-–·*▪►○\d+\.]\s*/, '').trim()}</li>`).join('')}</ul>`;
      }
    }
  }

  // Apply activities (projects, certifications & achievements)
  useActivity.getState().reset({
    involvements: foundProjects,
    achievements: foundCertifications,
    achievementsHtml: foundAchievementsHtml,
  } as never);

  // Clear stores that weren't found in parsed data
  useAwards.getState().reset([] as never);
  useVoluteeringStore.getState().reset([] as never);
  useLibraries.getState().reset([] as never);
  usePractices.getState().reset([] as never);
}

