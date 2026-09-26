/**
 * Apply parsed resume sections (from backend /api/parse/resume or background service worker)
 * into Zustand stores. This maps the parsed ResumeSection[] format into the frontend store format.
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
import { useCustomSectionsStore } from '@/stores/customSections';
import type { ResumeSection } from '@/services/api';
import type { IItem } from '@/stores/index.interface';

export interface ParsedDateRange {
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

/**
 * Robust date range parser for resume experience & education durations.
 * Handles "Apr 2021 -- Present", "08/2019 - 12/2022", "2018 - 2022", "May 2023", "2024", etc.
 */
export function parseDateRange(durationStr?: string): ParsedDateRange {
  if (!durationStr || typeof durationStr !== 'string') {
    return { startDate: null, endDate: null, isCurrent: false };
  }

  const clean = durationStr
    .trim()
    .replace(/^dates?:\s*/i, '')
    .replace(/^duration:\s*/i, '')
    .replace(/^(class of|expected|graduating)\s+/i, '');

  if (!clean) return { startDate: null, endDate: null, isCurrent: false };

  const isCurrent = /\b(present|current|now|ongoing|till date|to date)\b/i.test(clean);

  // Split by range separators: " -- ", " – ", " — ", " - ", " to "
  const parts = clean
    .split(/\s+(?:--|–|—|-|\bto\b)\s+|\s*--\s*|\s*–\s*|\s*—\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const start = parts[0];
    const end = isCurrent ? null : parts[1];
    return {
      startDate: start,
      endDate: end,
      isCurrent,
    };
  }

  if (parts.length === 1) {
    if (isCurrent) {
      const start = parts[0].replace(/\b(present|current|now)\b/gi, '').trim();
      return {
        startDate: start || null,
        endDate: null,
        isCurrent: true,
      };
    }
    // Single date (e.g. graduation year "2024" or single date "May 2024")
    return {
      startDate: null,
      endDate: parts[0],
      isCurrent: false,
    };
  }

  return { startDate: null, endDate: null, isCurrent };
}

function parseSkillString(val: string | string[] | undefined): IItem[] {
  if (!val) return [];
  const arr = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val;
  return arr.map((name) => ({ name: String(name), level: 0 }));
}

const KNOWN_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'ruby', 'go', 'golang',
  'rust', 'php', 'swift', 'kotlin', 'dart', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
  'html', 'html5', 'css', 'css3', 'sass', 'scss', 'sql', 'pl/sql', 'graphql'
]);

const KNOWN_FRAMEWORKS = new Set([
  'react', 'react.js', 'reactjs', 'vue', 'vue.js', 'vuejs', 'angular', 'angularjs', 'next.js', 'nextjs',
  'nuxt', 'nuxtjs', 'svelte', 'express', 'express.js', 'nestjs', 'node.js', 'nodejs', 'django',
  'flask', 'fastapi', 'spring', 'spring boot', 'laravel', 'ruby on rails', 'rails', 'asp.net',
  '.net', 'dotnet', 'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'redux',
  'tailwind', 'tailwind css', 'bootstrap', 'material-ui', 'mui', 'jquery'
]);

const KNOWN_DATABASES = new Set([
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra',
  'dynamodb', 'elasticsearch', 'firebase', 'firestore', 'mariadb', 'neo4j', 'couchdb',
  'supabase', 'prisma', 'typeorm', 'hibernate', 'sqlalchemy'
]);

const KNOWN_TOOLS = new Set([
  'git', 'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'k8s', 'aws', 'amazon web services',
  'azure', 'gcp', 'google cloud', 'linux', 'ubuntu', 'jenkins', 'ci/cd', 'github actions',
  'jira', 'confluence', 'postman', 'figma', 'terraform', 'ansible', 'webpack', 'vite', 'eslint',
  'jest', 'cypress', 'selenium', 'npm', 'yarn', 'pnpm', 'prometheus', 'grafana', 'datadog'
]);

/**
 * Intelligently maps skills into the 5 skill stores:
 * languages, frameworks, databases, tools, technologies.
 */
function mapSkillCategories(categories?: Record<string, string>, items?: string[]) {
  const result = {
    languages: [] as IItem[],
    frameworks: [] as IItem[],
    technologies: [] as IItem[],
    tools: [] as IItem[],
    databases: [] as IItem[],
  };

  const addedNames = new Set<string>();

  const pushUnique = (list: IItem[], item: IItem) => {
    const key = item.name.toLowerCase();
    if (!addedNames.has(key)) {
      addedNames.add(key);
      list.push(item);
    }
  };

  // 1. Process explicit categories if present
  if (categories) {
    for (const [cat, skills] of Object.entries(categories)) {
      const catLower = cat.toLowerCase();
      const parsed = parseSkillString(skills);

      if (catLower.includes('language') || catLower.includes('programming')) {
        parsed.forEach((item) => pushUnique(result.languages, item));
      } else if (catLower.includes('framework') || catLower.includes('librar')) {
        parsed.forEach((item) => pushUnique(result.frameworks, item));
      } else if (catLower.includes('database') || catLower.includes('db') || catLower.includes('data store')) {
        parsed.forEach((item) => pushUnique(result.databases, item));
      } else if (catLower.includes('tool') || catLower.includes('devops') || catLower.includes('cloud') || catLower.includes('platform')) {
        parsed.forEach((item) => pushUnique(result.tools, item));
      } else {
        parsed.forEach((item) => pushUnique(result.technologies, item));
      }
    }
  }

  // 2. Classify any remaining or flat items using the dictionary
  const flatItems = items || [];
  for (const name of flatItems) {
    const key = name.trim().toLowerCase();
    if (!key || addedNames.has(key)) continue;

    const item: IItem = { name: name.trim(), level: 0 };
    if (KNOWN_LANGUAGES.has(key)) {
      pushUnique(result.languages, item);
    } else if (KNOWN_FRAMEWORKS.has(key)) {
      pushUnique(result.frameworks, item);
    } else if (KNOWN_DATABASES.has(key)) {
      pushUnique(result.databases, item);
    } else if (KNOWN_TOOLS.has(key)) {
      pushUnique(result.tools, item);
    } else {
      pushUnique(result.technologies, item);
    }
  }

  return result;
}

export function applyParsedSections(rawSections: any): void {
  // Normalize input: handle raw array, { result: [...] }, or { sections: [...] }
  let sections: ResumeSection[] = [];
  if (Array.isArray(rawSections)) {
    sections = rawSections;
  } else if (rawSections && Array.isArray(rawSections.result)) {
    sections = rawSections.result;
  } else if (rawSections && Array.isArray(rawSections.sections)) {
    sections = rawSections.sections;
  } else if (rawSections && typeof rawSections === 'object') {
    const found = Object.values(rawSections).find((v) => Array.isArray(v));
    if (found && Array.isArray(found)) sections = found as ResumeSection[];
  }

  if (!sections || sections.length === 0) {
    console.warn('applyParsedSections: No sections found in input', rawSections);
    return;
  }

  useCustomSectionsStore.getState().resetAll();
  let foundProjects = '';
  let foundCertifications = '';
  let foundAchievementsHtml = '';

  for (const sec of sections) {
    const type = (sec.type || '').toLowerCase();

    if (type === 'header') {
      const profiles = [];

      const ensureUrl = (url: string) => {
        if (!url) return '';
        if (!url.startsWith('http')) return 'https://' + url;
        return url;
      };

      // Extract LinkedIn URL
      let linkedinUrl = sec.linkedin || '';
      if (!linkedinUrl) {
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
        summary: '', // Clear default mock summary
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

    const isProfileSummary =
      type === 'summary' ||
      type === 'profile' ||
      type === 'objective' ||
      type === 'about' ||
      (sec.name && /summary|profile|objective|about/i.test(sec.name));

    const anySec = sec as any;
    const summaryContent =
      sec.text ||
      anySec.content ||
      anySec.summary ||
      (Array.isArray(sec.items) ? sec.items.join(' ') : '');

    if (isProfileSummary && summaryContent) {
      const current = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({
        ...current,
        summary: summaryContent,
      } as never);
    }

    if (type === 'experience' && sec.entries) {
      const work = sec.entries.map((entry: any, i: number) => {
        const { startDate, endDate, isCurrent } = parseDateRange(entry.duration);
        const bullets: string[] = Array.isArray(entry.bullets) ? entry.bullets.filter(Boolean) : [];

        const summary =
          bullets.length > 0
            ? `<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
            : typeof entry.summary === 'string'
            ? entry.summary
            : '';

        return {
          id: `uploaded-exp-${i}`,
          name: entry.company || entry.name || '',
          position: entry.title || entry.position || '',
          url: entry.url || '',
          startDate: startDate,
          endDate: endDate,
          isWorkingHere: isCurrent,
          summary,
          years: entry.duration || '',
          highlights: bullets,
          website: '',
        };
      });
      useExperiences.getState().reset(work as never);
    }

    if (type === 'education' && sec.entries) {
      const edu = sec.entries.map((entry: any, i: number) => {
        const degreeStr = entry.degree || '';
        let studyType = degreeStr;
        let area = '';
        const inMatch = degreeStr.match(/^(.+?)\s+in\s+(.+)$/i);
        if (inMatch) {
          studyType = inMatch[1].trim();
          area = inMatch[2].trim();
        }

        const dateRaw = entry.year || entry.duration || entry.dates || '';
        const { startDate, endDate, isCurrent } = parseDateRange(dateRaw);

        let score = '';
        if (entry.score) {
          score = String(entry.score);
        } else if (entry.gpa) {
          score = `GPA: ${entry.gpa}`;
        } else if (typeof entry.year === 'string' && /gpa/i.test(entry.year)) {
          const gpaMatch = entry.year.match(/GPA:\s*([0-9.]+[\/\d.]*)/i);
          if (gpaMatch) score = gpaMatch[0];
        }

        return {
          id: `uploaded-edu-${i}`,
          institution: entry.institution || entry.school || entry.name || '',
          url: entry.url || '',
          studyType,
          area,
          startDate: startDate,
          endDate: endDate,
          isStudyingHere: isCurrent,
          score,
          courses: Array.isArray(entry.courses) ? entry.courses : [],
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
        const bulletItems: string[] = [];
        for (const entry of sec.entries) {
          const title = entry.name || entry.title || '';
          const tech = entry.techStack ? ` (${entry.techStack})` : '';
          const bullets = Array.isArray(entry.bullets) ? entry.bullets.filter(Boolean) : [];

          if (title && bullets.length > 0) {
            bulletItems.push(`<strong>${title}</strong>${tech}: ${bullets[0]}`);
            for (let bIdx = 1; bIdx < bullets.length; bIdx++) {
              bulletItems.push(bullets[bIdx]);
            }
          } else if (title) {
            bulletItems.push(`<strong>${title}</strong>${tech}`);
          } else if (bullets.length > 0) {
            bulletItems.push(...bullets);
          }
        }
        if (bulletItems.length > 0) {
          foundProjects = `<ul>${bulletItems.map((b) => `<li>${b}</li>`).join('')}</ul>`;
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

    // Custom / Non-standard sections (Publications, Volunteer, Patents, Extracurriculars, etc.)
    const isHandled =
      type === 'header' ||
      type === 'summary' ||
      type === 'objective' ||
      type === 'profile' ||
      type === 'skills' ||
      type === 'experience' ||
      type === 'education' ||
      type === 'projects' ||
      isCertSec ||
      isAchievementSec;

    if (!isHandled && sec.name && sec.name.trim()) {
      let bullets: string[] = [];
      if (Array.isArray(sec.items) && sec.items.length > 0) {
        bullets = sec.items.filter(Boolean);
      } else if (Array.isArray(sec.entries) && sec.entries.length > 0) {
        bullets = sec.entries.flatMap((entry: any) => {
          if (Array.isArray(entry.bullets) && entry.bullets.length > 0) {
            return entry.bullets.filter(Boolean);
          }
          return [entry.name || entry.title || entry.summary || entry.description].filter(Boolean);
        });
      } else if (sec.text) {
        bullets = sec.text
          .split('\n')
          .map((l: string) => l.replace(/^[•\-–·*▪►○\d+\.]\s*/, '').trim())
          .filter(Boolean);
      }

      if (bullets.length > 0) {
        const html = `<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`;
        useCustomSectionsStore.getState().addCustomSection(sec.name, html);
      } else if (sec.text && sec.text.trim()) {
        useCustomSectionsStore.getState().addCustomSection(sec.name, `<p>${sec.text.trim()}</p>`);
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
