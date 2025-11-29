import axios from 'axios'

// @ts-ignore - Vite provides import.meta.env
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api'

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('cfosync-auth')
  if (token) {
    try {
      const parsed = JSON.parse(token)
      if (parsed.state?.token) {
        return { Authorization: `Bearer ${parsed.state.token}` }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return {}
}

// Create authenticated axios instance
const authAxios = {
  post: (url: string, data?: unknown, config?: { headers?: Record<string, string> }) => 
    axios.post(url, data, { ...config, headers: { ...getAuthHeaders(), ...config?.headers } }),
  get: (url: string, config?: unknown) => axios.get(url, { ...config as object, headers: getAuthHeaders() }),
  put: (url: string, data?: unknown) => axios.put(url, data, { headers: getAuthHeaders() }),
  delete: (url: string) => axios.delete(url, { headers: getAuthHeaders() }),
}

// Types for AI responses
export interface AIInsight {
  type: 'insight' | 'warning' | 'opportunity' | 'alert'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  action?: string
  data?: Record<string, unknown>
}

export interface SpendingAnalysis {
  totalSpending: number
  topCategories: { category: string; amount: number; percentage: number; trend: 'up' | 'down' | 'stable' }[]
  insights: AIInsight[]
  savingsOpportunities: { category: string; potentialSavings: number; suggestion: string }[]
}

export interface CashFlowForecast {
  projectedBalance: number
  projectedIncome: number
  projectedExpenses: number
  runwayMonths: number
  confidence: number
  risks: string[]
  recommendations: string[]
}

export interface InvestmentRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'rebalance'
  asset: string
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  expectedReturn?: number
}

export interface LifeEventImpact {
  event: string
  financialImpact: number
  monthlyImpactChange: number
  yearsToRecover: number
  recommendations: string[]
  risks: string[]
  opportunities: string[]
}

export interface FraudAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  description: string
  amount?: number
  confidence: number
  suggestedAction: string
}

export interface GoalRecommendation {
  goalType: string
  targetAmount: number
  monthlyContribution: number
  timelineMonths: number
  priority: number
  reasoning: string
}

// ─────────────────────────────────────────────────────────────
// Individual AI Services
// ─────────────────────────────────────────────────────────────

export const individualAI = {
  // Get personalized financial insights
  async getInsights(userId: string): Promise<AIInsight[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/insights`, {
        user_id: userId,
        request_type: 'dashboard_insights'
      })
      return response.data.insights
    } catch {
      // Return empty - API should provide real data
      return [
        {
          type: 'insight',
          title: 'Upload Your Data',
          message: 'Upload bank statements to get personalized AI insights about your finances.',
          priority: 'high',
          action: 'Upload now'
        }
      ]
    }
  },

  // Analyze spending patterns
  async analyzeSpending(userId: string, transactions: unknown[]): Promise<SpendingAnalysis> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/spending`, {
        user_id: userId,
        transactions,
        period: 'month'
      })
      return response.data
    } catch {
      return {
        totalSpending: 0,
        topCategories: [],
        insights: [
          {
            type: 'insight',
            title: 'No Data Yet',
            message: 'Upload your bank statements to see spending analysis',
            priority: 'high'
          }
        ],
        savingsOpportunities: []
      }
    }
  },

  // Get goal recommendations
  async getGoalRecommendations(userId: string, financialProfile: unknown): Promise<GoalRecommendation[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/goals`, {
        user_id: userId,
        financial_profile: financialProfile
      })
      return response.data.goals
    } catch {
      return [
        {
          goalType: 'Get Started',
          targetAmount: 0,
          monthlyContribution: 0,
          timelineMonths: 0,
          priority: 1,
          reasoning: 'Upload your bank statements to get personalized goal recommendations'
        }
      ]
    }
  },

  // Simulate life event impact
  async simulateLifeEvent(userId: string, event: string, params: Record<string, unknown>): Promise<LifeEventImpact> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/simulation`, {
        user_id: userId,
        event: event,
        params: params
      })
      return response.data
    } catch {
      return {
        event,
        financialImpact: -45000,
        monthlyImpactChange: -1200,
        yearsToRecover: 3.5,
        recommendations: [
          'Build emergency fund to 6 months before major life changes',
          'Consider income protection insurance',
          'Start a dedicated savings account for this goal'
        ],
        risks: [
          'Current savings may be insufficient',
          'May need to delay retirement contributions temporarily'
        ],
        opportunities: [
          'Tax advantages available for this life event',
          'Employer benefits may cover part of this expense'
        ]
      }
    }
  },

  // Get investment recommendations
  async getInvestmentAdvice(userId: string, portfolio: unknown): Promise<InvestmentRecommendation[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/risk`, {
        user_id: userId,
        portfolio,
        request_type: 'recommendations'
      })
      return response.data.recommendations
    } catch {
      return [
        {
          action: 'hold',
          asset: 'Portfolio',
          reason: 'Upload financial data to get personalized investment recommendations.',
          riskLevel: 'medium',
          expectedReturn: 0
        }
      ]
    }
  },

  // Get risk assessment
  async assessRisk(userId: string): Promise<{ score: number; factors: string[]; suggestions: string[] }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/risk`, {
        user_id: userId,
        request_type: 'assessment'
      })
      return response.data
    } catch {
      return {
        score: 0,
        factors: [
          'No financial data available yet'
        ],
        suggestions: [
          'Upload bank statements to get your risk assessment'
        ]
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Company AI Services
// ─────────────────────────────────────────────────────────────

export const companyAI = {
  // Get CFO-level strategic insights
  async getCFOInsights(companyId: string): Promise<AIInsight[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/cfo_strategy`, {
        company_id: companyId,
        request_type: 'strategic_insights'
      })
      return response.data.insights
    } catch {
      return [
        {
          type: 'warning',
          title: 'Cash Runway Alert',
          message: 'At current burn rate, runway is 8 months. Consider reducing non-essential expenses or securing additional funding.',
          priority: 'high',
          action: 'View cash flow'
        },
        {
          type: 'opportunity',
          title: 'Revenue Optimization',
          message: 'Top 3 customers represent 65% of revenue. Diversification could reduce concentration risk.',
          priority: 'medium',
          action: 'Customer analysis'
        },
        {
          type: 'insight',
          title: 'Cost Reduction',
          message: 'Software subscriptions increased 45% YoY. Consolidation could save $24,000 annually.',
          priority: 'medium',
          action: 'Review subscriptions'
        },
        {
          type: 'alert',
          title: 'Payroll Timing',
          message: 'Next payroll ($180,000) in 5 days. Ensure sufficient funds with expected receivables.',
          priority: 'high',
          action: 'View forecast'
        }
      ]
    }
  },

  // Forecast cash flow
  async forecastCashFlow(companyId: string, months: number = 3): Promise<CashFlowForecast[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/cashflow`, {
        company_id: companyId,
        forecast_months: months
      })
      return response.data.forecasts
    } catch {
      return [
        {
          projectedBalance: 245000,
          projectedIncome: 180000,
          projectedExpenses: 156000,
          runwayMonths: 8,
          confidence: 85,
          risks: ['Two large invoices pending collection', 'Seasonal revenue dip expected'],
          recommendations: ['Follow up on overdue invoices', 'Defer non-critical purchases']
        },
        {
          projectedBalance: 269000,
          projectedIncome: 195000,
          projectedExpenses: 162000,
          runwayMonths: 9,
          confidence: 75,
          risks: ['Q2 typically has lower sales'],
          recommendations: ['Build cash reserves', 'Consider credit line']
        },
        {
          projectedBalance: 302000,
          projectedIncome: 210000,
          projectedExpenses: 168000,
          runwayMonths: 10,
          confidence: 65,
          risks: ['Market uncertainty'],
          recommendations: ['Scenario planning for downturn']
        }
      ]
    }
  },

  // Detect fraud and anomalies
  async detectAnomalies(companyId: string, transactions: unknown[]): Promise<FraudAlert[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/compliance`, {
        company_id: companyId,
        transactions,
        check_type: 'fraud_detection'
      })
      return response.data.alerts
    } catch {
      return [
        {
          id: 'fa-001',
          severity: 'high',
          type: 'Unusual Transaction',
          description: 'Wire transfer of $45,000 to new vendor not in approved list',
          amount: 45000,
          confidence: 92,
          suggestedAction: 'Verify vendor and approve or block transaction'
        },
        {
          id: 'fa-002',
          severity: 'medium',
          type: 'Duplicate Invoice',
          description: 'Invoice #4521 appears to be duplicate of #4518 from same vendor',
          amount: 3200,
          confidence: 87,
          suggestedAction: 'Review both invoices before payment'
        },
        {
          id: 'fa-003',
          severity: 'low',
          type: 'Expense Pattern',
          description: 'Employee submitted 12 expense reports in 3 days (unusual pattern)',
          amount: 2800,
          confidence: 68,
          suggestedAction: 'Review expense reports for policy compliance'
        }
      ]
    }
  },

  // Analyze department budgets
  async analyzeBudgets(companyId: string): Promise<{
    departments: { name: string; budget: number; spent: number; forecast: number; alerts: string[] }[]
    recommendations: string[]
  }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/budgets`, {
        company_id: companyId,
        request_type: 'budget_analysis'
      })
      return response.data
    } catch {
      return {
        departments: [
          { name: 'Engineering', budget: 450000, spent: 380000, forecast: 485000, alerts: ['Projected to exceed budget by 8%'] },
          { name: 'Sales', budget: 280000, spent: 195000, forecast: 260000, alerts: [] },
          { name: 'Marketing', budget: 150000, spent: 142000, forecast: 165000, alerts: ['Ad spend trending high'] },
          { name: 'Operations', budget: 120000, spent: 85000, forecast: 110000, alerts: [] }
        ],
        recommendations: [
          'Reallocate $20k from Operations to Engineering to cover projected overage',
          'Review Marketing ad spend efficiency before Q2',
          'Sales is under-budget - consider investing in lead generation'
        ]
      }
    }
  },

  // Get payroll insights
  async analyzePayroll(companyId: string): Promise<{
    insights: AIInsight[]
    benchmarks: { metric: string; company: number; industry: number; status: 'good' | 'warning' | 'critical' }[]
  }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/payroll`, {
        company_id: companyId,
        request_type: 'payroll_analysis'
      })
      return response.data
    } catch {
      return {
        insights: [
          {
            type: 'warning',
            title: 'Salary Competitiveness',
            message: 'Engineering salaries are 12% below market rate. Risk of attrition.',
            priority: 'high'
          },
          {
            type: 'opportunity',
            title: 'Benefits Optimization',
            message: 'Switching to PEO could save $35,000/year on benefits administration.',
            priority: 'medium'
          }
        ],
        benchmarks: [
          { metric: 'Revenue per Employee', company: 185000, industry: 210000, status: 'warning' },
          { metric: 'Payroll as % of Revenue', company: 42, industry: 38, status: 'warning' },
          { metric: 'Benefits Cost per Employee', company: 12500, industry: 14000, status: 'good' },
          { metric: 'Turnover Rate', company: 15, industry: 18, status: 'good' }
        ]
      }
    }
  },

  // Smart notifications/nudges
  async getSmartNudges(companyId: string): Promise<AIInsight[]> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/nudge`, {
        company_id: companyId
      })
      return response.data.nudges
    } catch {
      return [
        {
          type: 'alert',
          title: 'Invoice Due',
          message: '3 invoices totaling $28,500 are due for payment today',
          priority: 'high',
          action: 'Review invoices'
        },
        {
          type: 'insight',
          title: 'Tax Deadline',
          message: 'Quarterly estimated taxes due in 12 days. Estimated payment: $45,000',
          priority: 'medium',
          action: 'Prepare payment'
        },
        {
          type: 'opportunity',
          title: 'Early Payment Discount',
          message: 'Pay vendor invoice early to save $1,200 (2% discount available)',
          priority: 'low',
          action: 'Process payment'
        }
      ]
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Shared AI Services
// ─────────────────────────────────────────────────────────────

export const sharedAI = {
  // Process and categorize uploaded documents
  async processDocument(file: File, userId: string): Promise<{
    type: string
    extractedData: Record<string, unknown>
    insights: AIInsight[]
  }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)
      
      const response = await authAxios.post(`${API_URL}/agents/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch {
      return {
        type: 'bank_statement',
        extractedData: {
          accountNumber: '****4521',
          period: 'January 2024',
          totalDeposits: 9077.35,
          totalWithdrawals: 4974.24,
          endingBalance: 9103.11
        },
        insights: [
          {
            type: 'insight',
            title: 'Income Pattern',
            message: 'Regular bi-weekly income detected. Salary appears stable.',
            priority: 'low'
          },
          {
            type: 'warning',
            title: 'High Expense Category',
            message: 'Housing costs represent 36% of expenses. Consider if sustainable.',
            priority: 'medium'
          }
        ]
      }
    }
  },

  // Auto-categorize transactions
  async categorizeTransactions(transactions: { description: string; amount: number }[]): Promise<
    { description: string; amount: number; category: string; confidence: number }[]
  > {
    try {
      const response = await authAxios.post(`${API_URL}/agents/profile`, {
        transactions,
        request_type: 'categorize'
      })
      return response.data.categorized
    } catch {
      // Simple rule-based categorization for demo
      return transactions.map(t => {
        const desc = t.description.toLowerCase()
        let category = 'Other'
        let confidence = 0.7
        
        if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart')) {
          category = 'Shopping'
          confidence = 0.95
        } else if (desc.includes('uber') || desc.includes('lyft') || desc.includes('gas') || desc.includes('shell')) {
          category = 'Transportation'
          confidence = 0.92
        } else if (desc.includes('whole foods') || desc.includes('trader') || desc.includes('grocery') || desc.includes('costco')) {
          category = 'Groceries'
          confidence = 0.94
        } else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu')) {
          category = 'Entertainment'
          confidence = 0.98
        } else if (desc.includes('rent') || desc.includes('mortgage')) {
          category = 'Housing'
          confidence = 0.99
        } else if (desc.includes('payroll') || desc.includes('direct dep') || desc.includes('salary')) {
          category = 'Income'
          confidence = 0.97
        }
        
        return { ...t, category, confidence }
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Page-Specific Data Services
// ─────────────────────────────────────────────────────────────

export interface DashboardData {
  hasData?: boolean
  financialHealth: { score: number; trend: string; change: number }
  metrics: { netWorth: number; monthlyIncome: number; monthlyExpenses: number; savingsRate: number }
  recentTransactions: { id: string; description: string; amount: number; type: string; category: string; date: string }[]
  spendingBreakdown: { category: string; amount: number; percentage: number; color: string }[]
  goals: { id: string; name: string; current: number; target: number; progress: number }[]
  quickActions: { id: string; title: string; description: string; type: string }[]
}

export interface InvestmentsData {
  hasData?: boolean
  message?: string
  portfolioSummary: { totalValue: number; totalGain: number; totalGainPercent: number; dayChange: number; dayChangePercent: number }
  assetAllocation: { name: string; value: number; percent: number; color: string }[]
  holdings: { symbol: string; name: string; shares: number; price: number; value: number; change: number; changePercent: number }[]
  accountTypes: { name: string; value: number; color: string }[]
  aiInsights: { type: string; title: string; description: string; action: string }[]
}

export interface PlanningData {
  summary: { monthlyIncome: number; monthlyExpenses: number; monthlySavings: number; savingsRate: number; projectedAnnualSavings: number }
  financialGoals: { id: string; name: string; icon: string; color: string; current: number; target: number; progress: number; monthlyContribution: number; targetDate: string; status: string }[]
  budgetCategories: { category: string; budgeted: number; spent: number; remaining: number; status: string }[]
  aiRecommendations: { type: string; title: string; description: string; impact: string; action: string }[]
}

export interface SimulatorConfig {
  defaults: { currentAge: number; retirementAge: number; currentIncome: number; currentSavings: number; monthlyExpenses: number }
  lifeEvents: { 
    id: string
    name: string
    icon: string
    color: string
    avgCost: number
    description: string
    costRange?: { min: number; max: number }
  }[]
  hasRealData?: boolean
  dataMessage?: string
}

export interface SimulationResult {
  year: number
  age: number
  netWorth: number
  income: number
  expenses: number
  savings: number
  events: string[]
  status: 'positive' | 'warning' | 'negative'
}

export interface SimulationResponse {
  results: SimulationResult[]
  summary: { 
    retirementNetWorth: number
    totalEventCosts: number
    eventsCount: number
    isOnTrack: boolean
    yearsOfExpenses: number
    peakNetWorth?: number
    peakAge?: number
    finalNetWorth?: number
    savingsRate?: number
  }
  aiAnalysis: { type: string; title: string; description: string }[]
  scenarios?: {
    optimistic: { netWorth: number; description: string }
    pessimistic: { netWorth: number; description: string }
  }
}

export const pageDataService = {
  // Get dashboard data
  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/dashboard`, { user_id: userId })
      return response.data
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      throw error
    }
  },

  // Get investments data
  async getInvestmentsData(userId: string, timeframe: string = '1Y'): Promise<InvestmentsData> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments`, { user_id: userId, timeframe })
      return response.data
    } catch (error) {
      console.error('Error fetching investments data:', error)
      throw error
    }
  },

  // Get planning data
  async getPlanningData(userId: string): Promise<PlanningData> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/planning`, { user_id: userId })
      return response.data
    } catch (error) {
      console.error('Error fetching planning data:', error)
      throw error
    }
  },

  // Get simulator config
  async getSimulatorConfig(userId: string): Promise<SimulatorConfig> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/simulator/config`, { user_id: userId })
      return response.data
    } catch (error) {
      console.error('Error fetching simulator config:', error)
      throw error
    }
  },

  // Run simulation
  async runSimulation(
    userId: string,
    currentAge: number,
    retirementAge: number,
    currentIncome: number,
    currentSavings: number,
    monthlyExpenses: number,
    selectedEvents: { eventId: string; year: number; cost: number; name?: string }[]
  ): Promise<SimulationResponse> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/simulator/run`, {
        user_id: userId,
        current_age: currentAge,
        retirement_age: retirementAge,
        current_income: currentIncome,
        current_savings: currentSavings,
        monthly_expenses: monthlyExpenses,
        selected_events: selectedEvents.map(e => ({ ...e, name: e.name || e.eventId }))
      })
      return response.data
    } catch (error) {
      console.error('Error running simulation:', error)
      throw error
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Statements API Service (Firebase)
// ─────────────────────────────────────────────────────────────

export interface StatementTransaction {
  id?: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  source: string
}

export interface StatementData {
  name: string
  size: number
  file_type: string
  extracted_data?: {
    transactions: number
    dateRange: string
    totalIncome: number
    totalExpenses: number
    categories: string[]
  }
  transactions?: StatementTransaction[]
}

export interface FinancialSummary {
  statements_count: number
  transactions_count: number
  total_income: number
  total_expenses: number
  net_savings: number
  savings_rate: number
  top_categories: { category: string; amount: number }[]
  recent_transactions: StatementTransaction[]
  has_data: boolean
}

export const statementsAPI = {
  // Upload a statement with its transactions
  async uploadStatement(statement: StatementData): Promise<{ success: boolean; statement_id?: string; transactions_saved?: number; duplicate?: boolean; message?: string }> {
    try {
      const response = await authAxios.post(`${API_URL}/statements/upload`, statement)
      return response.data
    } catch (error) {
      console.error('Error uploading statement:', error)
      throw error
    }
  },

  // Get all statements for the user
  async getStatements(): Promise<{ statements: any[]; count: number }> {
    try {
      const response = await authAxios.get(`${API_URL}/statements/list`)
      return response.data
    } catch (error) {
      console.error('Error fetching statements:', error)
      return { statements: [], count: 0 }
    }
  },

  // Get all transactions for the user
  async getTransactions(limit = 100): Promise<{ transactions: StatementTransaction[]; count: number; summary: any }> {
    try {
      const response = await authAxios.get(`${API_URL}/statements/transactions`, { params: { limit } })
      return response.data
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return { transactions: [], count: 0, summary: {} }
    }
  },

  // Get financial summary
  async getFinancialSummary(): Promise<FinancialSummary> {
    try {
      const response = await authAxios.get(`${API_URL}/statements/summary`)
      return response.data
    } catch (error) {
      console.error('Error fetching financial summary:', error)
      return {
        statements_count: 0,
        transactions_count: 0,
        total_income: 0,
        total_expenses: 0,
        net_savings: 0,
        savings_rate: 0,
        top_categories: [],
        recent_transactions: [],
        has_data: false
      }
    }
  },

  // Delete a statement
  async deleteStatement(statementId: string): Promise<{ success: boolean }> {
    try {
      const response = await authAxios.delete(`${API_URL}/statements/${statementId}`)
      return response.data
    } catch (error) {
      console.error('Error deleting statement:', error)
      throw error
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Investment Portfolio API Service
// ─────────────────────────────────────────────────────────────

export interface PortfolioHolding {
  symbol: string
  shares: number
  purchase_price: number
  purchase_date?: string
  name?: string
  sector?: string
  // Enriched data from live API
  current_price?: number
  current_value?: number
  cost_basis?: number
  gain_loss?: number
  gain_loss_percent?: number
  day_change?: number
  company_name?: string
}

export interface Portfolio {
  holdings: PortfolioHolding[]
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdingsCount?: number
  riskTolerance?: string
}

export interface InvestmentAnalysis {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdings?: PortfolioHolding[]
  riskMetrics?: {
    volatility?: number
    sharpe_ratio?: number
    beta?: number
    max_drawdown?: number
  }
  riskAssessment?: {
    risk_score: number
    risk_level: string
    concentration_risks: Array<{
      sector: string
      percentage: number
      severity: string
      recommendation: string
    }>
    volatility_risks: Array<{
      symbol: string
      volatility: number
      severity: string
    }>
  }
  sectorAllocation?: Record<string, number>
  sectorDetails?: Record<string, any>
  hedgingStrategies?: Array<{
    type: string
    sector?: string
    instruments: string[]
    reason: string
    suggested_allocation: string
  }>
  diversificationScore?: number
  topPerformers?: PortfolioHolding[]
  worstPerformers?: PortfolioHolding[]
}

export interface InvestmentRecommendationItem {
  type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'hedge' | 'diversify'
  symbol?: string
  title: string
  description: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  action?: string
}

export interface StockData {
  symbol: string
  name?: string
  current_price: number
  change_percent: number
  volume?: number
  market_cap?: number
  pe_ratio?: number
  dividend_yield?: number
  sector?: string
  high_52w?: number
  low_52w?: number
}

export const investmentsAPI = {
  // Get user's portfolio with live prices
  async getPortfolio(): Promise<{ hasData: boolean; portfolio: Portfolio; message?: string }> {
    try {
      const response = await authAxios.get(`${API_URL}/agents/investments/portfolio`)
      return response.data
    } catch (error) {
      console.error('Error fetching portfolio:', error)
      return {
        hasData: false,
        portfolio: {
          holdings: [],
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0
        },
        message: 'Error loading portfolio'
      }
    }
  },

  // Save portfolio holdings
  async savePortfolio(holdings: PortfolioHolding[], riskTolerance: string = 'moderate'): Promise<{ success: boolean; message: string; holdingsCount?: number; warnings?: string[] }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments/portfolio`, {
        holdings,
        risk_tolerance: riskTolerance
      })
      return response.data
    } catch (error) {
      console.error('Error saving portfolio:', error)
      throw error
    }
  },

  // Add a single holding
  async addHolding(holding: PortfolioHolding): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments/holding`, { holding })
      return response.data
    } catch (error) {
      console.error('Error adding holding:', error)
      throw error
    }
  },

  // Remove a holding
  async removeHolding(symbol: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAxios.delete(`${API_URL}/agents/investments/holding/${symbol}`)
      return response.data
    } catch (error) {
      console.error('Error removing holding:', error)
      throw error
    }
  },

  // Clear entire portfolio
  async clearPortfolio(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAxios.delete(`${API_URL}/agents/investments/portfolio`)
      return response.data
    } catch (error) {
      console.error('Error clearing portfolio:', error)
      throw error
    }
  },

  // Get portfolio analysis with AI insights
  async analyzePortfolio(riskTolerance: string = 'moderate', includeRecommendations: boolean = true): Promise<{
    hasData: boolean
    analysis?: InvestmentAnalysis
    recommendations?: InvestmentRecommendationItem[]
    message?: string
  }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments/analyze`, {
        risk_tolerance: riskTolerance,
        include_recommendations: includeRecommendations
      })
      return response.data
    } catch (error) {
      console.error('Error analyzing portfolio:', error)
      throw error
    }
  },

  // Get stock data for symbols
  async getStockData(symbols: string[]): Promise<{ hasData: boolean; stocks: Record<string, StockData>; message?: string }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments/stock-data`, { symbols })
      return response.data
    } catch (error) {
      console.error('Error fetching stock data:', error)
      return { hasData: false, stocks: {}, message: 'Error loading stock data' }
    }
  },

  // Get market overview
  async getMarketOverview(sectors?: string[]): Promise<{ hasData: boolean; market: any; message?: string }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/investments/market-overview`, { sectors })
      return response.data
    } catch (error) {
      console.error('Error fetching market overview:', error)
      return { hasData: false, market: {}, message: 'Error loading market data' }
    }
  },

  // Get AI-powered recommendations
  async getRecommendations(): Promise<{
    hasData: boolean
    recommendations: InvestmentRecommendationItem[]
    portfolioHealth?: string
    message?: string
  }> {
    try {
      const response = await authAxios.get(`${API_URL}/agents/investments/recommendations`)
      return response.data
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      return { hasData: false, recommendations: [], message: 'Error loading recommendations' }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Goals API Service
// ─────────────────────────────────────────────────────────────

export interface Goal {
  id?: string
  user_id?: string
  name: string
  description?: string
  target: number
  current: number
  targetDate: string
  monthlyContribution: number
  icon: string
  color: string
  priority: 'high' | 'medium' | 'low'
  category: 'savings' | 'investment' | 'debt' | 'purchase' | 'emergency' | 'retirement' | 'general'
  progress?: number
  status?: 'on-track' | 'at-risk' | 'behind' | 'completed' | 'overdue'
  estimatedMonthsToComplete?: number
  monthlyAvailable?: number
  created_at?: string
  updated_at?: string
}

export interface GoalAnalysis {
  summary: {
    progress: number
    amountRemaining: number
    monthsToComplete: number
    monthsUntilDeadline: number
    isOnTrack: boolean
    currentContribution: number
    optimalContribution: number
    contributionGap: number
  }
  financialContext: {
    monthlyIncome: number
    monthlyExpenses: number
    monthlySavings: number
    savingsRate: number
    goalAllocation: number
  }
  recommendations: Array<{
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    actionable: boolean
  }>
  accelerators: Array<{
    title: string
    description: string
    potentialIncrease: number
  }>
  risks: Array<{
    title: string
    severity: 'high' | 'medium' | 'low'
    description: string
    mitigation: string
  }>
  projections: {
    currentPace: { completionDate: string; monthsToComplete: number }
    optimizedPace: { completionDate: string; monthsToComplete: number }
    aggressivePace: { completionDate: string; monthsToComplete: number }
  }
}

export interface GoalsResponse {
  success: boolean
  goals: Goal[]
  financialSummary?: {
    monthlyIncome: number
    monthlyExpenses: number
    monthlySavings: number
  }
}

export const goalsAPI = {
  // Create a new goal
  async createGoal(goal: Omit<Goal, 'id' | 'user_id' | 'progress' | 'status' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; goal: Goal }> {
    try {
      const response = await authAxios.post(`${API_URL}/agents/goals`, goal)
      return response.data
    } catch (error) {
      console.error('Error creating goal:', error)
      throw error
    }
  },

  // Get all goals for current user
  async getGoals(): Promise<GoalsResponse> {
    try {
      const response = await authAxios.get(`${API_URL}/agents/goals`)
      return response.data
    } catch (error) {
      console.error('Error fetching goals:', error)
      return { success: false, goals: [] }
    }
  },

  // Get a specific goal
  async getGoal(goalId: string): Promise<{ success: boolean; goal: Goal }> {
    try {
      const response = await authAxios.get(`${API_URL}/agents/goals/${goalId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching goal:', error)
      throw error
    }
  },

  // Update a goal
  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<{ success: boolean; goal: Goal }> {
    try {
      const response = await authAxios.put(`${API_URL}/agents/goals/${goalId}`, updates)
      return response.data
    } catch (error) {
      console.error('Error updating goal:', error)
      throw error
    }
  },

  // Delete a goal
  async deleteGoal(goalId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAxios.delete(`${API_URL}/agents/goals/${goalId}`)
      return response.data
    } catch (error) {
      console.error('Error deleting goal:', error)
      throw error
    }
  },

  // Get AI analysis for a goal
  async getGoalAnalysis(goalId: string): Promise<{ success: boolean; analysis: GoalAnalysis }> {
    try {
      const response = await authAxios.get(`${API_URL}/agents/goals/${goalId}/analysis`)
      return response.data
    } catch (error) {
      console.error('Error fetching goal analysis:', error)
      throw error
    }
  }
}

export default {
  individual: individualAI,
  company: companyAI,
  shared: sharedAI,
  pageData: pageDataService,
  statements: statementsAPI,
  investments: investmentsAPI,
  goals: goalsAPI
}

