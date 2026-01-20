import json
import re
import subprocess
from typing import Dict, Any


# ======================================================
# Run Ollama (Windows safe, sync)
# ======================================================

def run_ollama(prompt: str, model: str = "qwen2.5:1.5b", timeout: int = 120) -> str:
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )
        return result.stdout.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ======================================================
# Extract JSON safely
# ======================================================

def extract_json(text: str) -> dict:
    text = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON found")
    return json.loads(match.group(0))


# ======================================================
# Normalize output → JobCreate-compatible
# ======================================================

def normalize_job(data: Dict[str, Any]) -> dict:
    return {
        "title": data.get("title", ""),
        "location": data.get("location", ""),
        "salary_min": data.get("salary_min"),
        "salary_max": data.get("salary_max"),
        "experience_level": data.get("experience_level", ""),
        "job_type": data.get("job_type", ""),
        "skills": data.get("skills", []),
        "languages": data.get("languages", []),
        "description": data.get("description", ""),
    }


# ======================================================
# Main job parsing function
# ======================================================

async def parse_job_text(text: str) -> dict:
    prompt = f"""
You are a STRICT job description parser.

Extract ONLY information explicitly present.
If a field is missing → return empty string or null.

Return VALID JSON ONLY.

FORMAT:
{{
  "title": "",
  "location": "",
  "salary_min": null,
  "salary_max": null,
  "experience_level": "",
  "job_type": "",
  "skills": [],
  "languages": [],
  "description": ""
}}

Job description:
\"\"\"{text}\"\"\"
"""

    raw = run_ollama(prompt)
    if not raw.strip():
        raise ValueError("Empty model output")

    data = extract_json(raw)
    return normalize_job(data)
