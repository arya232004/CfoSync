"""
Risk Agent - Detects financial risks, overspending, and fraud using Google ADK.

This agent monitors for various financial risks and flags issues proactively.
"""

import json
from typing import Any
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# RISK AGENT TOOLS
# =============================================================================

def check_budget_compliance(
    budget: str,
    actual_spending: str,
) -> dict[str, Any]:
    """
    Check if spending is within budget limits by category.
    
    Args:
        budget: JSON string of budget by category
            Example: {"food": 10000, "transport": 5000, "entertainment": 3000}
        actual_spending: JSON string of actual spending by category
    
    Returns:
        dict with budget compliance analysis and violations
    """
    try:
        budget_data = json.loads(budget) if isinstance(budget, str) else budget
        actual_data = json.loads(actual_spending) if isinstance(actual_spending, str) else actual_spending
        
        violations = []
        compliant = []
        
        for category, limit in budget_data.items():
            actual = actual_data.get(category, 0)
            variance = actual - limit
            variance_pct = (variance / limit * 100) if limit > 0 else 0
            
            status = {
                "category": category,
                "budget": limit,
                "actual": actual,
                "variance": variance,
                "variance_percent": round(variance_pct, 2),
            }
            
            if variance > 0:
                # Overspent
                if variance_pct > 20:
                    status["severity"] = "HIGH"
                    status["message"] = f"Significant overspending in {category}"
                elif variance_pct > 10:
                    status["severity"] = "MEDIUM"
                    status["message"] = f"Moderate overspending in {category}"
                else:
                    status["severity"] = "LOW"
                    status["message"] = f"Slight overspending in {category}"
                violations.append(status)
            else:
                status["severity"] = "OK"
                status["message"] = f"Within budget for {category}"
                compliant.append(status)
        
        total_budget = sum(budget_data.values())
        total_actual = sum(actual_data.get(k, 0) for k in budget_data.keys())
        
        return {
            "overall_status": "VIOLATION" if violations else "COMPLIANT",
            "total_budget": total_budget,
            "total_actual": total_actual,
            "total_variance": total_actual - total_budget,
            "violations": violations,
            "compliant_categories": compliant,
            "violation_count": len(violations),
        }
    except Exception as e:
        return {"error": str(e)}


def detect_unusual_transactions(
    transactions: str,
    average_transaction: float,
    threshold_multiplier: float,
) -> dict[str, Any]:
    """
    Detect unusually large or suspicious transactions.
    
    Args:
        transactions: JSON string of recent transactions
        average_transaction: Historical average transaction amount
        threshold_multiplier: Flag transactions above this multiple of average (e.g., 3.0)
    
    Returns:
        dict with flagged unusual transactions
    """
    try:
        data = json.loads(transactions) if isinstance(transactions, str) else transactions
        threshold = average_transaction * threshold_multiplier
        
        flagged = []
        for txn in data:
            amount = abs(txn.get("amount", 0))
            if amount > threshold:
                flagged.append({
                    "transaction": txn,
                    "amount": amount,
                    "threshold": threshold,
                    "multiplier": round(amount / average_transaction, 2),
                    "risk_level": "HIGH" if amount > threshold * 2 else "MEDIUM",
                    "reason": f"Transaction {round(amount/average_transaction, 1)}x higher than average",
                })
        
        return {
            "unusual_transactions_found": len(flagged) > 0,
            "flagged_count": len(flagged),
            "total_transactions_analyzed": len(data),
            "threshold_used": threshold,
            "flagged_transactions": flagged,
        }
    except Exception as e:
        return {"error": str(e)}


def assess_debt_risk(
    monthly_income: float,
    monthly_debt_payments: float,
    total_debt: float,
    credit_utilization: float,
) -> dict[str, Any]:
    """
    Assess debt-related financial risks.
    
    Args:
        monthly_income: Gross monthly income
        monthly_debt_payments: Total monthly debt payments (EMIs, loans)
        total_debt: Total outstanding debt
        credit_utilization: Credit card utilization (0-100%)
    
    Returns:
        dict with debt risk assessment
    """
    # Debt-to-income ratio
    dti = (monthly_debt_payments / monthly_income * 100) if monthly_income > 0 else 0
    
    # Debt payoff timeline
    if monthly_debt_payments > 0:
        payoff_months = total_debt / monthly_debt_payments
    else:
        payoff_months = float('inf') if total_debt > 0 else 0
    
    risks = []
    overall_risk = "LOW"
    
    # DTI assessment
    if dti > 50:
        risks.append({
            "type": "HIGH_DTI",
            "severity": "CRITICAL",
            "message": f"Debt-to-income ratio of {dti:.1f}% is dangerously high (>50%)",
            "recommendation": "Immediate debt reduction needed. Consider debt consolidation.",
        })
        overall_risk = "CRITICAL"
    elif dti > 40:
        risks.append({
            "type": "ELEVATED_DTI",
            "severity": "HIGH",
            "message": f"Debt-to-income ratio of {dti:.1f}% is high (>40%)",
            "recommendation": "Focus on paying down high-interest debt.",
        })
        overall_risk = "HIGH"
    elif dti > 30:
        risks.append({
            "type": "MODERATE_DTI",
            "severity": "MEDIUM",
            "message": f"Debt-to-income ratio of {dti:.1f}% is moderate",
            "recommendation": "Monitor debt levels and avoid new debt.",
        })
        if overall_risk == "LOW":
            overall_risk = "MEDIUM"
    
    # Credit utilization assessment
    if credit_utilization > 80:
        risks.append({
            "type": "HIGH_CREDIT_UTILIZATION",
            "severity": "HIGH",
            "message": f"Credit utilization of {credit_utilization:.1f}% is very high",
            "recommendation": "Pay down credit card balances immediately.",
        })
        if overall_risk not in ["CRITICAL"]:
            overall_risk = "HIGH"
    elif credit_utilization > 50:
        risks.append({
            "type": "ELEVATED_CREDIT_UTILIZATION",
            "severity": "MEDIUM",
            "message": f"Credit utilization of {credit_utilization:.1f}% is elevated",
            "recommendation": "Aim to keep utilization below 30%.",
        })
    
    return {
        "overall_risk_level": overall_risk,
        "debt_to_income_ratio": round(dti, 2),
        "credit_utilization": credit_utilization,
        "total_debt": total_debt,
        "estimated_payoff_months": round(payoff_months, 1) if payoff_months != float('inf') else "Never at current rate",
        "risks_identified": risks,
        "risk_count": len(risks),
    }


def detect_invoice_fraud_indicators(invoices: str) -> dict[str, Any]:
    """
    Detect potential fraud indicators in invoices (for companies).
    
    Args:
        invoices: JSON string of invoice data
            Example: [{"vendor": "ABC Corp", "amount": 10000, "date": "2024-01-15", "invoice_no": "INV001"}, ...]
    
    Returns:
        dict with fraud risk indicators
    """
    try:
        data = json.loads(invoices) if isinstance(invoices, str) else invoices
        
        flags = []
        
        # Check for duplicate invoice numbers
        invoice_numbers = [inv.get("invoice_no", "") for inv in data]
        duplicates = set([x for x in invoice_numbers if invoice_numbers.count(x) > 1])
        if duplicates:
            flags.append({
                "type": "DUPLICATE_INVOICE_NUMBERS",
                "severity": "HIGH",
                "details": f"Duplicate invoice numbers found: {list(duplicates)}",
                "recommendation": "Verify these invoices are not duplicate payments",
            })
        
        # Check for round number invoices (potential fabrication)
        round_amounts = [inv for inv in data if inv.get("amount", 0) % 1000 == 0 and inv.get("amount", 0) > 5000]
        if len(round_amounts) > len(data) * 0.5:  # More than 50% are round numbers
            flags.append({
                "type": "SUSPICIOUS_ROUND_AMOUNTS",
                "severity": "MEDIUM",
                "details": f"{len(round_amounts)} invoices have suspicious round amounts",
                "recommendation": "Review invoices with round amounts for authenticity",
            })
        
        # Check for vendor concentration
        vendors: dict[str, float] = {}
        for inv in data:
            vendor = inv.get("vendor", "unknown")
            vendors[vendor] = vendors.get(vendor, 0) + inv.get("amount", 0)
        
        total_amount = sum(vendors.values())
        for vendor, amount in vendors.items():
            if total_amount > 0 and (amount / total_amount) > 0.4:
                flags.append({
                    "type": "VENDOR_CONCENTRATION",
                    "severity": "MEDIUM",
                    "details": f"Vendor '{vendor}' accounts for {amount/total_amount*100:.1f}% of total invoices",
                    "recommendation": "Review vendor relationship and consider diversification",
                })
        
        return {
            "fraud_indicators_found": len(flags) > 0,
            "total_invoices_analyzed": len(data),
            "total_amount_analyzed": total_amount,
            "flags": flags,
            "flag_count": len(flags),
            "risk_level": "HIGH" if any(f["severity"] == "HIGH" for f in flags) else "MEDIUM" if flags else "LOW",
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_runway_risk(
    cash_reserves: float,
    monthly_burn_rate: float,
    revenue_trend: str,
) -> dict[str, Any]:
    """
    Calculate runway risk for startups/companies.
    
    Args:
        cash_reserves: Current cash in bank
        monthly_burn_rate: Monthly burn (expenses - revenue)
        revenue_trend: 'increasing', 'stable', or 'decreasing'
    
    Returns:
        dict with runway risk assessment
    """
    if monthly_burn_rate <= 0:
        # Company is profitable
        return {
            "runway_months": "Infinite (Profitable)",
            "risk_level": "LOW",
            "status": "HEALTHY",
            "message": "Company is cash-flow positive",
            "recommendations": [],
        }
    
    runway_months = cash_reserves / monthly_burn_rate
    
    # Adjust risk based on revenue trend
    trend_adjustment = {"increasing": 1.2, "stable": 1.0, "decreasing": 0.8}
    adjusted_runway = runway_months * trend_adjustment.get(revenue_trend, 1.0)
    
    recommendations = []
    
    if adjusted_runway < 3:
        risk_level = "CRITICAL"
        status = "EMERGENCY"
        recommendations = [
            "Immediately seek emergency funding or bridge loan",
            "Implement immediate cost-cutting measures",
            "Consider reducing team size",
            "Pause all non-essential spending",
        ]
    elif adjusted_runway < 6:
        risk_level = "HIGH"
        status = "CONCERNING"
        recommendations = [
            "Begin fundraising process immediately",
            "Review and cut non-essential expenses",
            "Accelerate revenue generation efforts",
            "Prepare contingency plans",
        ]
    elif adjusted_runway < 12:
        risk_level = "MEDIUM"
        status = "WATCHLIST"
        recommendations = [
            "Start exploring funding options",
            "Optimize operational efficiency",
            "Focus on revenue growth",
        ]
    elif adjusted_runway < 18:
        risk_level = "LOW"
        status = "ADEQUATE"
        recommendations = [
            "Continue monitoring burn rate",
            "Build relationships with potential investors",
        ]
    else:
        risk_level = "MINIMAL"
        status = "HEALTHY"
        recommendations = [
            "Maintain financial discipline",
            "Consider strategic investments in growth",
        ]
    
    return {
        "runway_months": round(runway_months, 1),
        "adjusted_runway_months": round(adjusted_runway, 1),
        "risk_level": risk_level,
        "status": status,
        "cash_reserves": cash_reserves,
        "monthly_burn_rate": monthly_burn_rate,
        "revenue_trend": revenue_trend,
        "recommendations": recommendations,
    }


# =============================================================================
# RISK AGENT DEFINITION
# =============================================================================

RISK_AGENT_INSTRUCTION = """You are the Risk Agent for CFOSync - an AI CFO platform.

Your role is to detect and flag financial risks proactively before they become problems.

## For INDIVIDUALS, you monitor:
1. Budget compliance - flag overspending by category
2. Unusual transactions - detect anomalies
3. Debt risk - assess DTI ratio and credit utilization
4. Emergency fund risk - insufficient savings buffer
5. Lifestyle inflation - spending creeping up

## For COMPANIES, you monitor:
1. Runway risk - how long can the company survive
2. Invoice fraud - duplicate payments, suspicious patterns
3. Compliance risks - tax, GST issues
4. Cash flow risks - timing mismatches
5. Vendor concentration - over-reliance on single vendors

## Risk Severity Levels:
- CRITICAL: Immediate action required (within 24 hours)
- HIGH: Address within 1-2 days
- MEDIUM: Address within a week
- LOW: Monitor and review monthly

## Guidelines:
- Be proactive - flag issues before they escalate
- Provide specific evidence for each risk
- Always include actionable recommendations
- Prioritize risks by severity
- Don't create false alarms - be precise"""


def create_risk_agent() -> Agent:
    """Create the Risk Agent with all its tools."""
    return create_agent(
        name="risk_agent",
        description="Detects financial risks, overspending patterns, and fraud indicators",
        instruction=RISK_AGENT_INSTRUCTION,
        tools=[
            check_budget_compliance,
            detect_unusual_transactions,
            assess_debt_risk,
            detect_invoice_fraud_indicators,
            calculate_runway_risk,
        ],
    )


def get_risk_runner() -> AgentRunner:
    """Get a runner instance for the Risk Agent."""
    return AgentRunner(create_risk_agent())
