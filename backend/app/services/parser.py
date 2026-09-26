import io
import re
import logging
import pymupdf
from docx import Document
from typing import List, Dict, Any
from app.prompts.templates import PARSE_RESUME_PROMPT

logger = logging.getLogger(__name__)

# Section heading patterns for rule-based parsing
SECTION_PATTERNS = {
    "summary": r"(?i)^(summary|professional\s+summary|profile|objective|about\s+me|career\s+summary)",
    "experience": r"(?i)^(experience|work\s+experience|employment|professional\s+experience|work\s+history)",
    "education": r"(?i)^(education|academic|qualifications|degrees)",
    "skills": r"(?i)^(skills|technical\s+skills|core\s+competencies|technologies|proficiencies|areas\s+of\s+expertise)",
    "projects": r"(?i)^(projects|personal\s+projects|key\s+projects|notable\s+projects)",
    "list": r"(?i)^(certifications?|awards?|achievements?|honors?|publications?|languages?|volunteer|interests|activities|affiliations|licenses?)",
}


async def parse_resume_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF with spatial block sorting for 2-column layouts."""
    text = ""
    try:
        pdf_document = pymupdf.open(stream=file_bytes, filetype="pdf")
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            # Use "blocks" to get text grouped with bounding boxes (x0, y0, x1, y1, text, block_no, type)
            blocks = page.get_text("blocks")
            # Filter text blocks only (type 0), ignore images (type 1)
            text_blocks = [b for b in blocks if b[6] == 0]

            if not text_blocks:
                text += page.get_text() + "\n\n"
                continue

            # Detect if this is a 2-column layout
            page_width = page.rect.width
            mid_x = page_width / 2
            left_blocks = [b for b in text_blocks if b[2] <= mid_x + 20]  # x1 <= midpoint
            right_blocks = [b for b in text_blocks if b[0] >= mid_x - 20]  # x0 >= midpoint

            # If roughly equal blocks on each side, treat as 2-column
            if left_blocks and right_blocks and len(left_blocks) > 2 and len(right_blocks) > 2:
                # Sort each column by y-position (top to bottom)
                left_blocks.sort(key=lambda b: b[1])
                right_blocks.sort(key=lambda b: b[1])
                # Process left column first, then right
                for b in left_blocks:
                    text += b[4].strip() + "\n"
                text += "\n"
                for b in right_blocks:
                    text += b[4].strip() + "\n"
            else:
                # Single column: sort by y-position
                text_blocks.sort(key=lambda b: (b[1], b[0]))
                for b in text_blocks:
                    text += b[4].strip() + "\n"

            text += "\n"
        pdf_document.close()
    except Exception as e:
        logger.error(f"Error parsing PDF: {str(e)}")
        raise ValueError("Failed to parse PDF file.")
    return text


async def parse_resume_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    text = ""
    try:
        doc = Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            if para.text.strip():
                text += para.text + "\n"
        for table in doc.tables:
            for row in table.rows:
                row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_data:
                    text += " | ".join(row_data) + "\n"
    except Exception as e:
        logger.error(f"Error parsing DOCX: {str(e)}")
        raise ValueError("Failed to parse DOCX file.")
    return text


def _detect_section_type(heading: str) -> str:
    """Detect section type from a heading string."""
    heading_clean = heading.strip().rstrip(":").strip()
    for sec_type, pattern in SECTION_PATTERNS.items():
        if re.match(pattern, heading_clean):
            return sec_type
    return "custom"


def _is_heading(line: str, next_line: str = "") -> bool:
    """Heuristic: a line is a heading if it's short, title-case or ALL CAPS, and not a bullet."""
    line = line.strip()
    if not line or len(line) > 80:
        return False
    if line.startswith(("•", "-", "–", "·", "*", "▪", "►", "○")):
        return False
    # ALL CAPS
    if line.isupper() and len(line) > 2:
        return True
    # Check against known patterns
    for pattern in SECTION_PATTERNS.values():
        if re.match(pattern, line.rstrip(":")):
            return True
    return False


def _parse_header_from_lines(lines: List[str]) -> Dict[str, Any]:
    """Extract header info (name, email, phone, etc.) from the first few lines."""
    header: Dict[str, Any] = {
        "name": "Header",
        "type": "header",
    }

    email_re = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
    phone_re = re.compile(r"[\+]?[\d\s\-().]{7,15}")
    linkedin_re = re.compile(r"linkedin\.com/in/[\w-]+", re.I)
    github_re = re.compile(r"github\.com/[\w-]+", re.I)

    # First non-empty line is likely the name
    for line in lines[:3]:
        line = line.strip()
        if line and not email_re.search(line) and not phone_re.fullmatch(line.replace(" ", "")):
            header["fullName"] = line
            break

    combined = "\n".join(lines)
    email_match = email_re.search(combined)
    if email_match:
        header["email"] = email_match.group()

    phone_match = phone_re.search(combined)
    if phone_match:
        candidate = phone_match.group().strip()
        # Filter out short matches that aren't phone numbers
        digits = re.sub(r"\D", "", candidate)
        if len(digits) >= 7:
            header["phone"] = candidate

    linkedin_match = linkedin_re.search(combined)
    if linkedin_match:
        header["linkedin"] = linkedin_match.group()

    github_match = github_re.search(combined)
    if github_match:
        header["github"] = github_match.group()

    return header


def _parse_experience_entries(lines: List[str]) -> List[Dict[str, Any]]:
    """Parse experience lines into structured entries."""
    entries: List[Dict[str, Any]] = []
    current_entry: Dict[str, Any] | None = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check if this is a bullet point
        is_bullet = line.startswith(("•", "-", "–", "·", "*", "▪", "►", "○"))

        if is_bullet:
            bullet_text = re.sub(r"^[•\-–·*▪►○]\s*", "", line)
            if current_entry:
                current_entry["bullets"].append(bullet_text)
        else:
            # Could be a new entry title/company line
            # Heuristic: if it contains a date-like pattern, it's a title line
            date_match = re.search(
                r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\w]*\.?\s*\d{4}|"
                r"\d{4}\s*[-–]\s*(?:Present|\d{4})|"
                r"\d{1,2}/\d{4})",
                line, re.I
            )

            if date_match or (current_entry is None and not is_bullet):
                if current_entry and (current_entry.get("title") or current_entry.get("bullets")):
                    entries.append(current_entry)

                # Extract date from line
                duration = date_match.group() if date_match else ""
                title_text = line.replace(duration, "").strip().rstrip(",").rstrip("|").strip()

                current_entry = {
                    "title": title_text or line,
                    "company": "",
                    "location": "",
                    "duration": duration,
                    "bullets": [],
                }
            elif current_entry and not current_entry.get("company"):
                current_entry["company"] = line
            elif current_entry:
                # Additional non-bullet line — treat as bullet
                current_entry["bullets"].append(line)

    if current_entry and (current_entry.get("title") or current_entry.get("bullets")):
        entries.append(current_entry)

    return entries


def _parse_skills_section(lines: List[str]) -> Dict[str, Any]:
    """Parse skills into categories or flat list."""
    categories: Dict[str, str] = {}
    items: List[str] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"^[•\-–·*▪►○]\s*", "", line)

        # Check for "Category: skill1, skill2" pattern
        if ":" in line:
            parts = line.split(":", 1)
            cat_name = parts[0].strip()
            cat_skills = parts[1].strip()
            if cat_name and cat_skills and len(cat_name) < 40:
                categories[cat_name] = cat_skills
                continue

        # Flat skills (comma or pipe separated)
        if "," in line or "|" in line:
            for skill in re.split(r"[,|]", line):
                skill = skill.strip()
                if skill:
                    items.append(skill)
        else:
            items.append(line)

    section: Dict[str, Any] = {"name": "Skills", "type": "skills"}
    if categories:
        section["categories"] = categories
    if items:
        section["items"] = items
    return section


def rule_based_parse(raw_text: str) -> List[Dict[str, Any]]:
    """Parse resume text into sections using regex/heuristics (no LLM needed)."""
    lines = raw_text.split("\n")
    sections: List[Dict[str, Any]] = []

    # 1. Extract header from first few lines
    header_lines: List[str] = []
    body_start = 0
    for i, line in enumerate(lines[:10]):
        if _is_heading(line.strip()):
            body_start = i
            break
        if line.strip():
            header_lines.append(line.strip())
        body_start = i + 1

    if header_lines:
        sections.append(_parse_header_from_lines(header_lines))

    # 2. Split remaining text into sections by headings
    current_heading = ""
    current_lines: List[str] = []

    for line in lines[body_start:]:
        stripped = line.strip()
        if _is_heading(stripped):
            # Save previous section
            if current_heading and current_lines:
                sections.append(_build_section(current_heading, current_lines))
            current_heading = stripped.rstrip(":")
            current_lines = []
        else:
            if stripped:
                current_lines.append(stripped)

    # Save last section
    if current_heading and current_lines:
        sections.append(_build_section(current_heading, current_lines))

    # If no sections were detected, create a single custom section
    if len(sections) <= 1:
        sections.append({
            "name": "Content",
            "type": "custom",
            "text": raw_text.strip(),
        })

    return sections


def _build_section(heading: str, lines: List[str]) -> Dict[str, Any]:
    """Build a section dict from heading and content lines."""
    sec_type = _detect_section_type(heading)

    if sec_type == "skills":
        section = _parse_skills_section(lines)
        section["name"] = heading
        return section

    if sec_type in ("experience", "projects"):
        entries = _parse_experience_entries(lines)
        return {
            "name": heading,
            "type": sec_type,
            "entries": entries if entries else [{"title": heading, "company": "", "duration": "", "bullets": lines}],
        }

    if sec_type == "education":
        entries = _parse_experience_entries(lines)
        return {
            "name": heading,
            "type": "education",
            "entries": entries if entries else [{"institution": lines[0] if lines else "", "degree": lines[1] if len(lines) > 1 else "", "location": "", "year": ""}],
        }

    if sec_type == "summary":
        return {
            "name": heading,
            "type": "summary",
            "text": " ".join(lines),
        }

    if sec_type == "list":
        items = []
        current_item = ""
        bullet_pattern = r"^[•\-–·*▪►○\d+\.]\s*"
        for l in lines:
            stripped = l.strip()
            if not stripped:
                continue
            if re.match(bullet_pattern, stripped):
                if current_item:
                    items.append(current_item.strip())
                current_item = re.sub(bullet_pattern, "", stripped)
            else:
                if current_item:
                    current_item += " " + stripped
                else:
                    current_item = stripped
        if current_item:
            items.append(current_item.strip())
        return {
            "name": heading,
            "type": "list",
            "items": items if items else [re.sub(r"^[•\-–·*▪►○]\s*", "", l).strip() for l in lines if l.strip()],
        }

    # custom
    return {
        "name": heading,
        "type": "custom",
        "text": "\n".join(lines),
    }


async def structure_resume_llm(raw_text: str) -> List[Dict[str, Any]]:
    """Convert raw text into structured ResumeSection[] JSON using LLM."""
    try:
        from app.services.llm_client import get_llm_client
        client = get_llm_client(for_content=False)
        system_message = "You are an expert resume parser. Extract the resume information strictly according to the provided JSON schema."
        prompt = PARSE_RESUME_PROMPT.format(raw_text=raw_text)

        result = await client.complete_json(
            prompt=prompt,
            system_message=system_message,
            temperature=0.1,
        )
        if isinstance(result, list):
            sections = result
        elif isinstance(result, dict):
            sections = result.get("sections") or result.get("result") or []
        else:
            sections = []

        if sections and isinstance(sections, list):
            return sections
    except Exception as e:
        logger.warning(f"LLM parsing failed, using rule-based fallback: {e}")

    return rule_based_parse(raw_text)


async def parse_resume_file(filename: str, file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse a resume file into structured sections. Uses LLM if available, else rule-based."""
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        raw_text = await parse_resume_pdf(file_bytes)
    elif ext in ["doc", "docx"]:
        raw_text = await parse_resume_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

    if not raw_text.strip():
        raise ValueError("No text could be extracted from the file.")

    logger.info(f"Extracted {len(raw_text)} chars from {filename}")

    # Try LLM first, fallback to rule-based
    sections = await structure_resume_llm(raw_text)

    # Always ensure header has LinkedIn/GitHub/portfolio URLs extracted from raw text
    _enrich_header_urls(sections, raw_text)

    return sections


def _enrich_header_urls(sections: List[Dict[str, Any]], raw_text: str) -> None:
    """Ensure the header section contains LinkedIn, GitHub, and portfolio URLs extracted from raw text."""
    linkedin_re = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?", re.I)
    github_re = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w-]+/?", re.I)
    portfolio_re = re.compile(r"(?:https?://)?(?:www\.)?leetcode\.com/[\w-]+/?", re.I)
    url_re = re.compile(r"https?://[^\s,|]+", re.I)

    linkedin_match = linkedin_re.search(raw_text)
    github_match = github_re.search(raw_text)
    portfolio_match = portfolio_re.search(raw_text)

    # Find header section
    header = None
    for sec in sections:
        if sec.get("type") == "header":
            header = sec
            break

    if not header:
        return

    if linkedin_match and not header.get("linkedin"):
        url = linkedin_match.group()
        if not url.startswith("http"):
            url = "https://" + url
        header["linkedin"] = url

    if github_match and not header.get("github"):
        url = github_match.group()
        if not url.startswith("http"):
            url = "https://" + url
        header["github"] = url

    if portfolio_match and not header.get("portfolio"):
        url = portfolio_match.group()
        if not url.startswith("http"):
            url = "https://" + url
        header["portfolio"] = url

    # Also try to find any other URLs that could be portfolio
    if not header.get("portfolio"):
        for url_match in url_re.finditer(raw_text):
            url = url_match.group().rstrip("/.,;)")
            if "linkedin.com" not in url and "github.com" not in url and "mailto:" not in url:
                header["portfolio"] = url
                break

