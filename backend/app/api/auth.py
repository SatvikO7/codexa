from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
import httpx
from urllib.parse import urlencode
from app.core.config import settings
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, get_current_user
)
from app.models.models import User, Subscription, SubscriptionTier, SubscriptionStatus
from app.schemas.schemas import UserResponse, TokenResponse, RefreshTokenRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/google/login")
async def google_login():
    """Initiate Google OAuth login."""
    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback."""
    try:
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code': code,
                    'client_id': settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'redirect_uri': settings.GOOGLE_REDIRECT_URI,
                    'grant_type': 'authorization_code'
                }
            )
            token_data = token_response.json()
            
            if 'error' in token_data:
                raise HTTPException(status_code=400, detail=token_data['error'])
            
            access_token = token_data.get('access_token')
            
            # Get user info from Google
            user_response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            user_info = user_response.json()

        
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        google_id = user_info.get('sub')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Check if user exists
        user = await User.find_one(User.email == email)
        
        if not user:
            # Create new user
            user = User(
                email=email,
                name=name,
                picture=picture,
                oauth_provider="google",
                oauth_id=google_id,
                is_verified=True  # Google emails are verified
            )
            await user.insert()
            
            # Create free subscription
            subscription = Subscription(
                user_id=user.id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE
            )
            await subscription.insert()
        else:
            # Update existing user with OAuth info if not set
            if not user.oauth_provider:
                user.oauth_provider = "google"
                user.oauth_id = google_id
                user.picture = picture
                user.is_verified = True
                await user.save()
        
        # Generate tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Redirect to frontend with tokens
        frontend_url = settings.FRONTEND_URL
        redirect_url = f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"OAuth error: {e}")
        # Redirect to frontend with error
        frontend_url = settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: RefreshTokenRequest):
    """Refresh access token."""
    payload = decode_token(token_data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = await User.find_one(User.id == user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user.model_dump())
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse.model_validate(current_user.model_dump())
