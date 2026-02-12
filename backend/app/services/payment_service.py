import httpx
import hmac
import hashlib
from typing import Optional, Tuple
from datetime import datetime, timedelta
from app.core.config import settings
from app.models.models import SubscriptionTier

# Cashfree API configuration
CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg" if settings.CASHFREE_ENV == "sandbox" else "https://api.cashfree.com/pg"

# Pricing in INR and USD
TIER_PRICING = {
    SubscriptionTier.BASIC: {"INR": 249, "USD": 9},
    SubscriptionTier.PRO: {"INR": 749, "USD": 29},
    SubscriptionTier.PRO_PLUS: {"INR": 1999, "USD": 79},
}

# Plan IDs for Cashfree subscriptions
PLAN_IDS = {
    SubscriptionTier.BASIC: "codechat_basic",
    SubscriptionTier.PRO: "codechat_pro",
    SubscriptionTier.PRO_PLUS: "codechat_pro_plus",
}


def get_cashfree_headers() -> dict:
    """Get headers for Cashfree API requests."""
    return {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
    }


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Cashfree webhook signature."""
    if not settings.CASHFREE_SECRET_KEY:
        return True  # Skip verification in dev
    
    computed_signature = hmac.new(
        settings.CASHFREE_SECRET_KEY.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)


async def create_subscription_session(
    user_id: str,
    user_email: str,
    tier: SubscriptionTier,
    currency: str = "INR"
) -> dict:
    """
    Create a Cashfree subscription checkout session.
    Returns checkout URL and session details.
    """
    if tier == SubscriptionTier.FREE:
        raise ValueError("Cannot create subscription for free tier")
    
    price = TIER_PRICING.get(tier, {}).get(currency)
    if not price:
        raise ValueError("Invalid tier or currency")
    
    # Create order for one-time payment that initiates subscription
    order_data = {
        "order_id": f"{user_id}_{datetime.utcnow().timestamp():.0f}",
        "order_amount": price,
        "order_currency": currency,
        "customer_details": {
            "customer_id": user_id,
            "customer_email": user_email,
        },
        "order_meta": {
            "return_url": f"{settings.FRONTEND_URL}/dashboard/billing?status=success&order_id={{order_id}}",
            "notify_url": f"{settings.FRONTEND_URL}/api/v1/billing/webhook",
        },
        "order_note": f"CodeChat {tier.value} subscription"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CASHFREE_BASE_URL}/orders",
                json=order_data,
                headers=get_cashfree_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "order_id": data["order_id"],
                    "payment_session_id": data["payment_session_id"],
                    "payment_url": f"https://sandbox.cashfree.com/pg/pay/{data['payment_session_id']}" if settings.CASHFREE_ENV == "sandbox" else f"https://www.cashfree.com/pg/pay/{data['payment_session_id']}",
                    "amount": price,
                    "currency": currency,
                    "tier": tier.value
                }
            else:
                raise Exception(f"Cashfree error: {response.text}")
    
    except httpx.HTTPError as e:
        raise Exception(f"Payment error: {str(e)}")


async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription in Cashfree."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CASHFREE_BASE_URL}/subscriptions/{subscription_id}/cancel",
                headers=get_cashfree_headers()
            )
            return response.status_code in [200, 404]
    except Exception:
        return False


async def get_subscription_status(subscription_id: str) -> Optional[dict]:
    """Get subscription status from Cashfree."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CASHFREE_BASE_URL}/subscriptions/{subscription_id}",
                headers=get_cashfree_headers()
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception:
        return None


async def create_subscription_plan(tier: SubscriptionTier, currency: str = "INR") -> bool:
    """Create a subscription plan in Cashfree (one-time setup)."""
    if tier == SubscriptionTier.FREE:
        return False
    
    plan_data = {
        "plan_id": PLAN_IDS[tier],
        "plan_name": f"CodeChat {tier.value.title()}",
        "plan_type": "PERIODIC",
        "plan_currency": currency,
        "plan_recurring_amount": TIER_PRICING[tier][currency],
        "plan_interval_type": "MONTH",
        "plan_intervals": 1,
        "plan_max_cycles": 120,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CASHFREE_BASE_URL}/plans",
                json=plan_data,
                headers=get_cashfree_headers()
            )
            return response.status_code in [200, 409]
    except Exception:
        return False
