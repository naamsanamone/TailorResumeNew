PARSE_RESUME_PROMPT = """
You are an expert resume parser. Given the raw text extracted from a resume document, convert it into a structured JSON format.
The output MUST strictly conform to the provided JSON schema.
IMPORTANT: Extract ALL sections present in the resume. If a section is not found, omit it from the output.
Look for certifications mentioned anywhere in the resume (including in the summary or experience bullets) and extract them.

Raw Resume Text:
{raw_text}

JSON Schema structure expected for 'sections':
[
  {{
    "name": "Header",
    "type": "header",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "full LinkedIn URL string",
    "github": "full GitHub URL string",
    "portfolio": "any other URL/website string"
  }},
  {{
    "name": "Summary",
    "type": "summary",
    "text": "string"
  }},
  {{
    "name": "Experience",
    "type": "experience",
    "entries": [
      {{
        "title": "string",
        "company": "string",
        "location": "string",
        "duration": "string",
        "bullets": ["string"]
      }}
    ]
  }},
  {{
    "name": "Education",
    "type": "education",
    "entries": [
      {{
        "degree": "string",
        "institution": "string",
        "location": "string",
        "year": "string"
      }}
    ]
  }},
  {{
    "name": "Skills",
    "type": "skills",
    "categories": {{
      "Languages": "Java, Python, TypeScript",
      "Frameworks": "Spring Boot, React, Angular",
      "Databases": "PostgreSQL, MongoDB",
      "Tools": "Docker, Jenkins, Git",
      "Technologies": "Microservices, REST APIs, AWS"
    }}
  }},
  {{
    "name": "Projects",
    "type": "projects",
    "entries": [
      {{
        "title": "string",
        "company": "string or empty",
        "duration": "string or empty",
        "bullets": ["string"]
      }}
    ]
  }},
  {{
    "name": "Certifications",
    "type": "list",
    "items": ["certification name 1", "certification name 2"]
  }},
  {{
    "name": "Awards",
    "type": "list",
    "items": ["award 1", "award 2"]
  }},
  {{
    "name": "Volunteer",
    "type": "list",
    "items": ["volunteer experience 1"]
  }}
]

IMPORTANT extraction rules:
1. For Skills: Categorize into Languages, Frameworks, Databases, Tools, and Technologies.
2. For Certifications: Extract ALL certifications mentioned anywhere, even if embedded in the summary or experience text. Look for keywords like "Certified", "Certificate", "Certification", "Licensed", "Accredited".
3. For LinkedIn/GitHub: Extract the FULL URL including https://.
4. For Projects: If no separate Projects section exists but experience bullets mention specific projects, do NOT create a projects section.
5. Only include sections that have actual content in the resume.

Respond ONLY with valid JSON. Example: {{"sections": [...]}}
"""

PARSE_JD_PROMPT = """
Analyze the following Job Description and extract structured information.

Job Description:
{jd_text}

Extract and return a JSON object with the following fields:
- jobTitle: string
- company: string (if available, else empty)
- seniority: string (e.g. Junior, Senior, Lead)
- experienceLevel: string (e.g. 3-5 years)
- domain: string (e.g. Fintech, Healthcare)
- hardSkills: array of strings (technical skills, programming languages, tools)
- softSkills: array of strings (communication, leadership, etc.)
- tools: array of strings (specific tools, platforms, services)
- responsibilities: array of strings (key job duties)
- requirements: array of strings (must-have qualifications)

Respond ONLY with valid JSON.
"""

TAILOR_BULLETS_PROMPT = """
You are an expert resume writer specializing in ATS optimization. Rewrite the provided bullet points to achieve a 95%+ ATS match score.

Role: {job_title}

Original Bullets:
{bullets}

Missing JD Keywords to incorporate (ONLY if they fit the candidate's actual experience): {missing_skills}
Target Job Responsibilities for context: {responsibilities}

STRICT RULES:
1. Use the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]"
2. Start each bullet with a UNIQUE, strong action verb (Engineered, Architected, Spearheaded, Optimized, Automated, Orchestrated, Streamlined). NEVER repeat the same verb.
3. EVERY bullet MUST contain at least one quantifiable metric (%, $, time saved, scale, users, uptime, throughput).
4. Use the DUAL-FORM rule for acronyms: write both "Continuous Integration/Continuous Deployment (CI/CD)", "Amazon Web Services (AWS)" etc.
5. Incorporate missing keywords NATURALLY in plain text. Example: "Leveraged Docker and Kubernetes to containerize 15 microservices, reducing deployment time by 60%"
6. DO NOT fabricate skills or achievements the candidate does not have.
7. Keep each bullet to 1-2 lines (15-25 words optimal).
8. Do NOT start any bullet with "Responsible for" or "Worked on".
9. CRITICAL: NEVER use asterisks (**) or markdown bolding in the output. Output clean plain text only without any asterisks.

Output JSON format:
{{
  "bullets": ["rewritten bullet 1", "rewritten bullet 2"],
  "keywords_incorporated": ["keyword1", "keyword2"]
}}
"""

TAILOR_SUMMARY_PROMPT = """
You are an expert resume writer. Rewrite the candidate's professional summary to maximize ATS match score for the target role.

Original Summary: {original_summary}
Target Role: {job_title} at {company}

Key Hard Skills from JD: {hard_skills}
Key Soft Skills from JD: {soft_skills}
Missing Keywords to Target: {missing_skills}

STRICT RULES:
1. First sentence: State years of experience + core expertise + target job title.
   Example: "Senior Backend Engineer with 5+ years of experience designing scalable microservices and distributed systems."
2. Second sentence: Highlight 3-4 key technical skills from the JD that the candidate possesses.
3. Third sentence: Mention quantified achievement and domain relevance.
4. INCORPORATE the target job title naturally.
5. Use DUAL-FORM for acronyms: "Amazon Web Services (AWS)", "CI/CD" etc.
6. Keep to exactly 3-4 sentences. Maximum 60 words.
7. DO NOT fabricate experience.

Output JSON format:
{{
  "summary": "The rewritten summary text...",
  "keywords_incorporated": ["keyword1", "keyword2"]
}}
"""
