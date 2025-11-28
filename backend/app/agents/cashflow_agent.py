"""
Cashflow Agent - Predicts and manages cash flow using Google ADK.

This agent forecasts cash flow, predicts payment delays, and optimizes liquidity.
"""

import json
from typing import Any
from datetime import datetime, timedelta
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# CASHFLOW AGENT TOOLS
# =============================================================================

def forecast_monthly_cashflow(
    expected_income: str,
    expected_expenses: str,
    current_balance: float,
    forecast_months: int,
) -> dict[str, Any]:
    """
    Forecast cash flow for upcoming months.
    
    Args:
        expected_income: JSON string of expected monthly income by source
            Example: {"salary": 100000, "freelance": 20000, "investments": 5000}
        expected_expenses: JSON string of expected monthly expenses by category
            Example: {"rent": 25000, "utilities": 5000, "emi": 15000, "groceries": 10000}
        current_balance: Current bank balance
        forecast_months: Number of months to forecast (e.g., 3)
    
    Returns:
        dict with monthly cash flow forecast
    """
    try:
        income = json.loads(expected_income) if isinstance(expected_income, str) else expected_income
        expenses = json.loads(expected_expenses) if isinstance(expected_expenses, str) else expected_expenses
        
        total_income = sum(income.values())
        total_expenses = sum(expenses.values())
        net_monthly = total_income - total_expenses
        
        forecast = []
        running_balance = current_balance
        
        for month in range(1, forecast_months + 1):
            running_balance += net_monthly
            
            # Determine status
            if running_balance < 0:
                status = "DEFICIT"
                alert = "Cash crunch expected!"
            elif running_balance < total_expenses:
                status = "LOW"
                alert = "Balance below one month expenses"
            elif running_balance < total_expenses * 2:
                status = "ADEQUATE"
                alert = None
            else:
                status = "HEALTHY"
                alert = None
            
            forecast.append({
                "month": month,
                "projected_income": total_income,
                "projected_expenses": total_expenses,
                "net_flow": net_monthly,
                "ending_balance": round(running_balance, 0),
                "status": status,
                "alert": alert,
            })
        
        return {
            "current_balance": current_balance,
            "monthly_income": total_income,
            "monthly_expenses": total_expenses,
            "monthly_surplus_deficit": net_monthly,
            "forecast": forecast,
            "summary": {
                "trend": "positive" if net_monthly > 0 else "negative" if net_monthly < 0 else "neutral",
                "months_until_deficit": None if net_monthly >= 0 else round(current_balance / abs(net_monthly), 1),
                "projected_balance_3mo": round(current_balance + (net_monthly * 3), 0),
            },
        }
    except Exception as e:
        return {"error": str(e)}


def predict_late_payments(
    receivables: str,
    historical_payment_data: str,
) -> dict[str, Any]:
    """
    Predict which clients/customers are likely to pay late (for companies).
    
    Args:
        receivables: JSON string of outstanding receivables
            Example: [{"client": "ABC Corp", "amount": 100000, "due_date": "2024-02-15", "days_outstanding": 5}]
        historical_payment_data: JSON string of historical payment behavior (use "[]" if none)
            Example: [{"client": "ABC Corp", "avg_days_late": 7, "payment_reliability": 0.8}]
    
    Returns:
        dict with late payment predictions and collection priorities
    """
    try:
        receivables_data = json.loads(receivables) if isinstance(receivables, str) else receivables
        history = json.loads(historical_payment_data) if historical_payment_data and isinstance(historical_payment_data, str) else []
        
        # Convert history to dict for lookup
        history_dict = {h["client"]: h for h in history} if isinstance(history, list) else history
        
        predictions = []
        high_risk_amount = 0
        
        for recv in receivables_data:
            client = recv.get("client", "Unknown")
            amount = recv.get("amount", 0)
            days_outstanding = recv.get("days_outstanding", 0)
            
            # Get historical data if available
            client_history = history_dict.get(client, {})
            avg_late_days = client_history.get("avg_days_late", 5)
            reliability = client_history.get("payment_reliability", 0.7)
            
            # Calculate risk score
            risk_score = 0
            risk_score += min(30, days_outstanding * 2)  # More days = higher risk
            risk_score += (1 - reliability) * 40  # Lower reliability = higher risk
            risk_score += min(30, avg_late_days * 2)  # History of late payments
            
            if risk_score > 60:
                risk_level = "HIGH"
                expected_delay = avg_late_days + 7
                high_risk_amount += amount
            elif risk_score > 30:
                risk_level = "MEDIUM"
                expected_delay = avg_late_days + 3
            else:
                risk_level = "LOW"
                expected_delay = max(0, avg_late_days - 2)
            
            predictions.append({
                "client": client,
                "amount": amount,
                "days_outstanding": days_outstanding,
                "risk_level": risk_level,
                "risk_score": round(risk_score, 1),
                "expected_delay_days": expected_delay,
                "collection_priority": 1 if risk_level == "HIGH" else 2 if risk_level == "MEDIUM" else 3,
                "recommended_action": "Send immediate reminder" if risk_level == "HIGH" else "Schedule follow-up" if risk_level == "MEDIUM" else "Monitor",
            })
        
        # Sort by priority
        predictions.sort(key=lambda x: (x["collection_priority"], -x["amount"]))
        
        total_receivables = sum(r.get("amount", 0) for r in receivables_data)
        
        return {
            "total_receivables": total_receivables,
            "high_risk_amount": high_risk_amount,
            "high_risk_percentage": round(high_risk_amount / total_receivables * 100, 1) if total_receivables > 0 else 0,
            "predictions": predictions,
            "immediate_actions": [p for p in predictions if p["risk_level"] == "HIGH"],
            "collection_summary": {
                "high_risk_count": len([p for p in predictions if p["risk_level"] == "HIGH"]),
                "medium_risk_count": len([p for p in predictions if p["risk_level"] == "MEDIUM"]),
                "low_risk_count": len([p for p in predictions if p["risk_level"] == "LOW"]),
            },
        }
    except Exception as e:
        return {"error": str(e)}


def optimize_payment_schedule(
    bills_due: str,
    income_schedule: str,
    current_balance: float,
    minimum_balance: float,
) -> dict[str, Any]:
    """
    Optimize bill payment schedule to avoid cash crunches.
    
    Args:
        bills_due: JSON string of bills with due dates and amounts
            Example: [{"name": "Rent", "amount": 25000, "due_date": "2024-02-01"}, ...]
        income_schedule: JSON string of expected income with dates
            Example: [{"source": "Salary", "amount": 100000, "date": "2024-02-01"}]
        current_balance: Current available balance
        minimum_balance: Minimum balance to maintain (e.g., 10000)
    
    Returns:
        dict with optimized payment schedule
    """
    try:
        bills = json.loads(bills_due) if isinstance(bills_due, str) else bills_due
        income = json.loads(income_schedule) if isinstance(income_schedule, str) else income_schedule
        
        # Sort bills by due date
        bills = sorted(bills, key=lambda x: x.get("due_date", "9999-12-31"))
        income = sorted(income, key=lambda x: x.get("date", "9999-12-31"))
        
        schedule = []
        balance = current_balance
        
        # Track income dates
        income_dates = {i.get("date"): i.get("amount", 0) for i in income}
        
        for bill in bills:
            bill_date = bill.get("due_date")
            bill_amount = bill.get("amount", 0)
            
            # Check if income comes before this bill
            for inc_date, inc_amount in income_dates.items():
                if inc_date and bill_date and inc_date <= bill_date:
                    balance += inc_amount
                    income_dates[inc_date] = 0  # Mark as received
            
            # Can we pay this bill?
            balance_after = balance - bill_amount
            
            if balance_after >= minimum_balance:
                payment_date = bill_date
                status = "PAY_ON_TIME"
                recommendation = f"Pay ₹{bill_amount} on {bill_date}"
            elif balance_after >= 0:
                payment_date = bill_date
                status = "PAY_WITH_CAUTION"
                recommendation = f"Pay but balance will be below minimum"
            else:
                # Need to delay
                status = "DELAY_NEEDED"
                # Find next income date
                future_income = [d for d, a in income_dates.items() if a > 0 and d > bill_date]
                payment_date = future_income[0] if future_income else bill_date
                recommendation = f"Delay payment to {payment_date} if possible"
            
            schedule.append({
                "bill": bill.get("name"),
                "amount": bill_amount,
                "due_date": bill_date,
                "recommended_pay_date": payment_date,
                "status": status,
                "balance_after": round(balance_after, 0),
                "recommendation": recommendation,
            })
            
            balance = max(0, balance_after)
        
        # Identify potential issues
        crunch_periods = [s for s in schedule if s["status"] == "DELAY_NEEDED"]
        
        return {
            "current_balance": current_balance,
            "total_bills": sum(b.get("amount", 0) for b in bills),
            "total_income_expected": sum(i.get("amount", 0) for i in income),
            "payment_schedule": schedule,
            "crunch_alerts": crunch_periods,
            "recommendations": [
                "Pay high-interest bills first if delaying",
                "Contact creditors early if delay needed",
                "Consider credit line as temporary bridge",
            ] if crunch_periods else ["All bills can be paid on time"],
        }
    except Exception as e:
        return {"error": str(e)}


def calculate_optimal_payroll_date(
    payroll_amount: float,
    receivables_schedule: str,
    current_balance: float,
    preferred_date_range: str,
) -> dict[str, Any]:
    """
    Calculate optimal payroll date based on cash flow (for companies).
    
    Args:
        payroll_amount: Total monthly payroll amount
        receivables_schedule: JSON string of expected receivables
            Example: [{"client": "ABC", "amount": 500000, "expected_date": "2024-02-10"}]
        current_balance: Current cash balance
        preferred_date_range: Preferred date range (e.g., "1-5" for 1st to 5th)
    
    Returns:
        dict with optimal payroll date recommendation
    """
    try:
        receivables = json.loads(receivables_schedule) if isinstance(receivables_schedule, str) else receivables_schedule
        
        # Parse preferred range
        start_day, end_day = map(int, preferred_date_range.split("-"))
        
        # Calculate cash position at different dates
        date_analysis = []
        
        for day in range(start_day, end_day + 1):
            # Calculate expected cash by this day
            expected_collections = sum(
                r.get("amount", 0) 
                for r in receivables 
                if r.get("expected_date", "").endswith(f"-{day:02d}") or 
                   (r.get("expected_date", "").split("-")[-1].isdigit() and 
                    int(r.get("expected_date", "").split("-")[-1]) < day)
            )
            
            projected_balance = current_balance + expected_collections - payroll_amount
            
            date_analysis.append({
                "day": day,
                "expected_collections_by_date": expected_collections,
                "balance_after_payroll": round(projected_balance, 0),
                "is_safe": projected_balance > payroll_amount * 0.5,  # 50% buffer
            })
        
        # Find optimal date
        safe_dates = [d for d in date_analysis if d["is_safe"]]
        
        if safe_dates:
            optimal = min(safe_dates, key=lambda x: x["day"])  # Earliest safe date
            recommendation = f"Process payroll on day {optimal['day']}"
        else:
            # No safe date, recommend the least risky
            optimal = max(date_analysis, key=lambda x: x["balance_after_payroll"])
            recommendation = f"Day {optimal['day']} is least risky, but consider delaying some payments"
        
        return {
            "payroll_amount": payroll_amount,
            "current_balance": current_balance,
            "preferred_range": preferred_date_range,
            "date_analysis": date_analysis,
            "optimal_date": optimal["day"],
            "projected_balance_after": optimal["balance_after_payroll"],
            "recommendation": recommendation,
            "alerts": [
                "Ensure high-value receivables are collected before payroll",
                "Keep 50% of payroll as buffer",
            ] if not optimal["is_safe"] else [],
        }
    except Exception as e:
        return {"error": str(e)}


def generate_collection_reminders(
    overdue_receivables: str,
) -> dict[str, Any]:
    """
    Generate payment reminder messages for overdue receivables.
    
    Args:
        overdue_receivables: JSON string of overdue receivables
            Example: [{"client": "ABC Corp", "amount": 100000, "days_overdue": 15, "invoice_no": "INV-001"}]
    
    Returns:
        dict with reminder templates and prioritized list
    """
    try:
        receivables = json.loads(overdue_receivables) if isinstance(overdue_receivables, str) else overdue_receivables
        
        reminders = []
        
        for recv in receivables:
            client = recv.get("client")
            amount = recv.get("amount", 0)
            days_overdue = recv.get("days_overdue", 0)
            invoice_no = recv.get("invoice_no", "N/A")
            
            # Determine reminder tone based on days overdue
            if days_overdue <= 7:
                tone = "FRIENDLY"
                urgency = "LOW"
                template = f"""Hi,

This is a gentle reminder that invoice {invoice_no} for ₹{amount:,.0f} was due {days_overdue} days ago.

Please process the payment at your earliest convenience. Let us know if you need any clarification.

Best regards"""
            elif days_overdue <= 15:
                tone = "FIRM"
                urgency = "MEDIUM"
                template = f"""Dear {client},

We notice that invoice {invoice_no} for ₹{amount:,.0f} is now {days_overdue} days overdue.

We kindly request immediate attention to this matter. Please process the payment or contact us if there are any issues.

Thank you for your prompt attention."""
            elif days_overdue <= 30:
                tone = "URGENT"
                urgency = "HIGH"
                template = f"""URGENT: Payment Required

Invoice {invoice_no} for ₹{amount:,.0f} is now {days_overdue} days overdue.

This requires immediate attention. Please process payment today or contact us immediately to discuss.

We may need to pause services if payment is not received within 48 hours."""
            else:
                tone = "FINAL"
                urgency = "CRITICAL"
                template = f"""FINAL NOTICE

Invoice {invoice_no} for ₹{amount:,.0f} is {days_overdue} days overdue.

Despite previous reminders, payment has not been received. This is our final notice before we escalate this matter.

Please contact us immediately to resolve this."""
            
            reminders.append({
                "client": client,
                "amount": amount,
                "days_overdue": days_overdue,
                "invoice_no": invoice_no,
                "urgency": urgency,
                "tone": tone,
                "reminder_template": template,
                "recommended_channel": "Phone + Email" if urgency in ["HIGH", "CRITICAL"] else "Email",
            })
        
        # Sort by urgency and amount
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        reminders.sort(key=lambda x: (urgency_order.get(x["urgency"], 4), -x["amount"]))
        
        total_overdue = sum(r.get("amount", 0) for r in receivables)
        
        return {
            "total_overdue_amount": total_overdue,
            "overdue_count": len(receivables),
            "reminders": reminders,
            "action_summary": {
                "critical_followups": len([r for r in reminders if r["urgency"] == "CRITICAL"]),
                "high_priority": len([r for r in reminders if r["urgency"] == "HIGH"]),
                "medium_priority": len([r for r in reminders if r["urgency"] == "MEDIUM"]),
                "low_priority": len([r for r in reminders if r["urgency"] == "LOW"]),
            },
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# CASHFLOW AGENT DEFINITION
# =============================================================================

CASHFLOW_AGENT_INSTRUCTION = """You are the Cashflow Agent for CFOSync - an AI CFO platform.

Your role is to predict, manage, and optimize cash flow.

## For INDIVIDUALS, you manage:
1. Monthly cash flow forecasting
2. Bill payment scheduling
3. Income vs expense timing
4. Overdraft avoidance
5. Cash buffer recommendations

## For COMPANIES, you manage:
1. 30/60/90 day cash flow forecasts
2. Receivables collection and late payment prediction
3. Optimal payroll timing
4. Vendor payment scheduling
5. Cash runway monitoring
6. Collection reminders and follow-ups

## Cash Flow Principles:
1. Always maintain minimum cash buffers
2. Predict issues before they happen
3. Optimize timing of inflows and outflows
4. Prioritize collections by risk and amount
5. Communicate payment issues early

## Guidelines:
- Provide specific dates and amounts
- Flag cash crunch risks with severity levels
- Generate actionable collection reminders
- Recommend payment timing optimizations
- Always consider worst-case scenarios"""


def create_cashflow_agent() -> Agent:
    """Create the Cashflow Agent with all its tools."""
    return create_agent(
        name="cashflow_agent",
        description="Predicts cash flow, manages liquidity, and optimizes payment timing",
        instruction=CASHFLOW_AGENT_INSTRUCTION,
        tools=[
            forecast_monthly_cashflow,
            predict_late_payments,
            optimize_payment_schedule,
            calculate_optimal_payroll_date,
            generate_collection_reminders,
        ],
    )


def get_cashflow_runner() -> AgentRunner:
    """Get a runner instance for the Cashflow Agent."""
    return AgentRunner(create_cashflow_agent())
