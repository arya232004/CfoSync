"""FastAPI application exposing CFOSync AI agents as REST APIs."""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional

from app.config import settings
from app.agents import get_runner, list_available_agents
from app.routes.auth import router as auth_router
from app.routes.agents import router as agents_api_router
from app.routes.statements import router as statements_router
from app.auth import decode_token
from app.firebase import (
    get_user_documents, 
    get_user_transactions, 
    get_user_portfolio,
    get_user_goals
)

app = FastAPI(
    title="CFOSync AI Backend",
    description="AI CFO + Financial Planner powered by Google ADK & Gemini",
    version="0.1.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(agents_api_router)  # /api/agents/* routes
app.include_router(statements_router, prefix="/api")  # /api/statements/* routes


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────
class AgentRequest(BaseModel):
    """Request body to invoke an agent."""
    user_id: str
    message: str
    session_id: Optional[str] = None
    context: Optional[dict[str, Any]] = None


class AuthenticatedChatRequest(BaseModel):
    """Request body for authenticated chat."""
    message: str
    session_id: Optional[str] = None


class AgentResponse(BaseModel):
    """Response from an agent invocation."""
    agent: str
    response: str
    session_id: Optional[str] = None
    events: Optional[list[dict]] = None
    data: Optional[dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "message": "CFOSync AI Backend is running"}


@app.get("/agents")
async def list_agents():
    """List all available agents."""
    agents = list_available_agents()
    return {
        "agents": agents,
        "count": len(agents),
        "descriptions": {
            "profile": "Builds user/company financial profiles",
            "insights": "Generates spending analysis and trends",
            "risk": "Detects risks, fraud, and compliance issues",
            "planning": "Creates budgets and financial plans",
            "simulation": "Runs what-if scenarios",
            "cashflow": "Manages cash flow and predictions",
            "cfo_strategy": "High-level business strategy",
            "nudge": "Generates notifications and alerts",
            "compliance": "Monitors tax and regulatory compliance",
            "document": "Extracts data from financial documents",
            "coordinator": "Orchestrates all agents (CFO Brain)",
        },
    }


@app.post("/agents/{agent_name}/invoke", response_model=AgentResponse)
async def invoke_agent(agent_name: str, request: AgentRequest):
    """
    Invoke a specific agent by name.
    
    The coordinator agent can be used as the main entry point for complex requests.
    """
    runner = get_runner(agent_name)
    
    if runner is None:
        available = list_available_agents()
        raise HTTPException(
            status_code=404, 
            detail=f"Agent '{agent_name}' not found. Available agents: {available}"
        )
    
    try:
        result = await runner.run(
            user_id=request.user_id,
            message=request.message,
            session_id=request.session_id,
            context=request.context,
        )
        return AgentResponse(
            agent=agent_name,
            response=result.get("response", ""),
            session_id=result.get("session_id"),
            events=result.get("events"),
            data=request.context,  # Echo context for reference
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: AgentRequest):
    """
    Main chat endpoint (legacy - without auth) - routes through the coordinator agent.
    """
    runner = get_runner("coordinator")
    
    try:
        result = await runner.run(
            user_id=request.user_id,
            message=request.message,
            session_id=request.session_id,
            context=request.context,
        )
        return AgentResponse(
            agent="coordinator",
            response=result.get("response", ""),
            session_id=result.get("session_id"),
            events=result.get("events"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_current_user_for_chat(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Get current user from JWT token (optional for chat)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        return None
    
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "user_type": payload.get("user_type", "individual")
    }


async def build_user_financial_context(user_id: str) -> dict[str, Any]:
    """
    Build comprehensive financial context for AI chat.
    Fetches all user financial data from Firebase.
    """
    context = {
        "user_id": user_id,
        "has_financial_data": False
    }
    
    try:
        # Get user transactions/documents
        documents = await get_user_documents(user_id)
        transactions = await get_user_transactions(user_id)
        portfolio = await get_user_portfolio(user_id)
        goals = await get_user_goals(user_id)
        
        # Process transactions
        if transactions:
            context["has_financial_data"] = True
            
            total_income = sum(t.get("amount", 0) for t in transactions if t.get("type") == "credit" or t.get("amount", 0) > 0)
            total_expenses = sum(abs(t.get("amount", 0)) for t in transactions if t.get("type") == "debit" or t.get("amount", 0) < 0)
            
            # Categorize spending
            categories = {}
            for t in transactions:
                cat = t.get("category", "Other")
                amt = abs(t.get("amount", 0))
                if t.get("type") == "debit" or t.get("amount", 0) < 0:
                    categories[cat] = categories.get(cat, 0) + amt
            
            # Sort categories by spending
            sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
            
            context["financial_summary"] = {
                "total_income": round(total_income, 2),
                "total_expenses": round(total_expenses, 2),
                "net_savings": round(total_income - total_expenses, 2),
                "savings_rate": round((total_income - total_expenses) / total_income * 100, 1) if total_income > 0 else 0,
                "transaction_count": len(transactions),
                "top_spending_categories": [
                    {"category": cat, "amount": round(amt, 2)} 
                    for cat, amt in sorted_categories[:5]
                ],
                "recent_transactions": [
                    {
                        "date": t.get("date", ""),
                        "description": t.get("description", "")[:50],
                        "amount": t.get("amount", 0),
                        "category": t.get("category", "Other")
                    }
                    for t in transactions[:10]  # Last 10 transactions
                ]
            }
        
        # Process portfolio/investments
        if portfolio and portfolio.get("holdings"):
            context["has_financial_data"] = True
            holdings = portfolio.get("holdings", [])
            
            total_portfolio_cost = sum(
                h.get("shares", 0) * h.get("purchase_price", 0) 
                for h in holdings
            )
            
            context["investment_summary"] = {
                "holdings_count": len(holdings),
                "total_portfolio_cost": round(total_portfolio_cost, 2),
                "risk_tolerance": portfolio.get("risk_tolerance", "moderate"),
                "holdings": [
                    {
                        "symbol": h.get("symbol", ""),
                        "shares": h.get("shares", 0),
                        "purchase_price": h.get("purchase_price", 0)
                    }
                    for h in holdings[:10]  # Top 10 holdings
                ]
            }
        
        # Process goals
        if goals:
            context["has_financial_data"] = True
            
            active_goals = [g for g in goals if g.get("status") != "completed"]
            completed_goals = [g for g in goals if g.get("status") == "completed"]
            
            total_target = sum(g.get("target_amount", 0) for g in active_goals)
            total_saved = sum(g.get("current_amount", 0) for g in active_goals)
            
            context["goals_summary"] = {
                "active_goals_count": len(active_goals),
                "completed_goals_count": len(completed_goals),
                "total_target_amount": round(total_target, 2),
                "total_saved_amount": round(total_saved, 2),
                "overall_progress": round(total_saved / total_target * 100, 1) if total_target > 0 else 0,
                "goals": [
                    {
                        "name": g.get("name", ""),
                        "category": g.get("category", ""),
                        "target": g.get("target_amount", 0),
                        "current": g.get("current_amount", 0),
                        "deadline": g.get("deadline", ""),
                        "priority": g.get("priority", "medium")
                    }
                    for g in active_goals[:5]  # Top 5 active goals
                ]
            }
        
        # Process documents
        if documents:
            context["documents_summary"] = {
                "total_documents": len(documents),
                "document_types": list(set(d.get("type", "unknown") for d in documents))
            }
        
    except Exception as e:
        print(f"Error building financial context: {e}")
        context["context_error"] = str(e)
    
    return context


@app.post("/api/chat")
async def authenticated_chat(
    request: AuthenticatedChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Authenticated chat endpoint with full user financial context.
    
    This endpoint automatically fetches the user's financial data
    and includes it as context for the AI to provide personalized responses.
    """
    runner = get_runner("coordinator")
    
    # Get authenticated user
    user = await get_current_user_for_chat(authorization)
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in to use AI chat."
        )
    
    user_id = user["id"]
    
    try:
        # Build comprehensive financial context
        financial_context = await build_user_financial_context(user_id)
        
        # Add user info to context
        financial_context["user_name"] = user.get("name", "User")
        financial_context["user_type"] = user.get("user_type", "individual")
        
        # Build enhanced prompt - the context will be injected by AgentRunner
        enhanced_message = request.message
        
        result = await runner.run(
            user_id=user_id,
            message=enhanced_message,
            session_id=request.session_id,
            context=financial_context,
        )
        
        return AgentResponse(
            agent="coordinator",
            response=result.get("response", ""),
            session_id=result.get("session_id"),
            events=result.get("events"),
            data={"has_context": financial_context.get("has_financial_data", False)}
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "gemini_model": settings.GEMINI_MODEL,
        "agents_available": len(list_available_agents()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
