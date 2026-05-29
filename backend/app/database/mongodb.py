from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from app.utils.logger import logger

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _db = _client[settings.MONGODB_DB_NAME]

    # Create indexes
    await _db.calls.create_index("call_sid", unique=True)
    await _db.calls.create_index("start_time")
    await _db.conversations.create_index("call_sid")
    await _db.conversations.create_index("timestamp")
    await _db.voice_profiles.create_index("voice_id", unique=True)

    logger.info(f"MongoDB connected: {settings.MONGODB_DB_NAME}")


async def disconnect_db():
    global _client
    if _client:
        _client.close()


async def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised — call connect_db() first")
    return _db
