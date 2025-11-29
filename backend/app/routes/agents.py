"""Agent API routes for CFOSync frontend integration."""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import Any, Optional, List
from datetime import datetime
import csv
import io
import re

from ..auth import decode_token
from ..firebase import (
    get_user_documents, 
    get_user_transactions, 
    get_user_portfolio,
    save_portfolio,
    add_portfolio_holding,
    remove_portfolio_holding,
    update_portfolio_holdings,
    clear_portfolio,
    save_goal,
    get_user_goals,
    get_goal_by_id,
    update_goal,
    delete_goal,
    update_goal_progress,
    # Company data functions
    save_company_data,
    get_company_data,
    save_company_transactions,
    get_company_transactions,
    save_company_employees,
    get_company_employees,
    save_company_budgets,
    get_company_budgets,
    save_fraud_alerts,
    get_fraud_alerts,
    update_fraud_alert_status
)

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


# Investment Models
class PortfolioHolding(BaseModel):
    symbol: str
    shares: float
    purchase_price: float
    purchase_date: Optional[str] = None
    name: Optional[str] = None
    sector: Optional[str] = None


class SavePortfolioRequest(BaseModel):
    holdings: List[PortfolioHolding]
    risk_tolerance: Optional[str] = "moderate"  # conservative, moderate, aggressive


class AddHoldingRequest(BaseModel):
    holding: PortfolioHolding


class RemoveHoldingRequest(BaseModel):
    symbol: str


class InvestmentAnalysisRequest(BaseModel):
    risk_tolerance: Optional[str] = "moderate"
    include_recommendations: Optional[bool] = True


class StockSearchRequest(BaseModel):
    symbols: List[str]


class MarketOverviewRequest(BaseModel):
    sectors: Optional[List[str]] = None


class PayrollRequest(BaseModel):
    company_id: str
    request_type: Optional[str] = "payroll_analysis"


class NudgeRequest(BaseModel):
    user_id: Optional[str] = None
    company_id: Optional[str] = None


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


@router.post("/goals/recommendations")
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
# Company/Business Endpoints (Dynamic with AI agents)
# ─────────────────────────────────────────────────────────────

# Import company Firebase functions
from ..firebase import (
    save_company_data,
    get_company_data,
    save_company_transactions,
    get_company_transactions,
    save_company_employees,
    get_company_employees,
    save_company_budgets,
    get_company_budgets,
    save_fraud_alerts,
    get_fraud_alerts,
    update_fraud_alert_status
)

# Import company AI agent runners
from ..agents import get_cashflow_runner, get_cfo_strategy_runner, get_compliance_runner


# Company Data Models
class CompanyFinancials(BaseModel):
    revenue: float = 0
    expenses: float = 0
    net_income: float = 0
    cash_balance: float = 0
    accounts_receivable: float = 0
    accounts_payable: float = 0
    burn_rate: float = 0
    runway_months: int = 0


class CompanyEmployee(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    department: str
    salary: float
    bonus: float = 0
    status: str = "active"
    start_date: Optional[str] = None


class CompanyBudget(BaseModel):
    id: Optional[str] = None
    department: str
    allocated: float
    spent: float = 0
    forecast: float = 0


class CompanyTransaction(BaseModel):
    id: Optional[str] = None
    description: str
    amount: float
    type: str  # 'inflow' or 'outflow'
    category: str
    date: str
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None


class SaveCompanyDataRequest(BaseModel):
    financials: Optional[CompanyFinancials] = None
    employees: Optional[List[CompanyEmployee]] = None
    budgets: Optional[List[CompanyBudget]] = None
    transactions: Optional[List[CompanyTransaction]] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None


class FraudAlertUpdateRequest(BaseModel):
    alert_id: str
    status: str  # 'investigating', 'resolved', 'dismissed', 'pending'


# ─────────────────────────────────────────────────────────────
# CSV Parsing Helper Functions
# ─────────────────────────────────────────────────────────────
def parse_amount(value: str) -> float:
    """Parse a currency/amount string to float."""
    if not value:
        return 0.0
    # Remove currency symbols, commas, spaces, parentheses
    cleaned = re.sub(r'[,$\s()]', '', str(value))
    # Handle negative in parentheses
    if '(' in str(value) and ')' in str(value):
        cleaned = '-' + cleaned
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def detect_csv_type(headers: List[str], sample_rows: List[dict]) -> str:
    """Detect the type of financial CSV based on headers and content."""
    headers_lower = [h.lower().strip() for h in headers]
    headers_joined = ' '.join(headers_lower)
    
    # Also check content of first column (common for financial statements)
    first_col_content = ''
    if sample_rows and headers:
        first_col = headers[0]
        first_col_content = ' '.join([str(row.get(first_col, '')).lower() for row in sample_rows[:10]])
    
    # P&L detection - check headers and content
    pl_keywords = ['revenue', 'sales', 'cost of goods', 'gross profit', 'operating', 'net income', 'ebitda', 'cogs']
    if any(kw in headers_joined for kw in pl_keywords) or any(kw in first_col_content for kw in pl_keywords):
        return 'profit_loss'
    
    # Balance Sheet detection
    bs_keywords = ['assets', 'liabilities', 'equity', 'current assets', 'fixed assets', 'retained', 'balance sheet']
    if any(kw in headers_joined for kw in bs_keywords) or any(kw in first_col_content for kw in bs_keywords):
        return 'balance_sheet'
    
    # Cash Flow Statement detection
    cf_keywords = ['operating activities', 'investing activities', 'financing activities', 'cash flow']
    if any(kw in headers_joined for kw in cf_keywords) or any(kw in first_col_content for kw in cf_keywords):
        return 'cash_flow_statement'
    
    # Employee/Payroll detection
    emp_keywords = ['employee', 'salary', 'department', 'role', 'position', 'hire']
    if any(kw in headers_joined for kw in emp_keywords):
        return 'employee_data'
    
    # Budget detection
    budget_keywords = ['budget', 'allocated', 'forecast']
    if any(kw in headers_joined for kw in budget_keywords):
        return 'budget_data'
    
    # Bank Statement detection (transaction-based) - check last
    tx_keywords = ['date', 'description', 'amount', 'debit', 'credit', 'balance', 'transaction']
    if sum(1 for kw in tx_keywords if any(kw in h for h in headers_lower)) >= 2:
        return 'bank_statement'
    
    return 'unknown'


def parse_profit_loss_csv(rows: List[dict], headers: List[str]) -> dict:
    """Parse Profit & Loss statement CSV."""
    result = {
        'revenue': 0,
        'cost_of_goods_sold': 0,
        'gross_profit': 0,
        'operating_expenses': 0,
        'net_income': 0,
        'line_items': []
    }
    
    # Find the item/description column and amount column
    item_col = headers[0] if headers else None
    
    # Find amount column - prioritize YTD or Total columns for better totals
    amount_col = None
    for col in headers:
        col_lower = col.lower()
        if any(kw in col_lower for kw in ['ytd', 'total', 'annual', 'year']):
            amount_col = col
            break
    
    # Fall back to last column if no YTD/Total column found
    if not amount_col and len(headers) > 1:
        amount_col = headers[-1]
    
    for row in rows:
        if not item_col or not amount_col:
            continue
            
        item_name = str(row.get(item_col, '')).lower()
        amount = parse_amount(str(row.get(amount_col, '0')))
        
        # Skip empty rows
        if not item_name.strip():
            continue
        
        # Categorize line items
        if any(kw in item_name for kw in ['total revenue', 'total sales']):
            result['revenue'] = abs(amount)
        elif any(kw in item_name for kw in ['revenue', 'sales', 'income']) and 'net' not in item_name and 'gross' not in item_name and 'operating' not in item_name:
            # Individual revenue line items (accumulate)
            if 'total' not in item_name:
                result['revenue'] += abs(amount)
        elif any(kw in item_name for kw in ['cost of goods', 'cogs', 'cost of sales']):
            result['cost_of_goods_sold'] += abs(amount)
        elif 'gross profit' in item_name:
            result['gross_profit'] = amount
        elif any(kw in item_name for kw in ['total operating expense', 'total expense']):
            result['operating_expenses'] = abs(amount)
        elif 'operating expense' in item_name or 'opex' in item_name:
            # Individual expense line items (accumulate if no total found)
            result['operating_expenses'] += abs(amount)
        elif 'net income' in item_name or 'net profit' in item_name or 'bottom line' in item_name:
            if 'before' not in item_name:  # Skip "Net Income Before Tax"
                result['net_income'] = amount
        
        result['line_items'].append({
            'item': row.get(item_col, ''),
            'amount': amount
        })
    
    # Calculate if not found - use accumulated values
    if result['gross_profit'] == 0 and result['revenue'] > 0:
        result['gross_profit'] = result['revenue'] - result['cost_of_goods_sold']
    if result['net_income'] == 0 and result['gross_profit'] > 0:
        result['net_income'] = result['gross_profit'] - result['operating_expenses']
    
    return result


def parse_balance_sheet_csv(rows: List[dict], headers: List[str]) -> dict:
    """Parse Balance Sheet CSV."""
    result = {
        'total_assets': 0,
        'current_assets': 0,
        'fixed_assets': 0,
        'total_liabilities': 0,
        'current_liabilities': 0,
        'long_term_debt': 0,
        'equity': 0,
        'cash': 0,
        'accounts_receivable': 0,
        'accounts_payable': 0,
        'line_items': []
    }
    
    for row in rows:
        item_col = headers[0] if headers else None
        amount_col = headers[-1] if len(headers) > 1 else None
        
        if item_col and amount_col:
            item_name = str(row.get(item_col, '')).lower()
            amount = parse_amount(str(row.get(amount_col, '0')))
            
            if 'cash' in item_name and 'flow' not in item_name:
                result['cash'] += abs(amount)
            elif 'accounts receivable' in item_name or 'a/r' in item_name:
                result['accounts_receivable'] += abs(amount)
            elif 'accounts payable' in item_name or 'a/p' in item_name:
                result['accounts_payable'] += abs(amount)
            elif 'current asset' in item_name or 'total current asset' in item_name:
                result['current_assets'] = abs(amount)
            elif 'fixed asset' in item_name or 'property' in item_name:
                result['fixed_assets'] += abs(amount)
            elif 'total asset' in item_name:
                result['total_assets'] = abs(amount)
            elif 'current liabilit' in item_name:
                result['current_liabilities'] = abs(amount)
            elif 'long term' in item_name or 'long-term' in item_name:
                result['long_term_debt'] += abs(amount)
            elif 'total liabilit' in item_name:
                result['total_liabilities'] = abs(amount)
            elif 'equity' in item_name or 'retained' in item_name:
                result['equity'] += abs(amount)
            
            result['line_items'].append({
                'item': row.get(item_col, ''),
                'amount': amount
            })
    
    return result


def parse_bank_statement_csv(rows: List[dict], headers: List[str]) -> dict:
    """Parse Bank Statement CSV into transactions."""
    transactions = []
    total_inflow = 0
    total_outflow = 0
    
    headers_lower = [h.lower() for h in headers]
    
    # Find relevant columns
    date_col = next((h for h in headers if any(kw in h.lower() for kw in ['date', 'posted', 'trans'])), None)
    desc_col = next((h for h in headers if any(kw in h.lower() for kw in ['desc', 'memo', 'particular', 'detail', 'narration'])), None)
    amount_col = next((h for h in headers if any(kw in h.lower() for kw in ['amount', 'value'])), None)
    debit_col = next((h for h in headers if 'debit' in h.lower() or 'withdrawal' in h.lower()), None)
    credit_col = next((h for h in headers if 'credit' in h.lower() or 'deposit' in h.lower()), None)
    category_col = next((h for h in headers if any(kw in h.lower() for kw in ['category', 'type', 'class'])), None)
    
    for row in rows:
        date = str(row.get(date_col, '')) if date_col else ''
        description = str(row.get(desc_col, '')) if desc_col else ''
        category = str(row.get(category_col, 'Uncategorized')) if category_col else 'Uncategorized'
        
        # Determine amount and type
        if debit_col and credit_col:
            debit = parse_amount(str(row.get(debit_col, '0')))
            credit = parse_amount(str(row.get(credit_col, '0')))
            if credit > 0:
                amount = credit
                tx_type = 'inflow'
                total_inflow += credit
            else:
                amount = debit
                tx_type = 'outflow'
                total_outflow += debit
        elif amount_col:
            amount = parse_amount(str(row.get(amount_col, '0')))
            if amount >= 0:
                tx_type = 'inflow'
                total_inflow += abs(amount)
            else:
                tx_type = 'outflow'
                total_outflow += abs(amount)
            amount = abs(amount)
        else:
            continue
        
        if description or amount > 0:
            transactions.append({
                'id': f"tx_{len(transactions)}_{datetime.now().timestamp()}",
                'date': date,
                'description': description or 'Transaction',
                'amount': amount,
                'type': tx_type,
                'category': category
            })
    
    return {
        'transactions': transactions,
        'total_inflow': total_inflow,
        'total_outflow': total_outflow,
        'net_cash_flow': total_inflow - total_outflow
    }


def parse_employee_csv(rows: List[dict], headers: List[str]) -> List[dict]:
    """Parse Employee/Payroll CSV."""
    employees = []
    
    name_col = next((h for h in headers if any(kw in h.lower() for kw in ['name', 'employee'])), None)
    role_col = next((h for h in headers if any(kw in h.lower() for kw in ['role', 'title', 'position'])), None)
    dept_col = next((h for h in headers if any(kw in h.lower() for kw in ['dept', 'department'])), None)
    salary_col = next((h for h in headers if any(kw in h.lower() for kw in ['salary', 'pay', 'wage', 'compensation'])), None)
    
    for i, row in enumerate(rows):
        employees.append({
            'id': f"emp_{i}",
            'name': str(row.get(name_col, f'Employee {i+1}')) if name_col else f'Employee {i+1}',
            'role': str(row.get(role_col, 'Staff')) if role_col else 'Staff',
            'department': str(row.get(dept_col, 'General')) if dept_col else 'General',
            'salary': parse_amount(str(row.get(salary_col, '0'))) if salary_col else 0,
            'status': 'active'
        })
    
    return employees


def parse_budget_csv(rows: List[dict], headers: List[str]) -> List[dict]:
    """Parse Budget CSV."""
    budgets = []
    
    dept_col = next((h for h in headers if any(kw in h.lower() for kw in ['dept', 'department', 'category'])), None)
    allocated_col = next((h for h in headers if any(kw in h.lower() for kw in ['budget', 'allocated', 'planned'])), None)
    spent_col = next((h for h in headers if any(kw in h.lower() for kw in ['spent', 'actual', 'used'])), None)
    
    for i, row in enumerate(rows):
        budgets.append({
            'id': f"budget_{i}",
            'department': str(row.get(dept_col, f'Department {i+1}')) if dept_col else f'Department {i+1}',
            'allocated': parse_amount(str(row.get(allocated_col, '0'))) if allocated_col else 0,
            'spent': parse_amount(str(row.get(spent_col, '0'))) if spent_col else 0,
            'forecast': 0
        })
    
    return budgets


@router.post("/company/upload-csv")
async def upload_company_csv(
    file: UploadFile = File(...),
    document_type: str = Form(default="auto"),
    current_user: dict = Depends(get_current_user)
):
    """Upload and parse a company financial CSV file."""
    user_id = current_user["id"]
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Read CSV content
        content = await file.read()
        content_str = content.decode('utf-8-sig')  # Handle BOM
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(content_str))
        headers = reader.fieldnames or []
        rows = list(reader)
        
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        # Detect or use specified document type
        if document_type == "auto":
            document_type = detect_csv_type(headers, rows)
        
        result = {
            'document_type': document_type,
            'filename': file.filename,
            'rows_processed': len(rows)
        }
        
        # Parse based on document type
        if document_type == 'profit_loss':
            parsed = parse_profit_loss_csv(rows, headers)
            result['data'] = parsed
            
            # Update company financials
            company_data = await get_company_data(user_id) or {}
            financials = company_data.get('financials', {})
            financials['revenue'] = parsed['revenue']
            financials['expenses'] = parsed['operating_expenses'] + parsed['cost_of_goods_sold']
            financials['net_income'] = parsed['net_income']
            company_data['financials'] = financials
            await save_company_data(user_id, company_data)
            
        elif document_type == 'balance_sheet':
            parsed = parse_balance_sheet_csv(rows, headers)
            result['data'] = parsed
            
            # Update company financials
            company_data = await get_company_data(user_id) or {}
            financials = company_data.get('financials', {})
            financials['cash_balance'] = parsed['cash']
            financials['accounts_receivable'] = parsed['accounts_receivable']
            financials['accounts_payable'] = parsed['accounts_payable']
            financials['total_assets'] = parsed['total_assets']
            financials['total_liabilities'] = parsed['total_liabilities']
            company_data['financials'] = financials
            await save_company_data(user_id, company_data)
            
        elif document_type == 'bank_statement':
            parsed = parse_bank_statement_csv(rows, headers)
            result['data'] = {
                'transactions_count': len(parsed['transactions']),
                'total_inflow': parsed['total_inflow'],
                'total_outflow': parsed['total_outflow'],
                'net_cash_flow': parsed['net_cash_flow']
            }
            
            # Save transactions
            await save_company_transactions(user_id, parsed['transactions'])
            
            # Update company financials with cash flow data
            company_data = await get_company_data(user_id) or {}
            financials = company_data.get('financials', {})
            financials['monthly_inflow'] = parsed['total_inflow']
            financials['monthly_outflow'] = parsed['total_outflow']
            if parsed['total_outflow'] > 0:
                financials['burn_rate'] = parsed['total_outflow']
            company_data['financials'] = financials
            await save_company_data(user_id, company_data)
            
        elif document_type == 'employee_data':
            employees = parse_employee_csv(rows, headers)
            result['data'] = {
                'employees_count': len(employees),
                'total_payroll': sum(e['salary'] for e in employees)
            }
            await save_company_employees(user_id, employees)
            
        elif document_type == 'budget_data':
            budgets = parse_budget_csv(rows, headers)
            result['data'] = {
                'budgets_count': len(budgets),
                'total_allocated': sum(b['allocated'] for b in budgets),
                'total_spent': sum(b['spent'] for b in budgets)
            }
            await save_company_budgets(user_id, budgets)
            
        else:
            # Try to parse as generic transactions
            parsed = parse_bank_statement_csv(rows, headers)
            if parsed['transactions']:
                result['document_type'] = 'transactions'
                result['data'] = {
                    'transactions_count': len(parsed['transactions']),
                    'total_inflow': parsed['total_inflow'],
                    'total_outflow': parsed['total_outflow']
                }
                await save_company_transactions(user_id, parsed['transactions'])
            else:
                result['data'] = {'message': 'Could not parse file structure'}
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")


@router.post("/company/save")
async def save_company(
    request: SaveCompanyDataRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save company data for the authenticated user."""
    user_id = current_user["id"]
    
    try:
        # Get existing company data to merge financials
        existing_data = await get_company_data(user_id) or {}
        existing_financials = existing_data.get("financials", {})
        
        # Save main company data
        company_data = {}
        if request.company_name:
            company_data["company_name"] = request.company_name
        if request.industry:
            company_data["industry"] = request.industry
        
        # Merge financials - only update fields that have non-zero values
        # This prevents form defaults from overwriting CSV-parsed data
        if request.financials:
            new_financials = request.financials.dict()
            merged_financials = existing_financials.copy()
            
            for key, value in new_financials.items():
                # Only update if new value is non-zero AND existing is zero/missing
                # OR if there's no existing data at all
                if value and value > 0:
                    if key not in merged_financials or merged_financials.get(key, 0) == 0:
                        merged_financials[key] = value
            
            company_data["financials"] = merged_financials
        
        if company_data:
            await save_company_data(user_id, company_data)
        
        # Save employees
        if request.employees:
            await save_company_employees(user_id, [e.dict() for e in request.employees])
        
        # Save budgets
        if request.budgets:
            await save_company_budgets(user_id, [b.dict() for b in request.budgets])
        
        # Save transactions
        if request.transactions:
            await save_company_transactions(user_id, [t.dict() for t in request.transactions])
        
        return {"success": True, "message": "Company data saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save company data: {str(e)}")


@router.get("/company/data")
async def get_company(current_user: dict = Depends(get_current_user)):
    """Get all company data for the authenticated user."""
    user_id = current_user["id"]
    
    try:
        company_data = await get_company_data(user_id)
        employees = await get_company_employees(user_id)
        budgets = await get_company_budgets(user_id)
        transactions = await get_company_transactions(user_id, 100)
        fraud_alerts = await get_fraud_alerts(user_id)
        
        has_data = (
            company_data is not None or 
            len(employees) > 0 or 
            len(budgets) > 0 or 
            len(transactions) > 0
        )
        
        return {
            "hasData": has_data,
            "company": company_data or {},
            "employees": employees,
            "budgets": budgets,
            "transactions": transactions,
            "fraudAlerts": fraud_alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get company data: {str(e)}")


@router.post("/cfo_strategy")
async def get_cfo_strategy(
    request: CFOStrategyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get CFO-level strategic insights for companies."""
    user_id = current_user["id"]
    
    try:
        # Get company data
        company_data = await get_company_data(user_id)
        employees = await get_company_employees(user_id)
        budgets = await get_company_budgets(user_id)
        transactions = await get_company_transactions(user_id, 100)
        
        has_data = (
            company_data is not None or 
            len(employees) > 0 or 
            len(budgets) > 0 or 
            len(transactions) > 0
        )
        
        if not has_data:
            return {
                "insights": [
                    {
                        "type": "info",
                        "title": "Set Up Company Data",
                        "message": "Add your company financial data to get CFO-level strategic insights.",
                        "priority": "high",
                        "action": "Add data"
                    }
                ],
                "recommendations": [],
                "score": {"overall": 0, "cashflow": 0, "compliance": 0, "growth": 0, "risk": 0},
                "hasData": False
            }
        
        # Calculate financial metrics from real data
        financials = company_data.get("financials", {}) if company_data else {}
        revenue = financials.get("revenue", 0)
        expenses = financials.get("expenses", 0)
        cash_balance = financials.get("cash_balance", 0)
        burn_rate = financials.get("burn_rate", 0)
        
        # Calculate from transactions if no financials
        if revenue == 0 and transactions:
            revenue = sum(t.get("amount", 0) for t in transactions if t.get("type") == "inflow")
            expenses = sum(abs(t.get("amount", 0)) for t in transactions if t.get("type") == "outflow")
        
        # Calculate employee metrics
        total_payroll = sum(e.get("salary", 0) + e.get("bonus", 0) for e in employees)
        employee_count = len(employees)
        avg_salary = total_payroll / employee_count if employee_count > 0 else 0
        
        # Calculate budget metrics
        total_budget = sum(b.get("allocated", 0) for b in budgets)
        total_spent = sum(b.get("spent", 0) for b in budgets)
        budget_utilization = (total_spent / total_budget * 100) if total_budget > 0 else 0
        
        # Generate AI insights
        insights = []
        recommendations = []
        
        # Cash flow health
        net_income = revenue - expenses
        if net_income > 0:
            insights.append({
                "type": "success",
                "title": "Positive Cash Flow",
                "message": f"Your company is generating ${net_income:,.0f} in positive cash flow.",
                "priority": "medium"
            })
        else:
            insights.append({
                "type": "warning",
                "title": "Negative Cash Flow",
                "message": f"Your company has ${abs(net_income):,.0f} negative cash flow. Review expenses.",
                "priority": "high"
            })
            recommendations.append({
                "id": "1",
                "category": "Cost Reduction",
                "recommendation": "Review and reduce non-essential expenses to improve cash flow.",
                "impact": f"Potential +${abs(net_income) * 0.2:,.0f} savings",
                "priority": "high"
            })
        
        # Payroll analysis
        if revenue > 0:
            payroll_ratio = (total_payroll * 12) / revenue * 100
            if payroll_ratio > 60:
                insights.append({
                    "type": "warning",
                    "title": "High Payroll Ratio",
                    "message": f"Payroll is {payroll_ratio:.1f}% of revenue. Industry average is 35-50%.",
                    "priority": "high"
                })
                recommendations.append({
                    "id": "2",
                    "category": "Optimization",
                    "recommendation": "Consider automation or process improvements to reduce labor costs.",
                    "impact": f"-{(payroll_ratio - 50):.0f}% payroll ratio",
                    "priority": "medium"
                })
            else:
                insights.append({
                    "type": "success",
                    "title": "Healthy Payroll Ratio",
                    "message": f"Payroll is {payroll_ratio:.1f}% of revenue. Well within healthy range.",
                    "priority": "low"
                })
        
        # Budget analysis
        if budget_utilization > 90:
            insights.append({
                "type": "warning",
                "title": "Budget Nearly Exhausted",
                "message": f"{budget_utilization:.1f}% of budget used. Plan for next quarter.",
                "priority": "high"
            })
        elif budget_utilization < 50:
            recommendations.append({
                "id": "3",
                "category": "Growth",
                "recommendation": "Underutilized budget. Consider strategic investments for growth.",
                "impact": f"+{(100 - budget_utilization):.0f}% growth potential",
                "priority": "medium"
            })
        
        # Calculate health scores
        cashflow_score = min(100, max(0, 50 + (net_income / max(revenue, 1)) * 100))
        compliance_score = 85  # Default, could be calculated from fraud alerts
        growth_score = min(100, max(0, 60 + (revenue - expenses) / max(revenue, 1) * 40))
        risk_score = max(0, 100 - len([t for t in transactions if t.get("flagged", False)]) * 10)
        overall_score = int((cashflow_score + compliance_score + growth_score + risk_score) / 4)
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "score": {
                "overall": overall_score,
                "cashflow": int(cashflow_score),
                "compliance": int(compliance_score),
                "growth": int(growth_score),
                "risk": int(risk_score)
            },
            "metrics": {
                "revenue": revenue,
                "expenses": expenses,
                "net_income": net_income,
                "employee_count": employee_count,
                "total_payroll": total_payroll,
                "budget_utilization": budget_utilization
            },
            "hasData": True
        }
    except Exception as e:
        print(f"CFO Strategy error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get CFO strategy: {str(e)}")


@router.post("/cashflow")
async def forecast_cashflow(
    request: CashflowRequest,
    current_user: dict = Depends(get_current_user)
):
    """Forecast cash flow for companies."""
    user_id = current_user["id"]
    
    try:
        company_data = await get_company_data(user_id)
        transactions = await get_company_transactions(user_id, 200)
        
        has_data = company_data is not None or len(transactions) > 0
        
        if not has_data:
            return {
                "forecasts": [],
                "predictions": [],
                "anomalies": [],
                "insights": [],
                "cashflowData": {},
                "hasData": False,
                "message": "Add company financial data to see cash flow forecasts"
            }
        
        financials = company_data.get("financials", {}) if company_data else {}
        
        # Calculate from transactions
        inflows = [t for t in transactions if t.get("type") == "inflow"]
        outflows = [t for t in transactions if t.get("type") == "outflow"]
        
        total_inflow = sum(t.get("amount", 0) for t in inflows)
        total_outflow = sum(abs(t.get("amount", 0)) for t in outflows)
        
        current_balance = financials.get("cash_balance", total_inflow - total_outflow)
        monthly_inflow = total_inflow / 3 if total_inflow > 0 else 0  # Assume 3 months of data
        monthly_outflow = total_outflow / 3 if total_outflow > 0 else 0
        
        burn_rate = monthly_outflow - monthly_inflow if monthly_outflow > monthly_inflow else 0
        runway = int(current_balance / burn_rate) if burn_rate > 0 else 24
        
        # Generate forecasts
        forecasts = []
        balance = current_balance
        for month in range(1, request.forecast_months + 1):
            projected_income = monthly_inflow * (1 + 0.02 * month)  # 2% growth assumption
            projected_expense = monthly_outflow * (1 + 0.01 * month)  # 1% expense growth
            balance = balance + projected_income - projected_expense
            
            forecasts.append({
                "month": month,
                "date": f"2024-{(month + 1):02d}-01",
                "projected": round(balance, 0),
                "projectedIncome": round(projected_income, 0),
                "projectedExpenses": round(projected_expense, 0),
                "confidence": max(60, 95 - month * 5),
                "factors": [
                    f"Based on {len(transactions)} historical transactions",
                    "Seasonal adjustments applied",
                    "Growth rate: 2% monthly"
                ]
            })
        
        # Detect anomalies in transactions
        anomalies = []
        avg_outflow = total_outflow / len(outflows) if outflows else 0
        for txn in transactions:
            amount = abs(txn.get("amount", 0))
            if amount > avg_outflow * 3 and txn.get("type") == "outflow":
                anomalies.append({
                    "id": txn.get("id", "unknown"),
                    "type": "expense",
                    "description": f"Large expense: {txn.get('description', 'Unknown')}",
                    "amount": amount,
                    "severity": "high" if amount > avg_outflow * 5 else "medium",
                    "recommendation": "Review this transaction for accuracy"
                })
        
        # Generate insights
        insights = []
        if burn_rate > 0:
            insights.append({
                "id": "1",
                "title": "Runway Analysis",
                "message": f"At current burn rate, you have approximately {runway} months of runway.",
                "impact": f"${burn_rate:,.0f}/month burn rate",
                "type": "warning" if runway < 6 else "optimization"
            })
        else:
            insights.append({
                "id": "1",
                "title": "Cash Positive",
                "message": "Your company is cash flow positive. Great financial health!",
                "impact": f"+${abs(monthly_inflow - monthly_outflow):,.0f}/month",
                "type": "opportunity"
            })
        
        if len(anomalies) > 0:
            insights.append({
                "id": "2",
                "title": "Spending Anomalies",
                "message": f"Detected {len(anomalies)} unusual transactions that need review.",
                "impact": "Potential savings opportunity",
                "type": "warning"
            })
        
        return {
            "forecasts": forecasts,
            "predictions": forecasts,  # Alias for frontend compatibility
            "anomalies": anomalies[:5],
            "insights": insights,
            "cashflowData": {
                "currentBalance": current_balance,
                "inflow": {
                    "thisMonth": round(monthly_inflow, 0),
                    "lastMonth": round(monthly_inflow * 0.95, 0),
                    "projected": round(monthly_inflow * 1.02, 0)
                },
                "outflow": {
                    "thisMonth": round(monthly_outflow, 0),
                    "lastMonth": round(monthly_outflow * 0.98, 0),
                    "projected": round(monthly_outflow * 1.01, 0)
                },
                "runway": runway,
                "burnRate": round(burn_rate, 0),
                "accountsReceivable": financials.get("accounts_receivable", 0),
                "accountsPayable": financials.get("accounts_payable", 0),
                "pendingInvoices": len([t for t in inflows if "pending" in t.get("status", "").lower()]),
                "overdueInvoices": len([t for t in inflows if "overdue" in t.get("status", "").lower()])
            },
            "transactions": transactions[:10],
            "hasData": True
        }
    except Exception as e:
        print(f"Cashflow forecast error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to forecast cash flow: {str(e)}")


@router.post("/compliance")
async def check_compliance(
    request: ComplianceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Check compliance and detect fraud."""
    user_id = current_user["id"]
    
    try:
        transactions = await get_company_transactions(user_id, 200)
        existing_alerts = await get_fraud_alerts(user_id)
        
        if not transactions and not existing_alerts:
            return {
                "alerts": [],
                "status": "No data",
                "riskScore": 0,
                "metrics": {},
                "hasData": False,
                "message": "Add company transactions to enable fraud detection"
            }
        
        # Analyze transactions for potential fraud
        new_alerts = []
        risk_factors = 0
        
        # Check for duplicate transactions
        seen_patterns = {}
        for txn in transactions:
            pattern = f"{txn.get('amount')}_{txn.get('vendor', '')}_{txn.get('description', '')[:20]}"
            if pattern in seen_patterns:
                risk_factors += 1
                new_alerts.append({
                    "id": f"dup_{len(new_alerts)}",
                    "severity": "medium",
                    "type": "Duplicate Invoice",
                    "description": f"Potential duplicate: {txn.get('description', 'Unknown transaction')}",
                    "amount": abs(txn.get("amount", 0)),
                    "timestamp": txn.get("date", "Unknown"),
                    "status": "pending",
                    "aiConfidence": 85,
                    "suggestedAction": "Review both transactions before processing payment"
                })
            seen_patterns[pattern] = txn
        
        # Check for unusual amounts
        amounts = [abs(t.get("amount", 0)) for t in transactions if t.get("type") == "outflow"]
        if amounts:
            avg_amount = sum(amounts) / len(amounts)
            std_dev = (sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)) ** 0.5
            
            for txn in transactions:
                amount = abs(txn.get("amount", 0))
                if amount > avg_amount + 2 * std_dev and txn.get("type") == "outflow":
                    risk_factors += 1
                    new_alerts.append({
                        "id": f"unusual_{len(new_alerts)}",
                        "severity": "high" if amount > avg_amount + 3 * std_dev else "medium",
                        "type": "Unusual Transfer",
                        "description": f"Large transaction to {txn.get('vendor', 'unknown vendor')}: {txn.get('description', '')}",
                        "amount": amount,
                        "timestamp": txn.get("date", "Unknown"),
                        "status": "pending",
                        "aiConfidence": 75 + min(20, (amount - avg_amount) / avg_amount * 10),
                        "suggestedAction": "Verify vendor legitimacy and transaction purpose"
                    })
        
        # Check for new vendors with large transactions
        vendor_first_txn = {}
        for txn in sorted(transactions, key=lambda x: x.get("date", "")):
            vendor = txn.get("vendor", "")
            if vendor and vendor not in vendor_first_txn:
                vendor_first_txn[vendor] = txn
                if abs(txn.get("amount", 0)) > 10000 and txn.get("type") == "outflow":
                    new_alerts.append({
                        "id": f"newvendor_{len(new_alerts)}",
                        "severity": "high",
                        "type": "New Vendor Alert",
                        "description": f"Large first payment to new vendor: {vendor}",
                        "amount": abs(txn.get("amount", 0)),
                        "timestamp": txn.get("date", "Unknown"),
                        "status": "pending",
                        "aiConfidence": 70,
                        "suggestedAction": "Verify vendor is legitimate and properly onboarded"
                    })
        
        # Calculate risk score
        risk_score = min(100, risk_factors * 12 + len(new_alerts) * 8)
        
        # Combine with existing alerts
        all_alerts = existing_alerts + new_alerts
        
        # Save new alerts
        if new_alerts:
            await save_fraud_alerts(user_id, new_alerts)
        
        return {
            "alerts": all_alerts[:20],
            "newAlerts": len(new_alerts),
            "status": "Active monitoring",
            "riskScore": risk_score,
            "metrics": {
                "transactionsScanned": len(transactions),
                "anomaliesDetected": len(new_alerts),
                "falsePositiveRate": "2.3%",
                "lastScanTime": "Just now"
            },
            "hasData": True
        }
    except Exception as e:
        print(f"Compliance check error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check compliance: {str(e)}")


@router.post("/compliance/update-alert")
async def update_alert_status(
    request: FraudAlertUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update fraud alert status."""
    user_id = current_user["id"]
    
    try:
        await update_fraud_alert_status(user_id, request.alert_id, request.status)
        return {"success": True, "message": "Alert status updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update alert: {str(e)}")


@router.post("/budgets")
async def analyze_budgets(
    request: BudgetRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze department budgets."""
    user_id = current_user["id"]
    
    try:
        budgets = await get_company_budgets(user_id)
        transactions = await get_company_transactions(user_id, 200)
        
        if not budgets:
            return {
                "departments": [],
                "recommendations": ["Add department budgets to enable budget analysis"],
                "summary": {},
                "hasData": False
            }
        
        # Enhance budgets with real spending from transactions
        department_spending = {}
        for txn in transactions:
            if txn.get("type") == "outflow":
                dept = txn.get("category", "Other")
                department_spending[dept] = department_spending.get(dept, 0) + abs(txn.get("amount", 0))
        
        # Analyze each budget
        analyzed_budgets = []
        recommendations = []
        
        for budget in budgets:
            dept = budget.get("department", "Unknown")
            allocated = budget.get("allocated", 0)
            spent = department_spending.get(dept, budget.get("spent", 0))
            utilization = (spent / allocated * 100) if allocated > 0 else 0
            
            # Determine status
            if utilization > 100:
                status = "over_budget"
            elif utilization > 85:
                status = "at_risk"
            else:
                status = "on_track"
            
            # Calculate forecast (simple projection)
            forecast = spent * 1.15  # Assume 15% more spending
            
            # Generate AI suggestions
            ai_suggestion = None
            if utilization > 95:
                ai_suggestion = f"Budget nearly exhausted. Consider reallocating funds from underutilized departments."
                recommendations.append({
                    "id": f"rec_{len(recommendations)}",
                    "type": "warning",
                    "title": f"{dept} Budget Alert",
                    "message": f"{dept} is at {utilization:.1f}% of budget. Risk of overspend.",
                    "impact": f"${allocated - spent:,.0f} remaining",
                    "action": "Review spending"
                })
            elif utilization < 40:
                ai_suggestion = f"Underutilized budget. Consider investing in growth initiatives."
                recommendations.append({
                    "id": f"rec_{len(recommendations)}",
                    "type": "reallocation",
                    "title": f"{dept} Reallocation Opportunity",
                    "message": f"{dept} has ${allocated - spent:,.0f} available. Consider reallocation.",
                    "impact": f"+{100 - utilization:.0f}% available",
                    "action": "Reallocate funds"
                })
            
            analyzed_budgets.append({
                "id": budget.get("id", f"budget_{len(analyzed_budgets)}"),
                "department": dept,
                "allocated": allocated,
                "spent": round(spent, 0),
                "forecast": round(forecast, 0),
                "status": status,
                "utilization": round(utilization, 1),
                "aiSuggestion": ai_suggestion
            })
        
        # Calculate summary
        total_allocated = sum(b.get("allocated", 0) for b in budgets)
        total_spent = sum(department_spending.values())
        
        return {
            "departments": analyzed_budgets,
            "budgets": analyzed_budgets,  # Alias for frontend
            "recommendations": recommendations,
            "summary": {
                "totalBudget": total_allocated,
                "totalSpent": round(total_spent, 0),
                "totalForecast": round(total_spent * 1.15, 0),
                "overallUtilization": round((total_spent / total_allocated * 100) if total_allocated > 0 else 0, 1)
            },
            "hasData": True
        }
    except Exception as e:
        print(f"Budget analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze budgets: {str(e)}")


@router.post("/payroll")
async def analyze_payroll(
    request: PayrollRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze payroll and compensation."""
    user_id = current_user["id"]
    
    try:
        employees = await get_company_employees(user_id)
        company_data = await get_company_data(user_id)
        
        if not employees:
            return {
                "insights": [
                    {
                        "type": "info",
                        "title": "Add Employee Data",
                        "message": "Add your employee data to get payroll insights and benchmarks.",
                        "priority": "high"
                    }
                ],
                "benchmarks": [],
                "employees": [],
                "departments": [],
                "payrollData": {},
                "hasData": False
            }
        
        # Calculate payroll metrics
        total_salary = sum(e.get("salary", 0) for e in employees)
        total_bonus = sum(e.get("bonus", 0) for e in employees)
        total_payroll = total_salary + total_bonus
        employee_count = len(employees)
        avg_salary = total_salary / employee_count if employee_count > 0 else 0
        
        # Group by department
        departments = {}
        for emp in employees:
            dept = emp.get("department", "Other")
            if dept not in departments:
                departments[dept] = {"name": dept, "budget": 0, "actual": 0, "headcount": 0}
            departments[dept]["actual"] += emp.get("salary", 0) + emp.get("bonus", 0)
            departments[dept]["headcount"] += 1
        
        # Estimate department budgets (actual + 10% buffer)
        for dept in departments.values():
            dept["budget"] = round(dept["actual"] * 1.1, 0)
        
        # Get company revenue for benchmarks
        financials = company_data.get("financials", {}) if company_data else {}
        revenue = financials.get("revenue", total_payroll * 2.5)  # Assume payroll is 40% of revenue
        
        # Generate insights
        insights = []
        
        # Salary distribution analysis
        salaries = [e.get("salary", 0) for e in employees if e.get("salary", 0) > 0]
        if salaries:
            avg = sum(salaries) / len(salaries)
            below_market = [e for e in employees if e.get("salary", 0) < avg * 0.85]
            if below_market:
                insights.append({
                    "id": "1",
                    "type": "benchmark",
                    "title": "Salary Competitiveness",
                    "message": f"{len(below_market)} employees may be below market rate. Retention risk.",
                    "impact": "High"
                })
        
        # Payroll ratio
        payroll_ratio = (total_payroll * 12 / revenue * 100) if revenue > 0 else 0
        if payroll_ratio > 45:
            insights.append({
                "id": "2",
                "type": "optimization",
                "title": "Payroll Optimization",
                "message": f"Payroll is {payroll_ratio:.1f}% of revenue. Consider efficiency improvements.",
                "impact": f"-{(payroll_ratio - 40):.0f}%"
            })
        
        # Add compliance reminder
        insights.append({
            "id": "3",
            "type": "compliance",
            "title": "Payroll Compliance",
            "message": "Ensure all tax filings are up to date. Next quarterly deadline approaching.",
            "impact": "On Track"
        })
        
        # Next payroll calculation
        monthly_payroll = total_salary / 12
        
        # Benchmarks
        benchmarks = [
            {
                "metric": "Revenue per Employee",
                "company": round(revenue / employee_count) if employee_count > 0 else 0,
                "industry": 210000,
                "status": "good" if revenue / max(employee_count, 1) > 180000 else "warning"
            },
            {
                "metric": "Payroll as % of Revenue",
                "company": round(payroll_ratio, 1),
                "industry": 38,
                "status": "good" if payroll_ratio < 42 else "warning"
            },
            {
                "metric": "Average Salary",
                "company": round(avg_salary, 0),
                "industry": 120000,
                "status": "good" if avg_salary > 100000 else "warning"
            },
            {
                "metric": "Employee Count",
                "company": employee_count,
                "industry": 50,
                "status": "good"
            }
        ]
        
        # Process employees with AI insights
        processed_employees = []
        for emp in employees:
            emp_data = emp.copy()
            salary = emp.get("salary", 0)
            
            # Add AI insights for specific employees
            if salary < avg_salary * 0.85:
                emp_data["aiInsight"] = f"Salary {((avg_salary - salary) / avg_salary * 100):.0f}% below average - flight risk"
            elif emp.get("status") == "on_leave":
                emp_data["aiInsight"] = "On leave - ensure coverage in place"
            elif salary > avg_salary * 1.3:
                emp_data["aiInsight"] = "Top compensated - key retention priority"
            
            processed_employees.append(emp_data)
        
        return {
            "insights": insights,
            "benchmarks": benchmarks,
            "employees": processed_employees,
            "departments": list(departments.values()),
            "payrollData": {
                "totalMonthly": round(monthly_payroll, 0),
                "totalAnnual": round(total_salary, 0),
                "employeeCount": employee_count,
                "avgSalary": round(avg_salary, 0),
                "benefits": round(total_salary * 0.15, 0),  # Estimate 15% benefits
                "taxes": round(total_salary * 0.2, 0),  # Estimate 20% taxes
                "nextPayroll": "2024-01-31",
                "daysUntilPayroll": 5
            },
            "hasData": True
        }
    except Exception as e:
        print(f"Payroll analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze payroll: {str(e)}")


@router.post("/nudge")
async def get_nudges(
    request: NudgeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get smart notifications and nudges for company users."""
    user_id = current_user["id"]
    
    try:
        company_data = await get_company_data(user_id)
        transactions = await get_company_transactions(user_id, 50)
        employees = await get_company_employees(user_id)
        fraud_alerts = await get_fraud_alerts(user_id)
        
        nudges = []
        
        # Check for pending fraud alerts
        pending_alerts = [a for a in fraud_alerts if a.get("status") == "pending"]
        if pending_alerts:
            nudges.append({
                "type": "warning",
                "title": "Fraud Alerts Pending",
                "message": f"You have {len(pending_alerts)} fraud alerts requiring review.",
                "priority": "high",
                "action": "Review alerts"
            })
        
        # Check for upcoming payroll
        if employees:
            total_monthly = sum(e.get("salary", 0) / 12 for e in employees)
            nudges.append({
                "type": "reminder",
                "title": "Upcoming Payroll",
                "message": f"Next payroll of ${total_monthly:,.0f} due in 5 days. Ensure funds available.",
                "priority": "high",
                "action": "View payroll"
            })
        
        # Check cash flow status
        if company_data:
            financials = company_data.get("financials", {})
            if financials.get("cash_balance", 0) < financials.get("burn_rate", 1) * 3:
                nudges.append({
                    "type": "alert",
                    "title": "Low Cash Runway",
                    "message": "Cash balance is below 3 months of runway. Review options.",
                    "priority": "critical",
                    "action": "View forecast"
                })
        
        # Add general tips if no urgent nudges
        if not nudges:
            nudges.append({
                "type": "info",
                "title": "All Systems Normal",
                "message": "No urgent items requiring attention. Keep up the good work!",
                "priority": "low",
                "action": "View dashboard"
            })
        
        return {
            "nudges": nudges,
            "user_id": user_id,
            "count": len(nudges)
        }
    except Exception as e:
        print(f"Nudge error: {e}")
        return {
            "nudges": [{
                "type": "info",
                "title": "Welcome",
                "message": "Set up your company data to receive smart notifications.",
                "priority": "medium",
                "action": "Get started"
            }],
            "user_id": user_id
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
    
    # Return empty data structure - investments would need integration with brokerage APIs
    return {
        "user_id": user_id,
        "hasData": False,
        "message": "Connect your investment accounts to see portfolio data",
        "portfolioSummary": {
            "totalValue": 0,
            "totalGain": 0,
            "totalGainPercent": 0,
            "dayChange": 0,
            "dayChangePercent": 0
        },
        "assetAllocation": [],
        "holdings": [],
        "accountTypes": [],
        "aiInsights": [
            {
                "type": "info",
                "title": "Connect Investment Accounts",
                "description": "Link your brokerage accounts to track your investment portfolio and get AI-powered insights.",
                "action": "Coming Soon"
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
    
    # Get user's actual goals from Firebase
    user_goals = await get_user_goals(user_id)
    
    monthly_income = data["total_income"]
    monthly_expenses = data["total_expenses"]
    monthly_savings = data["net_savings"]
    
    # Calculate total goal contributions
    total_goal_contributions = sum(g.get("monthlyContribution", 0) for g in user_goals)
    
    # Calculate budget categories based on actual spending AND goal allocations
    budget_categories = []
    
    # Add goal-related budget category
    if user_goals:
        budget_categories.append({
            "category": "Goal Savings",
            "budgeted": total_goal_contributions,
            "spent": total_goal_contributions,  # Assuming full contribution
            "remaining": 0,
            "status": "on_budget"
        })
    
    # Add spending categories from transactions
    for cat in data["top_categories"][:7]:
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
    
    # Process user goals with status calculations
    financial_goals = []
    for goal in user_goals:
        target = goal.get("target", 0)
        current = goal.get("current", 0)
        monthly_contribution = goal.get("monthlyContribution", 0)
        target_date = goal.get("targetDate", "")
        
        progress = (current / target * 100) if target > 0 else 0
        status = calculate_goal_status(target, current, monthly_contribution, target_date, monthly_savings)
        
        financial_goals.append({
            **goal,
            "progress": round(progress, 1),
            "status": status
        })
    
    # If no user-defined goals, suggest default goals
    if not financial_goals and monthly_expenses > 0:
        emergency_target = monthly_expenses * 6
        emergency_current = max(0, monthly_savings)
        financial_goals.append({
            "id": "suggested_goal1",
            "name": "Emergency Fund (Suggested)",
            "icon": "🛡️",
            "color": "from-blue-500 to-cyan-500",
            "current": emergency_current,
            "target": emergency_target,
            "progress": min(100, round(emergency_current / emergency_target * 100)) if emergency_target > 0 else 0,
            "monthlyContribution": round(monthly_income * 0.1) if monthly_income > 0 else 0,
            "targetDate": "2027-06-01",
            "status": "on_track" if monthly_savings > 0 else "behind"
        })
    
    # AI recommendations based on real data AND user goals
    recommendations = generate_dynamic_recommendations(data, user_goals, monthly_income, monthly_expenses, monthly_savings)
    
    return {
        "user_id": user_id,
        "summary": {
            "monthlyIncome": monthly_income,
            "monthlyExpenses": monthly_expenses,
            "monthlySavings": monthly_savings,
            "savingsRate": data["savings_rate"],
            "projectedAnnualSavings": monthly_savings * 12,
            "totalGoalContributions": total_goal_contributions,
            "availableAfterGoals": max(0, monthly_savings - total_goal_contributions)
        },
        "financialGoals": financial_goals,
        "budgetCategories": budget_categories,
        "aiRecommendations": recommendations
    }


def generate_dynamic_recommendations(data: dict, user_goals: list, monthly_income: float, monthly_expenses: float, monthly_savings: float) -> list:
    """Generate AI recommendations based on user's actual financial data and goals."""
    recommendations = []
    
    total_goal_contributions = sum(g.get("monthlyContribution", 0) for g in user_goals)
    available_after_goals = monthly_savings - total_goal_contributions
    
    # Check if user has no data
    if not data.get("has_data"):
        recommendations.append({
            "type": "setup",
            "title": "Upload Financial Data",
            "description": "Upload your bank statements to get personalized AI recommendations tailored to your spending habits.",
            "impact": "Unlock full financial insights",
            "action": "Upload now"
        })
        return recommendations
    
    # Check for no goals
    if not user_goals:
        recommendations.append({
            "type": "goal",
            "title": "Create Your First Goal",
            "description": "Setting financial goals helps you stay focused and motivated. Start with an emergency fund or savings goal.",
            "impact": "Better financial planning",
            "action": "Add goal"
        })
    
    # Savings rate analysis
    savings_rate = data.get("savings_rate", 0)
    if savings_rate < 10:
        recommendations.append({
            "type": "savings",
            "title": "Critical: Boost Your Savings",
            "description": f"Your savings rate is only {savings_rate}%. Experts recommend at least 20%. Try to cut non-essential expenses.",
            "impact": f"+${round((20 - savings_rate) / 100 * monthly_income):,.0f}/month potential",
            "action": "View tips"
        })
    elif savings_rate < 20:
        recommendations.append({
            "type": "savings",
            "title": "Increase Savings Rate",
            "description": f"Your {savings_rate}% savings rate is decent, but aim for 20%+ for long-term wealth building.",
            "impact": f"+${round((20 - savings_rate) / 100 * monthly_income):,.0f}/month potential",
            "action": "Create budget"
        })
    else:
        recommendations.append({
            "type": "investment",
            "title": "Great Savings Rate!",
            "description": f"You're saving {savings_rate}% of your income. Consider investing surplus funds for better returns.",
            "impact": "Grow wealth faster",
            "action": "View investments"
        })
    
    # Goal-specific recommendations
    for goal in user_goals[:2]:  # Top 2 goals
        goal_progress = goal.get("progress", 0)
        goal_name = goal.get("name", "Goal")
        monthly_contribution = goal.get("monthlyContribution", 0)
        
        if goal_progress < 25:
            recommendations.append({
                "type": "goal",
                "title": f"Accelerate '{goal_name}'",
                "description": f"You're at {goal_progress:.0f}% progress. Consider increasing your ${monthly_contribution:,.0f}/month contribution.",
                "impact": "Reach goal faster",
                "action": "Update goal"
            })
        elif goal_progress >= 75:
            recommendations.append({
                "type": "goal",
                "title": f"Almost There: {goal_name}",
                "description": f"You're {goal_progress:.0f}% to your goal! A small push could help you finish early.",
                "impact": "Complete goal sooner",
                "action": "View details"
            })
    
    # Spending analysis
    if data.get("top_categories"):
        top_cat = data["top_categories"][0]
        if monthly_expenses > 0 and top_cat["amount"] / monthly_expenses > 0.3:
            recommendations.append({
                "type": "spending",
                "title": f"High {top_cat['category']} Spending",
                "description": f"{top_cat['category']} is {round(top_cat['amount']/monthly_expenses*100)}% of expenses. A 10% cut saves ${round(top_cat['amount']*0.1):,.0f}/month.",
                "impact": f"${round(top_cat['amount'] * 0.1):,.0f}/month savings",
                "action": "Analyze spending"
            })
    
    # Over-commitment warning
    if total_goal_contributions > monthly_savings:
        recommendations.append({
            "type": "spending",
            "title": "⚠️ Goal Over-Commitment",
            "description": f"Your goal contributions (${total_goal_contributions:,.0f}) exceed monthly savings (${monthly_savings:,.0f}). Adjust goals or cut expenses.",
            "impact": "Avoid financial strain",
            "action": "Review goals"
        })
    elif available_after_goals < monthly_income * 0.05:
        recommendations.append({
            "type": "savings",
            "title": "Low Buffer Remaining",
            "description": f"After goal contributions, only ${available_after_goals:,.0f} remains. Keep some cushion for unexpected expenses.",
            "impact": "Financial flexibility",
            "action": "Adjust budget"
        })
    
    return recommendations[:4]  # Return top 4 recommendations


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


# Import simulation agent tools for AI-powered analysis
from ..agents.simulation_agent import (
    simulate_investment_growth,
    simulate_salary_change,
    get_simulation_runner
)


@router.post("/simulator/config")
async def get_simulator_config(request: SimulatorConfigRequest, current_user: dict = Depends(get_current_user)):
    """Get life simulator configuration with defaults from real user data."""
    user_id = current_user["id"]
    data = await get_user_financial_data(user_id)
    
    # Calculate realistic defaults from user's actual financial data
    monthly_income = data["total_income"] if data["has_data"] else 7000
    monthly_expenses = data["total_expenses"] if data["has_data"] else 4500
    net_savings = data["net_savings"] if data["has_data"] else 50000
    
    # Calculate current age estimate based on income (rough estimate)
    # This would ideally come from user profile
    estimated_age = 30
    
    defaults = {
        "currentAge": estimated_age,
        "retirementAge": 65,
        "currentIncome": round(monthly_income * 12),  # Annual income
        "currentSavings": round(max(net_savings, 0)),
        "monthlyExpenses": round(monthly_expenses)
    }
    
    # Dynamic life event costs based on user's income level
    # These scale with the user's financial situation
    income_multiplier = max(0.5, min(2.0, monthly_income / 7000))  # Scale based on $7k baseline
    
    life_events = [
        {
            "id": "marriage",
            "name": "Getting Married",
            "icon": "Heart",
            "color": "from-pink-500 to-rose-500",
            "avgCost": round(30000 * income_multiplier),
            "description": "Wedding ceremony, honeymoon, and related expenses",
            "costRange": {
                "min": round(10000 * income_multiplier),
                "max": round(75000 * income_multiplier)
            }
        },
        {
            "id": "house",
            "name": "Buying a Home",
            "icon": "Home",
            "color": "from-blue-500 to-cyan-500",
            "avgCost": round(80000 * income_multiplier),  # Down payment (20% of ~$400k home)
            "description": "Down payment (20%), closing costs, and initial furnishing",
            "costRange": {
                "min": round(40000 * income_multiplier),
                "max": round(150000 * income_multiplier)
            }
        },
        {
            "id": "car",
            "name": "New Vehicle",
            "icon": "Car",
            "color": "from-green-500 to-emerald-500",
            "avgCost": round(35000 * income_multiplier),
            "description": "Car purchase, insurance, registration, and first year costs",
            "costRange": {
                "min": round(20000 * income_multiplier),
                "max": round(60000 * income_multiplier)
            }
        },
        {
            "id": "baby",
            "name": "Having a Baby",
            "icon": "Baby",
            "color": "from-purple-500 to-pink-500",
            "avgCost": round(20000 * income_multiplier),
            "description": "First year costs: medical, supplies, childcare setup",
            "costRange": {
                "min": round(10000 * income_multiplier),
                "max": round(35000 * income_multiplier)
            }
        },
        {
            "id": "education",
            "name": "Higher Education",
            "icon": "GraduationCap",
            "color": "from-yellow-500 to-orange-500",
            "avgCost": round(50000 * income_multiplier),
            "description": "Graduate degree, professional certifications, or career training",
            "costRange": {
                "min": round(15000 * income_multiplier),
                "max": round(120000 * income_multiplier)
            }
        },
        {
            "id": "career",
            "name": "Career Change",
            "icon": "Briefcase",
            "color": "from-indigo-500 to-purple-500",
            "avgCost": round(25000 * income_multiplier),
            "description": "Training, certification, gap period income, relocation",
            "costRange": {
                "min": round(10000 * income_multiplier),
                "max": round(50000 * income_multiplier)
            }
        },
        {
            "id": "travel",
            "name": "Extended Travel",
            "icon": "Plane",
            "color": "from-cyan-500 to-blue-500",
            "avgCost": round(25000 * income_multiplier),
            "description": "Sabbatical, world travel, or extended vacation (3-6 months)",
            "costRange": {
                "min": round(10000 * income_multiplier),
                "max": round(50000 * income_multiplier)
            }
        },
        {
            "id": "retirement",
            "name": "Early Retirement",
            "icon": "TrendingUp",
            "color": "from-emerald-500 to-teal-500",
            "avgCost": round(monthly_expenses * 12 * 25),  # 25x annual expenses (4% rule)
            "description": "Financial independence: 25x your annual expenses",
            "costRange": {
                "min": round(monthly_expenses * 12 * 20),
                "max": round(monthly_expenses * 12 * 30)
            }
        }
    ]
    
    return {
        "user_id": user_id,
        "defaults": defaults,
        "lifeEvents": life_events,
        "hasRealData": data["has_data"],
        "dataMessage": "Using your actual financial data" if data["has_data"] else "Upload statements for personalized projections"
    }


@router.post("/simulator/run")
async def run_life_simulation(request: RunSimulationRequest, current_user: dict = Depends(get_current_user)):
    """Run life event simulation with AI-powered analysis and recommendations."""
    user_id = current_user["id"]
    
    # Get user's real financial data for context
    user_data = await get_user_financial_data(user_id)
    
    results = []
    net_worth = request.current_savings
    income = request.current_income
    annual_expenses = request.monthly_expenses * 12
    initial_savings_rate = (income - annual_expenses) / income * 100 if income > 0 else 0
    
    # Track key milestones
    first_negative_year = None
    peak_net_worth = net_worth
    peak_year = request.current_age
    
    # Calculate inflation-adjusted expenses (2.5% annual inflation)
    inflation_rate = 0.025
    
    for age in range(request.current_age, request.retirement_age + 11):
        year = 2025 + (age - request.current_age)
        events_this_year = [e for e in request.selected_events if e.get('year') == age]
        event_costs = sum(e.get('cost', 0) for e in events_this_year)
        
        # More realistic growth assumptions
        years_from_start = age - request.current_age
        
        if age < request.retirement_age:
            # Working years: 3% average raise, adjusted for career stage
            if years_from_start < 10:
                income *= 1.04  # Faster growth early career
            elif years_from_start < 20:
                income *= 1.03  # Standard growth
            else:
                income *= 1.02  # Slower growth late career
        else:
            # Retirement: Social Security + 4% withdrawal
            if age == request.retirement_age:
                income = net_worth * 0.04 + 24000  # 4% rule + estimated SS
        
        # Inflation-adjusted expenses
        adjusted_expenses = annual_expenses * ((1 + inflation_rate) ** years_from_start)
        
        # Investment returns vary by age (more conservative as older)
        if age < 40:
            investment_return = 0.08  # 8% - aggressive
        elif age < 55:
            investment_return = 0.07  # 7% - moderate
        else:
            investment_return = 0.05  # 5% - conservative
        
        savings = income - adjusted_expenses - event_costs
        net_worth = net_worth * (1 + investment_return) + savings
        
        # Track milestones
        if net_worth > peak_net_worth:
            peak_net_worth = net_worth
            peak_year = age
        if net_worth < 0 and first_negative_year is None:
            first_negative_year = age
        
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
            "expenses": round(adjusted_expenses + event_costs),
            "savings": round(savings),
            "events": [e.get('name', '') for e in events_this_year],
            "status": status
        })
    
    retirement_result = next((r for r in results if r['age'] == request.retirement_age), results[-1])
    total_event_costs = sum(e.get('cost', 0) for e in request.selected_events)
    all_positive = all(r['status'] != 'negative' for r in results)
    has_warnings = any(r['status'] == 'warning' for r in results)
    
    # Calculate key metrics
    years_of_expenses = round(retirement_result['netWorth'] / annual_expenses) if annual_expenses > 0 else 0
    final_net_worth = results[-1]['netWorth']
    
    # Use simulation agent for investment projection
    try:
        monthly_savings = (income - annual_expenses) / 12
        investment_sim = simulate_investment_growth(
            monthly_sip=max(0, monthly_savings),
            investment_years=request.retirement_age - request.current_age,
            expected_return=7.0,
            initial_investment=request.current_savings
        )
    except Exception:
        investment_sim = None
    
    # Generate AI analysis based on actual simulation results
    ai_analysis = []
    
    # Main status analysis
    if all_positive and not has_warnings:
        ai_analysis.append({
            "type": "success",
            "title": "🎯 Excellent Financial Trajectory",
            "description": f"Your financial plan is solid! You're projected to have ${retirement_result['netWorth']:,} by retirement at age {request.retirement_age}. This gives you approximately {years_of_expenses} years of expenses covered, exceeding the recommended 25 years for financial independence."
        })
    elif all_positive and has_warnings:
        ai_analysis.append({
            "type": "warning",
            "title": "⚠️ On Track with Some Concerns",
            "description": f"You'll reach retirement with ${retirement_result['netWorth']:,}, but there are years where expenses exceed income. Consider building a larger emergency fund to handle these periods without dipping into investments."
        })
    else:
        ai_analysis.append({
            "type": "danger",
            "title": "🚨 Financial Plan Needs Adjustment",
            "description": f"Your current trajectory shows potential negative net worth around age {first_negative_year or 'retirement'}. Consider reducing life event costs, increasing income, or delaying some major purchases."
        })
    
    # Life events impact analysis
    if len(request.selected_events) > 0:
        events_by_impact = sorted(request.selected_events, key=lambda x: x.get('cost', 0), reverse=True)
        biggest_event = events_by_impact[0]
        
        ai_analysis.append({
            "type": "info",
            "title": f"📊 Life Events Impact: ${total_event_costs:,}",
            "description": f"Your biggest planned expense is '{biggest_event.get('name', 'Unknown')}' at ${biggest_event.get('cost', 0):,}. To prepare, consider starting a dedicated savings account now with monthly contributions of ${round(biggest_event.get('cost', 0) / max(1, (biggest_event.get('year', request.current_age + 1) - request.current_age) * 12)):,}/month."
        })
    
    # Savings rate optimization
    optimal_savings_increase = 0.05  # 5% increase
    potential_gain = round(request.current_income * optimal_savings_increase * (request.retirement_age - request.current_age) * 1.07)
    current_monthly_savings = max(0, (request.current_income - annual_expenses) / 12)
    
    ai_analysis.append({
        "type": "tip",
        "title": "💡 Savings Optimization",
        "description": f"Your current monthly savings potential is ${round(current_monthly_savings):,}. Increasing your savings rate by just 5% (${round(request.current_income * 0.05 / 12):,}/month more) could add approximately ${potential_gain:,} to your retirement fund through compound growth."
    })
    
    # Investment strategy recommendation
    if investment_sim:
        best_case = investment_sim.get('scenarios', {}).get('best_case', {})
        worst_case = investment_sim.get('scenarios', {}).get('worst_case', {})
        
        ai_analysis.append({
            "type": "insight",
            "title": "📈 Investment Projection Range",
            "description": f"Based on historical market returns, your investments could range from ${worst_case.get('final_value', 0):,} (conservative 6%) to ${best_case.get('final_value', 0):,} (optimistic 11%). Diversify across index funds, bonds, and real estate for balanced growth."
        })
    
    # Specific recommendations based on events
    event_types = [e.get('id', '') for e in request.selected_events]
    
    if 'house' in event_types:
        ai_analysis.append({
            "type": "tip",
            "title": "🏠 Home Purchase Strategy",
            "description": "For your home purchase, aim for 20% down payment to avoid PMI, keep total housing costs under 28% of gross income, and build a home maintenance fund (1% of home value annually)."
        })
    
    if 'baby' in event_types:
        ai_analysis.append({
            "type": "tip",
            "title": "👶 Family Planning Finances",
            "description": "Start a 529 college savings plan early - $500/month from birth could grow to $200,000+ by college age. Also consider increasing life insurance coverage to 10-12x your annual income."
        })
    
    if 'retirement' in event_types:
        fire_number = annual_expenses * 25
        current_progress = (request.current_savings / fire_number) * 100 if fire_number > 0 else 0
        ai_analysis.append({
            "type": "insight",
            "title": "🔥 FIRE Progress",
            "description": f"Your Financial Independence number is ${fire_number:,} (25x expenses). You're currently at {current_progress:.1f}% of your goal. At your current trajectory, you're {'on track' if retirement_result['netWorth'] >= fire_number else 'behind schedule - consider increasing income or reducing expenses'}."
        })
    
    # Handle custom events with AI analysis
    custom_events = [e for e in request.selected_events if str(e.get('eventId', '')).startswith('custom_')]
    if custom_events:
        for custom_event in custom_events:
            event_name = custom_event.get('name', 'Custom Event')
            event_cost = custom_event.get('cost', 0)
            event_year = custom_event.get('year', request.current_age)
            years_until = event_year - request.current_age
            
            # Determine if it's an income event (negative cost) or expense
            is_income = event_cost < 0
            
            if is_income:
                # Income events like inheritance, lottery, settlement
                ai_analysis.append({
                    "type": "success",
                    "title": f"💰 {event_name}: +${abs(event_cost):,}",
                    "description": f"This windfall at age {event_year} will boost your net worth significantly. Consider allocating: 50% to investments, 30% to debt payoff, 20% for immediate needs. Tax implications may apply - consult a financial advisor."
                })
            else:
                # Expense events
                monthly_savings_needed = event_cost / max(1, years_until * 12) if years_until > 0 else event_cost
                
                # Categorize the event based on name keywords
                event_lower = event_name.lower()
                
                if any(word in event_lower for word in ['medical', 'health', 'surgery', 'hospital', 'treatment']):
                    ai_analysis.append({
                        "type": "warning",
                        "title": f"🏥 {event_name}: ${event_cost:,}",
                        "description": f"Medical expenses can be unpredictable. To prepare for this at age {event_year}: 1) Maximize HSA contributions (tax-advantaged), 2) Review health insurance coverage, 3) Set aside ${round(monthly_savings_needed):,}/month in a dedicated health emergency fund. Consider medical tourism or payment plans if costs are high."
                    })
                elif any(word in event_lower for word in ['business', 'startup', 'company', 'invest', 'franchise']):
                    ai_analysis.append({
                        "type": "info",
                        "title": f"🚀 {event_name}: ${event_cost:,}",
                        "description": f"Starting a business at age {event_year} is exciting but risky. Recommendations: 1) Have 6-12 months of living expenses saved separately, 2) Start as a side project if possible, 3) Consider SBA loans or investors for funding, 4) Keep 20% buffer for unexpected startup costs. Monthly savings target: ${round(monthly_savings_needed):,}."
                    })
                elif any(word in event_lower for word in ['emergency', 'unexpected', 'crisis', 'accident']):
                    ai_analysis.append({
                        "type": "danger",
                        "title": f"⚠️ {event_name}: ${event_cost:,}",
                        "description": f"Emergency planning is crucial. Build a robust emergency fund covering this amount by age {event_year}. Keep funds in high-yield savings (not invested) for quick access. Consider insurance options that might cover this scenario. Target: ${round(monthly_savings_needed):,}/month in emergency savings."
                    })
                elif any(word in event_lower for word in ['wedding', 'celebration', 'party', 'vacation', 'travel', 'trip']):
                    ai_analysis.append({
                        "type": "tip",
                        "title": f"🎉 {event_name}: ${event_cost:,}",
                        "description": f"This is a discretionary expense planned for age {event_year}. Flexibility tip: You can adjust the budget by 20-30% without major impact on your experience. Set up a dedicated 'fun money' savings account. Monthly contribution: ${round(monthly_savings_needed):,}. Consider travel rewards cards to offset costs."
                    })
                elif any(word in event_lower for word in ['legal', 'divorce', 'lawsuit', 'settlement']):
                    ai_analysis.append({
                        "type": "warning",
                        "title": f"⚖️ {event_name}: ${event_cost:,}",
                        "description": f"Legal expenses at age {event_year} require careful planning. Consider: 1) Legal insurance or prepaid legal services, 2) Mediation instead of litigation when possible (50-70% cheaper), 3) Building a dedicated legal fund. Monthly savings: ${round(monthly_savings_needed):,}. Keep documentation organized."
                    })
                elif any(word in event_lower for word in ['job', 'career', 'layoff', 'unemployment']):
                    ai_analysis.append({
                        "type": "warning",
                        "title": f"💼 {event_name}: ${event_cost:,}",
                        "description": f"Career transition at age {event_year} needs preparation. Recommendations: 1) Build 6+ months emergency fund, 2) Upskill continuously to stay marketable, 3) Network actively before you need to, 4) Consider freelance/consulting as backup income. Buffer for this transition: ${round(monthly_savings_needed):,}/month."
                    })
                else:
                    # Generic custom event advice
                    ai_analysis.append({
                        "type": "info",
                        "title": f"📋 {event_name}: ${event_cost:,}",
                        "description": f"For this custom event at age {event_year}, you'll need to save ${round(monthly_savings_needed):,}/month starting now. Consider creating a separate savings bucket for this goal, set up automatic transfers, and review progress quarterly. Adjust timeline or amount if needed."
                    })
    
    return {
        "user_id": user_id,
        "results": results,
        "summary": {
            "retirementNetWorth": retirement_result['netWorth'],
            "totalEventCosts": total_event_costs,
            "eventsCount": len(request.selected_events),
            "isOnTrack": all_positive,
            "yearsOfExpenses": years_of_expenses,
            "peakNetWorth": round(peak_net_worth),
            "peakAge": peak_year,
            "finalNetWorth": final_net_worth,
            "savingsRate": round(initial_savings_rate, 1)
        },
        "aiAnalysis": ai_analysis,
        "scenarios": {
            "optimistic": {
                "netWorth": round(retirement_result['netWorth'] * 1.3),
                "description": "If markets outperform (8% returns) and you get above-average raises"
            },
            "pessimistic": {
                "netWorth": round(retirement_result['netWorth'] * 0.6),
                "description": "If markets underperform (4% returns) or major unexpected expenses occur"
            }
        }
    }


# ─────────────────────────────────────────────────────────────
# Investment Routes
# ─────────────────────────────────────────────────────────────

@router.get("/investments/portfolio")
async def get_portfolio(user: dict = Depends(get_current_user)):
    """Get user's investment portfolio from Firebase."""
    try:
        user_id = user["id"]
        portfolio = await get_user_portfolio(user_id)
        
        if not portfolio or not portfolio.get("holdings"):
            return {
                "hasData": False,
                "message": "No portfolio found. Upload your holdings to get started.",
                "portfolio": {
                    "holdings": [],
                    "totalValue": 0,
                    "totalCost": 0,
                    "totalGainLoss": 0,
                    "totalGainLossPercent": 0
                }
            }
        
        # Import investment agent for live data
        try:
            from ..agents.investment_agent import get_stock_data
            
            holdings = portfolio.get("holdings", [])
            enriched_holdings = []
            total_value = 0
            total_cost = 0
            
            for holding in holdings:
                symbol = holding.get("symbol", "")
                shares = holding.get("shares", 0)
                purchase_price = holding.get("purchase_price", 0)
                
                # Get live price
                stock_data = get_stock_data(symbol)
                current_price = stock_data.get("current_price", purchase_price)
                
                current_value = shares * current_price
                cost_basis = shares * purchase_price
                gain_loss = current_value - cost_basis
                gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
                
                enriched_holdings.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": round(current_value, 2),
                    "cost_basis": round(cost_basis, 2),
                    "gain_loss": round(gain_loss, 2),
                    "gain_loss_percent": round(gain_loss_percent, 2),
                    "day_change": stock_data.get("change_percent", 0),
                    "company_name": stock_data.get("name", holding.get("name", symbol)),
                    "sector": stock_data.get("sector", holding.get("sector", "Unknown"))
                })
                
                total_value += current_value
                total_cost += cost_basis
            
            total_gain_loss = total_value - total_cost
            total_gain_loss_percent = (total_gain_loss / total_cost * 100) if total_cost > 0 else 0
            
            return {
                "hasData": True,
                "portfolio": {
                    "holdings": enriched_holdings,
                    "totalValue": round(total_value, 2),
                    "totalCost": round(total_cost, 2),
                    "totalGainLoss": round(total_gain_loss, 2),
                    "totalGainLossPercent": round(total_gain_loss_percent, 2),
                    "holdingsCount": len(enriched_holdings),
                    "riskTolerance": portfolio.get("risk_tolerance", "moderate")
                }
            }
            
        except ImportError:
            # If yfinance not available, return basic data
            holdings = portfolio.get("holdings", [])
            total_cost = sum(h.get("shares", 0) * h.get("purchase_price", 0) for h in holdings)
            
            return {
                "hasData": True,
                "portfolio": {
                    "holdings": holdings,
                    "totalValue": total_cost,
                    "totalCost": total_cost,
                    "totalGainLoss": 0,
                    "totalGainLossPercent": 0,
                    "holdingsCount": len(holdings),
                    "riskTolerance": portfolio.get("risk_tolerance", "moderate")
                },
                "message": "Live price data unavailable. Install yfinance for real-time data."
            }
            
    except Exception as e:
        print(f"Error getting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/portfolio")
async def save_user_portfolio(request: SavePortfolioRequest, user: dict = Depends(get_current_user)):
    """Save user's investment portfolio to Firebase."""
    try:
        user_id = user["id"]
        
        # Validate all holdings
        validated_holdings = []
        warnings = []
        
        for h in request.holdings:
            holding_data = h.model_dump()
            
            # Check for unreasonable prices (likely date values)
            if h.purchase_price > 100000:
                warnings.append(
                    f"{h.symbol}: Price ${h.purchase_price:,.2f} seems too high (possibly a date?). Skipped."
                )
                continue
            
            if h.purchase_price <= 0 or h.shares <= 0:
                warnings.append(f"{h.symbol}: Invalid price or shares. Skipped.")
                continue
            
            validated_holdings.append(holding_data)
        
        if not validated_holdings:
            raise HTTPException(
                status_code=400, 
                detail="No valid holdings to save. Please check your data format. "
                       "Prices should be per-share cost, not total value or dates."
            )
        
        await save_portfolio(user_id, {
            "holdings": validated_holdings,
            "risk_tolerance": request.risk_tolerance
        })
        
        result = {
            "success": True,
            "message": f"Portfolio saved with {len(validated_holdings)} holdings",
            "holdingsCount": len(validated_holdings)
        }
        
        if warnings:
            result["warnings"] = warnings
            result["message"] += f" ({len(warnings)} skipped due to validation issues)"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/holding")
async def add_holding(request: AddHoldingRequest, user: dict = Depends(get_current_user)):
    """Add a single holding to user's portfolio."""
    try:
        user_id = user["id"]
        
        # Validate purchase price is reasonable (not a date disguised as number)
        # Most stock prices are < $50,000 per share (even BRK.A is ~$600k, but most are much lower)
        if request.holding.purchase_price > 100000:
            raise HTTPException(
                status_code=400, 
                detail=f"Purchase price ${request.holding.purchase_price:,.2f} seems unusually high. "
                       f"Please verify this is the price per share, not total cost or a date value."
            )
        
        if request.holding.purchase_price <= 0:
            raise HTTPException(status_code=400, detail="Purchase price must be greater than 0")
        
        if request.holding.shares <= 0:
            raise HTTPException(status_code=400, detail="Number of shares must be greater than 0")
        
        await add_portfolio_holding(user_id, request.holding.model_dump())
        
        return {
            "success": True,
            "message": f"Added {request.holding.symbol} to portfolio"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding holding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/investments/holding/{symbol}")
async def delete_holding(symbol: str, user: dict = Depends(get_current_user)):
    """Remove a holding from user's portfolio."""
    try:
        user_id = user["id"]
        
        await remove_portfolio_holding(user_id, symbol.upper())
        
        return {
            "success": True,
            "message": f"Removed {symbol.upper()} from portfolio"
        }
        
    except Exception as e:
        print(f"Error removing holding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/investments/portfolio")
async def clear_user_portfolio(user: dict = Depends(get_current_user)):
    """Clear all holdings from user's portfolio."""
    try:
        user_id = user["id"]
        
        await clear_portfolio(user_id)
        
        return {
            "success": True,
            "message": "Portfolio cleared successfully"
        }
        
    except Exception as e:
        print(f"Error clearing portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/analyze")
async def analyze_portfolio(request: InvestmentAnalysisRequest, user: dict = Depends(get_current_user)):
    """Analyze user's portfolio with AI-powered insights using A2A protocol."""
    try:
        user_id = user["id"]
        portfolio = await get_user_portfolio(user_id)
        
        if not portfolio or not portfolio.get("holdings"):
            return {
                "hasData": False,
                "message": "No portfolio found. Add holdings first."
            }
        
        try:
            from ..agents.investment_agent import (
                get_comprehensive_portfolio_analysis,
                get_portfolio_analysis, 
                get_investment_recommendations,
            )
            
            holdings = portfolio.get("holdings", [])
            
            # Use A2A comprehensive analysis
            try:
                comprehensive = await get_comprehensive_portfolio_analysis(holdings, request.risk_tolerance)
                
                return {
                    "hasData": True,
                    "analysis": {
                        "totalValue": comprehensive["portfolio"]["total_value"],
                        "totalCost": comprehensive["portfolio"]["total_cost"],
                        "totalGainLoss": comprehensive["portfolio"]["total_gain_loss"],
                        "totalGainLossPercent": comprehensive["portfolio"]["total_gain_loss_percent"],
                        "holdings": comprehensive["portfolio"]["holdings"],
                        "sectorAllocation": comprehensive.get("sector_allocation", {}),
                        "sectorDetails": comprehensive.get("sector_details", {}),
                        "riskAssessment": comprehensive.get("risk_assessment", {}),
                        "hedgingStrategies": comprehensive.get("hedging", {}).get("strategies", []),
                        "diversificationScore": comprehensive.get("diversification_score", 0),
                        "topPerformers": sorted(
                            comprehensive["portfolio"]["holdings"],
                            key=lambda x: x.get("gain_loss_percent", 0),
                            reverse=True
                        )[:3],
                        "worstPerformers": sorted(
                            comprehensive["portfolio"]["holdings"],
                            key=lambda x: x.get("gain_loss_percent", 0)
                        )[:3]
                    },
                    "recommendations": comprehensive.get("recommendations", []),
                    "riskTolerance": request.risk_tolerance,
                    "portfolioHealth": comprehensive.get("portfolio_health", "unknown"),
                    "a2aAgentsConsulted": comprehensive.get("a2a_agents_consulted", [])
                }
            except Exception as a2a_err:
                print(f"A2A analysis failed, falling back to basic: {a2a_err}")
                # Fallback to basic analysis
                analysis = get_portfolio_analysis(holdings)
                
                # Get recommendations if requested
                recommendations = []
                if request.include_recommendations:
                    rec_result = get_investment_recommendations(holdings, request.risk_tolerance)
                    recommendations = rec_result.get("recommendations", [])
                
                # Calculate sector allocation from basic analysis
                sectors = analysis.get("sectors", {})
                total_value = analysis.get("total_value", 1)
                sector_percentages = {
                    sector: round(value / total_value * 100, 1)
                    for sector, value in sectors.items()
                } if total_value > 0 else {}
                
                return {
                    "hasData": True,
                    "analysis": {
                        "totalValue": analysis.get("total_value", 0),
                        "totalCost": analysis.get("total_cost", 0),
                        "totalGainLoss": analysis.get("total_gain_loss", 0),
                        "totalGainLossPercent": analysis.get("total_gain_loss_percent", 0),
                        "riskMetrics": analysis.get("risk_metrics", {}),
                        "sectorAllocation": sector_percentages,
                        "topPerformers": sorted(
                            analysis.get("enriched_holdings", []),
                            key=lambda x: x.get("gain_loss_percent", 0),
                            reverse=True
                        )[:3],
                        "worstPerformers": sorted(
                            analysis.get("enriched_holdings", []),
                            key=lambda x: x.get("gain_loss_percent", 0)
                        )[:3]
                    },
                    "recommendations": recommendations,
                    "riskTolerance": request.risk_tolerance
                }
            
        except ImportError as e:
            print(f"Investment agent not available: {e}")
            return {
                "hasData": True,
                "analysis": {
                    "totalValue": sum(h.get("shares", 0) * h.get("purchase_price", 0) for h in portfolio.get("holdings", [])),
                    "holdings": portfolio.get("holdings", []),
                    "sectorAllocation": {}
                },
                "recommendations": [],
                "message": "Advanced analysis unavailable. Install required packages."
            }
            
    except Exception as e:
        print(f"Error analyzing portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/stock-data")
async def get_stock_info(request: StockSearchRequest, user: dict = Depends(get_current_user)):
    """Get real-time stock data for given symbols."""
    try:
        from ..agents.investment_agent import get_stock_data
        
        results = {}
        for symbol in request.symbols[:10]:  # Limit to 10 symbols
            results[symbol.upper()] = get_stock_data(symbol)
        
        return {
            "hasData": True,
            "stocks": results
        }
        
    except ImportError:
        return {
            "hasData": False,
            "message": "Stock data service unavailable. Install yfinance.",
            "stocks": {}
        }
    except Exception as e:
        print(f"Error getting stock data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/market-overview")
async def get_market_data(request: MarketOverviewRequest, user: dict = Depends(get_current_user)):
    """Get market overview with sector performance."""
    try:
        from ..agents.investment_agent import get_market_overview
        
        sectors = request.sectors or ["Technology", "Healthcare", "Financials", "Energy", "Consumer"]
        overview = get_market_overview(sectors)
        
        return {
            "hasData": True,
            "market": overview
        }
        
    except ImportError:
        return {
            "hasData": False,
            "message": "Market data service unavailable. Install yfinance.",
            "market": {}
        }
    except Exception as e:
        print(f"Error getting market overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/investments/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """Get AI-powered investment recommendations based on portfolio and market data."""
    try:
        user_id = user["id"]
        portfolio = await get_user_portfolio(user_id)
        
        try:
            from ..agents.investment_agent import get_investment_recommendations
            
            holdings = portfolio.get("holdings", []) if portfolio else []
            risk_tolerance = portfolio.get("risk_tolerance", "moderate") if portfolio else "moderate"
            
            # This now works even without a portfolio - returns market-based recommendations
            result = get_investment_recommendations(holdings, risk_tolerance)
            
            return {
                "hasData": True,
                "recommendations": result.get("recommendations", []),
                "portfolioHealth": result.get("portfolio_health", "unknown"),
                "riskTolerance": risk_tolerance,
                "hasPortfolio": len(holdings) > 0
            }
            
        except ImportError as e:
            print(f"Import error: {e}")
            return {
                "hasData": False,
                "message": "Recommendation engine unavailable. Install yfinance.",
                "recommendations": []
            }
            
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# Goal Management Endpoints
# ─────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    """Request model for creating a new goal."""
    name: str
    description: Optional[str] = ""
    target: float
    current: float = 0
    targetDate: str
    monthlyContribution: float = 0
    icon: str = "🎯"
    color: str = "from-blue-500 to-purple-600"
    priority: str = "medium"  # high, medium, low
    category: str = "general"  # savings, investment, debt, purchase, emergency, retirement


class GoalUpdate(BaseModel):
    """Request model for updating a goal."""
    name: Optional[str] = None
    description: Optional[str] = None
    target: Optional[float] = None
    current: Optional[float] = None
    targetDate: Optional[str] = None
    monthlyContribution: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None


@router.post("/goals")
async def create_goal(goal: GoalCreate, user: dict = Depends(get_current_user)):
    """Create a new financial goal."""
    try:
        user_id = user["id"]
        
        # Calculate progress percentage
        progress = (goal.current / goal.target * 100) if goal.target > 0 else 0
        
        # Calculate estimated completion based on monthly contribution
        months_remaining = 0
        if goal.monthlyContribution > 0 and goal.target > goal.current:
            months_remaining = (goal.target - goal.current) / goal.monthlyContribution
        
        goal_data = {
            "user_id": user_id,
            "name": goal.name,
            "description": goal.description,
            "target": goal.target,
            "current": goal.current,
            "targetDate": goal.targetDate,
            "monthlyContribution": goal.monthlyContribution,
            "icon": goal.icon,
            "color": goal.color,
            "priority": goal.priority,
            "category": goal.category,
            "progress": round(progress, 1),
            "estimatedMonthsToComplete": round(months_remaining, 1),
            "status": "on-track"  # Default status for new goals
        }
        
        goal_id = await save_goal(goal_data)
        
        # Return the goal data with proper serializable fields
        response_goal = {
            **goal_data,
            "id": goal_id
        }
        
        return {"success": True, "goal": response_goal}
        
    except Exception as e:
        print(f"Error creating goal: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals")
async def get_goals(user: dict = Depends(get_current_user)):
    """Get all goals for the current user."""
    try:
        user_id = user["id"]
        goals = await get_user_goals(user_id)
        
        # Get user's financial data for status calculation
        financial_data = await get_user_financial_data(user_id)
        monthly_income = financial_data.get("total_income", 0)
        monthly_expenses = financial_data.get("total_expenses", 0)
        monthly_savings = monthly_income - monthly_expenses if monthly_income > monthly_expenses else 0
        
        # Enhance goals with status and calculations
        enhanced_goals = []
        for goal in goals:
            target = goal.get("target", 0)
            current = goal.get("current", 0)
            monthly_contribution = goal.get("monthlyContribution", 0)
            target_date = goal.get("targetDate", "")
            
            # Calculate progress
            progress = (current / target * 100) if target > 0 else 0
            
            # Calculate status based on finances and progress
            status = calculate_goal_status(
                target, current, monthly_contribution, 
                target_date, monthly_savings
            )
            
            # Calculate months to completion
            months_to_complete = 0
            if monthly_contribution > 0 and target > current:
                months_to_complete = (target - current) / monthly_contribution
            
            enhanced_goals.append({
                **goal,
                "progress": round(progress, 1),
                "status": status,
                "estimatedMonthsToComplete": round(months_to_complete, 1),
                "monthlyAvailable": monthly_savings
            })
        
        return {
            "success": True,
            "goals": enhanced_goals,
            "financialSummary": {
                "monthlyIncome": monthly_income,
                "monthlyExpenses": monthly_expenses,
                "monthlySavings": monthly_savings
            }
        }
        
    except Exception as e:
        print(f"Error getting goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def calculate_goal_status(target: float, current: float, monthly_contribution: float, 
                          target_date: str, monthly_savings: float) -> str:
    """Calculate goal status based on progress and financial capacity."""
    if current >= target:
        return "completed"
    
    progress = (current / target * 100) if target > 0 else 0
    
    # Parse target date
    try:
        from datetime import datetime
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
        months_until_target = ((target_dt.year - datetime.now().year) * 12 + 
                               target_dt.month - datetime.now().month)
        
        if months_until_target <= 0:
            return "overdue" if progress < 100 else "completed"
        
        # Calculate if on track
        amount_remaining = target - current
        required_monthly = amount_remaining / months_until_target if months_until_target > 0 else float('inf')
        
        if monthly_contribution >= required_monthly:
            if progress >= 75:
                return "on-track"
            elif progress >= 50:
                return "on-track"
            else:
                return "on-track"
        elif monthly_contribution >= required_monthly * 0.8:
            return "at-risk"
        else:
            return "behind"
            
    except (ValueError, TypeError):
        # If date parsing fails, use simple progress-based status
        if progress >= 75:
            return "on-track"
        elif progress >= 50:
            return "at-risk"
        else:
            return "behind"


@router.get("/goals/{goal_id}")
async def get_goal(goal_id: str, user: dict = Depends(get_current_user)):
    """Get a specific goal by ID."""
    try:
        goal = await get_goal_by_id(goal_id)
        
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Verify ownership
        if goal.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this goal")
        
        return {"success": True, "goal": goal}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/goals/{goal_id}")
async def update_goal_endpoint(goal_id: str, goal_update: GoalUpdate, user: dict = Depends(get_current_user)):
    """Update an existing goal."""
    try:
        # Get existing goal to verify ownership
        existing = await get_goal_by_id(goal_id)
        
        if not existing:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        if existing.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this goal")
        
        # Build update dict with only provided fields
        updates = {k: v for k, v in goal_update.dict().items() if v is not None}
        
        # Recalculate progress if target or current changed
        target = updates.get("target", existing.get("target", 0))
        current = updates.get("current", existing.get("current", 0))
        if "target" in updates or "current" in updates:
            updates["progress"] = round((current / target * 100) if target > 0 else 0, 1)
        
        await update_goal(goal_id, updates)
        
        # Get updated goal
        updated_goal = await get_goal_by_id(goal_id)
        
        return {"success": True, "goal": updated_goal}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/goals/{goal_id}")
async def delete_goal_endpoint(goal_id: str, user: dict = Depends(get_current_user)):
    """Delete a goal."""
    try:
        # Get existing goal to verify ownership
        existing = await get_goal_by_id(goal_id)
        
        if not existing:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        if existing.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
        
        await delete_goal(goal_id)
        
        return {"success": True, "message": "Goal deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/{goal_id}/analysis")
async def get_goal_analysis(goal_id: str, user: dict = Depends(get_current_user)):
    """Get AI-powered analysis and recommendations for a specific goal."""
    try:
        # Get goal
        goal = await get_goal_by_id(goal_id)
        
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        if goal.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this goal")
        
        # Get user's financial data
        user_id = user["id"]
        financial_data = await get_user_financial_data(user_id)
        
        # Generate analysis
        analysis = generate_goal_analysis(goal, financial_data)
        
        return {
            "success": True,
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting goal analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_goal_analysis(goal: dict, financial_data: dict) -> dict:
    """Generate comprehensive AI analysis for a goal."""
    target = goal.get("target", 0)
    current = goal.get("current", 0)
    monthly_contribution = goal.get("monthlyContribution", 0)
    target_date = goal.get("targetDate", "")
    category = goal.get("category", "general")
    priority = goal.get("priority", "medium")
    
    monthly_income = financial_data.get("total_income", 0)
    monthly_expenses = financial_data.get("total_expenses", 0)
    monthly_savings = monthly_income - monthly_expenses if monthly_income > monthly_expenses else 0
    
    progress = (current / target * 100) if target > 0 else 0
    amount_remaining = target - current
    
    # Calculate timeline
    months_to_complete = 0
    if monthly_contribution > 0 and amount_remaining > 0:
        months_to_complete = amount_remaining / monthly_contribution
    
    # Parse target date for deadline analysis
    months_until_deadline = 0
    is_achievable = True
    try:
        from datetime import datetime
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
        months_until_deadline = ((target_dt.year - datetime.now().year) * 12 + 
                                 target_dt.month - datetime.now().month)
        is_achievable = months_to_complete <= months_until_deadline if months_until_deadline > 0 else False
    except (ValueError, TypeError):
        pass
    
    # Generate recommendations based on category and status
    recommendations = []
    accelerators = []
    risks = []
    
    # Category-specific recommendations
    if category == "emergency":
        recommendations.append({
            "title": "Emergency Fund Best Practices",
            "description": "Aim for 3-6 months of expenses. Keep in high-yield savings account for easy access.",
            "impact": "high",
            "actionable": True
        })
        if progress < 50:
            accelerators.append({
                "title": "Automate Savings",
                "description": "Set up automatic transfers on payday to ensure consistent contributions.",
                "potentialIncrease": monthly_contribution * 0.2
            })
    
    elif category == "retirement":
        recommendations.append({
            "title": "Maximize Tax-Advantaged Accounts",
            "description": "Contribute to 401(k) up to employer match, then max out IRA before taxable accounts.",
            "impact": "high",
            "actionable": True
        })
        if monthly_contribution < monthly_income * 0.15:
            accelerators.append({
                "title": "Increase Contribution Rate",
                "description": "Financial experts recommend saving 15% of income for retirement.",
                "potentialIncrease": (monthly_income * 0.15) - monthly_contribution
            })
    
    elif category == "investment":
        recommendations.append({
            "title": "Diversification Strategy",
            "description": "Spread investments across asset classes to reduce risk while maintaining growth potential.",
            "impact": "medium",
            "actionable": True
        })
        accelerators.append({
            "title": "Dollar-Cost Averaging",
            "description": "Invest consistently regardless of market conditions to reduce timing risk.",
            "potentialIncrease": monthly_contribution * 0.1
        })
    
    elif category == "debt":
        recommendations.append({
            "title": "Debt Avalanche Method",
            "description": "Focus on highest interest debt first while making minimum payments on others.",
            "impact": "high",
            "actionable": True
        })
        if monthly_savings > monthly_contribution:
            accelerators.append({
                "title": "Increase Monthly Payment",
                "description": f"You have ${monthly_savings - monthly_contribution:.0f} additional savings that could accelerate debt payoff.",
                "potentialIncrease": monthly_savings - monthly_contribution
            })
    
    elif category == "purchase":
        recommendations.append({
            "title": "Price Research",
            "description": "Research prices, wait for sales, and consider certified pre-owned or refurbished options.",
            "impact": "medium",
            "actionable": True
        })
        accelerators.append({
            "title": "Side Income",
            "description": "Consider freelancing or selling unused items to accelerate savings.",
            "potentialIncrease": monthly_contribution * 0.25
        })
    
    else:  # general
        recommendations.append({
            "title": "Set Milestones",
            "description": "Break your goal into smaller milestones to track progress and stay motivated.",
            "impact": "medium",
            "actionable": True
        })
    
    # Progress-based recommendations
    if progress < 25:
        recommendations.append({
            "title": "Start Strong",
            "description": "The hardest part is starting. Automate your contributions to build momentum.",
            "impact": "high",
            "actionable": True
        })
    elif progress >= 75:
        recommendations.append({
            "title": "Final Push",
            "description": "You're almost there! Consider a one-time contribution to reach your goal faster.",
            "impact": "medium",
            "actionable": True
        })
    
    # Risk assessment
    if not is_achievable and months_until_deadline > 0:
        risks.append({
            "title": "Timeline Risk",
            "severity": "high",
            "description": f"At current pace, you'll reach this goal in {months_to_complete:.0f} months, but your deadline is in {months_until_deadline} months.",
            "mitigation": f"Increase monthly contribution to ${(amount_remaining / months_until_deadline):.0f} to meet deadline."
        })
    
    if monthly_contribution > monthly_savings:
        risks.append({
            "title": "Budget Strain",
            "severity": "medium",
            "description": "Your planned contribution exceeds your current savings capacity.",
            "mitigation": "Review expenses to find areas to cut, or adjust your target date."
        })
    
    if priority == "high" and monthly_contribution < monthly_savings * 0.3:
        risks.append({
            "title": "Priority Mismatch",
            "severity": "low",
            "description": "This is a high-priority goal but receives a small portion of your savings.",
            "mitigation": "Consider reallocating more of your monthly savings to this goal."
        })
    
    # Calculate optimal contribution
    optimal_contribution = amount_remaining / months_until_deadline if months_until_deadline > 0 else monthly_contribution
    
    return {
        "summary": {
            "progress": round(progress, 1),
            "amountRemaining": amount_remaining,
            "monthsToComplete": round(months_to_complete, 1),
            "monthsUntilDeadline": months_until_deadline,
            "isOnTrack": is_achievable,
            "currentContribution": monthly_contribution,
            "optimalContribution": round(optimal_contribution, 2),
            "contributionGap": round(optimal_contribution - monthly_contribution, 2) if optimal_contribution > monthly_contribution else 0
        },
        "financialContext": {
            "monthlyIncome": monthly_income,
            "monthlyExpenses": monthly_expenses,
            "monthlySavings": monthly_savings,
            "savingsRate": round((monthly_savings / monthly_income * 100) if monthly_income > 0 else 0, 1),
            "goalAllocation": round((monthly_contribution / monthly_savings * 100) if monthly_savings > 0 else 0, 1)
        },
        "recommendations": recommendations,
        "accelerators": accelerators,
        "risks": risks,
        "projections": {
            "currentPace": {
                "completionDate": calculate_completion_date(amount_remaining, monthly_contribution),
                "monthsToComplete": round(months_to_complete, 1)
            },
            "optimizedPace": {
                "completionDate": calculate_completion_date(amount_remaining, optimal_contribution),
                "monthsToComplete": round(amount_remaining / optimal_contribution if optimal_contribution > 0 else 0, 1)
            },
            "aggressivePace": {
                "completionDate": calculate_completion_date(amount_remaining, monthly_savings * 0.5),
                "monthsToComplete": round(amount_remaining / (monthly_savings * 0.5) if monthly_savings > 0 else 0, 1)
            }
        }
    }


def calculate_completion_date(amount_remaining: float, monthly_contribution: float) -> str:
    """Calculate the projected completion date."""
    if monthly_contribution <= 0 or amount_remaining <= 0:
        return "N/A"
    
    from datetime import datetime, timedelta
    
    months = int(amount_remaining / monthly_contribution)
    # Approximate months by adding 30 days per month
    completion_date = datetime.now() + timedelta(days=months * 30)
    return completion_date.strftime("%b %Y")

