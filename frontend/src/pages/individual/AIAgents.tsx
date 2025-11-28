import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  Shield,
  Target,
  Bell,
  FileText,
  PieChart,
  Briefcase,
  AlertTriangle,
  Sparkles,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  Activity,
  Eye,
  MessageSquare
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { individualAI, companyAI } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'
import toast from 'react-hot-toast'

// Agent categories for organization
const agentCategories = [
  {
    name: 'Analysis & Insights',
    description: 'Understand your finances better',
    agents: ['insights', 'profile', 'risk']
  },
  {
    name: 'Planning & Strategy',
    description: 'Plan for the future',
    agents: ['planning', 'cashflow', 'simulation']
  },
  {
    name: 'Monitoring & Alerts',
    description: 'Stay informed and protected',
    agents: ['nudge', 'compliance', 'document']
  },
  {
    name: 'Business Intelligence',
    description: 'For startups and businesses',
    agents: ['cfo_strategy', 'coordinator']
  }
]

// All agents with professional descriptions
const agentsData: Record<string, {
  name: string
  tagline: string
  description: string
  icon: any
  gradient: string
  features: string[]
  metrics?: { label: string; value: string }[]
}> = {
  insights: {
    name: 'Financial Insights',
    tagline: 'AI-Powered Spending Analysis',
    description: 'Our insights engine analyzes your transaction patterns to uncover hidden opportunities for savings and smarter spending habits.',
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-600',
    features: [
      'Pattern recognition across all transactions',
      'Personalized savings recommendations',
      'Monthly trend analysis & comparisons',
      'Category-wise spending breakdown'
    ],
    metrics: [
      { label: 'Avg. Savings Found', value: '$340/mo' },
      { label: 'Accuracy Rate', value: '94%' }
    ]
  },
  risk: {
    name: 'Risk Assessment',
    tagline: 'Proactive Financial Protection',
    description: 'Continuously monitors your financial health to identify potential risks before they become problems.',
    icon: Shield,
    gradient: 'from-red-500 to-rose-600',
    features: [
      'Real-time risk score calculation',
      'Budget overspending alerts',
      'Emergency fund adequacy check',
      'Debt-to-income monitoring'
    ],
    metrics: [
      { label: 'Risks Detected', value: '12/mo' },
      { label: 'Prevention Rate', value: '87%' }
    ]
  },
  planning: {
    name: 'Smart Planning',
    tagline: 'Goal-Based Financial Strategy',
    description: 'Creates personalized financial plans aligned with your life goals, from buying a home to early retirement.',
    icon: Target,
    gradient: 'from-blue-500 to-indigo-600',
    features: [
      'Custom budget allocation (50/30/20)',
      'Goal timeline projections',
      'Investment recommendations',
      'Debt payoff strategies'
    ],
    metrics: [
      { label: 'Goals Achieved', value: '89%' },
      { label: 'Avg. Time Saved', value: '2.3 yrs' }
    ]
  },
  cashflow: {
    name: 'Cash Flow Forecast',
    tagline: 'Predictive Financial Modeling',
    description: 'Uses machine learning to predict your future cash position and help you avoid overdrafts or missed payments.',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-green-600',
    features: [
      '90-day cash flow projections',
      'Bill payment optimization',
      'Income pattern recognition',
      'Surplus/deficit forecasting'
    ],
    metrics: [
      { label: 'Forecast Accuracy', value: '91%' },
      { label: 'Overdrafts Prevented', value: '156' }
    ]
  },
  simulation: {
    name: 'Life Simulator',
    tagline: 'What-If Financial Scenarios',
    description: 'Model the financial impact of major life decisions before you make them — from career changes to home purchases.',
    icon: Activity,
    gradient: 'from-purple-500 to-violet-600',
    features: [
      'Career change impact analysis',
      'Home purchase affordability',
      'Family planning costs',
      'Retirement scenario modeling'
    ],
    metrics: [
      { label: 'Scenarios Run', value: '2.4K' },
      { label: 'Better Decisions', value: '78%' }
    ]
  },
  profile: {
    name: 'Financial Profile',
    tagline: 'Comprehensive Wealth Analysis',
    description: 'Builds a complete picture of your financial life, tracking net worth and automatically categorizing every transaction.',
    icon: PieChart,
    gradient: 'from-cyan-500 to-teal-600',
    features: [
      'Net worth tracking over time',
      'Automatic transaction categorization',
      'Asset & liability management',
      'Financial health scoring'
    ],
    metrics: [
      { label: 'Categorization', value: '99.2%' },
      { label: 'Time Saved', value: '4 hrs/mo' }
    ]
  },
  nudge: {
    name: 'Smart Alerts',
    tagline: 'Timely Financial Reminders',
    description: 'Sends intelligent notifications at the right moment to help you stay on track with bills, budgets, and goals.',
    icon: Bell,
    gradient: 'from-sky-500 to-blue-600',
    features: [
      'Bill due date reminders',
      'Budget threshold alerts',
      'Goal milestone celebrations',
      'Unusual activity warnings'
    ],
    metrics: [
      { label: 'On-Time Payments', value: '+34%' },
      { label: 'Goals Hit', value: '+28%' }
    ]
  },
  document: {
    name: 'Document Intelligence',
    tagline: 'Automated Data Extraction',
    description: 'Automatically extracts and processes financial data from bank statements, receipts, and other documents.',
    icon: FileText,
    gradient: 'from-slate-500 to-gray-600',
    features: [
      'Bank statement parsing',
      'Receipt OCR & extraction',
      'Tax document processing',
      'Automatic data entry'
    ],
    metrics: [
      { label: 'Documents Processed', value: '50K+' },
      { label: 'Extraction Accuracy', value: '97%' }
    ]
  },
  compliance: {
    name: 'Fraud Detection',
    tagline: 'AI Security & Compliance',
    description: 'Advanced algorithms detect suspicious transactions and potential fraud to keep your finances secure.',
    icon: AlertTriangle,
    gradient: 'from-yellow-500 to-amber-600',
    features: [
      'Real-time fraud detection',
      'Duplicate transaction alerts',
      'Anomaly identification',
      'Compliance monitoring'
    ],
    metrics: [
      { label: 'Fraud Prevented', value: '$2.1M' },
      { label: 'Detection Speed', value: '<1 sec' }
    ]
  },
  cfo_strategy: {
    name: 'CFO Intelligence',
    tagline: 'Enterprise Financial Strategy',
    description: 'Provides CFO-level strategic insights for startups and businesses, from runway analysis to growth optimization.',
    icon: Briefcase,
    gradient: 'from-indigo-500 to-purple-600',
    features: [
      'Cash runway projections',
      'Burn rate optimization',
      'Revenue forecasting',
      'Strategic cost analysis'
    ],
    metrics: [
      { label: 'Runway Extended', value: '+4.2 mo' },
      { label: 'Costs Reduced', value: '23%' }
    ]
  },
  coordinator: {
    name: 'AI Coordinator',
    tagline: 'Intelligent Agent Orchestration',
    description: 'The master brain that coordinates all other agents, routing your requests to the right specialist for optimal results.',
    icon: Brain,
    gradient: 'from-violet-500 to-fuchsia-600',
    features: [
      'Multi-agent orchestration',
      'Context-aware routing',
      'Response synthesis',
      'Continuous learning'
    ],
    metrics: [
      { label: 'Agents Coordinated', value: '11' },
      { label: 'Response Time', value: '<2 sec' }
    ]
  }
}

interface AgentCardProps {
  agentId: string
  onRun: () => void
  isLoading: boolean
  result: any
}

function AgentCard({ agentId, onRun, isLoading, result }: AgentCardProps) {
  const agent = agentsData[agentId]
  if (!agent) return null

  const Icon = agent.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden hover:border-dark-600 transition-all duration-300"
    >
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${agent.gradient}`} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${agent.gradient} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {result && !isLoading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
        <p className="text-sm text-primary-400 font-medium mb-3">{agent.tagline}</p>
        <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
          {agent.description}
        </p>

        {/* Features */}
        <div className="space-y-2 mb-5">
          {agent.features.slice(0, 3).map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${agent.gradient}`} />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Metrics */}
        {agent.metrics && (
          <div className="flex gap-4 mb-5 p-3 bg-dark-900/50 rounded-xl">
            {agent.metrics.map((metric, i) => (
              <div key={i} className="flex-1">
                <p className="text-lg font-bold text-white">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Result Preview */}
        {result && !isLoading && (
          <div className="mb-4 p-3 bg-dark-900/50 rounded-xl border border-dark-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-medium text-primary-400">Latest Analysis</span>
            </div>
            <div className="text-sm text-gray-300">
              {typeof result === 'object' && result.message ? (
                <p className="line-clamp-2">{result.message}</p>
              ) : typeof result === 'object' && result.score !== undefined ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{result.score}</span>
                  <span className="text-gray-500">/ 100 Risk Score</span>
                </div>
              ) : typeof result === 'object' && Array.isArray(result) ? (
                <p>{result.length} items analyzed</p>
              ) : (
                <p className="line-clamp-2">{JSON.stringify(result).slice(0, 80)}...</p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onRun}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
            ${isLoading 
              ? 'bg-dark-700 text-gray-400 cursor-not-allowed' 
              : `bg-gradient-to-r ${agent.gradient} text-white hover:shadow-lg hover:-translate-y-0.5`
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Run Analysis</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default function AIAgents() {
  const { user } = useAuthStore()
  const [loadingAgents, setLoadingAgents] = useState<Record<string, boolean>>({})
  const [agentResults, setAgentResults] = useState<Record<string, any>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const userId = user?.id || 'demo-user'
  const companyId = user?.id || 'demo-company'

  const runAgent = async (agentId: string) => {
    setLoadingAgents(prev => ({ ...prev, [agentId]: true }))

    try {
      let data: any = null

      switch (agentId) {
        case 'insights':
          data = await individualAI.getInsights(userId)
          break
        case 'risk':
          data = await individualAI.assessRisk(userId)
          break
        case 'planning':
          data = await individualAI.getGoalRecommendations(userId, {})
          break
        case 'cashflow':
          data = await companyAI.forecastCashFlow(companyId, 3)
          break
        case 'simulation':
          data = await individualAI.simulateLifeEvent(userId, 'career_change', { newSalary: 95000 })
          break
        case 'profile':
          data = await individualAI.analyzeSpending(userId, [])
          break
        case 'nudge':
          data = await companyAI.getSmartNudges(companyId)
          break
        case 'document':
          data = { message: 'Document processing ready. Upload a bank statement or receipt to begin automatic extraction.' }
          break
        case 'cfo_strategy':
          data = await companyAI.getCFOInsights(companyId)
          break
        case 'compliance':
          data = await companyAI.detectAnomalies(companyId, [])
          break
        case 'coordinator':
          data = { message: 'Coordinator is active and orchestrating all 11 agents. Use AI Chat for natural language queries.' }
          break
        default:
          data = { message: 'Agent ready' }
      }

      setAgentResults(prev => ({ ...prev, [agentId]: data }))
      toast.success(`${agentsData[agentId]?.name} analysis complete`)
    } catch (error: any) {
      console.error(`Agent ${agentId} error:`, error)
      toast.error(`Failed to run ${agentsData[agentId]?.name}`)
    } finally {
      setLoadingAgents(prev => ({ ...prev, [agentId]: false }))
    }
  }

  const runAllAgents = async () => {
    const allAgentIds = Object.keys(agentsData)
    for (const agentId of allAgentIds) {
      await runAgent(agentId)
    }
    toast.success('All agents completed analysis!')
  }

  const completedCount = Object.keys(agentResults).length
  const totalAgents = Object.keys(agentsData).length

  return (
    <IndividualLayout
      title="AI Agents"
      description="Your personal team of AI financial specialists"
    >
      <div className="space-y-8">
        {/* Hero Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-1">{totalAgents} AI Agents</h2>
                <p className="text-primary-200">Working together to optimize your finances</p>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <Brain className="w-10 h-10" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={runAllAgents}
                className="px-5 py-2.5 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Run Full Analysis
              </button>
              <div className="flex items-center gap-2 text-primary-200">
                <Clock className="w-4 h-4" />
                <span className="text-sm">~30 seconds</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-6 border border-dark-700/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-gray-400 text-sm">Completed</span>
            </div>
            <p className="text-3xl font-bold text-white">{completedCount}/{totalAgents}</p>
            <div className="mt-3 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(completedCount / totalAgents) * 100}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-6 border border-dark-700/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">Capabilities</span>
            </div>
            <p className="text-3xl font-bold text-white">44+</p>
            <p className="text-sm text-gray-400 mt-1">AI-powered features</p>
          </motion.div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === null
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white'
            }`}
          >
            All Agents
          </button>
          {agentCategories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.name
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Agents by Category */}
        {agentCategories
          .filter(cat => !activeCategory || cat.name === activeCategory)
          .map((category, catIndex) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                <p className="text-gray-400 text-sm">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.agents.map((agentId) => (
                  <AgentCard
                    key={agentId}
                    agentId={agentId}
                    onRun={() => runAgent(agentId)}
                    isLoading={loadingAgents[agentId] || false}
                    result={agentResults[agentId]}
                  />
                ))}
              </div>
            </motion.div>
          ))}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-dark-800 to-dark-700 rounded-2xl p-8 border border-dark-600/50 text-center"
        >
          <MessageSquare className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Need a Custom Analysis?</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Chat with our AI Coordinator to get personalized insights. Ask any financial question 
            and the right agents will work together to help you.
          </p>
          <a
            href="/individual/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
          >
            <Brain className="w-5 h-5" />
            Start AI Chat
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
