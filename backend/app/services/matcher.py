import re
import logging
from typing import List, Dict, Any
from app.services.embeddings import compute_similarity, generate_embeddings, generate_embedding, cosine_similarity

logger = logging.getLogger(__name__)

COMMON_ABBREVIATIONS = {
    "k8s": "kubernetes",
    "js": "javascript",
    "ts": "typescript",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "react": "reactjs",
    "react.js": "reactjs",
    "node": "nodejs",
    "node.js": "nodejs",
    "vue": "vuejs",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "ui": "user interface",
    "ux": "user experience",
    "db": "database"
}

def normalize_skill(skill: str) -> str:
    """Lowercase, strip whitespace/hyphens/underscores."""
    s = skill.lower().strip()
    s = re.sub(r'[-_]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s

def skill_in_text(skill: str, text: str) -> bool:
    """Check if skill appears in text using boundary-safe regex (handles C++, C#, .NET, etc.)."""
    s = skill.lower().strip()
    if not s or not text:
        return False
    if s in ('c', 'r'):
        pattern = rf'(?<![a-zA-Z0-9]){re.escape(s)}(?![a-zA-Z0-9+#])'
    else:
        pattern = rf'(?<![a-zA-Z0-9]){re.escape(s)}(?![a-zA-Z0-9])'
    return bool(re.search(pattern, text, re.IGNORECASE))



def fuzzy_match(a: str, b: str) -> bool:
    """Check if normalized versions match (exact, contains, or abbreviated)."""
    norm_a = normalize_skill(a)
    norm_b = normalize_skill(b)
    
    if norm_a == norm_b:
        return True
        
    if COMMON_ABBREVIATIONS.get(norm_a) == norm_b or COMMON_ABBREVIATIONS.get(norm_b) == norm_a:
        return True
        
    if norm_a in norm_b or norm_b in norm_a:
        words_a = set(norm_a.split())
        words_b = set(norm_b.split())
        if words_a.issubset(words_b) or words_b.issubset(words_a):
            return True
            
    return False

def stem_word(word: str) -> str:
    """Normalizes a single word to its stem root."""
    w = re.sub(r'[^a-z0-9]', '', word.lower().strip())
    if len(w) <= 3:
        return w
    
    suffixes = [
        'abilities', 'ability', 'ational', 'ization', 'isation',
        'ation', 'tion', 'sion', 'ative', 'itive',
        'ously', 'fully', 'ively', 'ments', 'ment',
        'ness', 'able', 'ible',
        'ating', 'ated', 'ates', 'ator', 'ators', 'ate',
        'ing', 'ized', 'ised',
        'ies', 'ied', 'ier', 'iest',
        'ural', 'ical', 'ual', 'al',
        'ures', 'ure',
        'ers', 'ors', 'er', 'or', 'ed', 'ly', 'es', 's'
    ]
    
    for suf in suffixes:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            w = w[:-len(suf)]
            break
            
    while True:
        changed = False
        if w.endswith('at') and len(w) > 4:
            w = w[:-2]
            changed = True
        elif w.endswith('e') and len(w) > 3:
            w = w[:-1]
            changed = True
        elif w.endswith('ur') and len(w) > 5:
            w = w[:-2]
            changed = True
        if not changed:
            break
        
    return w

def stem_match(a: str, b: str) -> bool:
    """Advanced stemming check: handles single-word and multi-word token overlap."""
    norm_a = normalize_skill(a)
    norm_b = normalize_skill(b)
    if norm_a == norm_b:
        return True
        
    words_a = [w for w in norm_a.split() if len(w) > 1]
    words_b = [w for w in norm_b.split() if len(w) > 1]
    
    if len(words_a) == 1 and len(words_b) == 1:
        s_a = stem_word(words_a[0])
        s_b = stem_word(words_b[0])
        return s_a == s_b and len(s_a) >= 3
        
    stems_a = [stem_word(w) for w in words_a if len(w) >= 2]
    stems_b = [stem_word(w) for w in words_b if len(w) >= 2]
    if not stems_a or not stems_b:
        return False
        
    set_b = set(stems_b)
    if all(s in set_b for s in stems_a):
        return True
        
    set_a = set(stems_a)
    if all(s in set_a for s in stems_b) and len(stems_b) >= 2:
        return True
        
    return False

def _extract_resume_text(resume_sections: List[Dict[str, Any]]) -> str:
    """Helper to extract all text from resume sections."""
    text_parts = []
    for section in resume_sections:
        if not section:
            continue
        if section.get("text"):
            text_parts.append(section["text"])
        if section.get("fullName"):
            text_parts.append(section["fullName"])
        for item in (section.get("items") or []):
            if isinstance(item, str):
                text_parts.append(item)
        for entry in (section.get("entries") or []):
            if not isinstance(entry, dict):
                continue
            if entry.get("title"): text_parts.append(entry["title"])
            if entry.get("company"): text_parts.append(entry["company"])
            if entry.get("institution"): text_parts.append(entry["institution"])
            if entry.get("degree"): text_parts.append(entry["degree"])
            for bullet in (entry.get("bullets") or []):
                if isinstance(bullet, str):
                    text_parts.append(bullet)
        cats = section.get("categories")
        if isinstance(cats, dict):
            for cat_name, cat_skills in cats.items():
                text_parts.append(cat_name)
                if isinstance(cat_skills, str):
                    text_parts.append(cat_skills)
                elif isinstance(cat_skills, list):
                    text_parts.extend([s for s in cat_skills if isinstance(s, str)])
    return " ".join(text_parts).lower()

async def match_resume_to_jd(resume_sections: List[Dict[str, Any]], jd_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Perform matching between resume and JD."""
    resume_text = _extract_resume_text(resume_sections)
    
    # Collect all JD skills safely
    jd_skills: List[str] = []
    for key in ("hardSkills", "softSkills", "tools"):
        items = jd_analysis.get(key) or []
        for item in items:
            if isinstance(item, str) and item.strip():
                jd_skills.append(item.strip())
    
    domain = jd_analysis.get("domain", "")
    if isinstance(domain, str) and domain.strip():
        jd_skills.append(domain.strip())
    
    # Deduplicate
    jd_skills_unique = list(set(jd_skills))
    
    if not jd_skills_unique:
        return {
            "matched_skills": [],
            "partial_matches": [],
            "missing_skills": [],
            "keyword_match_rate": 0.0,
            "semantic_similarity": 0.0,
        }
    
    matched_skills = []
    partial_matches = []
    missing_skills = []
    
    sentences = [s.strip() for s in resume_text.split('.') if len(s.strip()) > 10][:30]
    sentence_embeddings = generate_embeddings(sentences) if sentences else []

    resume_words = resume_text.split()
    
    for jd_skill in jd_skills_unique:
        skill_found = False
        
        # Exact keyword match (boundary-safe for C++, C#, .NET, Python, etc.)
        if skill_in_text(jd_skill, resume_text):
            matched_skills.append({"skill": jd_skill, "match_type": "exact", "confidence": 1.0})
            skill_found = True
            continue

        norm_jd = normalize_skill(jd_skill)
        if norm_jd != jd_skill.lower().strip() and skill_in_text(norm_jd, resume_text):
            matched_skills.append({"skill": jd_skill, "match_type": "exact", "confidence": 1.0})
            skill_found = True
            continue

            
        # Fuzzy / stem match using n-gram windows
        skill_words = norm_jd.split()
        skill_word_count = len(skill_words)
        max_window = min(skill_word_count + 2, 8)
        for w_len in range(skill_word_count, max_window + 1):
            for i in range(len(resume_words) - w_len + 1):
                window = ' '.join(resume_words[i:i + w_len])
                if fuzzy_match(jd_skill, window) or stem_match(jd_skill, window):
                    matched_skills.append({"skill": jd_skill, "match_type": "fuzzy", "confidence": 0.9})
                    skill_found = True
                    break
            if skill_found:
                break
                
        # Multi-word phrase proximity matching within the same bullet/sentence
        if not skill_found and len(skill_words) > 1:
            skill_stems = [stem_word(w) for w in skill_words if len(w) >= 2]
            if len(skill_stems) > 1:
                for sent in sentences:
                    seg_words = [re.sub(r'[^a-z0-9]', '', w.lower()) for w in sent.split()]
                    seg_stems = set(stem_word(w) for w in seg_words if len(w) >= 2)
                    if all(st in seg_stems for st in skill_stems):
                        matched_skills.append({"skill": jd_skill, "match_type": "stem", "confidence": 0.85})
                        skill_found = True
                        break

        if skill_found:
            continue
            
        # Semantic match
        max_sim = 0.0
        if sentence_embeddings:
            skill_emb = generate_embedding(jd_skill)
            for s_emb in sentence_embeddings:
                sim = cosine_similarity(skill_emb, s_emb)
                if sim > max_sim:
                    max_sim = sim
                
        if max_sim > 0.75:
            matched_skills.append({"skill": jd_skill, "match_type": "semantic", "confidence": max_sim})
        elif max_sim > 0.5:
            partial_matches.append({"skill": jd_skill, "match_type": "semantic", "confidence": max_sim})
        else:
            missing_skills.append(jd_skill)
            
    total_keywords = len(jd_skills_unique)
    keyword_match_rate = len(matched_skills) / total_keywords if total_keywords > 0 else 0.0
    
    # Build JD text for overall semantic similarity
    jd_text_parts = []
    for v in jd_analysis.values():
        if isinstance(v, str) and v:
            jd_text_parts.append(v)
        elif isinstance(v, list):
            jd_text_parts.extend([str(item) for item in v if item])
    jd_full_text = " ".join(jd_text_parts)
    overall_semantic_sim = compute_similarity(jd_full_text, resume_text) if jd_full_text.strip() else 0.0
    
    return {
        "matched_skills": matched_skills,
        "partial_matches": partial_matches,
        "missing_skills": missing_skills,
        "keyword_match_rate": keyword_match_rate,
        "semantic_similarity": overall_semantic_sim,
    }

async def match_section_to_jd(section: Dict[str, Any], jd_analysis: Dict[str, Any]) -> Dict[str, Any]:
    match_result = await match_resume_to_jd([section], jd_analysis)
    
    matched = [m["skill"] for m in match_result["matched_skills"]]
    missing = match_result["missing_skills"]
    
    total = len(matched) + len(missing) + len(match_result["partial_matches"])
    score = (len(matched) + 0.5 * len(match_result["partial_matches"])) / total * 100 if total > 0 else 0.0
    
    return {
        "score": score,
        "matched": matched,
        "missing": missing,
        "recommendation": ""
    }
