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
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold" style={{ color: scoreColor(score) }}>
          {Math.round(score)}%
        </span>
      </div>
    )}
    <div className={`w-full bg-gray-200 rounded-full ${small ? 'h-1.5' : 'h-2'}`}>
      <div
        className={`${small ? 'h-1.5' : 'h-2'} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(score, 0), 100)}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  </div>
);

const SkillBadges = ({ skills, type }: { skills: string[]; type: 'matched' | 'missing' | 'partial' }) => {
  const colors = {
    matched: 'bg-green-100 text-green-700',
    missing: 'bg-red-100 text-red-600',
    partial: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s, i) => (
        <span key={i} className={`px-2 py-0.5 rounded text-xs ${colors[type]}`}>
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
      const res = await tailorSummary(sectionsRef.current as any, jd);
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
        const res = await tailorBullets(sectionsRef.current as any, jd, index);
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
      const res = await tailorSkills(sectionsRef.current as any, jd);
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
    // 1. Apply summary
    if (tailoredSummary) {
      const cur = useBasicDetails.getState().values;
      useBasicDetails.getState().reset({ ...cur, summary: tailoredSummary.tailored_summary });
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
            ? cats['Languages'].split(',').map((s: string) => ({ name: s.trim(), level: 0 }))
            : [];
        if (items.length) useLanguages.getState().reset(items);
      }
      if (cats['Frameworks']) {
        const items =
          typeof cats['Frameworks'] === 'string'
            ? cats['Frameworks'].split(',').map((s: string) => ({ name: s.trim(), level: 0 }))
            : [];
        if (items.length) useFrameworks.getState().reset(items);
      }
      if (cats['Technologies']) {
        const items =
          typeof cats['Technologies'] === 'string'
            ? cats['Technologies'].split(',').map((s: string) => ({ name: s.trim(), level: 0 }))
            : [];
        if (items.length) useTechnologies.getState().reset(items);
      }
      if (cats['Tools']) {
        const items =
          typeof cats['Tools'] === 'string'
            ? cats['Tools'].split(',').map((s: string) => ({ name: s.trim(), level: 0 }))
            : [];
        if (items.length) useTools.getState().reset(items);
      }
      if (cats['Databases']) {
        const items =
          typeof cats['Databases'] === 'string'
            ? cats['Databases'].split(',').map((s: string) => ({ name: s.trim(), level: 0 }))
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
          <h2 className="text-2xl font-bold mb-3">Tailor Resume</h2>
          <p className="text-sm text-gray-600 mb-3">
            Paste a job description to analyze your resume's ATS compatibility, then tailor section by section.
          </p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || jd.trim().length < 50}
            className="w-full mt-3 py-2.5 px-4 bg-resume-800 text-white rounded-md font-semibold text-sm hover:bg-resume-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Match'}
          </button>
        </>
      )}

      {/* Step 2: Analysis + Section Tailoring */}
      {step === 'analysis' && analysis && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">📊 Analysis</h2>
            <button onClick={startOver} className="text-xs text-blue-600 hover:underline">
              ← New JD
            </button>
          </div>

          {/* Overall Score */}
          <div className="p-4 bg-white rounded-lg shadow-sm border mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Overall ATS Score</span>
              <span
                className="text-3xl font-bold transition-colors duration-300"
                style={{ color: scoreColor(overallScore) }}
              >
                {Math.round(overallScore)}%
              </span>
            </div>
            <ScoreBar score={overallScore} />
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-gray-500">
              <div>Keywords: {Math.round(analysis.breakdown.keyword_score)}%</div>
              <div>Semantic: {Math.round(analysis.breakdown.semantic_score)}%</div>
              <div>Format: {Math.round(analysis.breakdown.format_score)}%</div>
              <div>Completeness: {Math.round(analysis.breakdown.completeness_score)}%</div>
            </div>
          </div>

          {/* JD Info */}
          {analysis.jd_analysis?.jobTitle && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-xs mb-4">
              <span className="font-semibold text-purple-800">Target Role:</span>{' '}
              <span className="text-purple-700 font-medium">
                {analysis.jd_analysis.jobTitle}
                {analysis.jd_analysis.company && ` at ${analysis.jd_analysis.company}`}
                {analysis.jd_analysis.seniority && ` (${analysis.jd_analysis.seniority})`}
              </span>
            </div>
          )}

          {/* Skills Overview */}
          <div className="space-y-2 mb-4">
            {analysis.matched_skills.length > 0 && (
              <div className="p-2.5 bg-green-50 border border-green-200 rounded">
                <div className="text-xs font-semibold text-green-800 mb-1">
                  ✅ Matched ({analysis.matched_skills.length})
                </div>
                <SkillBadges skills={analysis.matched_skills.map((s) => s.skill)} type="matched" />
              </div>
            )}
            {analysis.missing_skills.length > 0 && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-semibold text-red-700 mb-1">
                  ❌ Missing ({analysis.missing_skills.length})
                </div>
                <SkillBadges skills={analysis.missing_skills} type="missing" />
              </div>
            )}
            {analysis.partial_matches.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
                <div className="text-xs font-semibold text-amber-700 mb-1">
                  ⚠️ Partial ({analysis.partial_matches.length})
                </div>
                <SkillBadges skills={analysis.partial_matches.map((s) => s.skill)} type="partial" />
              </div>
            )}
          </div>

          {/* Section-by-Section Scores + Tailor Buttons */}
          <h3 className="text-sm font-bold text-gray-700 mb-2">Section Scores & Tailoring</h3>

          {/* Summary Section */}
          {analysis.section_scores.summary && (
            <div className="p-3 bg-white border rounded-lg mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">📝 Summary</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.summary.score) }}
                >
                  {Math.round(analysis.section_scores.summary.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.summary.score} small />
              {!tailoredSummary && analysis.section_scores.summary.score < 85 && analysis.section_scores.summary.recommendation && (
                <p className="text-xs text-gray-500 mb-2">{analysis.section_scores.summary.recommendation}</p>
              )}
              {tailoredSummary ? (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-green-700">✅ Tailored</span>
                    <span className="text-green-700 font-bold">
                      {Math.round(tailoredSummary.before_score)}% → {Math.round(tailoredSummary.after_score)}%
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-3 leading-relaxed">{tailoredSummary.tailored_summary}</p>
                </div>
              ) : (
                <button
                  onClick={handleTailorSummary}
                  disabled={tailoringSection === 'summary'}
                  className="w-full py-1.5 px-3 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {tailoringSection === 'summary' ? '⏳ Tailoring Summary...' : 'Tailor Summary'}
                </button>
              )}
            </div>
          )}

          {/* Experience Section */}
          {analysis.section_scores.experience && (
            <div className="p-3 bg-white border rounded-lg mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">💼 Experience</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.experience.score) }}
                >
                  {Math.round(analysis.section_scores.experience.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.experience.score} small />
              {analysis.section_scores.experience.score < 80 && analysis.section_scores.experience.recommendation && (
                <p className="text-xs text-gray-500 mb-2">{analysis.section_scores.experience.recommendation}</p>
              )}

              {/* Per-entry */}
              {(analysis.section_scores.experience as any).entries?.map((entry: any, i: number) => (
                <div key={i} className="ml-2 mt-2 p-2 border-l-2 border-gray-200 bg-gray-50/50 rounded-r">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-800">
                      {entry.title || entry.company || `Entry ${i + 1}`}
                    </span>
                    <span className="text-xs font-bold" style={{ color: scoreColor(entry.score) }}>
                      {Math.round(entry.score)}%
                    </span>
                  </div>
                  <ScoreBar score={entry.score} small />
                  {tailoredBullets[i] ? (
                    <div className="mt-1 p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-700">✅ Tailored</span>
                        <span className="text-green-700 font-bold">
                          {Math.round(tailoredBullets[i].before_score)}% → {Math.round(tailoredBullets[i].after_score)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTailorBullets(i)}
                      disabled={tailoringSection === `bullets-${i}`}
                      className="w-full mt-1 py-1 px-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
            <div className="p-3 bg-white border rounded-lg mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">🛠️ Skills</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: scoreColor(analysis.section_scores.skills.score) }}
                >
                  {Math.round(analysis.section_scores.skills.score)}%
                </span>
              </div>
              <ScoreBar score={analysis.section_scores.skills.score} small />
              {!tailoredSkills && analysis.section_scores.skills.score < 85 && analysis.section_scores.skills.recommendation && (
                <p className="text-xs text-gray-500 mb-2">{analysis.section_scores.skills.recommendation}</p>
              )}
              {tailoredSkills ? (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-green-700">✅ Skills Categorized & Added</span>
                    <span className="text-green-700 font-bold">
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
                  className="w-full py-1.5 px-3 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {tailoringSection === 'skills' ? '⏳ Categorizing & Adding...' : 'Tailor & Add Skills'}
                </button>
              )}
            </div>
          )}

          {/* Recommendations & 95%+ Target */}
          {overallScore >= 85 ? (
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded mb-3">
              <div className="text-xs font-bold text-green-900 mb-1 flex items-center gap-1">
                🚀 How to reach 95%+ ATS Score
              </div>
              <ul className="text-xs text-green-800 space-y-1">
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                <div className="text-xs font-semibold text-blue-800 mb-1">💡 Recommendations</div>
                <ul className="text-xs text-blue-700 space-y-0.5">
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
                  className="w-full py-2.5 px-4 bg-green-600 text-white rounded-md font-semibold text-sm hover:bg-green-700 shadow-xs transition-colors"
                >
                  ✅ Apply All Changes
                </button>
              ) : (
                <>
                  <div className="p-2.5 bg-green-50 border border-green-200 rounded text-xs text-green-700 text-center font-medium">
                    ✅ Changes applied! Live resume updated.
                  </div>
                  <button
                    onClick={revertAll}
                    className="w-full py-2 px-4 bg-amber-500 text-white rounded-md font-semibold text-sm hover:bg-amber-600 shadow-xs transition-colors"
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
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}
    </div>
  );
};

export default TailorLayout;
