"""
Insights Agent - Generates analytics and trends from financial data using Google ADK.

This agent analyzes transactions and spending patterns to generate actionable insights.
"""

import json
from typing import Any
from datetime import datetime
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# INSIGHTS AGENT TOOLS
# =============================================================================

def analyze_spending_by_category(transactions: str) -> dict[str, Any]:
    """
    Analyze spending patterns grouped by category.
    
    Args:
        transactions: JSON string of transactions
            Example: [{"category": "food", "amount": 500, "date": "2024-01-15"}, ...]
    
    Returns:
        dict with category-wise spending analysis
    """
    try:
        data = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        # Group by category
        categories: dict[str, float] = {}
        for txn in data:
            cat = txn.get("category", "uncategorized").lower()
            categories[cat] = categories.get(cat, 0) + abs(txn.get("amount", 0))
        
        total = sum(categories.values())
        breakdown = {
            cat: {
                "amount": amt,
                "percentage": round(amt/total*100, 2) if total > 0 else 0
            }
            for cat, amt in sorted(categories.items(), key=lambda x: x[1], reverse=True)
        }
        
        return {
            "total_spending": total,
            "category_count": len(categories),
            "breakdown": breakdown,
            "top_category": max(categories, key=categories.get) if categories else None,
            "transaction_count": len(data),
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_monthly_trends(transactions: str, months: int) -> dict[str, Any]:
    """
    Calculate month-over-month spending trends.
    
    Args:
        transactions: JSON string of transactions with dates
        months: Number of months to analyze
    
    Returns:
        dict with monthly trends and changes
    """
    try:
        data = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        # Group by month
        monthly: dict[str, float] = {}
        for txn in data:
            date_str = txn.get("date", "")
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", ""))
                    month_key = dt.strftime("%Y-%m")
                    monthly[month_key] = monthly.get(month_key, 0) + abs(txn.get("amount", 0))
                except:
                    pass
        
        # Sort by month
        sorted_months = sorted(monthly.items())[-months:]
        
        # Calculate changes
        changes = []
        for i in range(1, len(sorted_months)):
            prev = sorted_months[i-1][1]
            curr = sorted_months[i][1]
            change_pct = ((curr - prev) / prev * 100) if prev > 0 else 0
            changes.append({
                "month": sorted_months[i][0],
                "amount": curr,
                "change_from_previous": round(change_pct, 2),
                "direction": "increased" if change_pct > 0 else "decreased" if change_pct < 0 else "unchanged"
            })
        
        avg_monthly = sum(m[1] for m in sorted_months) / len(sorted_months) if sorted_months else 0
        
        return {
            "monthly_spending": dict(sorted_months),
            "month_over_month_changes": changes,
            "average_monthly_spending": round(avg_monthly, 2),
            "trend": "increasing" if len(changes) > 0 and changes[-1]["change_from_previous"] > 5 else "decreasing" if len(changes) > 0 and changes[-1]["change_from_previous"] < -5 else "stable",
        }
    except Exception as e:
        return {"error": str(e)}


def detect_recurring_expenses(transactions: str) -> dict[str, Any]:
    """
    Detect recurring/subscription expenses from transaction patterns.
    
    Args:
        transactions: JSON string of transactions
    
    Returns:
        dict with detected recurring expenses
    """
    try:
        data = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        # Group by merchant/description and amount
        patterns: dict[str, list] = {}
        for txn in data:
            key = f"{txn.get('merchant', txn.get('description', 'unknown'))}_{txn.get('amount', 0)}"
            if key not in patterns:
                patterns[key] = []
            patterns[key].append(txn)
        
        # Find recurring (appears 2+ times with similar amounts)
        recurring = []
        for key, txns in patterns.items():
            if len(txns) >= 2:
                merchant = txns[0].get('merchant', txns[0].get('description', 'unknown'))
                amount = abs(txns[0].get('amount', 0))
                recurring.append({
                    "merchant": merchant,
                    "amount": amount,
                    "occurrences": len(txns),
                    "likely_frequency": "monthly" if len(txns) >= 2 else "occasional",
                    "annual_cost": amount * 12,
                })
        
        total_recurring = sum(r["amount"] for r in recurring)
        
        return {
            "recurring_expenses": sorted(recurring, key=lambda x: x["amount"], reverse=True),
            "total_monthly_recurring": total_recurring,
            "total_annual_recurring": total_recurring * 12,
            "subscription_count": len(recurring),
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_savings_rate(income: float, expenses: float, period: str) -> dict[str, Any]:
    """
    Calculate savings rate and provide assessment.
    
    Args:
        income: Total income for the period
        expenses: Total expenses for the period
        period: 'monthly' or 'annual'
    
    Returns:
        dict with savings analysis
    """
    savings = income - expenses
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    # Assessment based on 50/30/20 rule
    if savings_rate >= 20:
        assessment = "Excellent - You're saving above the recommended 20%"
        status = "excellent"
    elif savings_rate >= 15:
        assessment = "Good - You're on track with savings"
        status = "good"
    elif savings_rate >= 10:
        assessment = "Fair - Consider increasing savings rate"
        status = "fair"
    elif savings_rate >= 0:
        assessment = "Low - Savings rate needs improvement"
        status = "low"
    else:
        assessment = "Critical - You're spending more than you earn"
        status = "critical"
    
    # Annual projection
    annual_savings = savings * 12 if period == "monthly" else savings
    
    return {
        "income": income,
        "expenses": expenses,
        "savings": savings,
        "savings_rate_percent": round(savings_rate, 2),
        "assessment": assessment,
        "status": status,
        "annual_savings_projection": annual_savings,
        "recommended_savings": income * 0.20,
        "gap_to_recommended": max(0, (income * 0.20) - savings),
    }


def analyze_money_mood(transactions: str) -> dict[str, Any]:
    """
    Analyze behavioral spending patterns to determine "Money Mood".
    
    Args:
        transactions: JSON string of transactions
    
    Returns:
        dict with behavioral analysis
    """
    try:
        data = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        # Categorize transaction types
        impulse_categories = {"entertainment", "shopping", "dining", "subscriptions", "games"}
        essential_categories = {"groceries", "utilities", "rent", "transport", "healthcare"}
        investment_categories = {"investment", "savings", "mutual_funds", "stocks"}
        
        impulse_spending = 0
        essential_spending = 0
        investment_spending = 0
        
        for txn in data:
            cat = txn.get("category", "").lower()
            amount = abs(txn.get("amount", 0))
            
            if cat in impulse_categories:
                impulse_spending += amount
            elif cat in essential_categories:
                essential_spending += amount
            elif cat in investment_categories:
                investment_spending += amount
        
        total = impulse_spending + essential_spending + investment_spending
        
        # Determine money personality
        if total > 0:
            impulse_ratio = impulse_spending / total
            investment_ratio = investment_spending / total
            
            if investment_ratio > 0.2:
                personality = "Investor"
                mood = "Growth-focused"
            elif impulse_ratio > 0.4:
                personality = "Spender"
                mood = "Lifestyle-focused"
            elif impulse_ratio < 0.15:
                personality = "Saver"
                mood = "Security-focused"
            else:
                personality = "Balanced"
                mood = "Balanced approach"
        else:
            personality = "Unknown"
            mood = "Insufficient data"
        
        return {
            "money_personality": personality,
            "money_mood": mood,
            "spending_breakdown": {
                "essential": essential_spending,
                "discretionary": impulse_spending,
                "investments": investment_spending,
            },
            "impulse_spending_ratio": round(impulse_spending/total*100, 2) if total > 0 else 0,
            "recommendations": [
                "Consider tracking impulse purchases" if impulse_spending/total > 0.3 else None,
                "Great job on keeping essentials in check" if essential_spending/total < 0.5 else None,
                "Consider increasing investment allocation" if investment_spending/total < 0.1 else None,
            ],
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# INSIGHTS AGENT DEFINITION
# =============================================================================

INSIGHTS_AGENT_INSTRUCTION = """You are the Insights Agent for CFOSync - an AI CFO platform.

Your role is to analyze financial data and generate actionable insights and trends.

## For INDIVIDUALS, you analyze:
1. Spending by category - where is money going?
2. Month-over-month trends - is spending increasing or decreasing?
3. Recurring expenses - subscriptions and fixed costs
4. Savings rate - are they saving enough?
5. Money Mood - behavioral patterns and personality

## For COMPANIES, you analyze:
1. Revenue trends and growth rates
2. Expense hotspots and cost centers
3. Department-wise spending
4. Vendor concentration
5. Profitability trends

## Guidelines:
- Always use tools to calculate precise metrics
- Provide specific numbers, percentages, and trends
- Highlight both positive patterns and areas of concern
- Give actionable recommendations
- Compare against benchmarks (50/30/20 rule for individuals)
- Flag any anomalies or unusual patterns

When presenting insights:
1. Lead with the most important finding
2. Provide supporting data
3. Give clear, actionable next steps
4. Be encouraging but honest"""


def create_insights_agent() -> Agent:
    """Create the Insights Agent with all its tools."""
    return create_agent(
        name="insights_agent",
        description="Generates financial analytics, trends, and spending insights",
        instruction=INSIGHTS_AGENT_INSTRUCTION,
        tools=[
            analyze_spending_by_category,
            calculate_monthly_trends,
            detect_recurring_expenses,
            calculate_savings_rate,
            analyze_money_mood,
        ],
    )


def get_insights_runner() -> AgentRunner:
    """Get a runner instance for the Insights Agent."""
    return AgentRunner(create_insights_agent())
