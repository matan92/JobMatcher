from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_database
from app.repositories.job_repository import JobRepository
from app.repositories.candidate_repository import CandidateRepository
from app.services.recommendation_service import calculate_recommendation_score

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/job/{job_id}")
async def recommend_for_job(job_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    # Initialize repositories with database connection
    job_repo = JobRepository(db)
    cand_repo = CandidateRepository(db)

    # Get job
    job = await job_repo.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get candidates
    candidates = await cand_repo.list(limit=500)

    results = []

    # Apply scoring logic to each candidate
    for candidate in candidates:
        match = calculate_recommendation_score(job, candidate)
        if match:
            results.append(match)

    # Sort highest score first
    results.sort(key=lambda x: x["score"], reverse=True)

    # Convert results to JSON-compatible output
    return [
        {
            "candidate": r["candidate"].model_dump(),
            "score": r["score"],
            "semantic_score": r["semantic_score"],
            "rule_score": r["rule_score"],
        }
        for r in results
    ]
