from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

class MongoClientFactory:
    _client: Optional[AsyncIOMotorClient] = None
    _db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            cls._client = AsyncIOMotorClient(settings.MONGODB_URI)
        return cls._client

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls._db is None:
            cls._db = cls.get_client()[settings.MONGODB_DB]
        return cls._db

async def get_database() -> AsyncIOMotorDatabase:
    # FastAPI dependency
    return MongoClientFactory.get_db()
