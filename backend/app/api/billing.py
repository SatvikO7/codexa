from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.security import get_current_user
from app.models.models import User, Subscription, SubscriptionTier, SubscriptionStatus
from app.schemas.schemas import (
    SubscriptionResponse, CreateSubscriptionRequest, 
    UsageResponse, PricingResponse
)
from app.services.gumroad_service import (
    verify_license_key, get_subscriber_info, cancel_subscription,
    get_checkout_url, get_tier_from_product_id, TIER_PRICING, PRODUCT_IDS
)
from app.core.config import settings
from datetime import datetime, timedelta

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(current_user: User = Depends(get_current_user)):
    """Get current subscription details."""
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    
    if not subscription:
        # Create free subscription if none exists
        subscription = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE,
            status=SubscriptionStatus.ACTIVE
        )
        await subscription.insert()
    
    return SubscriptionResponse(
        tier=subscription.tier.value,
        status=subscription.status.value,
        billing_cycle_start=subscription.billing_cycle_start,
        billing_cycle_end=subscription.billing_cycle_end,
        next_billing_date=subscription.next_billing_date,
        amount=subscription.amount,
        currency=subscription.currency
    )


@router.get("/usage", response_model=UsageResponse)
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
    
    return UsageResponse(
        tokens_used=current_user.tokens_used_this_month,
        tokens_limit=token_limits.get(tier, settings.FREE_TIER_TOKENS),
        projects_used=project_count,
        projects_limit=project_limits.get(tier, 0),
        reset_date=current_user.token_reset_date
    )


@router.get("/pricing", response_model=PricingResponse)
async def get_pricing():
    """Get pricing information."""
    return PricingResponse(
        tiers=[
            {
                "id": "free",
                "name": "Free",
                "price_inr": 0,
                "price_usd": 0,
                "tokens": settings.FREE_TIER_TOKENS,
                "projects": settings.FREE_TIER_PROJECTS,
                "features": [
                    "Single file upload",
                    f"{settings.FREE_TIER_TOKENS:,} tokens/month",
                    "7-day retention",
                    "Basic support"
                ]
            },
            {
                "id": "basic",
                "name": "Basic",
                "price_inr": TIER_PRICING[SubscriptionTier.BASIC]["INR"],
                "price_usd": TIER_PRICING[SubscriptionTier.BASIC]["USD"],
                "tokens": settings.BASIC_TIER_TOKENS,
                "projects": settings.BASIC_TIER_PROJECTS,
                "features": [
                    f"{settings.BASIC_TIER_TOKENS:,} tokens/month",
                    f"{settings.BASIC_TIER_PROJECTS} project",
                    "Full project upload",
                    "Email support"
                ]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price_inr": TIER_PRICING[SubscriptionTier.PRO]["INR"],
                "price_usd": TIER_PRICING[SubscriptionTier.PRO]["USD"],
                "tokens": settings.PRO_TIER_TOKENS,
                "projects": settings.PRO_TIER_PROJECTS,
                "features": [
                    f"{settings.PRO_TIER_TOKENS:,} tokens/month",
                    f"{settings.PRO_TIER_PROJECTS} projects",
                    "Full project upload",
                    "Priority support"
                ]
            },
            {
                "id": "pro_plus",
                "name": "Pro+",
                "price_inr": TIER_PRICING[SubscriptionTier.PRO_PLUS]["INR"],
                "price_usd": TIER_PRICING[SubscriptionTier.PRO_PLUS]["USD"],
                "tokens": settings.PRO_PLUS_TIER_TOKENS,
                "projects": settings.PRO_PLUS_TIER_PROJECTS,
                "features": [
                    f"{settings.PRO_PLUS_TIER_TOKENS:,} tokens/month",
                    f"{settings.PRO_PLUS_TIER_PROJECTS} projects",
                    "Full project upload",
                    "Priority support",
                    "Early access to features"
                ]
            }
        ]
    )


@router.post("/checkout")
async def create_checkout(
    request: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """Get Gumroad checkout URL for a subscription tier."""
    tier = SubscriptionTier(request.tier)
    
    if tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot subscribe to free tier"
        )
    
    try:
        checkout_url = get_checkout_url(tier, current_user.email)
        return {
            "checkout_url": checkout_url,
            "tier": tier.value,
            "message": "Redirecting to Gumroad checkout"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout: {str(e)}"
        )


@router.post("/webhook")
async def gumroad_webhook(request: Request):
    """Handle Gumroad webhook (ping) for subscription events."""
    try:
        # Gumroad sends form-encoded data, not JSON
        form_data = await request.form()
        
        # Convert form data to dict
        body = dict(form_data)
        
        # Gumroad sends different event types
        # sale - new purchase/subscription
        # refund - refund issued
        # subscription_updated - subscription changed
        # subscription_ended - subscription cancelled
        
        seller_id = body.get("seller_id")
        product_permalink = body.get("permalink")  # Use 'permalink' not 'product_permalink'
        email = body.get("email")
        license_key = body.get("license_key")
        subscriber_id = body.get("subscription_id")  # Use 'subscription_id' not 'subscriber_id'
        
        print(f"Gumroad webhook received: {body}")
        
        if not email:
            return {"status": "ignored", "reason": "no email"}
        
        # Find user by email
        user = await User.find_one(User.email == email)
        if not user:
            return {"status": "ignored", "reason": "user not found", "email": email}
        
        # Determine tier from product_permalink
        tier = None
        if product_permalink == "codexa-basic":
            tier = SubscriptionTier.BASIC
        elif product_permalink == "codexa-pro":
            tier = SubscriptionTier.PRO
        elif product_permalink == "codexa-pro-plus":
            tier = SubscriptionTier.PRO_PLUS
        
        if not tier:
            return {"status": "ignored", "reason": "unknown product", "product": product_permalink}
        
        # Get or create subscription
        subscription = await Subscription.find_one(Subscription.user_id == user.id)
        if not subscription:
            subscription = Subscription(
                user_id=user.id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE
            )
        
        # Update subscription
        subscription.tier = tier
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.cashfree_subscription_id = subscriber_id  # Reuse field for Gumroad subscriber ID
        subscription.billing_cycle_start = datetime.utcnow()
        subscription.billing_cycle_end = datetime.utcnow() + timedelta(days=30)
        subscription.next_billing_date = subscription.billing_cycle_end
        subscription.amount = TIER_PRICING[tier]["USD"]
        subscription.currency = "USD"
        
        await subscription.save()
        
        print(f"Subscription activated: {user.email} -> {tier.value}")
        
        return {"status": "success", "tier": tier.value, "user": user.email}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


@router.post("/cancel")
async def cancel_user_subscription(current_user: User = Depends(get_current_user)):
    """Cancel current subscription."""
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    
    if not subscription or subscription.tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel"
        )
    
    subscriber_id = subscription.cashfree_subscription_id  # Gumroad subscriber ID
    if subscriber_id:
        try:
            await cancel_subscription(subscriber_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to cancel subscription: {str(e)}"
            )
    
    # Update subscription status
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.tier = SubscriptionTier.FREE
    await subscription.save()
    
    return {"message": "Subscription cancelled successfully. You can continue using paid features until the end of your billing period."}


@router.post("/activate-license")
async def activate_license(
    license_key: str,
    current_user: User = Depends(get_current_user)
):
    """Manually activate a subscription using a Gumroad license key."""
    # Try to verify with all product IDs
    purchase_data = None
    tier = None
    
    for t, product_id in PRODUCT_IDS.items():
        if product_id:
            data = await verify_license_key(license_key, product_id)
            if data:
                purchase_data = data
                tier = t
                break
    
    if not purchase_data or not tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid license key"
        )
    
    # Update subscription
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    if not subscription:
        subscription = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE,
            status=SubscriptionStatus.ACTIVE
        )
    
    subscription.tier = tier
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.cashfree_subscription_id = purchase_data.get("subscription_id")
    subscription.billing_cycle_start = datetime.utcnow()
    subscription.billing_cycle_end = datetime.utcnow() + timedelta(days=30)
    subscription.amount = TIER_PRICING[tier]["USD"]
    subscription.currency = "USD"
    
    await subscription.save()
    
    return {
        "message": "License activated successfully",
        "tier": tier.value,
        "subscription": SubscriptionResponse(
            tier=subscription.tier.value,
            status=subscription.status.value,
            billing_cycle_start=subscription.billing_cycle_start,
            billing_cycle_end=subscription.billing_cycle_end,
            next_billing_date=subscription.next_billing_date,
            amount=subscription.amount,
            currency=subscription.currency
        )
    }
