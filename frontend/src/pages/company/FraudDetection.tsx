import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Upload,
  Brain,
  CheckCircle,
  XCircle,
  Activity,
  Search,
  Clock,
  Eye
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FraudAlert {
  id: string;
  row_number?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  amount: number;
  timestamp: string;
  status: 'investigating' | 'resolved' | 'dismissed' | 'pending';
  aiConfidence: number;
  suggestedAction: string;
}

interface AnalysisSummary {
  total_transactions: number;
  total_inflow: number;
  total_outflow: number;
  high_risk_alerts: number;
  medium_risk_alerts: number;
  low_risk_alerts: number;
}

const FraudDetection = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasData, setHasData] = useState(false);
  
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [realtimeProtection, setRealtimeProtection] = useState(true);
  const [lastScanTime, setLastScanTime] = useState('Never');
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agents/compliance', {
        company_id: user?.id
      });

      const data = response.data;
      setHasData(data.hasData);

      if (data.hasData) {
        setAlerts(data.alerts || []);
        setRiskScore(data.riskScore || 0);
        setLastScanTime(data.metrics?.lastScanTime || 'Just now');
      }
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/api/agents/fraud/analyze-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setAlerts(response.data.alerts || []);
        setRiskScore(response.data.risk_score || 0);
        setSummary(response.data.summary || null);
        setHasData(true);
        setLastScanTime('Just now');
        
        const alertCount = response.data.alerts_count || 0;
        if (alertCount > 0) {
          toast.error(`Found ${alertCount} potential fraud alerts!`, { duration: 5000 });
        } else {
          toast.success('No fraud detected! All transactions look clean.');
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze CSV');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAlertAction = async (alertId: string, action: 'resolve' | 'dismiss' | 'investigate') => {
    try {
      await api.post('/api/agents/compliance/update-alert', {
        company_id: user?.id,
        alert_id: alertId,
        status: action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'investigating'
      });

      setAlerts(prev => prev.map(alert => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'investigating'
          };
        }
        return alert;
      }));

      if (action === 'resolve' || action === 'dismiss') {
        setRiskScore(prev => Math.max(0, prev - 5));
      }

      toast.success(`Alert ${action}d successfully`);
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComplianceData();
    setRefreshing(false);
    toast.success('Fraud detection data refreshed');
  };

  const formatMoney = (amount: number) => formatCurrency(amount, currency);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'dismissed': return 'bg-gray-500/20 text-gray-400';
      case 'investigating': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const pendingAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'investigating');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'dismissed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Scanning for security threats...</p>
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
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Fraud Detection & Security</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Upload your transaction CSV to analyze for potential fraud patterns, 
              duplicate transactions, unusual amounts, and suspicious activity.
            </p>
            
            <div className="mb-8 p-6 border-2 border-dashed border-gray-600 rounded-xl">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Upload Transaction CSV</p>
              <p className="text-gray-500 text-sm mb-4">
                CSV should include: Date, Description, Amount, Vendor (optional)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {uploading ? 'Analyzing...' : 'Analyze for Fraud'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
                <p className="text-white font-medium text-sm">Duplicates</p>
                <p className="text-gray-400 text-xs">Detect duplicate transactions</p>
              </div>
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <Activity className="w-6 h-6 text-red-400 mb-2" />
                <p className="text-white font-medium text-sm">Anomalies</p>
                <p className="text-gray-400 text-xs">Flag unusual amounts</p>
              </div>
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <Clock className="w-6 h-6 text-orange-400 mb-2" />
                <p className="text-white font-medium text-sm">Timing</p>
                <p className="text-gray-400 text-xs">Weekend/holiday payments</p>
              </div>
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <Brain className="w-6 h-6 text-purple-400 mb-2" />
                <p className="text-white font-medium text-sm">AI Analysis</p>
                <p className="text-gray-400 text-xs">Pattern recognition</p>
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
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Fraud Detection</h1>
            <p className="text-gray-400">AI-Powered Security & Anomaly Detection</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${realtimeProtection ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">Real-time Protection</span>
              <button
                onClick={() => setRealtimeProtection(!realtimeProtection)}
                className={`w-10 h-5 rounded-full transition-colors ${realtimeProtection ? 'bg-green-500' : 'bg-dark-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${realtimeProtection ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload CSV
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

        {/* Summary from analysis */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">Transactions</div>
              <div className="text-xl font-bold text-white">{summary.total_transactions}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">Total Inflow</div>
              <div className="text-xl font-bold text-green-400">{formatMoney(summary.total_inflow)}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">Total Outflow</div>
              <div className="text-xl font-bold text-red-400">{formatMoney(summary.total_outflow)}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">High Risk</div>
              <div className="text-xl font-bold text-red-400">{summary.high_risk_alerts}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">Medium Risk</div>
              <div className="text-xl font-bold text-yellow-400">{summary.medium_risk_alerts}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-4">
              <div className="text-gray-400 text-sm">Low Risk</div>
              <div className="text-xl font-bold text-blue-400">{summary.low_risk_alerts}</div>
            </motion.div>
          </div>
        )}

        {/* Risk Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${riskScore > 50 ? 'text-red-400' : riskScore > 30 ? 'text-yellow-400' : 'text-green-400'}`} />
              <span className="text-gray-400 text-sm">Risk Score</span>
            </div>
            <div className={`text-3xl font-bold ${riskScore > 50 ? 'text-red-400' : riskScore > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
              {riskScore}
            </div>
            <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${riskScore > 50 ? 'bg-red-500' : riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Active Alerts</span>
            </div>
            <div className="text-3xl font-bold text-white">{pendingAlerts.length}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Resolved</span>
            </div>
            <div className="text-3xl font-bold text-white">{resolvedAlerts.length}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm">Last Scan</span>
            </div>
            <div className="text-xl font-bold text-white">{lastScanTime}</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Fraud Alerts</h3>
                  {pendingAlerts.length > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                      {pendingAlerts.length} pending
                    </span>
                  )}
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-400">No fraud alerts detected</p>
                  <p className="text-gray-500 text-sm">Your transactions look clean</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {alerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${getSeverityStyles(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getSeverityStyles(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className="text-white font-medium">{alert.type}</span>
                            {alert.row_number && alert.row_number > 0 && (
                              <span className="text-gray-500 text-xs">Row #{alert.row_number}</span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{alert.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              Amount: <span className="text-white font-medium">{formatMoney(alert.amount)}</span>
                            </span>
                            <span className="text-gray-400">
                              Date: <span className="text-white">{alert.timestamp}</span>
                            </span>
                            <span className="text-gray-400">
                              AI Confidence: <span className="text-primary-400">{alert.aiConfidence}%</span>
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            <Brain className="w-3 h-3 inline mr-1" />
                            {alert.suggestedAction}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusStyles(alert.status)}`}>
                            {alert.status}
                          </span>
                          {alert.status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleAlertAction(alert.id, 'resolve')}
                                className="p-1 hover:bg-green-500/20 rounded text-green-400"
                                title="Mark as resolved"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAlertAction(alert.id, 'investigate')}
                                className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                                title="Investigate"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAlertAction(alert.id, 'dismiss')}
                                className="p-1 hover:bg-gray-500/20 rounded text-gray-400"
                                title="Dismiss"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Fraud Detection Types</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-white text-sm font-medium">Duplicate Transactions</span>
                  </div>
                  <p className="text-gray-400 text-xs">Same amount, vendor, and description</p>
                </div>
                <div className="p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-white text-sm font-medium">Unusual Amounts</span>
                  </div>
                  <p className="text-gray-400 text-xs">Transactions outside normal range</p>
                </div>
                <div className="p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-white text-sm font-medium">Round Numbers</span>
                  </div>
                  <p className="text-gray-400 text-xs">Suspiciously round amounts</p>
                </div>
                <div className="p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-white text-sm font-medium">Weekend Payments</span>
                  </div>
                  <p className="text-gray-400 text-xs">Large payments on non-business days</p>
                </div>
                <div className="p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-white text-sm font-medium">Vendor Frequency</span>
                  </div>
                  <p className="text-gray-400 text-xs">Unusually high transaction count</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload New CSV
                </button>
                <button
                  onClick={handleRefresh}
                  className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Analysis
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudDetection;
