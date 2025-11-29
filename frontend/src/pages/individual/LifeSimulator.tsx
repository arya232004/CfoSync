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
  Loader2,
  Plus,
  X,
  Zap,
  HeartPulse,
  Stethoscope,
  Building,
  Laptop,
  Gift,
  PartyPopper,
  Umbrella,
  Shield,
  Landmark
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { useSettingsStore, formatCurrency as globalFormatCurrency } from '../../lib/store'
import { pageDataService, SimulatorConfig, SimulationResponse } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Icon mapping for life events (expanded)
const eventIconMap: Record<string, React.ComponentType<any>> = {
  Heart,
  Home,
  Car,
  Baby,
  GraduationCap,
  Briefcase,
  Plane,
  TrendingUp,
  Zap,
  HeartPulse,
  Stethoscope,
  Building,
  Laptop,
  Gift,
  PartyPopper,
  Umbrella,
  Shield,
  Landmark,
  DollarSign
}

// Custom event icons for selection
const customEventIcons = [
  { id: 'Zap', name: 'Emergency', icon: Zap },
  { id: 'HeartPulse', name: 'Health', icon: HeartPulse },
  { id: 'Stethoscope', name: 'Medical', icon: Stethoscope },
  { id: 'Building', name: 'Business', icon: Building },
  { id: 'Laptop', name: 'Technology', icon: Laptop },
  { id: 'Gift', name: 'Gift', icon: Gift },
  { id: 'PartyPopper', name: 'Celebration', icon: PartyPopper },
  { id: 'Umbrella', name: 'Insurance', icon: Umbrella },
  { id: 'Shield', name: 'Protection', icon: Shield },
  { id: 'Landmark', name: 'Legal', icon: Landmark },
  { id: 'DollarSign', name: 'Financial', icon: DollarSign },
]

// Custom event color options
const customEventColors = [
  { id: 'pink', gradient: 'from-pink-500 to-rose-500' },
  { id: 'purple', gradient: 'from-purple-500 to-violet-500' },
  { id: 'indigo', gradient: 'from-indigo-500 to-blue-500' },
  { id: 'cyan', gradient: 'from-cyan-500 to-teal-500' },
  { id: 'green', gradient: 'from-green-500 to-emerald-500' },
  { id: 'yellow', gradient: 'from-yellow-500 to-orange-500' },
  { id: 'red', gradient: 'from-red-500 to-pink-500' },
  { id: 'gray', gradient: 'from-gray-500 to-slate-500' },
]

interface CustomEvent {
  id: string
  name: string
  description: string
  icon: string
  color: string
  avgCost: number
  isCustom: true
}

interface SimulationEvent {
  eventId: string
  year: number
  cost: number
  name?: string
}

export default function LifeSimulator() {
  const { user } = useAuthStore()
  const { currency } = useSettingsStore()
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
  
  // Custom events
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [showCustomEventModal, setShowCustomEventModal] = useState(false)
  const [newCustomEvent, setNewCustomEvent] = useState({
    name: '',
    description: '',
    icon: 'Zap',
    color: 'from-purple-500 to-violet-500',
    avgCost: 10000
  })
  
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

  // Use global formatCurrency with real exchange rate conversion
  const formatCurrency = (value: number) => globalFormatCurrency(value, currency)

  const toggleEvent = (eventId: string, isCustom: boolean = false) => {
    setSelectedEvents(prev => {
      const exists = prev.find(e => e.eventId === eventId)
      if (exists) {
        return prev.filter(e => e.eventId !== eventId)
      }
      
      // Find event from either config or custom events
      let event: any
      if (isCustom) {
        event = customEvents.find(e => e.id === eventId)
      } else if (config) {
        event = config.lifeEvents.find(e => e.id === eventId)
      }
      
      if (!event) return prev
      
      return [...prev, { 
        eventId, 
        year: currentAge + 2, 
        cost: event.avgCost, 
        name: event.name 
      }]
    })
  }

  const toggleCustomEvent = (eventId: string) => toggleEvent(eventId, true)

  // Add custom event
  const addCustomEvent = () => {
    if (!newCustomEvent.name.trim()) return
    
    const customEvent: CustomEvent = {
      id: `custom_${Date.now()}`,
      name: newCustomEvent.name,
      description: newCustomEvent.description || `Custom event: ${newCustomEvent.name}`,
      icon: newCustomEvent.icon,
      color: newCustomEvent.color,
      avgCost: newCustomEvent.avgCost,
      isCustom: true
    }
    
    setCustomEvents(prev => [...prev, customEvent])
    setShowCustomEventModal(false)
    setNewCustomEvent({
      name: '',
      description: '',
      icon: 'Zap',
      color: 'from-purple-500 to-violet-500',
      avgCost: 10000
    })
  }

  // Remove custom event
  const removeCustomEvent = (eventId: string) => {
    setCustomEvents(prev => prev.filter(e => e.id !== eventId))
    setSelectedEvents(prev => prev.filter(e => e.eventId !== eventId))
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
              {/* Data Source Indicator */}
              {config.hasRealData !== undefined && (
                <div className={`p-4 rounded-xl border ${config.hasRealData ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                  <div className="flex items-center gap-3">
                    {config.hasRealData ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    <div>
                      <p className={`font-medium ${config.hasRealData ? 'text-green-400' : 'text-yellow-400'}`}>
                        {config.hasRealData ? '✓ Using Your Real Financial Data' : '⚠ Using Estimated Values'}
                      </p>
                      <p className="text-gray-400 text-sm">{config.dataMessage}</p>
                    </div>
                  </div>
                </div>
              )}

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
                        onClick={() => toggleEvent(event.id, false)}
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

              {/* Custom Events Section */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Custom Life Events
                  </h2>
                  <button
                    onClick={() => setShowCustomEventModal(true)}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Event
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm mb-4">
                  Create custom events for scenarios like medical emergencies, starting a business, inheritance, job loss, or any other life situation.
                </p>
                
                {customEvents.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                    <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No custom events yet</p>
                    <p className="text-gray-600 text-sm mt-1">Click "Add Custom Event" to simulate any scenario</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {customEvents.map((event) => {
                      const isSelected = selectedEvents.some(e => e.eventId === event.id)
                      const IconComponent = eventIconMap[event.icon] || Zap
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : 'border-white/10 bg-dark-800/50 hover:border-white/20'
                          }`}
                          onClick={() => toggleCustomEvent(event.id)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeCustomEvent(event.id)
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${event.color} flex items-center justify-center mb-3`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-white font-medium mb-1">{event.name}</h3>
                          <p className="text-gray-500 text-xs mb-2 line-clamp-2">{event.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-sm">{formatCurrency(event.avgCost)}</p>
                            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Custom</span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
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
                      // Find event from either config or custom events
                      const configEvent = config.lifeEvents.find(e => e.id === selectedEvent.eventId)
                      const customEvent = customEvents.find(e => e.id === selectedEvent.eventId)
                      const event = configEvent || customEvent
                      
                      if (!event) return null
                      
                      const IconComponent = eventIconMap[event.icon] || Heart
                      const isCustom = !!customEvent
                      
                      return (
                        <div key={selectedEvent.eventId} className={`p-4 rounded-xl border ${isCustom ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-dark-800/50 border-white/10'}`}>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${event.color}`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <span className="text-white font-medium">{event.name}</span>
                              {isCustom && <span className="ml-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Custom</span>}
                            </div>
                            
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
              {/* Results Summary - Enhanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Projected Net Worth at Retirement</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(simulationResults.summary.retirementNetWorth)}
                  </p>
                  <p className="text-green-400 text-sm mt-1">At age {retirementAge} • {simulationResults.summary.yearsOfExpenses} years of expenses</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Total Life Event Costs</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(simulationResults.summary.totalEventCosts)}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">{simulationResults.summary.eventsCount} events planned</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
                  <p className="text-gray-400 text-sm">Peak Net Worth</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(simulationResults.summary.peakNetWorth || 0)}
                  </p>
                  <p className="text-blue-400 text-sm mt-1">At age {simulationResults.summary.peakAge || retirementAge}</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
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
                  {simulationResults.summary.savingsRate !== undefined && (
                    <p className="text-gray-500 text-sm mt-1">{simulationResults.summary.savingsRate}% savings rate</p>
                  )}
                </motion.div>
              </div>

              {/* Scenario Comparison */}
              {simulationResults.scenarios && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-400" />
                    Scenario Analysis
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 font-medium mb-1">📉 Pessimistic</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(simulationResults.scenarios.pessimistic.netWorth)}</p>
                      <p className="text-gray-400 text-xs mt-2">{simulationResults.scenarios.pessimistic.description}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 font-medium mb-1">📊 Base Case</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(simulationResults.summary.retirementNetWorth)}</p>
                      <p className="text-gray-400 text-xs mt-2">Current trajectory with 7% average returns</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 font-medium mb-1">📈 Optimistic</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(simulationResults.scenarios.optimistic.netWorth)}</p>
                      <p className="text-gray-400 text-xs mt-2">{simulationResults.scenarios.optimistic.description}</p>
                    </div>
                  </div>
                </motion.div>
              )}

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

              {/* AI Analysis - Enhanced */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent-400" />
                  AI Analysis & Recommendations
                </h2>
                
                <div className="space-y-4">
                  {simulationResults.aiAnalysis.map((analysis, index) => {
                    // Determine styling based on analysis type
                    const getTypeStyles = (type: string) => {
                      switch (type) {
                        case 'success':
                          return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' }
                        case 'warning':
                          return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' }
                        case 'danger':
                          return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' }
                        case 'info':
                          return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' }
                        case 'tip':
                          return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' }
                        case 'insight':
                          return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' }
                        default:
                          return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' }
                      }
                    }
                    const styles = getTypeStyles(analysis.type)
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl border ${styles.bg} ${styles.border}`}
                      >
                        <h3 className={`font-medium mb-2 ${styles.text}`}>
                          {analysis.title}
                        </h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{analysis.description}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Event Modal */}
      <AnimatePresence>
        {showCustomEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCustomEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Create Custom Event
                </h3>
                <button onClick={() => setShowCustomEventModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Name *</label>
                  <input
                    type="text"
                    value={newCustomEvent.name}
                    onChange={(e) => setNewCustomEvent(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Medical Emergency, Start a Business, Inheritance"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newCustomEvent.description}
                    onChange={(e) => setNewCustomEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this event and its potential impact on your finances..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
                
                {/* Estimated Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Cost *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={newCustomEvent.avgCost}
                      onChange={(e) => setNewCustomEvent(prev => ({ ...prev, avgCost: Number(e.target.value) }))}
                      placeholder="10000"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Use negative values for income events (e.g., inheritance: -50000)</p>
                </div>
                
                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {customEventIcons.map((iconOption) => {
                      const IconComp = iconOption.icon
                      return (
                        <button
                          key={iconOption.id}
                          onClick={() => setNewCustomEvent(prev => ({ ...prev, icon: iconOption.id }))}
                          className={`p-3 rounded-lg border transition-all ${
                            newCustomEvent.icon === iconOption.id
                              ? 'border-primary-500 bg-primary-500/20'
                              : 'border-white/10 hover:border-white/20 bg-dark-800'
                          }`}
                          title={iconOption.name}
                        >
                          <IconComp className="w-5 h-5 text-white mx-auto" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {customEventColors.map((colorOption) => (
                      <button
                        key={colorOption.id}
                        onClick={() => setNewCustomEvent(prev => ({ ...prev, color: colorOption.gradient }))}
                        className={`h-10 rounded-lg bg-gradient-to-br ${colorOption.gradient} border-2 transition-all ${
                          newCustomEvent.color === colorOption.gradient
                            ? 'border-white'
                            : 'border-transparent hover:border-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Preview */}
                <div className="p-4 rounded-xl bg-dark-800/50 border border-white/10">
                  <p className="text-gray-400 text-xs mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${newCustomEvent.color} flex items-center justify-center`}>
                      {(() => {
                        const PreviewIcon = eventIconMap[newCustomEvent.icon] || Zap
                        return <PreviewIcon className="w-5 h-5 text-white" />
                      })()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{newCustomEvent.name || 'Event Name'}</p>
                      <p className="text-gray-500 text-sm">{formatCurrency(newCustomEvent.avgCost)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCustomEventModal(false)}
                    className="flex-1 btn-secondary py-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomEvent}
                    disabled={!newCustomEvent.name.trim()}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </IndividualLayout>
  )
}
