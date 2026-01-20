"""
Refactored candidate matching endpoints with proper error handling,
logging, and validation.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, field_validator
from bson import ObjectId

from app.db.mongo import get_database
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.services.matching_service import MatchingService
from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/candidates",
    tags=["candidate-matching"]
)


# ============================================================================
# Request/Response Models
# ============================================================================

class MatchFilters(BaseModel):
    """Filters for matching queries."""
    location: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    required_skills: Optional[List[str]] = None


class JobMatchResponse(BaseModel):
    """Response model for job matches."""
    job_id: str
    job_title: str
    score: float = Field(..., ge=0, le=100)
    semantic_score: float = Field(..., ge=0, le=100)
    rule_score: float = Field(..., ge=0, le=100)
    match_reasons: List[str]
    breakdown: dict


class MatchingSummary(BaseModel):
    """Summary of matching operation."""
    candidate_id: str
    candidate_name: str
    total_jobs_evaluated: int
    matches_found: int
    top_score: Optional[float] = None
    filters_applied: dict


# ============================================================================
# Dependencies
# ============================================================================

def get_candidate_repo(
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> CandidateRepository:
    return CandidateRepository(db)


def get_job_repo(
        db: AsyncIOMotorDatabase = Depends(get_database)
) -> JobRepository:
    return JobRepository(db)


def get_matching_service() -> MatchingService:
    """
    Dependency to get matching service.
    Creates new instance per request but shares singleton model.
    """
    return MatchingService()


def validate_object_id(id_string: str) -> str:
    """Validate that a string is a valid MongoDB ObjectId."""
    if not ObjectId.is_valid(id_string):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {id_string}"
        )
    return id_string


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/{candidate_id}/matches")
async def match_jobs_for_candidate(
        candidate_id: str,
        min_score: float = Query(
            default=settings.MIN_MATCH_SCORE,
            ge=0,
            le=100,
            description="Minimum match score (0-100)"
        ),
        limit: int = Query(
            default=settings.DEFAULT_MATCH_LIMIT,
            ge=1,
            le=500,
            description="Maximum number of results"
        ),
        include_breakdown: bool = Query(
            default=True,
            description="Include detailed scoring breakdown"
        ),
        candidate_repo: CandidateRepository = Depends(get_candidate_repo),
        job_repo: JobRepository = Depends(get_job_repo),
        matcher: MatchingService = Depends(get_matching_service),
):
    """
    Find matching jobs for a specific candidate.

    **Returns:**
    - List of jobs sorted by match score (highest first)
    - Each match includes score, breakdown, and reasons

    **Filters:**
    - min_score: Only return jobs above this score threshold
    - limit: Maximum number of results to return
    """
    # Validate candidate ID
    validate_object_id(candidate_id)

    logger.info(f"Matching jobs for candidate {candidate_id} (min_score={min_score})")

    try:
        # Fetch candidate
        candidate = await candidate_repo.get(candidate_id)
        if not candidate:
            logger.warning(f"Candidate not found: {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate {candidate_id} not found"
            )

        # Fetch jobs (consider adding filters here for active jobs only)
        jobs = await job_repo.list(limit=settings.MAX_JOBS_PER_QUERY)

        if not jobs:
            logger.info("No jobs available for matching")
            return {
                "summary": {
                    "candidate_id": candidate_id,
                    "candidate_name": candidate.name,
                    "total_jobs_evaluated": 0,
                    "matches_found": 0,
                    "top_score": None,
                },
                "matches": []
            }

        # Perform matching
        logger.info(f"Evaluating {len(jobs)} jobs for candidate {candidate.name}")
        matches = matcher.rank_jobs_for_candidate(
            candidate=candidate,
            jobs=jobs,
            min_score=min_score
        )

        # Apply limit
        matches = matches[:limit]

        # Build response
        match_results = []
        for match in matches:
            job = match["job"]
            result = {
                "job": job.model_dump(),
                "score": match["score"],
                "semantic_score": match["semantic_score"],
                "rule_score": match["rule_score"],
                "match_reasons": match["match_reasons"],
            }

            if include_breakdown:
                result["breakdown"] = match["breakdown"]

            match_results.append(result)

        # Calculate summary
        summary = {
            "candidate_id": candidate_id,
            "candidate_name": candidate.name,
            "total_jobs_evaluated": len(jobs),
            "matches_found": len(match_results),
            "top_score": match_results[0]["score"] if match_results else None,
            "filters_applied": {
                "min_score": min_score,
                "limit": limit
            }
        }

        logger.info(
            f"Found {len(match_results)} matches for {candidate.name} "
            f"(top score: {summary['top_score']})"
        )

        return {
            "summary": summary,
            "matches": match_results
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error matching jobs for candidate {candidate_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while matching jobs"
        )


@router.get("/{candidate_id}/matches/top")
async def get_top_match(
        candidate_id: str,
        candidate_repo: CandidateRepository = Depends(get_candidate_repo),
        job_repo: JobRepository = Depends(get_job_repo),
        matcher: MatchingService = Depends(get_matching_service),
):
    """
    Get only the best matching job for a candidate.

    **Returns:**
    - Single best match or null if no matches above threshold
    """
    validate_object_id(candidate_id)

    try:
        candidate = await candidate_repo.get(candidate_id)
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        jobs = await job_repo.list(limit=settings.MAX_JOBS_PER_QUERY)

        if not jobs:
            return {"top_match": None}

        matches = matcher.rank_jobs_for_candidate(
            candidate=candidate,
            jobs=jobs,
            min_score=settings.MIN_MATCH_SCORE
        )

        if not matches:
            return {"top_match": None}

        top = matches[0]

        return {
            "top_match": {
                "job": top["job"].model_dump(),
                "score": top["score"],
                "match_reasons": top["match_reasons"],
                "breakdown": top["breakdown"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting top match: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error finding top match"
        )


@router.post("/{candidate_id}/matches/filter")
async def match_with_filters(
        candidate_id: str,
        filters: MatchFilters,
        min_score: float = Query(default=40.0, ge=0, le=100),
        candidate_repo: CandidateRepository = Depends(get_candidate_repo),
        job_repo: JobRepository = Depends(get_job_repo),
        matcher: MatchingService = Depends(get_matching_service),
):
    """
    Find matching jobs with advanced filters.

    **Filters:**
    - location: Filter by job location
    - min_salary/max_salary: Filter by salary range
    - required_skills: Jobs must have these skills
    """
    validate_object_id(candidate_id)

    logger.info(f"Matching with filters for candidate {candidate_id}: {filters}")

    try:
        candidate = await candidate_repo.get(candidate_id)
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        # Fetch all jobs (in production, push filters to database query)
        all_jobs = await job_repo.list(limit=settings.MAX_JOBS_PER_QUERY)

        # Apply filters
        filtered_jobs = []
        for job in all_jobs:
            # Location filter
            if filters.location and filters.location.lower() not in job.location.lower():
                continue

            # Salary filter
            if filters.min_salary and (job.salary_max is None or job.salary_max < filters.min_salary):
                continue
            if filters.max_salary and (job.salary_min is None or job.salary_min > filters.max_salary):
                continue

            # Skills filter (job must have ALL required skills)
            if filters.required_skills:
                job_skills = set(s.lower() for s in job.requirements + job.advantages)
                required = set(s.lower() for s in filters.required_skills)
                if not required.issubset(job_skills):
                    continue

            filtered_jobs.append(job)

        logger.info(
            f"Filtered from {len(all_jobs)} to {len(filtered_jobs)} jobs "
            f"based on criteria"
        )

        if not filtered_jobs:
            return {
                "summary": {
                    "total_jobs": len(all_jobs),
                    "after_filters": 0,
                    "matches_found": 0
                },
                "matches": []
            }

        # Perform matching on filtered jobs
        matches = matcher.rank_jobs_for_candidate(
            candidate=candidate,
            jobs=filtered_jobs,
            min_score=min_score
        )

        return {
            "summary": {
                "total_jobs": len(all_jobs),
                "after_filters": len(filtered_jobs),
                "matches_found": len(matches),
                "filters_applied": filters.model_dump()
            },
            "matches": [
                {
                    "job": m["job"].model_dump(),
                    "score": m["score"],
                    "semantic_score": m["semantic_score"],
                    "rule_score": m["rule_score"],
                    "match_reasons": m["match_reasons"],
                    "breakdown": m["breakdown"]
                }
                for m in matches
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in filtered matching: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error performing filtered match"
        )


@router.get("/matching/cache-stats")
async def get_cache_stats(
        matcher: MatchingService = Depends(get_matching_service)
):
    """
    Get cache statistics for the matching service.
    Useful for monitoring and debugging.
    """
    try:
        stats = matcher.get_cache_stats()
        return {
            "cache_enabled": settings.ENABLE_CACHING,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"error": str(e)}


@router.post("/matching/clear-cache")
async def clear_cache(
        matcher: MatchingService = Depends(get_matching_service)
):
    """
    Clear the matching service cache.
    Use this if embeddings need to be regenerated.
    """
    try:
        matcher.clear_cache()
        logger.info("Cleared matching service cache")
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache"
        )