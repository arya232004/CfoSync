import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Calendar,
  BarChart3,
  Brain,
  Plus,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CashflowPrediction {
  date: string;
  projected: number;
  confidence: number;
  factors: string[];
}

interface CashflowAnomaly {
  id: string;
  type: string;
  description: string;
  amount: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  date?: string;
}

interface CashflowInsight {
  id: string;
  title: string;
  message: string;
  impact: string;
  type: 'optimization' | 'warning' | 'opportunity';
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'inflow' | 'outflow';
  aiFlag?: string;
}

const Cashflow = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  
  // Data states
  const [predictions, setPredictions] = useState<CashflowPrediction[]>([]);
  const [anomalies, setAnomalies] = useState<CashflowAnomaly[]>([]);
  const [insights, setInsights] = useState<CashflowInsight[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashflowData, setCashflowData] = useState({
    currentBalance: 0,
    inflow: 0,
    outflow: 0,
    runway: 0,
    burnRate: 0,
    pendingInvoices: 0,
    overdueAmount: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30' | '60' | '90'>('30');

  useEffect(() => {
    loadCashflowData();
  }, [selectedTimeframe]);

  const loadCashflowData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agents/cashflow', {
        company_id: user?.id,
        months: parseInt(selectedTimeframe) / 30
      });

      const data = response.data;
      setHasData(data.hasData);

      if (data.hasData) {
        // Set predictions
        setPredictions(data.predictions || []);
        
        // Set anomalies
        setAnomalies(data.anomalies || []);
        
        // Set insights
        setInsights(data.insights || []);
        
        // Set recent transactions
        setTransactions(data.recentTransactions || []);
        
        // Set summary data
        if (data.summary) {
          setCashflowData({
            currentBalance: data.summary.currentBalance || 0,
            inflow: data.summary.totalInflow || 0,
            outflow: data.summary.totalOutflow || 0,
            runway: data.summary.runwayMonths || 0,
            burnRate: data.summary.burnRate || 0,
            pendingInvoices: data.summary.pendingInvoices || 0,
            overdueAmount: data.summary.overdueAmount || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading cashflow:', error);
      toast.error('Failed to load cashflow data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCashflowData();
    setRefreshing(false);
    toast.success('Cashflow data refreshed');
  };

  const formatMoney = (amount: number) => formatCurrency(amount, currency);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Analyzing cash flow data...</p>
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
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Cash Flow Forecasting</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Add your company transactions to unlock AI-powered cash flow forecasting, 
              anomaly detection, and optimization insights.
            </p>
            <Link
              to="/company/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Company Data
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
            <h1 className="text-3xl font-bold text-white">Cash Flow Management</h1>
            <p className="text-gray-400">AI-Powered Cash Flow Analysis & Forecasting</p>
          </div>
          
          <div className="flex items-center gap-3">
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
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 glass-card hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Cash Balance', value: formatMoney(cashflowData.currentBalance), icon: DollarSign, color: 'green', trend: null },
            { label: 'Monthly Inflow', value: formatMoney(cashflowData.inflow), icon: TrendingUp, color: 'blue', trend: null },
            { label: 'Monthly Outflow', value: formatMoney(cashflowData.outflow), icon: TrendingDown, color: 'red', trend: null },
            { label: 'Runway', value: `${cashflowData.runway} months`, icon: Calendar, color: 'purple', trend: null },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className={`w-5 h-5 text-${metric.color}-400`} />
                <span className="text-gray-400 text-sm">{metric.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cash Flow Predictions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">AI Cash Flow Forecast</h3>
              </div>

              {predictions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No forecast data available yet.</p>
              ) : (
                <div className="space-y-4">
                  {predictions.map((prediction, index) => (
                    <div
                      key={index}
                      className="p-4 bg-dark-700/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{prediction.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-white">
                            {formatMoney(prediction.projected)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            prediction.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                            prediction.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {prediction.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      {prediction.factors && prediction.factors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {prediction.factors.map((factor, i) => (
                            <span key={i} className="text-xs text-gray-400 bg-dark-600 px-2 py-1 rounded">
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
              
              {transactions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transactions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.type === 'inflow' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {tx.type === 'inflow' ? (
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm">{tx.description}</p>
                          <p className="text-gray-500 text-xs">{tx.date} • {tx.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${
                          tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.type === 'inflow' ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}
                        </span>
                        {tx.aiFlag && (
                          <span className="block text-xs text-yellow-400 mt-1">
                            🤖 {tx.aiFlag}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Anomalies */}
            {anomalies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Anomalies Detected</h3>
                </div>

                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium uppercase">{anomaly.type}</span>
                        {anomaly.amount > 0 && (
                          <span className="text-sm font-semibold">{formatMoney(anomaly.amount)}</span>
                        )}
                      </div>
                      <p className="text-white text-sm mb-2">{anomaly.description}</p>
                      <p className="text-gray-400 text-xs">💡 {anomaly.recommendation}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">AI Insights</h3>
              </div>

              {insights.length === 0 ? (
                <p className="text-gray-400 text-sm">No insights available yet.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-3 rounded-lg border ${getInsightTypeStyles(insight.type)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{insight.title}</span>
                        <span className={`text-xs ${
                          insight.type === 'opportunity' ? 'text-green-400' : 
                          insight.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                        }`}>
                          {insight.impact}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{insight.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Burn Rate</span>
                  <span className="text-white font-medium">{formatMoney(cashflowData.burnRate)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pending Invoices</span>
                  <span className="text-white font-medium">{cashflowData.pendingInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Overdue Amount</span>
                  <span className="text-red-400 font-medium">{formatMoney(cashflowData.overdueAmount)}</span>
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
