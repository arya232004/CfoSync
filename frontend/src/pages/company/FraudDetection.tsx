import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import aiService from '../../services/aiService';

const { company: companyAI } = aiService;

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
  trend?: string;
}

const FraudDetection = () => {
  const [aiLoading, setAiLoading] = useState({
    scan: false,
    analysis: false,
    realtime: false,
  });
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [lastScanTime, setLastScanTime] = useState<string>('2 minutes ago');
  const [riskScore, setRiskScore] = useState(24);
  const [realtimeProtection, setRealtimeProtection] = useState(true);

  const securityMetrics: SecurityMetric[] = [
    { label: 'Risk Score', value: riskScore, status: riskScore > 50 ? 'critical' : riskScore > 30 ? 'warning' : 'good' },
    { label: 'Transactions Scanned', value: '12,847', status: 'good' },
    { label: 'Anomalies Detected', value: 5, status: 'warning' },
    { label: 'False Positive Rate', value: '2.3%', status: 'good' },
  ];

  const initialAlerts: FraudAlert[] = [
    {
      id: '1',
      severity: 'high',
      type: 'Unusual Transfer',
      description: 'Large wire transfer to new vendor (VendorCorp LLC) not in approved vendor list',
      amount: 45000,
      timestamp: '2024-01-15 14:32',
      status: 'pending',
      aiConfidence: 89,
      suggestedAction: 'Verify vendor legitimacy and approval before processing',
    },
    {
      id: '2',
      severity: 'medium',
      type: 'Access Anomaly',
      description: 'Finance portal accessed from unusual location (Prague, CZ)',
      amount: 0,
      timestamp: '2024-01-15 11:18',
      status: 'investigating',
      aiConfidence: 76,
      suggestedAction: 'Confirm with user and consider enforcing geo-restrictions',
    },
    {
      id: '3',
      severity: 'critical',
      type: 'Duplicate Invoice',
      description: 'Potential duplicate payment: Invoice #INV-2024-0892 matches pattern of #INV-2024-0845',
      amount: 8200,
      timestamp: '2024-01-14 16:45',
      status: 'pending',
      aiConfidence: 94,
      suggestedAction: 'Hold payment and verify with accounts payable',
    },
    {
      id: '4',
      severity: 'low',
      type: 'Off-hours Activity',
      description: 'Expense report submitted at 3:42 AM local time',
      amount: 1250,
      timestamp: '2024-01-14 03:42',
      status: 'dismissed',
      aiConfidence: 45,
      suggestedAction: 'Likely legitimate - employee may be traveling',
    },
    {
      id: '5',
      severity: 'medium',
      type: 'Vendor Pattern',
      description: 'Increased payment frequency to vendor (CloudServices Inc) - up 300% MoM',
      amount: 24500,
      timestamp: '2024-01-13 09:15',
      status: 'resolved',
      aiConfidence: 68,
      suggestedAction: 'Review contract terms and service usage',
    },
  ];

  useEffect(() => {
    setAlerts(initialAlerts);
    runInitialScan();
  }, []);

  const runInitialScan = async () => {
    setAiLoading(prev => ({ ...prev, analysis: true }));
    try {
      await companyAI.detectAnomalies('company-1', []);
    } catch (error) {
      console.error('Initial scan error:', error);
    }
    setAiLoading(prev => ({ ...prev, analysis: false }));
  };

  const handleFullScan = async () => {
    setAiLoading(prev => ({ ...prev, scan: true }));
    try {
      const results = await companyAI.detectAnomalies('company-1', []);
      
      // Add new alert from scan
      const newAlert: FraudAlert = {
        id: `scan-${Date.now()}`,
        severity: 'medium',
        type: 'Pattern Analysis Complete',
        description: 'Full transaction scan completed. 2 new anomalies identified for review.',
        amount: 0,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'pending',
        aiConfidence: 85,
        suggestedAction: 'Review flagged transactions in detail',
      };
      
      setAlerts(prev => [newAlert, ...prev]);
      setLastScanTime('Just now');
      
      // Update risk score based on results
      if (results && results.length > 0) {
        setRiskScore(prev => Math.min(100, prev + 5));
      }
    } catch (error) {
      console.error('Full scan error:', error);
    }
    setAiLoading(prev => ({ ...prev, scan: false }));
  };

  const handleAlertAction = (alertId: string, action: 'resolve' | 'dismiss' | 'investigate') => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        return {
          ...alert,
          status: action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'investigating',
        };
      }
      return alert;
    }));
    
    // Update risk score when alerts are resolved
    if (action === 'resolve' || action === 'dismiss') {
      setRiskScore(prev => Math.max(0, prev - 3));
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Fraud Detection</h1>
            <p className="text-gray-400">AI-Powered Security & Anomaly Detection</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              realtimeProtection ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                realtimeProtection ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className={realtimeProtection ? 'text-green-400' : 'text-red-400'}>
                {realtimeProtection ? 'Real-time Protection Active' : 'Protection Disabled'}
              </span>
              <button
                onClick={() => setRealtimeProtection(!realtimeProtection)}
                className="ml-2 text-xs underline opacity-70 hover:opacity-100"
              >
                {realtimeProtection ? 'Disable' : 'Enable'}
              </button>
            </div>
            
            <button
              onClick={handleFullScan}
              disabled={aiLoading.scan}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {aiLoading.scan ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Scanning...
                </>
              ) : (
                <>🔍 Full Scan</>
              )}
            </button>
          </div>
        </div>

        {/* Risk Score Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-dark-800 to-dark-900 rounded-2xl p-6 mb-8 border border-dark-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Large Risk Score */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-dark-700"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - riskScore / 100) }}
                    transition={{ duration: 1 }}
                    className={`${
                      riskScore > 50 ? 'text-red-500' :
                      riskScore > 30 ? 'text-yellow-500' : 'text-green-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      riskScore > 50 ? 'text-red-400' :
                      riskScore > 30 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {riskScore}
                    </div>
                    <div className="text-gray-400 text-xs">Risk Score</div>
                  </div>
                </div>
              </div>
              <div className={`mt-2 text-sm font-medium ${
                riskScore > 50 ? 'text-red-400' :
                riskScore > 30 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {riskScore > 50 ? 'High Risk' : riskScore > 30 ? 'Moderate' : 'Low Risk'}
              </div>
            </div>

            {/* Metrics */}
            {securityMetrics.slice(1).map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-dark-700/50 rounded-xl p-4 text-center"
              >
                <div className="text-gray-400 text-sm mb-2">{metric.label}</div>
                <div className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                  {metric.value}
                </div>
              </motion.div>
            ))}

            {/* Last Scan */}
            <div className="bg-dark-700/50 rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm mb-2">Last AI Scan</div>
              <div className="text-white text-lg font-medium">{lastScanTime}</div>
              <div className="text-green-400 text-xs mt-1">✓ All systems normal</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚨</span>
                  <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    {pendingAlerts.length} pending
                  </span>
                </div>
              </div>

              <AnimatePresence>
                <div className="space-y-3">
                  {pendingAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${getSeverityStyles(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                            alert.severity === 'critical' ? 'bg-red-500/30' :
                            alert.severity === 'high' ? 'bg-orange-500/30' :
                            alert.severity === 'medium' ? 'bg-yellow-500/30' : 'bg-blue-500/30'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-white font-medium">{alert.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyles(alert.status)}`}>
                            {alert.status}
                          </span>
                          {alert.amount > 0 && (
                            <span className="text-white font-semibold">{formatCurrency(alert.amount)}</span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-2">{alert.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{alert.timestamp}</span>
                          <span className="flex items-center gap-1">
                            🤖 {alert.aiConfidence}% confidence
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAlertAction(alert.id, 'investigate')}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30 transition-colors"
                          >
                            Investigate
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'dismiss')}
                            className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs rounded hover:bg-gray-500/30 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-primary-400">AI Suggestion:</span>
                          <span className="text-gray-400">{alert.suggestedAction}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>

              {pendingAlerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No active alerts. All systems secure.</p>
                </div>
              )}
            </motion.div>

            {/* Resolved Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent History</h3>
                <span className="text-gray-400 text-sm">{resolvedAlerts.length} resolved</span>
              </div>

              <div className="space-y-2">
                {resolvedAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        alert.status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-gray-400">{alert.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{alert.timestamp}</span>
                      <span className={getStatusStyles(alert.status) + ' px-2 py-0.5 rounded text-xs'}>
                        {alert.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Detection Patterns */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🤖</span>
                <h3 className="text-lg font-semibold text-white">AI Detection Patterns</h3>
              </div>

              <div className="space-y-3">
                {[
                  { pattern: 'Unusual Transfer Amounts', detections: 12, accuracy: 94 },
                  { pattern: 'Duplicate Invoices', detections: 8, accuracy: 91 },
                  { pattern: 'New Vendor Payments', detections: 15, accuracy: 87 },
                  { pattern: 'Off-Hours Activity', detections: 23, accuracy: 76 },
                  { pattern: 'Access Location Anomaly', detections: 5, accuracy: 82 },
                ].map((item, index) => (
                  <motion.div
                    key={item.pattern}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-dark-700/50 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-sm">{item.pattern}</span>
                      <span className="text-gray-400 text-xs">{item.detections} detected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.accuracy}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className="h-full bg-primary-500 rounded-full"
                        />
                      </div>
                      <span className="text-gray-400 text-xs">{item.accuracy}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Security Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>📋</span> Generate Security Report
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>⚙️</span> Configure Detection Rules
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>👥</span> Manage Access Controls
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm text-left flex items-center gap-3">
                  <span>📧</span> Alert Notifications
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
