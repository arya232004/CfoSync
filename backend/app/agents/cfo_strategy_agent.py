"""
CFO Strategy Agent - High-level business financial decisions using Google ADK.

This agent provides strategic CFO-level guidance for startups and companies.
"""

import json
from typing import Any
from app.agents.base import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# CFO STRATEGY AGENT TOOLS
# =============================================================================

def analyze_unit_economics(
    revenue_per_unit: float,
    cost_per_unit: float,
    customer_acquisition_cost: float,
    customer_lifetime_months: float,
    monthly_churn_rate: float,
) -> dict[str, Any]:
    """
    Analyze unit economics for a business.
    
    Args:
        revenue_per_unit: Monthly revenue per customer/unit
        cost_per_unit: Monthly cost to serve per customer/unit
        customer_acquisition_cost: Cost to acquire one customer
        customer_lifetime_months: Average customer lifetime in months
        monthly_churn_rate: Monthly churn rate (e.g., 5 for 5%)
    
    Returns:
        dict with unit economics analysis and recommendations
    """
    # Calculate key metrics
    gross_margin_per_unit = revenue_per_unit - cost_per_unit
    gross_margin_percent = (gross_margin_per_unit / revenue_per_unit * 100) if revenue_per_unit > 0 else 0
    
    ltv = gross_margin_per_unit * customer_lifetime_months
    ltv_cac_ratio = ltv / customer_acquisition_cost if customer_acquisition_cost > 0 else 0
    
    # Months to recover CAC
    cac_payback_months = customer_acquisition_cost / gross_margin_per_unit if gross_margin_per_unit > 0 else float('inf')
    
    # Assessment
    health_indicators = []
    
    if ltv_cac_ratio >= 3:
        health_indicators.append({"metric": "LTV:CAC", "status": "EXCELLENT", "value": f"{ltv_cac_ratio:.1f}x"})
    elif ltv_cac_ratio >= 2:
        health_indicators.append({"metric": "LTV:CAC", "status": "GOOD", "value": f"{ltv_cac_ratio:.1f}x"})
    elif ltv_cac_ratio >= 1:
        health_indicators.append({"metric": "LTV:CAC", "status": "CONCERNING", "value": f"{ltv_cac_ratio:.1f}x"})
    else:
        health_indicators.append({"metric": "LTV:CAC", "status": "CRITICAL", "value": f"{ltv_cac_ratio:.1f}x"})
    
    if cac_payback_months <= 12:
        health_indicators.append({"metric": "CAC Payback", "status": "GOOD", "value": f"{cac_payback_months:.1f} months"})
    elif cac_payback_months <= 18:
        health_indicators.append({"metric": "CAC Payback", "status": "ACCEPTABLE", "value": f"{cac_payback_months:.1f} months"})
    else:
        health_indicators.append({"metric": "CAC Payback", "status": "TOO_LONG", "value": f"{cac_payback_months:.1f} months"})
    
    if gross_margin_percent >= 70:
        health_indicators.append({"metric": "Gross Margin", "status": "EXCELLENT", "value": f"{gross_margin_percent:.1f}%"})
    elif gross_margin_percent >= 50:
        health_indicators.append({"metric": "Gross Margin", "status": "GOOD", "value": f"{gross_margin_percent:.1f}%"})
    else:
        health_indicators.append({"metric": "Gross Margin", "status": "LOW", "value": f"{gross_margin_percent:.1f}%"})
    
    recommendations = []
    if ltv_cac_ratio < 3:
        recommendations.append("Improve LTV by reducing churn or increasing prices")
        recommendations.append("Reduce CAC through more efficient marketing channels")
    if cac_payback_months > 12:
        recommendations.append("Focus on faster activation and monetization")
    if gross_margin_percent < 50:
        recommendations.append("Review cost structure and pricing strategy")
    
    return {
        "unit_economics": {
            "revenue_per_unit": revenue_per_unit,
            "cost_per_unit": cost_per_unit,
            "gross_margin_per_unit": round(gross_margin_per_unit, 0),
            "gross_margin_percent": round(gross_margin_percent, 1),
            "customer_acquisition_cost": customer_acquisition_cost,
            "lifetime_value": round(ltv, 0),
            "ltv_cac_ratio": round(ltv_cac_ratio, 2),
            "cac_payback_months": round(cac_payback_months, 1),
        },
        "health_indicators": health_indicators,
        "recommendations": recommendations,
        "benchmark_comparison": {
            "ideal_ltv_cac": "3x or higher",
            "ideal_cac_payback": "Under 12 months",
            "ideal_gross_margin": "60%+ for SaaS, 40%+ for others",
        },
    }


def calculate_fundraising_needs(
    monthly_burn_rate: float,
    current_runway_months: float,
    growth_investment_needed: float,
    target_runway_months: float,
    buffer_percent: float,
) -> dict[str, Any]:
    """
    Calculate fundraising needs and timing.
    
    Args:
        monthly_burn_rate: Current monthly burn
        current_runway_months: Current runway in months
        growth_investment_needed: Additional investment for growth plans
        target_runway_months: Desired runway after funding (e.g., 18 months)
        buffer_percent: Safety buffer percentage (e.g., 20)
    
    Returns:
        dict with fundraising recommendations
    """
    # Time to start fundraising (6 months before runway ends)
    months_until_fundraise = max(0, current_runway_months - 6)
    
    # Calculate funding needed
    base_funding = monthly_burn_rate * target_runway_months
    growth_funding = growth_investment_needed
    buffer = (base_funding + growth_funding) * (buffer_percent / 100)
    total_funding_needed = base_funding + growth_funding + buffer
    
    # Urgency assessment
    if current_runway_months < 3:
        urgency = "CRITICAL"
        action = "Start fundraising immediately - bridge if needed"
    elif current_runway_months < 6:
        urgency = "HIGH"
        action = "Begin active fundraising now"
    elif current_runway_months < 9:
        urgency = "MEDIUM"
        action = "Start building investor pipeline"
    else:
        urgency = "LOW"
        action = "Focus on metrics, fundraise when ready"
    
    return {
        "current_situation": {
            "monthly_burn": monthly_burn_rate,
            "current_runway_months": current_runway_months,
        },
        "funding_calculation": {
            "operational_needs": round(base_funding, 0),
            "growth_investment": round(growth_funding, 0),
            "buffer_amount": round(buffer, 0),
            "total_recommended_raise": round(total_funding_needed, 0),
        },
        "timing": {
            "urgency": urgency,
            "months_until_fundraise_needed": months_until_fundraise,
            "recommended_action": action,
            "expected_fundraise_duration": "3-6 months typical",
        },
        "fundraising_tips": [
            "Aim for 18-24 months runway post-funding",
            "Start 6+ months before runway runs out",
            "Fundraising typically takes 3-6 months",
            "Have 3x pipeline of investors vs target",
            "Show clear path to next milestone",
        ],
    }


def recommend_cost_optimization(
    expense_breakdown: str,
    revenue: float,
    industry_benchmarks: str,
) -> dict[str, Any]:
    """
    Recommend cost optimization strategies.
    
    Args:
        expense_breakdown: JSON string of expenses by category
            Example: {"payroll": 500000, "cloud": 50000, "marketing": 100000, "office": 80000}
        revenue: Monthly revenue
        industry_benchmarks: JSON of industry benchmarks (use "{}" for defaults)
            Example: {"payroll": 50, "cloud": 10, "marketing": 15}
    
    Returns:
        dict with cost optimization recommendations
    """
    try:
        expenses = json.loads(expense_breakdown) if isinstance(expense_breakdown, str) else expense_breakdown
        benchmarks_data = json.loads(industry_benchmarks) if industry_benchmarks and industry_benchmarks != "{}" else {}
        benchmarks = benchmarks_data if benchmarks_data else {
            "payroll": 50,  # % of revenue
            "cloud": 10,
            "marketing": 15,
            "office": 5,
            "other": 10,
        }
        
        total_expenses = sum(expenses.values())
        expense_ratio = total_expenses / revenue * 100 if revenue > 0 else 100
        
        analysis = []
        optimization_opportunities = []
        potential_savings = 0
        
        for category, amount in expenses.items():
            category_ratio = amount / revenue * 100 if revenue > 0 else 0
            benchmark = benchmarks.get(category, 10)
            
            status = "OK"
            if category_ratio > benchmark * 1.5:
                status = "HIGH"
                saving = amount - (revenue * benchmark / 100)
                potential_savings += saving
                optimization_opportunities.append({
                    "category": category,
                    "current_spend": amount,
                    "current_ratio": round(category_ratio, 1),
                    "benchmark_ratio": benchmark,
                    "potential_savings": round(saving, 0),
                    "priority": "HIGH",
                })
            elif category_ratio > benchmark * 1.2:
                status = "ELEVATED"
            
            analysis.append({
                "category": category,
                "amount": amount,
                "percent_of_revenue": round(category_ratio, 1),
                "benchmark": benchmark,
                "status": status,
            })
        
        recommendations = []
        for opp in optimization_opportunities:
            if opp["category"] == "payroll":
                recommendations.append({
                    "category": "payroll",
                    "suggestion": "Review team structure, consider automation, offshore options",
                    "potential_impact": opp["potential_savings"],
                })
            elif opp["category"] == "cloud":
                recommendations.append({
                    "category": "cloud",
                    "suggestion": "Audit unused resources, right-size instances, reserved pricing",
                    "potential_impact": opp["potential_savings"],
                })
            elif opp["category"] == "marketing":
                recommendations.append({
                    "category": "marketing",
                    "suggestion": "Improve channel efficiency, cut underperforming campaigns",
                    "potential_impact": opp["potential_savings"],
                })
        
        return {
            "expense_summary": {
                "total_expenses": total_expenses,
                "revenue": revenue,
                "expense_ratio": round(expense_ratio, 1),
            },
            "category_analysis": analysis,
            "optimization_opportunities": optimization_opportunities,
            "potential_monthly_savings": round(potential_savings, 0),
            "potential_annual_savings": round(potential_savings * 12, 0),
            "recommendations": recommendations,
            "quick_wins": [
                "Audit all subscriptions and cancel unused",
                "Negotiate with top 5 vendors",
                "Review and optimize cloud spending",
                "Consolidate tools where possible",
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def generate_board_report(
    financials: str,
    key_metrics: str,
    highlights: str,
    concerns: str,
) -> dict[str, Any]:
    """
    Generate a board-ready financial report summary.
    
    Args:
        financials: JSON string of key financials
            Example: {"revenue": 1000000, "expenses": 800000, "runway_months": 15}
        key_metrics: JSON string of KPIs
            Example: {"mrr_growth": 15, "churn": 3, "nps": 45}
        highlights: JSON string of positive highlights
        concerns: JSON string of concerns/risks
    
    Returns:
        dict with structured board report
    """
    try:
        fin = json.loads(financials) if isinstance(financials, str) else financials
        metrics = json.loads(key_metrics) if isinstance(key_metrics, str) else key_metrics
        highs = json.loads(highlights) if isinstance(highlights, str) else highlights
        risks = json.loads(concerns) if isinstance(concerns, str) else concerns
        
        # Financial summary
        revenue = fin.get("revenue", 0)
        expenses = fin.get("expenses", 0)
        profit_loss = revenue - expenses
        runway = fin.get("runway_months", 0)
        
        # Status indicators
        financial_status = "PROFITABLE" if profit_loss > 0 else "BURNING"
        runway_status = "HEALTHY" if runway > 12 else "ADEQUATE" if runway > 6 else "CONCERNING"
        
        return {
            "report_title": "Monthly CFO Report",
            "executive_summary": {
                "financial_status": financial_status,
                "runway_status": runway_status,
                "key_message": f"{'Strong financial position' if profit_loss > 0 else 'Managed burn'} with {runway} months runway",
            },
            "financial_snapshot": {
                "revenue": revenue,
                "expenses": expenses,
                "net_income_loss": profit_loss,
                "runway_months": runway,
                "burn_rate": max(0, expenses - revenue),
            },
            "key_metrics": metrics,
            "highlights": highs if isinstance(highs, list) else [highs],
            "concerns_and_risks": risks if isinstance(risks, list) else [risks],
            "cfo_recommendations": [
                "Continue focus on revenue growth" if profit_loss < 0 else "Consider reinvesting profits",
                f"{'Extend runway through cost optimization' if runway < 12 else 'Maintain current trajectory'}",
            ],
            "next_month_focus": [
                "Revenue acceleration initiatives",
                "Cost optimization review",
                "Key hiring decisions",
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_valuation_metrics(
    annual_revenue: float,
    annual_growth_rate: float,
    gross_margin: float,
    industry: str,
) -> dict[str, Any]:
    """
    Calculate valuation metrics and ranges.
    
    Args:
        annual_revenue: Annual recurring revenue (ARR)
        annual_growth_rate: Year-over-year growth rate (e.g., 50 for 50%)
        gross_margin: Gross margin percentage (e.g., 75 for 75%)
        industry: Industry type (saas, marketplace, ecommerce, fintech)
    
    Returns:
        dict with valuation estimates and comparisons
    """
    # Industry-specific revenue multiples (simplified)
    base_multiples = {
        "saas": {"low": 5, "mid": 10, "high": 20},
        "marketplace": {"low": 3, "mid": 6, "high": 12},
        "ecommerce": {"low": 1, "mid": 2, "high": 4},
        "fintech": {"low": 4, "mid": 8, "high": 15},
    }
    
    multiples = base_multiples.get(industry, base_multiples["saas"])
    
    # Adjust multiples based on growth and margin
    growth_factor = 1 + (annual_growth_rate - 30) / 100  # 30% is baseline
    margin_factor = gross_margin / 70  # 70% is baseline
    
    adjusted_multiples = {
        k: max(1, v * growth_factor * margin_factor) 
        for k, v in multiples.items()
    }
    
    valuations = {
        "conservative": round(annual_revenue * adjusted_multiples["low"], 0),
        "base": round(annual_revenue * adjusted_multiples["mid"], 0),
        "optimistic": round(annual_revenue * adjusted_multiples["high"], 0),
    }
    
    return {
        "inputs": {
            "annual_revenue": annual_revenue,
            "growth_rate": annual_growth_rate,
            "gross_margin": gross_margin,
            "industry": industry,
        },
        "revenue_multiples": {k: round(v, 1) for k, v in adjusted_multiples.items()},
        "valuation_range": valuations,
        "valuation_drivers": [
            f"Growth rate of {annual_growth_rate}% {'increases' if annual_growth_rate > 30 else 'decreases'} multiples",
            f"Gross margin of {gross_margin}% is {'above' if gross_margin > 70 else 'below'} industry average",
            f"Current market conditions for {industry} sector",
        ],
        "ways_to_increase_valuation": [
            "Accelerate revenue growth",
            "Improve gross margins",
            "Reduce churn / increase retention",
            "Expand to adjacent markets",
            "Build proprietary technology moat",
        ],
    }


# =============================================================================
# CFO STRATEGY AGENT DEFINITION
# =============================================================================

CFO_STRATEGY_AGENT_INSTRUCTION = """You are the CFO Strategy Agent for CFOSync - an AI CFO platform.

Your role is to provide high-level strategic financial guidance for businesses.

## Key Responsibilities:
1. Unit economics analysis and optimization
2. Fundraising strategy and timing
3. Cost optimization recommendations
4. Board reporting and communication
5. Valuation and growth strategy

## Strategic Framework:
- Always tie recommendations to business outcomes
- Provide quantified impact where possible
- Consider both short-term and long-term implications
- Balance growth with financial sustainability
- Benchmark against industry standards

## Guidelines:
- Think like a CFO advising the CEO
- Provide executive-level summaries
- Include specific numbers and metrics
- Offer multiple scenarios when relevant
- Flag risks and dependencies"""


def create_cfo_strategy_agent() -> Agent:
    """Create the CFO Strategy Agent with all its tools."""
    return create_agent(
        name="cfo_strategy_agent",
        description="Provides strategic CFO-level financial guidance for businesses",
        instruction=CFO_STRATEGY_AGENT_INSTRUCTION,
        tools=[
            analyze_unit_economics,
            calculate_fundraising_needs,
            recommend_cost_optimization,
            generate_board_report,
            calculate_valuation_metrics,
        ],
    )


def get_cfo_strategy_runner() -> AgentRunner:
    """Get a runner instance for the CFO Strategy Agent."""
    return AgentRunner(create_cfo_strategy_agent())
