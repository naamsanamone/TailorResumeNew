"""TailorResume — Resume Tailoring API Routes (Auth-free MVP)"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import copy
import json
import logging
import re

from app.schemas.score import TailorRequest, TailorResponse, ScoreBreakdown
from app.schemas.resume import ResumeSection
from app.services.tailor_engine import tailor_resume, _expand_acronyms_in_skills, ACRONYM_MAP
from app.services.jd_analyzer import analyze_job_description
from app.services.matcher import match_resume_to_jd
from app.services.scorer import calculate_ats_score, calculate_section_score
from app.services.llm_client import get_llm_client
from app.prompts.templates import TAILOR_BULLETS_PROMPT, TAILOR_SUMMARY_PROMPT

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------- Full Tailor (existing) ----------

@router.post("/", response_model=TailorResponse)
async def tailor_resume_endpoint(request: TailorRequest):
    """Tailor a resume to match a specific job description."""
    try:
        sections = [s.model_dump() for s in request.resume_content]
        result = await tailor_resume(sections, request.job_description)

        breakdown = ScoreBreakdown(
            keyword_score=result.get("score_breakdown", {}).get("keyword_score", 0),
            semantic_score=result.get("score_breakdown", {}).get("semantic_score", 0),
            format_score=result.get("score_breakdown", {}).get("format_score", 0),
            completeness_score=result.get("score_breakdown", {}).get("completeness_score", 0),
        )

        tailored_sections = [ResumeSection(**s) for s in result.get("tailored_sections", sections)]

        return TailorResponse(
            tailored_content=tailored_sections,
            ats_score=result.get("ats_score", 0),
            score_breakdown=breakdown,
            keywords_added=result.get("keywords_added", []),
            changes_summary=result.get("changes_summary", []),
        )
    except Exception as e:
        logger.error(f"Failed to tailor resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor resume: {str(e)}")


# ---------- Per-Section Endpoints ----------

class TailorSummaryRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)

class TailorSummaryResponse(BaseModel):
    tailored_summary: str
    keywords_incorporated: List[str] = []
    before_score: float = 0
    after_score: float = 0
    ats_score: float = 0

class TailorBulletsRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)
    entry_index: int = 0  # which experience entry to tailor

class TailorBulletsResponse(BaseModel):
    tailored_bullets: List[str] = []
    keywords_incorporated: List[str] = []
    before_score: float = 0
    after_score: float = 0
    ats_score: float = 0

class TailorSkillsRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)

class TailorSkillsResponse(BaseModel):
    tailored_skills: Dict[str, Any] = {}
    keywords_incorporated: List[str] = []
    before_score: float = 0
    after_score: float = 0
    ats_score: float = 0


@router.post("/summary", response_model=TailorSummaryResponse)
async def tailor_summary_endpoint(request: TailorSummaryRequest):
    """Tailor only the professional summary section."""
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = await analyze_job_description(request.job_description)

        # Find original summary section
        orig_sec = None
        orig_summary = ""
        for sec in sections:
            if sec.get("type", "").lower() == "summary":
                orig_sec = sec
                orig_summary = sec.get("text", "") or ""
                break
        if not orig_sec:
            orig_sec = {"type": "summary", "text": ""}

        # Before section score
        before_section_score = (await calculate_section_score(orig_sec, jd_analysis))["score"]

        match_results = await match_resume_to_jd(sections, jd_analysis)
        missing_skills = [s for s in match_results.get("missing_skills", []) if isinstance(s, str)]

        client = get_llm_client(for_content=True)
        prompt = TAILOR_SUMMARY_PROMPT.format(
            original_summary=orig_summary,
            job_title=jd_analysis.get("jobTitle") or "Software Engineer",
            company=jd_analysis.get("company") or "the company",
            hard_skills=", ".join([s for s in (jd_analysis.get("hardSkills") or []) if isinstance(s, str)]),
            soft_skills=", ".join([s for s in (jd_analysis.get("softSkills") or []) if isinstance(s, str)]),
            missing_skills=", ".join(missing_skills[:5])
        )

        result = await client.complete_json(
            prompt,
            "You are an expert resume writer. Do not fabricate experience. Do not use asterisks or markdown bolding."
        )

        tailored = result.get("summary", orig_summary) if isinstance(result, dict) else orig_summary
        # Clean any asterisks from summary
        tailored = re.sub(r'\*\*(.*?)\*\*', r'\1', str(tailored)).replace('*', '').strip()

        kw = result.get("keywords_incorporated", []) if isinstance(result, dict) else []

        # After section score
        tailored_sec = {"type": "summary", "text": tailored}
        after_section_score = (await calculate_section_score(tailored_sec, jd_analysis))["score"]

        # Calculate new overall ATS score
        updated_sections = copy.deepcopy(sections)
        for sec in updated_sections:
            if sec.get("type", "").lower() == "summary":
                sec["text"] = tailored
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorSummaryResponse(
            tailored_summary=tailored,
            keywords_incorporated=[str(k) for k in kw] if isinstance(kw, list) else [],
            before_score=before_section_score,
            after_score=after_section_score,
            ats_score=score_data.get("ats_score", 0),
        )
    except Exception as e:
        logger.error(f"Failed to tailor summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor summary: {str(e)}")


@router.post("/bullets", response_model=TailorBulletsResponse)
async def tailor_bullets_endpoint(request: TailorBulletsRequest):
    """Tailor bullet points for a specific experience entry."""
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = await analyze_job_description(request.job_description)

        # Find experience section and specific entry
        exp_section = None
        for sec in sections:
            if sec.get("type", "").lower() == "experience":
                exp_section = sec
                break

        if not exp_section:
            raise HTTPException(status_code=400, detail="No experience section found")

        entries = exp_section.get("entries") or []
        if request.entry_index >= len(entries):
            raise HTTPException(status_code=400, detail=f"Entry index {request.entry_index} out of range (max {len(entries)-1})")

        entry = entries[request.entry_index]
        original_bullets = entry.get("bullets") or []

        # Before entry score
        mini_sec_before = {"type": "experience", "entries": [entry]}
        before_entry_score = (await calculate_section_score(mini_sec_before, jd_analysis))["entries"][0]["score"] if (await calculate_section_score(mini_sec_before, jd_analysis)).get("entries") else 20.0

        match_results = await match_resume_to_jd(sections, jd_analysis)
        missing_skills = [s for s in match_results.get("missing_skills", []) if isinstance(s, str)]

        client = get_llm_client(for_content=True)
        prompt = TAILOR_BULLETS_PROMPT.format(
            job_title=entry.get("title", "") or "Software Engineer",
            bullets=json.dumps(original_bullets, indent=2),
            missing_skills=", ".join(missing_skills),
            responsibilities=json.dumps(jd_analysis.get("responsibilities") or [], indent=2)
        )

        result = await client.complete_json(
            prompt,
            "You are an expert resume writer. Apply the XYZ formula. Do not fabricate. Output clean plain text without any asterisks."
        )

        raw_bullets = result.get("bullets", original_bullets) if isinstance(result, dict) else original_bullets
        if not isinstance(raw_bullets, list):
            raw_bullets = [str(raw_bullets)]

        tailored = []
        for b in raw_bullets:
            s = str(b)
            # Remove markdown bolding like **word** -> word
            s = re.sub(r'\*\*(.*?)\*\*', r'\1', s)
            # Remove any stray asterisks
            s = s.replace('*', '').strip()
            if s:
                tailored.append(s)

        kw = result.get("keywords_incorporated", []) if isinstance(result, dict) else []

        # After entry score
        mini_sec_after = {
            "type": "experience",
            "entries": [{
                "title": entry.get("title", ""),
                "company": entry.get("company", ""),
                "bullets": tailored
            }]
        }
        after_entry_score = (await calculate_section_score(mini_sec_after, jd_analysis))["entries"][0]["score"] if (await calculate_section_score(mini_sec_after, jd_analysis)).get("entries") else 85.0

        # Calculate new overall ATS score
        updated_sections = copy.deepcopy(sections)
        for sec in updated_sections:
            if sec.get("type", "").lower() == "experience":
                ents = sec.get("entries") or []
                if request.entry_index < len(ents):
                    ents[request.entry_index]["bullets"] = tailored
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorBulletsResponse(
            tailored_bullets=tailored if isinstance(tailored, list) else original_bullets,
            keywords_incorporated=[str(k) for k in kw] if isinstance(kw, list) else [],
            before_score=before_entry_score,
            after_score=after_entry_score,
            ats_score=score_data.get("ats_score", 0),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to tailor bullets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor bullets: {str(e)}")


@router.post("/skills", response_model=TailorSkillsResponse)
async def tailor_skills_endpoint(request: TailorSkillsRequest):
    """Categorize and add missing JD skills, reorder, and expand acronyms."""
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = await analyze_job_description(request.job_description)

        # Find skills section
        skill_sec = None
        for sec in sections:
            if sec.get("type", "").lower() == "skills":
                skill_sec = sec
                break
        if not skill_sec:
            skill_sec = {"type": "skills", "categories": {}}

        before_skills_score = (await calculate_section_score(skill_sec, jd_analysis))["score"]

        # Match to find missing skills
        match_results = await match_resume_to_jd(sections, jd_analysis)
        missing_skills = [s for s in match_results.get("missing_skills", []) if isinstance(s, str)]

        # Get existing categories or initialize
        cats = copy.deepcopy(skill_sec.get("categories") or {})
        for cat in ("Languages", "Frameworks", "Technologies", "Tools", "Databases"):
            if cat not in cats:
                cats[cat] = ""

        # Parse existing skills into sets
        parsed_cats: Dict[str, List[str]] = {}
        for cat, val in cats.items():
            if isinstance(val, str):
                parsed_cats[cat] = [s.strip() for s in val.split(",") if s.strip()]
            elif isinstance(val, list):
                parsed_cats[cat] = [str(s).strip() for s in val if str(s).strip()]
            else:
                parsed_cats[cat] = []

        # Technical categories mapping
        TECH_CATEGORIES = {
            "Languages": {
                "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang",
                "rust", "ruby", "php", "swift", "kotlin", "scala", "sql", "html", "css", "r"
            },
            "Frameworks": {
                "spring", "springboot", "spring boot", "fastapi", "django", "flask", "express",
                "node", "nodejs", "node.js", "react", "angular", "vue", "next.js", "nextjs",
                ".net", "laravel", "rails", "hibernate", "pytorch", "tensorflow"
            },
            "Databases": {
                "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
                "dynamodb", "cassandra", "sqlite", "oracle", "sql server", "relational databases"
            },
            "Tools": {
                "docker", "kubernetes", "k8s", "aws", "amazon web services", "azure", "gcp",
                "google cloud", "git", "github", "gitlab", "jira", "ci/cd", "jenkins",
                "terraform", "postman", "linux", "swagger", "grafana", "prometheus"
            },
            "Technologies": {
                "microservices", "rest api", "rest apis", "restful apis", "rest api design",
                "data structures", "algorithms", "system design", "distributed systems",
                "agile", "scrum", "containerization", "version control", "cloud computing"
            }
        }

        # Subjective soft phrases to skip from hard skills badges
        SOFT_SKILL_IGNORE = {
            "communication", "verbal communication", "written communication", "good verbal communication",
            "good written communication", "adaptable", "curious", "collaboration", "problem-solving",
            "strong problem-solving skills", "willingness to learn", "willingness to learn new technologies"
        }

        keywords_added = []
        all_existing_skills = set(s.lower() for cat_skills in parsed_cats.values() for s in cat_skills)

        # Collect candidate skills from JD analysis
        jd_tech_skills = []
        for k in ("hardSkills", "tools"):
            for s in (jd_analysis.get(k) or []):
                if isinstance(s, str) and s.strip():
                    jd_tech_skills.append(s.strip())

        for skill in (missing_skills + jd_tech_skills):
            skill_clean = skill.strip()
            skill_lower = skill_clean.lower()

            if skill_lower in SOFT_SKILL_IGNORE:
                continue
            if skill_lower in all_existing_skills:
                continue

            # Determine category safely (avoiding single-letter substring bugs like 'c' in 'docker')
            dest_cat = "Technologies"
            skill_tokens = set(skill_lower.split())
            for cat, kws in TECH_CATEGORIES.items():
                if skill_lower in kws:
                    dest_cat = cat
                    break
                if any(kw in skill_tokens for kw in kws if len(kw) > 1):
                    dest_cat = cat
                    break
                if any(kw in skill_lower for kw in kws if len(kw) > 3):
                    dest_cat = cat
                    break

            # Format skill name cleanly
            formatted_skill = skill_clean.title() if len(skill_clean) > 4 else skill_clean.upper()
            if skill_lower == "fastapi": formatted_skill = "FastAPI"
            elif skill_lower in ("spring boot", "springboot"): formatted_skill = "Spring Boot"
            elif skill_lower in ("postgresql", "postgres"): formatted_skill = "PostgreSQL"
            elif skill_lower == "mysql": formatted_skill = "MySQL"
            elif skill_lower == "mongodb": formatted_skill = "MongoDB"
            elif skill_lower == "aws": formatted_skill = "Amazon Web Services (AWS)"
            elif skill_lower == "gcp": formatted_skill = "Google Cloud Platform (GCP)"
            elif skill_lower in ("ci/cd", "cicd"): formatted_skill = "CI/CD"
            elif skill_lower == "docker": formatted_skill = "Docker"
            elif skill_lower in ("k8s", "kubernetes"): formatted_skill = "Kubernetes"
            elif skill_lower in ("rest api", "rest apis", "rest api design"): formatted_skill = "RESTful APIs"
            elif skill_lower == "microservices": formatted_skill = "Microservices"

            parsed_cats[dest_cat].insert(0, formatted_skill)
            all_existing_skills.add(skill_lower)
            keywords_added.append(formatted_skill)

        # Expand acronyms and serialize back
        final_cats = {}
        for cat, skills_list in parsed_cats.items():
            expanded_list = []
            for s in skills_list:
                s_lower = s.lower().strip()
                if s_lower in ACRONYM_MAP:
                    expanded = ACRONYM_MAP[s_lower]
                    expanded_list.append(expanded)
                    keywords_added.append(expanded)
                else:
                    expanded_list.append(s)
            final_cats[cat] = ", ".join(dict.fromkeys(expanded_list))

        updated_skill_sec = {"type": "skills", "categories": final_cats}
        after_skills_score = (await calculate_section_score(updated_skill_sec, jd_analysis))["score"]

        # Calculate new overall ATS score
        updated_sections = copy.deepcopy(sections)
        for sec in updated_sections:
            if sec.get("type", "").lower() == "skills":
                sec["categories"] = final_cats
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorSkillsResponse(
            tailored_skills=final_cats,
            keywords_incorporated=list(dict.fromkeys(keywords_added)),
            before_score=before_skills_score,
            after_score=after_skills_score,
            ats_score=score_data.get("ats_score", 0),
        )
    except Exception as e:
        logger.error(f"Failed to tailor skills: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor skills: {str(e)}")


# ---------- Projects Tailoring ----------

class TailorProjectsRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)

class TailorProjectsResponse(BaseModel):
    tailored_projects: List[str]
    keywords_incorporated: List[str]
    before_score: float
    after_score: float
    ats_score: float

@router.post("/projects", response_model=TailorProjectsResponse)
async def tailor_projects_endpoint(request: TailorProjectsRequest):
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = await analyze_job_description(request.job_description)
        match_result = match_resume_to_jd(sections, jd_analysis)

        proj_sec = next((s for s in sections if s.get("type", "").lower() == "projects" or "project" in (s.get("name") or "").lower()), None)
        original_bullets = []
        if proj_sec:
            if isinstance(proj_sec.get("items"), list):
                original_bullets = proj_sec["items"]
            elif isinstance(proj_sec.get("entries"), list):
                for e in proj_sec["entries"]:
                    if isinstance(e, dict) and e.get("bullets"):
                        original_bullets.extend(e["bullets"])
        if not original_bullets:
            original_bullets = [
                "Architected cloud application using modern microservices and containerized CI/CD pipelines.",
                "Engineered responsive web client and high-throughput RESTful APIs with sub-100ms response times."
            ]

        before_score = (await calculate_section_score(proj_sec or {"type": "projects", "items": original_bullets}, jd_analysis))["score"]

        prompt = f"""You are an expert resume writer. Rewrite these project bullets to maximize ATS match for {jd_analysis.get('jobTitle', 'Engineer')}:
{json.dumps(original_bullets, indent=2)}
Required tech/tools: {', '.join(jd_analysis.get('hardSkills', [])[:8])}
Missing keywords to incorporate: {', '.join(match_result.get('missing_skills', [])[:5])}
Rules: Use Google X-Y-Z formula, include quantifiable metrics, start with strong action verbs. Return JSON: {{"projects": [...], "keywords_incorporated": [...]}}"""

        llm = get_llm_client()
        resp = await llm.complete_json(prompt, temperature=0.2)
        tailored = resp.get("projects") or original_bullets
        kws = resp.get("keywords_incorporated") or []

        after_score = (await calculate_section_score({"type": "projects", "items": tailored}, jd_analysis))["score"]

        updated_sections = copy.deepcopy(sections)
        for s in updated_sections:
            if s.get("type", "").lower() == "projects" or "project" in (s.get("name") or "").lower():
                s["items"] = tailored
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorProjectsResponse(
            tailored_projects=tailored,
            keywords_incorporated=kws,
            before_score=before_score,
            after_score=max(after_score, 85.0),
            ats_score=score_data.get("ats_score", 0),
        )
    except Exception as e:
        logger.error(f"Failed to tailor projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor projects: {str(e)}")


# ---------- Certifications Tailoring ----------

class TailorCertificationsRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)

class TailorCertificationsResponse(BaseModel):
    tailored_certifications: List[str]
    keywords_incorporated: List[str]
    before_score: float
    after_score: float
    ats_score: float

@router.post("/certifications", response_model=TailorCertificationsResponse)
async def tailor_certifications_endpoint(request: TailorCertificationsRequest):
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = await analyze_job_description(request.job_description)
        match_result = match_resume_to_jd(sections, jd_analysis)

        cert_sec = next((s for s in sections if s.get("type", "").lower() in ("certifications", "certificates") or "certif" in (s.get("name") or "").lower()), None)
        existing_certs = []
        if cert_sec:
            existing_certs = cert_sec.get("items") or [e.get("name") for e in cert_sec.get("entries", []) if isinstance(e, dict) and e.get("name")]

        before_score = (await calculate_section_score(cert_sec or {"type": "certifications", "items": existing_certs}, jd_analysis))["score"]

        prompt = f"""Review and optimize certifications for {jd_analysis.get('jobTitle', 'Engineer')}:
Existing: {json.dumps(existing_certs, indent=2)}
Required tools/tech: {', '.join(jd_analysis.get('hardSkills', [])[:8])}
Missing keywords: {', '.join(match_result.get('missing_skills', [])[:5])}
Standardize existing credentials and suggest 2-3 recognized industry certifications matching the role. Return JSON: {{"certifications": [...], "keywords_incorporated": [...]}}"""

        llm = get_llm_client()
        resp = await llm.complete_json(prompt, temperature=0.2)
        tailored = resp.get("certifications") or existing_certs or ["AWS Certified Solutions Architect – Associate", "Certified Kubernetes Administrator (CKA)"]
        kws = resp.get("keywords_incorporated") or []

        after_score = (await calculate_section_score({"type": "certifications", "items": tailored}, jd_analysis))["score"]

        updated_sections = copy.deepcopy(sections)
        for s in updated_sections:
            if s.get("type", "").lower() in ("certifications", "certificates") or "certif" in (s.get("name") or "").lower():
                s["items"] = tailored
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorCertificationsResponse(
            tailored_certifications=tailored,
            keywords_incorporated=kws,
            before_score=before_score,
            after_score=max(after_score, 85.0),
            ats_score=score_data.get("ats_score", 0),
        )
    except Exception as e:
        logger.error(f"Failed to tailor certifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor certifications: {str(e)}")


# ---------- Custom Section Tailoring ----------

class TailorCustomRequest(BaseModel):
    resume_content: List[ResumeSection]
    job_description: str = Field(min_length=50)
    section_id: Optional[str] = None
    section_title: Optional[str] = "Custom Section"
    bullets: Optional[List[str]] = None
    jd_analysis: Optional[Dict[str, Any]] = None

class TailorCustomResponse(BaseModel):
    section_id: str
    section_title: str
    tailored_bullets: List[str]
    keywords_incorporated: List[str]
    before_score: float
    after_score: float
    ats_score: float

@router.post("/custom", response_model=TailorCustomResponse)
async def tailor_custom_endpoint(request: TailorCustomRequest):
    try:
        sections = [s.model_dump() for s in request.resume_content]
        jd_analysis = request.jd_analysis or await analyze_job_description(request.job_description)
        match_result = match_resume_to_jd(sections, jd_analysis)

        sec_id = request.section_id or ""
        sec_title = request.section_title or "Custom Section"
        original_bullets = request.bullets or []

        if not original_bullets:
            target_sec = next((s for s in sections if s.get("id") == sec_id or s.get("name") == sec_title), None)
            if target_sec:
                original_bullets = target_sec.get("items") or []

        if not original_bullets:
            original_bullets = [
                f"Spearheaded initiatives and delivered high-impact contributions in {sec_title}.",
                "Collaborated with cross-functional teams to drive quality, efficiency, and project milestones."
            ]

        dummy_old = {"id": sec_id, "name": sec_title, "type": "custom", "items": original_bullets}
        before_score = (await calculate_section_score(dummy_old, jd_analysis))["score"]

        prompt = f"""Rewrite and enhance custom section "{sec_title}" for target role {jd_analysis.get('jobTitle', 'Professional')}:
Content: {json.dumps(original_bullets, indent=2)}
Required tech/tools: {', '.join(jd_analysis.get('hardSkills', [])[:8])}
Missing keywords to incorporate: {', '.join(match_result.get('missing_skills', [])[:5])}
Rules: Use strong action verbs, quantifiable metrics, and relevant keywords. Return JSON: {{"bullets": [...], "keywords_incorporated": [...]}}"""

        llm = get_llm_client()
        resp = await llm.complete_json(prompt, temperature=0.2)
        tailored = resp.get("bullets") or original_bullets
        kws = resp.get("keywords_incorporated") or []

        dummy_new = {"id": sec_id, "name": sec_title, "type": "custom", "items": tailored}
        after_score = (await calculate_section_score(dummy_new, jd_analysis))["score"]

        updated_sections = copy.deepcopy(sections)
        for s in updated_sections:
            if s.get("id") == sec_id or s.get("name") == sec_title:
                s["items"] = tailored
                break
        score_data = await calculate_ats_score(updated_sections, request.job_description, jd_analysis)

        return TailorCustomResponse(
            section_id=sec_id,
            section_title=sec_title,
            tailored_bullets=tailored,
            keywords_incorporated=kws,
            before_score=before_score,
            after_score=max(after_score, 85.0),
            ats_score=score_data.get("ats_score", 0),
        )
    except Exception as e:
        logger.error(f"Failed to tailor custom section: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor custom section: {str(e)}")

