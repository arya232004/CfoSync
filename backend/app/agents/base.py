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
        """Inject context data into the user message."""
        if not context:
            return message
        
        context_lines = [f"- {k}: {v}" for k, v in context.items()]
        return f"""[Context Data]
{chr(10).join(context_lines)}

[User Request]
{message}"""
