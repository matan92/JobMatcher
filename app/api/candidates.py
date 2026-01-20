from typing import List
from datetime import datetime  # Add this
from bson import ObjectId  # Add this

from app.domain.models import CandidateUpdate
from app.repositories.job_repository import JobRepository
from app.services.matching_service import MatchingService

from fastapi.responses import Response

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_database
from app.repositories.candidate_repository import CandidateRepository
from app.domain.models import CandidateCreate, CandidateDB


router = APIRouter(prefix="/candidates", tags=["candidates"])

def get_candidate_repo(db: AsyncIOMotorDatabase = Depends(get_database)) -> CandidateRepository:
    return CandidateRepository(db)

def get_job_repo(db: AsyncIOMotorDatabase = Depends(get_database)) -> JobRepository:
    return JobRepository(db)


@router.post("", response_model=CandidateDB, status_code=201)
async def create_candidate(
        file: UploadFile = File(...),
        payload: str = Form(...),
        repo: CandidateRepository = Depends(get_candidate_repo),
):
    data = CandidateCreate(**json.loads(payload))

    # Add resume metadata
    data.resume_filename = file.filename
    data.resume_content_type = file.content_type

    # Pass resume file separately
    resume_bytes = await file.read()

    return await repo.create(data, resume_file=resume_bytes)


@router.get("/{cand_id}", response_model=CandidateDB)
async def get_candidate(cand_id: str, repo: CandidateRepository = Depends(get_candidate_repo)):
    cand = await repo.get(cand_id)
    if not cand:
        raise HTTPException(404, "Candidate not found")
    return cand

@router.get("", response_model=List[CandidateDB])
async def list_candidates(skip: int = 0, limit: int = 50, repo: CandidateRepository = Depends(get_candidate_repo)):
    return await repo.list(skip=skip, limit=limit)

@router.patch("/{cand_id}", response_model=CandidateDB)
async def update_candidate(cand_id: str, payload: CandidateUpdate, repo: CandidateRepository = Depends(get_candidate_repo)):
    cand = await repo.update(cand_id, payload)
    if not cand:
        raise HTTPException(404, "Candidate not found")
    return cand

@router.delete("/{cand_id}", status_code=204)
async def delete_candidate(cand_id: str, repo: CandidateRepository = Depends(get_candidate_repo)):
    ok = await repo.delete(cand_id)
    if not ok:
        raise HTTPException(404, "Candidate not found")

@router.get("/{cand_id}/recommended-jobs")
async def recommended_jobs_for_candidate(
    cand_id: str,
    cand_repo: CandidateRepository = Depends(get_candidate_repo),
    job_repo: JobRepository = Depends(get_job_repo),
):
    candidate = await cand_repo.get(cand_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    jobs = await job_repo.list(skip=0, limit=1000)

    matcher = MatchingService()
    ranked = matcher.rank_jobs_for_candidate(candidate, jobs)

    # Optional: filter weak matches
    ranked = [r for r in ranked if r["score"] >= 40]

    return [
        {
            "job": r["job"],
            "score": r["score"],
            "semantic_score": r["semantic_score"],
            "rule_score": r["rule_score"],
        }
        for r in ranked
    ]

@router.get("/{cand_id}/resume")
async def download_resume(cand_id: str, repo: CandidateRepository = Depends(get_candidate_repo)):
    resume = await repo.get_resume_fields(cand_id)
    if not resume:
        raise HTTPException(404, "Candidate not found")

    resume_file = resume.get("resume_file")
    resume_filename = resume.get("resume_filename") or "resume"
    resume_content_type = resume.get("resume_content_type") or "application/octet-stream"

    if not resume_file:
        raise HTTPException(404, "Resume not found for this candidate")

    return Response(
        content=resume_file,
        media_type=resume_content_type,
        headers={"Content-Disposition": f'attachment; filename="{resume_filename}"'},
    )

@router.post("/{cand_id}/resume-upload")
async def upload_resume(
    cand_id: str,
    file: UploadFile = File(...),
    repo: CandidateRepository = Depends(get_candidate_repo),
):
    cand = await repo.get(cand_id)
    if not cand:
        raise HTTPException(404, "Candidate not found")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    # Store raw bytes in Mongo (works but keep files reasonably sized)
    await repo.collection.update_one(
        {"_id": ObjectId(cand_id)},
        {"$set": {
            "resume_file": content,
            "resume_filename": file.filename,
            "resume_content_type": file.content_type or "application/octet-stream",
            "updated_at": datetime.utcnow(),
        }},
    )

    return {"ok": True, "filename": file.filename, "content_type": file.content_type}