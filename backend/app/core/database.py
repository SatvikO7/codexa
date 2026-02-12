from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# MongoDB client
client: AsyncIOMotorClient = None


async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Import document models here to avoid circular imports
    from app.models.models import User, Subscription, Project, ChatMessage, FileEmbedding
    
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[User, Subscription, Project, ChatMessage, FileEmbedding]
    )


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()


def get_database():
    """Get the database instance."""
    return client[settings.MONGODB_DB_NAME]
