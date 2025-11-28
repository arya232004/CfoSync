"""Authentication utilities - JWT tokens and password hashing."""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
import os

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: str


class TokenData(BaseModel):
    user_id: Optional[str] = None
    user_type: Optional[str] = None
    email: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    user_type: str  # "individual" or "company"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    user_type: str
    is_onboarded: bool
    created_at: str


# ─────────────────────────────────────────────────────────────
# Password Functions
# ─────────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


# ─────────────────────────────────────────────────────────────
# JWT Token Functions
# ─────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("user_type")
        email: str = payload.get("email")
        
        if user_id is None:
            return None
        
        return TokenData(user_id=user_id, user_type=user_type, email=email)
    except JWTError:
        return None


def create_user_token(user_id: str, email: str, user_type: str) -> Token:
    """Create a complete token response for a user."""
    access_token = create_access_token(
        data={
            "sub": user_id,
            "email": email,
            "user_type": user_type,
        }
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type=user_type,
        user_id=user_id,
    )
