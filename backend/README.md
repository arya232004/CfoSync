# CFOSync Backend

AI CFO + Financial Planner powered by **Google Agent Development Kit (ADK)** and **Gemini**.

## 🏗️ Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # Environment configuration
│   ├── main.py            # FastAPI application
│   └── agents/
│       ├── __init__.py    # Agent registry
│       ├── base.py        # Base agent with ADK + Gemini
│       ├── profile_agent.py
│       ├── insights_agent.py
│       ├── risk_agent.py
│       ├── planning_agent.py
│       ├── simulation_agent.py
│       ├── cashflow_agent.py
│       ├── cfo_strategy_agent.py
│       ├── nudge_agent.py
│       ├── compliance_agent.py
│       ├── document_agent.py
│       └── coordinator_agent.py
├── requirements.txt
├── .env.example
└── README.md
```

## 🚀 Quick Start

### 1. Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Google API key
# GOOGLE_API_KEY=your-api-key-here
```

### 4. Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

### 5. Run the server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python -m app.main
```

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

#### Request Body

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

#### Response

```json
{
  "agent": "insights",
  "response": "Based on your transaction data...",
  "data": {
    "insights_generated": true,
    "analysis_period": "last_month"
  }
}
```

## 🤖 Available Agents

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

### Invoke Profile Agent

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

### Run What-If Simulation

```bash
curl -X POST "http://localhost:8000/agents/simulation/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "message": "What if I invest 10000 per month in SIP for 5 years?",
    "context": {
      "current_savings": 50000,
      "risk_profile": "moderate"
    }
  }'
```

## 🔧 Configuration

Environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google AI API key | Required |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.0-flash` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |

## 📚 Google ADK Resources

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [ADK Quickstart](https://google.github.io/adk-docs/get-started/quickstart/)
- [Gemini API](https://ai.google.dev/docs)

## 🔜 Next Steps

1. Add authentication middleware
2. Connect to database for user/company data
3. Add document upload endpoints
4. Implement multi-agent orchestration
5. Add WebSocket for real-time agent communication
6. Deploy to Google Cloud Run
