"""Firebase configuration and Firestore client."""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional
import os
from pathlib import Path
from datetime import datetime

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
    "portfolios": "portfolios",
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
    # Simple query without ordering to avoid index requirement
    query = (
        db.collection(COLLECTIONS["transactions"])
        .where("user_id", "==", user_id)
        .limit(limit)
    )
    
    # Sort in Python instead of Firestore to avoid composite index
    transactions = [doc.to_dict() for doc in query.stream()]
    return sorted(transactions, key=lambda x: x.get("date", ""), reverse=True)


# ─────────────────────────────────────────────────────────────
# Document Operations (Bank statements, etc.)
# ─────────────────────────────────────────────────────────────
async def check_document_exists(user_id: str, file_name: str) -> bool:
    """Check if a document with the same name already exists for this user."""
    db = get_db()
    query = (
        db.collection(COLLECTIONS["documents"])
        .where("user_id", "==", user_id)
        .where("name", "==", file_name)
        .limit(1)
    )
    docs = list(query.stream())
    return len(docs) > 0


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
    # Simple query without ordering to avoid index requirement
    query = (
        db.collection(COLLECTIONS["documents"])
        .where("user_id", "==", user_id)
    )
    
    # Sort in Python instead of Firestore to avoid composite index
    documents = [doc.to_dict() for doc in query.stream()]
    return sorted(documents, key=lambda x: x.get("uploaded_at", ""), reverse=True)


# ─────────────────────────────────────────────────────────────
# Goals Operations
# ─────────────────────────────────────────────────────────────
async def save_goal(goal_data: dict) -> str:
    """Save a financial goal with timestamps."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["goals"]).document()
    goal_data["id"] = doc_ref.id
    # Use ISO format strings for timestamps to avoid serialization issues
    now = datetime.utcnow().isoformat()
    goal_data["created_at"] = now
    goal_data["updated_at"] = now
    doc_ref.set(goal_data)
    return doc_ref.id


async def get_user_goals(user_id: str) -> list:
    """Get all goals for a user sorted by priority and creation date."""
    db = get_db()
    query = db.collection(COLLECTIONS["goals"]).where("user_id", "==", user_id)
    goals = [doc.to_dict() for doc in query.stream()]
    # Sort by priority (high first) then by created_at
    priority_order = {"high": 0, "medium": 1, "low": 2}
    return sorted(goals, key=lambda x: (priority_order.get(x.get("priority", "medium"), 1), str(x.get("created_at", ""))))


async def get_goal_by_id(goal_id: str) -> Optional[dict]:
    """Get a specific goal by ID."""
    db = get_db()
    doc = db.collection(COLLECTIONS["goals"]).document(goal_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    return None


async def update_goal(goal_id: str, updates: dict) -> bool:
    """Update a goal with timestamp."""
    db = get_db()
    updates["updated_at"] = datetime.utcnow().isoformat()
    db.collection(COLLECTIONS["goals"]).document(goal_id).update(updates)
    return True


async def delete_goal(goal_id: str) -> bool:
    """Delete a goal."""
    db = get_db()
    db.collection(COLLECTIONS["goals"]).document(goal_id).delete()
    return True


async def update_goal_progress(goal_id: str, current_amount: float) -> bool:
    """Update goal's current progress amount."""
    db = get_db()
    db.collection(COLLECTIONS["goals"]).document(goal_id).update({
        "current": current_amount,
        "updated_at": datetime.utcnow().isoformat()
    })
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
    # Simple query without ordering to avoid index requirement
    query = (
        db.collection(COLLECTIONS["insights"])
        .where("user_id", "==", user_id)
        .limit(limit)
    )
    
    # Sort in Python instead of Firestore
    insights = [doc.to_dict() for doc in query.stream()]
    return sorted(insights, key=lambda x: x.get("created_at", ""), reverse=True)


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


# ─────────────────────────────────────────────────────────────
# Portfolio Operations (Investment Holdings)
# ─────────────────────────────────────────────────────────────
async def save_portfolio(user_id: str, portfolio_data: dict) -> str:
    """Save or update a user's portfolio."""
    db = get_db()
    # Use user_id as document ID for single portfolio per user
    doc_ref = db.collection(COLLECTIONS["portfolios"]).document(user_id)
    portfolio_data["user_id"] = user_id
    portfolio_data["updated_at"] = firestore.SERVER_TIMESTAMP
    doc_ref.set(portfolio_data, merge=True)
    return user_id


async def get_user_portfolio(user_id: str) -> Optional[dict]:
    """Get user's portfolio."""
    db = get_db()
    doc = db.collection(COLLECTIONS["portfolios"]).document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


async def add_portfolio_holding(user_id: str, holding: dict) -> bool:
    """Add a holding to user's portfolio."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["portfolios"]).document(user_id)
    
    # Get current portfolio or create new
    doc = doc_ref.get()
    if doc.exists:
        portfolio = doc.to_dict()
        holdings = portfolio.get("holdings", [])
        
        # Check if holding already exists (by symbol)
        existing_idx = next((i for i, h in enumerate(holdings) if h.get("symbol") == holding.get("symbol")), None)
        if existing_idx is not None:
            # Update existing holding
            holdings[existing_idx] = holding
        else:
            # Add new holding
            holdings.append(holding)
        
        doc_ref.update({"holdings": holdings, "updated_at": firestore.SERVER_TIMESTAMP})
    else:
        # Create new portfolio with this holding
        doc_ref.set({
            "user_id": user_id,
            "holdings": [holding],
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
    
    return True


async def remove_portfolio_holding(user_id: str, symbol: str) -> bool:
    """Remove a holding from user's portfolio."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["portfolios"]).document(user_id)
    
    doc = doc_ref.get()
    if doc.exists:
        portfolio = doc.to_dict()
        holdings = portfolio.get("holdings", [])
        holdings = [h for h in holdings if h.get("symbol") != symbol]
        doc_ref.update({"holdings": holdings, "updated_at": firestore.SERVER_TIMESTAMP})
        return True
    
    return False


async def update_portfolio_holdings(user_id: str, holdings: list) -> bool:
    """Replace all holdings in user's portfolio."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["portfolios"]).document(user_id)
    
    doc_ref.set({
        "user_id": user_id,
        "holdings": holdings,
        "updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return True


async def clear_portfolio(user_id: str) -> bool:
    """Clear all holdings from user's portfolio."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["portfolios"]).document(user_id)
    
    doc_ref.set({
        "user_id": user_id,
        "holdings": [],
        "updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return True


# ─────────────────────────────────────────────────────────────
# Company Operations
# ─────────────────────────────────────────────────────────────

async def save_company_data(user_id: str, company_data: dict) -> dict:
    """Save or update company data for a user."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    
    company_data["user_id"] = user_id
    company_data["updated_at"] = firestore.SERVER_TIMESTAMP
    
    doc_ref.set(company_data, merge=True)
    return company_data


async def get_company_data(user_id: str) -> Optional[dict]:
    """Get company data for a user."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    doc = doc_ref.get()
    
    if doc.exists:
        return doc.to_dict()
    return None


async def save_company_transactions(user_id: str, transactions: list) -> bool:
    """Save company transactions."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    
    # Update or create the transactions subcollection
    for txn in transactions:
        txn_id = txn.get("id") or f"txn_{datetime.now().timestamp()}"
        txn["user_id"] = user_id
        txn["created_at"] = firestore.SERVER_TIMESTAMP
        company_ref.collection("transactions").document(txn_id).set(txn)
    
    return True


async def get_company_transactions(user_id: str, limit: int = 100) -> list:
    """Get company transactions."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    txns = company_ref.collection("transactions").order_by(
        "date", direction=firestore.Query.DESCENDING
    ).limit(limit).stream()
    
    return [txn.to_dict() for txn in txns]


async def save_company_employees(user_id: str, employees: list) -> bool:
    """Save company employee data."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    
    for emp in employees:
        emp_id = emp.get("id") or f"emp_{datetime.now().timestamp()}"
        emp["user_id"] = user_id
        company_ref.collection("employees").document(emp_id).set(emp, merge=True)
    
    return True


async def get_company_employees(user_id: str) -> list:
    """Get company employees."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    emps = company_ref.collection("employees").stream()
    
    return [emp.to_dict() for emp in emps]


async def save_company_budgets(user_id: str, budgets: list) -> bool:
    """Save company department budgets."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    
    doc_ref.set({
        "budgets": budgets,
        "budgets_updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return True


async def get_company_budgets(user_id: str) -> list:
    """Get company department budgets."""
    db = get_db()
    doc_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    doc = doc_ref.get()
    
    if doc.exists:
        return doc.to_dict().get("budgets", [])
    return []


async def save_fraud_alerts(user_id: str, alerts: list) -> bool:
    """Save fraud detection alerts."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    
    for alert in alerts:
        alert_id = alert.get("id") or f"alert_{datetime.now().timestamp()}"
        alert["user_id"] = user_id
        alert["created_at"] = firestore.SERVER_TIMESTAMP
        company_ref.collection("fraud_alerts").document(alert_id).set(alert, merge=True)
    
    return True


async def get_fraud_alerts(user_id: str) -> list:
    """Get fraud detection alerts."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    alerts = company_ref.collection("fraud_alerts").order_by(
        "created_at", direction=firestore.Query.DESCENDING
    ).limit(50).stream()
    
    return [alert.to_dict() for alert in alerts]


async def update_fraud_alert_status(user_id: str, alert_id: str, status: str) -> bool:
    """Update fraud alert status."""
    db = get_db()
    company_ref = db.collection(COLLECTIONS["companies"]).document(user_id)
    alert_ref = company_ref.collection("fraud_alerts").document(alert_id)
    
    alert_ref.update({
        "status": status,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    return True
