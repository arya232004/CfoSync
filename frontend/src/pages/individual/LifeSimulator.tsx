import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  Heart,
  Home,
  Car,
  GraduationCap,
  Baby,
  Briefcase,
  Plane,
  DollarSign,
  TrendingUp,
  Calendar,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { pageDataService, SimulatorConfig, SimulationResponse } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Icon mapping for life events
const eventIconMap: Record<string, React.ComponentType<any>> = {
  Heart,
  Home,
  Car,
  Baby,
  GraduationCap,
  Briefcase,
  Plane,
  TrendingUp
}

interface SimulationEvent {
  eventId: string
  year: number
  cost: number
  name?: string
}

export default function LifeSimulator() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Config from API
  const [config, setConfig] = useState<SimulatorConfig | null>(null)
  
  // User inputs
  const [selectedEvents, setSelectedEvents] = useState<SimulationEvent[]>([])
  const [showResults, setShowResults] = useState(false)
  const [currentAge, setCurrentAge] = useState(30)
  const [retirementAge, setRetirementAge] = useState(65)
  const [currentIncome, setCurrentIncome] = useState(85000)
  const [currentSavings, setCurrentSavings] = useState(50000)
  const [monthlyExpenses, setMonthlyExpenses] = useState(4500)
  
  // Simulation results
  const [simulationResults, setSimulationResults] = useState<SimulationResponse | null>(null)

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      setError(null)
      try {
        const userId = user?.id || 'demo-user'
        const configData = await pageDataService.getSimulatorConfig(userId)
        setConfig(configData)
        
        // Set defaults from config
        if (configData.defaults) {
          setCurrentAge(configData.defaults.currentAge)
          setRetirementAge(configData.defaults.retirementAge)
          setCurrentIncome(configData.defaults.currentIncome)
          setCurrentSavings(configData.defaults.currentSavings)
          setMonthlyExpenses(configData.defaults.monthlyExpenses)
        }
      } catch (err) {
        console.error('Failed to load simulator config:', err)
        setError('Failed to load simulator configuration.')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [user?.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const toggleEvent = (eventId: string) => {
    if (!config) return
    setSelectedEvents(prev => {
      const exists = prev.find(e => e.eventId === eventId)
      if (exists) {
        return prev.filter(e => e.eventId !== eventId)
      }
      const event = config.lifeEvents.find(e => e.id === eventId)!
      return [...prev, { eventId, year: currentAge + 2, cost: event.avgCost, name: event.name }]
    })
  }

  const updateEventYear = (eventId: string, year: number) => {
    setSelectedEvents(prev => 
      prev.map(e => e.eventId === eventId ? { ...e, year } : e)
    )
  }

  const updateEventCost = (eventId: string, cost: number) => {
    setSelectedEvents(prev => 
      prev.map(e => e.eventId === eventId ? { ...e, cost } : e)
    )
  }

  const runSimulation = async () => {
    setSimulating(true)
    try {
      const userId = user?.id || 'demo-user'
      const results = await pageDataService.runSimulation(
        userId,
        currentAge,
        retirementAge,
        currentIncome,
        currentSavings,
        monthlyExpenses,
        selectedEvents
      )
      setSimulationResults(results)
      setShowResults(true)
    } catch (err) {
      console.error('Failed to run simulation:', err)
      setError('Failed to run simulation. Please try again.')
    } finally {
      setSimulating(false)
    }
  }

  const resetSimulation = () => {
    setSelectedEvents([])
    setShowResults(false)
    setSimulationResults(null)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      {showResults && (
        <button onClick={resetSimulation} className="btn-secondary px-4 py-2 flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      )}
      <Link to="/individual/chat" className="btn-primary px-4 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Advice
      </Link>
    </div>
  )

  if (loading) {
    return (
      <IndividualLayout title="Life Event Simulator" description="Plan for major life events and see their financial impact" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading simulator...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  if (error || !config) {
    return (
      <IndividualLayout title="Life Event Simulator" description="Plan for major life events and see their financial impact" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{error || 'Failed to load'}</p>
            <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2">Retry</button>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  return (
    <IndividualLayout
      title="Life Event Simulator"
      description="Plan for major life events and see their financial impact"
      headerActions={headerActions}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Current Financial Situation */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-400" />
                  Your Current Situation
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Current Age</label>
                    <input
                      type="number"
                      value={currentAge}
                      onChange={(e) => setCurrentAge(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Retirement Age</label>
                    <input
                      type="number"
                      value={retirementAge}
                      onChange={(e) => setRetirementAge(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Annual Income</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={currentIncome}
                        onChange={(e) => setCurrentIncome(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Current Savings</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={currentSavings}
                        onChange={(e) => setCurrentSavings(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Expenses</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={monthlyExpenses}
                        onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Life Events Selection */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent-400" />
                  Select Life Events to Simulate
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {config.lifeEvents.map((event) => {
                    const isSelected = selectedEvents.some(e => e.eventId === event.id)
                    const IconComponent = eventIconMap[event.icon] || Heart
                    return (
                      <motion.button
                        key={event.id}
                        onClick={() => toggleEvent(event.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-white/10 bg-dark-800/50 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${event.color} flex items-center justify-center mb-3`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-white font-medium mb-1">{event.name}</h3>
                        <p className="text-gray-500 text-xs mb-2">{event.description}</p>
                        <p className="text-gray-400 text-sm">Avg: {formatCurrency(event.avgCost)}</p>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Selected Events Configuration */}
              {selectedEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-400" />
                    Configure Your Timeline
                  </h2>
                  
                  <div className="space-y-4">
                    {selectedEvents.map((selectedEvent) => {
                      const event = config.lifeEvents.find(e => e.id === selectedEvent.eventId)!
                      const IconComponent = eventIconMap[event.icon] || Heart
                      return (
                        <div key={selectedEvent.eventId} className="p-4 rounded-xl bg-dark-800/50 border border-white/10">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${event.color}`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-white font-medium flex-1 min-w-[150px]">{event.name}</span>
                            
                            <div className="flex items-center gap-2">
                              <label className="text-gray-400 text-sm">At age:</label>
                              <input
                                type="number"
                                value={selectedEvent.year}
                                onChange={(e) => updateEventYear(selectedEvent.eventId, Number(e.target.value))}
                                min={currentAge}
                                max={100}
                                className="w-20 px-3 py-2 rounded-lg bg-dark-900 border border-white/10 text-white text-center focus:border-primary-500 focus:outline-none"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <label className="text-gray-400 text-sm">Cost:</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                  type="number"
                                  value={selectedEvent.cost}
                                  onChange={(e) => updateEventCost(selectedEvent.eventId, Number(e.target.value))}
                                  className="w-32 pl-7 pr-3 py-2 rounded-lg bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={runSimulation}
                    disabled={simulating}
                    className="w-full mt-6 btn-primary py-4 flex items-center justify-center gap-2 text-lg"
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Running Simulation...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : simulationResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Projected Net Worth at Retirement</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(simulationResults.summary.retirementNetWorth)}
                  </p>
                  <p className="text-green-400 text-sm mt-1">At age {retirementAge}</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Total Life Event Costs</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(simulationResults.summary.totalEventCosts)}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">{simulationResults.summary.eventsCount} events planned</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Simulation Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    {simulationResults.summary.isOnTrack ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-400" />
                        <span className="text-xl font-bold text-green-400">On Track</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                        <span className="text-xl font-bold text-yellow-400">Needs Adjustment</span>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Timeline */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  Financial Timeline
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 text-sm font-medium pb-4">Age</th>
                        <th className="text-left text-gray-400 text-sm font-medium pb-4">Year</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-4">Income</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-4">Expenses</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-4">Net Savings</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-4">Net Worth</th>
                        <th className="text-left text-gray-400 text-sm font-medium pb-4 pl-4">Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResults.results.filter((_, i) => i % 5 === 0 || simulationResults.results[i].events.length > 0).map((result, index) => (
                        <motion.tr
                          key={result.year}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`border-b border-white/5 ${
                            result.age === retirementAge ? 'bg-primary-500/10' : ''
                          }`}
                        >
                          <td className="py-3">
                            <span className={`font-medium ${result.age === retirementAge ? 'text-primary-400' : 'text-white'}`}>
                              {result.age}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400">{result.year}</td>
                          <td className="py-3 text-right text-white">{formatCurrency(result.income)}</td>
                          <td className="py-3 text-right text-gray-400">{formatCurrency(result.expenses)}</td>
                          <td className={`py-3 text-right ${result.savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.savings >= 0 ? '+' : ''}{formatCurrency(result.savings)}
                          </td>
                          <td className={`py-3 text-right font-medium ${
                            result.status === 'positive' ? 'text-green-400' :
                            result.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(result.netWorth)}
                          </td>
                          <td className="py-3 pl-4">
                            {result.events.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {result.events.map((event, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-xs">
                                    {event}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* AI Analysis */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent-400" />
                  AI Analysis & Recommendations
                </h2>
                
                <div className="space-y-4">
                  {simulationResults.aiAnalysis.map((analysis, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border ${
                        analysis.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                        analysis.type === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
                        'bg-purple-500/10 border-purple-500/20'
                      }`}
                    >
                      <h3 className={`font-medium mb-2 ${
                        analysis.type === 'success' ? 'text-green-400' :
                        analysis.type === 'info' ? 'text-blue-400' :
                        'text-purple-400'
                      }`}>
                        {analysis.type === 'success' ? '✓ ' : analysis.type === 'info' ? '💡 ' : '📈 '}
                        {analysis.title}
                      </h3>
                      <p className="text-gray-400 text-sm">{analysis.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IndividualLayout>
  )
}
