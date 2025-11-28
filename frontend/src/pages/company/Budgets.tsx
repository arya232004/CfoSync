import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import aiService from '../../services/aiService';

const { company: companyAI } = aiService;

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
  const [aiLoading, setAiLoading] = useState({
    analysis: false,
    optimization: false,
    forecast: false,
  });
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [aiOptimizing, setAiOptimizing] = useState(false);

  const totalBudget = 2450000;
  const totalSpent = 1890000;
  const totalForecast = 2380000;

  const budgets: Budget[] = [
    { 
      id: '1', 
      department: 'Engineering', 
      allocated: 1200000, 
      spent: 920000, 
      forecast: 1180000,
      status: 'on_track',
      aiSuggestion: 'Consider reallocating $40K from tools to cloud infrastructure'
    },
    { 
      id: '2', 
      department: 'Sales & Marketing', 
      allocated: 650000, 
      spent: 545000, 
      forecast: 680000,
      status: 'at_risk',
      aiSuggestion: 'Q4 campaign overspend projected - reduce digital ad spend by 15%'
    },
    { 
      id: '3', 
      department: 'Operations', 
      allocated: 350000, 
      spent: 275000, 
      forecast: 340000,
      status: 'on_track'
    },
    { 
      id: '4', 
      department: 'Product', 
      allocated: 150000, 
      spent: 95000, 
      forecast: 120000,
      status: 'on_track',
      aiSuggestion: 'Underutilized budget - consider adding UX research tools'
    },
    { 
      id: '5', 
      department: 'HR & Admin', 
      allocated: 100000, 
      spent: 55000, 
      forecast: 60000,
      status: 'on_track'
    },
  ];

  useEffect(() => {
    runBudgetAnalysis();
  }, []);

  const runBudgetAnalysis = async () => {
    setAiLoading(prev => ({ ...prev, analysis: true }));
    try {
      await companyAI.analyzeBudgets('company-1');

      setInsights([
        {
          id: '1',
          type: 'warning',
          title: 'Sales & Marketing Overspend Risk',
          message: 'Current trajectory shows 4.6% budget overrun by EOQ. Digital advertising costs 23% above plan.',
          impact: '-$30K',
          action: 'Review Ad Spend',
        },
        {
          id: '2',
          type: 'reallocation',
          title: 'Budget Reallocation Opportunity',
          message: 'Product department $30K under-utilized. Consider transferring to Engineering cloud costs.',
          impact: 'Optimize $30K',
          action: 'Transfer Funds',
        },
        {
          id: '3',
          type: 'optimization',
          title: 'Vendor Consolidation Savings',
          message: 'Consolidating 3 overlapping SaaS tools could save $18K annually across departments.',
          impact: 'Save $18K/yr',
          action: 'View Analysis',
        },
        {
          id: '4',
          type: 'forecast',
          title: 'Next Quarter Projection',
          message: 'AI predicts 8% increase needed in Engineering budget for planned hiring.',
          impact: '+$96K Q2',
        },
      ]);
    } catch (error) {
      console.error('Budget analysis error:', error);
    }
    setAiLoading(prev => ({ ...prev, analysis: false }));
  };

  const handleOptimizeBudgets = async () => {
    setAiOptimizing(true);
    try {
      await companyAI.analyzeBudgets('company-1');
      
      setInsights(prev => [{
        id: `opt-${Date.now()}`,
        type: 'optimization',
        title: 'AI Budget Optimization Complete',
        message: 'Recommended $48K in reallocations across 4 departments to maximize ROI. Engineering +$20K for cloud, Sales -$30K from events, Product +$10K for tooling.',
        impact: '+12% efficiency',
        action: 'Apply Changes',
      }, ...prev]);
    } catch (error) {
      console.error('Optimization error:', error);
    }
    setAiOptimizing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'over_budget': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUtilization = (spent: number, allocated: number) => {
    return Math.round((spent / allocated) * 100);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Budget Management</h1>
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
              disabled={aiOptimizing}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {aiOptimizing ? 'Optimizing...' : '🤖 AI Optimize'}
            </button>
          </div>
        </div>

        {/* Overall Budget Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-900/40 to-blue-900/40 rounded-2xl p-6 mb-8 border border-primary-500/30"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-1">Total Budget</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(totalBudget)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Spent YTD</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(totalSpent)}</div>
              <div className="text-sm text-blue-400">{Math.round((totalSpent / totalBudget) * 100)}% utilized</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">AI Forecast</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(totalForecast)}</div>
              <div className={`text-sm ${totalForecast <= totalBudget ? 'text-green-400' : 'text-yellow-400'}`}>
                {totalForecast <= totalBudget ? 'On track' : `${formatCurrency(totalForecast - totalBudget)} over`}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Remaining</div>
              <div className="text-3xl font-bold text-green-400">{formatCurrency(totalBudget - totalSpent)}</div>
              <div className="text-sm text-gray-400">Available to allocate</div>
            </div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="mt-6">
            <div className="h-4 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(totalSpent / totalBudget) * 100}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full relative"
              >
                <div 
                  className="absolute right-0 top-0 h-full w-1 bg-yellow-500"
                  style={{ 
                    left: `${((totalForecast - totalSpent) / totalBudget) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                  title="Forecasted spend"
                />
              </motion.div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>$0</span>
              <span>Spent: {Math.round((totalSpent / totalBudget) * 100)}%</span>
              <span>{formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Budgets */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Department Budgets</h3>
              
              <div className="space-y-4">
                {budgets.map((budget, index) => {
                  const utilization = getUtilization(budget.spent, budget.allocated);
                  const forecastUtilization = Math.round((budget.forecast / budget.allocated) * 100);
                  
                  return (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg ${
                        budget.aiSuggestion ? 'bg-dark-700/80 border border-yellow-500/20' : 'bg-dark-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(budget.status)}`} />
                          <span className="text-white font-medium">{budget.department}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            budget.status === 'on_track' ? 'bg-green-500/20 text-green-400' :
                            budget.status === 'at_risk' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {utilization}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress bar with forecast marker */}
                      <div className="relative h-3 bg-dark-600 rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(utilization, 100)}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className={`h-full rounded-full ${
                            budget.status === 'on_track' ? 'bg-green-500' :
                            budget.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        />
                        {/* Forecast marker */}
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-white/50"
                          style={{ left: `${Math.min(forecastUtilization, 100)}%` }}
                          title={`Forecast: ${forecastUtilization}%`}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>AI Forecast: {formatCurrency(budget.forecast)} ({forecastUtilization}%)</span>
                        <span>Remaining: {formatCurrency(budget.allocated - budget.spent)}</span>
                      </div>
                      
                      {budget.aiSuggestion && (
                        <div className="mt-3 pt-3 border-t border-dark-600">
                          <div className="flex items-start gap-2 text-yellow-400 text-sm">
                            <span>🤖</span>
                            <span>{budget.aiSuggestion}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Budget Trends Chart Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Spending Trend</h3>
              <div className="h-48 flex items-end justify-between gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
                  const heights = [65, 72, 58, 80, 75, 68];
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heights[index]}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg"
                      />
                      <span className="text-gray-400 text-xs">{month}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🤖</span>
                <h3 className="text-lg font-semibold text-white">AI Budget Insights</h3>
              </div>

              {aiLoading.analysis ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <AnimatePresence>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                          insight.type === 'optimization' ? 'bg-green-900/20 border-green-500/30' :
                          insight.type === 'reallocation' ? 'bg-blue-900/20 border-blue-500/30' :
                          'bg-purple-900/20 border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            insight.type === 'warning' ? 'bg-yellow-500/30 text-yellow-400' :
                            insight.type === 'optimization' ? 'bg-green-500/30 text-green-400' :
                            insight.type === 'reallocation' ? 'bg-blue-500/30 text-blue-400' :
                            'bg-purple-500/30 text-purple-400'
                          }`}>
                            {insight.impact}
                          </span>
                        </div>
                        <div className="text-white font-medium text-sm mb-1">{insight.title}</div>
                        <div className="text-gray-400 text-sm">{insight.message}</div>
                        {insight.action && (
                          <button className="mt-2 text-xs text-primary-400 hover:text-primary-300">
                            {insight.action} →
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>📊</span> Generate Budget Report
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>🔄</span> Reallocate Funds
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>📈</span> Compare to Prior Year
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>🎯</span> Set Department Goals
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budgets;
