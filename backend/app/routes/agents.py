"""Agent API routes for CFOSync frontend integration."""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Any, Optional, List
from datetime import datetime

from ..auth import decode_token
from ..firebase import get_user_documents, get_user_transactions

router = APIRouter(prefix="/api/agents", tags=["agents"])


# ─────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated - please log in")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        token_data = decode_token(token)
        if token_data is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token - please log in again")
        
        return {"id": token_data.user_id, "email": token_data.email}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# Helper function to get user's real financial data from Firebase
async def get_user_financial_data(user_id: str):
    """Fetch real financial data from Firebase."""
    try:
        documents = await get_user_documents(user_id)
        transactions = await get_user_transactions(user_id, 500)
        
        # Calculate totals
        total_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
        total_expenses = sum(abs(t["amount"]) for t in transactions if t.get("type") == "expense")
        
        # Group by category
        expense_categories = {}
        income_categories = {}
        for t in transactions:
            cat = t.get("category", "Other")
            if t.get("type") == "expense":
                expense_categories[cat] = expense_categories.get(cat, 0) + abs(t["amount"])
            else:
                income_categories[cat] = income_categories.get(cat, 0) + t["amount"]
        
        # Sort categories
        top_expense_categories = sorted(
            [{"category": k, "amount": v} for k, v in expense_categories.items()],
            key=lambda x: x["amount"],
            reverse=True
        )
        
        return {
            "has_data": len(transactions) > 0,
            "statements_count": len(documents),
            "transactions_count": len(transactions),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_savings": total_income - total_expenses,
            "savings_rate": round((total_income - total_expenses) / total_income * 100, 1) if total_income > 0 else 0,
            "expense_categories": expense_categories,
            "top_categories": top_expense_categories[:5],
            "transactions": transactions,
            "recent_transactions": sorted(transactions, key=lambda x: x.get("date", ""), reverse=True)[:10]
        }
    except Exception as e:
        print(f"Error fetching financial data: {e}")
        return {
            "has_data": False,
            "statements_count": 0,
            "transactions_count": 0,
            "total_income": 0,
            "total_expenses": 0,
            "net_savings": 0,
            "savings_rate": 0,
            "expense_categories": {},
            "top_categories": [],
            "transactions": [],
            "recent_transactions": []
        }


# ─────────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────────

class InsightsRequest(BaseModel):
    user_id: str
    request_type: Optional[str] = "dashboard_insights"


class RiskRequest(BaseModel):
    user_id: str
    assessment_type: Optional[str] = "full"


class SpendingRequest(BaseModel):
    user_id: str
    transactions: Optional[List[dict]] = None
    period: Optional[str] = "month"


class ProfileRequest(BaseModel):
    user_id: str
    profile_type: Optional[str] = "summary"


class GoalsRequest(BaseModel):
    user_id: str
    financial_profile: Optional[dict] = None


class SimulationRequest(BaseModel):
    user_id: str
    event: str
    params: Optional[dict] = None


class CashflowRequest(BaseModel):
    company_id: str
    forecast_months: Optional[int] = 3


class CFOStrategyRequest(BaseModel):
    company_id: str
    request_type: Optional[str] = "strategic_insights"


class ComplianceRequest(BaseModel):
    company_id: str
    transactions: Optional[List[dict]] = None
    check_type: Optional[str] = "fraud_detection"


class BudgetRequest(BaseModel):
    company_id: str
    request_type: Optional[str] = "budget_analysis"


class PayrollRequest(BaseModel):
    company_id: str
    request_type: Optional[str] = "payroll_analysis"


class NudgeRequest(BaseModel):
    user_id: Optional[str] = None
    company_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Mock Response Data (for demo/fallback)
# ─────────────────────────────────────────────────────────────

MOCK_INSIGHTS = [
    {
        "type": "warning",
        "title": "Spending Alert",
        "message": "Your dining expenses are 34% higher than last month. Consider meal prepping to save $280/month.",
        "priority": "medium",
        "action": "View breakdown"
    },
    {
        "type": "opportunity",
        "title": "Savings Opportunity",
        "message": "Based on your income pattern, you can increase your emergency fund contribution by $200/month.",
        "priority": "high",
        "action": "Adjust savings"
    },
    {
        "type": "insight",
        "title": "Investment Opportunity",
        "message": "Your portfolio is 15% under-allocated in international stocks. Consider rebalancing.",
        "priority": "medium",
        "action": "Review portfolio"
    },
    {
        "type": "alert",
        "title": "Bill Reminder",
        "message": "Credit card payment of $1,250 due in 3 days. Ensure sufficient balance.",
        "priority": "high",
        "action": "Pay now"
    }
]

MOCK_RISK_ASSESSMENT = {
    "score": 72,
    "level": "moderate",
    "factors": [
        "Emergency fund below 3-month target",
        "High credit utilization (68%)",
        "Single income source"
    ],
    "suggestions": [
        "Build emergency fund to 6 months expenses",
        "Pay down credit card to below 30% utilization",
        "Consider diversifying income streams"
    ]
}

MOCK_SPENDING_ANALYSIS = {
    "totalSpending": 5200,
    "topCategories": [
        {"category": "Housing", "amount": 2200, "percentage": 42, "trend": "stable"},
        {"category": "Food & Dining", "amount": 850, "percentage": 16, "trend": "up"},
        {"category": "Transportation", "amount": 450, "percentage": 9, "trend": "down"},
        {"category": "Shopping", "amount": 380, "percentage": 7, "trend": "up"},
        {"category": "Utilities", "amount": 320, "percentage": 6, "trend": "stable"}
    ],
    "insights": [
        {
            "type": "warning",
            "title": "Dining Overspend",
            "message": "Restaurant spending up 34% from last month",
            "priority": "medium"
        }
    ],
    "savingsOpportunities": [
        {"category": "Subscriptions", "potentialSavings": 45, "suggestion": "Cancel unused streaming services"},
        {"category": "Dining", "potentialSavings": 200, "suggestion": "Cook at home 2 more days per week"}
    ]
}

MOCK_PROFILE = {
    "netWorth": 125000,
    "monthlyIncome": 8500,
    "monthlyExpenses": 5200,
    "savingsRate": 38.8,
    "debtToIncome": 28,
    "emergencyFundMonths": 2.3,
    "creditScore": 742,
    "riskTolerance": "moderate",
    "financialGoals": ["retirement", "home_purchase", "emergency_fund"]
}

MOCK_GOALS = [
    {
        "goalType": "emergency_fund",
        "targetAmount": 30000,
        "monthlyContribution": 500,
        "timelineMonths": 36,
        "priority": 1,
        "reasoning": "Critical for financial security - aim for 6 months expenses"
    },
    {
        "goalType": "retirement",
        "targetAmount": 500000,
        "monthlyContribution": 800,
        "timelineMonths": 300,
        "priority": 2,
        "reasoning": "Maximize 401k match - you're leaving $3,200/year on the table"
    }
]

MOCK_SIMULATION = {
    "event": "job_loss",
    "financialImpact": -45000,
    "monthlyImpactChange": -8500,
    "yearsToRecover": 1.5,
    "recommendations": [
        "Build emergency fund to 6 months",
        "Consider income protection insurance",
        "Reduce discretionary spending immediately"
    ],
    "risks": [
        "Current emergency fund covers only 2.3 months",
        "High fixed expenses may be difficult to reduce"
    ],
    "opportunities": [
        "Unemployment benefits could cover 40% of expenses",
        "Skills are in demand - likely to find new role within 3 months"
    ]
}

MOCK_CFO_INSIGHTS = [
    {
        "type": "warning",
        "title": "Cash Runway Alert",
        "message": "At current burn rate, runway is 8 months. Consider reducing non-essential expenses.",
        "priority": "high",
        "action": "View cash flow"
    },
    {
        "type": "opportunity",
        "title": "Revenue Optimization",
        "message": "Top 3 customers represent 65% of revenue. Diversification recommended.",
        "priority": "medium",
        "action": "Customer analysis"
    },
    {
        "type": "insight",
        "title": "Cost Reduction",
        "message": "Software subscriptions increased 45% YoY. Consolidation could save $24,000.",
        "priority": "medium",
        "action": "Review subscriptions"
    }
]

MOCK_CASHFLOW_FORECAST = [
    {
        "projectedBalance": 245000,
        "projectedIncome": 180000,
        "projectedExpenses": 156000,
        "runwayMonths": 8,
        "confidence": 85,
        "risks": ["Two large invoices pending", "Seasonal revenue dip expected"],
        "recommendations": ["Follow up on overdue invoices", "Defer non-critical purchases"]
    },
    {
        "projectedBalance": 269000,
        "projectedIncome": 195000,
        "projectedExpenses": 162000,
        "runwayMonths": 9,
        "confidence": 75,
        "risks": ["Q2 typically has lower sales"],
        "recommendations": ["Build cash reserves", "Consider credit line"]
    }
]

MOCK_FRAUD_ALERTS = [
    {
        "id": "fa-001",
        "severity": "high",
        "type": "Unusual Transaction",
        "description": "Wire transfer of $45,000 to new vendor not in approved list",
        "amount": 45000,
        "confidence": 92,
        "suggestedAction": "Verify vendor and approve or block transaction"
    },
    {
        "id": "fa-002",
        "severity": "medium",
        "type": "Duplicate Invoice",
        "description": "Invoice #4521 appears to be duplicate of #4518",
        "amount": 3200,
        "confidence": 87,
        "suggestedAction": "Review both invoices before payment"
    }
]


# ─────────────────────────────────────────────────────────────
# Individual User Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/insights")
async def get_insights(request: InsightsRequest, current_user: dict = Depends(get_current_user)):
    """Get AI-powered financial insights based on real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    if not data["has_data"]:
        return {
            "insights": [
                {
                    "type": "info",
                    "title": "Upload Your Statements",
                    "message": "Upload your bank statements to get personalized AI insights about your finances.",
                    "priority": "high",
                    "action": "Upload now"
                }
            ],
            "user_id": user_id
        }
    
    insights = []
    
    # Analyze savings rate
    if data["savings_rate"] < 20:
        insights.append({
            "type": "warning",
            "title": "Low Savings Rate",
            "message": f"Your savings rate is {data['savings_rate']}%. Aim for at least 20% for financial security.",
            "priority": "high",
            "action": "Create budget"
        })
    elif data["savings_rate"] >= 30:
        insights.append({
            "type": "success",
            "title": "Excellent Savings!",
            "message": f"Your {data['savings_rate']}% savings rate is well above average. Keep it up!",
            "priority": "low",
            "action": "View details"
        })
    
    # Analyze top spending categories
    if data["top_categories"]:
        top_cat = data["top_categories"][0]
        if data["total_expenses"] > 0:
            percentage = round(top_cat["amount"] / data["total_expenses"] * 100)
            if percentage > 40:
                insights.append({
                    "type": "warning",
                    "title": f"High {top_cat['category']} Spending",
                    "message": f"{top_cat['category']} represents {percentage}% of your expenses. Consider if this aligns with your priorities.",
                    "priority": "medium",
                    "action": "View breakdown"
                })
    
    # Analyze income vs expenses
    if data["net_savings"] < 0:
        insights.append({
            "type": "alert",
            "title": "Spending Exceeds Income",
            "message": f"You're spending ${abs(data['net_savings']):,.0f} more than you earn. Review expenses urgently.",
            "priority": "high",
            "action": "Review now"
        })
    elif data["net_savings"] > 0:
        insights.append({
            "type": "opportunity",
            "title": "Investment Opportunity",
            "message": f"You have ${data['net_savings']:,.0f} surplus. Consider investing in low-cost index funds for long-term growth.",
            "priority": "medium",
            "action": "Learn more"
        })
    
    return {"insights": insights, "user_id": user_id}


@router.post("/risk")
async def assess_risk(request: RiskRequest, current_user: dict = Depends(get_current_user)):
    """Assess financial risk based on real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    if not data["has_data"]:
        return {
            "score": 0,
            "level": "unknown",
            "factors": ["No financial data available"],
            "suggestions": ["Upload bank statements to get your risk assessment"],
            "user_id": user_id
        }
    
    risk_score = 70  # Base score
    factors = []
    suggestions = []
    
    # Check savings rate
    if data["savings_rate"] < 10:
        risk_score -= 20
        factors.append("Very low savings rate indicates financial vulnerability")
        suggestions.append("Aim to save at least 10% of your income")
    elif data["savings_rate"] < 20:
        risk_score -= 10
        factors.append("Savings rate below recommended 20%")
        suggestions.append("Gradually increase savings to 20% of income")
    
    # Check income diversity
    income_sources = len([t for t in data["transactions"] if t.get("type") == "income"])
    if income_sources <= 2:
        risk_score -= 10
        factors.append("Limited income sources")
        suggestions.append("Consider diversifying income streams")
    
    # Check expense concentration
    if data["top_categories"] and data["total_expenses"] > 0:
        top_percentage = data["top_categories"][0]["amount"] / data["total_expenses"] * 100
        if top_percentage > 50:
            risk_score -= 10
            factors.append(f"High expense concentration in {data['top_categories'][0]['category']}")
            suggestions.append("Diversify spending to reduce dependency on single category")
    
    # Determine level
    level = "high" if risk_score < 50 else "moderate" if risk_score < 70 else "low"
    
    return {
        "score": max(0, min(100, risk_score)),
        "level": level,
        "factors": factors if factors else ["Your finances appear stable based on available data"],
        "suggestions": suggestions if suggestions else ["Continue maintaining good financial habits"],
        "user_id": user_id
    }


@router.post("/spending")
async def analyze_spending(request: SpendingRequest, current_user: dict = Depends(get_current_user)):
    """Analyze spending patterns from real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    if not data["has_data"]:
        return {
            "totalSpending": 0,
            "topCategories": [],
            "insights": [{"type": "info", "title": "No Data", "message": "Upload statements to see spending analysis", "priority": "high"}],
            "savingsOpportunities": [],
            "user_id": user_id
        }
    
    # Color palette for categories
    colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#6B7280"]
    
    # Build top categories with percentages
    top_categories = []
    for i, cat in enumerate(data["top_categories"][:5]):
        percentage = round(cat["amount"] / data["total_expenses"] * 100) if data["total_expenses"] > 0 else 0
        top_categories.append({
            "category": cat["category"],
            "amount": cat["amount"],
            "percentage": percentage,
            "trend": "stable",  # Would need historical data for trend
            "color": colors[i % len(colors)]
        })
    
    # Generate insights
    insights = []
    if data["total_expenses"] > data["total_income"]:
        insights.append({
            "type": "warning",
            "title": "Over Budget",
            "message": f"Expenses exceed income by ${data['total_expenses'] - data['total_income']:,.0f}",
            "priority": "high"
        })
    
    # Generate savings opportunities
    opportunities = []
    for cat in data["top_categories"][:3]:
        opportunities.append({
            "category": cat["category"],
            "potentialSavings": round(cat["amount"] * 0.1),  # 10% potential savings
            "suggestion": f"Reducing {cat['category']} by 10% could save ${round(cat['amount'] * 0.1):,.0f}"
        })
    
    return {
        "totalSpending": data["total_expenses"],
        "topCategories": top_categories,
        "insights": insights,
        "savingsOpportunities": opportunities,
        "user_id": user_id
    }


@router.post("/profile")
async def get_profile(request: ProfileRequest, current_user: dict = Depends(get_current_user)):
    """Get financial profile from real data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    return {
        "profile": {
            "netWorth": data["net_savings"],  # Simplified - would need investment data
            "monthlyIncome": data["total_income"],
            "monthlyExpenses": data["total_expenses"],
            "savingsRate": data["savings_rate"],
            "transactionCount": data["transactions_count"],
            "statementsCount": data["statements_count"],
            "hasData": data["has_data"]
        },
        "user_id": user_id
    }


@router.post("/goals")
async def get_goal_recommendations(request: GoalsRequest, current_user: dict = Depends(get_current_user)):
    """Get AI-recommended financial goals based on real data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    if not data["has_data"]:
        return {
            "goals": [
                {
                    "goalType": "Get Started",
                    "targetAmount": 0,
                    "monthlyContribution": 0,
                    "timelineMonths": 0,
                    "priority": 1,
                    "reasoning": "Upload your bank statements to get personalized goal recommendations"
                }
            ],
            "user_id": user_id
        }
    
    goals = []
    monthly_income = data["total_income"]
    monthly_expenses = data["total_expenses"]
    
    # Emergency fund goal
    emergency_target = monthly_expenses * 6
    goals.append({
        "goalType": "Emergency Fund",
        "targetAmount": emergency_target,
        "monthlyContribution": round(monthly_income * 0.1),
        "timelineMonths": max(12, round(emergency_target / (monthly_income * 0.1))) if monthly_income > 0 else 0,
        "priority": 1,
        "reasoning": f"Build 6 months of expenses (${emergency_target:,.0f}) for financial security"
    })
    
    # Retirement goal
    if data["savings_rate"] > 0:
        goals.append({
            "goalType": "Retirement Savings",
            "targetAmount": monthly_income * 12 * 25,  # 25x annual income
            "monthlyContribution": round(monthly_income * 0.15),
            "timelineMonths": 360,  # 30 years
            "priority": 2,
            "reasoning": "Contribute 15% of income to retirement accounts for long-term security"
        })
    
    # Debt reduction if overspending
    if data["net_savings"] < 0:
        goals.append({
            "goalType": "Reduce Spending",
            "targetAmount": abs(data["net_savings"]),
            "monthlyContribution": abs(data["net_savings"]),
            "timelineMonths": 1,
            "priority": 1,
            "reasoning": f"Cut expenses by ${abs(data['net_savings']):,.0f} to stop accumulating debt"
        })
    
    return {"goals": goals, "user_id": user_id}


@router.post("/simulation")
async def run_simulation(request: SimulationRequest, current_user: dict = Depends(get_current_user)):
    """Run life event simulation based on real financial data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    # Use real data if available, otherwise use defaults
    base_income = data["total_income"] if data["has_data"] else 5000
    base_expenses = data["total_expenses"] if data["has_data"] else 3500
    
    impact = request.params.get("cost", 0) if request.params else 0
    
    return {
        "event": request.event,
        "financialImpact": -impact,
        "monthlyImpactChange": -round(impact / 12),
        "yearsToRecover": round(impact / (base_income - base_expenses) / 12, 1) if (base_income - base_expenses) > 0 else 99,
        "recommendations": [
            f"Build savings of ${impact:,.0f} before this event",
            "Consider income protection insurance",
            "Create a dedicated savings account for this goal"
        ],
        "risks": [
            f"Current monthly surplus: ${base_income - base_expenses:,.0f}",
            "May need to adjust timeline based on savings rate"
        ],
        "opportunities": [
            "Tax advantages may be available for this life event",
            "Consider employer benefits that may offset costs"
        ]
    }


# ─────────────────────────────────────────────────────────────
# Company/Business Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/cfo_strategy")
async def get_cfo_strategy(request: CFOStrategyRequest):
    """Get CFO-level strategic insights for companies."""
    return {"insights": MOCK_CFO_INSIGHTS, "company_id": request.company_id}


@router.post("/cashflow")
async def forecast_cashflow(request: CashflowRequest):
    """Forecast cash flow for companies."""
    return {
        "forecasts": MOCK_CASHFLOW_FORECAST[:request.forecast_months],
        "company_id": request.company_id
    }


@router.post("/compliance")
async def check_compliance(request: ComplianceRequest):
    """Check compliance and detect fraud."""
    return {
        "alerts": MOCK_FRAUD_ALERTS,
        "status": "92% compliant",
        "company_id": request.company_id
    }


@router.post("/budgets")
async def analyze_budgets(request: BudgetRequest):
    """Analyze department budgets."""
    return {
        "departments": [
            {"name": "Engineering", "budget": 450000, "spent": 380000, "forecast": 485000, "alerts": ["Projected to exceed budget by 8%"]},
            {"name": "Sales", "budget": 280000, "spent": 195000, "forecast": 260000, "alerts": []},
            {"name": "Marketing", "budget": 150000, "spent": 142000, "forecast": 165000, "alerts": ["Ad spend trending high"]},
        ],
        "recommendations": [
            "Reallocate $20k from Operations to Engineering",
            "Review Marketing ad spend efficiency"
        ],
        "company_id": request.company_id
    }


@router.post("/payroll")
async def analyze_payroll(request: PayrollRequest):
    """Analyze payroll and compensation."""
    return {
        "insights": [
            {
                "type": "warning",
                "title": "Salary Competitiveness",
                "message": "Engineering salaries are 12% below market rate.",
                "priority": "high"
            }
        ],
        "benchmarks": [
            {"metric": "Revenue per Employee", "company": 185000, "industry": 210000, "status": "warning"},
            {"metric": "Payroll as % of Revenue", "company": 42, "industry": 38, "status": "warning"},
        ],
        "company_id": request.company_id
    }


@router.post("/nudge")
async def get_nudges(request: NudgeRequest):
    """Get smart notifications and nudges."""
    return {
        "nudges": [
            {
                "type": "alert",
                "title": "Invoice Due",
                "message": "3 invoices totaling $28,500 are due today",
                "priority": "high",
                "action": "Review invoices"
            },
            {
                "type": "insight",
                "title": "Tax Deadline",
                "message": "Quarterly estimated taxes due in 12 days",
                "priority": "medium",
                "action": "Prepare payment"
            }
        ]
    }


# ─────────────────────────────────────────────────────────────
# Dashboard Data Endpoints
# ─────────────────────────────────────────────────────────────

class DashboardRequest(BaseModel):
    user_id: str


@router.post("/dashboard")
async def get_dashboard_data(request: DashboardRequest, current_user: dict = Depends(get_current_user)):
    """Get comprehensive dashboard data from real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    # Color palette
    colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#6B7280"]
    
    # Build spending breakdown
    spending_breakdown = []
    for i, cat in enumerate(data["top_categories"][:7]):
        percentage = round(cat["amount"] / data["total_expenses"] * 100) if data["total_expenses"] > 0 else 0
        spending_breakdown.append({
            "category": cat["category"],
            "amount": cat["amount"],
            "percentage": percentage,
            "color": colors[i % len(colors)]
        })
    
    # Format recent transactions
    recent_txns = []
    for i, t in enumerate(data["recent_transactions"][:10]):
        recent_txns.append({
            "id": t.get("id", f"t{i}"),
            "description": t.get("description", "Transaction"),
            "amount": t.get("amount", 0),
            "type": t.get("type", "expense"),
            "category": t.get("category", "Other"),
            "date": t.get("date", "")
        })
    
    # Calculate financial health score
    health_score = 50
    if data["has_data"]:
        if data["savings_rate"] > 30:
            health_score += 25
        elif data["savings_rate"] > 20:
            health_score += 15
        elif data["savings_rate"] > 10:
            health_score += 5
        
        if data["net_savings"] > 0:
            health_score += 15
        
        if data["transactions_count"] > 10:
            health_score += 10  # More data = better analysis
    
    return {
        "user_id": user_id,
        "hasData": data["has_data"],
        "financialHealth": {
            "score": min(100, health_score),
            "trend": "up" if data["net_savings"] > 0 else "down",
            "change": round(data["savings_rate"] / 10, 1)
        },
        "metrics": {
            "netWorth": data["net_savings"],
            "monthlyIncome": data["total_income"],
            "monthlyExpenses": data["total_expenses"],
            "savingsRate": data["savings_rate"]
        },
        "recentTransactions": recent_txns,
        "spendingBreakdown": spending_breakdown,
        "goals": [
            {
                "id": "g1",
                "name": "Emergency Fund",
                "current": max(0, data["net_savings"]),
                "target": data["total_expenses"] * 6,
                "progress": min(100, round(data["net_savings"] / (data["total_expenses"] * 6) * 100)) if data["total_expenses"] > 0 else 0
            },
            {
                "id": "g2",
                "name": "Monthly Savings Goal",
                "current": data["net_savings"],
                "target": data["total_income"] * 0.2,
                "progress": min(100, round(data["savings_rate"] / 20 * 100))
            }
        ],
        "quickActions": [
            {"id": "qa1", "title": "Upload Statement", "description": "Add more financial data", "type": "upload"},
            {"id": "qa2", "title": "View Analysis", "description": "See detailed insights", "type": "analysis"},
            {"id": "qa3", "title": "Set Goals", "description": "Plan your finances", "type": "goals"}
        ]
    }


# ─────────────────────────────────────────────────────────────
# Investments Data Endpoints
# ─────────────────────────────────────────────────────────────

class InvestmentsRequest(BaseModel):
    user_id: str
    timeframe: Optional[str] = "1Y"


@router.post("/investments")
async def get_investments_data(request: InvestmentsRequest, current_user: dict = Depends(get_current_user)):
    """Get comprehensive investment portfolio data."""
    user_id = current_user["id"]
    return {
        "user_id": user_id,
        "portfolioSummary": {
            "totalValue": 125000,
            "totalGain": 18500,
            "totalGainPercent": 17.4,
            "dayChange": 1250,
            "dayChangePercent": 1.01
        },
        "assetAllocation": [
            {"name": "US Stocks", "value": 55000, "percent": 44, "color": "bg-blue-500"},
            {"name": "International", "value": 20000, "percent": 16, "color": "bg-purple-500"},
            {"name": "Bonds", "value": 25000, "percent": 20, "color": "bg-green-500"},
            {"name": "Real Estate", "value": 15000, "percent": 12, "color": "bg-orange-500"},
            {"name": "Crypto", "value": 5000, "percent": 4, "color": "bg-yellow-500"},
            {"name": "Cash", "value": 5000, "percent": 4, "color": "bg-gray-500"}
        ],
        "holdings": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market", "shares": 150, "price": 245.50, "value": 36825, "change": 2.3, "changePercent": 0.94},
            {"symbol": "VXUS", "name": "Vanguard Total International", "shares": 200, "price": 60.25, "value": 12050, "change": -0.85, "changePercent": -1.39},
            {"symbol": "BND", "name": "Vanguard Total Bond Market", "shares": 300, "price": 72.50, "value": 21750, "change": 0.15, "changePercent": 0.21},
            {"symbol": "VNQ", "name": "Vanguard Real Estate", "shares": 100, "price": 85.00, "value": 8500, "change": 1.25, "changePercent": 1.49},
            {"symbol": "AAPL", "name": "Apple Inc.", "shares": 50, "price": 178.50, "value": 8925, "change": 3.50, "changePercent": 2.00},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "shares": 30, "price": 378.00, "value": 11340, "change": 5.20, "changePercent": 1.39},
            {"symbol": "BTC", "name": "Bitcoin", "shares": 0.15, "price": 67500, "value": 10125, "change": 1500, "changePercent": 2.27}
        ],
        "accountTypes": [
            {"name": "401(k)", "value": 65000, "color": "from-blue-500 to-cyan-500"},
            {"name": "Roth IRA", "value": 35000, "color": "from-green-500 to-emerald-500"},
            {"name": "Brokerage", "value": 20000, "color": "from-purple-500 to-pink-500"},
            {"name": "Crypto Wallet", "value": 5000, "color": "from-yellow-500 to-orange-500"}
        ],
        "aiInsights": [
            {
                "type": "rebalance",
                "title": "Portfolio Rebalancing Needed",
                "description": "US Stocks are 4% over target allocation. Consider rebalancing to maintain risk profile.",
                "action": "Review Allocation"
            },
            {
                "type": "opportunity",
                "title": "Tax-Loss Harvesting Opportunity",
                "description": "VXUS is down 8% YTD. Consider harvesting losses to offset gains.",
                "action": "Learn More"
            },
            {
                "type": "contribution",
                "title": "Maximize 401(k) Contribution",
                "description": "You have $5,500 remaining in your 2025 401(k) limit. Consider increasing contributions.",
                "action": "Adjust Contribution"
            }
        ]
    }


# ─────────────────────────────────────────────────────────────
# Planning Data Endpoints
# ─────────────────────────────────────────────────────────────

class PlanningRequest(BaseModel):
    user_id: str


@router.post("/planning")
async def get_planning_data(request: PlanningRequest, current_user: dict = Depends(get_current_user)):
    """Get financial planning and goals data from real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    monthly_income = data["total_income"]
    monthly_expenses = data["total_expenses"]
    monthly_savings = data["net_savings"]
    
    # Calculate budget categories based on actual spending
    budget_categories = []
    for cat in data["top_categories"][:8]:
        # Estimate budget as 90% of actual spending (suggesting slight reduction)
        budgeted = round(cat["amount"] * 0.9)
        spent = cat["amount"]
        remaining = budgeted - spent
        status = "over_budget" if remaining < 0 else "under_budget" if remaining > budgeted * 0.1 else "on_budget"
        budget_categories.append({
            "category": cat["category"],
            "budgeted": budgeted,
            "spent": spent,
            "remaining": remaining,
            "status": status
        })
    
    # Generate goals based on real data
    financial_goals = []
    
    if monthly_expenses > 0:
        emergency_target = monthly_expenses * 6
        emergency_current = max(0, monthly_savings)
        financial_goals.append({
            "id": "goal1",
            "name": "Emergency Fund",
            "icon": "Shield",
            "color": "from-blue-500 to-cyan-500",
            "current": emergency_current,
            "target": emergency_target,
            "progress": min(100, round(emergency_current / emergency_target * 100)) if emergency_target > 0 else 0,
            "monthlyContribution": round(monthly_income * 0.1) if monthly_income > 0 else 0,
            "targetDate": "2027-06-01",
            "status": "on_track" if monthly_savings > 0 else "behind"
        })
    
    if monthly_savings > 0:
        financial_goals.append({
            "id": "goal2",
            "name": "Investment Portfolio",
            "icon": "TrendingUp",
            "color": "from-green-500 to-emerald-500",
            "current": 0,
            "target": monthly_income * 12,
            "progress": 0,
            "monthlyContribution": round(monthly_savings * 0.5),
            "targetDate": "2026-12-01",
            "status": "on_track"
        })
    
    # AI recommendations based on real data
    recommendations = []
    
    if data["savings_rate"] < 20:
        recommendations.append({
            "type": "savings",
            "title": "Increase Your Savings Rate",
            "description": f"Your current savings rate is {data['savings_rate']}%. Aim for at least 20% for financial security.",
            "impact": f"+${round((20 - data['savings_rate']) / 100 * monthly_income):,.0f}/month potential",
            "action": "Create budget"
        })
    
    if data["top_categories"]:
        top_cat = data["top_categories"][0]
        if data["total_expenses"] > 0 and top_cat["amount"] / data["total_expenses"] > 0.3:
            recommendations.append({
                "type": "spending",
                "title": f"Reduce {top_cat['category']} Expenses",
                "description": f"{top_cat['category']} is your largest expense. Cutting by 10% could help.",
                "impact": f"${round(top_cat['amount'] * 0.1):,.0f}/month savings",
                "action": "View tips"
            })
    
    if not data["has_data"]:
        recommendations.append({
            "type": "setup",
            "title": "Connect Your Accounts",
            "description": "Upload bank statements to get personalized planning recommendations.",
            "impact": "Full financial picture",
            "action": "Upload now"
        })
    
    return {
        "user_id": user_id,
        "summary": {
            "monthlyIncome": monthly_income,
            "monthlyExpenses": monthly_expenses,
            "monthlySavings": monthly_savings,
            "savingsRate": data["savings_rate"],
            "projectedAnnualSavings": monthly_savings * 12
        },
        "financialGoals": financial_goals,
        "budgetCategories": budget_categories,
        "aiRecommendations": recommendations
    }


# ─────────────────────────────────────────────────────────────
# Life Simulator Data Endpoints
# ─────────────────────────────────────────────────────────────

class SimulatorConfigRequest(BaseModel):
    user_id: str


class RunSimulationRequest(BaseModel):
    user_id: str
    current_age: int
    retirement_age: int
    current_income: int
    current_savings: int
    monthly_expenses: int
    selected_events: List[dict]


@router.post("/simulator/config")
async def get_simulator_config(request: SimulatorConfigRequest, current_user: dict = Depends(get_current_user)):
    """Get life simulator configuration with defaults from real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    # Use real data for defaults if available
    defaults = {
        "currentAge": 30,
        "retirementAge": 65,
        "currentIncome": data["total_income"] * 12 if data["has_data"] else 85000,  # Annual
        "currentSavings": data["net_savings"] if data["has_data"] else 50000,
        "monthlyExpenses": data["total_expenses"] if data["has_data"] else 4500
    }
    
    return {
        "user_id": user_id,
        "defaults": defaults,
        "lifeEvents": [
            {
                "id": "marriage",
                "name": "Getting Married",
                "icon": "Heart",
                "color": "from-pink-500 to-rose-500",
                "avgCost": 30000,
                "description": "Wedding ceremony, honeymoon, and related expenses"
            },
            {
                "id": "house",
                "name": "Buying a Home",
                "icon": "Home",
                "color": "from-blue-500 to-cyan-500",
                "avgCost": 400000,
                "description": "Down payment, closing costs, and initial furnishing"
            },
            {
                "id": "car",
                "name": "New Vehicle",
                "icon": "Car",
                "color": "from-green-500 to-emerald-500",
                "avgCost": 35000,
                "description": "Car purchase, insurance, and registration"
            },
            {
                "id": "baby",
                "name": "Having a Baby",
                "icon": "Baby",
                "color": "from-purple-500 to-pink-500",
                "avgCost": 15000,
                "description": "First year costs including medical, supplies, childcare"
            },
            {
                "id": "education",
                "name": "Higher Education",
                "icon": "GraduationCap",
                "color": "from-yellow-500 to-orange-500",
                "avgCost": 50000,
                "description": "Graduate degree, certifications, or career change"
            },
            {
                "id": "career",
                "name": "Career Change",
                "icon": "Briefcase",
                "color": "from-indigo-500 to-purple-500",
                "avgCost": 20000,
                "description": "Training, gap period, relocation if needed"
            },
            {
                "id": "travel",
                "name": "Extended Travel",
                "icon": "Plane",
                "color": "from-cyan-500 to-blue-500",
                "avgCost": 25000,
                "description": "Sabbatical, world travel, or extended vacation"
            },
            {
                "id": "retirement",
                "name": "Early Retirement",
                "icon": "TrendingUp",
                "color": "from-emerald-500 to-teal-500",
                "avgCost": 1000000,
                "description": "Financial independence and early retirement"
            }
        ]
    }


@router.post("/simulator/run")
async def run_life_simulation(request: RunSimulationRequest, current_user: dict = Depends(get_current_user)):
    """Run life event simulation and get results."""
    user_id = current_user["id"]
    results = []
    net_worth = request.current_savings
    income = request.current_income
    annual_expenses = request.monthly_expenses * 12
    
    for age in range(request.current_age, request.retirement_age + 11):
        year = 2025 + (age - request.current_age)
        events_this_year = [e for e in request.selected_events if e.get('year') == age]
        event_costs = sum(e.get('cost', 0) for e in events_this_year)
        
        # Growth assumptions
        if age < request.retirement_age:
            income *= 1.03  # 3% annual raise
        else:
            income = income * 0.7  # Retirement income
        
        savings = income - annual_expenses - event_costs
        net_worth = net_worth * 1.07 + savings  # 7% investment growth
        
        status = "positive"
        if net_worth < 0:
            status = "negative"
        elif savings < 0:
            status = "warning"
        
        results.append({
            "year": year,
            "age": age,
            "netWorth": round(net_worth),
            "income": round(income),
            "expenses": round(annual_expenses + event_costs),
            "savings": round(savings),
            "events": [e.get('name', '') for e in events_this_year],
            "status": status
        })
    
    retirement_result = next((r for r in results if r['age'] == request.retirement_age), results[-1])
    total_event_costs = sum(e.get('cost', 0) for e in request.selected_events)
    all_positive = all(r['status'] != 'negative' for r in results)
    
    return {
        "user_id": user_id,
        "results": results,
        "summary": {
            "retirementNetWorth": retirement_result['netWorth'],
            "totalEventCosts": total_event_costs,
            "eventsCount": len(request.selected_events),
            "isOnTrack": all_positive,
            "yearsOfExpenses": round(retirement_result['netWorth'] / annual_expenses) if annual_expenses > 0 else 0
        },
        "aiAnalysis": [
            {
                "type": "success",
                "title": "Retirement Goal Achievable" if all_positive else "Adjustments Needed",
                "description": f"Based on your current trajectory, you're {'on track' if all_positive else 'at risk of not meeting your goals'}. Projected retirement net worth: ${retirement_result['netWorth']:,}."
            },
            {
                "type": "info",
                "title": "Life Event Impact",
                "description": f"Your planned life events will cost a total of ${total_event_costs:,}. Consider building dedicated savings for each major expense."
            },
            {
                "type": "tip",
                "title": "Optimization Opportunity",
                "description": f"Increasing your savings rate by 5% could add approximately ${round(request.current_income * 0.05 * (request.retirement_age - request.current_age) * 1.07):,} to your retirement."
            }
        ]
    }
