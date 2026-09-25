import logging
from typing import Dict, Any, List, Optional
from app.services.jd_analyzer import analyze_job_description
from app.services.matcher import match_resume_to_jd, skill_in_text

logger = logging.getLogger(__name__)

def _calibrate_semantic_score(raw: float) -> float:
    """Calibrate raw bi-encoder cosine similarity to an intuitive 0-100 ATS percentage.
    In SentenceTransformers (all-MiniLM-L6-v2), whole-document cross-text similarity
    typically ranges from 0.25 (unrelated) to 0.70+ (exceptionally strong alignment).
    """
    if raw <= 0.25:
        return max(0.0, (raw / 0.25) * 30.0)
    if raw < 0.50:
        return 30.0 + ((raw - 0.25) / 0.25) * 40.0
    return min(100.0, 70.0 + ((raw - 0.50) / 0.20) * 30.0)


async def calculate_ats_score(
    resume_sections: List[Dict[str, Any]], 
    jd_text: str, 
    jd_analysis: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Calculate composite ATS score for a resume against a JD."""
    
    if not jd_analysis:
        jd_analysis = await analyze_job_description(jd_text)
        
    match_results = await match_resume_to_jd(resume_sections, jd_analysis)
    
    keyword_score = match_results["keyword_match_rate"] * 100
    semantic_score = _calibrate_semantic_score(match_results["semantic_similarity"])
    format_score = 100.0
    completeness_score = 100.0
    
    section_types = [sec.get("type", "").lower() for sec in resume_sections]
    
    # 4 Core ATS sections: header, skills, experience, education (20 pts each = 80 pts)
    core_sections = ["header", "skills", "experience", "education"]
    missing_sections = []
    for sec in core_sections:
        if sec not in section_types:
            completeness_score -= 20.0
            missing_sections.append(sec)
            
    # Remaining 20 pts: Summary OR Projects OR Certifications (standard ATS alternatives)
    has_supplementary = any(t in section_types for t in ("summary", "projects", "list", "custom"))
    if not has_supplementary:
        completeness_score -= 20.0
        missing_sections.append("summary or projects")

            
    if not any(t == "experience" for t in section_types):
        format_score -= 30.0
    else:
        for sec in resume_sections:
            if sec.get("type") == "experience":
                has_bullets = any(len(entry.get("bullets", [])) > 0 for entry in sec.get("entries", []))
                if not has_bullets:
                    format_score -= 20.0
                    break
                    
    keyword_score = max(0, min(100, keyword_score))
    semantic_score = max(0, min(100, semantic_score))
    format_score = max(0, min(100, format_score))
    completeness_score = max(0, min(100, completeness_score))
    
    composite = (keyword_score * 0.50) + (semantic_score * 0.25) + (format_score * 0.15) + (completeness_score * 0.10)
    composite = max(0, min(100, composite))
    
    recommendations = []
    if missing_sections:
        recommendations.append(f"Add missing standard sections: {', '.join(missing_sections).title()}")
    
    missing_skills = match_results["missing_skills"]
    if missing_skills:
        top_missing = missing_skills[:4]
        if composite >= 85:
            recommendations.append(f"To reach 95%+, incorporate remaining keywords: {', '.join(top_missing)}")
        else:
            recommendations.append(f"Incorporate missing keywords naturally: {', '.join(top_missing)}")
    elif composite >= 88:
        recommendations.append("Outstanding match! Your resume covers all core technical and domain qualifications.")
        
    if format_score < 100:
        recommendations.append("Ensure your experience section uses bullet points starting with action verbs.")
        
    return {
        "ats_score": round(composite, 1),
        "breakdown": {
            "keyword_score": round(keyword_score, 1),
            "semantic_score": round(semantic_score, 1),
            "format_score": round(format_score, 1),
            "completeness_score": round(completeness_score, 1)
        },
        "matched_skills": match_results["matched_skills"],
        "partial_matches": match_results["partial_matches"],
        "missing_skills": missing_skills,
        "recommendations": recommendations,
        "jd_analysis": jd_analysis
    }


ACTION_VERBS = {
    "architected", "engineered", "developed", "built", "implemented", "designed",
    "created", "spearheaded", "optimized", "automated", "orchestrated", "streamlined",
    "led", "managed", "deployed", "scaled", "integrated", "delivered", "executed",
    "maintained", "resolved", "refactored", "migrated", "enhanced", "accelerated",
    "leveraged", "conducted", "directed", "transformed", "established", "formulated",
    "championed", "pioneered", "boosted", "produced", "authored", "facilitated"
}

import re

def _has_metric(text: str) -> bool:
    """Check if text contains quantifiable metric: %, $, numbers with scale."""
    return bool(re.search(r'\b\d+(?:\.\d+)?%?|\$\d+', text))

def _has_action_verb(text: str) -> bool:
    """Check if text starts with a strong action verb."""
    words = [w.lower().rstrip(',.:;') for w in text.strip().split()[:2]]
    return any(w in ACTION_VERBS for w in words)

async def calculate_section_score(section: Dict[str, Any], jd_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate an intuitive, meaningful score (0-100) for an individual section."""
    sec_type = (section.get("type") or "").lower()

    # Collect JD hard skills, tools, and key requirements
    core_skills = []
    for k in ("hardSkills", "tools", "softSkills"):
        for s in (jd_analysis.get(k) or []):
            if isinstance(s, str) and s.strip():
                core_skills.append(s.strip())
    core_skills = list(dict.fromkeys(core_skills))

    target_title = (jd_analysis.get("jobTitle") or "").lower()

    if sec_type == "summary":
        text = (section.get("text") or "").lower()
        if not text:
            return {"score": 0.0, "matched": [], "missing": core_skills[:5], "recommendation": "Add a professional summary tailored to this role."}

        # 1. Target Title Match (35 pts)
        title_pts = 0.0
        if target_title:
            if target_title in text:
                title_pts = 35.0
            else:
                title_words = [w for w in target_title.split() if len(w) > 3 and w not in ("entry", "level", "senior", "junior", "lead")]
                matched_words = [w for w in title_words if w in text]
                title_pts = (len(matched_words) / len(title_words) * 35.0) if title_words else 15.0
        else:
            title_pts = 25.0

        # 2. Key Skills in Summary (35 pts)
        matched = []
        for s in core_skills:
            if skill_in_text(s, text):
                matched.append(s)

        skill_pts = min(35.0, (len(matched) / 3.0) * 35.0)

        # 3. Completeness & Length (30 pts)
        word_count = len(text.split())
        length_pts = 30.0 if 25 <= word_count <= 80 else (20.0 if word_count > 15 else 10.0)

        total_score = min(100.0, title_pts + skill_pts + length_pts)
        missing = [s for s in core_skills if s not in matched][:5]

        rec = ""
        if title_pts < 20 and target_title:
            rec = f'Mention target role "{jd_analysis.get("jobTitle", "")}" and key skills: {", ".join(missing[:3])}'
        elif skill_pts < 25:
            rec = f'Add core technical keywords: {", ".join(missing[:3])}'
        else:
            rec = "Summary strongly aligns with the target role."

        return {
            "score": round(total_score, 1),
            "matched": matched,
            "missing": missing,
            "recommendation": rec
        }

    elif sec_type == "experience":
        entries = section.get("entries") or []
        if not entries:
            return {"score": 0.0, "matched": [], "missing": core_skills[:5], "recommendation": "Add your work experience."}

        all_entry_scores = []
        overall_matched = set()

        for entry in entries:
            bullets = entry.get("bullets") or []
            if not bullets:
                all_entry_scores.append({"score": 10.0, "matched": [], "missing": core_skills[:3]})
                continue

            entry_text = " ".join(bullets).lower()

            action_count = sum(1 for b in bullets if _has_action_verb(b))
            action_pts = (action_count / len(bullets)) * 35.0

            metric_count = sum(1 for b in bullets if _has_metric(b))
            metric_pts = (metric_count / len(bullets)) * 35.0

            entry_matched = []
            for s in core_skills:
                if skill_in_text(s, entry_text):
                    entry_matched.append(s)
                    overall_matched.add(s)

            skill_pts = min(30.0, (len(entry_matched) / 2.0) * 30.0)
            entry_score = min(100.0, action_pts + metric_pts + skill_pts)
            entry_missing = [s for s in core_skills if s not in entry_matched][:3]

            all_entry_scores.append({
                "title": entry.get("title", ""),
                "company": entry.get("company", ""),
                "score": round(entry_score, 1),
                "matched": entry_matched,
                "missing": entry_missing
            })

        avg_score = sum(e["score"] for e in all_entry_scores) / len(all_entry_scores)
        overall_missing = [s for s in core_skills if s not in overall_matched][:5]

        rec = "Add quantifiable metrics (% and numbers) and JD keywords to your bullets." if avg_score < 70 else "Experience bullets demonstrate strong achievements."

        return {
            "score": round(avg_score, 1),
            "matched": list(overall_matched),
            "missing": overall_missing,
            "entries": all_entry_scores,
            "recommendation": rec
        }

    elif sec_type == "skills":
        cats = section.get("categories") or {}
        items = section.get("items") or []

        all_skills_text = []
        if isinstance(cats, dict):
            for v in cats.values():
                if isinstance(v, str): all_skills_text.append(v)
                elif isinstance(v, list): all_skills_text.extend([str(x) for x in v])
        if isinstance(items, list):
            all_skills_text.extend([str(x) for x in items])
        joined_text = " ".join(all_skills_text).lower()

        matched = []
        for s in core_skills:
            if skill_in_text(s, joined_text):
                matched.append(s)


        if core_skills:
            coverage = len(matched) / min(10, len(core_skills))
            score = min(100.0, coverage * 100.0)
        else:
            score = 70.0

        missing = [s for s in core_skills if s not in matched]
        rec = f"Add missing core skills: {', '.join(missing[:4])}" if missing else "All key skills are covered."

        return {
            "score": round(score, 1),
            "matched": matched,
            "missing": missing,
            "recommendation": rec
        }

    return {"score": 50.0, "matched": [], "missing": [], "recommendation": ""}
