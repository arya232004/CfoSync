import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Target,
  DollarSign,
  TrendingUp,
  PiggyBank,
  Shield,
  Home,
  Plane,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Plus,
  Brain,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { pageDataService, PlanningData } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Icon mapping for goals
const goalIconMap: Record<string, React.ComponentType<any>> = {
  Shield,
  Home,
  Plane,
  CreditCard,
  Target,
  PiggyBank,
  TrendingUp
}

export default function Planning() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data from API
  const [planningData, setPlanningData] = useState<PlanningData | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const userId = user?.id || 'demo-user'
        const data = await pageDataService.getPlanningData(userId)
        setPlanningData(data)
      } catch (err) {
        console.error('Failed to load planning data:', err)
        setError('Failed to load planning data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <button className="btn-secondary px-4 py-2 flex items-center gap-2">
        <Plus className="w-4 h-4" />
        New Goal
      </button>
      <Link to="/individual/chat" className="btn-primary px-4 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Advisor
      </Link>
    </div>
  )

  if (loading) {
    return (
      <IndividualLayout title="Financial Planning" description="Set goals, track budgets, and plan your future" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your financial plan...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  if (error || !planningData) {
    return (
      <IndividualLayout title="Financial Planning" description="Set goals, track budgets, and plan your future" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{error || 'Failed to load data'}</p>
            <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2">Retry</button>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  const { summary, financialGoals, budgetCategories, aiRecommendations } = planningData

  return (
    <IndividualLayout
      title="Financial Planning"
      description="Set goals, track budgets, and plan your future"
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { title: 'Monthly Income', value: summary.monthlyIncome, icon: DollarSign, color: 'text-green-400' },
            { title: 'Monthly Expenses', value: summary.monthlyExpenses, icon: CreditCard, color: 'text-red-400' },
            { title: 'Monthly Savings', value: summary.monthlySavings, icon: PiggyBank, color: 'text-blue-400' },
            { title: 'Savings Rate', value: `${summary.savingsRate}%`, icon: TrendingUp, color: 'text-purple-400', isPercentage: true },
            { title: 'Annual Projection', value: summary.projectedAnnualSavings, icon: Target, color: 'text-cyan-400' },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-gray-400 text-sm">{item.title}</span>
              </div>
              <p className="text-xl font-bold text-white">
                {item.isPercentage ? item.value : formatCurrency(item.value as number)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Financial Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" />
              Financial Goals
            </h2>
            <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financialGoals.map((goal, index) => {
              const IconComponent = goalIconMap[goal.icon] || Target
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-4 bg-dark-800/50 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${goal.color}`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{goal.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          goal.status === 'ahead' ? 'bg-green-500/20 text-green-400' :
                          goal.status === 'on_track' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {goal.status === 'ahead' ? 'Ahead' : goal.status === 'on_track' ? 'On Track' : 'Behind'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-lg font-bold text-white">{formatCurrency(goal.current)}</span>
                        <span className="text-gray-400 text-sm">of {formatCurrency(goal.target)}</span>
                      </div>
                      <div className="h-2 bg-dark-900 rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                          className={`h-full bg-gradient-to-r ${goal.color} rounded-full`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatCurrency(goal.monthlyContribution)}/month</span>
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-400" />
              Budget Breakdown
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetCategories.map((category, index) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-4 bg-dark-800/30 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{category.category}</span>
                    {category.status === 'over_budget' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : category.status === 'under_budget' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-white">{formatCurrency(category.spent)}</span>
                    <span className="text-gray-400 text-sm">/ {formatCurrency(category.budgeted)}</span>
                  </div>
                  <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        category.status === 'over_budget' ? 'bg-red-500' :
                        category.status === 'under_budget' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((category.spent / category.budgeted) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${
                    category.remaining < 0 ? 'text-red-400' :
                    category.remaining > 0 ? 'text-green-400' :
                    'text-gray-400'
                  }`}>
                    {category.remaining >= 0 
                      ? `${formatCurrency(category.remaining)} remaining`
                      : `${formatCurrency(Math.abs(category.remaining))} over budget`
                    }
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent-400" />
              AI Recommendations
            </h2>

            <div className="space-y-4">
              {aiRecommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    rec.type === 'savings' ? 'bg-blue-500/10 border-blue-500/20' :
                    rec.type === 'spending' ? 'bg-yellow-500/10 border-yellow-500/20' :
                    'bg-green-500/10 border-green-500/20'
                  }`}
                >
                  <h3 className="text-white font-medium text-sm mb-1">{rec.title}</h3>
                  <p className="text-gray-400 text-xs mb-2">{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      rec.type === 'savings' ? 'text-blue-400' :
                      rec.type === 'spending' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {rec.impact}
                    </span>
                    <button className="text-primary-400 hover:text-primary-300 text-xs">
                      {rec.action} →
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </IndividualLayout>
  )
}
