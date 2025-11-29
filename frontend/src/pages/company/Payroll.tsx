import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  RefreshCw,
  Loader2,
  Upload,
  Brain,
  Award,
  Calendar,
  BarChart3,
  FileText,
  X,
  Printer
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
  email?: string;
  status: 'active' | 'pending' | 'on_leave';
  aiInsight?: string;
}

interface PayrollSlip {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  position: string;
  pay_period: string;
  pay_date: string;
  earnings: {
    base_salary: number;
    bonus: number;
    overtime: number;
    gross_pay: number;
  };
  deductions: {
    federal_tax: number;
    state_tax: number;
    social_security: number;
    medicare: number;
    health_insurance: number;
    retirement_401k: number;
    total_deductions: number;
  };
  net_pay: number;
  ytd: {
    gross_earnings: number;
    total_deductions: number;
    net_pay: number;
  };
  company_name: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingSlips, setGeneratingSlips] = useState(false);
  const [hasData, setHasData] = useState(false);
  
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
  
  const [showSlips, setShowSlips] = useState(false);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [payPeriod, setPayPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
        setEmployees(data.employees || []);
        setInsights(data.insights || []);
        setDepartments(data.departments || []);
        
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
      const response = await api.post('/api/agents/payroll/upload-employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`Uploaded ${response.data.employees_count} employees successfully!`);
      await loadPayrollData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload employee data');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateSlips = async () => {
    setGeneratingSlips(true);
    try {
      const response = await api.post('/api/agents/payroll/generate-slips', {
        company_id: user?.id,
        pay_period: payPeriod
      });
      
      if (response.data.success) {
        setPayrollSlips(response.data.slips);
        setShowSlips(true);
        toast.success(`Generated ${response.data.slips.length} payroll slips`);
      } else {
        toast.error(response.data.message || 'Failed to generate slips');
      }
    } catch (error: any) {
      console.error('Generate slips error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate payroll slips');
    } finally {
      setGeneratingSlips(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayrollData();
    setRefreshing(false);
    toast.success('Payroll data refreshed');
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
              Upload your employee CSV to generate payroll slips, track compensation, 
              and get AI-powered payroll analytics.
            </p>
            
            <div className="mb-8 p-6 border-2 border-dashed border-gray-600 rounded-xl">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Upload Employee CSV</p>
              <p className="text-gray-500 text-sm mb-4">
                CSV should include: Name, Role, Department, Salary, Bonus (optional)
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
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white hover:shadow-glow transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? 'Uploading...' : 'Select CSV File'}
              </button>
            </div>
            
            <div className="text-left bg-dark-700/50 rounded-lg p-4">
              <p className="text-gray-300 font-medium mb-2">Sample CSV Format:</p>
              <code className="text-xs text-gray-400 block">
                Name,Role,Department,Salary,Bonus,Email<br/>
                John Doe,Software Engineer,Engineering,95000,10000,john@company.com<br/>
                Jane Smith,Product Manager,Product,110000,15000,jane@company.com
              </code>
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
            <h1 className="text-3xl font-bold text-white">Payroll Management</h1>
            <p className="text-gray-400">AI-Powered Payroll Analytics & Slip Generation</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
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
              className="px-4 py-2 glass-card text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload CSV
            </button>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="bg-dark-700 text-white px-3 py-2 rounded-lg border border-dark-600"
              />
              <button
                onClick={handleGenerateSlips}
                disabled={generatingSlips}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generatingSlips ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Generate Slips
              </button>
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
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredEmployees.map((employee, index) => (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
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
                          {employee.bonus && employee.bonus > 0 && (
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
          </div>

          <div className="space-y-6">
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
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSlips && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSlips(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-dark-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Payroll Slips - {payPeriod}</h2>
                <button onClick={() => { setShowSlips(false); setSelectedSlip(null); }} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {selectedSlip ? (
                  <div className="bg-white text-black p-8 rounded-lg max-w-2xl mx-auto print:shadow-none" id="payroll-slip">
                    <div className="border-b-2 border-gray-300 pb-4 mb-6">
                      <h1 className="text-2xl font-bold text-center">{selectedSlip.company_name}</h1>
                      <p className="text-center text-gray-600">PAYROLL SLIP</p>
                      <p className="text-center text-sm text-gray-500">Pay Period: {selectedSlip.pay_period}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <p><strong>Employee:</strong> {selectedSlip.employee_name}</p>
                        <p><strong>Position:</strong> {selectedSlip.position}</p>
                        <p><strong>Department:</strong> {selectedSlip.department}</p>
                      </div>
                      <div className="text-right">
                        <p><strong>Pay Date:</strong> {selectedSlip.pay_date}</p>
                        <p><strong>Employee ID:</strong> {selectedSlip.employee_id}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <h3 className="font-bold border-b border-gray-300 pb-2 mb-2">EARNINGS</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Base Salary</span><span>${selectedSlip.earnings.base_salary.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Bonus</span><span>${selectedSlip.earnings.bonus.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Overtime</span><span>${selectedSlip.earnings.overtime.toLocaleString()}</span></div>
                          <div className="flex justify-between font-bold border-t border-gray-300 pt-2 mt-2">
                            <span>Gross Pay</span><span>${selectedSlip.earnings.gross_pay.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold border-b border-gray-300 pb-2 mb-2">DEDUCTIONS</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Federal Tax</span><span>-${selectedSlip.deductions.federal_tax.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>State Tax</span><span>-${selectedSlip.deductions.state_tax.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Social Security</span><span>-${selectedSlip.deductions.social_security.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Medicare</span><span>-${selectedSlip.deductions.medicare.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Health Insurance</span><span>-${selectedSlip.deductions.health_insurance.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>401(k)</span><span>-${selectedSlip.deductions.retirement_401k.toLocaleString()}</span></div>
                          <div className="flex justify-between font-bold border-t border-gray-300 pt-2 mt-2">
                            <span>Total Deductions</span><span>-${selectedSlip.deductions.total_deductions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-100 p-4 rounded-lg text-center mb-6">
                      <p className="text-sm text-gray-600">NET PAY</p>
                      <p className="text-3xl font-bold text-green-700">${selectedSlip.net_pay.toLocaleString()}</p>
                    </div>
                    
                    <div className="border-t border-gray-300 pt-4">
                      <h3 className="font-bold text-sm mb-2">YEAR-TO-DATE</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm text-center">
                        <div><p className="text-gray-500">Gross Earnings</p><p className="font-semibold">${selectedSlip.ytd.gross_earnings.toLocaleString()}</p></div>
                        <div><p className="text-gray-500">Deductions</p><p className="font-semibold">${selectedSlip.ytd.total_deductions.toLocaleString()}</p></div>
                        <div><p className="text-gray-500">Net Pay</p><p className="font-semibold">${selectedSlip.ytd.net_pay.toLocaleString()}</p></div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-center gap-4 print:hidden">
                      <button onClick={() => setSelectedSlip(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Back to List</button>
                      <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Printer className="w-4 h-4" />Print
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {payrollSlips.map((slip) => (
                      <div
                        key={slip.employee_id}
                        className="bg-dark-700 p-4 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                        onClick={() => setSelectedSlip(slip)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold">
                            {slip.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{slip.employee_name}</p>
                            <p className="text-gray-400 text-sm">{slip.position}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Gross Pay</span><span className="text-white">${slip.earnings.gross_pay.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Deductions</span><span className="text-red-400">-${slip.deductions.total_deductions.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm font-bold border-t border-dark-600 pt-2 mt-2">
                          <span className="text-gray-300">Net Pay</span><span className="text-green-400">${slip.net_pay.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payroll;
