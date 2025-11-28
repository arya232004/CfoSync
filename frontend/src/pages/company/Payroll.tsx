import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import aiService from '../../services/aiService';

const { company: companyAI } = aiService;

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  bonus: number;
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

const Payroll = () => {
  const [aiLoading, setAiLoading] = useState({
    analysis: false,
    compliance: false,
    forecast: false,
  });
  const [insights, setInsights] = useState<PayrollInsight[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const payrollData = {
    totalMonthly: 312500,
    totalAnnual: 3750000,
    employeeCount: 24,
    avgSalary: 130208,
    benefits: 47000,
    taxes: 62500,
    nextPayroll: '2024-01-31',
    daysUntilPayroll: 5,
  };

  const employees: Employee[] = [
    { id: '1', name: 'Sarah Chen', role: 'CTO', department: 'Engineering', salary: 185000, bonus: 25000, status: 'active' },
    { id: '2', name: 'Michael Johnson', role: 'VP Sales', department: 'Sales', salary: 165000, bonus: 45000, status: 'active', aiInsight: 'Top performer - consider retention bonus' },
    { id: '3', name: 'Emily Rodriguez', role: 'Senior Engineer', department: 'Engineering', salary: 145000, bonus: 15000, status: 'active' },
    { id: '4', name: 'David Kim', role: 'Product Manager', department: 'Product', salary: 135000, bonus: 12000, status: 'active' },
    { id: '5', name: 'Lisa Wang', role: 'Marketing Director', department: 'Marketing', salary: 125000, bonus: 18000, status: 'on_leave', aiInsight: 'On parental leave - temp coverage needed' },
    { id: '6', name: 'James Wilson', role: 'Engineer', department: 'Engineering', salary: 115000, bonus: 10000, status: 'active', aiInsight: 'Salary 15% below market - flight risk' },
  ];

  const departments = [
    { name: 'Engineering', budget: 1450000, actual: 1320000, headcount: 12 },
    { name: 'Sales', budget: 850000, actual: 780000, headcount: 5 },
    { name: 'Marketing', budget: 420000, actual: 395000, headcount: 3 },
    { name: 'Product', budget: 380000, actual: 355000, headcount: 2 },
    { name: 'Operations', budget: 350000, actual: 340000, headcount: 2 },
  ];

  useEffect(() => {
    runPayrollAnalysis();
  }, []);

  const runPayrollAnalysis = async () => {
    setAiLoading(prev => ({ ...prev, analysis: true }));
    try {
      await companyAI.getCFOInsights('company-1');

      setInsights([
        {
          id: '1',
          type: 'benchmark',
          title: 'Market Salary Analysis',
          message: '3 employees are 15%+ below market rate - potential retention risk',
          impact: 'High',
        },
        {
          id: '2',
          type: 'optimization',
          title: 'Benefits Optimization',
          message: 'Switching to pooled HSA could save $8,400/year',
          impact: '-2.8%',
        },
        {
          id: '3',
          type: 'compliance',
          title: 'Compliance Alert',
          message: 'Q1 941 tax filing due in 18 days - all documentation ready',
          impact: 'On Track',
        },
        {
          id: '4',
          type: 'forecast',
          title: 'Hiring Impact',
          message: 'Adding 3 engineers by Q2 will increase monthly payroll by $35K',
          impact: '+11%',
        },
      ]);
    } catch (error) {
      console.error('Payroll analysis error:', error);
    }
    setAiLoading(prev => ({ ...prev, analysis: false }));
  };

  const handleComplianceCheck = async () => {
    setAiLoading(prev => ({ ...prev, compliance: true }));
    try {
      await companyAI.analyzePayroll('company-1');
      
      setInsights(prev => [{
        id: `compliance-${Date.now()}`,
        type: 'compliance',
        title: 'Full Compliance Audit Complete',
        message: '✓ All W-4s current ✓ I-9 verification complete ✓ State tax registrations active ✓ Workers comp coverage verified',
        impact: '100%',
      }, ...prev]);
    } catch (error) {
      console.error('Compliance check error:', error);
    }
    setAiLoading(prev => ({ ...prev, compliance: false }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(e => e.department === selectedDepartment);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Payroll Management</h1>
            <p className="text-gray-400">AI-Powered Payroll Analytics & Compliance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleComplianceCheck}
              disabled={aiLoading.compliance}
              className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
            >
              {aiLoading.compliance ? 'Checking...' : '✓ Run Compliance Check'}
            </button>
            <div className="px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg">
              Next Payroll: {payrollData.daysUntilPayroll} days
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Monthly Payroll', value: formatCurrency(payrollData.totalMonthly), icon: '💵' },
            { label: 'Employees', value: payrollData.employeeCount, icon: '👥' },
            { label: 'Avg Salary', value: formatCurrency(payrollData.avgSalary), icon: '📊' },
            { label: 'Benefits', value: formatCurrency(payrollData.benefits), icon: '🏥' },
            { label: 'Taxes', value: formatCurrency(payrollData.taxes), icon: '📋' },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800 rounded-xl p-4 border border-dark-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{metric.icon}</span>
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
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
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
                        <div className="text-white font-semibold">{formatCurrency(employee.salary)}</div>
                        <div className="text-green-400 text-sm">+{formatCurrency(employee.bonus)} bonus</div>
                      </div>
                    </div>
                    
                    {employee.aiInsight && (
                      <div className="mt-3 pt-3 border-t border-dark-600">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                          <span>🤖</span>
                          <span>AI Insight: {employee.aiInsight}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Department Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Department Budget vs Actual</h3>
              <div className="space-y-4">
                {departments.map((dept, index) => {
                  const utilization = (dept.actual / dept.budget) * 100;
                  return (
                    <div key={dept.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white">{dept.name}</span>
                        <span className="text-gray-400">
                          {formatCurrency(dept.actual)} / {formatCurrency(dept.budget)} ({dept.headcount} employees)
                        </span>
                      </div>
                      <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${utilization}%` }}
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
                <h3 className="text-lg font-semibold text-white">AI Payroll Insights</h3>
              </div>

              {aiLoading.analysis ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
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
              className="bg-dark-800 rounded-xl p-6 border border-dark-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
                  📊 Generate Payroll Report
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm">
                  💰 AI: Optimize Compensation
                </button>
                <button className="w-full py-3 px-4 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors text-sm">
                  📈 Benchmark Salaries
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
