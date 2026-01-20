from fastapi import APIRouter, Depends, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_database
from app.repositories.job_repository import JobRepository
from app.domain.models import JobCreate, JobUpdate, JobDB

router = APIRouter(prefix="/jobs", tags=["jobs"])

def get_job_repo(db: AsyncIOMotorDatabase = Depends(get_database)) -> JobRepository:
    return JobRepository(db)

@router.post("", response_model=JobDB, status_code=201)
async def create_job(payload: JobCreate, repo: JobRepository = Depends(get_job_repo)):
    return await repo.create(payload)

@router.get("/{job_id}", response_model=JobDB)
async def get_job(job_id: str, repo: JobRepository = Depends(get_job_repo)):
    job = await repo.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.get("", response_model=List[JobDB])
async def list_jobs(skip: int = 0, limit: int = 50, repo: JobRepository = Depends(get_job_repo)):
    return await repo.list(skip=skip, limit=limit)

@router.patch("/{job_id}", response_model=JobDB)
async def update_job(job_id: str, payload: JobUpdate, repo: JobRepository = Depends(get_job_repo)):
    job = await repo.update(job_id, payload)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, repo: JobRepository = Depends(get_job_repo)):
    ok = await repo.delete(job_id)
    if not ok:
        raise HTTPException(404, "Job not found")
