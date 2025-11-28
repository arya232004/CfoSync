"""Firebase configuration and Firestore client."""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional
import os
from pathlib import Path

# Initialize Firebase Admin SDK
_app: Optional[firebase_admin.App] = None
_db = None


def init_firebase():
    """Initialize Firebase Admin SDK."""
    global _app, _db
    
    if _app is not None:
        return _db
    
    # Get the backend directory (where firebase-credentials.json should be)
    backend_dir = Path(__file__).parent.parent
    
    # Check for service account key file
    cred_path = os.getenv("FIREBASE_CREDENTIALS")
    if cred_path is None:
        # Default to firebase-credentials.json in the backend directory
        cred_path = backend_dir / "firebase-credentials.json"
    else:
        cred_path = Path(cred_path)
    
    print(f"Looking for Firebase credentials at: {cred_path}")
    
    if cred_path.exists():
        print(f"Found credentials file, initializing Firebase...")
        cred = credentials.Certificate(str(cred_path))
        _app = firebase_admin.initialize_app(cred)
        _db = firestore.client()
        print("Firebase initialized successfully!")
    else:
        print(f"WARNING: Firebase credentials not found at {cred_path}")
        print("Firebase features will not work without valid credentials.")
        # For development without credentials - use emulator or default
        try:
            _app = firebase_admin.initialize_app()
            _db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            _db = None
    
    return _db


def get_db():
    """Get Firestore client instance."""
    global _db
    if _db is None:
        init_firebase()
    return _db


def get_auth():
    """Get Firebase Auth instance."""
    if _app is None:
        init_firebase()
    return auth


# Collection names
COLLECTIONS = {
    "users": "users",
    "companies": "companies",
    "transactions": "transactions",
    "documents": "documents",
    "goals": "goals",
    "insights": "insights",
    "notifications": "notifications",
    "chat_sessions": "chat_sessions",
}


# ─────────────────────────────────────────────────────────────
# User Operations
# ─────────────────────────────────────────────────────────────
async def create_user(user_data: dict) -> str:
    """Create a new user in Firestore."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["users"]).document()
    user_data["id"] = doc_ref.id
    doc_ref.set(user_data)
    return doc_ref.id


async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    db = get_db()
    users_ref = db.collection(COLLECTIONS["users"])
    query = users_ref.where("email", "==", email).limit(1)
    docs = query.stream()
    
    for doc in docs:
        return doc.to_dict()
    return None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID."""
    db = get_db()
    doc = db.collection(COLLECTIONS["users"]).document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


async def update_user(user_id: str, updates: dict) -> bool:
    """Update user data."""
    db = get_db()
    db.collection(COLLECTIONS["users"]).document(user_id).update(updates)
    return True


# ─────────────────────────────────────────────────────────────
# Company Operations
# ─────────────────────────────────────────────────────────────
async def create_company(company_data: dict) -> str:
    """Create a new company in Firestore."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["companies"]).document()
    company_data["id"] = doc_ref.id
    doc_ref.set(company_data)
    return doc_ref.id


async def get_company_by_id(company_id: str) -> Optional[dict]:
    """Get company by ID."""
    db = get_db()
    doc = db.collection(COLLECTIONS["companies"]).document(company_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


async def update_company(company_id: str, updates: dict) -> bool:
    """Update company data."""
    db = get_db()
    db.collection(COLLECTIONS["companies"]).document(company_id).update(updates)
    return True


# ─────────────────────────────────────────────────────────────
# Transaction Operations
# ─────────────────────────────────────────────────────────────
async def add_transactions(user_id: str, transactions: list) -> list:
    """Add multiple transactions for a user."""
    db = get_db()
    batch = db.batch()
    ids = []
    
    for tx in transactions:
        doc_ref = db.collection(COLLECTIONS["transactions"]).document()
        tx["id"] = doc_ref.id
        tx["user_id"] = user_id
        batch.set(doc_ref, tx)
        ids.append(doc_ref.id)
    
    batch.commit()
    return ids


async def get_user_transactions(user_id: str, limit: int = 100) -> list:
    """Get transactions for a user."""
    db = get_db()
    query = (
        db.collection(COLLECTIONS["transactions"])
        .where("user_id", "==", user_id)
        .order_by("date", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    
    return [doc.to_dict() for doc in query.stream()]


# ─────────────────────────────────────────────────────────────
# Document Operations (Bank statements, etc.)
# ─────────────────────────────────────────────────────────────
async def save_document(doc_data: dict) -> str:
    """Save a document record."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["documents"]).document()
    doc_data["id"] = doc_ref.id
    doc_ref.set(doc_data)
    return doc_ref.id


async def get_user_documents(user_id: str) -> list:
    """Get all documents for a user."""
    db = get_db()
    query = (
        db.collection(COLLECTIONS["documents"])
        .where("user_id", "==", user_id)
        .order_by("uploaded_at", direction=firestore.Query.DESCENDING)
    )
    
    return [doc.to_dict() for doc in query.stream()]


# ─────────────────────────────────────────────────────────────
# Goals Operations
# ─────────────────────────────────────────────────────────────
async def save_goal(goal_data: dict) -> str:
    """Save a financial goal."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["goals"]).document()
    goal_data["id"] = doc_ref.id
    doc_ref.set(goal_data)
    return doc_ref.id


async def get_user_goals(user_id: str) -> list:
    """Get all goals for a user."""
    db = get_db()
    query = db.collection(COLLECTIONS["goals"]).where("user_id", "==", user_id)
    return [doc.to_dict() for doc in query.stream()]


async def update_goal(goal_id: str, updates: dict) -> bool:
    """Update a goal."""
    db = get_db()
    db.collection(COLLECTIONS["goals"]).document(goal_id).update(updates)
    return True


# ─────────────────────────────────────────────────────────────
# Insights Operations
# ─────────────────────────────────────────────────────────────
async def save_insight(insight_data: dict) -> str:
    """Save an AI-generated insight."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["insights"]).document()
    insight_data["id"] = doc_ref.id
    doc_ref.set(insight_data)
    return doc_ref.id


async def get_user_insights(user_id: str, limit: int = 20) -> list:
    """Get insights for a user."""
    db = get_db()
    query = (
        db.collection(COLLECTIONS["insights"])
        .where("user_id", "==", user_id)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    
    return [doc.to_dict() for doc in query.stream()]


# ─────────────────────────────────────────────────────────────
# Chat Session Operations
# ─────────────────────────────────────────────────────────────
async def save_chat_message(session_id: str, message: dict) -> str:
    """Save a chat message."""
    db = get_db()
    doc_ref = (
        db.collection(COLLECTIONS["chat_sessions"])
        .document(session_id)
        .collection("messages")
        .document()
    )
    message["id"] = doc_ref.id
    doc_ref.set(message)
    return doc_ref.id


async def get_chat_history(session_id: str, limit: int = 50) -> list:
    """Get chat history for a session."""
    db = get_db()
    query = (
        db.collection(COLLECTIONS["chat_sessions"])
        .document(session_id)
        .collection("messages")
        .order_by("timestamp")
        .limit(limit)
    )
    
    return [doc.to_dict() for doc in query.stream()]
