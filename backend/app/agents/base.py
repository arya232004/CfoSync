"""
Base utilities for creating Google ADK Agents with Gemini.

Google ADK uses:
- Agent: The main agent class with model, instructions, tools, and sub_agents
- Tools: Python functions that agents can call
- Sub-agents: Other agents that can be delegated to
- Runner: Executes agents (InMemoryRunner for local, VertexAiRunner for cloud)
- SessionService: Manages conversation state
"""

from typing import Any, Callable
from google.adk import Agent
from google.adk.tools import FunctionTool
from google.adk.runners import InMemoryRunner
from google.genai import types

from app.config import settings


def create_tool(func: Callable) -> FunctionTool:
    """
    Create an ADK FunctionTool from a Python function.
    The function's docstring becomes the tool description.
    """
    return FunctionTool(func=func)


def create_agent(
    name: str,
    instruction: str,
    description: str | None = None,
    tools: list[Callable] | None = None,
    sub_agents: list[Agent] | None = None,
    model: str | None = None,
) -> Agent:
    """
    Factory to create a Google ADK Agent with Gemini.
    
    Args:
        name: Unique identifier for the agent
        instruction: System prompt defining agent behavior
        description: Short description (used when agent is a sub-agent)
        tools: List of Python functions to use as tools
        sub_agents: List of Agent instances for delegation
        model: Override default Gemini model
    
    Returns:
        Configured Google ADK Agent
    """
    agent_kwargs: dict[str, Any] = {
        "name": name,
        "model": model or settings.GEMINI_MODEL,
        "instruction": instruction,
    }
    
    if description:
        agent_kwargs["description"] = description
    
    if tools:
        # Convert functions to FunctionTools
        agent_kwargs["tools"] = [create_tool(t) for t in tools]
    
    if sub_agents:
        agent_kwargs["sub_agents"] = sub_agents
    
    return Agent(**agent_kwargs)


class AgentRunner:
    """
    Wrapper to run ADK agents with session management.
    Handles conversation history and context injection.
    """
    
    def __init__(self, agent: Agent, app_name: str = "cfosync"):
        self.agent = agent
        self.app_name = app_name
        self.runner = InMemoryRunner(
            agent=agent,
            app_name=app_name,
        )
        # Access the runner's built-in session service
        self.session_service = self.runner.session_service
    
    async def run(
        self,
        user_id: str,
        message: str,
        session_id: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute the agent with a user message.
        
        Args:
            user_id: Unique user identifier
            message: User's input message
            session_id: Optional session ID (auto-generated if not provided)
            context: Additional context to inject into the prompt
        
        Returns:
            dict with 'response' text and 'events' list
        """
        sid = session_id or f"{user_id}_{self.agent.name}"
        
        # Get or create session
        session = await self.session_service.get_session(
            app_name=self.app_name,
            user_id=user_id,
            session_id=sid,
        )
        
        if session is None:
            session = await self.session_service.create_session(
                app_name=self.app_name,
                user_id=user_id,
                session_id=sid,
                state=context or {},
            )
        
        # Build prompt with context
        full_message = self._inject_context(message, context)
        
        # Convert message string to Content object
        content = types.Content(
            parts=[types.Part(text=full_message)],
            role="user"
        )
        
        # Run and collect response
        response_parts: list[str] = []
        events: list[dict] = []
        
        async for event in self.runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=content,
        ):
            event_data = {"type": type(event).__name__}
            
            if hasattr(event, "content") and event.content:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        response_parts.append(part.text)
                        event_data["text"] = part.text
            
            if hasattr(event, "tool_calls"):
                event_data["tool_calls"] = str(event.tool_calls)
            
            events.append(event_data)
        
        return {
            "response": "".join(response_parts),
            "events": events,
            "session_id": session.id,
        }
    
    def _inject_context(self, message: str, context: dict[str, Any] | None) -> str:
        """Inject context data into the user message as structured financial data."""
        if not context:
            return message
        
        # Build a well-formatted context section
        context_parts = []
        
        # User info
        if context.get("user_name"):
            context_parts.append(f"USER: {context.get('user_name')} ({context.get('user_type', 'individual')})")
        
        # Financial Summary
        if context.get("financial_summary"):
            fs = context["financial_summary"]
            context_parts.append("\n📊 FINANCIAL SUMMARY:")
            context_parts.append(f"  • Total Income: ${fs.get('total_income', 0):,.2f}")
            context_parts.append(f"  • Total Expenses: ${fs.get('total_expenses', 0):,.2f}")
            context_parts.append(f"  • Net Savings: ${fs.get('net_savings', 0):,.2f}")
            context_parts.append(f"  • Savings Rate: {fs.get('savings_rate', 0)}%")
            context_parts.append(f"  • Transaction Count: {fs.get('transaction_count', 0)}")
            
            if fs.get("top_spending_categories"):
                context_parts.append("  • Top Spending Categories:")
                for cat in fs["top_spending_categories"][:5]:
                    context_parts.append(f"    - {cat['category']}: ${cat['amount']:,.2f}")
        
        # Investment Summary
        if context.get("investment_summary"):
            inv = context["investment_summary"]
            context_parts.append("\n💰 INVESTMENT PORTFOLIO:")
            context_parts.append(f"  • Total Portfolio Cost: ${inv.get('total_portfolio_cost', 0):,.2f}")
            context_parts.append(f"  • Holdings Count: {inv.get('holdings_count', 0)}")
            context_parts.append(f"  • Risk Tolerance: {inv.get('risk_tolerance', 'moderate')}")
            
            if inv.get("holdings"):
                context_parts.append("  • Holdings:")
                for h in inv["holdings"][:5]:
                    context_parts.append(f"    - {h['symbol']}: {h['shares']} shares @ ${h['purchase_price']:.2f}")
        
        # Goals Summary
        if context.get("goals_summary"):
            gs = context["goals_summary"]
            context_parts.append("\n🎯 FINANCIAL GOALS:")
            context_parts.append(f"  • Active Goals: {gs.get('active_goals_count', 0)}")
            context_parts.append(f"  • Completed Goals: {gs.get('completed_goals_count', 0)}")
            context_parts.append(f"  • Total Target: ${gs.get('total_target_amount', 0):,.2f}")
            context_parts.append(f"  • Total Saved: ${gs.get('total_saved_amount', 0):,.2f}")
            context_parts.append(f"  • Overall Progress: {gs.get('overall_progress', 0)}%")
            
            if gs.get("goals"):
                context_parts.append("  • Goals:")
                for g in gs["goals"][:5]:
                    progress = (g['current'] / g['target'] * 100) if g['target'] > 0 else 0
                    context_parts.append(f"    - {g['name']}: ${g['current']:,.0f}/${g['target']:,.0f} ({progress:.0f}%)")
        
        # Documents Summary
        if context.get("documents_summary"):
            ds = context["documents_summary"]
            context_parts.append(f"\n📄 DOCUMENTS: {ds.get('total_documents', 0)} uploaded")
        
        # Profile Info
        if context.get("profile"):
            profile = context["profile"]
            context_parts.append("\n👤 PROFILE:")
            if profile.get("financial_goals"):
                context_parts.append(f"  • Financial Goals: {', '.join(profile.get('financial_goals', []))}")
            if profile.get("monthly_income"):
                context_parts.append(f"  • Monthly Income: ${profile.get('monthly_income', 0):,.2f}")
            if profile.get("risk_tolerance"):
                context_parts.append(f"  • Risk Tolerance: {profile.get('risk_tolerance', 'moderate')}")
        
        # No data available message
        if not context.get("has_financial_data"):
            context_parts.append("\n⚠️ NOTE: No financial data uploaded yet. Suggest user to upload bank statements or add transactions.")
        
        if context_parts:
            return f"""=== USER'S FINANCIAL DATA ===
{chr(10).join(context_parts)}
================================

{message}"""
        
        return message
