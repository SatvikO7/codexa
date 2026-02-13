from fastapi import APIRouter, HTTPException, status, Depends
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)
from app.models.models import User, Subscription, SubscriptionTier, SubscriptionStatus
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse, RefreshTokenRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if user exists
    existing_user = await User.find_one(User.email == user_data.email)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name
    )
    await user.insert()
    
    # Create free subscription
    subscription = Subscription(
        user_id=user.id,
        tier=SubscriptionTier.FREE,
        status=SubscriptionStatus.ACTIVE
    )
    await subscription.insert()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user.model_dump())
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login user."""
    user = await User.find_one(User.email == user_data.email)
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user.model_dump())
    )


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
