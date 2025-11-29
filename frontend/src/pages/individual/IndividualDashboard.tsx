import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
  CreditCard,
  Shield,
  Lightbulb,
  Upload,
  Heart,
  Bell,
  ExternalLink,
  Brain,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { useStatementsStore, useSettingsStore, formatCurrency as globalFormatCurrency } from '../../lib/store'
import { pageDataService, individualAI, DashboardData, statementsAPI } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

export default function IndividualDashboard() {
  const { user } = useAuthStore()
  const { currency } = useSettingsStore()
  const { transactions, statements, getTotalIncome, getTotalExpenses, getRecentTransactions } = useStatementsStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dashboard data from API
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [riskScore, setRiskScore] = useState<{ score: number; factors: string[]; suggestions: string[] } | null>(null)
  const [spendingAnalysis, setSpendingAnalysis] = useState<any>(null)
  
  // Calculate real data from uploaded statements
  const realData = useMemo(() => {
    if (transactions.length === 0) return null
    
    const totalIncome = getTotalIncome()
    const totalExpenses = getTotalExpenses()
    const recentTxns = getRecentTransactions(10)
    
    // Group by category for spending breakdown
    const categoryTotals: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount)
    })
    
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalExpenses) * 100)
      }))
    
    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
      recentTransactions: recentTxns,
      topCategories,
      transactionCount: transactions.length,
      statementCount: statements.length
    }
  }, [transactions, statements, getTotalIncome, getTotalExpenses, getRecentTransactions])

  // Load data from Firebase first, then from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const userId = user?.id || 'demo-user'
        
        // Clear old cached data and load fresh from Firebase
        const { addStatement, addTransactions, clearAll } = useStatementsStore.getState()
        
        // Clear old data first
        clearAll()
        
        try {
          // Load transactions from Firebase
          const transactionsResponse = await statementsAPI.getTransactions(500)
          if (transactionsResponse.transactions.length > 0) {
            addTransactions(transactionsResponse.transactions.map((t: any) => ({
              id: t.id,
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type as 'income' | 'expense',
              category: t.category,
              source: t.source
            })))
          }
          
          // Load statements from Firebase
          const statementsResponse = await statementsAPI.getStatements()
          if (statementsResponse.statements.length > 0) {
            statementsResponse.statements.forEach((stmt: any) => {
              addStatement({
                id: stmt.id,
                name: stmt.name,
                size: stmt.size,
                type: stmt.file_type,
                status: 'completed',
                progress: 100,
                uploadedAt: stmt.uploaded_at,
                extractedData: stmt.extracted_data
              })
            })
          }
        } catch (e) {
          console.log('No Firebase data yet')
        }
        
        // Then load dashboard data from agents (which will use real data from Firebase)
        const [dashboard, risk, spending] = await Promise.all([
          pageDataService.getDashboardData(userId),
          individualAI.assessRisk(userId),
          individualAI.analyzeSpending(userId, transactions)
        ])
        
        setDashboardData(dashboard)
        setRiskScore(risk)
        setSpendingAnalysis(spending)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  // Use global formatCurrency with real exchange rate conversion
  const formatCurrency = (value: number) => globalFormatCurrency(value, currency)

  if (loading) {
    return (
      <IndividualLayout 
        title="Loading..."
        description="Fetching your financial data"
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your financial dashboard...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  if (error || !dashboardData) {
    return (
      <IndividualLayout 
        title="Error"
        description="Something went wrong"
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{error || 'Failed to load data'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary px-6 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  const { financialHealth, metrics, recentTransactions, spendingBreakdown, goals } = dashboardData

  // Show empty state if no data
  const hasNoData = !dashboardData.hasData && transactions.length === 0

  if (hasNoData) {
    return (
      <IndividualLayout 
        title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}!`}
        description="Let's get started with your financial journey"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-12 h-12 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Financial Data Yet</h2>
          <p className="text-gray-400 max-w-md mb-8">
            Upload your bank statements to get personalized insights, spending analysis, and AI-powered financial recommendations.
          </p>
          <Link 
            to="/individual/upload" 
            className="btn-primary px-8 py-3 text-lg flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Bank Statement
          </Link>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
            <div className="glass-card p-6 text-left">
              <PiggyBank className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Track Spending</h3>
              <p className="text-sm text-gray-400">See exactly where your money goes with automatic categorization.</p>
            </div>
            <div className="glass-card p-6 text-left">
              <Shield className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Get Insights</h3>
              <p className="text-sm text-gray-400">AI-powered analysis identifies saving opportunities.</p>
            </div>
            <div className="glass-card p-6 text-left">
              <Target className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Set Goals</h3>
              <p className="text-sm text-gray-400">Plan your financial future with personalized recommendations.</p>
            </div>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  return (
    <IndividualLayout 
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}!`}
      description="Here's your financial overview"
      headerActions={
        <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
        </button>
      }
    >
      <div className="space-y-6">
        {/* Financial Health Score & Key Metrics */}
        <div className="grid lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-1 glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-white">Financial Health</h3>
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-dark-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#healthGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${financialHealth.score * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold text-white">{financialHealth.score}</span>
                <span className="text-sm text-gray-400">/ 100</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400 text-center mb-3 flex items-center justify-center gap-2">
                {financialHealth.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span>{financialHealth.score >= 70 ? 'Good standing' : 'Needs attention'}</span>
                <span className={financialHealth.trend === 'up' ? 'text-green-400' : 'text-red-400'}>
                  {financialHealth.change > 0 ? '+' : ''}{financialHealth.change}%
                </span>
              </div>
              {riskScore?.factors?.slice(0, 2).map((factor, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-gray-300 line-clamp-1">{factor}</span>
                </div>
              ))}
              <Link to="/individual/planning" className="block mt-3 text-center text-sm text-primary-400 hover:text-primary-300">
                View full analysis →
              </Link>
            </div>
          </motion.div>

          {/* Key Metrics */}
          <div className="lg:col-span-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { 
                title: 'Net Worth', 
                value: realData ? (realData.totalIncome - realData.totalExpenses + 50000) : metrics.netWorth, 
                change: 5.2, 
                icon: Wallet 
              },
              { 
                title: 'Monthly Income', 
                value: realData ? realData.totalIncome : metrics.monthlyIncome, 
                change: realData ? 0 : 2.1, 
                icon: TrendingUp 
              },
              { 
                title: 'Monthly Expenses', 
                value: realData ? realData.totalExpenses : metrics.monthlyExpenses, 
                change: realData ? 0 : -3.4, 
                icon: CreditCard 
              },
              { 
                title: 'Savings Rate', 
                value: `${realData ? realData.savingsRate : metrics.savingsRate}%`, 
                change: 4.2, 
                icon: PiggyBank, 
                isPercentage: true 
              },
              { 
                title: 'Total Debt', 
                value: 45000, 
                change: -2.1, 
                icon: CreditCard, 
                invertColors: true 
              },
              { 
                title: 'Transactions', 
                value: realData ? realData.transactionCount : 0, 
                change: realData ? realData.statementCount : 0, 
                icon: BarChart3,
                isCount: true
              },
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-5 hover-lift"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{metric.title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {metric.isPercentage ? metric.value : metric.isCount ? metric.value : formatCurrency(metric.value as number)}
                    </h3>
                    <div className={`flex items-center mt-2 text-sm ${
                      metric.isCount 
                        ? 'text-primary-400'
                        : metric.invertColors 
                          ? (metric.change <= 0 ? 'text-green-400' : 'text-red-400')
                          : (metric.change >= 0 ? 'text-green-400' : 'text-red-400')
                    }`}>
                      {metric.isCount ? (
                        <span>{metric.change} statements</span>
                      ) : (
                        <>
                          {metric.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span>{Math.abs(metric.change)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-primary-500/20 rounded-xl">
                    <metric.icon className="w-5 h-5 text-primary-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Recent Transactions</h3>
              <div className="flex items-center gap-3">
                <Link to="/individual/transactions" className="text-sm text-gray-400 hover:text-white">
                  View all →
                </Link>
                <Link to="/individual/upload" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  Upload <Upload className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {/* Use real transactions if available, otherwise use API data */}
              {(realData?.recentTransactions?.length ? realData.recentTransactions : recentTransactions).slice(0, 8).map((txn, index) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      txn.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {txn.type === 'income' ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{txn.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {typeof txn.date === 'string' && txn.date.includes('T') 
                            ? new Date(txn.date).toLocaleDateString() 
                            : txn.date}
                        </span>
                        <span className="text-xs bg-dark-800 px-2 py-0.5 rounded text-gray-300">{txn.category}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`font-semibold ${txn.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Spending Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-white">Spending Breakdown</h3>
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-gray-400">Total Spending</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(spendingAnalysis?.totalSpending || metrics.monthlyExpenses)}</p>
              </div>
              <div className="space-y-3">
                {spendingBreakdown.slice(0, 4).map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{cat.category}</span>
                      <span className="text-white">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {spendingAnalysis?.savingsOpportunities?.[0] && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
                    <Lightbulb className="w-4 h-4" />
                    Savings Tip
                  </div>
                  <p className="text-sm text-gray-300">
                    {spendingAnalysis.savingsOpportunities[0].suggestion}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-white">Your Goals</h3>
            </div>
            <Link to="/individual/planning" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Manage goals <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map((goal, index) => {
              const colors = [
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-yellow-500'
              ]
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="p-4 bg-dark-800/50 rounded-xl border border-white/5 hover:border-primary-500/30 transition-colors"
                >
                  <h4 className="font-medium mb-2 text-white">{goal.name}</h4>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-lg font-bold text-white">{formatCurrency(goal.current)}</span>
                    <span className="text-sm text-gray-400">of {formatCurrency(goal.target)}</span>
                  </div>
                  <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{goal.progress}% complete</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Link to="/individual/planning" className="glass-card p-4 hover-lift flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <span className="font-medium text-white">Plan Goals</span>
            <span className="text-xs text-gray-400">Financial planning</span>
          </Link>
          <Link to="/individual/investments" className="glass-card p-4 hover-lift flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <BarChart3 className="w-6 h-6 text-green-400" />
            </div>
            <span className="font-medium text-white">Investments</span>
            <span className="text-xs text-gray-400">Portfolio view</span>
          </Link>
          <Link to="/individual/simulator" className="glass-card p-4 hover-lift flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Heart className="w-6 h-6 text-purple-400" />
            </div>
            <span className="font-medium text-white">Life Simulator</span>
            <span className="text-xs text-gray-400">Plan life events</span>
          </Link>
          <Link to="/individual/upload" className="glass-card p-4 hover-lift flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Upload className="w-6 h-6 text-orange-400" />
            </div>
            <span className="font-medium text-white">Upload Data</span>
            <span className="text-xs text-gray-400">Bank statements</span>
          </Link>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
