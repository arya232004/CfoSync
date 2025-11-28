"""
Document Agent - Extracts data from financial documents using Google ADK.

This agent processes bank statements, invoices, and other financial documents.
"""

import json
import re
from typing import Any
from datetime import datetime
from google.adk import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# DOCUMENT AGENT TOOLS
# =============================================================================

def parse_bank_statement_text(
    statement_text: str,
    bank_name: str,
) -> dict[str, Any]:
    """
    Parse bank statement text and extract transactions.
    
    Args:
        statement_text: Raw text extracted from bank statement
        bank_name: Name of the bank for format-specific parsing (e.g., "hdfc", "icici", "unknown")
    
    Returns:
        dict with extracted transactions and summary
    """
    # This is a simplified parser - in production, use OCR + ML models
    transactions = []
    
    # Common patterns for transaction extraction
    # Format: DATE | DESCRIPTION | DEBIT | CREDIT | BALANCE
    lines = statement_text.strip().split('\n')
    
    date_pattern = r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
    amount_pattern = r'[\d,]+\.?\d*'
    
    for line in lines:
        # Skip header lines
        if any(header in line.lower() for header in ['date', 'description', 'opening balance', 'closing balance']):
            continue
        
        # Try to extract date
        date_match = re.search(date_pattern, line)
        if not date_match:
            continue
        
        # Extract amounts (look for numbers)
        amounts = re.findall(amount_pattern, line)
        amounts = [float(a.replace(',', '')) for a in amounts if a]
        
        if len(amounts) >= 1:
            # Try to determine if debit or credit
            line_lower = line.lower()
            is_debit = any(word in line_lower for word in ['debit', 'dr', 'withdrawal', 'payment', 'purchase'])
            is_credit = any(word in line_lower for word in ['credit', 'cr', 'deposit', 'salary', 'refund'])
            
            # Extract description (everything between date and amounts)
            description = re.sub(date_pattern, '', line)
            description = re.sub(amount_pattern, '', description)
            description = ' '.join(description.split())[:100]  # Clean and truncate
            
            transaction = {
                "date": date_match.group(1),
                "description": description,
                "amount": amounts[0],
                "type": "debit" if is_debit else "credit" if is_credit else "unknown",
                "category": categorize_transaction(description),
            }
            transactions.append(transaction)
    
    # Calculate summary
    total_credits = sum(t["amount"] for t in transactions if t["type"] == "credit")
    total_debits = sum(t["amount"] for t in transactions if t["type"] == "debit")
    
    return {
        "bank_name": bank_name,
        "transactions_found": len(transactions),
        "transactions": transactions[:50],  # Limit for response size
        "summary": {
            "total_credits": round(total_credits, 2),
            "total_debits": round(total_debits, 2),
            "net_flow": round(total_credits - total_debits, 2),
        },
        "parsing_confidence": "medium",  # In production, calculate actual confidence
        "notes": "Transactions may need manual review for accuracy",
    }


def categorize_transaction(description: str) -> str:
    """
    Categorize a transaction based on its description.
    
    Args:
        description: Transaction description text
    
    Returns:
        Category string
    """
    description = description.lower()
    
    categories = {
        "salary": ["salary", "payroll", "wages"],
        "rent": ["rent", "lease", "housing"],
        "utilities": ["electricity", "water", "gas", "utility", "power"],
        "groceries": ["grocery", "supermarket", "bigbasket", "grofers", "dmart"],
        "food": ["swiggy", "zomato", "restaurant", "cafe", "food", "dining"],
        "transport": ["uber", "ola", "petrol", "fuel", "metro", "bus", "parking"],
        "shopping": ["amazon", "flipkart", "myntra", "shopping", "retail"],
        "entertainment": ["netflix", "spotify", "hotstar", "movie", "game"],
        "healthcare": ["hospital", "pharmacy", "medical", "doctor", "health"],
        "insurance": ["insurance", "lic", "policy"],
        "investment": ["mutual fund", "sip", "investment", "stock", "zerodha"],
        "transfer": ["transfer", "upi", "neft", "imps", "rtgs"],
        "emi": ["emi", "loan", "instalment"],
        "subscription": ["subscription", "membership", "premium"],
    }
    
    for category, keywords in categories.items():
        if any(keyword in description for keyword in keywords):
            return category
    
    return "other"


def parse_invoice(
    invoice_text: str,
    document_type: str,
) -> dict[str, Any]:
    """
    Parse invoice/bill and extract structured data.
    
    Args:
        invoice_text: Raw text from invoice
        document_type: Type of document (invoice, bill, receipt)
    
    Returns:
        dict with extracted invoice data
    """
    result = {
        "document_type": document_type,
        "vendor": None,
        "invoice_number": None,
        "invoice_date": None,
        "due_date": None,
        "line_items": [],
        "subtotal": 0,
        "tax_amount": 0,
        "total_amount": 0,
        "gst_number": None,
        "currency": "INR",
    }
    
    text = invoice_text.strip()
    
    # Extract invoice number
    inv_patterns = [
        r'invoice\s*(?:no|number|#)?[:\s]*([A-Z0-9/-]+)',
        r'bill\s*(?:no|number|#)?[:\s]*([A-Z0-9/-]+)',
        r'receipt\s*(?:no|number|#)?[:\s]*([A-Z0-9/-]+)',
    ]
    for pattern in inv_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["invoice_number"] = match.group(1)
            break
    
    # Extract GST number
    gst_pattern = r'(?:GST|GSTIN)[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})'
    gst_match = re.search(gst_pattern, text, re.IGNORECASE)
    if gst_match:
        result["gst_number"] = gst_match.group(1)
    
    # Extract dates
    date_pattern = r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
    dates = re.findall(date_pattern, text)
    if dates:
        result["invoice_date"] = dates[0]
        if len(dates) > 1:
            result["due_date"] = dates[1]
    
    # Extract amounts
    total_patterns = [
        r'total[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)',
        r'grand\s*total[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)',
        r'amount\s*(?:due|payable)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)',
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["total_amount"] = float(match.group(1).replace(',', ''))
            break
    
    # Extract tax
    tax_patterns = [
        r'(?:gst|tax|igst|cgst|sgst)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)',
    ]
    for pattern in tax_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["tax_amount"] = float(match.group(1).replace(',', ''))
            break
    
    # Calculate subtotal
    if result["total_amount"] and result["tax_amount"]:
        result["subtotal"] = result["total_amount"] - result["tax_amount"]
    
    result["extraction_confidence"] = "medium"
    result["requires_review"] = True
    
    return result


def extract_salary_slip_data(
    salary_slip_text: str,
) -> dict[str, Any]:
    """
    Extract data from salary slip.
    
    Args:
        salary_slip_text: Raw text from salary slip
    
    Returns:
        dict with salary components
    """
    result = {
        "employee_name": None,
        "employee_id": None,
        "month": None,
        "earnings": {},
        "deductions": {},
        "gross_salary": 0,
        "total_deductions": 0,
        "net_salary": 0,
    }
    
    text = salary_slip_text.strip()
    
    # Common earnings components
    earning_patterns = {
        "basic": r'basic\s*(?:salary)?[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "hra": r'(?:hra|house\s*rent)[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "da": r'(?:da|dearness)[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "special_allowance": r'(?:special|other)\s*allowance[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "conveyance": r'conveyance[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "medical": r'medical[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
    }
    
    for component, pattern in earning_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["earnings"][component] = float(match.group(1).replace(',', ''))
    
    # Common deductions
    deduction_patterns = {
        "pf": r'(?:pf|provident\s*fund)[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "professional_tax": r'(?:professional|pt)\s*tax[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "income_tax": r'(?:income\s*tax|tds)[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
        "esi": r'esi[:\s]*(?:₹|rs\.?)?\s*([\d,]+)',
    }
    
    for component, pattern in deduction_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["deductions"][component] = float(match.group(1).replace(',', ''))
    
    # Calculate totals
    result["gross_salary"] = sum(result["earnings"].values())
    result["total_deductions"] = sum(result["deductions"].values())
    result["net_salary"] = result["gross_salary"] - result["total_deductions"]
    
    # Extract month/year
    month_pattern = r'(?:month|period)[:\s]*([a-zA-Z]+\s*\d{4}|\d{1,2}[-/]\d{4})'
    month_match = re.search(month_pattern, text, re.IGNORECASE)
    if month_match:
        result["month"] = month_match.group(1)
    
    return result


def normalize_transaction_data(
    transactions: str,
    date_format: str,
) -> dict[str, Any]:
    """
    Normalize and clean transaction data for consistency.
    
    Args:
        transactions: JSON string of transactions
        date_format: Target date format (e.g., "%Y-%m-%d")
    
    Returns:
        dict with normalized transactions
    """
    try:
        txns = json.loads(transactions) if isinstance(transactions, str) else transactions
        
        normalized = []
        issues = []
        
        for i, txn in enumerate(txns):
            norm_txn = {}
            
            # Normalize date
            date_str = txn.get("date", "")
            if date_str:
                # Try various date formats
                for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%y"]:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        norm_txn["date"] = dt.strftime(date_format)
                        break
                    except:
                        continue
                else:
                    norm_txn["date"] = date_str
                    issues.append(f"Transaction {i}: Could not parse date '{date_str}'")
            
            # Normalize amount
            amount = txn.get("amount", 0)
            if isinstance(amount, str):
                amount = float(amount.replace(',', '').replace('₹', '').strip())
            norm_txn["amount"] = round(abs(amount), 2)
            
            # Normalize type
            txn_type = txn.get("type", "").lower()
            if txn_type in ["dr", "debit", "withdrawal", "payment"]:
                norm_txn["type"] = "debit"
            elif txn_type in ["cr", "credit", "deposit", "receipt"]:
                norm_txn["type"] = "credit"
            else:
                norm_txn["type"] = txn_type or "unknown"
            
            # Clean description
            description = txn.get("description", "")
            norm_txn["description"] = ' '.join(description.split())[:200]
            
            # Copy category or auto-categorize
            norm_txn["category"] = txn.get("category") or categorize_transaction(description)
            
            # Add original reference
            norm_txn["original_reference"] = txn.get("reference", txn.get("ref", None))
            
            normalized.append(norm_txn)
        
        return {
            "normalized_transactions": normalized,
            "total_transactions": len(normalized),
            "issues_found": len(issues),
            "issues": issues[:10],  # First 10 issues
            "normalization_stats": {
                "dates_parsed": len([t for t in normalized if t.get("date")]),
                "amounts_normalized": len([t for t in normalized if t.get("amount", 0) > 0]),
                "auto_categorized": len([t for t in normalized if t.get("category") != "other"]),
            },
        }
    except Exception as e:
        return {"error": str(e)}


def validate_gst_number(gst_number: str) -> dict[str, Any]:
    """
    Validate GST number format and extract information.
    
    Args:
        gst_number: GST identification number
    
    Returns:
        dict with validation result and decoded information
    """
    gst_number = gst_number.strip().upper()
    
    # GST format: 2 digit state code + 10 digit PAN + 1 entity code + 1 Z + 1 check digit
    gst_pattern = r'^([0-9]{2})([A-Z]{5}[0-9]{4}[A-Z]{1})([0-9A-Z]{1})(Z)([0-9A-Z]{1})$'
    
    match = re.match(gst_pattern, gst_number)
    
    if not match:
        return {
            "is_valid": False,
            "gst_number": gst_number,
            "error": "Invalid GST format",
            "expected_format": "22AAAAA0000A1Z5",
        }
    
    state_code = match.group(1)
    pan = match.group(2)
    entity_code = match.group(3)
    check_digit = match.group(5)
    
    # State codes mapping (partial)
    state_codes = {
        "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
        "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
        "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
        "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
        "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
        "16": "Tripura", "17": "Meghalaya", "18": "Assam",
        "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
        "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
        "27": "Maharashtra", "29": "Karnataka", "32": "Kerala",
        "33": "Tamil Nadu", "36": "Telangana", "37": "Andhra Pradesh",
    }
    
    state_name = state_codes.get(state_code, "Unknown State")
    
    return {
        "is_valid": True,
        "gst_number": gst_number,
        "decoded": {
            "state_code": state_code,
            "state_name": state_name,
            "pan": pan,
            "entity_code": entity_code,
            "check_digit": check_digit,
        },
        "entity_type": {
            "1": "Proprietorship",
            "2": "Partnership",
            "3": "Trust",
            "4": "Private Limited",
            "5": "Public Limited",
            "6": "Government",
            "7": "Casual Taxable Person",
        }.get(entity_code, "Unknown"),
    }


# =============================================================================
# DOCUMENT AGENT DEFINITION
# =============================================================================

DOCUMENT_AGENT_INSTRUCTION = """You are the Document Agent for CFOSync - an AI CFO platform.

Your role is to extract and process data from financial documents.

## Document Types You Handle:
1. **Bank Statements** - Extract transactions, categorize, summarize
2. **Invoices/Bills** - Extract vendor, amounts, taxes, line items
3. **Salary Slips** - Extract earnings, deductions, net pay
4. **GST Returns** - Parse tax data, reconcile
5. **P&L Statements** - Extract financial metrics

## Extraction Guidelines:
1. Maintain original values and currency
2. Standardize date formats to YYYY-MM-DD
3. Normalize merchant/vendor names
4. Auto-categorize transactions where possible
5. Flag uncertain extractions for review
6. Validate GST numbers and other identifiers

## Output Format:
- Always return structured JSON
- Include confidence scores
- Flag items needing manual review
- Provide extraction summary"""


def create_document_agent() -> Agent:
    """Create the Document Agent with all its tools."""
    return create_agent(
        name="document_agent",
        description="Extracts and processes data from bank statements, invoices, and financial documents",
        instruction=DOCUMENT_AGENT_INSTRUCTION,
        tools=[
            parse_bank_statement_text,
            parse_invoice,
            extract_salary_slip_data,
            normalize_transaction_data,
            validate_gst_number,
        ],
    )


def get_document_runner() -> AgentRunner:
    """Get a runner instance for the Document Agent."""
    return AgentRunner(create_document_agent())
