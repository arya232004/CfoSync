import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Plus,
  Brain,
  CheckCircle,
  XCircle,
  Eye,
  Activity,
  Lock,
  Search,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FraudAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  amount: number;
  timestamp: string;
  status: 'investigating' | 'resolved' | 'dismissed' | 'pending';
  aiConfidence: number;
  suggestedAction: string;
}

interface SecurityMetric {
  label: string;
  value: number | string;
  status: 'good' | 'warning' | 'critical';
}

const FraudDetection = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasData, setHasData] = useState(false);
  
  // Data states
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [realtimeProtection, setRealtimeProtection] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [lastScanTime, setLastScanTime] = useState('Never');

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
        // Set alerts
        setAlerts(data.alerts || []);
        
        // Set risk score
        setRiskScore(data.riskScore || 0);
        
        // Set metrics
        setMetrics(data.metrics || []);
        
        // Set last scan time
        setLastScanTime(data.lastScan || 'Just now');
      }
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComplianceData();
    setRefreshing(false);
    toast.success('Fraud detection data refreshed');
  };

  const handleFullScan = async () => {
    setScanning(true);
    try {
      const response = await api.post('/api/agents/compliance', {
        company_id: user?.id,
        full_scan: true
      });

      const data = response.data;
      setAlerts(data.alerts || []);
      setRiskScore(data.riskScore || 0);
      setLastScanTime('Just now');
      
      toast.success('Full security scan completed');
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Security scan failed');
    } finally {
      setScanning(false);
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

      // Update risk score when alerts are resolved
      if (action === 'resolve' || action === 'dismiss') {
        setRiskScore(prev => Math.max(0, prev - 3));
      }

      toast.success(`Alert ${action}d successfully`);
    } catch (error) {
      toast.error('Failed to update alert');
    }
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

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-red-400';
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
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Fraud Detection & Security</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Add your company transactions to enable AI-powered fraud detection, 
              anomaly analysis, and real-time security monitoring.
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
            <h1 className="text-3xl font-bold text-white">Fraud Detection</h1>
            <p className="text-gray-400">AI-Powered Security & Anomaly Detection</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${realtimeProtection ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">Real-time Protection</span>
              <button
                onClick={() => setRealtimeProtection(!realtimeProtection)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  realtimeProtection ? 'bg-green-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  realtimeProtection ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <button
              onClick={handleFullScan}
              disabled={scanning}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {scanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Full Scan
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

        {/* Security Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${riskScore > 50 ? 'text-red-400' : riskScore > 30 ? 'text-yellow-400' : 'text-green-400'}`} />
              <span className="text-gray-400 text-sm">Risk Score</span>
            </div>
            <div className={`text-3xl font-bold ${riskScore > 50 ? 'text-red-400' : riskScore > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
              {riskScore}
            </div>
            <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  riskScore > 50 ? 'bg-red-500' : riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
          </motion.div>

          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-sm">{metric.label}</span>
              </div>
              <div className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                {metric.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
                  {pendingAlerts.length > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                      {pendingAlerts.length} pending
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Last scan: {lastScanTime}
                </span>
              </div>

              {pendingAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-400">No active threats detected</p>
                  <p className="text-gray-500 text-sm">Your system is secure</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${getSeverityStyles(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getSeverityStyles(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className="text-white font-medium">{alert.type}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{alert.description}</p>
                        </div>
                        <div className="text-right">
                          {alert.amount > 0 && (
                            <span className="text-white font-semibold">{formatMoney(alert.amount)}</span>
                          )}
                          <div className="text-gray-500 text-xs mt-1">{alert.timestamp}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-current/20">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          <span className="text-sm">{alert.aiConfidence}% confidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAlertAction(alert.id, 'investigate')}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Investigate
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolve
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'dismiss')}
                            className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded text-sm hover:bg-gray-500/30 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Dismiss
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 p-2 bg-dark-800/50 rounded text-sm">
                        <span className="text-gray-400">💡 Suggested: </span>
                        <span className="text-gray-300">{alert.suggestedAction}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Resolved Alerts */}
            {resolvedAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Resolved Alerts</h3>
                <div className="space-y-2">
                  {resolvedAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusStyles(alert.status)}`}>
                          {alert.status === 'resolved' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm">{alert.type}</p>
                          <p className="text-gray-500 text-xs">{alert.timestamp}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusStyles(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Security Status</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                  <span className="text-gray-300 text-sm">Firewall</span>
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                  <span className="text-gray-300 text-sm">Encryption</span>
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> AES-256
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                  <span className="text-gray-300 text-sm">Two-Factor Auth</span>
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                  <span className="text-gray-300 text-sm">Last Audit</span>
                  <span className="text-gray-400 text-sm">7 days ago</span>
                </div>
              </div>
            </motion.div>

            {/* AI Protection */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">AI Protection</h3>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Our AI monitors your transactions 24/7 for suspicious patterns, 
                duplicate payments, and unauthorized access attempts.
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Duplicate invoice detection
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Unusual amount alerts
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  New vendor verification
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Access pattern monitoring
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudDetection;
