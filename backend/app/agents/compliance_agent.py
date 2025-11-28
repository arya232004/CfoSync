"""
Compliance Agent - Checks legal, tax, and regulatory compliance using Google ADK.

This agent monitors and ensures financial compliance with regulations.
"""

import json
from typing import Any
from datetime import datetime, timedelta
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# COMPLIANCE AGENT TOOLS
# =============================================================================

def check_gst_compliance(
    monthly_revenue: float,
    gst_filed_months: str,
    current_month: str,
    gst_collected: float,
    gst_paid: float,
) -> dict[str, Any]:
    """
    Check GST filing compliance status.
    
    Args:
        monthly_revenue: Average monthly revenue
        gst_filed_months: JSON string of months where GST was filed
            Example: ["2024-01", "2024-02", "2024-03"]
        current_month: Current month (YYYY-MM)
        gst_collected: Total GST collected from customers
        gst_paid: Total GST paid to government
    
    Returns:
        dict with GST compliance status and recommendations
    """
    try:
        filed = json.loads(gst_filed_months) if isinstance(gst_filed_months, str) else gst_filed_months
        
        # Check if GST registration is required (threshold: 20L annual for services, 40L for goods)
        annual_revenue = monthly_revenue * 12
        gst_required = annual_revenue > 2000000  # 20L threshold
        
        # Check for unfiled months
        current_dt = datetime.strptime(current_month, "%Y-%m")
        unfiled_months = []
        
        for i in range(1, 4):  # Check last 3 months
            check_month = (current_dt - timedelta(days=30*i)).strftime("%Y-%m")
            if check_month not in filed:
                unfiled_months.append(check_month)
        
        # GST liability
        gst_liability = gst_collected - gst_paid
        
        # Determine compliance status
        issues = []
        if unfiled_months:
            issues.append({
                "type": "UNFILED_RETURNS",
                "severity": "HIGH",
                "details": f"GST returns not filed for: {', '.join(unfiled_months)}",
                "action": "File GSTR-3B immediately to avoid penalties",
                "penalty_risk": f"₹{len(unfiled_months) * 2000} potential late fee",
            })
        
        if gst_liability > 0:
            issues.append({
                "type": "GST_PAYABLE",
                "severity": "MEDIUM",
                "details": f"GST liability of ₹{gst_liability:,.0f} pending",
                "action": "Pay GST before filing to avoid interest",
            })
        
        status = "COMPLIANT" if not issues else "NON_COMPLIANT" if any(i["severity"] == "HIGH" for i in issues) else "ATTENTION_NEEDED"
        
        return {
            "gst_required": gst_required,
            "annual_revenue": annual_revenue,
            "compliance_status": status,
            "filed_months": filed,
            "unfiled_months": unfiled_months,
            "gst_summary": {
                "collected": gst_collected,
                "paid": gst_paid,
                "liability": gst_liability,
            },
            "issues": issues,
            "next_actions": [
                f"File GSTR-3B for {unfiled_months[0]}" if unfiled_months else "Continue timely filing",
                f"Pay ₹{gst_liability:,.0f} GST liability" if gst_liability > 0 else None,
            ],
            "deadlines": {
                "GSTR-1": "11th of next month",
                "GSTR-3B": "20th of next month",
            },
        }
    except Exception as e:
        return {"error": str(e)}


def check_tds_compliance(
    payments_made: str,
    tds_deducted: float,
    tds_deposited: float,
    current_quarter: str,
) -> dict[str, Any]:
    """
    Check TDS (Tax Deducted at Source) compliance.
    
    Args:
        payments_made: JSON string of payments requiring TDS
            Example: [{"type": "salary", "amount": 500000}, {"type": "rent", "amount": 50000}]
        tds_deducted: Total TDS deducted
        tds_deposited: Total TDS deposited with government
        current_quarter: Current quarter (e.g., "Q4-2024")
    
    Returns:
        dict with TDS compliance status
    """
    try:
        payments = json.loads(payments_made) if isinstance(payments_made, str) else payments_made
        
        # TDS rates by payment type
        tds_rates = {
            "salary": 0,  # Based on slab
            "rent": 10,
            "professional": 10,
            "contractor": 2,
            "interest": 10,
        }
        
        # Calculate expected TDS
        expected_tds = 0
        tds_breakdown = []
        
        for payment in payments:
            ptype = payment.get("type", "other").lower()
            amount = payment.get("amount", 0)
            rate = tds_rates.get(ptype, 10)
            expected = amount * rate / 100
            expected_tds += expected
            tds_breakdown.append({
                "type": ptype,
                "amount": amount,
                "rate": rate,
                "expected_tds": expected,
            })
        
        # Check compliance
        tds_pending = tds_deducted - tds_deposited
        deduction_gap = expected_tds - tds_deducted
        
        issues = []
        
        if tds_pending > 0:
            issues.append({
                "type": "TDS_DEPOSIT_PENDING",
                "severity": "HIGH",
                "details": f"₹{tds_pending:,.0f} TDS deducted but not deposited",
                "action": "Deposit TDS before 7th of next month",
                "penalty_risk": "1.5% per month interest",
            })
        
        if deduction_gap > 1000:  # Allow small variance
            issues.append({
                "type": "TDS_UNDERDEDUCTED",
                "severity": "MEDIUM",
                "details": f"Potential under-deduction of ₹{deduction_gap:,.0f}",
                "action": "Review TDS deductions for compliance",
            })
        
        status = "COMPLIANT" if not issues else "NON_COMPLIANT"
        
        return {
            "compliance_status": status,
            "current_quarter": current_quarter,
            "tds_summary": {
                "expected": round(expected_tds, 0),
                "deducted": tds_deducted,
                "deposited": tds_deposited,
                "pending_deposit": tds_pending,
            },
            "breakdown": tds_breakdown,
            "issues": issues,
            "deadlines": {
                "monthly_deposit": "7th of next month",
                "quarterly_return_24Q": "31st of month following quarter",
                "quarterly_return_26Q": "31st of month following quarter",
            },
        }
    except Exception as e:
        return {"error": str(e)}


def check_income_tax_compliance(
    entity_type: str,
    annual_income: float,
    advance_tax_paid: float,
    tax_liability_estimate: float,
    financial_year: str,
) -> dict[str, Any]:
    """
    Check income tax and advance tax compliance.
    
    Args:
        entity_type: 'individual' or 'company'
        annual_income: Annual taxable income
        advance_tax_paid: Advance tax already paid
        tax_liability_estimate: Estimated total tax liability
        financial_year: Financial year (e.g., "2024-25")
    
    Returns:
        dict with income tax compliance status
    """
    # Advance tax due dates and percentages
    advance_tax_schedule = [
        {"due_date": "June 15", "cumulative_percent": 15},
        {"due_date": "September 15", "cumulative_percent": 45},
        {"due_date": "December 15", "cumulative_percent": 75},
        {"due_date": "March 15", "cumulative_percent": 100},
    ]
    
    # Determine current quarter and expected payment
    current_month = datetime.now().month
    expected_percent = 0
    next_due = None
    
    for schedule in advance_tax_schedule:
        if current_month <= int(schedule["due_date"].split()[0][:2]) or schedule["due_date"].startswith("March"):
            next_due = schedule
            break
        expected_percent = schedule["cumulative_percent"]
    
    expected_paid = tax_liability_estimate * expected_percent / 100
    shortfall = max(0, expected_paid - advance_tax_paid)
    
    issues = []
    
    if shortfall > 10000:  # Significant shortfall
        issues.append({
            "type": "ADVANCE_TAX_SHORTFALL",
            "severity": "MEDIUM",
            "details": f"Advance tax shortfall of ₹{shortfall:,.0f}",
            "action": f"Pay ₹{shortfall:,.0f} before {next_due['due_date'] if next_due else 'next due date'}",
            "penalty_risk": "Interest under section 234B/234C",
        })
    
    remaining_liability = tax_liability_estimate - advance_tax_paid
    
    # Filing deadline
    if entity_type == "individual":
        filing_deadline = "July 31"
        audit_deadline = "October 31"
    else:
        filing_deadline = "October 31"
        audit_deadline = "September 30"
    
    return {
        "entity_type": entity_type,
        "financial_year": financial_year,
        "compliance_status": "COMPLIANT" if not issues else "ATTENTION_NEEDED",
        "tax_summary": {
            "estimated_liability": tax_liability_estimate,
            "advance_tax_paid": advance_tax_paid,
            "remaining_liability": remaining_liability,
            "expected_paid_by_now": expected_paid,
            "shortfall": shortfall,
        },
        "advance_tax_schedule": advance_tax_schedule,
        "next_due": next_due,
        "issues": issues,
        "deadlines": {
            "return_filing": filing_deadline,
            "audit_report": audit_deadline if annual_income > 10000000 else "N/A",
        },
        "tax_saving_tips": [
            "Maximize 80C deductions (PPF, ELSS, LIC)",
            "Claim HRA if applicable",
            "Consider NPS for additional 50K deduction",
        ] if entity_type == "individual" else [],
    }


def detect_duplicate_payments(
    transactions: str,
) -> dict[str, Any]:
    """
    Detect potential duplicate payments in transaction data.
    
    Args:
        transactions: JSON string of transactions
            Example: [{"vendor": "ABC", "amount": 10000, "date": "2024-01-15", "ref": "INV001"}]
    
    Returns:
        dict with duplicate payment analysis
    """
    try:
        txns = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        # Group by vendor and amount
        groups: dict[str, list] = {}
        for txn in txns:
            key = f"{txn.get('vendor', 'unknown')}_{txn.get('amount', 0)}"
            if key not in groups:
                groups[key] = []
            groups[key].append(txn)
        
        # Find potential duplicates
        duplicates = []
        for key, txn_list in groups.items():
            if len(txn_list) > 1:
                # Check if they're within 30 days of each other
                dates = []
                for t in txn_list:
                    try:
                        dates.append(datetime.strptime(t.get("date", ""), "%Y-%m-%d"))
                    except:
                        pass
                
                if len(dates) >= 2:
                    dates.sort()
                    for i in range(1, len(dates)):
                        if (dates[i] - dates[i-1]).days <= 30:
                            duplicates.append({
                                "vendor": txn_list[0].get("vendor"),
                                "amount": txn_list[0].get("amount"),
                                "transactions": txn_list,
                                "days_apart": (dates[i] - dates[i-1]).days,
                                "risk_level": "HIGH" if (dates[i] - dates[i-1]).days <= 7 else "MEDIUM",
                            })
                            break
        
        total_duplicate_risk = sum(d["amount"] for d in duplicates)
        
        return {
            "total_transactions_analyzed": len(txns),
            "potential_duplicates_found": len(duplicates),
            "total_amount_at_risk": total_duplicate_risk,
            "duplicates": duplicates,
            "recommendations": [
                "Review flagged transactions with vendors",
                "Check invoice numbers for matches",
                "Implement duplicate detection before payment approval",
            ] if duplicates else ["No duplicate payments detected"],
            "compliance_status": "REVIEW_NEEDED" if duplicates else "CLEAN",
        }
    except Exception as e:
        return {"error": str(e)}


def generate_compliance_calendar(
    entity_type: str,
    has_gst: bool,
    has_employees: bool,
    months_ahead: int,
) -> dict[str, Any]:
    """
    Generate upcoming compliance deadlines calendar.
    
    Args:
        entity_type: 'individual' or 'company'
        has_gst: Whether entity has GST registration
        has_employees: Whether entity has employees (TDS obligations)
        months_ahead: Number of months to show (e.g., 3)
    
    Returns:
        dict with compliance calendar
    """
    deadlines = []
    today = datetime.now()
    
    for month_offset in range(months_ahead + 1):
        check_date = today + timedelta(days=30 * month_offset)
        month_name = check_date.strftime("%B %Y")
        
        month_deadlines = []
        
        if has_gst:
            month_deadlines.append({
                "due_date": f"11th {month_name}",
                "task": "GSTR-1 Filing",
                "category": "GST",
                "penalty": "₹200/day (max ₹5000)",
            })
            month_deadlines.append({
                "due_date": f"20th {month_name}",
                "task": "GSTR-3B Filing",
                "category": "GST",
                "penalty": "₹50/day + 18% interest",
            })
        
        if has_employees:
            month_deadlines.append({
                "due_date": f"7th {month_name}",
                "task": "TDS Payment",
                "category": "TDS",
                "penalty": "1.5% per month interest",
            })
            month_deadlines.append({
                "due_date": f"15th {month_name}",
                "task": "PF/ESI Payment",
                "category": "Payroll",
                "penalty": "12% interest + damages",
            })
        
        # Quarterly deadlines
        if check_date.month in [7, 10, 1, 4]:  # Quarter ends
            if has_employees:
                month_deadlines.append({
                    "due_date": f"31st {month_name}",
                    "task": "TDS Quarterly Return",
                    "category": "TDS",
                    "penalty": "₹200/day",
                })
        
        # Advance tax deadlines
        if check_date.month in [6, 9, 12, 3]:
            month_deadlines.append({
                "due_date": f"15th {month_name}",
                "task": "Advance Tax Installment",
                "category": "Income Tax",
                "penalty": "Interest under 234B/C",
            })
        
        if month_deadlines:
            deadlines.append({
                "month": month_name,
                "deadlines": month_deadlines,
            })
    
    # Count by category
    all_tasks = [d for m in deadlines for d in m["deadlines"]]
    category_counts = {}
    for task in all_tasks:
        cat = task["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    return {
        "entity_type": entity_type,
        "gst_registered": has_gst,
        "has_employees": has_employees,
        "calendar": deadlines,
        "summary": {
            "total_deadlines": len(all_tasks),
            "by_category": category_counts,
        },
        "tips": [
            "Set reminders 3 days before each deadline",
            "Maintain a compliance tracker spreadsheet",
            "Consider a compliance management tool",
        ],
    }


# =============================================================================
# COMPLIANCE AGENT DEFINITION
# =============================================================================

COMPLIANCE_AGENT_INSTRUCTION = """You are the Compliance Agent for CFOSync - an AI CFO platform.

Your role is to monitor and ensure financial compliance with regulations.

## Key Compliance Areas:
1. **GST Compliance** - Filing status, payments, reconciliation
2. **TDS Compliance** - Deduction, deposit, returns
3. **Income Tax** - Advance tax, filing deadlines
4. **Fraud Prevention** - Duplicate payments, suspicious transactions
5. **Regulatory Calendar** - Track all deadlines

## Compliance Status Levels:
- COMPLIANT: All requirements met
- ATTENTION_NEEDED: Action required soon
- NON_COMPLIANT: Immediate action required
- REVIEW_NEEDED: Manual review recommended

## Guidelines:
- Be precise with deadlines and penalties
- Provide specific action items
- Quantify penalty risks
- Prioritize by urgency
- Include relevant sections/forms"""


def create_compliance_agent() -> Agent:
    """Create the Compliance Agent with all its tools."""
    return create_agent(
        name="compliance_agent",
        description="Monitors financial compliance, tax obligations, and regulatory requirements",
        instruction=COMPLIANCE_AGENT_INSTRUCTION,
        tools=[
            check_gst_compliance,
            check_tds_compliance,
            check_income_tax_compliance,
            detect_duplicate_payments,
            generate_compliance_calendar,
        ],
    )


def get_compliance_runner() -> AgentRunner:
    """Get a runner instance for the Compliance Agent."""
    return AgentRunner(create_compliance_agent())
