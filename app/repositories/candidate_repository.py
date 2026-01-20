from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.domain.models import CandidateCreate, CandidateUpdate, CandidateDB


def _serialize_id(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    # Remove resume_file if present (shouldn't be queried, but just in case)
    doc.pop("resume_file", None)
    return doc


class CandidateRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["candidates"]

    async def create(self, data: CandidateCreate, resume_file: bytes = None) -> CandidateDB:
        now = datetime.utcnow()
        doc = data.model_dump()

        # Add resume file if provided
        if resume_file:
            doc["resume_file"] = resume_file

        doc.update({"created_at": now, "updated_at": now})
        res = await self.collection.insert_one(doc)

        # Fetch without resume_file
        saved = await self.collection.find_one(
            {"_id": res.inserted_id},
            {"resume_file": 0}  # Exclude binary field
        )
        return CandidateDB(**_serialize_id(saved))

    async def get(self, cand_id: str) -> Optional[CandidateDB]:
        doc = await self.collection.find_one(
            {"_id": ObjectId(cand_id)},
            {"resume_file": 0}  # Exclude binary field
        )
        return CandidateDB(**_serialize_id(doc)) if doc else None

    async def list(self, skip: int = 0, limit: int = 50) -> List[CandidateDB]:
        cursor = self.collection.find(
            {},
            {"resume_file": 0}  # Exclude binary field
        ).skip(skip).limit(limit).sort("created_at", -1)
        return [CandidateDB(**_serialize_id(d)) async for d in cursor]

    async def update(self, cand_id: str, data: CandidateUpdate) -> Optional[CandidateDB]:
        update_doc = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        update_doc["updated_at"] = datetime.utcnow()
        await self.collection.update_one({"_id": ObjectId(cand_id)}, {"$set": update_doc})
        return await self.get(cand_id)

    async def delete(self, cand_id: str) -> bool:
        res = await self.collection.delete_one({"_id": ObjectId(cand_id)})
        return res.deleted_count == 1

    async def get_resume_fields(self, cand_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(
            {"_id": ObjectId(cand_id)},
            {"resume_file": 1, "resume_filename": 1, "resume_content_type": 1}
        )
        if not doc:
            return None

        return {
            "resume_file": doc.get("resume_file"),
            "resume_filename": doc.get("resume_filename"),
            "resume_content_type": doc.get("resume_content_type"),
        }