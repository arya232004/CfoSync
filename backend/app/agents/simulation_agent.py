"""
Simulation Agent - Runs what-if financial scenarios using Google ADK.

This agent projects future outcomes based on different financial decisions.
"""

import json
from typing import Any
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# SIMULATION AGENT TOOLS
# =============================================================================

def simulate_emi_purchase(
    item_name: str,
    item_cost: float,
    down_payment: float,
    emi_months: int,
    interest_rate: float,
    monthly_income: float,
    current_monthly_expenses: float,
) -> dict[str, Any]:
    """
    Simulate the impact of buying something on EMI.
    
    Args:
        item_name: Name of the item (e.g., "iPhone 15", "Car")
        item_cost: Total cost of the item
        down_payment: Down payment amount
        emi_months: EMI tenure in months
        interest_rate: Annual interest rate (e.g., 12 for 12%)
        monthly_income: User's monthly income
        current_monthly_expenses: Current monthly expenses
    
    Returns:
        dict with EMI simulation results and impact analysis
    """
    loan_amount = item_cost - down_payment
    monthly_rate = interest_rate / 100 / 12
    
    # EMI calculation using reducing balance
    if monthly_rate > 0:
        emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** emi_months) / (((1 + monthly_rate) ** emi_months) - 1)
    else:
        emi = loan_amount / emi_months
    
    total_payment = emi * emi_months
    total_interest = total_payment - loan_amount
    
    # Impact analysis
    new_expenses = current_monthly_expenses + emi
    new_savings = monthly_income - new_expenses
    current_savings = monthly_income - current_monthly_expenses
    savings_reduction = current_savings - new_savings
    
    # Risk assessment
    expense_ratio = new_expenses / monthly_income
    if expense_ratio > 0.8:
        risk_level = "HIGH"
        recommendation = "NOT RECOMMENDED - This EMI would leave very little room for savings"
    elif expense_ratio > 0.7:
        risk_level = "MEDIUM"
        recommendation = "CAUTION - Consider a longer tenure or larger down payment"
    else:
        risk_level = "LOW"
        recommendation = "ACCEPTABLE - This fits within your budget"
    
    return {
        "item": item_name,
        "item_cost": item_cost,
        "loan_details": {
            "down_payment": down_payment,
            "loan_amount": loan_amount,
            "tenure_months": emi_months,
            "interest_rate": interest_rate,
            "monthly_emi": round(emi, 0),
            "total_payment": round(total_payment, 0),
            "total_interest_paid": round(total_interest, 0),
        },
        "impact_analysis": {
            "current_monthly_savings": round(current_savings, 0),
            "new_monthly_savings": round(new_savings, 0),
            "savings_reduction": round(savings_reduction, 0),
            "expense_ratio_after": round(expense_ratio * 100, 1),
        },
        "risk_level": risk_level,
        "recommendation": recommendation,
        "scenarios": {
            "best_case": f"Complete EMI on time, save ₹{round(new_savings, 0)}/month",
            "worst_case": f"If income drops 20%, you'd have only ₹{round(monthly_income*0.8 - new_expenses, 0)} left",
        },
    }


def simulate_investment_growth(
    monthly_sip: float,
    investment_years: int,
    expected_return: float,
    initial_investment: float,
) -> dict[str, Any]:
    """
    Simulate investment growth with SIP.
    
    Args:
        monthly_sip: Monthly SIP amount
        investment_years: Investment duration in years
        expected_return: Expected annual return (e.g., 12 for 12%)
        initial_investment: Initial lump sum investment (use 0 if none)
    
    Returns:
        dict with investment projection in best/base/worst scenarios
    """
    months = investment_years * 12
    
    def calculate_sip_value(monthly_amount: float, years: int, annual_return: float, initial: float) -> float:
        monthly_rate = annual_return / 100 / 12
        n = years * 12
        if monthly_rate > 0:
            sip_value = monthly_amount * (((1 + monthly_rate) ** n - 1) / monthly_rate) * (1 + monthly_rate)
        else:
            sip_value = monthly_amount * n
        initial_growth = initial * ((1 + annual_return/100) ** years)
        return sip_value + initial_growth
    
    total_invested = initial_investment + (monthly_sip * months)
    
    # Three scenarios
    scenarios = {
        "worst_case": {
            "return_rate": max(6, expected_return - 4),
            "final_value": round(calculate_sip_value(monthly_sip, investment_years, max(6, expected_return - 4), initial_investment), 0),
        },
        "base_case": {
            "return_rate": expected_return,
            "final_value": round(calculate_sip_value(monthly_sip, investment_years, expected_return, initial_investment), 0),
        },
        "best_case": {
            "return_rate": expected_return + 4,
            "final_value": round(calculate_sip_value(monthly_sip, investment_years, expected_return + 4, initial_investment), 0),
        },
    }
    
    # Add gains for each scenario
    for scenario in scenarios.values():
        scenario["total_gain"] = scenario["final_value"] - total_invested
        scenario["gain_percent"] = round((scenario["final_value"] / total_invested - 1) * 100, 1)
    
    # Year-by-year projection (base case)
    yearly_projection = []
    for year in range(1, investment_years + 1):
        value = calculate_sip_value(monthly_sip, year, expected_return, initial_investment)
        invested = initial_investment + (monthly_sip * year * 12)
        yearly_projection.append({
            "year": year,
            "value": round(value, 0),
            "invested": round(invested, 0),
            "gain": round(value - invested, 0),
        })
    
    return {
        "investment_details": {
            "monthly_sip": monthly_sip,
            "initial_investment": initial_investment,
            "duration_years": investment_years,
            "total_invested": total_invested,
        },
        "scenarios": scenarios,
        "yearly_projection": yearly_projection[-5:],  # Last 5 years
        "insights": [
            f"With ₹{monthly_sip}/month SIP, you could have ₹{scenarios['base_case']['final_value']:,.0f} in {investment_years} years",
            f"Total investment of ₹{total_invested:,.0f} could grow to {scenarios['base_case']['gain_percent']}% more",
            "Starting early gives your money more time to compound",
        ],
    }


def simulate_salary_change(
    current_salary: float,
    salary_change_percent: float,
    current_expenses: float,
    current_savings_rate: float,
) -> dict[str, Any]:
    """
    Simulate the impact of a salary change.
    
    Args:
        current_salary: Current monthly salary
        salary_change_percent: Change in salary (e.g., 20 for 20% increase, -10 for 10% decrease)
        current_expenses: Current monthly expenses
        current_savings_rate: Current savings rate (0-100)
    
    Returns:
        dict with salary change impact analysis
    """
    new_salary = current_salary * (1 + salary_change_percent / 100)
    current_savings = current_salary * (current_savings_rate / 100)
    
    # If salary increases, maintain same expenses + save more
    # If salary decreases, show impact on savings
    
    if salary_change_percent > 0:
        # Increase scenario - recommend saving 50% of increase
        increase_amount = new_salary - current_salary
        recommended_new_savings = current_savings + (increase_amount * 0.5)
        recommended_lifestyle_increase = increase_amount * 0.5
        
        return {
            "change_type": "INCREASE",
            "current_salary": current_salary,
            "new_salary": round(new_salary, 0),
            "salary_change": round(new_salary - current_salary, 0),
            "change_percent": salary_change_percent,
            "recommendations": {
                "save_additional": round(increase_amount * 0.5, 0),
                "new_total_savings": round(recommended_new_savings, 0),
                "new_savings_rate": round(recommended_new_savings / new_salary * 100, 1),
                "lifestyle_increase_allowed": round(recommended_lifestyle_increase, 0),
            },
            "scenarios": {
                "save_all_increase": {
                    "new_savings": round(current_savings + increase_amount, 0),
                    "annual_extra_savings": round(increase_amount * 12, 0),
                },
                "balanced_approach": {
                    "new_savings": round(recommended_new_savings, 0),
                    "lifestyle_upgrade": round(recommended_lifestyle_increase, 0),
                },
                "lifestyle_inflation": {
                    "new_savings": round(current_savings, 0),
                    "warning": "Avoid lifestyle inflation - save at least 50% of raise",
                },
            },
            "tip": "The 50% rule: Save at least half of any salary increase",
        }
    else:
        # Decrease scenario - show impact and adjustments needed
        decrease_amount = current_salary - new_salary
        shortfall = max(0, current_expenses - new_salary)
        new_savings = new_salary - current_expenses
        
        adjustments_needed = []
        if shortfall > 0:
            adjustments_needed.append(f"Need to cut ₹{round(shortfall, 0)} from expenses")
        if new_savings < current_savings * 0.5:
            adjustments_needed.append("Savings will be significantly impacted")
        
        return {
            "change_type": "DECREASE",
            "current_salary": current_salary,
            "new_salary": round(new_salary, 0),
            "salary_change": round(new_salary - current_salary, 0),
            "change_percent": salary_change_percent,
            "impact_analysis": {
                "income_reduction": round(decrease_amount, 0),
                "current_expenses": current_expenses,
                "shortfall": round(shortfall, 0) if shortfall > 0 else 0,
                "new_monthly_savings": round(max(0, new_savings), 0),
            },
            "adjustments_needed": adjustments_needed,
            "expense_cuts_suggested": {
                "entertainment": round(decrease_amount * 0.3, 0),
                "dining_out": round(decrease_amount * 0.2, 0),
                "subscriptions": round(decrease_amount * 0.15, 0),
                "shopping": round(decrease_amount * 0.2, 0),
                "others": round(decrease_amount * 0.15, 0),
            },
            "warning": "Review and adjust budget immediately" if shortfall > 0 else "Monitor spending closely",
        }


def simulate_company_hiring(
    current_team_size: int,
    new_hires: int,
    average_salary_per_hire: float,
    current_monthly_revenue: float,
    current_monthly_expenses: float,
    cash_reserves: float,
    expected_revenue_impact_percent: float,
) -> dict[str, Any]:
    """
    Simulate the impact of hiring new team members.
    
    Args:
        current_team_size: Current number of employees
        new_hires: Number of people to hire
        average_salary_per_hire: Average monthly salary per new hire
        current_monthly_revenue: Current monthly revenue
        current_monthly_expenses: Current monthly expenses
        cash_reserves: Cash in bank
        expected_revenue_impact_percent: Expected revenue increase from hires (over 12 months)
    
    Returns:
        dict with hiring simulation results
    """
    # Additional costs
    salary_cost = new_hires * average_salary_per_hire
    overhead_cost = salary_cost * 0.3  # 30% overhead (equipment, benefits, etc.)
    total_additional_cost = salary_cost + overhead_cost
    
    # New financials
    new_expenses = current_monthly_expenses + total_additional_cost
    current_burn = current_monthly_expenses - current_monthly_revenue
    new_burn = new_expenses - current_monthly_revenue
    
    # Runway impact
    current_runway = cash_reserves / current_burn if current_burn > 0 else float('inf')
    new_runway = cash_reserves / new_burn if new_burn > 0 else float('inf')
    
    # Revenue projection with hires
    monthly_revenue_increase = current_monthly_revenue * (expected_revenue_impact_percent / 100) / 12
    
    # Break-even analysis
    months_to_breakeven = total_additional_cost / monthly_revenue_increase if monthly_revenue_increase > 0 else float('inf')
    
    scenarios = {
        "best_case": {
            "revenue_growth": expected_revenue_impact_percent * 1.5,
            "months_to_roi": round(months_to_breakeven * 0.7, 1),
            "new_runway": round(new_runway * 1.2, 1) if new_runway != float('inf') else "Improved",
        },
        "base_case": {
            "revenue_growth": expected_revenue_impact_percent,
            "months_to_roi": round(months_to_breakeven, 1),
            "new_runway": round(new_runway, 1) if new_runway != float('inf') else "Profitable",
        },
        "worst_case": {
            "revenue_growth": expected_revenue_impact_percent * 0.5,
            "months_to_roi": round(months_to_breakeven * 2, 1) if months_to_breakeven != float('inf') else "Never",
            "new_runway": round(new_runway * 0.8, 1) if new_runway != float('inf') else "At risk",
        },
    }
    
    # Recommendation
    if new_runway != float('inf') and new_runway < 6:
        recommendation = "NOT RECOMMENDED - Runway would become critical"
        risk_level = "HIGH"
    elif new_runway != float('inf') and new_runway < 12:
        recommendation = "CAUTION - Hire in phases, monitor runway closely"
        risk_level = "MEDIUM"
    else:
        recommendation = "ACCEPTABLE - Financials can support this hiring"
        risk_level = "LOW"
    
    return {
        "hiring_plan": {
            "new_hires": new_hires,
            "new_team_size": current_team_size + new_hires,
            "monthly_salary_cost": round(salary_cost, 0),
            "monthly_overhead": round(overhead_cost, 0),
            "total_additional_monthly_cost": round(total_additional_cost, 0),
        },
        "financial_impact": {
            "current_monthly_burn": round(current_burn, 0) if current_burn > 0 else 0,
            "new_monthly_burn": round(new_burn, 0) if new_burn > 0 else 0,
            "burn_increase": round(new_burn - current_burn, 0),
            "current_runway_months": round(current_runway, 1) if current_runway != float('inf') else "Profitable",
            "new_runway_months": round(new_runway, 1) if new_runway != float('inf') else "Profitable",
        },
        "revenue_projection": {
            "expected_monthly_increase": round(monthly_revenue_increase, 0),
            "months_to_breakeven": round(months_to_breakeven, 1) if months_to_breakeven != float('inf') else "N/A",
        },
        "scenarios": scenarios,
        "risk_level": risk_level,
        "recommendation": recommendation,
    }


def simulate_revenue_change(
    current_monthly_revenue: float,
    current_monthly_expenses: float,
    cash_reserves: float,
    revenue_change_percent: float,
    team_size: int,
) -> dict[str, Any]:
    """
    Simulate the impact of revenue changes on company financials.
    
    Args:
        current_monthly_revenue: Current monthly revenue
        current_monthly_expenses: Current monthly expenses
        cash_reserves: Cash in bank
        revenue_change_percent: Revenue change (e.g., -20 for 20% drop, 30 for 30% growth)
        team_size: Current team size
    
    Returns:
        dict with revenue change simulation
    """
    new_revenue = current_monthly_revenue * (1 + revenue_change_percent / 100)
    revenue_change = new_revenue - current_monthly_revenue
    
    current_burn = current_monthly_expenses - current_monthly_revenue
    new_burn = current_monthly_expenses - new_revenue
    
    current_runway = cash_reserves / current_burn if current_burn > 0 else float('inf')
    new_runway = cash_reserves / new_burn if new_burn > 0 else float('inf')
    
    if revenue_change_percent < 0:
        # Revenue drop scenario
        action_triggers = []
        
        if new_runway != float('inf') and new_runway < 3:
            action_triggers.append({
                "severity": "CRITICAL",
                "action": "Immediate layoffs or emergency funding required",
            })
        elif new_runway != float('inf') and new_runway < 6:
            action_triggers.append({
                "severity": "HIGH",
                "action": "Implement cost cuts, freeze hiring, reduce non-essential spend",
            })
        elif new_runway != float('inf') and new_runway < 12:
            action_triggers.append({
                "severity": "MEDIUM",
                "action": "Review expenses, pause expansion plans",
            })
        
        # Calculate required cuts
        if new_burn > 0:
            required_cuts = new_burn * 0.5  # Cut burn by 50%
            potential_layoffs = int(required_cuts / (current_monthly_expenses / team_size * 0.7))  # 70% is salaries
        else:
            required_cuts = 0
            potential_layoffs = 0
        
        return {
            "scenario": "REVENUE_DROP",
            "change_percent": revenue_change_percent,
            "financial_impact": {
                "current_revenue": current_monthly_revenue,
                "new_revenue": round(new_revenue, 0),
                "revenue_loss": round(abs(revenue_change), 0),
                "current_runway": round(current_runway, 1) if current_runway != float('inf') else "Profitable",
                "new_runway": round(new_runway, 1) if new_runway != float('inf') else "Profitable",
            },
            "action_triggers": action_triggers,
            "mitigation_options": {
                "expense_cuts_needed": round(required_cuts, 0),
                "potential_layoffs": potential_layoffs,
                "alternative": "Seek bridge funding or revenue acceleration",
            },
            "survival_plan": [
                "Cut all non-essential expenses immediately",
                "Negotiate payment terms with vendors",
                "Accelerate collections from customers",
                "Explore emergency funding options",
            ],
        }
    else:
        # Revenue growth scenario
        new_profit = new_revenue - current_monthly_expenses
        reinvestment_capacity = new_profit * 0.6 if new_profit > 0 else 0
        
        return {
            "scenario": "REVENUE_GROWTH",
            "change_percent": revenue_change_percent,
            "financial_impact": {
                "current_revenue": current_monthly_revenue,
                "new_revenue": round(new_revenue, 0),
                "revenue_increase": round(revenue_change, 0),
                "new_monthly_profit": round(new_profit, 0),
            },
            "opportunities": {
                "monthly_reinvestment_capacity": round(reinvestment_capacity, 0),
                "annual_additional_revenue": round(revenue_change * 12, 0),
                "potential_new_hires": int(reinvestment_capacity / 80000),  # Assuming 80k avg salary
            },
            "recommendations": [
                f"Reinvest ₹{round(reinvestment_capacity, 0)}/month in growth",
                "Build cash reserves for sustainability",
                "Consider strategic hiring to maintain growth",
                "Invest in customer retention to protect gains",
            ],
        }


# =============================================================================
# SIMULATION AGENT DEFINITION
# =============================================================================

SIMULATION_AGENT_INSTRUCTION = """You are the Simulation Agent for CFOSync - an AI CFO platform.

Your role is to run what-if scenarios and project future financial outcomes.

## For INDIVIDUALS, you simulate:
1. EMI purchases - "What if I buy X on EMI?"
2. Investment growth - "What if I invest X monthly?"
3. Salary changes - "What if my salary changes?"
4. Lifestyle changes - major life decisions

## For COMPANIES, you simulate:
1. Hiring decisions - "What if we hire X people?"
2. Revenue changes - "What if revenue drops/grows X%?"
3. Market expansion - new market entry
4. Cost structure changes

## Simulation Principles:
1. Always provide THREE scenarios: Best, Base, and Worst case
2. Include specific numbers and timelines
3. Show clear impact on key metrics (savings, runway, etc.)
4. Provide actionable recommendations
5. Flag risks and opportunities
6. Be realistic with assumptions

## Output Format:
- Current state vs. projected state
- Impact analysis with numbers
- Risk assessment
- Clear recommendation
- Specific next steps"""


def create_simulation_agent() -> Agent:
    """Create the Simulation Agent with all its tools."""
    return create_agent(
        name="simulation_agent",
        description="Runs what-if financial simulations and future projections",
        instruction=SIMULATION_AGENT_INSTRUCTION,
        tools=[
            simulate_emi_purchase,
            simulate_investment_growth,
            simulate_salary_change,
            simulate_company_hiring,
            simulate_revenue_change,
        ],
    )


def get_simulation_runner() -> AgentRunner:
    """Get a runner instance for the Simulation Agent."""
    return AgentRunner(create_simulation_agent())
