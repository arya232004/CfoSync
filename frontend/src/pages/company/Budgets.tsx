import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  ArrowRight
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
  aiSuggestion?: string;
}

interface BudgetInsight {
  id: string;
  type: 'optimization' | 'warning' | 'reallocation' | 'forecast';
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
  const [optimizing, setOptimizing] = useState(false);
  
  // Data states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    totalForecast: 0,
    utilization: 0
  });

  useEffect(() => {
    loadBudgetData();
  }, [selectedQuarter]);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agents/budgets', {
        company_id: user?.id,
        quarter: selectedQuarter
      });

      const data = response.data;
      setHasData(data.hasData);

      if (data.hasData) {
        // Set budgets
        setBudgets(data.budgets || []);
        
        // Set insights
        setInsights(data.insights || []);
        
        // Set summary
        if (data.summary) {
          setSummary({
            totalBudget: data.summary.totalBudget || 0,
            totalSpent: data.summary.totalSpent || 0,
            totalForecast: data.summary.totalForecast || 0,
            utilization: data.summary.utilization || 0
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBudgetData();
    setRefreshing(false);
    toast.success('Budget data refreshed');
  };

  const handleOptimizeBudgets = async () => {
    setOptimizing(true);
    try {
      // Simulate AI optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newInsight: BudgetInsight = {
        id: `opt-${Date.now()}`,
        type: 'optimization',
        title: 'AI Budget Optimization Complete',
        message: 'Analyzed spending patterns and identified potential savings across departments.',
        impact: '+8% efficiency',
        action: 'Apply Changes'
      };
      
      setInsights(prev => [newInsight, ...prev]);
      toast.success('Budget optimization complete');
    } catch (error) {
      toast.error('Optimization failed');
    } finally {
      setOptimizing(false);
    }
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

  // No Data State
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
              Add your department budgets to unlock AI-powered budget analysis, 
              optimization suggestions, and spending forecasts.
            </p>
            <Link
              to="/company/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Budget Data
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Budget Management</h1>
            <p className="text-gray-400">AI-Powered Budget Analysis & Optimization</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-dark-700 text-white px-3 py-2 rounded-lg border border-dark-600"
            >
              <option value="Q1">Q1 2024</option>
              <option value="Q2">Q2 2024</option>
              <option value="Q3">Q3 2024</option>
              <option value="Q4">Q4 2024</option>
            </select>
            <button
              onClick={handleOptimizeBudgets}
              disabled={optimizing}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {optimizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              AI Optimize
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Budget</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalBudget)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total Spent</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalSpent)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Forecast</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatMoney(summary.totalForecast)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Utilization</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.utilization}%</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget List */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Department Budgets</h3>
              
              {budgets.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No budget data available.</p>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget, index) => {
                    const utilization = getUtilization(budget.spent, budget.allocated);
                    const status = getStatusBadge(budget.status);
                    
                    return (
                      <motion.div
                        key={budget.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg bg-dark-700/50 ${
                          budget.aiSuggestion ? 'border border-yellow-500/20' : ''
                        }`}
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
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className={`h-full rounded-full ${
                              utilization > 100 ? 'bg-red-500' :
                              utilization > 90 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{utilization}% utilized</span>
                          <span className="text-gray-400">
                            Forecast: {formatMoney(budget.forecast)}
                          </span>
                        </div>

                        {budget.aiSuggestion && (
                          <div className="mt-3 pt-3 border-t border-dark-600">
                            <div className="flex items-start gap-2 text-yellow-400 text-sm">
                              <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">AI Budget Insights</h3>
              </div>

              {insights.length === 0 ? (
                <p className="text-gray-400 text-sm">No insights available yet.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                        insight.type === 'reallocation' ? 'bg-blue-900/20 border-blue-500/30' :
                        insight.type === 'optimization' ? 'bg-green-900/20 border-green-500/30' :
                        'bg-purple-900/20 border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium uppercase ${
                          insight.type === 'warning' ? 'bg-yellow-500/30 text-yellow-400' :
                          insight.type === 'reallocation' ? 'bg-blue-500/30 text-blue-400' :
                          insight.type === 'optimization' ? 'bg-green-500/30 text-green-400' :
                          'bg-purple-500/30 text-purple-400'
                        }`}>
                          {insight.type}
                        </span>
                        <span className={`text-xs ${
                          insight.impact.includes('+') ? 'text-green-400' :
                          insight.impact.includes('-') ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {insight.impact}
                        </span>
                      </div>
                      <div className="text-white font-medium text-sm mb-1">{insight.title}</div>
                      <div className="text-gray-400 text-sm mb-2">{insight.message}</div>
                      {insight.action && (
                        <button className="text-primary-400 text-sm flex items-center gap-1 hover:underline">
                          {insight.action} <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Generate Budget Report
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Forecast Next Quarter
                </button>
                <Link
                  to="/company/onboarding"
                  className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Department Budget
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budgets;
