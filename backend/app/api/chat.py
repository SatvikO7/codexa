from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.security import get_current_user
from app.models.models import User, Project, ChatMessage, Subscription, SubscriptionTier
from app.schemas.schemas import ChatRequest, ChatResponse, ChatHistoryResponse
from app.services.chat_service import get_chat_response, check_token_limit
from app.core.config import settings
from datetime import datetime, timedelta
from collections import defaultdict
import time

router = APIRouter(prefix="/chat", tags=["Chat"])

# Rate limiting: Track requests per user
# Format: {user_id: [(timestamp1, timestamp2, ...)]}
rate_limit_tracker = defaultdict(list)

# Rate limits per tier (requests per minute)
RATE_LIMITS = {
    SubscriptionTier.FREE: 5,
    SubscriptionTier.BASIC: 10,
    SubscriptionTier.PRO: 20,
    SubscriptionTier.PRO_PLUS: 30,
}


def check_rate_limit(user_id: str, tier: SubscriptionTier) -> bool:
    """Check if user has exceeded rate limit.
    
    Returns True if allowed, False if rate limited.
    """
    now = time.time()
    limit = RATE_LIMITS.get(tier, 5)
    
    # Get user's recent requests
    user_requests = rate_limit_tracker[user_id]
    
    # Remove requests older than 1 minute
    user_requests[:] = [ts for ts in user_requests if now - ts < 60]
    
    # Check if under limit
    if len(user_requests) >= limit:
        return False
    
    # Add current request
    user_requests.append(now)
    return True


def get_tier_token_limit(tier: SubscriptionTier) -> int:
    """Get token limit for a tier."""
    limits = {
        SubscriptionTier.FREE: settings.FREE_TIER_TOKENS,
        SubscriptionTier.BASIC: settings.BASIC_TIER_TOKENS,
        SubscriptionTier.PRO: settings.PRO_TIER_TOKENS,
        SubscriptionTier.PRO_PLUS: settings.PRO_PLUS_TIER_TOKENS,
    }
    return limits.get(tier, settings.FREE_TIER_TOKENS)


@router.post("/{project_id}", response_model=ChatResponse)
async def chat_with_project(
    project_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response about the project."""
    # Get project
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if not project.is_embedded and project.embedding_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is still being processed. Please wait."
        )
    
    # Get subscription
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    tier = subscription.tier if subscription else SubscriptionTier.FREE
    
    # Check rate limit
    if not check_rate_limit(current_user.id, tier):
        limit = RATE_LIMITS.get(tier, 5)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. {tier.value.title()} tier allows {limit} requests per minute. Please wait."
        )
    
    # Check token limits
    token_limit = get_tier_token_limit(tier)
    
    # Reset tokens if new month
    now = datetime.utcnow()
    if current_user.token_reset_date.month != now.month or current_user.token_reset_date.year != now.year:
        current_user.tokens_used_this_month = 0
        current_user.token_reset_date = now
        await current_user.save()
    
    if current_user.tokens_used_this_month >= token_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly token limit reached ({token_limit:,} tokens). Upgrade for more."
        )
    
    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        project_id=project_id,
        role="user",
        content=request.message
    )
    await user_message.insert()
    
    # Get AI response with tier-based context limits
    try:
        response_text, tokens_charged = await get_chat_response(
            project_id=project_id,
            user_message=request.message,
            user_id=current_user.id,
            user_tier=tier
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get response: {str(e)}"
        )
    
    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        project_id=project_id,
        role="assistant",
        content=response_text,
        tokens_used=tokens_charged
    )
    await assistant_message.insert()
    
    # Update user token usage
    current_user.tokens_used_this_month += tokens_charged
    await current_user.save()
    
    return ChatResponse(
        message=response_text,
        tokens_used=tokens_charged,
        tokens_remaining=token_limit - current_user.tokens_used_this_month
    )


@router.get("/{project_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    project_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get chat history for a project."""
    # Verify project access
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get messages
    messages = await ChatMessage.find(
        ChatMessage.project_id == project_id,
        ChatMessage.user_id == current_user.id
    ).sort(+ChatMessage.created_at).limit(limit).to_list()
    
    # Get subscription for token info
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    tier = subscription.tier if subscription else SubscriptionTier.FREE
    token_limit = get_tier_token_limit(tier)
    
    return ChatHistoryResponse(
        messages=[{
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "tokens_used": m.tokens_used,
            "created_at": m.created_at.isoformat()
        } for m in messages],
        tokens_used=current_user.tokens_used_this_month,
        tokens_limit=token_limit
    )


@router.delete("/{project_id}/history")
async def clear_chat_history(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Clear chat history for a project."""
    # Verify project access
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete all messages for this project
    await ChatMessage.find(
        ChatMessage.project_id == project_id,
        ChatMessage.user_id == current_user.id
    ).delete()
    
    return {"message": "Chat history cleared"}


@router.get("/usage/me")
async def get_usage(current_user: User = Depends(get_current_user)):
    """Get current usage statistics."""
    from app.models.models import Project
    
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    tier = subscription.tier if subscription else SubscriptionTier.FREE
    
    # Get token limits
    token_limits = {
        SubscriptionTier.FREE: settings.FREE_TIER_TOKENS,
        SubscriptionTier.BASIC: settings.BASIC_TIER_TOKENS,
        SubscriptionTier.PRO: settings.PRO_TIER_TOKENS,
        SubscriptionTier.PRO_PLUS: settings.PRO_PLUS_TIER_TOKENS,
    }
    
    project_limits = {
        SubscriptionTier.FREE: settings.FREE_TIER_PROJECTS,
        SubscriptionTier.BASIC: settings.BASIC_TIER_PROJECTS,
        SubscriptionTier.PRO: settings.PRO_TIER_PROJECTS,
        SubscriptionTier.PRO_PLUS: settings.PRO_PLUS_TIER_PROJECTS,
    }
    
    # Count projects
    project_count = await Project.find(
        Project.user_id == current_user.id,
        Project.is_single_file == False
    ).count()
    
    token_limit = token_limits.get(tier, settings.FREE_TIER_TOKENS)
    
    return {
        "tokens_used": current_user.tokens_used_this_month,
        "tokens_limit": token_limit,
        "tokens_remaining": token_limit - current_user.tokens_used_this_month,
        "tier": tier.value,
        "projects_used": project_count,
        "projects_limit": project_limits.get(tier, 0),
        "reset_date": current_user.token_reset_date
    }
