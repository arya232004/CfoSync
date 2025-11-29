import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  TrendingUp,
  RefreshCw,
  Loader2,
  Plus,
  Brain,
  Target,
  DollarSign,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Budget {
  id: string;
  department: string;
  allocated: number;
  spent: number;
  forecast: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
  utilization?: number;
  aiSuggestion?: string;
}

interface BudgetInsight {
  id: string;
  type: 'optimization' | 'warning' | 'reallocation' | 'forecast' | 'success';
  title: string;
  message: string;
  impact: string;
  action?: string;
}

const Budgets = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [settingBudget, setSettingBudget] = useState(false);
  const [showSetBudgetModal, setShowSetBudgetModal] = useState(false);
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    totalForecast: 0,
    utilization: 0
  });
  
  // Budget setting form
  const [monthlyBudget, setMonthlyBudget] = useState('');

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agents/budgets', {
        company_id: user?.id
      });

      const data = response.data;
      setHasData(data.hasData);

      if (data.hasData) {
        setBudgets(data.budgets || data.departments || []);
        setInsights(data.recommendations || data.insights || []);
        
        if (data.summary) {
          setSummary({
            totalBudget: data.summary.totalBudget || 0,
            totalSpent: data.summary.totalSpent || 0,
            totalForecast: data.summary.totalForecast || 0,
            utilization: data.summary.utilization || data.summary.overallUtilization || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async () => {
    const budgetValue = parseFloat(monthlyBudget.replace(/[^0-9.]/g, ''));
    if (!budgetValue || budgetValue <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    
    setSettingBudget(true);
    try {
      const response = await api.post('/api/agents/budgets/set', {
        company_id: user?.id,
        monthly_budget: budgetValue
      });
      
      if (response.data.success) {
        setBudgets(response.data.budgets || []);
        setInsights(response.data.recommendations || []);
        setSummary({
          totalBudget: response.data.monthly_budget,
          totalSpent: response.data.summary?.historical_avg_spend || 0,
          totalForecast: response.data.summary?.historical_avg_spend * 1.1 || 0,
          utilization: response.data.summary?.payroll_percentage || 0
        });
        setHasData(true);
        setShowSetBudgetModal(false);
        toast.success('Budget plan generated successfully!');
      }
    } catch (error: any) {
      console.error('Set budget error:', error);
      toast.error(error.response?.data?.detail || 'Failed to set budget');
    } finally {
      setSettingBudget(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBudgetData();
    setRefreshing(false);
    toast.success('Budget data refreshed');
  };

  const formatMoney = (amount: number) => formatCurrency(amount, currency);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'over_budget': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track': return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'On Track' };
      case 'at_risk': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'At Risk' };
      case 'over_budget': return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Over Budget' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Unknown' };
    }
  };

  const getUtilization = (spent: number, allocated: number) => {
    return allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Analyzing budget data...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <PieChart className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Budget Management</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Set your monthly budget and let AI generate an optimized allocation plan 
              based on your company data and industry best practices.
            </p>
            
            <div className="max-w-md mx-auto mb-8">
              <label className="block text-gray-300 text-sm font-medium mb-2 text-left">
                Monthly Budget
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="100,000"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-dark-700 border border-dark-600 text-white text-xl focus:border-primary-500 focus:outline-none"
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 text-left">
                Enter your total monthly budget. AI will allocate across departments.
              </p>
            </div>
            
            <button
              onClick={handleSetBudget}
              disabled={settingBudget || !monthlyBudget}
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {settingBudget ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Brain className="w-5 h-5" />
              )}
              {settingBudget ? 'Generating Plan...' : 'Generate AI Budget Plan'}
            </button>
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-left">
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <Target className="w-6 h-6 text-blue-400 mb-2" />
                <p className="text-white font-medium text-sm">Smart Allocation</p>
                <p className="text-gray-400 text-xs">AI distributes budget based on priorities</p>
              </div>
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
                <p className="text-white font-medium text-sm">Spending Insights</p>
                <p className="text-gray-400 text-xs">Track utilization in real-time</p>
              </div>
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <Brain className="w-6 h-6 text-purple-400 mb-2" />
                <p className="text-white font-medium text-sm">Optimization</p>
                <p className="text-gray-400 text-xs">Get AI recommendations</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Budget Management</h1>
            <p className="text-gray-400">AI-Powered Budget Analysis & Optimization</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSetBudgetModal(true)}
              className="px-4 py-2 glass-card text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Update Budget
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 glass-card hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Budget</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalBudget)}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total Spent</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalSpent)}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Forecast</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalForecast)}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Utilization</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.utilization}%</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Department Budgets</h3>
              
              {budgets.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No budget data available.</p>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget, index) => {
                    const utilization = budget.utilization || getUtilization(budget.spent, budget.allocated);
                    const status = getStatusBadge(budget.status);
                    
                    return (
                      <motion.div
                        key={budget.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-lg bg-dark-700/50 ${budget.aiSuggestion ? 'border border-yellow-500/20' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(budget.status)}`} />
                            <span className="text-white font-medium">{budget.department}</span>
                            <span className={`px-2 py-1 rounded text-xs ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 text-sm">
                              {formatMoney(budget.spent)} / {formatMoney(budget.allocated)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="h-2 bg-dark-600 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(utilization, 100)}%` }}
                            transition={{ duration: 0.8, delay: index * 0.05 }}
                            className={`h-full rounded-full ${
                              utilization > 100 ? 'bg-red-500' :
                              utilization > 90 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{utilization}% utilized</span>
                          <span className="text-gray-400">
                            Remaining: {formatMoney(Math.max(0, budget.allocated - budget.spent))}
                          </span>
                        </div>
                        
                        {budget.aiSuggestion && (
                          <div className="mt-3 pt-3 border-t border-dark-600">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <Brain className="w-4 h-4" />
                              <span>{budget.aiSuggestion}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
              </div>

              {insights.length === 0 ? (
                <p className="text-gray-400 text-sm">No recommendations available.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <motion.div
                      key={insight.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                        insight.type === 'success' ? 'bg-green-900/20 border-green-500/30' :
                        insight.type === 'reallocation' ? 'bg-blue-900/20 border-blue-500/30' :
                        'bg-purple-900/20 border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {insight.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                        ) : insight.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                        ) : (
                          <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{insight.title}</div>
                          <div className="text-gray-400 text-sm mt-1">{insight.message}</div>
                          {insight.impact && (
                            <div className="text-xs text-gray-500 mt-2">Impact: {insight.impact}</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Budget Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">On Track</span>
                  <span className="text-green-400">{budgets.filter(b => b.status === 'on_track').length} departments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">At Risk</span>
                  <span className="text-yellow-400">{budgets.filter(b => b.status === 'at_risk').length} departments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Over Budget</span>
                  <span className="text-red-400">{budgets.filter(b => b.status === 'over_budget').length} departments</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Set Budget Modal */}
      <AnimatePresence>
        {showSetBudgetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSetBudgetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Update Monthly Budget</h2>
                <button onClick={() => setShowSetBudgetModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Monthly Budget Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="100,000"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  AI will regenerate department allocations based on this budget.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSetBudgetModal(false)}
                  className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetBudget}
                  disabled={settingBudget || !monthlyBudget}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {settingBudget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {settingBudget ? 'Generating...' : 'Generate Plan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Budgets;
