import React, { useState, useCallback, useRef } from 'react';
import {
  analyzeResume,
  scoreResume,
  tailorSummary,
  tailorBullets,
  tailorSkills,
  tailorProjects,
  tailorCertifications,
  tailorCustomSection,
  type AnalyzeResponse,
  type TailorSummaryResponse,
  type TailorBulletsResponse,
  type TailorSkillsResponse,
  type TailorProjectsResponse,
  type TailorCertificationsResponse,
  type TailorCustomSectionResponse,
} from '@/services/api';
import { zustandToSections, bulletsToHtml, extractBulletsFromHtml } from '@/services/resumeMapper';
import { useBasicDetails } from '@/stores/basic';
import { useExperiences } from '@/stores/experience';
import { useEducations } from '@/stores/education';
import { useLanguages, useFrameworks, useTechnologies, useTools, useDatabases } from '@/stores/skills';
import { useAwards } from '@/stores/awards';
import { useVoluteeringStore } from '@/stores/volunteering';
import { useActivity } from '@/stores/activity';
import { useCustomSectionsStore } from '@/stores/customSections';

type Step = 'input' | 'analysis';

const scoreColor = (score: number) => {
  if (score >= 70) return '#22c55e';
  if (score >= 45) return '#eab308';
  return '#ef4444';
};

const ScoreBar = ({ score, label, small }: { score: number; label?: string; small?: boolean }) => (
  <div className={small ? 'mb-1' : 'mb-2'}>
    {label && (
      <div className={`flex justify-between ${small ? 'text-xs' : 'text-sm'} mb-0.5`}>
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-semibold" style={{ color: scoreColor(score) }}>
          {Math.round(score)}%
        </span>
      </div>
    )}
    <div className={`w-full bg-slate-800/80 rounded-full ${small ? 'h-1.5' : 'h-2'} overflow-hidden border border-white/5`}>
      <div
        className={`${small ? 'h-1.5' : 'h-2'} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(score, 0), 100)}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  </div>
);

const SkillBadges = ({ skills, type }: { skills: string[]; type: 'matched' | 'missing' | 'partial' }) => {
  const colors = {
    matched: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    missing: 'bg-red-500/15 text-red-300 border border-red-500/30',
    partial: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  };
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s, i) => (
        <span key={i} className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[type]}`}>
          {s}
        </span>
      ))}
    </div>
  );
};

function buildSections() {
  const basicState = useBasicDetails.getState().values;
  const expState = useExperiences.getState().experiences;
  const eduState = useEducations.getState().academics;
  const langState = useLanguages.getState().values;
  const fwState = useFrameworks.getState().values;
  const techState = useTechnologies.getState().values;
  const toolState = useTools.getState().values;
  const dbState = useDatabases.getState().values;

  return zustandToSections(
    basicState,
    expState as any,
    eduState as any,
    { languages: langState, frameworks: fwState, technologies: techState, tools: toolState, databases: dbState },
    useAwards.getState().awards as any,
    useVoluteeringStore.getState().volunteeredExps || [],
    useActivity.getState().get() as any
  );
}

function captureSnapshot() {
  return {
    basics: JSON.parse(JSON.stringify(useBasicDetails.getState().values)),
    experiences: JSON.parse(JSON.stringify(useExperiences.getState().experiences)),
    academics: JSON.parse(JSON.stringify(useEducations.getState().academics)),
    languages: [...useLanguages.getState().values],
    frameworks: [...useFrameworks.getState().values],
    technologies: [...useTechnologies.getState().values],
    tools: [...useTools.getState().values],
    databases: [...useDatabases.getState().values],
    activities: JSON.parse(JSON.stringify(useActivity.getState().activities)),
    customSections: JSON.parse(JSON.stringify(useCustomSectionsStore.getState().customSections)),
  };
}

const TailorLayout = () => {
  const customSections = useCustomSectionsStore((state) => state.customSections);
  const [jd, setJd] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('linkedin_jd') || '';
    }
    return '';
  });
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Analysis
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);

  // Step 2: Section tailoring state
  const [tailoringSection, setTailoringSection] = useState('');
  const [tailoredSummary, setTailoredSummary] = useState<TailorSummaryResponse | null>(null);
  const [tailoredBullets, setTailoredBullets] = useState<Record<number, TailorBulletsResponse>>({});
  const [tailoredSkills, setTailoredSkills] = useState<TailorSkillsResponse | null>(null);
  const [tailoredProjects, setTailoredProjects] = useState<TailorProjectsResponse | null>(null);
  const [tailoredCertifications, setTailoredCertifications] = useState<TailorCertificationsResponse | null>(null);
  const [tailoredCustomSections, setTailoredCustomSections] = useState<Record<string, TailorCustomSectionResponse>>({});

  // Step 3: Apply/revert
  const [snapshot, setSnapshot] = useState<any>(null);
  const [applied, setApplied] = useState(false);

  const sectionsRef = useRef<any[]>([]);

  // ─── Step 1: Analyze ───
  const handleAnalyze = useCallback(async () => {
    if (jd.trim().length < 50) {
      setError('Please paste a job description (at least 50 characters).');
      return;
    }
    setError('');
    setLoading(true);
    setAnalysis(null);
    setTailoredSummary(null);
    setTailoredBullets({});
    setTailoredSkills(null);
    setTailoredProjects(null);
    setTailoredCertifications(null);
    setApplied(false);
    setSnapshot(captureSnapshot());

    try {
      const sections = buildSections();
      sectionsRef.current = sections;
      const res = await analyzeResume(sections as any, jd);
      setAnalysis(res);
      setOverallScore(res.overall_score);
      setStep('analysis');
    } catch (e: any) {
      setError(e.message || 'Failed to analyze. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  }, [jd]);

  // ─── Step 2: Section Tailoring ───
  const handleTailorSummary = useCallback(async () => {
    setTailoringSection('summary');
    try {
      const currentSections = buildSections();
      sectionsRef.current = currentSections;
      const res = await tailorSummary(currentSections as any, jd, analysis?.jd_analysis);
      setTailoredSummary(res);
      setOverallScore((prev) => Math.max(prev, res.ats_score));
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
        return {
          ...prev,
          overall_score: newOverall,
          breakdown: res.breakdown || prev.breakdown,
          matched_skills: res.matched_skills || prev.matched_skills,
          missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
          section_scores: {
            ...prev.section_scores,
            summary: {
              ...(prev.section_scores.summary || { matched: [], missing: [], recommendation: '' }),
              score: res.after_score,
            },
          },
        };
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTailoringSection('');
    }
  }, [jd, analysis?.jd_analysis]);

  const handleTailorBullets = useCallback(
    async (index: number) => {
      setTailoringSection(`bullets-${index}`);
      try {
        const currentSections = buildSections();
        sectionsRef.current = currentSections;
        const res = await tailorBullets(currentSections as any, jd, index, analysis?.jd_analysis);
        setTailoredBullets((prev) => ({ ...prev, [index]: res }));
        setOverallScore((prev) => Math.max(prev, res.ats_score));
        setAnalysis((prev) => {
          if (!prev) return prev;
          const prevEntries = prev.section_scores.experience?.entries || [];
          const updatedEntries = [...prevEntries];
          if (updatedEntries[index]) {
            updatedEntries[index] = {
              ...updatedEntries[index],
              score: res.after_score,
            };
          }
          const avgExp =
            updatedEntries.length > 0
              ? updatedEntries.reduce((a, b) => a + b.score, 0) / updatedEntries.length
              : res.after_score;
          const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
          return {
            ...prev,
            overall_score: newOverall,
            breakdown: res.breakdown || prev.breakdown,
            matched_skills: res.matched_skills || prev.matched_skills,
            missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
            section_scores: {
              ...prev.section_scores,
              experience: {
                ...(prev.section_scores.experience || { matched: [], missing: [], recommendation: '' }),
                score: avgExp,
                entries: updatedEntries,
              },
            },
          };
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setTailoringSection('');
      }
    },
    [jd, analysis?.jd_analysis]
  );

  const handleTailorSkills = useCallback(async () => {
    setTailoringSection('skills');
    try {
      const currentSections = buildSections();
      sectionsRef.current = currentSections;
      const res = await tailorSkills(currentSections as any, jd, analysis?.jd_analysis);
      setTailoredSkills(res);
      setOverallScore((prev) => Math.max(prev, res.ats_score));
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
        return {
          ...prev,
          overall_score: newOverall,
          breakdown: res.breakdown || prev.breakdown,
          matched_skills: res.matched_skills || prev.matched_skills,
          missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
          section_scores: {
            ...prev.section_scores,
            skills: {
              ...(prev.section_scores.skills || { matched: [], missing: [], recommendation: '' }),
              score: res.after_score,
            },
          },
        };
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTailoringSection('');
    }
  }, [jd, analysis?.jd_analysis]);

  const handleTailorProjects = useCallback(async () => {
    setTailoringSection('projects');
    try {
      const currentSections = buildSections();
      sectionsRef.current = currentSections;
      const res = await tailorProjects(currentSections as any, jd, analysis?.jd_analysis);
      setTailoredProjects(res);
      setOverallScore((prev) => Math.max(prev, res.ats_score));
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
        return {
          ...prev,
          overall_score: newOverall,
          breakdown: res.breakdown || prev.breakdown,
          matched_skills: res.matched_skills || prev.matched_skills,
          missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
          section_scores: {
            ...prev.section_scores,
            projects: {
              ...(prev.section_scores.projects || { matched: [], missing: [], recommendation: '' }),
              score: res.after_score,
            },
          },
        };
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTailoringSection('');
    }
  }, [jd, analysis?.jd_analysis]);

  const handleTailorCertifications = useCallback(async () => {
    setTailoringSection('certifications');
    try {
      const currentSections = buildSections();
      sectionsRef.current = currentSections;
      const res = await tailorCertifications(currentSections as any, jd, analysis?.jd_analysis);
      setTailoredCertifications(res);
      setOverallScore((prev) => Math.max(prev, res.ats_score));
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
        return {
          ...prev,
          overall_score: newOverall,
          breakdown: res.breakdown || prev.breakdown,
          matched_skills: res.matched_skills || prev.matched_skills,
          missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
          section_scores: {
            ...prev.section_scores,
            certifications: {
              ...(prev.section_scores.certifications || { matched: [], missing: [], recommendation: '' }),
              score: res.after_score,
            },
          },
        };
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTailoringSection('');
    }
  }, [jd, analysis?.jd_analysis]);

  const handleTailorCustomSection = useCallback(
    async (sectionId: string, sectionTitle: string, bullets: string[]) => {
      setTailoringSection(`custom-${sectionId}`);
      try {
        const currentSections = buildSections();
        sectionsRef.current = currentSections;
        const res = await tailorCustomSection(
          currentSections as any,
          jd,
          sectionId,
          sectionTitle,
          bullets,
          analysis?.jd_analysis
        );
        setTailoredCustomSections((prev) => ({ ...prev, [sectionId]: res }));
        setOverallScore((prev) => Math.max(prev, res.ats_score));
        setAnalysis((prev) => {
          if (!prev) return prev;
          const newOverall = Math.max(prev.overall_score || 0, res.ats_score);
          return {
            ...prev,
            overall_score: newOverall,
            breakdown: res.breakdown || prev.breakdown,
            matched_skills: res.matched_skills || prev.matched_skills,
            missing_skills: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
            section_scores: {
              ...prev.section_scores,
              [sectionId]: {
                score: res.after_score,
                matched: (res.matched_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
                missing: (res.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
                recommendation: `Custom section "${sectionTitle}" tailored to match target requirements.`,
              },
            },
          };
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setTailoringSection('');
      }
    },
    [jd, analysis?.jd_analysis]
  );

  // Helper to re-score the entire resume dynamically when changes are applied
  const refreshScore = useCallback(async () => {
    try {
      const updatedSections = buildSections();
      const scoreRes = await scoreResume(updatedSections as any, jd, analysis?.jd_analysis);
      setOverallScore((prev) => Math.max(prev, scoreRes.ats_score));
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newOverall = Math.max(prev.overall_score || 0, scoreRes.ats_score);
        return {
          ...prev,
          overall_score: newOverall,
          breakdown: scoreRes.breakdown,
          matched_skills: scoreRes.matched_skills,
          missing_skills: (scoreRes.missing_skills || []).map((s: any) => (typeof s === 'string' ? s : s.skill)),
          section_scores: scoreRes.section_scores || prev.section_scores,
        };
      });
    } catch (e) {
      console.error('Error re-scoring after apply:', e);
    }
  }, [jd, analysis?.jd_analysis]);

  // ─── Step 3: Apply / Revert ───
  const applyAll = useCallback(async () => {
    // 1. Apply summary (and clear obsolete objective so single Profile description renders cleanly)
    if (tailoredSummary) {
      const cur = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({
        ...cur,
        summary: tailoredSummary.tailored_summary,
        objective: '',
      });
    }

    // 2. Apply headline
    if (analysis?.jd_analysis?.jobTitle) {
      const cur = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({ ...cur, label: analysis.jd_analysis.jobTitle });
    }

    // 3. Apply experience bullets
    const exps = useExperiences.getState().experiences;
    for (const [idxStr, res] of Object.entries(tailoredBullets)) {
      const idx = parseInt(idxStr);
      if (idx < exps.length) {
        useExperiences.getState().updateExperience(idx, {
          ...exps[idx],
          highlights: res.tailored_bullets,
          summary: bulletsToHtml(res.tailored_bullets),
        });
      }
    }

    // 4. Apply skills
    if (tailoredSkills) {
      const cats = tailoredSkills.tailored_skills;
      if (cats['Languages']) {
        const items =
          typeof cats['Languages'] === 'string'
            ? cats['Languages'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
            : [];
        if (items.length) useLanguages.getState().reset(items);
      }
      if (cats['Frameworks']) {
        const items =
          typeof cats['Frameworks'] === 'string'
            ? cats['Frameworks'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
            : [];
        if (items.length) useFrameworks.getState().reset(items);
      }
      if (cats['Technologies']) {
        const items =
          typeof cats['Technologies'] === 'string'
            ? cats['Technologies'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
            : [];
        if (items.length) useTechnologies.getState().reset(items);
      }
      if (cats['Tools']) {
        const items =
          typeof cats['Tools'] === 'string'
            ? cats['Tools'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
            : [];
        if (items.length) useTools.getState().reset(items);
      }
      if (cats['Databases']) {
        const items =
          typeof cats['Databases'] === 'string'
            ? cats['Databases'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
            : [];
        if (items.length) useDatabases.getState().reset(items);
      }
    }

    // 5. Apply projects
    if (tailoredProjects && tailoredProjects.tailored_projects.length > 0) {
      useActivity.getState().updateInvolvements(bulletsToHtml(tailoredProjects.tailored_projects));
    }

    // 6. Apply certifications
    if (tailoredCertifications && tailoredCertifications.tailored_certifications.length > 0) {
      useActivity.getState().updateAchievements(bulletsToHtml(tailoredCertifications.tailored_certifications));
    }

    // 7. Apply custom sections
    for (const [secId, res] of Object.entries(tailoredCustomSections)) {
      if (res.tailored_bullets && res.tailored_bullets.length > 0) {
        useCustomSectionsStore.getState().updateCustomSection(secId, {
          content: bulletsToHtml(res.tailored_bullets),
        });
      }
    }

    // 8. Re-score the entire resume now that all updates are applied!
    await refreshScore();
    setApplied(true);
  }, [tailoredSummary, tailoredBullets, tailoredSkills, tailoredProjects, tailoredCertifications, tailoredCustomSections, analysis, refreshScore]);

  const applySummaryOnly = useCallback(async () => {
    if (tailoredSummary) {
      const cur = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({
        ...cur,
        summary: tailoredSummary.tailored_summary,
        objective: '',
      });
      await refreshScore();
      setApplied(true);
    }
  }, [tailoredSummary, refreshScore]);

  const applyBulletsOnly = useCallback(async (idx: number) => {
    const res = tailoredBullets[idx];
    if (res) {
      const exps = useExperiences.getState().experiences;
      if (idx < exps.length) {
        useExperiences.getState().updateExperience(idx, {
          ...exps[idx],
          highlights: res.tailored_bullets,
          summary: bulletsToHtml(res.tailored_bullets),
        });
        await refreshScore();
        setApplied(true);
      }
    }
  }, [tailoredBullets, refreshScore]);

  const applySkillsOnly = useCallback(async () => {
    if (tailoredSkills) {
      const cats = tailoredSkills.tailored_skills;
      if (cats['Languages']) {
        const items = typeof cats['Languages'] === 'string'
          ? cats['Languages'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
          : [];
        if (items.length) useLanguages.getState().reset(items);
      }
      if (cats['Frameworks']) {
        const items = typeof cats['Frameworks'] === 'string'
          ? cats['Frameworks'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
          : [];
        if (items.length) useFrameworks.getState().reset(items);
      }
      if (cats['Technologies']) {
        const items = typeof cats['Technologies'] === 'string'
          ? cats['Technologies'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
          : [];
        if (items.length) useTechnologies.getState().reset(items);
      }
      if (cats['Tools']) {
        const items = typeof cats['Tools'] === 'string'
          ? cats['Tools'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
          : [];
        if (items.length) useTools.getState().reset(items);
      }
      if (cats['Databases']) {
        const items = typeof cats['Databases'] === 'string'
          ? cats['Databases'].split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({ name, level: 0 }))
          : [];
        if (items.length) useDatabases.getState().reset(items);
      }
      await refreshScore();
      setApplied(true);
    }
  }, [tailoredSkills, refreshScore]);

  const applyProjectsOnly = useCallback(async () => {
    if (tailoredProjects && tailoredProjects.tailored_projects.length > 0) {
      useActivity.getState().updateInvolvements(bulletsToHtml(tailoredProjects.tailored_projects));
      await refreshScore();
      setApplied(true);
    }
  }, [tailoredProjects, refreshScore]);

  const applyCertificationsOnly = useCallback(async () => {
    if (tailoredCertifications && tailoredCertifications.tailored_certifications.length > 0) {
      useActivity.getState().updateAchievements(bulletsToHtml(tailoredCertifications.tailored_certifications));
      await refreshScore();
      setApplied(true);
    }
  }, [tailoredCertifications, refreshScore]);

  const applyCustomSectionOnly = useCallback(
    async (sectionId: string) => {
      const res = tailoredCustomSections[sectionId];
      if (res && res.tailored_bullets && res.tailored_bullets.length > 0) {
        useCustomSectionsStore.getState().updateCustomSection(sectionId, {
          content: bulletsToHtml(res.tailored_bullets),
        });
        await refreshScore();
        setApplied(true);
      }
    },
    [tailoredCustomSections, refreshScore]
  );

  const revertAll = useCallback(() => {
    if (!snapshot) return;
    useBasicDetails.getState().reset(snapshot.basics);
    useExperiences.getState().reset(snapshot.experiences);
    useEducations.getState().reset(snapshot.academics);
    useLanguages.getState().reset(snapshot.languages);
    useFrameworks.getState().reset(snapshot.frameworks);
    useTechnologies.getState().reset(snapshot.technologies);
    useTools.getState().reset(snapshot.tools);
    useDatabases.getState().reset(snapshot.databases);
    if (snapshot.activities) {
      useActivity.getState().reset(snapshot.activities);
    }
    if (snapshot.customSections) {
      useCustomSectionsStore.setState({ customSections: snapshot.customSections });
    }
    if (analysis) {
      setOverallScore(analysis.overall_score);
    }
    setApplied(false);
  }, [snapshot, analysis]);

  const startOver = () => {
    setStep('input');
    setAnalysis(null);
    setOverallScore(0);
    setTailoredSummary(null);
    setTailoredBullets({});
    setTailoredSkills(null);
    setTailoredProjects(null);
    setTailoredCertifications(null);
    setTailoredCustomSections({});
    setApplied(false);
    setError('');
  };

  const hasTailoredAnything = !!(
    tailoredSummary ||
    Object.keys(tailoredBullets).length > 0 ||
    tailoredSkills ||
    tailoredProjects ||
    tailoredCertifications ||
    Object.keys(tailoredCustomSections).length > 0
  );

  // ────────────── RENDER ──────────────

  return (
    <div className="pb-24">
      {/* Step 1: Input */}
      {step === 'input' && (
        <>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Tailor Resume</h2>
          <p className="text-xs text-slate-400 mb-3">
            Paste a job description to analyze your resume&apos;s ATS compatibility, then tailor section by section.
          </p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className="w-full p-3 border border-indigo-500/25 bg-[#161c30] text-slate-100 placeholder-slate-500 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || jd.trim().length < 50}
            className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-xs tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/25 cursor-pointer"
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Match'}
          </button>
        </>
      )}

      {/* Step 2: Analysis + Section Tailoring */}
      {step === 'analysis' && analysis && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-slate-100">📊 Analysis</h2>
            <button onClick={startOver} className="text-xs text-indigo-400 hover:text-cyan-300 font-semibold cursor-pointer">
              ← New JD
            </button>
          </div>

          {/* Overall Score */}
          <div className="p-4 bg-[#161c30] border border-indigo-500/25 rounded-xl shadow-md mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-200">Overall ATS Score</span>
              <span
                className="text-3xl font-bold transition-colors duration-300"
                style={{ color: scoreColor(overallScore) }}
              >
                {Math.round(overallScore)}%
              </span>
            </div>
            <ScoreBar score={overallScore} />
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-slate-400">
              <div>Keywords: {Math.round(analysis.breakdown.keyword_score)}%</div>
              <div>Semantic: {Math.round(analysis.breakdown.semantic_score)}%</div>
              <div>Format: {Math.round(analysis.breakdown.format_score)}%</div>
              <div>Completeness: {Math.round(analysis.breakdown.completeness_score)}%</div>
            </div>
          </div>

          {/* JD Info */}
          {analysis.jd_analysis?.jobTitle && (
            <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-xs mb-4">
              <span className="font-semibold text-indigo-300">Target Role:</span>{' '}
              <span className="text-indigo-200 font-medium">
                {analysis.jd_analysis.jobTitle}
                {analysis.jd_analysis.company && ` at ${analysis.jd_analysis.company}`}
                {analysis.jd_analysis.seniority && ` (${analysis.jd_analysis.seniority})`}
              </span>
            </div>
          )}

          {/* Skills Overview */}
          <div className="space-y-2 mb-4">
            {analysis.matched_skills.length > 0 && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                <div className="text-xs font-semibold text-emerald-300 mb-1">
                  ✅ Matched ({analysis.matched_skills.length})
                </div>
                <SkillBadges skills={analysis.matched_skills.map((s) => s.skill)} type="matched" />
              </div>
            )}
            {analysis.missing_skills.length > 0 && (
              <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-lg">
                <div className="text-xs font-semibold text-red-300 mb-1">
                  ❌ Missing ({analysis.missing_skills.length})
                </div>
                <SkillBadges skills={analysis.missing_skills} type="missing" />
              </div>
            )}
            {analysis.partial_matches.length > 0 && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg">
                <div className="text-xs font-semibold text-amber-300 mb-1">
                  ⚠️ Partial ({analysis.partial_matches.length})
                </div>
                <SkillBadges skills={analysis.partial_matches.map((s) => s.skill)} type="partial" />
              </div>
            )}
          </div>

          {/* Section-by-Section Scores + Tailor Buttons */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Section Scores & Tailoring</h3>

          {(() => {
            const summaryScore = analysis.section_scores?.summary || {
              score: 45,
              matched: [],
              missing: [],
              recommendation: 'Tailor summary to align with the target job title and keywords.',
            };
            const experienceScore = analysis.section_scores?.experience || {
              score: 45,
              matched: [],
              missing: [],
              recommendation: 'Optimize bullets with action verbs and quantifiable metrics.',
              entries: [],
            };
            const skillsScore = analysis.section_scores?.skills || {
              score: 45,
              matched: [],
              missing: [],
              recommendation: 'Add matching technical skills and categorize them cleanly.',
            };
            const projectsScore = analysis.section_scores?.projects || {
              score: 50,
              matched: [],
              missing: [],
              recommendation: 'Add projects highlighting key tech stack and measurable metrics.',
            };
            const certificationsScore = analysis.section_scores?.certifications || {
              score: 50,
              matched: [],
              missing: [],
              recommendation: 'Add cloud or industry certifications matching target qualifications.',
            };
            const educationScore = analysis.section_scores?.education || {
              score: 75,
              matched: [],
              missing: [],
              recommendation: 'Education credentials match role requirements.',
            };

            const storeEducations = useEducations.getState().academics || [];
            const storeExps = useExperiences.getState().experiences || [];
            const expEntries = (experienceScore.entries && experienceScore.entries.length > 0)
              ? experienceScore.entries
              : storeExps.map((exp: any) => ({
                  title: exp.position || '',
                  company: exp.name || '',
                  score: experienceScore.score || 45,
                  matched: [],
                  missing: [],
                }));

            return (
              <>
                {/* Summary Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">📝 Summary</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(summaryScore.score) }}
                    >
                      {Math.round(summaryScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={summaryScore.score} small />
                  {!tailoredSummary && summaryScore.score < 85 && summaryScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{summaryScore.recommendation}</p>
                  )}
                  {tailoredSummary ? (
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-emerald-300">✅ Tailored</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round(tailoredSummary.before_score)}% → {Math.round(tailoredSummary.after_score)}%
                        </span>
                      </div>
                      <p className="text-slate-300 line-clamp-3 leading-relaxed mb-2">{tailoredSummary.tailored_summary}</p>
                      <button
                        onClick={applySummaryOnly}
                        className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        Apply Summary to Resume
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleTailorSummary}
                      disabled={tailoringSection === 'summary'}
                      className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tailoringSection === 'summary' ? '⏳ Tailoring Summary...' : 'Tailor Summary'}
                    </button>
                  )}
                </div>

                {/* Experience Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">💼 Experience</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(experienceScore.score) }}
                    >
                      {Math.round(experienceScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={experienceScore.score} small />
                  {experienceScore.score < 80 && experienceScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{experienceScore.recommendation}</p>
                  )}

                  {/* Per-entry */}
                  {expEntries.length > 0 ? (
                    expEntries.map((entry: any, i: number) => (
                      <div key={i} className="ml-2 mt-2 p-2.5 border-l-2 border-indigo-500/40 bg-[#121727]/90 rounded-r-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-200">
                            {entry.title || entry.company || `Entry ${i + 1}`}
                          </span>
                          <span className="text-xs font-bold" style={{ color: scoreColor(entry.score) }}>
                            {Math.round(entry.score)}%
                          </span>
                        </div>
                        <ScoreBar score={entry.score} small />
                        {tailoredBullets[i] ? (
                          <div className="mt-1 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-semibold text-emerald-300">✅ Tailored</span>
                              <span className="text-emerald-300 font-bold">
                                {Math.round(tailoredBullets[i].before_score)}% → {Math.round(tailoredBullets[i].after_score)}%
                              </span>
                            </div>
                            <button
                              onClick={() => applyBulletsOnly(i)}
                              className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                            >
                              Apply Bullets to Resume
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTailorBullets(i)}
                            disabled={tailoringSection === `bullets-${i}`}
                            className="w-full mt-2 py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {tailoringSection === `bullets-${i}` ? '⏳ Optimizing Bullets...' : 'Tailor Bullets'}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">Add work experience in the editor to tailor bullets.</p>
                  )}
                </div>

                {/* Skills Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">🛠️ Skills</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(skillsScore.score) }}
                    >
                      {Math.round(skillsScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={skillsScore.score} small />
                  {!tailoredSkills && skillsScore.score < 85 && skillsScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{skillsScore.recommendation}</p>
                  )}
                  {tailoredSkills ? (
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-emerald-300">✅ Skills Categorized & Added</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round(tailoredSkills.before_score)}% → {Math.round(tailoredSkills.after_score)}%
                        </span>
                      </div>
                      {tailoredSkills.keywords_incorporated.length > 0 && (
                        <div className="mt-1.5 mb-2">
                          <SkillBadges skills={tailoredSkills.keywords_incorporated} type="matched" />
                        </div>
                      )}
                      <button
                        onClick={applySkillsOnly}
                        className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        Apply Skills to Resume
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleTailorSkills}
                      disabled={tailoringSection === 'skills'}
                      className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tailoringSection === 'skills' ? '⏳ Categorizing & Adding...' : 'Tailor & Add Skills'}
                    </button>
                  )}
                </div>

                {/* Projects Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">💻 Projects</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(projectsScore.score) }}
                    >
                      {Math.round(projectsScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={projectsScore.score} small />
                  {!tailoredProjects && projectsScore.score < 85 && projectsScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{projectsScore.recommendation}</p>
                  )}
                  {tailoredProjects ? (
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-emerald-300">✅ Project Bullets Tailored</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round(tailoredProjects.before_score)}% → {Math.round(tailoredProjects.after_score)}%
                        </span>
                      </div>
                      {tailoredProjects.keywords_incorporated.length > 0 && (
                        <div className="mt-1.5 mb-2">
                          <SkillBadges skills={tailoredProjects.keywords_incorporated} type="matched" />
                        </div>
                      )}
                      <ul className="text-slate-300 space-y-1.5 mb-2 list-disc list-inside leading-relaxed text-[11px]">
                        {tailoredProjects.tailored_projects.map((proj, idx) => (
                          <li key={idx}>{proj}</li>
                        ))}
                      </ul>
                      <button
                        onClick={applyProjectsOnly}
                        className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        Apply Projects to Resume
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleTailorProjects}
                      disabled={tailoringSection === 'projects'}
                      className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tailoringSection === 'projects' ? '⏳ Tailoring Projects...' : 'Tailor Project Bullets'}
                    </button>
                  )}
                </div>

                {/* Certifications Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">📜 Certifications</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(certificationsScore.score) }}
                    >
                      {Math.round(certificationsScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={certificationsScore.score} small />
                  {!tailoredCertifications && certificationsScore.score < 85 && certificationsScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{certificationsScore.recommendation}</p>
                  )}
                  {tailoredCertifications ? (
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-emerald-300">✅ Certifications Optimized</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round(tailoredCertifications.before_score)}% → {Math.round(tailoredCertifications.after_score)}%
                        </span>
                      </div>
                      <ul className="text-slate-300 space-y-1 mb-2 list-disc list-inside leading-relaxed text-[11px]">
                        {tailoredCertifications.tailored_certifications.map((cert, idx) => (
                          <li key={idx}>{cert}</li>
                        ))}
                      </ul>
                      <button
                        onClick={applyCertificationsOnly}
                        className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        Apply Certifications to Resume
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleTailorCertifications}
                      disabled={tailoringSection === 'certifications'}
                      className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tailoringSection === 'certifications' ? '⏳ Optimizing Credentials...' : 'Optimize & Suggest Certifications'}
                    </button>
                  )}
                </div>

                {/* Education Section */}
                <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">🎓 Education</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(educationScore.score) }}
                    >
                      {Math.round(educationScore.score)}%
                    </span>
                  </div>
                  <ScoreBar score={educationScore.score} small />
                  {educationScore.recommendation && (
                    <p className="text-xs text-slate-400 mb-2">{educationScore.recommendation}</p>
                  )}
                  {storeEducations.length > 0 ? (
                    <div className="space-y-1.5 mt-2">
                      {storeEducations.map((edu: any, i: number) => (
                        <div key={i} className="p-2 bg-[#121727]/90 border border-white/5 rounded-lg text-xs">
                          <div className="font-semibold text-slate-200">
                            {edu.studyType ? `${edu.studyType} in ${edu.area || 'Degree'}` : (edu.area || 'Degree')}
                          </div>
                          <div className="text-[11px] text-slate-400 flex justify-between mt-0.5">
                            <span>{edu.institution || 'University'}</span>
                            <span>{[edu.startDate, edu.endDate || (edu.isStudyingHere ? 'Present' : '')].filter(Boolean).join(' – ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Add education details in the editor to satisfy ATS criteria.</p>
                  )}
                </div>

                {/* Custom User Sections */}
                {customSections.map((cs) => {
                  const bullets = extractBulletsFromHtml(cs.content);
                  const csScore =
                    analysis.section_scores?.[cs.id] ||
                    analysis.section_scores?.[`custom_${cs.title.toLowerCase().replace(/\s+/g, '_')}`] || {
                      score: bullets.length > 0 ? 70 : 50,
                      matched: [],
                      missing: [],
                      recommendation: `Add role-aligned bullet points and keywords to "${cs.title}".`,
                    };
                  const tailored = tailoredCustomSections[cs.id];

                  return (
                    <div
                      key={cs.id}
                      className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-100">📌 {cs.title}</span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: scoreColor(csScore.score) }}
                        >
                          {Math.round(csScore.score)}%
                        </span>
                      </div>
                      <ScoreBar score={csScore.score} small />
                      {!tailored && csScore.score < 85 && csScore.recommendation && (
                        <p className="text-xs text-slate-400 mb-2">{csScore.recommendation}</p>
                      )}
                      {tailored ? (
                        <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-emerald-300">✅ {cs.title} Tailored</span>
                            <span className="text-emerald-300 font-bold">
                              {Math.round(tailored.before_score)}% → {Math.round(tailored.after_score)}%
                            </span>
                          </div>
                          {tailored.keywords_incorporated.length > 0 && (
                            <div className="mt-1.5 mb-2">
                              <SkillBadges skills={tailored.keywords_incorporated} type="matched" />
                            </div>
                          )}
                          <ul className="text-slate-300 space-y-1 mb-2 list-disc list-inside leading-relaxed text-[11px]">
                            {tailored.tailored_bullets.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                          <button
                            onClick={() => applyCustomSectionOnly(cs.id)}
                            className="py-1 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                          >
                            Apply {cs.title} to Resume
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTailorCustomSection(cs.id, cs.title, bullets)}
                          disabled={tailoringSection === `custom-${cs.id}`}
                          className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {tailoringSection === `custom-${cs.id}` ? `⏳ Tailoring ${cs.title}...` : `Tailor ${cs.title} Bullets`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl mb-3">
              <div className="text-xs font-semibold text-indigo-300 mb-1">💡 Recommendations</div>
              <ul className="text-xs text-indigo-200/90 space-y-0.5">
                {analysis.recommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply Changes Section */}
          <div className="mt-5 p-3.5 bg-[#161c30] border border-indigo-500/30 rounded-xl shadow-md">
            <div className="text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
              <span>Apply Changes to Resume</span>
              {hasTailoredAnything && (
                <span className="text-[11px] font-medium text-emerald-400">
                  {Object.keys(tailoredBullets).length + (tailoredSummary ? 1 : 0) + (tailoredSkills ? 1 : 0) + (tailoredProjects ? 1 : 0) + (tailoredCertifications ? 1 : 0)} section(s) tailored
                </span>
              )}
            </div>

            {hasTailoredAnything ? (
              !applied ? (
                <button
                  onClick={applyAll}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-900/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Apply All Changes to Resume
                </button>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 text-center font-semibold flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Changes applied! Live resume updated.
                  </div>
                  <button
                    onClick={revertAll}
                    className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>↩️ Revert to Original</span>
                  </button>
                </div>
              )
            ) : (
              <div className="mt-2">
                <button
                  disabled
                  className="w-full py-2.5 px-4 bg-slate-800/80 text-slate-500 border border-slate-700/50 rounded-xl font-semibold text-xs tracking-wide uppercase cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Apply Changes (Tailor sections first)
                </button>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Click any &ldquo;Tailor&rdquo; button above to generate improvements, then apply them to your resume.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-3 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300">{error}</div>
      )}
    </div>
  );
};

export default TailorLayout;
