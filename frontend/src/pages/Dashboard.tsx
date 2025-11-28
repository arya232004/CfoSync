import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
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
  MessageSquare,
  RefreshCw,
  Home,
  LayoutDashboard,
  User,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useProfileStore, useFinancialStore } from '../lib/store'
import { formatCurrency, formatPercentage, cn } from '../lib/utils'

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
  { icon: MessageSquare, label: 'AI Chat', path: '/chat' },
  { icon: User, label: 'Profile', path: '/onboarding' },
  { icon: Settings, label: 'Settings', path: '#' },
]

// Sample data - in real app, this would come from API
const sampleMetrics = {
  netWorth: 125000,
  netWorthChange: 5.2,
  monthlyIncome: 8500,
  incomeChange: 2.1,
  monthlyExpenses: 5200,
  expensesChange: -3.4,
  savingsRate: 38.8,
  savingsChange: 4.2,
}

const recentTransactions = [
  { id: 1, name: 'Salary Deposit', amount: 8500, type: 'income', date: 'Nov 25' },
  { id: 2, name: 'Rent Payment', amount: -2200, type: 'expense', date: 'Nov 24' },
  { id: 3, name: 'Investment Return', amount: 340, type: 'income', date: 'Nov 23' },
  { id: 4, name: 'Grocery Shopping', amount: -185, type: 'expense', date: 'Nov 22' },
  { id: 5, name: 'Utility Bills', amount: -245, type: 'expense', date: 'Nov 21' },
]

const aiInsights = [
  {
    type: 'success',
    icon: TrendingUp,
    title: 'Great Savings Rate',
    message: 'Your savings rate of 38.8% is well above the recommended 20%. Keep it up!',
  },
  {
    type: 'warning',
    icon: AlertTriangle,
    title: 'Emergency Fund Low',
    message: 'Your emergency fund covers only 2 months of expenses. Aim for 6 months.',
  },
  {
    type: 'info',
    icon: Lightbulb,
    title: 'Investment Opportunity',
    message: 'Consider diversifying into index funds based on your risk profile.',
  },
]

const goals = [
  { name: 'Emergency Fund', current: 12000, target: 30000, color: 'from-blue-500 to-cyan-500' },
  { name: 'Vacation', current: 3500, target: 5000, color: 'from-purple-500 to-pink-500' },
  { name: 'New Car', current: 8000, target: 25000, color: 'from-green-500 to-emerald-500' },
]

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { profile } = useProfileStore()

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    prefix = '' 
  }: { 
    title: string
    value: number | string
    change: number
    icon: React.ElementType
    prefix?: string
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/5">
          <Icon className="w-6 h-6 text-primary-400" />
        </div>
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          change >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {formatPercentage(change)}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">
        {prefix}{typeof value === 'number' ? formatCurrency(value) : value}
      </div>
      <div className="text-sm text-gray-400">{title}</div>
    </motion.div>
  )

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          className="fixed md:relative z-40 w-[280px] h-screen glass-card rounded-none border-y-0 border-l-0 flex flex-col"
        >
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">CFOSync</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {sidebarItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className={cn('sidebar-item', item.active && 'active')}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </motion.aside>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="glass-card rounded-none border-x-0 border-t-0 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl font-bold">
                Welcome back{profile.name ? `, ${profile.name}` : ''}! 👋
              </h1>
              <p className="text-sm text-gray-400">Here's your financial overview</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link to="/chat" className="btn-primary text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Ask AI
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Net Worth"
              value={sampleMetrics.netWorth}
              change={sampleMetrics.netWorthChange}
              icon={Wallet}
            />
            <MetricCard
              title="Monthly Income"
              value={sampleMetrics.monthlyIncome}
              change={sampleMetrics.incomeChange}
              icon={TrendingUp}
            />
            <MetricCard
              title="Monthly Expenses"
              value={sampleMetrics.monthlyExpenses}
              change={sampleMetrics.expensesChange}
              icon={CreditCard}
            />
            <MetricCard
              title="Savings Rate"
              value={`${sampleMetrics.savingsRate}%`}
              change={sampleMetrics.savingsChange}
              icon={PiggyBank}
              prefix=""
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                AI Insights
              </h2>
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-xl border',
                      insight.type === 'success' && 'bg-green-500/10 border-green-500/20',
                      insight.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/20',
                      insight.type === 'info' && 'bg-blue-500/10 border-blue-500/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <insight.icon className={cn(
                        'w-5 h-5 mt-0.5',
                        insight.type === 'success' && 'text-green-400',
                        insight.type === 'warning' && 'text-yellow-400',
                        insight.type === 'info' && 'text-blue-400'
                      )} />
                      <div>
                        <div className="font-medium mb-1">{insight.title}</div>
                        <div className="text-sm text-gray-400">{insight.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Goals Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-400" />
                Financial Goals
              </h2>
              <div className="space-y-6">
                {goals.map((goal, index) => {
                  const progress = (goal.current / goal.target) * 100
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-gray-400">
                          {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                          className={`h-full rounded-full bg-gradient-to-r ${goal.color}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Recent Transactions
              </h2>
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        tx.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                      )}>
                        {tx.type === 'income' ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{tx.name}</div>
                        <div className="text-xs text-gray-400">{tx.date}</div>
                      </div>
                    </div>
                    <div className={cn(
                      'font-semibold',
                      tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: DollarSign, label: 'Add Income', color: 'from-green-500 to-emerald-500' },
                  { icon: CreditCard, label: 'Log Expense', color: 'from-red-500 to-orange-500' },
                  { icon: Target, label: 'Set Goal', color: 'from-purple-500 to-pink-500' },
                  { icon: PiggyBank, label: 'Transfer to Savings', color: 'from-blue-500 to-cyan-500' },
                  { icon: BarChart3, label: 'View Reports', color: 'from-yellow-500 to-amber-500' },
                  { icon: MessageSquare, label: 'Get AI Advice', color: 'from-indigo-500 to-purple-500' },
                ].map((action, index) => (
                  <button
                    key={index}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-105 text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-sm font-medium">{action.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
