"""
Nudge Agent - Sends alerts, notifications, and reminders using Google ADK.

This agent generates personalized financial nudges and notifications.
"""

import json
from typing import Any
from datetime import datetime
from app.agents.base import Agent

from app.agents.base import create_agent, AgentRunner


# =============================================================================
# NUDGE AGENT TOOLS
# =============================================================================

def generate_overspending_alert(
    category: str,
    budget: float,
    spent: float,
    days_remaining: int,
) -> dict[str, Any]:
    """
    Generate an overspending alert message.
    
    Args:
        category: Spending category (e.g., "food", "entertainment")
        budget: Budget for the category
        spent: Amount already spent
        days_remaining: Days remaining in the budget period
    
    Returns:
        dict with alert messages for different channels
    """
    overage = spent - budget
    overage_percent = (overage / budget * 100) if budget > 0 else 0
    
    # Determine severity
    if overage_percent > 30:
        severity = "HIGH"
        emoji = "🚨"
    elif overage_percent > 15:
        severity = "MEDIUM"
        emoji = "⚠️"
    else:
        severity = "LOW"
        emoji = "📊"
    
    # Generate messages for different channels
    messages = {
        "push_notification": {
            "title": f"{emoji} {category.title()} Budget Alert",
            "body": f"You've exceeded your {category} budget by ₹{overage:,.0f}",
            "action": "Review spending",
        },
        "whatsapp": f"""{emoji} *Budget Alert: {category.title()}*

You've spent ₹{spent:,.0f} against a budget of ₹{budget:,.0f}.

That's ₹{overage:,.0f} ({overage_percent:.0f}%) over budget with {days_remaining} days left.

💡 *Tip:* Consider limiting {category} spending for the rest of the month.

Reply "PLAN" for a revised budget.""",
        "email": {
            "subject": f"[CFOSync] {category.title()} Budget Exceeded",
            "body": f"""Hi,

This is an alert about your {category} spending.

📊 **Budget Summary**
- Budget: ₹{budget:,.0f}
- Spent: ₹{spent:,.0f}
- Over by: ₹{overage:,.0f} ({overage_percent:.0f}%)
- Days remaining: {days_remaining}

**Recommended Action:**
Consider pausing non-essential {category} spending for the rest of the month.

View your full spending breakdown in the CFOSync app.

Best,
CFOSync AI""",
        },
        "in_app": {
            "type": "budget_alert",
            "severity": severity,
            "category": category,
            "message": f"Over budget by ₹{overage:,.0f}",
            "cta": "View Details",
        },
    }
    
    return {
        "alert_type": "overspending",
        "severity": severity,
        "category": category,
        "data": {
            "budget": budget,
            "spent": spent,
            "overage": overage,
            "overage_percent": round(overage_percent, 1),
            "days_remaining": days_remaining,
        },
        "messages": messages,
    }


def generate_goal_progress_update(
    goal_name: str,
    target_amount: float,
    current_amount: float,
    target_date: str,
    recent_contribution: float,
) -> dict[str, Any]:
    """
    Generate a goal progress update notification.
    
    Args:
        goal_name: Name of the financial goal
        target_amount: Target amount for the goal
        current_amount: Current saved amount
        target_date: Target completion date (YYYY-MM-DD)
        recent_contribution: Most recent contribution amount (use 0 if none)
    
    Returns:
        dict with progress update messages
    """
    progress_percent = (current_amount / target_amount * 100) if target_amount > 0 else 0
    remaining = target_amount - current_amount
    
    # Calculate if on track
    try:
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
        days_remaining = (target_dt - datetime.now()).days
        months_remaining = max(1, days_remaining / 30)
        required_monthly = remaining / months_remaining
    except:
        days_remaining = 0
        required_monthly = remaining
    
    # Determine status
    if progress_percent >= 100:
        status = "ACHIEVED"
        emoji = "🎉"
        tone = "celebration"
    elif progress_percent >= 75:
        status = "ALMOST_THERE"
        emoji = "🌟"
        tone = "encouraging"
    elif progress_percent >= 50:
        status = "HALFWAY"
        emoji = "💪"
        tone = "motivating"
    elif progress_percent >= 25:
        status = "PROGRESSING"
        emoji = "📈"
        tone = "supportive"
    else:
        status = "STARTED"
        emoji = "🚀"
        tone = "encouraging"
    
    messages = {
        "push_notification": {
            "title": f"{emoji} {goal_name} Progress",
            "body": f"You're {progress_percent:.0f}% towards your goal!" + (f" Great job on the ₹{recent_contribution:,.0f} contribution!" if recent_contribution > 0 else ""),
        },
        "whatsapp": f"""{emoji} *Goal Update: {goal_name}*

{"🎉 Congratulations! You've achieved your goal!" if status == "ACHIEVED" else f"You're *{progress_percent:.0f}%* of the way there!"}

💰 Saved: ₹{current_amount:,.0f} / ₹{target_amount:,.0f}
{"✅ GOAL ACHIEVED!" if status == "ACHIEVED" else f"📅 {days_remaining} days to target date"}
{f"📊 Need ₹{required_monthly:,.0f}/month to stay on track" if status != "ACHIEVED" else ""}

{f"🌟 Recent contribution: ₹{recent_contribution:,.0f}" if recent_contribution > 0 else "Keep going! Every bit counts."}

Reply "ADD" to log a new contribution.""",
        "email": {
            "subject": f"[CFOSync] {goal_name}: {progress_percent:.0f}% Complete" + (" 🎉" if status == "ACHIEVED" else ""),
            "body": f"""Hi,

Here's your progress update for **{goal_name}**.

{"## 🎉 Congratulations!" if status == "ACHIEVED" else "## Progress Summary"}

| Metric | Value |
|--------|-------|
| Target | ₹{target_amount:,.0f} |
| Saved | ₹{current_amount:,.0f} |
| Progress | {progress_percent:.0f}% |
| Remaining | ₹{remaining:,.0f} |

{f"**Monthly target to stay on track:** ₹{required_monthly:,.0f}" if status != "ACHIEVED" else "You've done it! Time to set a new goal."}

{f"**Recent contribution:** ₹{recent_contribution:,.0f} - Great job!" if recent_contribution > 0 else ""}

Keep up the great work!

Best,
CFOSync AI""",
        },
        "in_app": {
            "type": "goal_progress",
            "goal_name": goal_name,
            "progress_percent": round(progress_percent, 1),
            "status": status,
            "cta": "View Goal" if status != "ACHIEVED" else "Set New Goal",
        },
    }
    
    return {
        "alert_type": "goal_progress",
        "status": status,
        "tone": tone,
        "data": {
            "goal_name": goal_name,
            "target_amount": target_amount,
            "current_amount": current_amount,
            "progress_percent": round(progress_percent, 1),
            "remaining": remaining,
            "days_remaining": days_remaining,
            "required_monthly": round(required_monthly, 0),
        },
        "messages": messages,
    }


def generate_savings_nudge(
    current_savings_rate: float,
    target_savings_rate: float,
    monthly_income: float,
    streak_days: int,
) -> dict[str, Any]:
    """
    Generate a savings encouragement nudge.
    
    Args:
        current_savings_rate: Current savings rate (0-100)
        target_savings_rate: Target savings rate (0-100)
        monthly_income: Monthly income
        streak_days: Days of meeting savings targets (use 0 if none)
    
    Returns:
        dict with savings nudge messages
    """
    gap = target_savings_rate - current_savings_rate
    additional_savings_needed = monthly_income * (gap / 100)
    
    # Determine nudge type
    if current_savings_rate >= target_savings_rate:
        nudge_type = "CELEBRATION"
        emoji = "🎊"
    elif gap <= 5:
        nudge_type = "ALMOST_THERE"
        emoji = "💫"
    elif gap <= 10:
        nudge_type = "ENCOURAGEMENT"
        emoji = "💪"
    else:
        nudge_type = "MOTIVATION"
        emoji = "🎯"
    
    streak_message = f"🔥 {streak_days}-day streak!" if streak_days > 0 else ""
    
    messages = {
        "push_notification": {
            "title": f"{emoji} Savings Check-in",
            "body": f"You're saving {current_savings_rate:.0f}% of your income. " + 
                   (f"Just ₹{additional_savings_needed:,.0f} more to hit your target!" if gap > 0 else "You're crushing it! 🎉"),
        },
        "whatsapp": f"""{emoji} *Savings Check-in*

Current savings rate: *{current_savings_rate:.0f}%*
Target: {target_savings_rate:.0f}%
{streak_message}

{f"💡 *Quick Win:* Save just ₹{additional_savings_needed:,.0f} more this month to hit your target. That's ₹{additional_savings_needed/30:,.0f}/day!" if gap > 0 else "🌟 Amazing! You're exceeding your savings target!"}

Small changes add up. Try:
• Pack lunch twice this week
• Skip one takeout coffee
• Cancel an unused subscription

Reply "TIPS" for more saving ideas.""",
        "email": {
            "subject": f"[CFOSync] Your Savings Rate: {current_savings_rate:.0f}%",
            "body": f"""Hi,

Quick check-in on your savings progress:

📊 **Current Savings Rate:** {current_savings_rate:.0f}%
🎯 **Target:** {target_savings_rate:.0f}%
{f"🔥 **Streak:** {streak_days} days" if streak_days > 0 else ""}

{f"**To reach your target, save an additional ₹{additional_savings_needed:,.0f} this month.**" if gap > 0 else "**You're exceeding your savings target! Fantastic work!**"}

**Quick Savings Tips:**
1. Review subscriptions - cancel what you don't use
2. Try a no-spend day once a week
3. Automate transfers to savings on payday

Keep building that financial future!

Best,
CFOSync AI""",
        },
        "in_app": {
            "type": "savings_nudge",
            "nudge_type": nudge_type,
            "current_rate": current_savings_rate,
            "target_rate": target_savings_rate,
            "cta": "View Savings Tips",
        },
    }
    
    return {
        "alert_type": "savings_nudge",
        "nudge_type": nudge_type,
        "data": {
            "current_savings_rate": current_savings_rate,
            "target_savings_rate": target_savings_rate,
            "gap_percent": gap,
            "additional_needed": round(additional_savings_needed, 0),
            "streak_days": streak_days,
        },
        "messages": messages,
    }


def generate_bill_reminder(
    bill_name: str,
    amount: float,
    due_date: str,
    days_until_due: int,
    is_recurring: bool,
) -> dict[str, Any]:
    """
    Generate a bill payment reminder.
    
    Args:
        bill_name: Name of the bill (e.g., "Rent", "Netflix")
        amount: Bill amount
        due_date: Due date string
        days_until_due: Days until the bill is due
        is_recurring: Whether this is a recurring bill (true/false)
    
    Returns:
        dict with bill reminder messages
    """
    # Determine urgency
    if days_until_due <= 0:
        urgency = "OVERDUE"
        emoji = "🚨"
    elif days_until_due <= 2:
        urgency = "URGENT"
        emoji = "⏰"
    elif days_until_due <= 5:
        urgency = "UPCOMING"
        emoji = "📅"
    else:
        urgency = "REMINDER"
        emoji = "💳"
    
    messages = {
        "push_notification": {
            "title": f"{emoji} {bill_name} {'Overdue!' if urgency == 'OVERDUE' else 'Due Soon'}",
            "body": f"₹{amount:,.0f} due {'now' if urgency == 'OVERDUE' else f'in {days_until_due} days'}",
            "action": "Pay Now",
        },
        "whatsapp": f"""{emoji} *Bill Reminder: {bill_name}*

💰 Amount: ₹{amount:,.0f}
📅 Due: {due_date} {'(OVERDUE!)' if urgency == 'OVERDUE' else f'({days_until_due} days)'}

{f"⚠️ This bill is overdue. Please pay immediately to avoid late fees." if urgency == "OVERDUE" else f"Set a reminder or pay now to avoid missing the deadline."}

Reply "PAID" to mark as paid.""",
        "email": {
            "subject": f"[CFOSync] {'⚠️ OVERDUE: ' if urgency == 'OVERDUE' else ''}{bill_name} - ₹{amount:,.0f} Due",
            "body": f"""Hi,

This is a reminder about your upcoming bill:

📋 **Bill:** {bill_name}
💰 **Amount:** ₹{amount:,.0f}
📅 **Due Date:** {due_date}
⏰ **Status:** {urgency}

{'⚠️ **This bill is overdue. Please pay immediately to avoid late fees or service interruption.**' if urgency == 'OVERDUE' else ''}

[Pay Now] | [Mark as Paid] | [Snooze Reminder]

Best,
CFOSync AI""",
        },
        "in_app": {
            "type": "bill_reminder",
            "urgency": urgency,
            "bill_name": bill_name,
            "amount": amount,
            "cta": "Pay Now",
        },
    }
    
    return {
        "alert_type": "bill_reminder",
        "urgency": urgency,
        "data": {
            "bill_name": bill_name,
            "amount": amount,
            "due_date": due_date,
            "days_until_due": days_until_due,
            "is_recurring": is_recurring,
        },
        "messages": messages,
    }


def generate_weekly_summary(
    week_spending: float,
    week_budget: float,
    top_categories: str,
    savings_this_week: float,
    comparison_to_last_week: float,
) -> dict[str, Any]:
    """
    Generate a weekly financial summary.
    
    Args:
        week_spending: Total spending this week
        week_budget: Budget for the week
        top_categories: JSON string of top spending categories
        savings_this_week: Amount saved this week
        comparison_to_last_week: Percentage change from last week
    
    Returns:
        dict with weekly summary messages
    """
    try:
        categories = json.loads(top_categories) if isinstance(top_categories, str) else top_categories
    except:
        categories = {}
    
    budget_status = "UNDER" if week_spending <= week_budget else "OVER"
    budget_diff = abs(week_spending - week_budget)
    
    trend_emoji = "📈" if comparison_to_last_week > 0 else "📉" if comparison_to_last_week < 0 else "➡️"
    
    # Format categories
    cat_list = "\n".join([f"• {cat}: ₹{amt:,.0f}" for cat, amt in list(categories.items())[:3]])
    
    messages = {
        "push_notification": {
            "title": "📊 Your Weekly Summary",
            "body": f"Spent ₹{week_spending:,.0f} ({budget_status.lower()} budget by ₹{budget_diff:,.0f})",
        },
        "whatsapp": f"""📊 *Weekly Financial Summary*

💰 *Spent:* ₹{week_spending:,.0f}
📋 *Budget:* ₹{week_budget:,.0f}
{"✅" if budget_status == "UNDER" else "⚠️"} *Status:* {budget_status} budget by ₹{budget_diff:,.0f}

*Top Spending:*
{cat_list}

💵 *Saved:* ₹{savings_this_week:,.0f}
{trend_emoji} *vs Last Week:* {comparison_to_last_week:+.1f}%

{"Great job staying within budget! 🎉" if budget_status == "UNDER" else "Let's aim to stay within budget next week! 💪"}

Reply "DETAILS" for full breakdown.""",
        "email": {
            "subject": f"[CFOSync] Weekly Summary: ₹{week_spending:,.0f} Spent",
            "body": f"""Hi,

Here's your weekly financial summary:

## 📊 Overview
| Metric | Amount |
|--------|--------|
| Spent | ₹{week_spending:,.0f} |
| Budget | ₹{week_budget:,.0f} |
| {budget_status} by | ₹{budget_diff:,.0f} |
| Saved | ₹{savings_this_week:,.0f} |
| vs Last Week | {comparison_to_last_week:+.1f}% |

## 🏷️ Top Categories
{cat_list}

{"**Great job staying within budget!** Keep it up! 🎉" if budget_status == "UNDER" else "**You went over budget this week.** Review your spending to find areas to cut back."}

View your detailed spending breakdown in the app.

Best,
CFOSync AI""",
        },
        "in_app": {
            "type": "weekly_summary",
            "budget_status": budget_status,
            "week_spending": week_spending,
            "cta": "View Details",
        },
    }
    
    return {
        "alert_type": "weekly_summary",
        "budget_status": budget_status,
        "data": {
            "week_spending": week_spending,
            "week_budget": week_budget,
            "budget_diff": budget_diff,
            "savings_this_week": savings_this_week,
            "comparison_to_last_week": comparison_to_last_week,
            "top_categories": categories,
        },
        "messages": messages,
    }


# =============================================================================
# NUDGE AGENT DEFINITION
# =============================================================================

NUDGE_AGENT_INSTRUCTION = """You are the Nudge Agent for CFOSync - an AI CFO platform.

Your role is to generate timely, personalized financial notifications and nudges.

## Nudge Types:
1. **Alerts** - Urgent notifications (overspending, low balance)
2. **Progress Updates** - Goal tracking and milestones
3. **Reminders** - Bills, deadlines, actions needed
4. **Encouragement** - Savings nudges, streak celebrations
5. **Summaries** - Weekly/monthly financial summaries

## Communication Principles:
1. Be timely and relevant
2. Use positive framing when possible
3. Include specific numbers
4. Provide clear action items
5. Don't overwhelm - prioritize

## Channels:
- Push notifications: Short, actionable
- WhatsApp: Conversational, emoji-friendly
- Email: Detailed, formatted
- In-app: Interactive with CTAs

## Tone Guidelines:
- Friendly and supportive
- Celebratory for achievements
- Firm but helpful for alerts
- Never judgmental or harsh"""


def create_nudge_agent() -> Agent:
    """Create the Nudge Agent with all its tools."""
    return create_agent(
        name="nudge_agent",
        description="Generates personalized financial nudges, alerts, and notifications",
        instruction=NUDGE_AGENT_INSTRUCTION,
        tools=[
            generate_overspending_alert,
            generate_goal_progress_update,
            generate_savings_nudge,
            generate_bill_reminder,
            generate_weekly_summary,
        ],
    )


def get_nudge_runner() -> AgentRunner:
    """Get a runner instance for the Nudge Agent."""
    return AgentRunner(create_nudge_agent())
