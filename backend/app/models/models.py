from beanie import Document, Indexed, Link
from pydantic import Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    PRO_PLUS = "pro_plus"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PENDING = "pending"


class User(Document):
    id: str = Field(default_factory=generate_id)
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # Token usage tracking
    tokens_used_this_month: int = 0
    token_reset_date: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"
        use_state_management = True


class Subscription(Document):
    id: str = Field(default_factory=generate_id)
    user_id: Indexed(str)
    tier: SubscriptionTier = SubscriptionTier.FREE
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    
    # Cashfree subscription details
    cashfree_subscription_id: Optional[str] = None
    cashfree_plan_id: Optional[str] = None
    
    # Billing
    amount: float = 0
    currency: str = "INR"
    billing_cycle_start: datetime = Field(default_factory=datetime.utcnow)
    billing_cycle_end: Optional[datetime] = None
    next_billing_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "subscriptions"


class Project(Document):
    id: str = Field(default_factory=generate_id)
    user_id: Indexed(str)
    name: str
    description: Optional[str] = None
    
    # File storage (R2)
    storage_key: Optional[str] = None  # R2 key prefix for project files
    total_files: int = 0
    total_size: int = 0  # in bytes
    
    # Embedding status
    is_embedded: bool = False
    embedding_status: str = "pending"  # pending, processing, completed, failed
    
    # Single file mode (for free tier)
    is_single_file: bool = False
    file_content: Optional[str] = None
    file_name: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "projects"


class ChatMessage(Document):
    id: str = Field(default_factory=generate_id)
    user_id: Indexed(str)
    project_id: Indexed(str)
    
    role: str  # user or assistant
    content: str
    tokens_used: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "chat_messages"


class FileEmbedding(Document):
    id: str = Field(default_factory=generate_id)
    project_id: Indexed(str)
    file_path: str
    chunk_index: int
    content: str
    embedding_id: Optional[str] = None  # ChromaDB document ID
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "file_embeddings"
