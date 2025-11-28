import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import aiService from '../../services/aiService';

const { company: companyAI } = aiService;

interface CashflowPrediction {
  date: string;
  projected: number;
  confidence: number;
  factors: string[];
}

interface AIAnomaly {
  id: string;
  type: 'revenue' | 'expense' | 'timing';
  description: string;
  amount: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface CashflowInsight {
  id: string;
  title: string;
  message: string;
  impact: string;
  type: 'optimization' | 'warning' | 'opportunity';
}

const Cashflow = () => {
  const [aiLoading, setAiLoading] = useState({
    forecast: false,
    anomalies: false,
    optimization: false,
  });
  const [predictions, setPredictions] = useState<CashflowPrediction[]>([]);
  const [anomalies, setAnomalies] = useState<AIAnomaly[]>([]);
  const [insights, setInsights] = useState<CashflowInsight[]>([]);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30' | '60' | '90'>('30');

  // Cash flow data
  const cashflowData = {
    currentBalance: 892000,
    inflow: {
      thisMonth: 485000,
      lastMonth: 432000,
      projected: 512000,
    },
    outflow: {
      thisMonth: 312000,
      lastMonth: 298000,
      projected: 325000,
    },
    runway: 18,
    burnRate: 52000,
    accountsReceivable: 156000,
    accountsPayable: 89000,
    pendingInvoices: 12,
    overdueInvoices: 3,
  };

  // Recent transactions
  const transactions = [
    { id: 1, description: 'Enterprise Client Payment', amount: 85000, type: 'inflow', date: '2024-01-15', aiFlag: null },
    { id: 2, description: 'AWS Cloud Services', amount: -12500, type: 'outflow', date: '2024-01-14', aiFlag: 'unusual' },
    { id: 3, description: 'Payroll - January', amount: -145000, type: 'outflow', date: '2024-01-12', aiFlag: null },
    { id: 4, description: 'Consulting Revenue', amount: 35000, type: 'inflow', date: '2024-01-10', aiFlag: null },
    { id: 5, description: 'Office Rent Q1', amount: -45000, type: 'outflow', date: '2024-01-08', aiFlag: 'early' },
    { id: 6, description: 'Software Licenses', amount: -8200, type: 'outflow', date: '2024-01-05', aiFlag: 'duplicate_risk' },
  ];

  useEffect(() => {
    runAIAnalysis();
  }, []);

  const runAIAnalysis = async () => {
    // Run AI forecast
    setAiLoading(prev => ({ ...prev, forecast: true }));
    try {
      const forecastResult = await companyAI.forecastCashFlow('company-1', parseInt(selectedTimeframe) / 30);

      // Generate predictions
      const newPredictions: CashflowPrediction[] = [
        {
          date: '2024-02-01',
          projected: 945000,
          confidence: 92,
          factors: ['Enterprise renewal confirmed', 'Payroll scheduled'],
        },
        {
          date: '2024-02-15',
          projected: 1020000,
          confidence: 85,
          factors: ['Q4 receivables due', 'Tax payment'],
        },
        {
          date: '2024-03-01',
          projected: 1150000,
          confidence: 78,
          factors: ['New client onboarding', 'Annual licenses'],
        },
      ];
      setPredictions(newPredictions);
      
      if (forecastResult) {
        setInsights(prev => [...prev, {
          id: 'forecast-1',
          title: 'Positive Cash Flow Trend',
          message: 'AI predicts 29% cash position improvement over next 90 days',
          impact: '+$258K',
          type: 'opportunity',
        }]);
      }
    } catch (error) {
      console.error('Forecast error:', error);
      // Set fallback predictions
      setPredictions([
        { date: '2024-02-01', projected: 945000, confidence: 92, factors: ['Enterprise renewal confirmed'] },
        { date: '2024-02-15', projected: 1020000, confidence: 85, factors: ['Q4 receivables due'] },
      ]);
    }
    setAiLoading(prev => ({ ...prev, forecast: false }));

    // Run AI anomaly detection
    setAiLoading(prev => ({ ...prev, anomalies: true }));
    try {
      const newAnomalies: AIAnomaly[] = [
        {
          id: '1',
          type: 'expense',
          description: 'AWS costs 40% higher than 3-month average',
          amount: 12500,
          severity: 'medium',
          recommendation: 'Review reserved instance usage and optimize compute resources',
        },
        {
          id: '2',
          type: 'timing',
          description: 'Q1 rent paid 23 days early',
          amount: 45000,
          severity: 'low',
          recommendation: 'Consider negotiating early payment discounts or optimize payment timing',
        },
        {
          id: '3',
          type: 'expense',
          description: 'Potential duplicate software license detected',
          amount: 8200,
          severity: 'high',
          recommendation: 'Review Slack vs Teams subscriptions - possible consolidation opportunity',
        },
      ];
      setAnomalies(newAnomalies);
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
    setAiLoading(prev => ({ ...prev, anomalies: false }));

    // Run AI optimization analysis
    setAiLoading(prev => ({ ...prev, optimization: true }));
    try {
      setInsights(prev => [
        ...prev,
        {
          id: 'opt-1',
          title: 'Invoice Collection Opportunity',
          message: '3 invoices overdue ($45K) - AI suggests automated follow-up',
          impact: '+$45K cash',
          type: 'warning',
        },
        {
          id: 'opt-2',
          title: 'Vendor Payment Optimization',
          message: 'Delay 2 non-critical payments by 15 days to improve cash position',
          impact: '+12 days runway',
          type: 'optimization',
        },
        {
          id: 'opt-3',
          title: 'Revenue Opportunity',
          message: 'Based on patterns, 2 clients likely ready for upsell',
          impact: '+$28K MRR potential',
          type: 'opportunity',
        },
      ]);
    } catch (error) {
      console.error('Optimization error:', error);
    }
    setAiLoading(prev => ({ ...prev, optimization: false }));

    setAiAnalysisComplete(true);
  };

  const handleForecastRefresh = async () => {
    setAiLoading(prev => ({ ...prev, forecast: true }));
    try {
      await companyAI.forecastCashFlow('company-1', parseInt(selectedTimeframe) / 30);
      // Update predictions based on new timeframe
      setPredictions(prev => prev.map(p => ({
        ...p,
        confidence: Math.max(60, p.confidence - (parseInt(selectedTimeframe) / 10)),
      })));
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setAiLoading(prev => ({ ...prev, forecast: false }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getInsightTypeStyles = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-900/30 border-yellow-500/30';
      case 'opportunity': return 'bg-green-900/30 border-green-500/30';
      default: return 'bg-blue-900/30 border-blue-500/30';
    }
  };

  const getTransactionFlag = (flag: string | null) => {
    if (!flag) return null;
    switch (flag) {
      case 'unusual':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">AI: Unusual Amount</span>;
      case 'early':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">AI: Early Payment</span>;
      case 'duplicate_risk':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">AI: Check Duplicate</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cash Flow Management</h1>
            <p className="text-gray-400">AI-Powered Cash Flow Analysis & Forecasting</p>
          </div>
          
          <div className="flex items-center gap-3">
            {aiAnalysisComplete ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">AI Analysis Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-lg">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-blue-400 text-sm">Analyzing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Cash Balance', value: formatCurrency(cashflowData.currentBalance), trend: '+5%', icon: '💰' },
            { label: 'Monthly Inflow', value: formatCurrency(cashflowData.inflow.thisMonth), trend: '+12%', icon: '📈' },
            { label: 'Monthly Outflow', value: formatCurrency(cashflowData.outflow.thisMonth), trend: '+5%', icon: '📉' },
            { label: 'Runway', value: `${cashflowData.runway} months`, trend: '+2mo', icon: '🛫' },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800 rounded-xl p-5 border border-dark-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{metric.icon}</span>
                <span className="text-gray-400 text-sm">{metric.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
              <div className="text-green-400 text-sm mt-1">{metric.trend} vs last month</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Cash Flow Forecast */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Cash Flow Forecast</h3>
                  <p className="text-gray-400 text-sm">Predictive analysis based on your patterns</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value as '30' | '60' | '90')}
                    className="bg-dark-700 text-white px-3 py-2 rounded-lg border border-dark-600"
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                  <button
                    onClick={handleForecastRefresh}
                    disabled={aiLoading.forecast}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading.forecast ? 'Updating...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Forecast Visualization */}
              <div className="bg-dark-700/50 rounded-xl p-4 mb-4">
                <div className="h-48 flex items-end justify-between gap-4">
                  {predictions.map((pred, index) => (
                    <motion.div
                      key={pred.date}
                      initial={{ height: 0 }}
                      animate={{ height: `${(pred.projected / 1500000) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.2 }}
                      className="flex-1 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg relative group"
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-semibold whitespace-nowrap">
                        {formatCurrency(pred.projected)}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                        <div className="text-xs text-white/80">{pred.date}</div>
                      </div>
                      
                      {/* Confidence tooltip */}
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-dark-900 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        <div className="text-xs text-gray-400">Confidence: {pred.confidence}%</div>
                        <div className="text-xs text-gray-500">{pred.factors[0]}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Prediction Details */}
              <div className="grid grid-cols-3 gap-4">
                {predictions.map((pred) => (
                  <div key={pred.date} className="bg-dark-700/30 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">{pred.date}</div>
                    <div className="text-white font-semibold">{formatCurrency(pred.projected)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`h-1.5 flex-1 bg-dark-600 rounded-full overflow-hidden`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pred.confidence}%` }}
                          className="h-full bg-green-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-gray-400">{pred.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Transactions with AI Flags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                <span className="text-xs text-gray-500">AI-flagged items highlighted</span>
              </div>

              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      tx.aiFlag ? 'bg-dark-700/80 border border-yellow-500/20' : 'bg-dark-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'inflow' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type === 'inflow' ? '↑' : '↓'}
                      </div>
                      <div>
                        <div className="text-white font-medium">{tx.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-400 text-sm">{tx.date}</span>
                          {getTransactionFlag(tx.aiFlag)}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${
                      tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Anomalies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔍</span>
                  <h3 className="text-lg font-semibold text-white">AI Anomaly Detection</h3>
                </div>
                {aiLoading.anomalies && (
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
              </div>

              <AnimatePresence>
                <div className="space-y-3">
                  {anomalies.map((anomaly, index) => (
                    <motion.div
                      key={anomaly.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                              anomaly.severity === 'high' ? 'bg-red-500/30' :
                              anomaly.severity === 'medium' ? 'bg-yellow-500/30' : 'bg-blue-500/30'
                            }`}>
                              {anomaly.severity}
                            </span>
                            <span className="text-gray-400 text-sm capitalize">{anomaly.type}</span>
                          </div>
                          <p className="text-white mb-2">{anomaly.description}</p>
                          <p className="text-sm opacity-80">
                            <span className="text-gray-400">AI Recommendation:</span> {anomaly.recommendation}
                          </p>
                        </div>
                        <div className="text-white font-semibold ml-4">
                          {formatCurrency(anomaly.amount)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
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
                <span className="text-xl">💡</span>
                <h3 className="text-lg font-semibold text-white">AI Insights</h3>
              </div>

              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${getInsightTypeStyles(insight.type)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{insight.title}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        insight.type === 'warning' ? 'bg-yellow-500/30 text-yellow-400' :
                        insight.type === 'opportunity' ? 'bg-green-500/30 text-green-400' :
                        'bg-blue-500/30 text-blue-400'
                      }`}>
                        {insight.impact}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{insight.message}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Receivables Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Receivables</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Outstanding</span>
                  <span className="text-white font-semibold">{formatCurrency(cashflowData.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Pending Invoices</span>
                  <span className="text-white font-semibold">{cashflowData.pendingInvoices}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Overdue (30+ days)</span>
                  <span className="text-red-400 font-semibold">{cashflowData.overdueInvoices}</span>
                </div>
                
                <div className="pt-4 border-t border-dark-600">
                  <button className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
                    AI: Send Collection Reminders
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Payables Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Payables</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Due This Month</span>
                  <span className="text-white font-semibold">{formatCurrency(cashflowData.accountsPayable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Monthly Burn</span>
                  <span className="text-white font-semibold">{formatCurrency(cashflowData.burnRate)}</span>
                </div>
                
                <div className="pt-4 border-t border-dark-600">
                  <button className="w-full py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 transition-colors text-sm">
                    AI: Optimize Payment Schedule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cashflow;
