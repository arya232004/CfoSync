import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Target,
  DollarSign,
  TrendingUp,
  PiggyBank,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Plus,
  Brain,
  Loader2,
  AlertTriangle,
  X,
  Calendar,
  Edit2,
  Trash2,
  ChevronRight,
  Zap,
  Clock,
  RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { useSettingsStore, formatCurrency as globalFormatCurrency } from '../../lib/store'
import { pageDataService, PlanningData, goalsAPI, Goal, GoalAnalysis } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Available icons for goal creation
const availableIcons = [
  { emoji: '🎯', name: 'Target' },
  { emoji: '💰', name: 'Money' },
  { emoji: '🏠', name: 'Home' },
  { emoji: '✈️', name: 'Travel' },
  { emoji: '🛡️', name: 'Emergency' },
  { emoji: '🐷', name: 'Savings' },
  { emoji: '📈', name: 'Investment' },
  { emoji: '🎓', name: 'Education' },
  { emoji: '🚗', name: 'Vehicle' },
  { emoji: '❤️', name: 'Health' },
  { emoji: '💼', name: 'Business' },
  { emoji: '☕', name: 'Lifestyle' },
  { emoji: '🎁', name: 'Gift' },
  { emoji: '💳', name: 'Debt' }
]

// Available colors for goals
const availableColors = [
  { value: 'from-blue-500 to-purple-600', name: 'Blue Purple', preview: 'bg-gradient-to-r from-blue-500 to-purple-600' },
  { value: 'from-green-500 to-emerald-600', name: 'Green', preview: 'bg-gradient-to-r from-green-500 to-emerald-600' },
  { value: 'from-orange-500 to-red-600', name: 'Orange Red', preview: 'bg-gradient-to-r from-orange-500 to-red-600' },
  { value: 'from-pink-500 to-rose-600', name: 'Pink', preview: 'bg-gradient-to-r from-pink-500 to-rose-600' },
  { value: 'from-cyan-500 to-blue-600', name: 'Cyan Blue', preview: 'bg-gradient-to-r from-cyan-500 to-blue-600' },
  { value: 'from-yellow-500 to-orange-600', name: 'Yellow Orange', preview: 'bg-gradient-to-r from-yellow-500 to-orange-600' },
  { value: 'from-indigo-500 to-purple-600', name: 'Indigo', preview: 'bg-gradient-to-r from-indigo-500 to-purple-600' },
  { value: 'from-teal-500 to-green-600', name: 'Teal Green', preview: 'bg-gradient-to-r from-teal-500 to-green-600' }
]

// Goal categories
const goalCategories = [
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'debt', label: 'Debt Payoff' },
  { value: 'purchase', label: 'Major Purchase' },
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'general', label: 'General' }
]

interface AddGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Omit<Goal, 'id' | 'user_id' | 'progress' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>
  editingGoal?: Goal | null
}

function AddGoalModal({ isOpen, onClose, onSave, editingGoal }: AddGoalModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target: 0,
    current: 0,
    targetDate: '',
    monthlyContribution: 0,
    icon: '🎯',
    color: 'from-blue-500 to-purple-600',
    priority: 'medium' as 'high' | 'medium' | 'low',
    category: 'general' as Goal['category']
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        description: editingGoal.description || '',
        target: editingGoal.target,
        current: editingGoal.current,
        targetDate: editingGoal.targetDate,
        monthlyContribution: editingGoal.monthlyContribution,
        icon: editingGoal.icon,
        color: editingGoal.color,
        priority: editingGoal.priority,
        category: editingGoal.category
      })
    } else {
      // Set default target date to 1 year from now
      const defaultDate = new Date()
      defaultDate.setFullYear(defaultDate.getFullYear() + 1)
      setFormData({
        name: '',
        description: '',
        target: 0,
        current: 0,
        targetDate: defaultDate.toISOString().split('T')[0],
        monthlyContribution: 0,
        icon: '🎯',
        color: 'from-blue-500 to-purple-600',
        priority: 'medium',
        category: 'general'
      })
    }
  }, [editingGoal, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || formData.target <= 0) return
    
    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      console.error('Error saving goal:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-dark-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingGoal ? <Edit2 className="w-5 h-5 text-primary-400" /> : <Plus className="w-5 h-5 text-primary-400" />}
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Goal Name & Description */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Goal Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund, Dream Vacation, New Car"
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this goal for? Any specific details..."
                  rows={2}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as Goal['category'] })}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                >
                  {goalCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                >
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Target Amount *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    value={formData.target || ''}
                    onChange={e => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
                    placeholder="10000"
                    min="1"
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    value={formData.current || ''}
                    onChange={e => setFormData({ ...formData, current: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Monthly Contribution</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    value={formData.monthlyContribution || ''}
                    onChange={e => setFormData({ ...formData, monthlyContribution: parseFloat(e.target.value) || 0 })}
                    placeholder="500"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Target Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {availableIcons.map(icon => (
                  <button
                    key={icon.emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: icon.emoji })}
                    className={`p-3 rounded-xl text-2xl transition-all ${
                      formData.icon === icon.emoji
                        ? 'bg-primary-500/20 border-2 border-primary-500'
                        : 'bg-dark-700 border-2 border-transparent hover:border-white/20'
                    }`}
                    title={icon.name}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-10 h-10 rounded-xl ${color.preview} transition-all ${
                      formData.color === color.value
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800'
                        : 'hover:scale-110'
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-dark-900/50 rounded-xl border border-white/5">
              <p className="text-xs text-gray-500 mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${formData.color}`}>
                  <span className="text-2xl">{formData.icon}</span>
                </div>
                <div>
                  <h4 className="font-medium text-white">{formData.name || 'Goal Name'}</h4>
                  <p className="text-sm text-gray-400">
                    ${formData.current.toLocaleString()} / ${formData.target.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.name || formData.target <= 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingGoal ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {saving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface GoalDetailModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
}

function GoalDetailModal({ isOpen, onClose, goal, onEdit, onDelete }: GoalDetailModalProps) {
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && goal?.id) {
      loadAnalysis()
    }
  }, [isOpen, goal?.id])

  const loadAnalysis = async () => {
    if (!goal?.id) return
    setLoading(true)
    setAnalysis(null) // Reset analysis when loading
    try {
      const result = await goalsAPI.getGoalAnalysis(goal.id)
      if (result.success && result.analysis) {
        setAnalysis(result.analysis)
      } else {
        console.error('Goal analysis returned unsuccessful or empty result')
      }
    } catch (err) {
      console.error('Error loading goal analysis:', err)
      // Don't throw - let the UI show the retry button
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!goal?.id || !confirm('Are you sure you want to delete this goal?')) return
    setDeleting(true)
    try {
      await onDelete(goal.id)
      onClose()
    } catch (err) {
      console.error('Error deleting goal:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen || !goal) return null

  const progress = goal.progress || (goal.target > 0 ? (goal.current / goal.target) * 100 : 0)
  const statusColors: Record<string, string> = {
    'on-track': 'bg-green-500/20 text-green-400 border-green-500/30',
    'at-risk': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'behind': 'bg-red-500/20 text-red-400 border-red-500/30',
    'completed': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'overdue': 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-dark-800 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${goal.color}`}>
                  <span className="text-3xl">{goal.icon}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{goal.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{goal.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[goal.status || 'on-track']}`}>
                      {goal.status?.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      goal.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      goal.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {goal.priority?.charAt(0).toUpperCase() + goal.priority?.slice(1)} Priority
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onEdit(goal); onClose() }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-white">${goal.current.toLocaleString()}</span>
                <span className="text-gray-400">of ${goal.target.toLocaleString()}</span>
              </div>
              <div className="h-4 bg-dark-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full bg-gradient-to-r ${goal.color} rounded-full`}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-primary-400 font-medium">{progress.toFixed(1)}% complete</span>
                <span className="text-gray-400">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-dark-700/50 rounded-xl">
                    <p className="text-gray-400 text-xs mb-1">Amount Remaining</p>
                    <p className="text-xl font-bold text-white">${analysis.summary.amountRemaining.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-dark-700/50 rounded-xl">
                    <p className="text-gray-400 text-xs mb-1">Months to Complete</p>
                    <p className="text-xl font-bold text-white">{analysis.summary.monthsToComplete}</p>
                  </div>
                  <div className="p-4 bg-dark-700/50 rounded-xl">
                    <p className="text-gray-400 text-xs mb-1">Monthly Contribution</p>
                    <p className="text-xl font-bold text-white">${goal.monthlyContribution.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-dark-700/50 rounded-xl">
                    <p className="text-gray-400 text-xs mb-1">Optimal Contribution</p>
                    <p className={`text-xl font-bold ${analysis.summary.contributionGap > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      ${analysis.summary.optimalContribution.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Track Status */}
                {analysis.summary.contributionGap > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Action Required</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      To reach your goal by the target date, increase your monthly contribution by{' '}
                      <strong className="text-yellow-400">${analysis.summary.contributionGap.toLocaleString()}</strong> to{' '}
                      <strong>${analysis.summary.optimalContribution.toLocaleString()}</strong>/month.
                    </p>
                  </div>
                )}

                {/* Projections */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-400" />
                    Completion Projections
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-dark-700/30 rounded-xl border border-white/5">
                      <p className="text-xs text-gray-500 mb-1">Current Pace</p>
                      <p className="text-lg font-bold text-white">{analysis.projections.currentPace.completionDate}</p>
                      <p className="text-xs text-gray-400">{analysis.projections.currentPace.monthsToComplete} months</p>
                    </div>
                    <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
                      <p className="text-xs text-primary-400 mb-1">Optimized Pace</p>
                      <p className="text-lg font-bold text-white">{analysis.projections.optimizedPace.completionDate}</p>
                      <p className="text-xs text-gray-400">{analysis.projections.optimizedPace.monthsToComplete} months</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                      <p className="text-xs text-green-400 mb-1">Aggressive Pace</p>
                      <p className="text-lg font-bold text-white">{analysis.projections.aggressivePace.completionDate}</p>
                      <p className="text-xs text-gray-400">{analysis.projections.aggressivePace.monthsToComplete} months</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-accent-400" />
                      AI Recommendations
                    </h3>
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-dark-700/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              rec.impact === 'high' ? 'bg-green-500/20' :
                              rec.impact === 'medium' ? 'bg-blue-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <Sparkles className={`w-4 h-4 ${
                                rec.impact === 'high' ? 'text-green-400' :
                                rec.impact === 'medium' ? 'text-blue-400' :
                                'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{rec.title}</h4>
                              <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accelerators */}
                {analysis.accelerators.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Ways to Accelerate
                    </h3>
                    <div className="space-y-3">
                      {analysis.accelerators.map((acc, idx) => (
                        <div key={idx} className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{acc.title}</h4>
                              <p className="text-sm text-gray-400 mt-1">{acc.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Potential Increase</p>
                              <p className="text-lg font-bold text-yellow-400">+${acc.potentialIncrease.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {analysis.risks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      Risks to Watch
                    </h3>
                    <div className="space-y-3">
                      {analysis.risks.map((risk, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${
                          risk.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
                          risk.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
                          'bg-gray-500/10 border-gray-500/20'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                              risk.severity === 'high' ? 'text-red-400' :
                              risk.severity === 'medium' ? 'text-yellow-400' :
                              'text-gray-400'
                            }`} />
                            <div>
                              <h4 className="font-medium text-white">{risk.title}</h4>
                              <p className="text-sm text-gray-400 mt-1">{risk.description}</p>
                              <p className="text-sm text-primary-400 mt-2">
                                <strong>Mitigation:</strong> {risk.mitigation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Unable to load analysis. Please try again.</p>
                <button onClick={loadAnalysis} className="mt-4 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Planning() {
  const { user } = useAuthStore()
  const { currency } = useSettingsStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data from API
  const [planningData, setPlanningData] = useState<PlanningData | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [financialSummary, setFinancialSummary] = useState<{ monthlyIncome: number; monthlyExpenses: number; monthlySavings: number } | null>(null)

  // Modal states
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [showGoalDetailModal, setShowGoalDetailModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = user?.id || 'demo-user'
      
      // Load planning data (includes goals from Firebase now)
      const planningResult = await pageDataService.getPlanningData(userId)
      
      // Also get goals separately for the financial summary
      const goalsResult = await goalsAPI.getGoals()
      
      setPlanningData(planningResult)
      // Use goals from planning data (they have updated status calculations)
      // Map to ensure all required Goal properties exist with defaults
      const mappedGoals: Goal[] = (planningResult.financialGoals || []).map((g: any) => ({
        id: g.id || '',
        user_id: g.user_id || userId,
        name: g.name || '',
        description: g.description || '',
        target: g.target || 0,
        current: g.current || 0,
        targetDate: g.targetDate || '',
        monthlyContribution: g.monthlyContribution || 0,
        icon: g.icon || '🎯',
        color: g.color || 'from-blue-500 to-purple-600',
        priority: g.priority || 'medium',
        category: g.category || 'general',
        progress: g.progress || 0,
        status: g.status || 'not-started'
      }))
      setGoals(mappedGoals)
      setFinancialSummary(goalsResult.financialSummary || null)
    } catch (err) {
      console.error('Failed to load planning data:', err)
      setError('Failed to load planning data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGoal = async (goalData: Omit<Goal, 'id' | 'user_id' | 'progress' | 'status' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingGoal?.id) {
        // Update existing goal
        await goalsAPI.updateGoal(editingGoal.id, goalData)
      } else {
        // Create new goal
        await goalsAPI.createGoal(goalData)
      }
      // Refresh all data (goals + planning data to update budget, recommendations, etc.)
      await loadData()
      setEditingGoal(null)
    } catch (error) {
      console.error('Error saving goal:', error)
      alert('Failed to save goal. Please try again.')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await goalsAPI.deleteGoal(goalId)
      // Refresh all data
      await loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Failed to delete goal. Please try again.')
    }
  }

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal)
    setShowGoalDetailModal(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowAddGoalModal(true)
  }

  // Use global formatCurrency with real exchange rate conversion
  const formatCurrency = (value: number) => globalFormatCurrency(value, currency)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-500/20 text-green-400'
      case 'at-risk': return 'bg-yellow-500/20 text-yellow-400'
      case 'behind': return 'bg-red-500/20 text-red-400'
      case 'completed': return 'bg-blue-500/20 text-blue-400'
      case 'overdue': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => { setEditingGoal(null); setShowAddGoalModal(true) }}
        className="btn-secondary px-4 py-2 flex items-center gap-2"
      >
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
            <button onClick={loadData} className="btn-primary px-6 py-2">Retry</button>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  const { summary, budgetCategories, aiRecommendations } = planningData
  
  // Use goals from the state (which comes from planningData.financialGoals that includes Firebase goals)
  // If no goals at all, show empty state
  const displayGoals = goals

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
            { title: 'Monthly Income', value: financialSummary?.monthlyIncome || summary.monthlyIncome, icon: DollarSign, color: 'text-green-400' },
            { title: 'Monthly Expenses', value: financialSummary?.monthlyExpenses || summary.monthlyExpenses, icon: CreditCard, color: 'text-red-400' },
            { title: 'Monthly Savings', value: financialSummary?.monthlySavings || summary.monthlySavings, icon: PiggyBank, color: 'text-blue-400' },
            { title: 'Savings Rate', value: `${summary.savingsRate}%`, icon: TrendingUp, color: 'text-purple-400', isPercentage: true },
            { title: 'Active Goals', value: displayGoals.length, icon: Target, color: 'text-cyan-400', isCount: true },
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
                {item.isPercentage ? item.value : item.isCount ? item.value : formatCurrency(item.value as number)}
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
              {goals.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-400">
                  {goals.length} goal{goals.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <button 
              onClick={() => { setEditingGoal(null); setShowAddGoalModal(true) }}
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>

          {displayGoals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Goals Yet</h3>
              <p className="text-gray-500 mb-4">Create your first financial goal to start tracking your progress</p>
              <button
                onClick={() => { setEditingGoal(null); setShowAddGoalModal(true) }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayGoals.map((goal, index) => {
                const progress = goal.progress || (goal.target > 0 ? (goal.current / goal.target) * 100 : 0)
                return (
                  <motion.div
                    key={goal.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    onClick={() => goal.id && handleGoalClick(goal)}
                    className="p-4 bg-dark-800/50 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${goal.color}`}>
                        <span className="text-2xl">{goal.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white truncate pr-2">{goal.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status || 'on-track')}`}>
                              {(goal.status || 'on-track').replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-lg font-bold text-white">{formatCurrency(goal.current)}</span>
                          <span className="text-gray-400 text-sm">of {formatCurrency(goal.target)}</span>
                        </div>
                        <div className="h-2 bg-dark-900 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
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
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Budget & Goals Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-400" />
              Financial Overview & Budget Breakdown
            </h2>

            {/* Goals Financial Summary */}
            {displayGoals.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-xl border border-primary-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary-400" />
                    Goals Allocation Summary
                  </h3>
                  <span className="text-xs text-gray-400">
                    {displayGoals.length} active goal{displayGoals.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Goals Financial Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-dark-800/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Total Target</p>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(displayGoals.reduce((sum, g) => sum + (g.target || 0), 0))}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-dark-800/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Current Progress</p>
                    <p className="text-lg font-bold text-green-400">
                      {formatCurrency(displayGoals.reduce((sum, g) => sum + (g.current || 0), 0))}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-dark-800/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Monthly Commitment</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatCurrency(displayGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0))}
                    </p>
                  </div>
                </div>

                {/* Individual Goal Allocations */}
                <div className="space-y-3">
                  {displayGoals.slice(0, 4).map((goal, index) => {
                    const totalContributions = displayGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0)
                    const percentage = totalContributions > 0 ? ((goal.monthlyContribution || 0) / totalContributions * 100) : 0
                    
                    return (
                      <div key={goal.id || index} className="flex items-center gap-3">
                        <span className="text-lg">{goal.icon || '🎯'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white truncate max-w-[150px]">{goal.name}</span>
                            <span className="text-xs text-gray-400">
                              {formatCurrency(goal.monthlyContribution || 0)}/mo ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${goal.color || 'from-blue-500 to-purple-600'}`}
                              style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(goal.status || 'not-started')}`}>
                          {((goal.progress || 0)).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                  {displayGoals.length > 4 && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      +{displayGoals.length - 4} more goals
                    </p>
                  )}
                </div>

                {/* Financial Health Check */}
                {summary && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Available after goal contributions:</span>
                      <span className={`font-bold ${
                        (summary.monthlySavings - displayGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0)) >= 0
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(summary.monthlySavings - displayGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0))}
                      </span>
                    </div>
                    {(summary.monthlySavings - displayGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0)) < 0 && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Warning: Goal commitments exceed your monthly savings
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Spending Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center justify-between">
                <span>Spending by Category</span>
                {budgetCategories.length > 0 && (
                  <span className="text-xs">
                    {budgetCategories.filter(c => c.status === 'over_budget').length > 0 && (
                      <span className="text-red-400">
                        {budgetCategories.filter(c => c.status === 'over_budget').length} over budget
                      </span>
                    )}
                    {budgetCategories.filter(c => c.status === 'under_budget').length > 0 && (
                      <span className="text-green-400 ml-2">
                        {budgetCategories.filter(c => c.status === 'under_budget').length} under budget
                      </span>
                    )}
                  </span>
                )}
              </h3>

              {budgetCategories.length === 0 ? (
                <div className="text-center py-8 bg-dark-800/30 rounded-xl">
                  <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No spending data available</p>
                  <p className="text-gray-500 text-xs mt-1">Upload bank statements to see your spending breakdown</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budgetCategories.map((category, index) => (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                        category.status === 'over_budget' 
                          ? 'bg-red-500/5 border-red-500/20' 
                          : category.status === 'under_budget'
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-dark-800/30 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{category.category}</span>
                        {category.status === 'over_budget' ? (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Over
                          </span>
                        ) : category.status === 'under_budget' ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Good
                          </span>
                        ) : (
                          <span className="text-xs text-blue-400">On Track</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl font-bold text-white">{formatCurrency(category.spent)}</span>
                        <span className="text-gray-400 text-sm">/ {formatCurrency(category.budgeted)}</span>
                      </div>
                      <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((category.spent / category.budgeted) * 100, 100)}%` }}
                          transition={{ duration: 0.5, delay: 0.6 + index * 0.05 }}
                          className={`h-full rounded-full transition-all ${
                            category.status === 'over_budget' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            category.status === 'under_budget' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                            'bg-gradient-to-r from-blue-500 to-blue-400'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${
                          category.remaining < 0 ? 'text-red-400' :
                          category.remaining > 0 ? 'text-green-400' :
                          'text-gray-400'
                        }`}>
                          {category.remaining >= 0 
                            ? `${formatCurrency(category.remaining)} remaining`
                            : `${formatCurrency(Math.abs(category.remaining))} over budget`
                          }
                        </p>
                        <span className="text-xs text-gray-500">
                          {((category.spent / category.budgeted) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats Footer */}
            {budgetCategories.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Budgeted</p>
                  <p className="text-sm font-bold text-white">
                    {formatCurrency(budgetCategories.reduce((sum, c) => sum + c.budgeted, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                  <p className="text-sm font-bold text-white">
                    {formatCurrency(budgetCategories.reduce((sum, c) => sum + c.spent, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Net Remaining</p>
                  <p className={`text-sm font-bold ${
                    budgetCategories.reduce((sum, c) => sum + c.remaining, 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(budgetCategories.reduce((sum, c) => sum + c.remaining, 0))}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent-400" />
              AI Recommendations
            </h2>

            {aiRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No recommendations yet</p>
                <p className="text-gray-500 text-xs mt-1">Add goals and financial data for personalized tips</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiRecommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${
                      rec.type === 'savings' ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15' :
                      rec.type === 'spending' ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15' :
                      rec.type === 'goal' ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15' :
                      rec.type === 'setup' ? 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15' :
                      'bg-green-500/10 border-green-500/20 hover:bg-green-500/15'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        rec.type === 'savings' ? 'bg-blue-500/20' :
                        rec.type === 'spending' ? 'bg-yellow-500/20' :
                        rec.type === 'goal' ? 'bg-purple-500/20' :
                        rec.type === 'setup' ? 'bg-cyan-500/20' :
                        'bg-green-500/20'
                      }`}>
                        {rec.type === 'savings' ? <PiggyBank className="w-4 h-4 text-blue-400" /> :
                         rec.type === 'spending' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> :
                         rec.type === 'goal' ? <Target className="w-4 h-4 text-purple-400" /> :
                         rec.type === 'setup' ? <Zap className="w-4 h-4 text-cyan-400" /> :
                         <TrendingUp className="w-4 h-4 text-green-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm mb-1">{rec.title}</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">{rec.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            rec.type === 'savings' ? 'bg-blue-500/20 text-blue-400' :
                            rec.type === 'spending' ? 'bg-yellow-500/20 text-yellow-400' :
                            rec.type === 'goal' ? 'bg-purple-500/20 text-purple-400' :
                            rec.type === 'setup' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {rec.impact}
                          </span>
                          <button className="text-primary-400 hover:text-primary-300 text-xs flex items-center gap-1 group">
                            {rec.action} 
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-3">Quick Actions</p>
              <div className="space-y-2">
                <button 
                  onClick={() => { setEditingGoal(null); setShowAddGoalModal(true) }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-colors flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                >
                  <Plus className="w-4 h-4 text-primary-400" />
                  Add New Goal
                </button>
                <Link
                  to="/individual/upload-statements"
                  className="w-full text-left px-3 py-2 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-colors flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                >
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Upload Statements
                </Link>
                <Link
                  to="/individual/chat"
                  className="w-full text-left px-3 py-2 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-colors flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                >
                  <Sparkles className="w-4 h-4 text-accent-400" />
                  Ask AI Advisor
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AddGoalModal
        isOpen={showAddGoalModal}
        onClose={() => { setShowAddGoalModal(false); setEditingGoal(null) }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />
      
      <GoalDetailModal
        isOpen={showGoalDetailModal}
        onClose={() => { setShowGoalDetailModal(false); setSelectedGoal(null) }}
        goal={selectedGoal}
        onEdit={handleEditGoal}
        onDelete={handleDeleteGoal}
      />
    </IndividualLayout>
  )
}
