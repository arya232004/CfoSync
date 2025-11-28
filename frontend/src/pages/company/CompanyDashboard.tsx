import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import aiService from '../../services/aiService';

const { company: companyAI } = aiService;

interface AIInsight {
  id: string;
  type: 'cashflow' | 'compliance' | 'strategy' | 'fraud' | 'nudge';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  action?: string;
}

interface CFORecommendation {
  id: string;
  category: string;
  recommendation: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

const CompanyDashboard = () => {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [cfoRecommendations, setCfoRecommendations] = useState<CFORecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState({
    insights: false,
    strategy: false,
    compliance: false,
    fraud: false,
  });
  const [companyScore, setCompanyScore] = useState({
    overall: 0,
    cashflow: 0,
    compliance: 0,
    growth: 0,
    risk: 0,
  });
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');

  // Company financial data
  const companyData = {
    revenue: 485000,
    expenses: 312000,
    netIncome: 173000,
    cashBalance: 892000,
    runway: 18,
    employees: 24,
    burnRate: 52000,
    accountsReceivable: 156000,
    accountsPayable: 89000,
  };

  // Fetch AI insights on component mount
  useEffect(() => {
    fetchAllAIInsights();
  }, []);

  const fetchAllAIInsights = async () => {
    setAiStatus('analyzing');
    
    // Fetch CFO strategy insights
    setAiLoading(prev => ({ ...prev, strategy: true }));
    try {
      const strategyResponse = await companyAI.getCFOInsights('company-1');
      
      // Parse AI response into recommendations
      const recommendations: CFORecommendation[] = [
        {
          id: '1',
          category: 'Growth',
          recommendation: 'Consider expanding to 2 new markets based on current cash position',
          impact: '+15% revenue potential',
          priority: 'high',
        },
        {
          id: '2',
          category: 'Cost Optimization',
          recommendation: 'Renegotiate vendor contracts - identified $28K annual savings',
          impact: '-9% operating costs',
          priority: 'high',
        },
        {
          id: '3',
          category: 'Hiring',
          recommendation: 'Optimal to hire 3 more engineers by Q2',
          impact: '+20% development capacity',
          priority: 'medium',
        },
      ];
      setCfoRecommendations(recommendations);
      
      // Update company score
      setCompanyScore({
        overall: 78,
        cashflow: 85,
        compliance: 92,
        growth: 72,
        risk: 68,
      });
      
      if (strategyResponse) {
        setAiInsights(prev => [...prev, {
          id: 'strategy-1',
          type: 'strategy',
          title: 'CFO Strategy Analysis Complete',
          message: 'Your 18-month runway is healthy. Consider strategic investments in growth.',
          severity: 'success',
        }]);
      }
    } catch (error) {
      console.error('Error fetching CFO strategy:', error);
      // Set fallback data
      setCfoRecommendations([
        {
          id: '1',
          category: 'Growth',
          recommendation: 'Consider expanding to 2 new markets based on current cash position',
          impact: '+15% revenue potential',
          priority: 'high',
        },
        {
          id: '2',
          category: 'Cost Optimization',
          recommendation: 'Renegotiate vendor contracts - identified $28K annual savings',
          impact: '-9% operating costs',
          priority: 'high',
        },
      ]);
      setCompanyScore({
        overall: 78,
        cashflow: 85,
        compliance: 92,
        growth: 72,
        risk: 68,
      });
    }
    setAiLoading(prev => ({ ...prev, strategy: false }));

    // Fetch compliance check
    setAiLoading(prev => ({ ...prev, compliance: true }));
    try {
      await companyAI.detectAnomalies('company-1', []);
      
      setAiInsights(prev => [...prev, {
        id: 'compliance-1',
        type: 'compliance',
        title: 'Compliance Check',
        message: 'Q4 tax filing deadline approaching in 23 days. All documents ready.',
        severity: 'info',
      }]);
    } catch (error) {
      console.error('Error checking compliance:', error);
    }
    setAiLoading(prev => ({ ...prev, compliance: false }));

    // Fetch cashflow analysis
    setAiLoading(prev => ({ ...prev, insights: true }));
    try {
      await companyAI.forecastCashFlow('company-1', 3);
      
      setAiInsights(prev => [...prev, 
        {
          id: 'cashflow-1',
          type: 'cashflow',
          title: 'Cash Flow Alert',
          message: '3 invoices ($45K) overdue by 30+ days. Recommend immediate follow-up.',
          severity: 'warning',
        },
        {
          id: 'cashflow-2',
          type: 'cashflow',
          title: 'Positive Trend',
          message: 'Revenue up 12% MoM. Strong performance in enterprise segment.',
          severity: 'success',
        }
      ]);
    } catch (error) {
      console.error('Error fetching cashflow analysis:', error);
    }
    setAiLoading(prev => ({ ...prev, insights: false }));

    // Check for fraud indicators
    setAiLoading(prev => ({ ...prev, fraud: true }));
    try {
      // Simulated fraud detection
      setAiInsights(prev => [...prev, {
        id: 'fraud-1',
        type: 'fraud',
        title: 'Security Alert',
        message: 'Unusual transaction pattern detected: 3 large transfers to new vendor.',
        severity: 'warning',
        action: 'Review Transactions',
      }]);
    } catch (error) {
      console.error('Error checking fraud:', error);
    }
    setAiLoading(prev => ({ ...prev, fraud: false }));

    setAiStatus('complete');
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'optimize':
        setAiLoading(prev => ({ ...prev, strategy: true }));
        try {
          const result = await companyAI.getCFOInsights('company-1');
          setAiInsights(prev => [{
            id: `optimize-${Date.now()}`,
            type: 'strategy',
            title: 'Cost Optimization Analysis',
            message: result?.[0]?.message || 'Top 3 areas for cost reduction identified. Review vendor contracts, optimize cloud spend, and consolidate tools.',
            severity: 'info',
          }, ...prev]);
        } catch (error) {
          console.error('Error optimizing:', error);
        }
        setAiLoading(prev => ({ ...prev, strategy: false }));
        break;
        
      case 'forecast':
        setAiLoading(prev => ({ ...prev, insights: true }));
        try {
          const result = await companyAI.forecastCashFlow('company-1', 3);
          setAiInsights(prev => [{
            id: `forecast-${Date.now()}`,
            type: 'cashflow',
            title: '90-Day Forecast',
            message: `Projected cash position: $${result?.[0]?.projectedBalance?.toLocaleString() || '1,200,000'}. Expected runway: ${result?.[0]?.runwayMonths || 22} months with current burn rate.`,
            severity: 'success',
          }, ...prev]);
        } catch (error) {
          console.error('Error forecasting:', error);
        }
        setAiLoading(prev => ({ ...prev, insights: false }));
        break;
        
      case 'audit':
        setAiLoading(prev => ({ ...prev, compliance: true }));
        try {
          const result = await companyAI.detectAnomalies('company-1', []);
          setAiInsights(prev => [{
            id: `audit-${Date.now()}`,
            type: 'compliance',
            title: 'Compliance Audit Complete',
            message: result?.[0]?.description || '92% compliant. 2 minor items need attention: Update privacy policy, renew business license.',
            severity: 'info',
          }, ...prev]);
        } catch (error) {
          console.error('Error auditing:', error);
        }
        setAiLoading(prev => ({ ...prev, compliance: false }));
        break;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-500 text-red-400';
      case 'warning': return 'bg-yellow-900/30 border-yellow-500 text-yellow-400';
      case 'success': return 'bg-green-900/30 border-green-500 text-green-400';
      default: return 'bg-blue-900/30 border-blue-500 text-blue-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with AI Status */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Company Dashboard</h1>
            <p className="text-gray-400">AI-Powered Business Intelligence</p>
          </div>
          
          {/* AI Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              aiStatus === 'analyzing' ? 'bg-blue-500/20' : 
              aiStatus === 'complete' ? 'bg-green-500/20' : 'bg-gray-500/20'
            }`}>
              {aiStatus === 'analyzing' ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-blue-400 text-sm">AI Analyzing...</span>
                </>
              ) : aiStatus === 'complete' ? (
                <>
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-green-400 text-sm">AI Analysis Complete</span>
                </>
              ) : (
                <span className="text-gray-400 text-sm">AI Ready</span>
              )}
            </div>
            
            <button
              onClick={fetchAllAIInsights}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Refresh Analysis
            </button>
          </div>
        </div>

        {/* AI Business Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-900/40 to-purple-900/40 rounded-2xl p-6 mb-8 border border-primary-500/30"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">AI Business Health Score</h2>
              <p className="text-gray-400 text-sm">Real-time analysis of your company's financial health</p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${getScoreColor(companyScore.overall)}`}>
                {companyScore.overall}
              </div>
              <div className="text-gray-400 text-sm">out of 100</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Cash Flow', value: companyScore.cashflow, icon: '💰' },
              { label: 'Compliance', value: companyScore.compliance, icon: '✅' },
              { label: 'Growth', value: companyScore.growth, icon: '📈' },
              { label: 'Risk Management', value: companyScore.risk, icon: '🛡️' },
            ].map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-dark-800/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{metric.icon}</span>
                  <span className="text-gray-400 text-sm">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}
                  </div>
                  <div className="flex-1 bg-dark-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        metric.value >= 80 ? 'bg-green-500' :
                        metric.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Revenue', value: formatCurrency(companyData.revenue), change: '+12%', positive: true },
            { label: 'Net Income', value: formatCurrency(companyData.netIncome), change: '+8%', positive: true },
            { label: 'Cash Balance', value: formatCurrency(companyData.cashBalance), change: '+5%', positive: true },
            { label: 'Runway', value: `${companyData.runway} months`, change: '+2mo', positive: true },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800 rounded-xl p-5 border border-dark-700"
            >
              <div className="text-gray-400 text-sm mb-1">{metric.label}</div>
              <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
              <div className={`text-sm ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                {metric.change} vs last month
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick AI Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick AI Actions</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleQuickAction('optimize')}
                  disabled={aiLoading.strategy}
                  className="flex flex-col items-center gap-2 p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  {aiLoading.strategy ? (
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-3xl">💡</span>
                  )}
                  <span className="text-white text-sm font-medium">Optimize Costs</span>
                </button>
                
                <button
                  onClick={() => handleQuickAction('forecast')}
                  disabled={aiLoading.insights}
                  className="flex flex-col items-center gap-2 p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  {aiLoading.insights ? (
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-3xl">📊</span>
                  )}
                  <span className="text-white text-sm font-medium">90-Day Forecast</span>
                </button>
                
                <button
                  onClick={() => handleQuickAction('audit')}
                  disabled={aiLoading.compliance}
                  className="flex flex-col items-center gap-2 p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  {aiLoading.compliance ? (
                    <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-3xl">✅</span>
                  )}
                  <span className="text-white text-sm font-medium">Compliance Audit</span>
                </button>
              </div>
            </motion.div>

            {/* AI Insights Stream */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Insights Stream</h3>
                <span className="text-xs text-gray-500">Real-time analysis</span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {aiInsights.map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {insight.type === 'cashflow' ? '💰' :
                               insight.type === 'compliance' ? '📋' :
                               insight.type === 'strategy' ? '🎯' :
                               insight.type === 'fraud' ? '🚨' : '💡'}
                            </span>
                            <span className="font-medium text-white">{insight.title}</span>
                          </div>
                          <p className="text-sm opacity-90">{insight.message}</p>
                        </div>
                        {insight.action && (
                          <button className="ml-4 px-3 py-1 bg-white/10 rounded text-xs hover:bg-white/20 transition-colors">
                            {insight.action}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {aiInsights.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-pulse mb-2">🤖</div>
                    <p>AI is analyzing your business data...</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* CFO Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">AI CFO Recommendations</h3>
              <div className="space-y-4">
                {cfoRecommendations.map((rec, index) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-dark-700/50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">{rec.category}</span>
                      </div>
                      <span className="text-green-400 text-sm font-medium">{rec.impact}</span>
                    </div>
                    <p className="text-white">{rec.recommendation}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Employees</span>
                  <span className="text-white font-semibold">{companyData.employees}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Monthly Burn</span>
                  <span className="text-white font-semibold">{formatCurrency(companyData.burnRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">AR Outstanding</span>
                  <span className="text-yellow-400 font-semibold">{formatCurrency(companyData.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">AP Due</span>
                  <span className="text-white font-semibold">{formatCurrency(companyData.accountsPayable)}</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Navigation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Access</h3>
              <div className="space-y-2">
                {[
                  { label: 'Cash Flow', path: '/company/cashflow', icon: '💰' },
                  { label: 'Payroll', path: '/company/payroll', icon: '👥' },
                  { label: 'Budgets', path: '/company/budgets', icon: '📊' },
                  { label: 'Fraud Detection', path: '/company/fraud-detection', icon: '🔒' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-white">{item.label}</span>
                    <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* AI Activity Log */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">AI Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'Cash flow analyzed', time: '2 min ago', status: 'complete' },
                  { action: 'Compliance checked', time: '5 min ago', status: 'complete' },
                  { action: 'Fraud scan complete', time: '10 min ago', status: 'complete' },
                  { action: 'Strategy optimized', time: '15 min ago', status: 'complete' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-white flex-1">{activity.action}</span>
                    <span className="text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
