"""Routes for managing bank statements and transactions."""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..auth import decode_token, TokenData
from ..firebase import (
    get_db,
    save_document,
    get_user_documents,
    add_transactions,
    get_user_transactions
)

router = APIRouter(prefix="/statements", tags=["statements"])


# ─────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated - please log in")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        token_data = decode_token(token)
        if token_data is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token - please log in again")
        
        return {"id": token_data.user_id, "email": token_data.email}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# ─────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    type: str  # 'income' or 'expense'
    category: str
    source: str  # which statement file it came from


class StatementCreate(BaseModel):
    name: str
    size: int
    file_type: str
    extracted_data: Optional[dict] = None
    transactions: Optional[List[TransactionCreate]] = None


class StatementResponse(BaseModel):
    id: str
    user_id: str
    name: str
    size: int
    file_type: str
    status: str
    uploaded_at: str
    extracted_data: Optional[dict] = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    date: str
    description: str
    amount: float
    type: str
    category: str
    source: str


# ─────────────────────────────────────────────────────────────
# Statement Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_statement(
    statement: StatementCreate,
    current_user: dict = Depends(get_current_user)
):
    """Upload and save a bank statement."""
    try:
        user_id = current_user["id"]
        
        # Check for duplicate - prevent uploading same file twice
        from ..firebase import check_document_exists
        if await check_document_exists(user_id, statement.name):
            return {
                "success": False,
                "duplicate": True,
                "message": f"Statement '{statement.name}' already exists. Skipping upload."
            }
        
        # Save the statement document
        doc_data = {
            "user_id": user_id,
            "name": statement.name,
            "size": statement.size,
            "file_type": statement.file_type,
            "status": "completed",
            "uploaded_at": datetime.utcnow().isoformat(),
            "extracted_data": statement.extracted_data
        }
        
        doc_id = await save_document(doc_data)
        
        # If transactions are provided, save them too
        transactions_saved = 0
        if statement.transactions:
            tx_data = []
            for tx in statement.transactions:
                tx_data.append({
                    "date": tx.date,
                    "description": tx.description,
                    "amount": tx.amount,
                    "type": tx.type,
                    "category": tx.category,
                    "source": tx.source,
                    "statement_id": doc_id,
                    "created_at": datetime.utcnow().isoformat()
                })
            
            await add_transactions(user_id, tx_data)
            transactions_saved = len(tx_data)
        
        return {
            "success": True,
            "statement_id": doc_id,
            "transactions_saved": transactions_saved,
            "message": f"Statement '{statement.name}' uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_statements(
    current_user: dict = Depends(get_current_user)
):
    """Get all statements for the current user."""
    try:
        user_id = current_user["id"]
        documents = await get_user_documents(user_id)
        
        return {
            "statements": documents,
            "count": len(documents)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def list_transactions(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all transactions for the current user."""
    try:
        user_id = current_user["id"]
        transactions = await get_user_transactions(user_id, limit)
        
        # Calculate summary
        total_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
        total_expenses = sum(abs(t["amount"]) for t in transactions if t.get("type") == "expense")
        
        # Group by category
        categories = {}
        for t in transactions:
            cat = t.get("category", "Other")
            if cat not in categories:
                categories[cat] = 0
            if t.get("type") == "expense":
                categories[cat] += abs(t["amount"])
        
        return {
            "transactions": transactions,
            "count": len(transactions),
            "summary": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net": total_income - total_expenses,
                "by_category": categories
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{statement_id}")
async def delete_statement(
    statement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a statement and its transactions."""
    try:
        db = get_db()
        user_id = current_user["id"]
        
        # Delete the statement document
        doc_ref = db.collection("documents").document(statement_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Statement not found")
        
        doc_data = doc.to_dict()
        if doc_data.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this statement")
        
        # Delete associated transactions
        tx_query = db.collection("transactions").where("statement_id", "==", statement_id)
        for tx_doc in tx_query.stream():
            tx_doc.reference.delete()
        
        # Delete the statement
        doc_ref.delete()
        
        return {
            "success": True,
            "message": "Statement deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_financial_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get a complete financial summary for the user."""
    try:
        user_id = current_user["id"]
        
        # Get all data
        documents = await get_user_documents(user_id)
        transactions = await get_user_transactions(user_id, 500)
        
        # Calculate metrics
        total_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
        total_expenses = sum(abs(t["amount"]) for t in transactions if t.get("type") == "expense")
        
        # Group expenses by category
        expense_categories = {}
        for t in transactions:
            if t.get("type") == "expense":
                cat = t.get("category", "Other")
                if cat not in expense_categories:
                    expense_categories[cat] = 0
                expense_categories[cat] += abs(t["amount"])
        
        # Sort categories by amount
        top_categories = sorted(
            [{"category": k, "amount": v} for k, v in expense_categories.items()],
            key=lambda x: x["amount"],
            reverse=True
        )[:5]
        
        # Get recent transactions
        recent = sorted(transactions, key=lambda x: x.get("date", ""), reverse=True)[:10]
        
        return {
            "statements_count": len(documents),
            "transactions_count": len(transactions),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_savings": total_income - total_expenses,
            "savings_rate": round((total_income - total_expenses) / total_income * 100, 1) if total_income > 0 else 0,
            "top_categories": top_categories,
            "recent_transactions": recent,
            "has_data": len(transactions) > 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
