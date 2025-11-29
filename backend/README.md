# 💰 CFOSync

<div align="center">

**AI-Powered CFO & Financial Planner**

Built with Google Agent Development Kit (ADK), Gemini AI, React, and FastAPI

</div>

---

## 🌟 Overview

CFOSync is an intelligent financial management platform that serves as your personal AI CFO.  It leverages Google's Agent Development Kit (ADK) and Gemini AI to provide comprehensive financial insights, risk analysis, cash flow predictions, and strategic financial planning for both individuals and businesses.

## ✨ Features

- 🤖 **Multi-Agent AI System** - 11 specialized agents working together for comprehensive financial analysis
- 📊 **Financial Insights** - Automated spending analysis and trend detection
- ⚠️ **Risk Detection** - Identify overspending, fraud, and financial risks
- 📈 **Cash Flow Prediction** - AI-powered cash flow forecasting
- 🎯 **Goal Planning** - Personalized budgets and financial plans
- 🔮 **What-If Simulations** - Run financial scenarios and projections
- 📄 **Document Processing** - Extract data from bank statements and invoices
- 🔔 **Smart Nudges** - Proactive alerts and notifications
- 📋 **Compliance Monitoring** - Tax and regulatory compliance tracking
- 💼 **Investment Insights** - Real-time market data via yfinance integration

## 🏗️ Architecture

```
CfoSync/
├── backend/                    # FastAPI + Google ADK Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Environment configuration
│   │   ├── main.py            # FastAPI application
│   │   └── agents/            # AI Agent modules
│   │       ├── __init__.py    # Agent registry
│   │       ├── base. py        # Base agent with ADK + Gemini
│   │       ├── profile_agent.py
│   │       ├── insights_agent.py
│   │       ├── risk_agent.py
│   │       ├── planning_agent.py
│   │       ├── simulation_agent.py
│   │       ├── cashflow_agent.py
│   │       ├── cfo_strategy_agent.py
│   │       ├── nudge_agent.py
│   │       ├── compliance_agent.py
│   │       ├── document_agent.py
│   │       └── coordinator_agent.py
│   ├── requirements.txt
│   ├── . env. example
│   └── README.md
├── frontend/                   # React + TypeScript Frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── sample-data/               # Sample bank statements for testing
│   ├── bank_statement_checking.csv
│   ├── bank_statement_savings.csv
│   ├── credit_card_statement. csv
│   ├── bank_statement_formatted.txt
│   ├── company_bank_statement.csv
│   └── README.md
└── . gitignore
```

## 🚀 Quick Start

### Prerequisites

- Python 3. 9+
- Node.js 18+
- Google API Key (Gemini)
- Firebase Project (for authentication)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Get Google API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your backend `. env` file

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google AI API key | Required |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2. 0-flash` |
| `HOST` | Server host | `0. 0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |

## 📡 API Endpoints

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server status |
| GET | `/health` | Health check with model info |
| GET | `/agents` | List all available agents |

### Agent Invocation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/{agent_name}/invoke` | Invoke a specific agent |

#### Request Example

```json
{
  "user_id": "user_123",
  "message": "Analyze my spending patterns",
  "context": {
    "user_type": "individual",
    "monthly_income": 100000
  }
}
```

#### Response Example

```json
{
  "agent": "insights",
  "response": "Based on your transaction data.. .",
  "data": {
    "insights_generated": true,
    "analysis_period": "last_month"
  }
}
```

## 🤖 AI Agents

| Agent | Purpose |
|-------|---------|
| `profile` | Builds user/company financial profiles |
| `document` | Extracts data from bank statements, invoices |
| `insights` | Generates analytics and spending trends |
| `risk` | Detects overspending, fraud, risks |
| `planning` | Creates budgets and financial plans |
| `simulation` | Runs what-if scenarios |
| `cashflow` | Predicts and manages cash flow |
| `cfo_strategy` | High-level business financial strategy |
| `nudge` | Generates alerts and notifications |
| `compliance` | Monitors tax and regulatory compliance |
| `coordinator` | Orchestrates multi-agent workflows |

## 🧪 Example Usage

### Profile Agent

```bash
curl -X POST "http://localhost:8000/agents/profile/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "message": "Build my financial profile based on this data",
    "context": {
      "user_type": "individual",
      "monthly_income": 75000,
      "monthly_expenses": 45000,
      "debts": ["car_loan", "credit_card"],
      "goals": ["emergency_fund", "vacation"]
    }
  }'
```

### What-If Simulation

```bash
curl -X POST "http://localhost:8000/agents/simulation/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "message": "What if I invest 10000 per month in SIP for 5 years? ",
    "context": {
      "current_savings": 50000,
      "risk_profile": "moderate"
    }
  }'
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **Google ADK** - Agent Development Kit for AI agents
- **Google Gemini** - Large language model for AI processing
- **Firebase Admin** - Authentication and database
- **yfinance** - Real-time market and investment data
- **Pandas & NumPy** - Data processing and analysis

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Recharts** - Charting library
- **Framer Motion** - Animation library
- **React Router** - Client-side routing

## 📁 Sample Data

The `sample-data/` directory contains test files for development:

**Individual Users:**
- `bank_statement_checking. csv` - Monthly checking account transactions
- `bank_statement_savings.csv` - Savings account with interest earnings
- `credit_card_statement.csv` - Credit card purchases and payments
- `bank_statement_formatted.txt` - Formatted bank statement document

**Business:**
- `company_bank_statement.csv` - Business transactions (revenue, payroll, expenses)

## 📚 Resources

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [ADK Quickstart](https://google.github.io/adk-docs/get-started/quickstart/)
- [Gemini API](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react. dev)


