"""
Profile Agent - Builds user/company financial profiles using Google ADK.

This agent analyzes onboarding data and creates a comprehensive financial identity.
"""

import json
from typing import Any
from app.agents.base import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# PROFILE AGENT TOOLS
# =============================================================================

def analyze_income_sources(income_data: str) -> dict[str, Any]:
    """
    Analyze and categorize income sources from user data.
    
    Args:
        income_data: JSON string containing income information
            Example: {"salary": 50000, "freelance": 10000, "investments": 5000}
    
    Returns:
        dict with categorized income analysis
    """
    try:
        data = json.loads(income_data) if isinstance(income_data, str) else income_data
        total = sum(data.values())
        breakdown = {k: {"amount": v, "percentage": round(v/total*100, 2)} for k, v in data.items()}
        
        return {
            "total_monthly_income": total,
            "income_sources": len(data),
            "breakdown": breakdown,
            "primary_source": max(data, key=data.get),
            "income_diversity": "diversified" if len(data) > 2 else "concentrated",
        }
    except Exception as e:
        return {"error": str(e)}


def analyze_expenses(expense_data: str) -> dict[str, Any]:
    """
    Analyze and categorize expenses from user data.
    
    Args:
        expense_data: JSON string containing expense categories
            Example: {"rent": 15000, "food": 8000, "transport": 3000, "entertainment": 5000}
    
    Returns:
        dict with categorized expense analysis
    """
    try:
        data = json.loads(expense_data) if isinstance(expense_data, str) else expense_data
        total = sum(data.values())
        
        # Categorize as essential vs discretionary
        essential_categories = {"rent", "utilities", "groceries", "food", "transport", "insurance", "healthcare", "loan_emi", "emi"}
        essential = sum(v for k, v in data.items() if k.lower() in essential_categories)
        discretionary = total - essential
        
        return {
            "total_monthly_expenses": total,
            "essential_expenses": essential,
            "discretionary_expenses": discretionary,
            "essential_ratio": round(essential/total*100, 2) if total > 0 else 0,
            "expense_categories": len(data),
            "top_expenses": sorted(data.items(), key=lambda x: x[1], reverse=True)[:5],
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_financial_health_score(
    monthly_income: float,
    monthly_expenses: float,
    total_debt: float,
    emergency_fund: float,
) -> dict[str, Any]:
    """
    Calculate a financial health score (0-100) based on key metrics.
    
    Args:
        monthly_income: Total monthly income
        monthly_expenses: Total monthly expenses
        total_debt: Total outstanding debt
        emergency_fund: Current emergency fund balance
    
    Returns:
        dict with health score and breakdown
    """
    scores = {}
    
    # Savings rate (0-30 points)
    savings_rate = (monthly_income - monthly_expenses) / monthly_income if monthly_income > 0 else 0
    scores["savings_rate"] = min(30, savings_rate * 100)
    
    # Debt-to-income ratio (0-30 points)
    dti = total_debt / (monthly_income * 12) if monthly_income > 0 else 1
    scores["debt_ratio"] = max(0, 30 - (dti * 30))
    
    # Emergency fund coverage (0-25 points)
    months_covered = emergency_fund / monthly_expenses if monthly_expenses > 0 else 0
    scores["emergency_fund"] = min(25, months_covered * 4)  # 6 months = full score
    
    # Expense ratio (0-15 points)
    expense_ratio = monthly_expenses / monthly_income if monthly_income > 0 else 1
    scores["expense_ratio"] = max(0, 15 - (expense_ratio * 15))
    
    total_score = sum(scores.values())
    
    # Determine health category
    if total_score >= 80:
        category = "Excellent"
    elif total_score >= 60:
        category = "Good"
    elif total_score >= 40:
        category = "Fair"
    else:
        category = "Needs Improvement"
    
    return {
        "health_score": round(total_score, 1),
        "category": category,
        "breakdown": {k: round(v, 1) for k, v in scores.items()},
        "savings_rate_percent": round(savings_rate * 100, 1),
        "months_emergency_coverage": round(months_covered, 1),
    }


def determine_risk_profile(
    age: int,
    income_stability: str,
    investment_horizon: int,
    loss_tolerance: str,
) -> dict[str, Any]:
    """
    Determine user's investment risk profile.
    
    Args:
        age: User's age in years
        income_stability: One of 'stable', 'moderate', 'variable'
        investment_horizon: Investment timeline in years
        loss_tolerance: One of 'low', 'medium', 'high'
    
    Returns:
        dict with risk profile assessment
    """
    score = 0
    
    # Age factor (younger = more risk capacity)
    if age < 30:
        score += 30
    elif age < 40:
        score += 25
    elif age < 50:
        score += 15
    else:
        score += 5
    
    # Income stability
    stability_scores = {"stable": 25, "moderate": 15, "variable": 5}
    score += stability_scores.get(income_stability.lower(), 10)
    
    # Investment horizon
    if investment_horizon >= 10:
        score += 25
    elif investment_horizon >= 5:
        score += 15
    else:
        score += 5
    
    # Loss tolerance
    tolerance_scores = {"high": 20, "medium": 12, "low": 5}
    score += tolerance_scores.get(loss_tolerance.lower(), 10)
    
    # Determine profile
    if score >= 75:
        profile = "Aggressive"
        allocation = {"equity": 80, "debt": 15, "cash": 5}
    elif score >= 55:
        profile = "Moderately Aggressive"
        allocation = {"equity": 65, "debt": 25, "cash": 10}
    elif score >= 40:
        profile = "Moderate"
        allocation = {"equity": 50, "debt": 40, "cash": 10}
    elif score >= 25:
        profile = "Conservative"
        allocation = {"equity": 30, "debt": 55, "cash": 15}
    else:
        profile = "Very Conservative"
        allocation = {"equity": 15, "debt": 65, "cash": 20}
    
    return {
        "risk_profile": profile,
        "risk_score": score,
        "recommended_allocation": allocation,
        "factors": {
            "age": age,
            "income_stability": income_stability,
            "investment_horizon_years": investment_horizon,
            "loss_tolerance": loss_tolerance,
        },
    }


def analyze_company_financials(
    monthly_revenue: float,
    monthly_expenses: float,
    cash_reserves: float,
    team_size: int,
    monthly_payroll: float,
) -> dict[str, Any]:
    """
    Analyze company/startup financial health.
    
    Args:
        monthly_revenue: Monthly revenue
        monthly_expenses: Monthly operating expenses
        cash_reserves: Current cash in bank
        team_size: Number of employees
        monthly_payroll: Monthly payroll expense
    
    Returns:
        dict with company financial analysis
    """
    burn_rate = monthly_expenses - monthly_revenue
    runway_months = cash_reserves / burn_rate if burn_rate > 0 else float('inf')
    profit_margin = (monthly_revenue - monthly_expenses) / monthly_revenue if monthly_revenue > 0 else 0
    payroll_ratio = monthly_payroll / monthly_expenses if monthly_expenses > 0 else 0
    revenue_per_employee = monthly_revenue / team_size if team_size > 0 else 0
    
    # Determine health status
    if runway_months == float('inf'):
        runway_status = "Profitable"
    elif runway_months >= 18:
        runway_status = "Healthy"
    elif runway_months >= 12:
        runway_status = "Adequate"
    elif runway_months >= 6:
        runway_status = "Concerning"
    else:
        runway_status = "Critical"
    
    return {
        "burn_rate": burn_rate,
        "runway_months": round(runway_months, 1) if runway_months != float('inf') else "Infinite (Profitable)",
        "runway_status": runway_status,
        "profit_margin_percent": round(profit_margin * 100, 1),
        "payroll_as_percent_of_expenses": round(payroll_ratio * 100, 1),
        "revenue_per_employee": round(revenue_per_employee, 0),
        "is_profitable": monthly_revenue >= monthly_expenses,
    }


# =============================================================================
# PROFILE AGENT DEFINITION
# =============================================================================

PROFILE_AGENT_INSTRUCTION = """You are the Profile Agent for CFOSync - an AI CFO platform.

Your primary responsibility is to build comprehensive financial profiles for users and companies.
You analyze financial data provided during onboarding to create a "Financial Identity".

## For INDIVIDUALS, you should:
1. Analyze income sources and stability
2. Categorize and analyze expenses
3. Calculate financial health scores
4. Determine risk profile for investments
5. Identify financial personality (spender, saver, investor)
6. Set up baseline metrics for tracking

## For COMPANIES/STARTUPS, you should:
1. Analyze revenue streams
2. Calculate burn rate and runway
3. Assess financial health
4. Determine growth stage
5. Identify key financial risks
6. Set up company financial model

## Guidelines:
- Always use the provided tools to perform calculations
- Provide specific numbers and percentages
- Be encouraging but honest about financial health
- Suggest immediate improvements when needed
- Structure responses in clear sections

When analyzing data, call the appropriate tool functions and interpret the results
to provide actionable insights to the user."""


def create_profile_agent() -> Agent:
    """Create the Profile Agent with all its tools."""
    return create_agent(
        name="profile_agent",
        description="Builds comprehensive financial profiles for users and companies",
        instruction=PROFILE_AGENT_INSTRUCTION,
        tools=[
            analyze_income_sources,
            analyze_expenses,
            calculate_financial_health_score,
            determine_risk_profile,
            analyze_company_financials,
        ],
    )


def get_profile_runner() -> AgentRunner:
    """Get a runner instance for the Profile Agent."""
    return AgentRunner(create_profile_agent())
