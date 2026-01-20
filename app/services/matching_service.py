"""
Refactored Matching Service with caching, async support, and proper error handling.

Key improvements:
- Singleton model loading with caching
- Embedding cache to avoid recomputing
- Structured scoring breakdown
- Comprehensive error handling
- Logging for debugging
- Configuration from settings
- Type hints throughout
"""

import hashlib
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Dict, Optional, Tuple
from cachetools import TTLCache

from sentence_transformers import SentenceTransformer, util
import torch

from app.domain.models import JobDB, CandidateDB
from app.config import settings

from app.services.category_matching import CategoryMatchingStrategy


# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class ScoringBreakdown:
    """Detailed breakdown of how a score was calculated."""
    location_match: float
    salary_match: float
    requirements_match: float
    advantages_match: float
    language_match: float
    semantic_similarity: float

    def __str__(self) -> str:
        return (
            f"Location: {self.location_match:.1f}, "
            f"Salary: {self.salary_match:.1f}, "
            f"Requirements: {self.requirements_match:.1f}, "
            f"Advantages: {self.advantages_match:.1f}, "
            f"Languages: {self.language_match:.1f}, "
            f"Semantic: {self.semantic_similarity:.1f}"
        )


@dataclass
class MatchResult:
    """Result of matching a job with a candidate."""
    candidate: Optional[CandidateDB] = None
    job: Optional[JobDB] = None
    score: float = 0.0
    semantic_score: float = 0.0
    rule_score: float = 0.0
    breakdown: Optional[ScoringBreakdown] = None
    match_reasons: List[str] = None

    def __post_init__(self):
        if self.match_reasons is None:
            self.match_reasons = []


# ============================================================================
# Singleton Model Loader
# ============================================================================

@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load the embedding model once and cache it.
    Uses lru_cache to ensure singleton pattern.
    """
    model_name = getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    logger.info(f"Loading embedding model: {model_name}")

    try:
        model = SentenceTransformer(model_name)
        logger.info(f"Successfully loaded model: {model_name}")
        return model
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}", exc_info=True)
        raise RuntimeError(f"Could not initialize embedding model: {e}")


# ============================================================================
# Main Matching Service
# ============================================================================

class MatchingService:
    """
    Service for matching jobs with candidates using semantic similarity
    and rule-based scoring.
    """

    # Scoring weights (configurable)
    SEMANTIC_WEIGHT = 0.6
    RULE_WEIGHT = 0.4

    # Rule scoring components (total = 3.0 for normalization)
    LOCATION_MAX = 1.0
    SALARY_MAX = 1.0
    REQUIREMENTS_MAX = 1.0

    def __init__(self, model: Optional[SentenceTransformer] = None):
        """
        Initialize the matching service.

        Args:
            model: Optional pre-loaded model. If None, uses singleton.
        """
        self.model = model or get_embedding_model()

        # Initialize caches
        cache_ttl = getattr(settings, 'CACHE_TTL', 3600)
        cache_size = getattr(settings, 'CACHE_SIZE', 1000)

        self._embedding_cache: TTLCache = TTLCache(
            maxsize=cache_size,
            ttl=cache_ttl
        )

        logger.info(
            f"Initialized MatchingService with cache "
            f"(size={cache_size}, ttl={cache_ttl}s)"
        )

    # ------------------------------------------------------------------------
    # Embedding & Caching
    # ------------------------------------------------------------------------

    def _get_text_hash(self, text: str) -> str:
        """Generate a cache key for text."""
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def _get_embedding(self, text: str) -> torch.Tensor:
        """
        Get embedding for text with caching.

        Args:
            text: Input text to embed

        Returns:
            Cached or newly computed embedding tensor
        """
        cache_key = self._get_text_hash(text)

        if cache_key in self._embedding_cache:
            logger.debug(f"Cache hit for text hash: {cache_key[:8]}...")
            return self._embedding_cache[cache_key]

        try:
            embedding = self.model.encode(text, convert_to_tensor=True)
            self._embedding_cache[cache_key] = embedding
            logger.debug(f"Cached new embedding: {cache_key[:8]}...")
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}", exc_info=True)
            raise

    def _build_job_text(self, job: JobDB) -> str:
        """Build searchable text representation of a job."""
        parts = [
            job.title,
            job.location,
            job.description,
            " ".join(job.requirements),
            " ".join(job.advantages),
            " ".join(getattr(job, 'required_languages', []))
        ]
        return " ".join(filter(None, parts))

    def _build_candidate_text(self, candidate: CandidateDB) -> str:
        """Build searchable text representation of a candidate."""
        parts = [
            candidate.name,
            candidate.location,
            candidate.education,
            " ".join(candidate.experience),
            " ".join(candidate.languages),
            " ".join(candidate.skills)
        ]
        return " ".join(filter(None, parts))

    # ------------------------------------------------------------------------
    # Semantic Similarity
    # ------------------------------------------------------------------------

    def _calculate_semantic_score(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> float:
        """
        Calculate semantic similarity between job and candidate.

        Returns:
            Similarity score between 0 and 1
        """
        try:
            job_text = self._build_job_text(job)
            candidate_text = self._build_candidate_text(candidate)

            job_emb = self._get_embedding(job_text)
            cand_emb = self._get_embedding(candidate_text)

            similarity = util.pytorch_cos_sim(job_emb, cand_emb).item()

            # Ensure bounds [0, 1]
            return max(0.0, min(1.0, similarity))

        except Exception as e:
            logger.warning(
                f"Semantic scoring failed for job={job.id}, "
                f"candidate={candidate.id}: {e}"
            )
            return 0.0

    # ------------------------------------------------------------------------
    # Rule-Based Scoring
    # ------------------------------------------------------------------------

    def _score_location(self, job: JobDB, candidate: CandidateDB) -> Tuple[float, str]:
        """
        Score location match.

        Returns:
            (score, explanation)
        """
        job_loc = job.location.lower().strip()
        cand_loc = candidate.location.lower().strip()

        if job_loc == cand_loc:
            return (1.0, "Exact location match")

        # Check if one location contains the other (e.g., "Tel Aviv" in "Tel Aviv, Israel")
        if job_loc in cand_loc or cand_loc in job_loc:
            return (0.8, "Partial location match")

        return (0.3, "Different location")

    def _score_salary(self, job: JobDB, candidate: CandidateDB) -> Tuple[float, str]:
        """
        Score salary compatibility.

        Returns:
            (score, explanation)
        """
        # If no salary constraints on job, neutral score
        if job.salary_min is None and job.salary_max is None:
            return (0.5, "No salary constraints")

        expectation = candidate.salary_expectation

        # Check if candidate is within range
        if job.salary_min is not None and expectation < job.salary_min:
            return (0.0, f"Below minimum salary (expects {expectation}, min {job.salary_min})")

        if job.salary_max is not None and expectation > job.salary_max:
            return (0.0, f"Above maximum salary (expects {expectation}, max {job.salary_max})")

        # Within range
        if job.salary_min is not None and job.salary_max is not None:
            return (1.0, f"Salary in range ({job.salary_min}-{job.salary_max})")

        # Only max constraint and candidate is below it
        if job.salary_max is not None:
            return (1.0, f"Below maximum salary (max {job.salary_max})")

        # Only min constraint and candidate is above it
        if job.salary_min is not None:
            return (1.0, f"Above minimum salary (min {job.salary_min})")

        return (0.5, "Salary not specified")

    def _score_requirements(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> Tuple[float, str]:
        """
        Score how well candidate meets job requirements.

        Returns:
            (score, explanation)
        """
        if not job.requirements:
            return (1.0, "No requirements specified")

        # Build searchable experience text
        experience_text = " ".join(candidate.experience).lower()
        skill_text = " ".join(candidate.skills).lower()
        combined_text = f"{experience_text} {skill_text}"

        matched_requirements = []
        for req in job.requirements:
            if req.lower() in combined_text:
                matched_requirements.append(req)

        match_ratio = len(matched_requirements) / len(job.requirements)

        if match_ratio == 1.0:
            return (1.0, f"Meets all {len(job.requirements)} requirements")
        elif match_ratio > 0:
            return (
                match_ratio,
                f"Meets {len(matched_requirements)}/{len(job.requirements)} requirements"
            )
        else:
            return (0.0, "No requirements met")

    def _score_advantages(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> Tuple[float, str]:
        """
        Score how many 'nice-to-have' advantages candidate has.
        This is a bonus, not a requirement.

        Returns:
            (bonus_score, explanation)
        """
        if not job.advantages:
            return (0.0, "No advantages specified")

        experience_text = " ".join(candidate.experience).lower()
        skill_text = " ".join(candidate.skills).lower()
        combined_text = f"{experience_text} {skill_text}"

        matched_advantages = []
        for adv in job.advantages:
            if adv.lower() in combined_text:
                matched_advantages.append(adv)

        # Each advantage is worth something (max capped)
        bonus_per_match = 0.2
        bonus = min(1.0, len(matched_advantages) * bonus_per_match)

        if matched_advantages:
            return (
                bonus,
                f"Has {len(matched_advantages)}/{len(job.advantages)} nice-to-haves"
            )

        return (0.0, "No advantages matched")

    def _score_languages(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> Tuple[float, str]:
        """
        Score language requirements.

        Returns:
            (score, explanation)
        """
        required_languages = getattr(job, 'required_languages', [])

        if not required_languages:
            return (0.0, "No language requirements")

        # Normalize language names
        required_set = {lang.lower().strip() for lang in required_languages}
        candidate_langs = {lang.lower().strip() for lang in candidate.languages}

        matched = required_set & candidate_langs

        if len(matched) == len(required_set):
            return (1.0, f"Speaks all required languages: {', '.join(matched)}")
        elif matched:
            return (
                len(matched) / len(required_set),
                f"Speaks {len(matched)}/{len(required_set)} required languages"
            )
        else:
            return (0.0, f"Missing required languages: {', '.join(required_set)}")

    def _calculate_rule_score(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> Tuple[float, ScoringBreakdown, List[str]]:
        """
        Calculate rule-based score with detailed breakdown.

        Returns:
            (total_rule_score, breakdown, reasons)
        """
        reasons = []

        # Location
        loc_score, loc_reason = self._score_location(job, candidate)
        reasons.append(f"📍 {loc_reason}")

        # Salary
        sal_score, sal_reason = self._score_salary(job, candidate)
        reasons.append(f"💰 {sal_reason}")

        # Requirements (critical)
        req_score, req_reason = self._score_requirements(job, candidate)
        reasons.append(f"✅ {req_reason}")

        # Advantages (bonus)
        adv_score, adv_reason = self._score_advantages(job, candidate)
        if adv_score > 0:
            reasons.append(f"⭐ {adv_reason}")

        # Languages
        lang_score, lang_reason = self._score_languages(job, candidate)
        if lang_score > 0 or getattr(job, 'required_languages', []):
            reasons.append(f"🗣️ {lang_reason}")

        # Create breakdown
        breakdown = ScoringBreakdown(
            location_match=loc_score * self.LOCATION_MAX,
            salary_match=sal_score * self.SALARY_MAX,
            requirements_match=req_score * self.REQUIREMENTS_MAX,
            advantages_match=adv_score,  # Bonus, not in max
            language_match=lang_score,  # Bonus, not in max
            semantic_similarity=0.0  # Filled later
        )

        # Total rule score (normalized to 0-1)
        # Core components (location, salary, requirements) = 3.0 max
        # Bonuses (advantages, languages) add on top
        core_score = (
                breakdown.location_match +
                breakdown.salary_match +
                breakdown.requirements_match
        )

        # Normalize core to 0-1, then add bonuses
        normalized_core = core_score / 3.0
        total_with_bonus = normalized_core + (adv_score + lang_score) * 0.1

        # Clamp to [0, 1]
        final_rule_score = max(0.0, min(1.0, total_with_bonus))

        return final_rule_score, breakdown, reasons

    # ------------------------------------------------------------------------
    # High-Level Matching Functions
    # ------------------------------------------------------------------------

    def _calculate_match(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> MatchResult:
        """
        Calculate complete match score between job and candidate.

        Returns:
            MatchResult with all scoring details
        """
        try:
            # Semantic scoring
            semantic_score = self._calculate_semantic_score(job, candidate)

            # Rule-based scoring
            rule_score, breakdown, reasons = self._calculate_rule_score(
                job, candidate
            )

            # Update breakdown with semantic score
            breakdown.semantic_similarity = semantic_score

            # Hard filters (immediate rejection)
            if breakdown.salary_match == 0.0:
                reasons.append("❌ REJECTED: Salary mismatch")
                return MatchResult(
                    candidate=candidate,
                    job=job,
                    score=0.0,
                    semantic_score=semantic_score * 100,
                    rule_score=rule_score * 100,
                    breakdown=breakdown,
                    match_reasons=reasons
                )

            if breakdown.requirements_match == 0.0:
                reasons.append("❌ REJECTED: Missing critical requirements")
                return MatchResult(
                    candidate=candidate,
                    job=job,
                    score=0.0,
                    semantic_score=semantic_score * 100,
                    rule_score=rule_score * 100,
                    breakdown=breakdown,
                    match_reasons=reasons
                )

            # Calculate final weighted score
            final_score = (
                    self.SEMANTIC_WEIGHT * semantic_score +
                    self.RULE_WEIGHT * rule_score
            )

            # Convert to percentage
            final_percentage = final_score * 100

            return MatchResult(
                candidate=candidate,
                job=job,
                score=round(final_percentage, 2),
                semantic_score=round(semantic_score * 100, 2),
                rule_score=round(rule_score * 100, 2),
                breakdown=breakdown,
                match_reasons=reasons
            )

        except Exception as e:
            logger.error(
                f"Failed to calculate match for job={job.id}, "
                f"candidate={candidate.id}: {e}",
                exc_info=True
            )
            return MatchResult(
                candidate=candidate,
                job=job,
                score=0.0,
                match_reasons=[f"❌ Error during matching: {str(e)}"]
            )

    def rank_candidates_for_job(
            self,
            job: JobDB,
            candidates: List[CandidateDB],
            min_score: float = 0.0
    ) -> List[Dict]:
        """
        Rank candidates for a specific job.

        Args:
            job: Job to match against
            candidates: List of candidates to evaluate
            min_score: Minimum score threshold (0-100)

        Returns:
            List of match results sorted by score (highest first)
        """
        logger.info(
            f"Ranking {len(candidates)} candidates for job '{job.title}' "
            f"(min_score={min_score})"
        )

        results = []

        for candidate in candidates:
            try:
                match = self._calculate_match(job, candidate)

                # Apply minimum score filter
                if match.score < min_score:
                    logger.debug(
                        f"Filtered out candidate {candidate.id} "
                        f"(score {match.score} < {min_score})"
                    )
                    continue

                # Convert to dict format for API response
                results.append({
                    "candidate": match.candidate,
                    "score": match.score,
                    "semantic_score": match.semantic_score,
                    "rule_score": match.rule_score,
                    "match_reasons": match.match_reasons,
                    "breakdown": {
                        "location": match.breakdown.location_match if match.breakdown else 0,
                        "salary": match.breakdown.salary_match if match.breakdown else 0,
                        "requirements": match.breakdown.requirements_match if match.breakdown else 0,
                        "advantages": match.breakdown.advantages_match if match.breakdown else 0,
                        "languages": match.breakdown.language_match if match.breakdown else 0,
                    }
                })

            except Exception as e:
                logger.warning(
                    f"Failed to match candidate {candidate.id}: {e}",
                    exc_info=True
                )
                continue

        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)

        logger.info(
            f"Ranked {len(results)} candidates "
            f"(filtered {len(candidates) - len(results)})"
        )

        return results

    def rank_jobs_for_candidate(
            self,
            candidate: CandidateDB,
            jobs: List[JobDB],
            min_score: float = 0.0
    ) -> List[Dict]:
        """
        Rank jobs for a specific candidate.

        Args:
            candidate: Candidate to match against
            jobs: List of jobs to evaluate
            min_score: Minimum score threshold (0-100)

        Returns:
            List of match results sorted by score (highest first)
        """
        logger.info(
            f"Ranking {len(jobs)} jobs for candidate '{candidate.name}' "
            f"(min_score={min_score})"
        )

        results = []

        for job in jobs:
            try:
                match = self._calculate_match(job, candidate)

                # Apply minimum score filter
                if match.score < min_score:
                    continue

                # Convert to dict format for API response
                results.append({
                    "job": match.job,
                    "score": match.score,
                    "semantic_score": match.semantic_score,
                    "rule_score": match.rule_score,
                    "match_reasons": match.match_reasons,
                    "breakdown": {
                        "location": match.breakdown.location_match if match.breakdown else 0,
                        "salary": match.breakdown.salary_match if match.breakdown else 0,
                        "requirements": match.breakdown.requirements_match if match.breakdown else 0,
                        "advantages": match.breakdown.advantages_match if match.breakdown else 0,
                        "languages": match.breakdown.language_match if match.breakdown else 0,
                    }
                })

            except Exception as e:
                logger.warning(
                    f"Failed to match job {job.id}: {e}",
                    exc_info=True
                )
                continue

        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)

        logger.info(
            f"Ranked {len(results)} jobs "
            f"(filtered {len(jobs) - len(results)})"
        )

        return results

    # ------------------------------------------------------------------------
    # Utility Methods
    # ------------------------------------------------------------------------

    def clear_cache(self) -> None:
        """Clear the embedding cache."""
        self._embedding_cache.clear()
        logger.info("Cleared embedding cache")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        return {
            "cache_size": len(self._embedding_cache),
            "cache_maxsize": self._embedding_cache.maxsize,
            "cache_ttl": self._embedding_cache.ttl
        }

    def _calculate_rule_score_with_category(
            self,
            job: JobDB,
            candidate: CandidateDB
    ) -> Tuple[float, ScoringBreakdown, List[str]]:
        """
        Calculate rule-based score with category-specific weights.
        """
        strategy = CategoryMatchingStrategy(job, candidate)
        weights = strategy.get_scoring_weights()

        reasons = []
        scores = {}

        # Location
        loc_score, loc_reason = self._score_location(job, candidate)
        scores["location"] = loc_score
        reasons.append(f"📍 {loc_reason}")

        # Salary
        sal_score, sal_reason = self._score_salary(job, candidate)
        scores["salary"] = sal_score
        reasons.append(f"💰 {sal_reason}")

        # Requirements
        req_score, req_reason = self._score_requirements(job, candidate)
        scores["requirements"] = req_score
        reasons.append(f"✅ {req_reason}")

        # Languages
        lang_score, lang_reason = self._score_languages(job, candidate)
        scores["languages"] = lang_score
        reasons.append(f"🗣️ {lang_reason}")

        # NEW: Availability (for non-tech jobs)
        avail_score, avail_reason = strategy.score_availability()
        scores["availability"] = avail_score
        if avail_score == 0.0:
            # Hard filter - immediate rejection
            reasons.append(f"❌ REJECTED: {avail_reason}")
            return 0.0, None, reasons
        reasons.append(f"📅 {avail_reason}")

        # NEW: Certifications (critical for some industries)
        cert_score, cert_reason = strategy.score_certifications()
        scores["certifications"] = cert_score
        if cert_score == 0.0:
            # Hard filter - immediate rejection
            reasons.append(f"❌ REJECTED: {cert_reason}")
            return 0.0, None, reasons
        reasons.append(f"📜 {cert_reason}")

        # NEW: Employment type preference
        emp_score, emp_reason = strategy.score_employment_type()
        scores["employment_type"] = emp_score
        reasons.append(f"📋 {emp_reason}")

        # Calculate weighted final score
        final_score = (
                scores["location"] * 0.15 +
                scores["salary"] * 0.15 +
                scores["requirements"] * weights.get("skills", 0.25) +
                scores["languages"] * weights.get("languages", 0.15) +
                scores["availability"] * weights.get("availability", 0.15) +
                scores["certifications"] * weights.get("certifications", 0.10) +
                emp_score * 0.10
        )

        # Create breakdown
        breakdown = ScoringBreakdown(
            location_match=scores["location"],
            salary_match=scores["salary"],
            requirements_match=scores["requirements"],
            advantages_match=0.0,  # Calculate separately
            language_match=scores["languages"],
            semantic_similarity=0.0,  # Filled later
        )

        return final_score, breakdown, reasons