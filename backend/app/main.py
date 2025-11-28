"""FastAPI application exposing CFOSync AI agents as REST APIs."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional

from app.config import settings
from app.agents import get_runner, list_available_agents
from app.routes.auth import router as auth_router
from app.routes.agents import router as agents_api_router
from app.routes.statements import router as statements_router

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
    Main chat endpoint - routes through the coordinator agent.
    
    This is the recommended endpoint for general user queries.
    The coordinator will determine which agents to involve.
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
