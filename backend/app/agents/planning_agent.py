"""
Planning Agent - Creates budgets and financial strategies using Google ADK.

This agent builds personalized budgets, goals, and financial roadmaps.
"""

import json
from typing import Any
from app.agents.base import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# PLANNING AGENT TOOLS
# =============================================================================

def create_monthly_budget(
    monthly_income: float,
    fixed_expenses: str,
    financial_goals: str,
    budget_style: str,
) -> dict[str, Any]:
    """
    Create a personalized monthly budget based on income and goals.
    
    Args:
        monthly_income: Total monthly income
        fixed_expenses: JSON string of fixed monthly expenses
            Example: {"rent": 15000, "utilities": 2000, "loan_emi": 5000}
        financial_goals: JSON string of financial goals
            Example: {"emergency_fund": 100000, "vacation": 50000}
        budget_style: Budget methodology - "50/30/20", "60/20/20", "zero_based"
    
    Returns:
        dict with detailed monthly budget allocation
    """
    try:
        fixed = json.loads(fixed_expenses) if isinstance(fixed_expenses, str) else fixed_expenses
        goals = json.loads(financial_goals) if isinstance(financial_goals, str) else financial_goals
        
        total_fixed = sum(fixed.values())
        
        # Budget allocation based on style
        if budget_style == "50/30/20":
            needs_budget = monthly_income * 0.50
            wants_budget = monthly_income * 0.30
            savings_budget = monthly_income * 0.20
        elif budget_style == "60/20/20":
            needs_budget = monthly_income * 0.60
            wants_budget = monthly_income * 0.20
            savings_budget = monthly_income * 0.20
        else:  # zero-based
            remaining = monthly_income - total_fixed
            needs_budget = total_fixed
            savings_budget = remaining * 0.30
            wants_budget = remaining * 0.70
        
        # Calculate remaining for wants after fixed
        remaining_for_wants = wants_budget
        remaining_for_needs = max(0, needs_budget - total_fixed)
        
        # Suggest category allocations for wants
        wants_categories = {
            "entertainment": remaining_for_wants * 0.25,
            "dining_out": remaining_for_wants * 0.20,
            "shopping": remaining_for_wants * 0.25,
            "subscriptions": remaining_for_wants * 0.10,
            "personal_care": remaining_for_wants * 0.10,
            "miscellaneous": remaining_for_wants * 0.10,
        }
        
        # Savings allocation
        savings_allocation = {
            "emergency_fund": savings_budget * 0.40,
            "goal_savings": savings_budget * 0.40,
            "investments": savings_budget * 0.20,
        }
        
        return {
            "budget_style": budget_style,
            "monthly_income": monthly_income,
            "allocation": {
                "needs": {
                    "total": needs_budget,
                    "fixed_expenses": fixed,
                    "variable_needs_remaining": remaining_for_needs,
                },
                "wants": {
                    "total": wants_budget,
                    "suggested_breakdown": {k: round(v, 0) for k, v in wants_categories.items()},
                },
                "savings": {
                    "total": savings_budget,
                    "allocation": {k: round(v, 0) for k, v in savings_allocation.items()},
                },
            },
            "summary": {
                "needs_percent": round(needs_budget/monthly_income*100, 1),
                "wants_percent": round(wants_budget/monthly_income*100, 1),
                "savings_percent": round(savings_budget/monthly_income*100, 1),
            },
            "feasibility": "feasible" if total_fixed < needs_budget else "review_needed",
        }
    except Exception as e:
        return {"error": str(e)}


def create_goal_savings_plan(
    goal_name: str,
    target_amount: float,
    target_months: int,
    current_savings: float,
    monthly_capacity: float,
) -> dict[str, Any]:
    """
    Create a savings plan for a specific financial goal.
    
    Args:
        goal_name: Name of the goal (e.g., "Emergency Fund", "New Car")
        target_amount: Target amount to save
        target_months: Months to achieve the goal
        current_savings: Amount already saved towards this goal
        monthly_capacity: Maximum monthly savings capacity
    
    Returns:
        dict with goal savings plan and milestones
    """
    remaining = target_amount - current_savings
    required_monthly = remaining / target_months if target_months > 0 else remaining
    
    # Check feasibility
    if monthly_capacity > 0:
        feasible = required_monthly <= monthly_capacity
        if not feasible:
            # Suggest extended timeline
            suggested_months = int(remaining / monthly_capacity) + 1
        else:
            suggested_months = target_months
    else:
        feasible = True
        suggested_months = target_months
    
    # Create milestones
    milestones = []
    for i in range(1, min(suggested_months + 1, 13)):  # Up to 12 milestones
        milestone_amount = current_savings + (required_monthly * i)
        milestones.append({
            "month": i,
            "target_balance": round(min(milestone_amount, target_amount), 0),
            "percent_complete": round(min(milestone_amount/target_amount*100, 100), 1),
        })
    
    return {
        "goal_name": goal_name,
        "target_amount": target_amount,
        "current_savings": current_savings,
        "remaining_amount": remaining,
        "target_months": target_months,
        "required_monthly_savings": round(required_monthly, 0),
        "is_feasible": feasible,
        "suggested_months": suggested_months,
        "milestones": milestones[:6],  # First 6 milestones
        "tips": [
            f"Set up auto-transfer of ₹{round(required_monthly, 0)} on salary day",
            "Track progress weekly to stay motivated",
            "Consider parking goal funds in a liquid fund for better returns",
        ],
    }


def create_debt_payoff_plan(
    debts: str,
    monthly_debt_budget: float,
    strategy: str,
) -> dict[str, Any]:
    """
    Create a debt payoff plan using avalanche or snowball method.
    
    Args:
        debts: JSON string of debts
            Example: [{"name": "Credit Card", "balance": 50000, "interest_rate": 36, "min_payment": 2500}]
        monthly_debt_budget: Total monthly amount available for debt payments
        strategy: "avalanche" (highest interest first) or "snowball" (smallest balance first)
    
    Returns:
        dict with debt payoff plan and timeline
    """
    try:
        debt_list = json.loads(debts) if isinstance(debts, str) else debts
        
        # Sort based on strategy
        if strategy == "avalanche":
            sorted_debts = sorted(debt_list, key=lambda x: x.get("interest_rate", 0), reverse=True)
        else:  # snowball
            sorted_debts = sorted(debt_list, key=lambda x: x.get("balance", 0))
        
        total_debt = sum(d.get("balance", 0) for d in debt_list)
        total_min_payments = sum(d.get("min_payment", 0) for d in debt_list)
        extra_payment = monthly_debt_budget - total_min_payments
        
        if extra_payment < 0:
            return {
                "error": "Monthly budget is less than minimum payments required",
                "minimum_required": total_min_payments,
                "provided": monthly_debt_budget,
            }
        
        # Calculate payoff order and timeline
        payoff_order = []
        remaining_debts = [d.copy() for d in sorted_debts]
        month = 0
        
        while remaining_debts and month < 120:  # Max 10 years
            month += 1
            available_extra = extra_payment
            
            for debt in remaining_debts:
                # Apply minimum payment
                debt["balance"] -= debt.get("min_payment", 0)
                # Add interest
                monthly_interest = debt["balance"] * (debt.get("interest_rate", 0) / 100 / 12)
                debt["balance"] += monthly_interest
            
            # Apply extra to first debt
            if remaining_debts:
                remaining_debts[0]["balance"] -= available_extra
            
            # Remove paid off debts
            for debt in remaining_debts[:]:
                if debt["balance"] <= 0:
                    payoff_order.append({
                        "name": debt["name"],
                        "payoff_month": month,
                        "original_balance": next(d["balance"] for d in debt_list if d["name"] == debt["name"]),
                    })
                    remaining_debts.remove(debt)
        
        return {
            "strategy": strategy,
            "total_debt": total_debt,
            "monthly_budget": monthly_debt_budget,
            "extra_payment_available": extra_payment,
            "payoff_order": payoff_order,
            "total_months_to_debt_free": month if not remaining_debts else f">{month}",
            "payment_priority": [d["name"] for d in sorted_debts],
            "recommendation": f"Focus extra payments on {sorted_debts[0]['name']} first" if sorted_debts else None,
        }
    except Exception as e:
        return {"error": str(e)}


def create_company_quarterly_roadmap(
    current_runway_months: float,
    monthly_revenue: float,
    monthly_expenses: float,
    growth_target_percent: float,
    key_initiatives: str,
) -> dict[str, Any]:
    """
    Create a quarterly financial roadmap for startups/companies.
    
    Args:
        current_runway_months: Current runway in months
        monthly_revenue: Current monthly revenue
        monthly_expenses: Current monthly expenses
        growth_target_percent: Target revenue growth percentage
        key_initiatives: JSON string of planned initiatives
            Example: ["Hire 2 engineers", "Launch new product", "Expand to new market"]
    
    Returns:
        dict with quarterly roadmap and recommendations
    """
    try:
        initiatives = json.loads(key_initiatives) if isinstance(key_initiatives, str) else key_initiatives
        
        # Calculate projected financials
        monthly_burn = monthly_expenses - monthly_revenue
        target_revenue = monthly_revenue * (1 + growth_target_percent/100)
        revenue_gap = target_revenue - monthly_revenue
        
        # Quarterly projections
        quarters = []
        projected_revenue = monthly_revenue
        for q in range(1, 5):
            quarterly_growth = growth_target_percent / 4  # Spread growth across quarters
            projected_revenue *= (1 + quarterly_growth/100)
            quarters.append({
                "quarter": f"Q{q}",
                "projected_monthly_revenue": round(projected_revenue, 0),
                "projected_quarterly_revenue": round(projected_revenue * 3, 0),
                "growth_from_current": round((projected_revenue/monthly_revenue - 1) * 100, 1),
            })
        
        # Recommendations based on runway
        recommendations = []
        if current_runway_months < 6:
            recommendations.append({
                "priority": "CRITICAL",
                "action": "Focus on extending runway before growth initiatives",
                "details": "Cut non-essential expenses and prioritize revenue-generating activities",
            })
        elif current_runway_months < 12:
            recommendations.append({
                "priority": "HIGH",
                "action": "Balance growth with cash preservation",
                "details": "Be selective with hiring and new initiatives",
            })
        
        if monthly_burn > 0:
            months_to_profitability = monthly_burn / (revenue_gap / 12) if revenue_gap > 0 else float('inf')
            recommendations.append({
                "priority": "MEDIUM",
                "action": f"Path to profitability: {round(months_to_profitability, 1)} months at current growth rate",
                "details": f"Need to grow revenue by ₹{round(monthly_burn, 0)}/month to break even",
            })
        
        return {
            "current_state": {
                "monthly_revenue": monthly_revenue,
                "monthly_expenses": monthly_expenses,
                "monthly_burn": monthly_burn,
                "runway_months": current_runway_months,
            },
            "growth_target": f"{growth_target_percent}% annual",
            "quarterly_projections": quarters,
            "key_initiatives": initiatives,
            "recommendations": recommendations,
            "success_metrics": [
                f"Achieve ₹{round(target_revenue, 0)} monthly revenue",
                f"Maintain runway above {max(6, current_runway_months - 3)} months",
                "Execute key initiatives on schedule",
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def suggest_budget_adjustments(
    current_budget: str,
    actual_spending: str,
    goals_progress: str,
) -> dict[str, Any]:
    """
    Suggest budget adjustments based on actual spending patterns and goal progress.
    
    Args:
        current_budget: JSON string of current budget by category
        actual_spending: JSON string of actual spending by category
        goals_progress: JSON string of goal progress
            Example: {"emergency_fund": {"target": 100000, "current": 25000}}
    
    Returns:
        dict with suggested budget adjustments
    """
    try:
        budget = json.loads(current_budget) if isinstance(current_budget, str) else current_budget
        actual = json.loads(actual_spending) if isinstance(actual_spending, str) else actual_spending
        goals = json.loads(goals_progress) if isinstance(goals_progress, str) else goals_progress
        
        adjustments = []
        
        # Find categories consistently under/over budget
        for category, budgeted in budget.items():
            spent = actual.get(category, 0)
            variance_pct = (spent - budgeted) / budgeted * 100 if budgeted > 0 else 0
            
            if variance_pct < -20:  # Consistently under budget
                adjustments.append({
                    "category": category,
                    "action": "DECREASE",
                    "current_budget": budgeted,
                    "suggested_budget": round(budgeted * 0.85, 0),
                    "reason": f"Consistently spending {abs(variance_pct):.0f}% less than budgeted",
                    "savings_potential": round(budgeted * 0.15, 0),
                })
            elif variance_pct > 20:  # Consistently over budget
                adjustments.append({
                    "category": category,
                    "action": "INCREASE or CONTROL",
                    "current_budget": budgeted,
                    "actual_spending": spent,
                    "overage": round(spent - budgeted, 0),
                    "reason": f"Consistently spending {variance_pct:.0f}% more than budgeted",
                    "recommendation": "Either increase budget realistically or implement spending controls",
                })
        
        # Check goal progress and suggest reallocation
        goals_behind = []
        for goal_name, progress in goals.items():
            target = progress.get("target", 0)
            current = progress.get("current", 0)
            if target > 0 and current / target < 0.5:  # Less than 50% progress
                goals_behind.append(goal_name)
        
        total_savings_potential = sum(a.get("savings_potential", 0) for a in adjustments if a.get("action") == "DECREASE")
        
        return {
            "adjustments_suggested": len(adjustments),
            "adjustments": adjustments,
            "goals_needing_attention": goals_behind,
            "total_potential_savings": total_savings_potential,
            "reallocation_suggestion": f"Consider redirecting ₹{round(total_savings_potential, 0)} to {', '.join(goals_behind)}" if goals_behind and total_savings_potential > 0 else None,
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# PLANNING AGENT DEFINITION
# =============================================================================

PLANNING_AGENT_INSTRUCTION = """You are the Planning Agent for CFOSync - an AI CFO platform.

Your role is to create actionable financial plans, budgets, and strategies.

## For INDIVIDUALS, you create:
1. Monthly budgets using 50/30/20 or custom allocation
2. Goal-based savings plans with milestones
3. Debt payoff strategies (avalanche/snowball)
4. Budget adjustment recommendations
5. Emergency fund building plans

## For COMPANIES, you create:
1. Quarterly financial roadmaps
2. Department budget allocations
3. Cost optimization strategies
4. Growth vs. runway balance plans
5. Hiring and investment recommendations

## Planning Principles:
1. Be realistic based on actual spending patterns
2. Account for irregular and seasonal expenses
3. Build in buffers for unexpected costs
4. Prioritize high-impact financial goals
5. Make plans achievable with incremental steps
6. Adapt plans based on changing circumstances

## Guidelines:
- Always use tools to create precise calculations
- Explain the reasoning behind recommendations
- Provide specific numbers and timelines
- Include actionable next steps
- Flag any risks to the plan"""


def create_planning_agent() -> Agent:
    """Create the Planning Agent with all its tools."""
    return create_agent(
        name="planning_agent",
        description="Creates personalized budgets and financial planning strategies",
        instruction=PLANNING_AGENT_INSTRUCTION,
        tools=[
            create_monthly_budget,
            create_goal_savings_plan,
            create_debt_payoff_plan,
            create_company_quarterly_roadmap,
            suggest_budget_adjustments,
        ],
    )


def get_planning_runner() -> AgentRunner:
    """Get a runner instance for the Planning Agent."""
    return AgentRunner(create_planning_agent())
