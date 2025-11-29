import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  PieChart,
  BarChart3,
  Brain,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Shield,
  Target,
  Loader2,
  Plus,
  Settings,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface AIInsight {
  id?: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  severity?: string;
  action?: string;
}

interface CFORecommendation {
  id: string;
  category: string;
  recommendation: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

interface CompanyMetrics {
  revenue: number;
  expenses: number;
  net_income: number;
  employee_count: number;
  total_payroll: number;
  budget_utilization: number;
}

interface CompanyScore {
  overall: number;
  cashflow: number;
  compliance: number;
  growth: number;
  risk: number;
}

const CompanyDashboard = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<CFORecommendation[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [score, setScore] = useState<CompanyScore>({
    overall: 0, cashflow: 0, compliance: 0, growth: 0, risk: 0
  });
  const [nudges, setNudges] = useState<AIInsight[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [cfoRes, nudgeRes, complianceRes] = await Promise.allSettled([
        api.post('/api/agents/cfo_strategy', { company_id: user?.id }),
        api.post('/api/agents/nudge', { user_id: user?.id, company_id: user?.id }),
        api.post('/api/agents/compliance', { company_id: user?.id })
      ]);

      // Process CFO Strategy response
      if (cfoRes.status === 'fulfilled') {
        const data = cfoRes.value.data;
        setHasData(data.hasData);
        setInsights(data.insights || []);
        setRecommendations(data.recommendations || []);
        setScore(data.score || { overall: 0, cashflow: 0, compliance: 0, growth: 0, risk: 0 });
        setMetrics(data.metrics || null);
      }

      // Process Nudges
      if (nudgeRes.status === 'fulfilled') {
        setNudges(nudgeRes.value.data.nudges || []);
      }

      // Process Compliance/Fraud
      if (complianceRes.status === 'fulfilled') {
        const data = complianceRes.value.data;
        setFraudAlerts(data.alerts?.slice(0, 3) || []);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const formatMoney = (value: number) => formatCurrency(value, currency);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'success': return 'text-green-400 bg-green-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your company dashboard...</p>
        </div>
      </div>
    );
  }

  // No Data State - Show Setup Prompt
  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Welcome to CFOSync for Business</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Set up your company data to unlock AI-powered financial insights, cash flow forecasting, 
              fraud detection, and strategic recommendations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="glass-card p-4">
                <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-white font-medium">Financial Data</h3>
                <p className="text-sm text-gray-400">Revenue, expenses, cash balance</p>
              </div>
              <div className="glass-card p-4">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="text-white font-medium">Employee Data</h3>
                <p className="text-sm text-gray-400">Payroll and team structure</p>
              </div>
              <div className="glass-card p-4">
                <PieChart className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium">Department Budgets</h3>
                <p className="text-sm text-gray-400">Budget allocation and tracking</p>
              </div>
            </div>

            <Link
              to="/company/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all"
            >
              <Plus className="w-5 h-5" />
              Set Up Company Data
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Company Dashboard</h1>
            <p className="text-gray-400">AI-powered financial insights for your business</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 glass-card hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/company/onboarding" className="p-2 glass-card hover:bg-white/10 transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Health Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Overall Health', value: score.overall, color: 'primary' },
            { label: 'Cash Flow', value: score.cashflow, color: 'green' },
            { label: 'Compliance', value: score.compliance, color: 'blue' },
            { label: 'Growth', value: score.growth, color: 'purple' },
            { label: 'Risk Score', value: 100 - score.risk, color: 'yellow' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-white">{item.value}</span>
              </div>
              <p className="text-sm text-gray-400">{item.label}</p>
              <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${item.color}-500 rounded-full transition-all duration-1000`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Revenue</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(metrics.revenue)}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Expenses</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(metrics.expenses)}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Net Income</p>
                  <p className={`text-2xl font-bold ${metrics.net_income >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(metrics.net_income)}
                  </p>
                </div>
                <div className={`p-3 ${metrics.net_income >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-xl`}>
                  <DollarSign className={`w-6 h-6 ${metrics.net_income >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Employees</p>
                  <p className="text-2xl font-bold text-white">{metrics.employee_count}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-400" />
                AI Insights
              </h2>
            </div>
            
            <div className="space-y-3">
              {insights.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <Sparkles className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">No insights yet. Add more data for AI analysis.</p>
                </div>
              ) : (
                insights.map((insight, i) => (
                  <motion.div
                    key={insight.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`glass-card p-4 border-l-4 ${
                      insight.type === 'warning' || insight.priority === 'high' 
                        ? 'border-yellow-500' 
                        : insight.type === 'success' 
                        ? 'border-green-500' 
                        : 'border-primary-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium">{insight.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{insight.message}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs ${getSeverityColor(insight.type || insight.priority || 'info')}`}>
                        {insight.priority || insight.type}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* CFO Recommendations */}
            {recommendations.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-6">
                  <Target className="w-5 h-5 text-accent-400" />
                  Strategic Recommendations
                </h2>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-primary-400 text-sm font-medium">{rec.category}</span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(rec.priority)}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-white">{rec.recommendation}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-green-400 font-medium">{rec.impact}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Smart Nudges */}
            <div className="glass-card p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-yellow-400" />
                Notifications
              </h3>
              <div className="space-y-3">
                {nudges.map((nudge, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      nudge.priority === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                      nudge.priority === 'high' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      'bg-white/5'
                    }`}
                  >
                    <p className="text-white text-sm font-medium">{nudge.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{nudge.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fraud Alerts */}
            {fraudAlerts.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-red-400" />
                  Security Alerts
                </h3>
                <div className="space-y-3">
                  {fraudAlerts.map((alert, i) => (
                    <div key={i} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-red-400 text-xs font-medium">{alert.type}</span>
                        <span className="text-gray-500 text-xs">{alert.aiConfidence}% confidence</span>
                      </div>
                      <p className="text-white text-sm">{alert.description}</p>
                      {alert.amount > 0 && (
                        <p className="text-gray-400 text-xs mt-1">Amount: {formatMoney(alert.amount)}</p>
                      )}
                    </div>
                  ))}
                  <Link
                    to="/company/fraud"
                    className="block text-center text-primary-400 text-sm hover:underline"
                  >
                    View all alerts →
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="glass-card p-5">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/company/cashflow"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Cash Flow Forecast</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-500 ml-auto" />
                </Link>
                <Link
                  to="/company/budgets"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <PieChart className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Budget Analysis</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-500 ml-auto" />
                </Link>
                <Link
                  to="/company/payroll"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">Payroll Insights</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-500 ml-auto" />
                </Link>
                <Link
                  to="/company/fraud"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Shield className="w-5 h-5 text-red-400" />
                  <span className="text-gray-300">Fraud Detection</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-500 ml-auto" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
