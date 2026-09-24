/**
 * TailorResume — API client for the FastAPI backend (port 8000)
 * No auth required for MVP.
 */

const API_BASE = 'http://localhost:8000/api';

/* ─────────── Shared Types ─────────── */

export interface ResumeSection {
  name: string;
  type: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  url?: string;
  headline?: string;
  text?: string;
  categories?: Record<string, string>;
  items?: string[];
  entries?: any[];
}

interface ScoreBreakdown {
  keyword_score: number;
  semantic_score: number;
  format_score: number;
  completeness_score: number;
}

interface SkillMatch {
  skill: string;
  match_type: string;
  confidence: number;
}

/* ─────────── Analyze ─────────── */

export interface SectionScore {
  score: number;
  matched: string[];
  missing: string[];
  recommendation: string;
}

export interface ExperienceEntryScore {
  title: string;
  company: string;
  score: number;
  matched: string[];
  missing: string[];
}

export interface ExperienceSectionScore extends SectionScore {
  entries: ExperienceEntryScore[];
}

export interface AnalyzeResponse {
  overall_score: number;
  breakdown: ScoreBreakdown;
  section_scores: {
    summary?: SectionScore;
    experience?: ExperienceSectionScore;
    skills?: SectionScore;
  };
  matched_skills: SkillMatch[];
  partial_matches: SkillMatch[];
  missing_skills: string[];
  jd_analysis: Record<string, any>;
  recommendations: string[];
}

/* ─────────── Tailor ─────────── */

export interface TailorResponse {
  tailored_content: ResumeSection[];
  ats_score: number;
  score_breakdown: ScoreBreakdown;
  keywords_added: string[];
  changes_summary: string[];
}

export interface TailorSummaryResponse {
  tailored_summary: string;
  keywords_incorporated: string[];
  before_score: number;
  after_score: number;
  ats_score: number;
}

export interface TailorBulletsResponse {
  tailored_bullets: string[];
  keywords_incorporated: string[];
  before_score: number;
  after_score: number;
  ats_score: number;
}

export interface TailorSkillsResponse {
  tailored_skills: Record<string, any>;
  keywords_incorporated: string[];
  before_score: number;
  after_score: number;
  ats_score: number;
}

/* ─────────── Score ─────────── */

export interface ScoreResponse {
  ats_score: number;
  breakdown: ScoreBreakdown;
  matched_skills: SkillMatch[];
  partial_matches: SkillMatch[];
  missing_skills: string[];
  recommendations: string[];
}

/* ─────────── API Call Helper ─────────── */

async function apiCall<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

/* ─────────── Endpoints ─────────── */

/** Analyze resume against JD — returns scores without modifying */
export async function analyzeResume(
  sections: ResumeSection[],
  jobDescription: string
): Promise<AnalyzeResponse> {
  return apiCall<AnalyzeResponse>('/analyze/', {
    resume_content: sections,
    job_description: jobDescription,
  });
}

/** Full resume tailoring — rewrites summary, bullets, skills */
export async function tailorResume(
  sections: ResumeSection[],
  jobDescription: string
): Promise<TailorResponse> {
  return apiCall<TailorResponse>('/tailor/', {
    resume_content: sections,
    job_description: jobDescription,
  });
}

/** Tailor only the summary section */
export async function tailorSummary(
  sections: ResumeSection[],
  jobDescription: string
): Promise<TailorSummaryResponse> {
  return apiCall<TailorSummaryResponse>('/tailor/summary', {
    resume_content: sections,
    job_description: jobDescription,
  });
}

/** Tailor bullets for a specific experience entry */
export async function tailorBullets(
  sections: ResumeSection[],
  jobDescription: string,
  entryIndex: number
): Promise<TailorBulletsResponse> {
  return apiCall<TailorBulletsResponse>('/tailor/bullets', {
    resume_content: sections,
    job_description: jobDescription,
    entry_index: entryIndex,
  });
}

/** Reorder and expand skills to match JD */
export async function tailorSkills(
  sections: ResumeSection[],
  jobDescription: string
): Promise<TailorSkillsResponse> {
  return apiCall<TailorSkillsResponse>('/tailor/skills', {
    resume_content: sections,
    job_description: jobDescription,
  });
}

/** Score resume against JD without modifying */
export async function scoreResume(
  sections: ResumeSection[],
  jobDescription: string
): Promise<ScoreResponse> {
  return apiCall<ScoreResponse>('/score/', {
    resume_content: sections,
    job_description: jobDescription,
  });
}

/** Parse an uploaded resume file (PDF/DOCX) into structured sections */
export async function parseResumeFile(file: File): Promise<ResumeSection[]> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/parse/resume`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

/** Health check */
export async function healthCheck(): Promise<{ status: string; llm_provider: string; llm_model: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
