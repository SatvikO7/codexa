from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# Enums
class SubscriptionTierEnum(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    PRO_PLUS = "pro_plus"


# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    picture: Optional[str] = None
    is_active: bool
    is_verified: bool
    tokens_used_this_month: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Subscription Schemas
class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    amount: float = 0
    currency: str = "INR"
    billing_cycle_start: Optional[datetime] = None
    billing_cycle_end: Optional[datetime] = None
    next_billing_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreateSubscriptionRequest(BaseModel):
    tier: str
    currency: str = "INR"


# Project Schemas
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    total_files: int = 0
    total_size: int = 0
    is_embedded: bool = False
    embedding_status: str = "pending"
    is_single_file: bool = False
    file_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


class SingleFileUpload(BaseModel):
    name: str
    file_name: str
    content: str


# Chat Schemas
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)


class ChatResponse(BaseModel):
    message: str
    tokens_used: int
    tokens_remaining: int


class ChatHistoryResponse(BaseModel):
    messages: List[dict]
    tokens_used: int
    tokens_limit: int


# Token/Usage Schemas
class UsageResponse(BaseModel):
    tokens_used: int
    tokens_limit: int
    projects_used: int
    projects_limit: int
    reset_date: datetime


# File Tree Schema
class FileTreeItem(BaseModel):
    name: str
    path: str
    is_dir: bool
    children: Optional[List["FileTreeItem"]] = None


FileTreeItem.model_rebuild()


class FileTreeResponse(BaseModel):
    files: List[FileTreeItem]


# Pricing Schema
class TierInfo(BaseModel):
    id: str
    name: str
    price_inr: int
    price_usd: int
    tokens: int
    projects: int
    features: List[str]


class PricingResponse(BaseModel):
    tiers: List[TierInfo]


# Payment Schemas
class PaymentInitiate(BaseModel):
    tier: SubscriptionTierEnum
    currency: str = "INR"


class PaymentResponse(BaseModel):
    payment_session_id: str
    payment_url: str
    order_id: str


# Generic Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True
