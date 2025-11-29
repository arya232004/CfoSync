"""
Coordinator Agent (CFO Brain) - Orchestrates all other agents using Google ADK.

This is the master agent that uses sub-agents to handle complex multi-agent workflows.
It's the entry point for all user requests in CFOSync.
"""

import json
from typing import Any
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner

# Import all sub-agents
from app.agents.profile_agent import create_profile_agent
from app.agents.document_agent import create_document_agent
from app.agents.insights_agent import create_insights_agent
from app.agents.risk_agent import create_risk_agent
from app.agents.planning_agent import create_planning_agent
from app.agents.simulation_agent import create_simulation_agent
from app.agents.cashflow_agent import create_cashflow_agent
from app.agents.cfo_strategy_agent import create_cfo_strategy_agent
from app.agents.nudge_agent import create_nudge_agent
from app.agents.compliance_agent import create_compliance_agent


# =============================================================================
# COORDINATOR AGENT TOOLS (for direct orchestration tasks)
# =============================================================================

def analyze_user_request(request: str) -> dict[str, Any]:
    """
    Analyze a user request to determine which agents should handle it.
    
    Args:
        request: The user's request or query
    
    Returns:
        dict with recommended agents and workflow
    """
    request_lower = request.lower()
    
    # Keywords mapping to agents
    agent_keywords = {
        "profile_agent": ["profile", "onboard", "setup", "who am i", "my details", "financial identity"],
        "document_agent": ["upload", "bank statement", "invoice", "parse", "extract", "document", "salary slip"],
        "insights_agent": ["spending", "analysis", "trends", "insights", "where", "how much", "category", "breakdown"],
        "risk_agent": ["risk", "overspend", "fraud", "unusual", "alert", "warning", "debt"],
        "planning_agent": ["budget", "plan", "goal", "save", "allocate", "strategy"],
        "simulation_agent": ["what if", "simulate", "projection", "if i", "scenario", "impact"],
        "cashflow_agent": ["cash flow", "liquidity", "runway", "payment", "receivable", "collection"],
        "cfo_strategy_agent": ["strategy", "fundraise", "valuation", "board", "unit economics", "growth"],
        "nudge_agent": ["remind", "notify", "alert", "nudge", "message"],
        "compliance_agent": ["tax", "gst", "tds", "compliance", "filing", "deadline", "legal"],
    }
    
    recommended_agents = []
    confidence_scores = {}
    
    for agent, keywords in agent_keywords.items():
        score = sum(1 for kw in keywords if kw in request_lower)
        if score > 0:
            confidence_scores[agent] = score
            recommended_agents.append(agent)
    
    # Sort by confidence
    recommended_agents.sort(key=lambda x: confidence_scores.get(x, 0), reverse=True)
    
    # Determine if this is a compound request
    is_compound = len(recommended_agents) > 1
    
    # Suggest workflow
    if not recommended_agents:
        recommended_agents = ["insights_agent"]  # Default to insights
        workflow = "single_agent"
    elif is_compound:
        workflow = "multi_agent"
    else:
        workflow = "single_agent"
    
    return {
        "original_request": request,
        "recommended_agents": recommended_agents[:3],  # Top 3
        "primary_agent": recommended_agents[0] if recommended_agents else "insights_agent",
        "workflow_type": workflow,
        "confidence_scores": {a: confidence_scores.get(a, 0) for a in recommended_agents[:3]},
        "is_compound_request": is_compound,
    }


def create_workflow_plan(
    request_type: str,
    user_type: str,
    context: str,
) -> dict[str, Any]:
    """
    Create a detailed workflow plan for handling a request.
    
    Args:
        request_type: Type of request (onboarding, analysis, planning, etc.)
        user_type: 'individual' or 'company'
        context: JSON string of additional context (use \"{}\" if none)
    
    Returns:
        dict with workflow steps and agent sequence
    """
    try:
        ctx = json.loads(context) if isinstance(context, str) else context
    except:
        ctx = {}
    
    # Predefined workflows
    workflows = {
        "onboarding": {
            "name": "New User Onboarding",
            "steps": [
                {"step": 1, "agent": "profile_agent", "action": "Build financial profile from user data"},
                {"step": 2, "agent": "document_agent", "action": "Process uploaded bank statements"},
                {"step": 3, "agent": "insights_agent", "action": "Generate initial spending analysis"},
                {"step": 4, "agent": "planning_agent", "action": "Create first budget recommendation"},
                {"step": 5, "agent": "risk_agent", "action": "Initial risk assessment"},
            ],
            "estimated_time": "2-3 minutes",
        },
        "monthly_review": {
            "name": "Monthly Financial Review",
            "steps": [
                {"step": 1, "agent": "insights_agent", "action": "Analyze month's transactions"},
                {"step": 2, "agent": "risk_agent", "action": "Check budget compliance"},
                {"step": 3, "agent": "planning_agent", "action": "Adjust next month's budget"},
                {"step": 4, "agent": "nudge_agent", "action": "Generate monthly summary"},
            ],
            "estimated_time": "1 minute",
        },
        "overspending_alert": {
            "name": "Overspending Detection & Response",
            "steps": [
                {"step": 1, "agent": "insights_agent", "action": "Detect overspending pattern"},
                {"step": 2, "agent": "risk_agent", "action": "Assess severity and impact"},
                {"step": 3, "agent": "planning_agent", "action": "Recalculate remaining budget"},
                {"step": 4, "agent": "nudge_agent", "action": "Send alert to user"},
            ],
            "estimated_time": "30 seconds",
        },
        "late_payment": {
            "name": "Late Payment Handling (Companies)",
            "steps": [
                {"step": 1, "agent": "cashflow_agent", "action": "Predict payment delay"},
                {"step": 2, "agent": "simulation_agent", "action": "Calculate cash flow impact"},
                {"step": 3, "agent": "cfo_strategy_agent", "action": "Recommend action"},
                {"step": 4, "agent": "nudge_agent", "action": "Send reminder to client"},
            ],
            "estimated_time": "45 seconds",
        },
        "simulation": {
            "name": "What-If Analysis",
            "steps": [
                {"step": 1, "agent": "simulation_agent", "action": "Run requested scenario"},
                {"step": 2, "agent": "risk_agent", "action": "Assess risks of scenario"},
                {"step": 3, "agent": "planning_agent", "action": "Suggest adjusted plan if needed"},
            ],
            "estimated_time": "30 seconds",
        },
        "compliance_check": {
            "name": "Compliance Review",
            "steps": [
                {"step": 1, "agent": "compliance_agent", "action": "Check all compliance status"},
                {"step": 2, "agent": "risk_agent", "action": "Flag compliance risks"},
                {"step": 3, "agent": "nudge_agent", "action": "Generate deadline reminders"},
            ],
            "estimated_time": "30 seconds",
        },
        "board_report": {
            "name": "Board Report Generation (Companies)",
            "steps": [
                {"step": 1, "agent": "insights_agent", "action": "Compile financial metrics"},
                {"step": 2, "agent": "cashflow_agent", "action": "Add cash flow status"},
                {"step": 3, "agent": "risk_agent", "action": "Include risk summary"},
                {"step": 4, "agent": "cfo_strategy_agent", "action": "Generate board report"},
            ],
            "estimated_time": "1 minute",
        },
    }
    
    if request_type in workflows:
        workflow = workflows[request_type]
    else:
        # Default workflow
        workflow = {
            "name": f"Custom: {request_type}",
            "steps": [
                {"step": 1, "agent": "insights_agent", "action": "Analyze request"},
            ],
            "estimated_time": "30 seconds",
        }
    
    # Filter steps based on user type
    if user_type == "individual":
        company_agents = ["cfo_strategy_agent"]
        workflow["steps"] = [s for s in workflow["steps"] if s["agent"] not in company_agents]
    
    return {
        "workflow": workflow,
        "user_type": user_type,
        "context": ctx,
        "total_steps": len(workflow["steps"]),
        "agents_involved": list(set(s["agent"] for s in workflow["steps"])),
    }


def synthesize_results(
    agent_results: str,
) -> dict[str, Any]:
    """
    Synthesize results from multiple agents into a unified response.
    
    Args:
        agent_results: JSON string of results from multiple agents
            Example: {"insights_agent": {...}, "risk_agent": {...}}
    
    Returns:
        dict with synthesized summary and key findings
    """
    try:
        results = json.loads(agent_results) if isinstance(agent_results, str) else agent_results
        
        summary = {
            "agents_contributed": list(results.keys()),
            "key_findings": [],
            "action_items": [],
            "alerts": [],
            "overall_status": "OK",
        }
        
        # Extract key findings from each agent
        for agent_name, agent_result in results.items():
            if isinstance(agent_result, dict):
                # Look for common keys
                if "insights" in agent_result:
                    summary["key_findings"].extend(agent_result.get("insights", [])[:2])
                if "risks" in agent_result or "issues" in agent_result:
                    risks = agent_result.get("risks", agent_result.get("issues", []))
                    summary["alerts"].extend(risks[:2] if isinstance(risks, list) else [risks])
                if "recommendations" in agent_result:
                    summary["action_items"].extend(agent_result.get("recommendations", [])[:2])
                
                # Check for concerning status
                status = agent_result.get("status", agent_result.get("overall_status", ""))
                if isinstance(status, str) and any(word in status.lower() for word in ["critical", "high", "urgent", "alert"]):
                    summary["overall_status"] = "ATTENTION_NEEDED"
        
        summary["synthesis_complete"] = True
        summary["total_findings"] = len(summary["key_findings"])
        summary["total_actions"] = len(summary["action_items"])
        
        return summary
    except Exception as e:
        return {"error": str(e), "synthesis_complete": False}


# =============================================================================
# COORDINATOR AGENT DEFINITION
# =============================================================================

COORDINATOR_AGENT_INSTRUCTION = """You are the CFO Brain - the AI Financial Assistant for CFOSync.

You are a personalized financial advisor that helps users understand and improve their financial health.

## YOUR PRIMARY ROLE:
1. **Answer questions** about the user's finances using their ACTUAL DATA provided in context
2. **Provide insights** based on their spending, income, investments, and goals
3. **Give actionable advice** specific to their financial situation
4. **Route complex requests** to specialized sub-agents when needed

## CRITICAL: USING FINANCIAL CONTEXT
- The user's financial data is provided at the START of each message in "=== USER'S FINANCIAL DATA ===" section
- ALWAYS use this real data when answering questions about their finances
- Reference ACTUAL numbers (income, expenses, savings rate, categories, goals)
- If asked about risk profile, calculate based on their savings rate, investment portfolio, and spending patterns
- If asked about spending, use their top spending categories data
- If no financial data is available, suggest they upload bank statements

## RISK PROFILE CALCULATION:
Based on user data, assess risk as:
- **Low Risk**: Savings rate > 30%, diversified investments, emergency fund goal on track
- **Moderate Risk**: Savings rate 15-30%, some investments, working on goals
- **High Risk**: Savings rate < 15%, high spending in non-essentials, no emergency fund

## YOUR SUB-AGENTS (for complex requests):
- **profile_agent**: Builds user/company financial profiles
- **insights_agent**: Deep spending analysis and trends
- **risk_agent**: Detailed risk assessment and fraud detection
- **planning_agent**: Budget creation and financial plans
- **simulation_agent**: What-if scenarios
- **investment_agent**: Investment advice and portfolio analysis

## RESPONSE GUIDELINES:
- Be conversational, friendly, and helpful
- Use the user's name when available
- Reference specific numbers from their data
- Provide actionable next steps
- Don't expose internal agent names to users
- Keep responses focused and practical"""


def create_coordinator_agent() -> Agent:
    """
    Create the Coordinator Agent with all sub-agents.
    This is the main entry point for the CFOSync AI system.
    """
    # Create all sub-agents
    sub_agents = [
        create_profile_agent(),
        create_document_agent(),
        create_insights_agent(),
        create_risk_agent(),
        create_planning_agent(),
        create_simulation_agent(),
        create_cashflow_agent(),
        create_cfo_strategy_agent(),
        create_nudge_agent(),
        create_compliance_agent(),
    ]
    
    return create_agent(
        name="coordinator_agent",
        description="The CFO Brain - orchestrates all agents and manages complex multi-agent workflows",
        instruction=COORDINATOR_AGENT_INSTRUCTION,
        tools=[
            analyze_user_request,
            create_workflow_plan,
            synthesize_results,
        ],
        sub_agents=sub_agents,
    )


def get_coordinator_runner() -> AgentRunner:
    """Get a runner instance for the Coordinator Agent."""
    return AgentRunner(create_coordinator_agent())


# =============================================================================
# CONVENIENCE FUNCTIONS FOR DIRECT ACCESS
# =============================================================================

def get_all_agents() -> dict[str, Agent]:
    """Get a dictionary of all available agents."""
    return {
        "coordinator": create_coordinator_agent(),
        "profile": create_profile_agent(),
        "document": create_document_agent(),
        "insights": create_insights_agent(),
        "risk": create_risk_agent(),
        "planning": create_planning_agent(),
        "simulation": create_simulation_agent(),
        "cashflow": create_cashflow_agent(),
        "cfo_strategy": create_cfo_strategy_agent(),
        "nudge": create_nudge_agent(),
        "compliance": create_compliance_agent(),
    }


def get_agent_runner(agent_name: str) -> AgentRunner | None:
    """Get a runner for a specific agent by name."""
    runners = {
        "coordinator": get_coordinator_runner,
        "profile": lambda: AgentRunner(create_profile_agent()),
        "document": lambda: AgentRunner(create_document_agent()),
        "insights": lambda: AgentRunner(create_insights_agent()),
        "risk": lambda: AgentRunner(create_risk_agent()),
        "planning": lambda: AgentRunner(create_planning_agent()),
        "simulation": lambda: AgentRunner(create_simulation_agent()),
        "cashflow": lambda: AgentRunner(create_cashflow_agent()),
        "cfo_strategy": lambda: AgentRunner(create_cfo_strategy_agent()),
        "nudge": lambda: AgentRunner(create_nudge_agent()),
        "compliance": lambda: AgentRunner(create_compliance_agent()),
    }
    
    runner_fn = runners.get(agent_name)
    return runner_fn() if runner_fn else None
