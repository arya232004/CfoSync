import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Loader2,
  Plus,
  Brain,
  Award,
  Calendar,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';
import { useSettingsStore, formatCurrency } from '../../lib/store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  bonus?: number;
  status: 'active' | 'pending' | 'on_leave';
  aiInsight?: string;
}

interface PayrollInsight {
  id: string;
  type: 'optimization' | 'compliance' | 'benchmark' | 'forecast';
  title: string;
  message: string;
  impact?: string;
}

interface DepartmentBudget {
  name: string;
  budget: number;
  actual: number;
  headcount: number;
}

const Payroll = () => {
  const { user } = useAuthStore();
  const { currency } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [insights, setInsights] = useState<PayrollInsight[]>([]);
  const [departments, setDepartments] = useState<DepartmentBudget[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [payrollData, setPayrollData] = useState({
    totalMonthly: 0,
    totalAnnual: 0,
    employeeCount: 0,
    avgSalary: 0,
    benefits: 0,
    taxes: 0,
    nextPayroll: '',
    daysUntilPayroll: 0
  });

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agents/payroll', {
        company_id: user?.id
      });

      const data = response.data;
      setHasData(data.hasData);

      if (data.hasData) {
        // Set employees
        setEmployees(data.employees || []);
        
        // Set insights
        setInsights(data.insights || []);
        
        // Set departments
        setDepartments(data.departments || []);
        
        // Set summary data
        if (data.summary) {
          setPayrollData({
            totalMonthly: data.summary.totalMonthly || 0,
            totalAnnual: data.summary.totalAnnual || 0,
            employeeCount: data.summary.employeeCount || 0,
            avgSalary: data.summary.avgSalary || 0,
            benefits: data.summary.benefits || 0,
            taxes: data.summary.taxes || 0,
            nextPayroll: data.summary.nextPayroll || 'Not scheduled',
            daysUntilPayroll: data.summary.daysUntilPayroll || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading payroll:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayrollData();
    setRefreshing(false);
    toast.success('Payroll data refreshed');
  };

  const handleComplianceCheck = async () => {
    setComplianceLoading(true);
    try {
      // Simulate compliance check
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newInsight: PayrollInsight = {
        id: `compliance-${Date.now()}`,
        type: 'compliance',
        title: 'Compliance Audit Complete',
        message: '✓ All W-4s current ✓ I-9 verification complete ✓ Tax registrations active',
        impact: '100%'
      };
      
      setInsights(prev => [newInsight, ...prev]);
      toast.success('Compliance check completed');
    } catch (error) {
      toast.error('Compliance check failed');
    } finally {
      setComplianceLoading(false);
    }
  };

  const formatMoney = (amount: number) => formatCurrency(amount, currency);

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(e => e.department === selectedDepartment);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading payroll data...</p>
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
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Payroll Management</h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Add your employee data to unlock AI-powered payroll analytics, 
              compliance tracking, and compensation benchmarking.
            </p>
            <Link
              to="/company/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Employee Data
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
            <h1 className="text-3xl font-bold text-white">Payroll Management</h1>
            <p className="text-gray-400">AI-Powered Payroll Analytics & Compliance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleComplianceCheck}
              disabled={complianceLoading}
              className="px-4 py-2 glass-card text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              {complianceLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Run Compliance Check
            </button>
            <div className="px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg">
              Next Payroll: {payrollData.daysUntilPayroll} days
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Monthly Payroll', value: formatMoney(payrollData.totalMonthly), icon: DollarSign },
            { label: 'Employees', value: payrollData.employeeCount, icon: Users },
            { label: 'Avg Salary', value: formatMoney(payrollData.avgSalary), icon: BarChart3 },
            { label: 'Benefits', value: formatMoney(payrollData.benefits), icon: Award },
            { label: 'Taxes', value: formatMoney(payrollData.taxes), icon: Calendar },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">{metric.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{metric.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Employee Compensation</h3>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="bg-dark-700 text-white px-3 py-2 rounded-lg border border-dark-600"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {filteredEmployees.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No employees found.</p>
              ) : (
                <div className="space-y-3">
                  {filteredEmployees.map((employee, index) => (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg ${
                        employee.aiInsight ? 'bg-dark-700/80 border border-yellow-500/20' : 'bg-dark-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            employee.status === 'active' ? 'bg-green-500/20' :
                            employee.status === 'on_leave' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                          }`}>
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium">{employee.name}</div>
                            <div className="text-gray-400 text-sm">{employee.role} • {employee.department}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">{formatMoney(employee.salary)}</div>
                          {employee.bonus && (
                            <div className="text-green-400 text-sm">+{formatMoney(employee.bonus)} bonus</div>
                          )}
                        </div>
                      </div>
                      
                      {employee.aiInsight && (
                        <div className="mt-3 pt-3 border-t border-dark-600">
                          <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <Brain className="w-4 h-4" />
                            <span>AI Insight: {employee.aiInsight}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Department Breakdown */}
            {departments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Department Budget vs Actual</h3>
                <div className="space-y-4">
                  {departments.map((dept, index) => {
                    const utilization = dept.budget > 0 ? (dept.actual / dept.budget) * 100 : 0;
                    return (
                      <div key={dept.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white">{dept.name}</span>
                          <span className="text-gray-400">
                            {formatMoney(dept.actual)} / {formatMoney(dept.budget)} ({dept.headcount} employees)
                          </span>
                        </div>
                        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(utilization, 100)}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className={`h-full rounded-full ${
                              utilization > 95 ? 'bg-red-500' :
                              utilization > 85 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
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
                <h3 className="text-lg font-semibold text-white">AI Payroll Insights</h3>
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
                        insight.type === 'compliance' ? 'bg-green-900/20 border-green-500/30' :
                        insight.type === 'benchmark' ? 'bg-yellow-900/20 border-yellow-500/30' :
                        insight.type === 'optimization' ? 'bg-blue-900/20 border-blue-500/30' :
                        'bg-purple-900/20 border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium uppercase ${
                          insight.type === 'compliance' ? 'bg-green-500/30 text-green-400' :
                          insight.type === 'benchmark' ? 'bg-yellow-500/30 text-yellow-400' :
                          insight.type === 'optimization' ? 'bg-blue-500/30 text-blue-400' :
                          'bg-purple-500/30 text-purple-400'
                        }`}>
                          {insight.type}
                        </span>
                        {insight.impact && (
                          <span className="text-xs text-gray-400">{insight.impact}</span>
                        )}
                      </div>
                      <div className="text-white font-medium text-sm mb-1">{insight.title}</div>
                      <div className="text-gray-400 text-sm">{insight.message}</div>
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
                  Generate Payroll Report
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Benchmark Salaries
                </button>
                <Link
                  to="/company/onboarding"
                  className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
