import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  Home,
  LayoutDashboard,
  MessageSquare,
  User,
  Settings,
  Menu,
  X,
  Send,
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { getAgents, invokeAgent, healthCheck, AgentsListResponse, AgentResponse } from '../lib/api'
import { cn, agentColors, agentIcons } from '../lib/utils'
import toast from 'react-hot-toast'

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: MessageSquare, label: 'AI Chat', path: '/chat' },
  { icon: Bot, label: 'Agents', path: '/agents', active: true },
  { icon: User, label: 'Profile', path: '/onboarding' },
  { icon: Settings, label: 'Settings', path: '#' },
]

export default function Agents() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agentsData, setAgentsData] = useState<AgentsListResponse | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    checkBackendAndLoadAgents()
  }, [])

  const checkBackendAndLoadAgents = async () => {
    try {
      await healthCheck()
      setBackendStatus('online')
      const agents = await getAgents()
      setAgentsData(agents)
    } catch (error) {
      console.error('Failed to connect to backend:', error)
      setBackendStatus('offline')
      toast.error('Cannot connect to backend. Make sure it\'s running on port 8000.')
    }
  }

  const handleInvokeAgent = async () => {
    if (!selectedAgent || !input.trim()) {
      toast.error('Please select an agent and enter a message')
      return
    }

    setIsLoading(true)
    setResponse(null)

    try {
      const result = await invokeAgent(selectedAgent, input.trim())
      setResponse(result)
      toast.success(`${selectedAgent} agent responded!`)
    } catch (error: any) {
      console.error('Agent error:', error)
      const errorMsg = error?.response?.data?.detail || 'Failed to invoke agent'
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

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
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary-400" />
                AI Agents
              </h1>
              <p className="text-sm text-gray-400">Interact with individual specialized agents</p>
            </div>
          </div>

          {/* Backend Status */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
            backendStatus === 'online' && 'bg-green-500/20 text-green-400',
            backendStatus === 'offline' && 'bg-red-500/20 text-red-400',
            backendStatus === 'checking' && 'bg-yellow-500/20 text-yellow-400'
          )}>
            {backendStatus === 'online' && <CheckCircle className="w-4 h-4" />}
            {backendStatus === 'offline' && <AlertCircle className="w-4 h-4" />}
            {backendStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
            Backend {backendStatus}
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Agents Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Select an Agent</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {agentsData?.agents.map((agent) => (
                <motion.button
                  key={agent}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    'p-4 rounded-xl text-center transition-all border-2',
                    selectedAgent === agent
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl',
                    `bg-gradient-to-br ${agentColors[agent] || 'from-gray-500 to-gray-600'}`
                  )}>
                    {agentIcons[agent] || '🤖'}
                  </div>
                  <div className="font-medium text-sm capitalize">{agent.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {agentsData?.descriptions[agent] || 'AI Agent'}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Agent Interaction */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-400" />
                Send Message
              </h2>

              {selectedAgent ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                      `bg-gradient-to-br ${agentColors[selectedAgent] || 'from-gray-500 to-gray-600'}`
                    )}>
                      {agentIcons[selectedAgent] || '🤖'}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{selectedAgent.replace('_', ' ')} Agent</div>
                      <div className="text-xs text-gray-400">{agentsData?.descriptions[selectedAgent]}</div>
                    </div>
                  </div>

                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask the ${selectedAgent} agent...`}
                    className="input-field min-h-[120px] resize-none"
                    disabled={isLoading}
                  />

                  <button
                    onClick={handleInvokeAgent}
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      'w-full btn-primary flex items-center justify-center gap-2',
                      (isLoading || !input.trim()) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send to Agent
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select an agent above to start interacting</p>
                </div>
              )}
            </motion.div>

            {/* Response Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-400" />
                Agent Response
              </h2>

              {response ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="capitalize">{response.agent} Agent</span>
                    {response.session_id && (
                      <>
                        <span>•</span>
                        <span>Session: {response.session_id.slice(0, 8)}...</span>
                      </>
                    )}
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="whitespace-pre-wrap text-gray-200">
                      {response.response}
                    </div>
                  </div>

                  {response.events && response.events.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-400 hover:text-white">
                        View Events ({response.events.length})
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg bg-black/30 overflow-x-auto text-xs text-gray-400">
                        {JSON.stringify(response.events, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Response will appear here</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Examples */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Quick Examples by Agent</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { agent: 'profile', prompt: 'Create a profile for a 30-year-old software engineer earning $120k' },
                { agent: 'insights', prompt: 'Analyze spending of $3000/month rent, $500 food, $200 utilities' },
                { agent: 'risk', prompt: 'Assess risk for a portfolio with 60% stocks, 30% bonds, 10% crypto' },
                { agent: 'planning', prompt: 'Create a savings plan to save $50k in 2 years' },
                { agent: 'simulation', prompt: 'Simulate what happens if I increase my savings rate by 10%' },
                { agent: 'cashflow', prompt: 'Predict cash flow for next 3 months with $8k income, $5k expenses' },
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedAgent(example.agent)
                    setInput(example.prompt)
                  }}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-all border border-white/10 hover:border-white/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{agentIcons[example.agent]}</span>
                    <span className="font-medium capitalize text-sm">{example.agent}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{example.prompt}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
