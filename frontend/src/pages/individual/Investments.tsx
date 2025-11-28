import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  TrendingUp,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Sparkles,
  Wallet,
  Building,
  Landmark,
  Bitcoin,
  Globe,
  Shield,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { pageDataService, InvestmentsData } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ComponentType<any>> = {
  TrendingUp,
  Globe,
  Shield,
  Building,
  Bitcoin,
  Wallet,
  Landmark
}

export default function Investments() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y')
  const [refreshing, setRefreshing] = useState(false)
  
  // Data from API
  const [investmentsData, setInvestmentsData] = useState<InvestmentsData | null>(null)

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)
    
    try {
      const userId = user?.id || 'demo-user'
      const data = await pageDataService.getInvestmentsData(userId, selectedTimeframe)
      setInvestmentsData(data)
    } catch (err) {
      console.error('Failed to load investments data:', err)
      setError('Failed to load investments data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id, selectedTimeframe])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => loadData(true)} 
        disabled={refreshing}
        className="btn-secondary px-4 py-2 flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Syncing...' : 'Sync'}
      </button>
      <Link to="/individual/chat" className="btn-primary px-4 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Analysis
      </Link>
    </div>
  )

  if (loading) {
    return (
      <IndividualLayout title="Investment Portfolio" description="Track and manage your investments" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your investment portfolio...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  if (error || !investmentsData) {
    return (
      <IndividualLayout title="Investment Portfolio" description="Track and manage your investments" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{error || 'Failed to load data'}</p>
            <button onClick={() => loadData()} className="btn-primary px-6 py-2">Retry</button>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  const { portfolioSummary, assetAllocation, holdings, accountTypes, aiInsights } = investmentsData

  return (
    <IndividualLayout
      title="Investment Portfolio"
      description="Track and manage your investments"
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(portfolioSummary.totalValue)}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`flex items-center text-sm ${portfolioSummary.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioSummary.totalGain >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatCurrency(Math.abs(portfolioSummary.totalGain))} ({portfolioSummary.totalGainPercent}%)
                  </span>
                  <span className="text-gray-500 text-sm">All time</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                <PieChart className="w-8 h-8 text-primary-400" />
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <p className="text-gray-400 text-sm">Today's Change</p>
            <p className={`text-2xl font-bold mt-1 ${portfolioSummary.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {portfolioSummary.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.dayChange)}
            </p>
            <p className={`text-sm ${portfolioSummary.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {portfolioSummary.dayChange >= 0 ? '+' : ''}{portfolioSummary.dayChangePercent}%
            </p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <p className="text-gray-400 text-sm">Number of Holdings</p>
            <p className="text-2xl font-bold text-white mt-1">{holdings.length}</p>
            <p className="text-gray-500 text-sm">Across {accountTypes.length} accounts</p>
          </motion.div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {['1D', '1W', '1M', '3M', '1Y', 'All'].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTimeframe === tf
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Allocation */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-400" />
              Asset Allocation
            </h2>
            
            <div className="space-y-4">
              {assetAllocation.map((asset, index) => {
                const IconComponent = iconMap[asset.name === 'US Stocks' ? 'TrendingUp' : 
                  asset.name === 'International' ? 'Globe' :
                  asset.name === 'Bonds' ? 'Shield' :
                  asset.name === 'Real Estate' ? 'Building' :
                  asset.name === 'Crypto' ? 'Bitcoin' : 'Wallet'] || Wallet
                return (
                  <div key={asset.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-gray-400" />
                        <span className="text-white text-sm">{asset.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white text-sm">{formatCurrency(asset.value)}</span>
                        <span className="text-gray-500 text-xs ml-2">{asset.percent}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${asset.percent}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={`h-full ${asset.color} rounded-full`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Account Types */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-accent-400" />
              Accounts
            </h2>
            
            <div className="space-y-4">
              {accountTypes.map((account, index) => {
                const IconComponent = account.name === '401(k)' ? Landmark :
                  account.name === 'Roth IRA' ? Shield :
                  account.name === 'Crypto Wallet' ? Bitcoin : TrendingUp
                return (
                  <motion.div
                    key={account.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${account.color}`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{account.name}</p>
                        <p className="text-gray-400 text-sm">{formatCurrency(account.value)}</p>
                      </div>
                      <button className="text-primary-400 hover:text-primary-300 text-sm">
                        View →
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            
            <button className="w-full mt-4 p-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:border-white/40 hover:text-white transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Link Account
            </button>
          </motion.div>

          {/* AI Insights */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent-400" />
              AI Insights
            </h2>
            
            <div className="space-y-4">
              {aiInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    insight.type === 'rebalance' ? 'bg-yellow-500/10 border-yellow-500/20' :
                    insight.type === 'opportunity' ? 'bg-green-500/10 border-green-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <h3 className="text-white font-medium text-sm mb-1">{insight.title}</h3>
                  <p className="text-gray-400 text-xs mb-3">{insight.description}</p>
                  <button className="text-primary-400 hover:text-primary-300 text-xs font-medium">
                    {insight.action} →
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Holdings Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              Holdings
            </h2>
            <button className="btn-secondary px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Position
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Symbol</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Name</th>
                  <th className="text-right text-gray-400 text-sm font-medium pb-4">Shares</th>
                  <th className="text-right text-gray-400 text-sm font-medium pb-4">Price</th>
                  <th className="text-right text-gray-400 text-sm font-medium pb-4">Value</th>
                  <th className="text-right text-gray-400 text-sm font-medium pb-4">Change</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, index) => (
                  <motion.tr
                    key={holding.symbol}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-4">
                      <span className="font-mono font-medium text-white">{holding.symbol}</span>
                    </td>
                    <td className="py-4 text-gray-400">{holding.name}</td>
                    <td className="py-4 text-right text-white">{holding.shares}</td>
                    <td className="py-4 text-right text-white">{formatCurrency(holding.price)}</td>
                    <td className="py-4 text-right text-white font-medium">{formatCurrency(holding.value)}</td>
                    <td className="py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 ${holding.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {holding.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>{holding.changePercent >= 0 ? '+' : ''}{holding.changePercent.toFixed(2)}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
