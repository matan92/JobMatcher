import json
import re
import subprocess
import requests
from typing import Dict, Any, List


# ==========================================================
# 1. Run Ollama (Windows-safe, synchronous)
# ==========================================================

def run_ollama(prompt: str, model: str = "qwen2.5:1.5b", timeout: int = 240) -> str:
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )

        output = result.stdout.decode("utf-8", errors="ignore")

        print("\n=========== RAW OLLAMA OUTPUT ===========")
        print(output)
        print("=========================================\n")

        return output

    except subprocess.TimeoutExpired:
        print("OLLAMA ERROR: TIMED OUT")
        return ""


# ==========================================================
# 2. Robust JSON extraction
# ==========================================================

def try_extract_json(text: str) -> dict:
    if not text.strip():
        raise ValueError("Empty model output")

    # Remove markdown fences
    text = re.sub(r"```json|```", "", text).strip()

    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        block = match.group(0)
        block = re.sub(r",(\s*[}\]])", r"\1", block)  # remove trailing commas
        return json.loads(block)

    raise ValueError("No valid JSON found")


# ==========================================================
# 3. Normalization helpers
# ==========================================================

def s(x):
    return x if isinstance(x, str) else ""


def normalize_result(data: Dict[str, Any]) -> dict:
    # -------- EDUCATION --------
    education_lines = []
    for e in data.get("education", []):
        if isinstance(e, dict):
            line = " | ".join(filter(None, [
                s(e.get("title")),
                s(e.get("institution")),
                s(e.get("dates"))
            ]))
            if line:
                education_lines.append(line)

    # -------- EXPERIENCE --------
    experience_lines = []
    for e in data.get("experience", []):
        if isinstance(e, dict):
            line = " | ".join(filter(None, [
                s(e.get("company")),
                s(e.get("position")),
                s(e.get("dates"))
            ]))
            if line:
                experience_lines.append(line)

    # -------- LANGUAGES --------
    language_lines = []
    for l in data.get("languages", []):
        if isinstance(l, dict):
            line = " - ".join(filter(None, [
                s(l.get("name")),
                s(l.get("proficiency"))
            ]))
            if line:
                language_lines.append(line)

    normalized = {
        "name": s(data.get("name")),
        "location": s(data.get("location")),
        "email": s(data.get("email")),
        "phone": s(data.get("phone")),
        "year_of_birth": s(str(data.get("year_of_birth") or "")),
        "education": "\n".join(education_lines),
        "salary_expectation": data.get("salary_expectation"),
        "experience": experience_lines,
        "languages": language_lines,
        "skills": [],  # filled later
    }

    print("\n====== NORMALIZED RESULT ======")
    print(normalized)
    print("================================\n")

    return normalized


# ==========================================================
# 4. Deterministic skill extraction (NO AI)
# ==========================================================

SKILL_KEYWORDS = {
    "python", "java", "javascript", "typescript", "c#", "c++",
    "react", "angular", "vue",
    "node", "node.js",
    "sql", "mongodb", "postgresql",
    "docker", "kubernetes",
    "aws", "azure", "gcp",
    "rest", "rest api",
    "git", "github",
    "linux",
    "rpa", "uipath", "automation anywhere",
    "html", "css"
}

def extract_skills(text: str) -> List[str]:
    text_lower = text.lower()
    found = set()

    for skill in SKILL_KEYWORDS:
        if skill in text_lower:
            found.add(skill.title())

    return sorted(found)


# ==========================================================
# 5. Location extraction + region enrichment
# ==========================================================

def extract_city(text: str) -> str:
    match = re.search(
        r"\b(Kiryat Ata|Haifa|Tel Aviv|Jerusalem|Petach Tikva|Ramat Yishai)\b",
        text,
        re.IGNORECASE
    )
    return match.group(0) if match else ""


async def enrich_location_with_region(city: str) -> str:
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": city,
                "format": "json",
                "addressdetails": 1,
                "limit": 1,
                "accept-language": "en"
            },
            headers={"User-Agent": "JobMatcher/1.0"},
            timeout=10
        )

        data = r.json()
        if not data:
            return city

        address = data[0].get("address", {})
        region = (
            address.get("state") or
            address.get("county") or
            address.get("region")
        )

        return f"{city}, {region}" if region else city

    except Exception:
        return city


# ==========================================================
# 6. Main parsing function (FINAL)
# ==========================================================

async def parse_resume_text(resume_text: str) -> dict:
    prompt = f"""
You are a STRICT resume parser.
Extract ONLY facts present in the text.
Return VALID JSON ONLY.

JSON FORMAT:
{{
  "name": "",
  "location": "",
  "email": "",
  "phone": "",
  "year_of_birth": "",
  "education": [{{"title":"","institution":"","dates":""}}],
  "salary_expectation": "",
  "experience": [{{"company":"","position":"","dates":""}}],
  "languages": [{{"name":"","proficiency":""}}]
}}

Resume text:
\"\"\"{resume_text}\"\"\"
"""

    raw = run_ollama(prompt)
    data = try_extract_json(raw)
    result = normalize_result(data)

    # 🔒 Override hallucination-prone fields
    city = extract_city(resume_text)
    if city:
        result["location"] = await enrich_location_with_region(city)

    # 🧠 Deterministic skills
    result["skills"] = extract_skills(resume_text)

    return result
