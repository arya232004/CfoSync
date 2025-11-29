"""
Base utilities for creating AI Agents with Google Generative AI (Gemini).

This module provides a simplified agent framework that uses google-generativeai
for generating AI responses with financial context.
"""

from typing import Any, Callable, Optional
import google.generativeai as genai

from app.config import settings


# Configure the Gemini API
genai.configure(api_key=settings.GOOGLE_API_KEY)


class Agent:
    """Simple agent class that wraps Gemini for financial analysis."""
    
    def __init__(
        self,
        name: str,
        instruction: str,
        description: str = "",
        model: str = None,
        tools: list[Callable] = None,
        sub_agents: list['Agent'] = None,
    ):
        self.name = name
        self.instruction = instruction
        self.description = description
        self.model_name = model or settings.GEMINI_MODEL
        self.tools = tools or []
        self.sub_agents = sub_agents or []
        
        # Create the Gemini model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=instruction,
        )
    
    async def generate(self, prompt: str, context: dict[str, Any] = None) -> str:
        """Generate a response from the agent."""
        full_prompt = self._inject_context(prompt, context)
        
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def _inject_context(self, message: str, context: dict[str, Any] = None) -> str:
        """Inject context data into the user message."""
        if not context:
            return message
        
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
                    context_parts.append(f"    - {h['symbol']}: {h['shares']} shares @ ${h.get('purchase_price', 0):.2f}")
        
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
        
        # Company Data
        if context.get("company_data"):
            cd = context["company_data"]
            context_parts.append("\n🏢 COMPANY DATA:")
            context_parts.append(f"  • Company: {cd.get('company_name', 'N/A')}")
            context_parts.append(f"  • Industry: {cd.get('industry', 'N/A')}")
            if cd.get("financials"):
                fin = cd["financials"]
                context_parts.append(f"  • Revenue: ${fin.get('revenue', 0):,.0f}")
                context_parts.append(f"  • Expenses: ${fin.get('expenses', 0):,.0f}")
                context_parts.append(f"  • Net Income: ${fin.get('net_income', 0):,.0f}")
        
        # Employees
        if context.get("employees"):
            emp_list = context["employees"]
            context_parts.append(f"\n👥 EMPLOYEES: {len(emp_list)} total")
            total_payroll = sum(e.get("salary", 0) for e in emp_list)
            context_parts.append(f"  • Total Annual Payroll: ${total_payroll:,.0f}")
        
        # Transactions
        if context.get("transactions"):
            txns = context["transactions"]
            context_parts.append(f"\n💳 RECENT TRANSACTIONS: {len(txns)} records")
        
        if context_parts:
            return f"""=== FINANCIAL CONTEXT ===
{chr(10).join(context_parts)}
================================

{message}"""
        
        return message


class AgentRunner:
    """
    Wrapper to run agents with session management.
    Handles conversation history and context injection.
    """
    
    def __init__(self, agent: Agent, app_name: str = "cfosync"):
        self.agent = agent
        self.app_name = app_name
        self._sessions: dict[str, list] = {}
    
    async def run(
        self,
        user_id: str,
        message: str,
        session_id: str = None,
        context: dict[str, Any] = None,
    ) -> dict[str, Any]:
        """
        Execute the agent with a user message.
        
        Args:
            user_id: Unique user identifier
            message: User's input message
            session_id: Optional session ID
            context: Additional context to inject into the prompt
        
        Returns:
            dict with 'response' text and metadata
        """
        sid = session_id or f"{user_id}_{self.agent.name}"
        
        # Generate response
        response = await self.agent.generate(message, context)
        
        return {
            "response": response,
            "session_id": sid,
            "agent": self.agent.name,
        }


def create_agent(
    name: str,
    instruction: str,
    description: str = None,
    tools: list[Callable] = None,
    sub_agents: list[Agent] = None,
    model: str = None,
) -> Agent:
    """
    Factory to create an Agent with Gemini.
    
    Args:
        name: Unique identifier for the agent
        instruction: System prompt defining agent behavior
        description: Short description
        tools: List of Python functions to use as tools
        sub_agents: List of Agent instances for delegation
        model: Override default Gemini model
    
    Returns:
        Configured Agent
    """
    return Agent(
        name=name,
        instruction=instruction,
        description=description or "",
        model=model,
        tools=tools,
        sub_agents=sub_agents,
    )


def create_tool(func: Callable):
    """Create a tool from a Python function (placeholder for compatibility)."""
    return func
