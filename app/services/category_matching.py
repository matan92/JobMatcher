from typing import Dict, Tuple
from app.domain.models import JobDB, CandidateDB, JobCategory


class CategoryMatchingStrategy:
    """
    Different scoring strategies for different job categories.
    Tech jobs focus on skills, while service jobs focus on availability.
    """

    def __init__(self, job: JobDB, candidate: CandidateDB):
        self.job = job
        self.candidate = candidate
        self.category = job.category

    def get_scoring_weights(self) -> Dict[str, float]:
        """Return scoring weights based on job category."""

        weights = {
            JobCategory.TECHNOLOGY: {
                "skills": 0.40,
                "experience": 0.25,
                "education": 0.20,
                "languages": 0.10,
                "availability": 0.05,
            },
            JobCategory.RETAIL: {
                "skills": 0.15,
                "experience": 0.20,
                "education": 0.05,
                "languages": 0.20,
                "availability": 0.40,  # Very important for retail
            },
            JobCategory.HOSPITALITY: {
                "skills": 0.15,
                "experience": 0.20,
                "education": 0.05,
                "languages": 0.30,  # Crucial for hotels/restaurants
                "availability": 0.30,
            },
            JobCategory.HEALTHCARE: {
                "skills": 0.25,
                "experience": 0.25,
                "education": 0.20,
                "languages": 0.15,
                "availability": 0.15,
                "certifications": 0.30,  # NEW: Very important
            },
            JobCategory.MANUFACTURING: {
                "skills": 0.25,
                "experience": 0.30,
                "education": 0.05,
                "languages": 0.05,
                "availability": 0.25,
                "certifications": 0.10,
            },
            JobCategory.CUSTOMER_SERVICE: {
                "skills": 0.20,
                "experience": 0.20,
                "education": 0.10,
                "languages": 0.35,  # Very important
                "availability": 0.15,
            },
        }

        # Default for other categories
        default_weights = {
            "skills": 0.25,
            "experience": 0.25,
            "education": 0.15,
            "languages": 0.15,
            "availability": 0.15,
            "certifications": 0.05,
        }

        return weights.get(self.category, default_weights)

    def score_availability(self) -> Tuple[float, str]:
        """Score based on shift/weekend availability."""
        score = 0.0
        reasons = []

        # Shift work
        if self.job.shift_work:
            if self.candidate.willing_to_work_shifts:
                score += 0.5
                reasons.append("✅ Willing to work shifts")
            else:
                reasons.append("⚠️ Not willing to work shifts (required)")
                return 0.0, " | ".join(reasons)  # Hard filter
        else:
            score += 0.5  # Neutral if not required

        # Weekend work
        if self.job.weekend_work:
            if self.candidate.willing_to_work_weekends:
                score += 0.5
                reasons.append("✅ Willing to work weekends")
            else:
                reasons.append("⚠️ Not willing to work weekends (required)")
                return 0.0, " | ".join(reasons)  # Hard filter
        else:
            score += 0.5  # Neutral if not required

        return score, " | ".join(reasons) if reasons else "No special availability required"

    def score_certifications(self) -> Tuple[float, str]:
        """Score based on required certifications."""
        required_certs = set(c.lower() for c in self.job.certifications_required)
        candidate_certs = set(c.lower() for c in self.candidate.certifications)

        if not required_certs:
            return 1.0, "No certifications required"

        matched = required_certs & candidate_certs
        missing = required_certs - candidate_certs

        if missing:
            return 0.0, f"❌ Missing certifications: {', '.join(missing)}"  # Hard filter

        return 1.0, f"✅ Has all required certifications: {', '.join(matched)}"

    def score_employment_type(self) -> Tuple[float, str]:
        """Score based on employment type preference."""
        if not self.candidate.preferred_employment_type:
            return 0.5, "No employment type preference"

        if self.job.employment_type == self.candidate.preferred_employment_type:
            return 1.0, f"✅ Prefers {self.job.employment_type}"

        return 0.3, f"⚠️ Prefers {self.candidate.preferred_employment_type}, job is {self.job.employment_type}"