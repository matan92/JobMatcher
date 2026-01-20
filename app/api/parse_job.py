from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_job_parser import parse_job_text

router = APIRouter(prefix="/parse-job", tags=["jobs"])


class JobText(BaseModel):
    text: str


@router.post("")
async def parse_job(payload: JobText):
    return await parse_job_text(payload.text)
