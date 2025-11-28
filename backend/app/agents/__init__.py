"""
Agent registry - exports all agents and utility functions.

This module provides access to all CFOSync agents built with Google ADK.
"""

from app.agents.base import create_agent, AgentRunner

# Agent creation functions
from app.agents.profile_agent import create_profile_agent, get_profile_runner
from app.agents.insights_agent import create_insights_agent, get_insights_runner
from app.agents.risk_agent import create_risk_agent, get_risk_runner
from app.agents.planning_agent import create_planning_agent, get_planning_runner
from app.agents.simulation_agent import create_simulation_agent, get_simulation_runner
from app.agents.cashflow_agent import create_cashflow_agent, get_cashflow_runner
from app.agents.cfo_strategy_agent import create_cfo_strategy_agent, get_cfo_strategy_runner
from app.agents.nudge_agent import create_nudge_agent, get_nudge_runner
from app.agents.compliance_agent import create_compliance_agent, get_compliance_runner
from app.agents.document_agent import create_document_agent, get_document_runner
from app.agents.coordinator_agent import (
    create_coordinator_agent,
    get_coordinator_runner,
    get_all_agents,
    get_agent_runner,
)


# Registry mapping agent names to runner factory functions
agent_runners: dict[str, callable] = {
    "profile": get_profile_runner,
    "insights": get_insights_runner,
    "risk": get_risk_runner,
    "planning": get_planning_runner,
    "simulation": get_simulation_runner,
    "cashflow": get_cashflow_runner,
    "cfo_strategy": get_cfo_strategy_runner,
    "nudge": get_nudge_runner,
    "compliance": get_compliance_runner,
    "document": get_document_runner,
    "coordinator": get_coordinator_runner,
}


def get_runner(agent_name: str) -> AgentRunner | None:
    """
    Get a runner instance for a specific agent by name.
    
    Args:
        agent_name: Name of the agent (e.g., 'profile', 'insights', 'coordinator')
    
    Returns:
        AgentRunner instance or None if agent not found
    """
    runner_fn = agent_runners.get(agent_name)
    if runner_fn:
        return runner_fn()
    return None


def list_available_agents() -> list[str]:
    """Get list of all available agent names."""
    return list(agent_runners.keys())


__all__ = [
    # Base
    "create_agent",
    "AgentRunner",
    # Runners
    "get_runner",
    "list_available_agents",
    "agent_runners",
    # Individual agent functions (for direct use)
    "create_profile_agent",
    "create_insights_agent",
    "create_risk_agent",
    "create_planning_agent",
    "create_simulation_agent",
    "create_cashflow_agent",
    "create_cfo_strategy_agent",
    "create_nudge_agent",
    "create_compliance_agent",
    "create_document_agent",
    "create_coordinator_agent",
    "get_all_agents",
    "get_agent_runner",
]
