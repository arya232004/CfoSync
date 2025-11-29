"""Authentication routes for login, register, and user management."""

from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime
from typing import Optional

from app.auth import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    get_password_hash, 
    verify_password, 
    create_user_token,
    decode_token,
    TokenData
)
from app.firebase import (
    create_user, 
    get_user_by_email, 
    get_user_by_id,
    update_user,
    create_company,
    get_company_by_id,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None)) -> TokenData:
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token_data = decode_token(token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return token_data


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """
    Register a new user (individual or company).
    
    - **email**: User's email address
    - **password**: User's password (will be hashed)
    - **name**: User's full name or company name
    - **user_type**: "individual" or "company"
    """
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate user type
    if user_data.user_type not in ["individual", "company"]:
        raise HTTPException(status_code=400, detail="User type must be 'individual' or 'company'")
    
    # Create user document
    now = datetime.utcnow().isoformat()
    user_doc = {
        "email": user_data.email.lower(),
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "user_type": user_data.user_type,
        "is_onboarded": False,
        "created_at": now,
        "updated_at": now,
        "profile": {},  # Will be filled during onboarding
    }
    
    # Save to Firestore
    user_id = await create_user(user_doc)
    
    # If company, create a company document
    if user_data.user_type == "company":
        company_doc = {
            "name": user_data.name,
            "owner_id": user_id,
            "members": [{"user_id": user_id, "role": "owner", "email": user_data.email}],
            "is_onboarded": False,
            "created_at": now,
            "settings": {},
        }
        company_id = await create_company(company_doc)
        # Update user with company_id
        await update_user(user_id, {"company_id": company_id})
    
    # Create and return token
    return create_user_token(user_id, user_data.email, user_data.user_type)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Login with email and password.
    
    Returns JWT token for authenticated requests.
    """
    # Find user by email
    user = await get_user_by_email(credentials.email.lower())
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create and return token
    return create_user_token(user["id"], user["email"], user["user_type"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    """
    user = await get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        user_type=user["user_type"],
        is_onboarded=user.get("is_onboarded", False),
        created_at=user["created_at"],
    )


@router.put("/profile")
async def update_profile(
    profile_data: dict,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Update user's profile data.
    """
    updates = {
        "profile": profile_data,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    await update_user(current_user.user_id, updates)
    
    return {"message": "Profile updated successfully"}


@router.post("/complete-onboarding")
async def complete_onboarding(
    onboarding_data: dict,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Mark user as onboarded and save onboarding data.
    """
    updates = {
        "is_onboarded": True,
        "profile": onboarding_data,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    await update_user(current_user.user_id, updates)
    
    return {"message": "Onboarding completed successfully"}


@router.get("/verify")
async def verify_token(current_user: TokenData = Depends(get_current_user)):
    """
    Verify if the current token is valid.
    """
    return {
        "valid": True,
        "user_id": current_user.user_id,
        "user_type": current_user.user_type,
        "email": current_user.email,
    }


from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Change user's password.
    Requires current password for verification.
    """
    # Get user from database
    user = await get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Update password
    new_hash = get_password_hash(request.new_password)
    await update_user(current_user.user_id, {
        "password_hash": new_hash,
        "updated_at": datetime.utcnow().isoformat()
    })
    
    return {"message": "Password updated successfully"}
