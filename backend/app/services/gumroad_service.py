import httpx
from typing import Optional, Dict
from app.core.config import settings
from app.models.models import SubscriptionTier

# Gumroad API base URL
GUMROAD_API_URL = "https://api.gumroad.com/v2"

# Pricing in INR and USD
TIER_PRICING = {
    SubscriptionTier.BASIC: {"INR": 249, "USD": 9},
    SubscriptionTier.PRO: {"INR": 749, "USD": 29},
    SubscriptionTier.PRO_PLUS: {"INR": 1999, "USD": 79},
}

# Product IDs mapping
PRODUCT_IDS = {
    SubscriptionTier.BASIC: settings.GUMROAD_BASIC_PRODUCT_ID,
    SubscriptionTier.PRO: settings.GUMROAD_PRO_PRODUCT_ID,
    SubscriptionTier.PRO_PLUS: settings.GUMROAD_PRO_PLUS_PRODUCT_ID,
}


async def verify_license_key(license_key: str, product_id: str) -> Optional[Dict]:
    """Verify a Gumroad license key.
    
    Returns license data if valid, None if invalid.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GUMROAD_API_URL}/licenses/verify",
                data={
                    "product_id": product_id,
                    "license_key": license_key,
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return data.get("purchase")
            return None
    except Exception as e:
        print(f"Gumroad verify error: {e}")
        return None


async def get_subscriber_info(subscriber_id: str) -> Optional[Dict]:
    """Get subscriber information from Gumroad."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GUMROAD_API_URL}/subscribers/{subscriber_id}",
                params={"access_token": settings.GUMROAD_ACCESS_TOKEN}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return data.get("subscriber")
            return None
    except Exception as e:
        print(f"Gumroad subscriber error: {e}")
        return None


async def cancel_subscription(subscriber_id: str) -> bool:
    """Cancel a Gumroad subscription."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GUMROAD_API_URL}/subscribers/{subscriber_id}",
                params={"access_token": settings.GUMROAD_ACCESS_TOKEN}
            )
            return response.status_code == 200
    except Exception:
        return False


def get_checkout_url(tier: SubscriptionTier, user_email: str) -> str:
    """Generate Gumroad checkout URL for a tier with redirect.
    
    Note: You need to create products in Gumroad dashboard first.
    """
    product_id = PRODUCT_IDS.get(tier)
    if not product_id:
        raise ValueError(f"No product ID configured for tier: {tier}")
    
    # Gumroad checkout URL with prefilled email and redirect
    redirect_url = f"{settings.FRONTEND_URL}/dashboard/billing?success=true&tier={tier.value}"
    return f"https://gumroad.com/l/{product_id}?email={user_email}&wanted=true&redirect_url={redirect_url}"


def get_tier_from_product_id(product_id: str) -> Optional[SubscriptionTier]:
    """Get subscription tier from Gumroad product ID."""
    for tier, pid in PRODUCT_IDS.items():
        if pid == product_id:
            return tier
    return None
