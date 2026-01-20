from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.domain.models import JobCreate, JobUpdate, JobDB

def _serialize_id(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

class JobRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["jobs"]

    async def create(self, data: JobCreate) -> JobDB:
        now = datetime.utcnow()
        doc = data.model_dump()
        doc.update({"created_at": now, "updated_at": now})
        res = await self.collection.insert_one(doc)
        saved = await self.collection.find_one({"_id": res.inserted_id})
        return JobDB(**_serialize_id(saved))

    async def get(self, job_id: str) -> Optional[JobDB]:
        doc = await self.collection.find_one({"_id": ObjectId(job_id)})
        return JobDB(**_serialize_id(doc)) if doc else None

    async def list(self, skip: int = 0, limit: int = 50) -> List[JobDB]:
        cursor = self.collection.find().skip(skip).limit(limit).sort("created_at", -1)
        return [JobDB(**_serialize_id(d)) async for d in cursor]

    async def update(self, job_id: str, data: JobUpdate) -> Optional[JobDB]:
        update_doc = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        update_doc["updated_at"] = datetime.utcnow()
        await self.collection.update_one({"_id": ObjectId(job_id)}, {"$set": update_doc})
        return await self.get(job_id)

    async def delete(self, job_id: str) -> bool:
        res = await self.collection.delete_one({"_id": ObjectId(job_id)})
        return res.deleted_count == 1
