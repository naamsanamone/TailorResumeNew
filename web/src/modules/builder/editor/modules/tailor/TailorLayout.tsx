import React, { useState, useCallback, useRef } from 'react';
import {
  analyzeResume,
  scoreResume,
  tailorSummary,
  tailorBullets,
  tailorSkills,
  type AnalyzeResponse,
  type TailorSummaryResponse,
  type TailorBulletsResponse,
  type TailorSkillsResponse,
} from '@/services/api';
import { zustandToSections, bulletsToHtml } from '@/services/resumeMapper';
import { useBasicDetails } from '@/stores/basic';
import { useExperiences } from '@/stores/experience';
import { useEducations } from '@/stores/education';
import { useLanguages, useFrameworks, useTechnologies, useTools, useDatabases } from '@/stores/skills';
import { useAwards } from '@/stores/awards';
import { useVoluteeringStore } from '@/stores/volunteering';
import { useActivity } from '@/stores/activity';

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
  };
}

const TailorLayout = () => {
  const [jd, setJd] = useState('');
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
      const res = await tailorSummary(currentSections as any, jd);
      setTailoredSummary(res);
      setOverallScore(res.ats_score);
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          overall_score: res.ats_score,
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
  }, [jd]);

  const handleTailorBullets = useCallback(
    async (index: number) => {
      setTailoringSection(`bullets-${index}`);
      try {
        const currentSections = buildSections();
        sectionsRef.current = currentSections;
        const res = await tailorBullets(currentSections as any, jd, index);
        setTailoredBullets((prev) => ({ ...prev, [index]: res }));
        setOverallScore(res.ats_score);
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
          return {
            ...prev,
            overall_score: res.ats_score,
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
    [jd]
  );

  const handleTailorSkills = useCallback(async () => {
    setTailoringSection('skills');
    try {
      const currentSections = buildSections();
      sectionsRef.current = currentSections;
      const res = await tailorSkills(currentSections as any, jd);
      setTailoredSkills(res);
      setOverallScore(res.ats_score);
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          overall_score: res.ats_score,
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
  }, [jd]);

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

    // 5. Re-score the entire resume now that all updates are applied!
    try {
      const updatedSections = buildSections();
      const scoreRes = await scoreResume(updatedSections as any, jd);
      setOverallScore(scoreRes.ats_score);
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          overall_score: scoreRes.ats_score,
          breakdown: scoreRes.breakdown,
          matched_skills: scoreRes.matched_skills,
          missing_skills: scoreRes.missing_skills.map((s: any) => (typeof s === 'string' ? s : s.skill)),
        };
      });
    } catch (e) {
      console.error('Error re-scoring after apply:', e);
    }

    setApplied(true);
  }, [tailoredSummary, tailoredBullets, tailoredSkills, analysis, jd]);

  const revertAll = useCallback(() => {
    if (!snapshot) return;
    useBasicDetails.getState().reset(snapshot.basics);
    useExperiences.getState().reset(snapshot.experiences);
    useLanguages.getState().reset(snapshot.languages);
    useFrameworks.getState().reset(snapshot.frameworks);
    useTechnologies.getState().reset(snapshot.technologies);
    useTools.getState().reset(snapshot.tools);
    useDatabases.getState().reset(snapshot.databases);
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
    setApplied(false);
    setError('');
  };

  const hasTailoredAnything = !!(tailoredSummary || Object.keys(tailoredBullets).length || tailoredSkills);

  // ────────────── RENDER ──────────────

  return (
    <div className="pb-8">
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

          {/* Summary Section */}
          {analysis.section_scores.summary && (
            <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-100">📝 Summary</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.summary.score) }}
                >
                  {Math.round(analysis.section_scores.summary.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.summary.score} small />
              {!tailoredSummary && analysis.section_scores.summary.score < 85 && analysis.section_scores.summary.recommendation && (
                <p className="text-xs text-slate-400 mb-2">{analysis.section_scores.summary.recommendation}</p>
              )}
              {tailoredSummary ? (
                <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-emerald-300">✅ Tailored</span>
                    <span className="text-emerald-300 font-bold">
                      {Math.round(tailoredSummary.before_score)}% → {Math.round(tailoredSummary.after_score)}%
                    </span>
                  </div>
                  <p className="text-slate-300 line-clamp-3 leading-relaxed">{tailoredSummary.tailored_summary}</p>
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
          )}

          {/* Experience Section */}
          {analysis.section_scores.experience && (
            <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-100">💼 Experience</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.experience.score) }}
                >
                  {Math.round(analysis.section_scores.experience.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.experience.score} small />
              {analysis.section_scores.experience.score < 80 && analysis.section_scores.experience.recommendation && (
                <p className="text-xs text-slate-400 mb-2">{analysis.section_scores.experience.recommendation}</p>
              )}

              {/* Per-entry */}
              {(analysis.section_scores.experience as any).entries?.map((entry: any, i: number) => (
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
                    <div className="mt-1 p-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-emerald-300">✅ Tailored</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round(tailoredBullets[i].before_score)}% → {Math.round(tailoredBullets[i].after_score)}%
                        </span>
                      </div>
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
              ))}
            </div>
          )}

          {/* Skills Section */}
          {analysis.section_scores.skills && (
            <div className="p-3.5 bg-[#161c30] border border-indigo-500/25 rounded-xl mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-100">🛠️ Skills</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.skills.score) }}
                >
                  {Math.round(analysis.section_scores.skills.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.skills.score} small />
              {!tailoredSkills && analysis.section_scores.skills.score < 85 && analysis.section_scores.skills.recommendation && (
                <p className="text-xs text-slate-400 mb-2">{analysis.section_scores.skills.recommendation}</p>
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
                    <div className="mt-1.5">
                      <SkillBadges skills={tailoredSkills.keywords_incorporated} type="matched" />
                    </div>
                  )}
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
          )}

          {/* Recommendations & 95%+ Target */}
          {overallScore >= 85 ? (
            <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border border-emerald-500/30 rounded-xl mb-3">
              <div className="text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1">
                🚀 How to reach 95%+ ATS Score
              </div>
              <ul className="text-xs text-emerald-200/90 space-y-1">
                {analysis.missing_skills.length > 0 ? (
                  <li>• Weave remaining keywords into your bullets: <strong>{analysis.missing_skills.slice(0, 3).join(', ')}</strong></li>
                ) : (
                  <li>• All keywords matched! Quantify more metrics (% or numbers) in older experience entries.</li>
                )}
                <li>• Re-tailor any entry below 80% using action verbs (Architected, Engineered) and quantifiable metrics.</li>
              </ul>
            </div>
          ) : (
            analysis.recommendations.length > 0 && (
              <div className="p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl mb-3">
                <div className="text-xs font-semibold text-indigo-300 mb-1">💡 Recommendations</div>
                <ul className="text-xs text-indigo-200/90 space-y-0.5">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Apply / Revert */}
          {hasTailoredAnything && (
            <div className="space-y-2 mt-4">
              {!applied ? (
                <button
                  onClick={applyAll}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs tracking-wide uppercase shadow-md transition-all cursor-pointer"
                >
                  ✅ Apply All Changes
                </button>
              ) : (
                <>
                  <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 text-center font-semibold">
                    ✅ Changes applied! Live resume updated.
                  </div>
                  <button
                    onClick={revertAll}
                    className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                  >
                    ↩️ Revert All Changes
                  </button>
                </>
              )}
            </div>
          )}
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
