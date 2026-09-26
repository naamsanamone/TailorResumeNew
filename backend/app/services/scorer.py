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
    has_supplementary = any(t in section_types for t in ("summary", "projects", "certifications", "list", "custom", "awards")) or any(
        "project" in (s.get("name") or "").lower() or "certif" in (s.get("name") or "").lower() for s in resume_sections
    )
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
    # Technical & Engineering
    "architect", "architected", "engineer", "engineered", "develop", "developed",
    "build", "built", "implement", "implemented", "design", "designed",
    "create", "created", "spearhead", "spearheaded", "optimize", "optimized",
    "automate", "automated", "orchestrate", "orchestrated", "streamline", "streamlined",
    "deploy", "deployed", "scale", "scaled", "integrate", "integrated",
    "refactor", "refactored", "migrate", "migrated", "enhance", "enhanced",
    "accelerate", "accelerated", "program", "programmed", "code", "coded",
    "write", "wrote", "test", "tested", "debug", "debugged", "launch", "launched",
    "configure", "configured", "provision", "provisioned", "instrument", "instrumented",
    "diagnose", "diagnosed", "triage", "triaged", "modernize", "modernized",
    "revamp", "revamped", "restructure", "restructured", "reorganize", "reorganized",
    "standardize", "standardized", "consolidate", "consolidated", "simplify", "simplified",
    # Leadership, Management & Coordination
    "lead", "led", "manage", "managed", "direct", "directed", "guide", "guided",
    "oversee", "oversaw", "supervise", "supervised", "coordinate", "coordinated",
    "mentor", "mentored", "coach", "coached", "train", "trained", "drive", "drove",
    "champion", "championed", "pioneer", "pioneered", "spearhead", "spearheaded",
    "collaborate", "collaborated", "facilitate", "facilitated", "negotiate", "negotiated",
    "present", "presented", "publish", "published", "author", "authored",
    # Execution, Analysis & Operations
    "execute", "executed", "deliver", "delivered", "maintain", "maintained",
    "resolve", "resolved", "leverage", "leveraged", "conduct", "conducted",
    "transform", "transformed", "establish", "established", "formulate", "formulated",
    "produce", "produced", "boost", "boosted", "reduce", "reduced",
    "increase", "increased", "improve", "improved", "save", "saved",
    "generate", "generated", "achieve", "achieved", "expand", "expanded",
    "grow", "grew", "maximize", "maximized", "minimize", "minimized",
    "outperform", "outperformed", "yield", "yielded", "analyze", "analyzed",
    "assess", "assessed", "monitor", "monitored", "audit", "audited",
    "evaluate", "evaluated", "benchmark", "benchmarked", "devise", "devised",
    "conceptualize", "conceptualized", "initiate", "initiated", "strengthen", "strengthened",
    "upgrade", "upgraded", "support", "supported", "assist", "assisted",
    "provide", "provided", "define", "defined", "suggest", "suggested",
    "use", "used", "utilize", "utilized", "interact", "interacted",
    "keep", "kept", "administer", "administered"
}

import re

def _has_metric(text: str) -> bool:
    """Check if text contains quantifiable metric: %, $, numbers with scale, teams, units."""
    return bool(re.search(r'(?:\b\d+(?:[,\.]\d+)?\s*(?:%|\+|x|k|m|b|million|billion|users?|clients?|customers?|teams?|engineers?|developers?|members?|hours?|days?|weeks?|months?|years?|ms|seconds?|minutes?|requests?|transactions?|queries?|endpoints?|microservices?|servers?|nodes?|clusters?)\b|\$[\d,]+(?:\.\d+)?(?:k|m|b)?|\b\d+[- ](?:person|member|team)\b|\b\d{2,}\b)', text, re.IGNORECASE))

def _has_action_verb(text: str) -> bool:
    """Check if text starts with a strong action verb (handles bullet prefixes and adverbs)."""
    clean = re.sub(r'^[-*•\d.)\s]+', '', text).strip()
    words = [re.sub(r'[^a-zA-Z]', '', w).lower() for w in clean.split()[:3]]
    return any(w in ACTION_VERBS for w in words if w)

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
                title_words = [w for w in target_title.split() if len(w) > 3 and w not in ("entry", "level", "senior", "junior", "lead", "at", "the")]
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
        length_pts = 30.0 if 25 <= word_count <= 85 else (20.0 if word_count > 15 else 10.0)

        total_score = max(35.0, min(100.0, title_pts + skill_pts + length_pts))
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
                all_entry_scores.append({"title": entry.get("title", ""), "company": entry.get("company", ""), "score": 35.0, "matched": [], "missing": core_skills[:3]})
                continue

            entry_text = " ".join(bullets).lower()

            # 1. Structure & Quality (25 pts)
            word_counts = [len(b.strip().split()) for b in bullets if b.strip()]
            avg_words = sum(word_counts) / max(1, len(word_counts))
            base_pts = 15.0
            if len(bullets) >= 2: base_pts += 5.0
            if 8 <= avg_words <= 40: base_pts += 5.0

            # 2. Action verbs (25 pts)
            action_count = sum(1 for b in bullets if _has_action_verb(b))
            action_pts = (action_count / len(bullets)) * 25.0

            # 3. Quantifiable metrics (25 pts) - 40%+ bullets gives full metric pts
            metric_count = sum(1 for b in bullets if _has_metric(b))
            metric_target = max(1, int(len(bullets) * 0.4 + 0.99))
            metric_pts = min(25.0, (metric_count / metric_target) * 25.0)

            # 4. Core skills alignment (25 pts)
            entry_matched = []
            for s in core_skills:
                if skill_in_text(s, entry_text):
                    entry_matched.append(s)
                    overall_matched.add(s)

            skill_pts = min(25.0, (len(entry_matched) / 2.0) * 25.0)

            raw_entry_score = base_pts + action_pts + metric_pts + skill_pts
            entry_score = max(35.0, min(100.0, raw_entry_score))
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

        rec = "Add quantifiable metrics (% and numbers) and JD keywords to your bullets." if avg_score < 75 else "Experience bullets demonstrate strong achievements."

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

    elif sec_type == "projects" or "project" in (section.get("name") or "").lower():
        bullets = []
        if isinstance(section.get("items"), list) and section["items"]:
            bullets = [str(x) for x in section["items"] if x]
        elif isinstance(section.get("entries"), list) and section["entries"]:
            for entry in section["entries"]:
                if isinstance(entry.get("bullets"), list):
                    bullets.extend([str(b) for b in entry["bullets"] if b])
                elif entry.get("description"):
                    bullets.append(str(entry["description"]))
                elif entry.get("summary"):
                    bullets.append(str(entry["summary"]))
                elif entry.get("title") or entry.get("name"):
                    bullets.append(str(entry.get("title") or entry.get("name")))
        elif section.get("text"):
            bullets = [str(section["text"]).strip()]

        if not bullets:
            return {"score": 0.0, "matched": [], "missing": core_skills[:4], "recommendation": "Add technical projects highlighting relevant domain tools and quantifiable achievements."}

        all_project_text = " ".join(bullets).lower()
        matched = [s for s in core_skills if skill_in_text(s, all_project_text)]
        skill_pts = min(35.0, (len(matched) / 2.5) * 35.0)

        action_count = sum(1 for b in bullets if _has_action_verb(b))
        action_pts = (action_count / len(bullets)) * 20.0 if bullets else 0.0

        metric_count = sum(1 for b in bullets if _has_metric(b))
        metric_target = max(1, int(len(bullets) * 0.3 + 0.99))
        metric_pts = min(15.0, (metric_count / metric_target) * 15.0)

        word_counts = [len(b.strip().split()) for b in bullets if b.strip()]
        avg_words = sum(word_counts) / max(1, len(word_counts))
        structure_pts = 15.0
        if len(bullets) >= 2: structure_pts += 8.0
        if 10 <= avg_words <= 45: structure_pts += 7.0

        raw_score = skill_pts + action_pts + metric_pts + structure_pts
        total_score = max(35.0, min(100.0, raw_score))
        missing = [s for s in core_skills if s not in matched][:5]

        rec = f"Integrate key target tech stack into projects: {', '.join(missing[:3])}" if skill_pts < 20 else ("Add quantifiable project outcomes (e.g. latency reduced by 40%, 10K+ active users)." if metric_pts < 10 else "Project bullets showcase strong technical execution and outcomes.")

        return {
            "score": round(total_score, 1),
            "matched": matched,
            "missing": missing,
            "recommendation": rec
        }

    elif sec_type in ("certifications", "certificates") or "certif" in (section.get("name") or "").lower():
        cert_list = []
        if isinstance(section.get("items"), list):
            cert_list = [str(x) for x in section["items"] if x]
        elif isinstance(section.get("entries"), list):
            cert_list = [str(e.get("name") or e.get("title") or e) for e in section["entries"] if e]
        elif section.get("text"):
            cert_list = [str(section["text"]).strip()]

        if not cert_list:
            return {"score": 0.0, "matched": [], "missing": ["Relevant cloud/industry certification (e.g. AWS, CKA, PMP)"], "recommendation": "Add industry certifications or credentials relevant to target requirements."}

        joined_text = " ".join(cert_list).lower()
        matched = [s for s in core_skills if skill_in_text(s, joined_text)]
        known_kws = ["aws", "amazon", "azure", "gcp", "google cloud", "kubernetes", "cka", "ckad", "terraform", "docker", "cissp", "ceh", "comptia", "security+", "pmp", "scrum", "agile", "csm", "oracle", "certified", "architect", "developer", "administrator", "associate", "professional"]
        for kw in known_kws:
            if kw in joined_text and kw not in matched:
                matched.append(kw)

        cred_pts = min(40.0, (len(matched) / 2.0) * 40.0)
        has_formal = bool(re.search(r'\b(?:certified|architect|professional|specialist|associate|administrator|engineer|pmp|csm|ccna)\b', joined_text, re.I))
        issuer_pts = 30.0 if has_formal else 18.0
        quantity_pts = 30.0 if len(cert_list) >= 2 else 20.0

        raw_score = cred_pts + issuer_pts + quantity_pts
        total_score = max(40.0, min(100.0, raw_score))
        missing = [s for s in core_skills if s not in matched][:3]
        rec = "Certifications validate core domain expertise." if total_score >= 80 else "Highlight recognized cloud or domain certifications (e.g., AWS, Azure, GCP, CKA)."

        return {
            "score": round(total_score, 1),
            "matched": matched,
            "missing": missing,
            "recommendation": rec
        }

    elif sec_type in ("education", "academic") or "education" in (section.get("name") or "").lower():
        entries = section.get("entries") or []
        text = (section.get("text") or "").lower()
        if not entries and not text:
            return {"score": 0.0, "matched": [], "missing": ["Degree (e.g. B.S. in Computer Science)"], "recommendation": "Add your degree, university, and graduation year."}

        all_edu = " ".join([f"{e.get('degree','')} {e.get('institution','')} {e.get('year','')}" for e in entries]) + " " + text
        has_degree = bool(re.search(r'\b(?:bachelor|master|phd|b\.?s|m\.?s|b\.?tech|m\.?tech|associate|doctorate|degree|b\.?a)\b', all_edu, re.I))
        has_tech_major = bool(re.search(r'\b(?:computer|software|engineering|information|data|science|electrical|mathematics|tech)\b', all_edu, re.I))

        degree_pts = 40.0 if (has_degree and has_tech_major) else (30.0 if has_degree else 20.0)
        has_inst = bool(entries and any(e.get("institution") for e in entries)) or bool(re.search(r'\b(?:university|college|institute|school|academy)\b', all_edu, re.I))
        has_time = bool(entries and any(e.get("year") for e in entries)) or bool(re.search(r'\b(?:19|20)\d{2}\b', all_edu))
        inst_pts = 35.0 if (has_inst and has_time) else (25.0 if (has_inst or has_time) else 15.0)
        has_details = bool(re.search(r'\b(?:gpa|honor|cum laude|dean|coursework|scholar|magna|summa)\b', all_edu, re.I)) or bool(entries and any(e.get("gpa") for e in entries))
        detail_pts = 25.0 if has_details else 20.0

        total_score = max(40.0, min(100.0, degree_pts + inst_pts + detail_pts))
        rec = "Education credentials meet standard ATS role criteria." if total_score >= 80 else "Include degree title, field of study, institution name, and graduation year."

        return {
            "score": round(total_score, 1),
            "matched": ["STEM / Relevant Degree"] if has_tech_major else [],
            "missing": [] if has_tech_major else ["Relevant Field of Study"],
            "recommendation": rec
        }

    return {"score": 50.0, "matched": [], "missing": [], "recommendation": ""}
