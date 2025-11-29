import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Download,
  Trash2,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle,
  Calendar,
  TrendingUp,
  Target
} from 'lucide-react'
import IndividualLayout from '../../components/layouts/IndividualLayout'
import { useAuthStore } from '../../lib/auth'
import { useSettingsStore, applyTheme, formatCurrency } from '../../lib/store'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

interface SettingToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  icon?: React.ReactNode
}

function SettingToggle({ label, description, enabled, onChange, icon }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-gray-400">{icon}</div>}
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-dark-600'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuthStore()
  const { 
    theme, 
    currency, 
    notifications,
    setTheme, 
    setCurrency,
    updateNotifications 
  } = useSettingsStore()

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // Apply theme on change
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('cfosync-theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    setChangingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to change password'
      toast.error(message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    toast.loading('Preparing your data export...', { id: 'export' })
    
    try {
      // Fetch all user data
      const [dashboardRes, goalsRes, portfolioRes] = await Promise.allSettled([
        api.get('/api/agents/dashboard'),
        api.get('/api/agents/goals'),
        api.get('/api/agents/investments/portfolio')
      ])

      const dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value.data : null
      const goals = goalsRes.status === 'fulfilled' ? goalsRes.value.data : null
      const portfolio = portfolioRes.status === 'fulfilled' ? portfolioRes.value.data : null

      // Create PDF
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPos = 20

      // Helper function to add text with word wrap
      const addText = (text: string, x: number, y: number, maxWidth: number = pageWidth - 40) => {
        const lines = pdf.splitTextToSize(text, maxWidth)
        pdf.text(lines, x, y)
        return y + (lines.length * 7)
      }

      // Title
      pdf.setFontSize(24)
      pdf.setTextColor(99, 102, 241) // Primary color
      pdf.text('CFOSync Financial Report', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15

      // User info
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Generated for: ${user?.name || user?.email}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8
      pdf.text(`Currency: ${currency}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 20

      // Financial Summary
      if (dashboard?.data) {
        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text('Financial Summary', 20, yPos)
        yPos += 12

        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        
        const data = dashboard.data
        const summaryItems = [
          `Total Income: ${formatCurrency(data.total_income || 0, currency)}`,
          `Total Expenses: ${formatCurrency(data.total_expenses || 0, currency)}`,
          `Net Savings: ${formatCurrency(data.net_savings || 0, currency)}`,
          `Savings Rate: ${data.savings_rate || 0}%`,
        ]
        
        summaryItems.forEach(item => {
          pdf.text(item, 25, yPos)
          yPos += 8
        })
        yPos += 10
      }

      // Spending by Category
      if (dashboard?.data?.categories && Object.keys(dashboard.data.categories).length > 0) {
        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text('Spending by Category', 20, yPos)
        yPos += 12

        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        
        const categories = Object.entries(dashboard.data.categories)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 8)
        
        categories.forEach(([category, amount]) => {
          pdf.text(`${category}: ${formatCurrency(amount as number, currency)}`, 25, yPos)
          yPos += 8
        })
        yPos += 10
      }

      // Check if need new page
      if (yPos > 250) {
        pdf.addPage()
        yPos = 20
      }

      // Goals
      if (goals?.goals && goals.goals.length > 0) {
        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text('Financial Goals', 20, yPos)
        yPos += 12

        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        
        goals.goals.slice(0, 5).forEach((goal: any) => {
          const progress = goal.target_amount > 0 
            ? Math.round((goal.current_amount / goal.target_amount) * 100) 
            : 0
          pdf.text(`${goal.name}: ${formatCurrency(goal.current_amount, currency)} / ${formatCurrency(goal.target_amount, currency)} (${progress}%)`, 25, yPos)
          yPos += 8
        })
        yPos += 10
      }

      // Investments
      if (portfolio?.portfolio?.holdings && portfolio.portfolio.holdings.length > 0) {
        if (yPos > 220) {
          pdf.addPage()
          yPos = 20
        }

        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text('Investment Portfolio', 20, yPos)
        yPos += 12

        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        
        const p = portfolio.portfolio
        pdf.text(`Total Value: ${formatCurrency(p.totalValue || 0, currency)}`, 25, yPos)
        yPos += 8
        pdf.text(`Total Cost: ${formatCurrency(p.totalCost || 0, currency)}`, 25, yPos)
        yPos += 8
        pdf.text(`Total Gain/Loss: ${formatCurrency(p.totalGainLoss || 0, currency)} (${p.totalGainLossPercent?.toFixed(2) || 0}%)`, 25, yPos)
        yPos += 12
        
        pdf.text('Holdings:', 25, yPos)
        yPos += 8
        
        p.holdings.slice(0, 10).forEach((h: any) => {
          pdf.text(`  ${h.symbol}: ${h.shares} shares @ ${formatCurrency(h.purchase_price, currency)}`, 25, yPos)
          yPos += 7
        })
        yPos += 10
      }

      // AI Insights
      if (dashboard?.insights && dashboard.insights.length > 0) {
        if (yPos > 200) {
          pdf.addPage()
          yPos = 20
        }

        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text('AI Insights', 20, yPos)
        yPos += 12

        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        
        dashboard.insights.slice(0, 5).forEach((insight: any) => {
          yPos = addText(`- ${insight.title}: ${insight.message}`, 25, yPos, pageWidth - 50)
          yPos += 3
        })
      }

      // Footer
      pdf.setFontSize(9)
      pdf.setTextColor(150, 150, 150)
      pdf.text('Generated by CFOSync - AI CFO + Financial Planner', pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' })

      // Download
      pdf.save(`CFOSync_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      
      toast.success('Report downloaded successfully!', { id: 'export' })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data', { id: 'export' })
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your financial data. Type "DELETE" to confirm.')) {
        toast.error('Account deletion is not yet implemented. Please contact support.')
      }
    }
  }

  return (
    <IndividualLayout
      title="Settings"
      description="Customize your CFOSync experience"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Theme & Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-yellow-500/10'}`}>
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                </div>
                <div>
                  <p className="text-white font-medium">Theme</p>
                  <p className="text-xs text-gray-400">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark' 
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                    : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                }`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Currency</p>
                <p className="text-xs text-gray-400">Display currency across app</p>
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="USD">$ USD - US Dollar</option>
              <option value="EUR">€ EUR - Euro</option>
              <option value="GBP">£ GBP - British Pound</option>
              <option value="INR">₹ INR - Indian Rupee</option>
            </select>
          </motion.div>
        </div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-dark-700/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-400" />
              Email Notifications
            </h3>
            <p className="text-sm text-gray-400 mt-1">Choose which emails you'd like to receive</p>
          </div>
          <div className="p-5 divide-y divide-dark-700/50">
            <SettingToggle
              label="Monthly Statement Reminder"
              description="Get a reminder to upload your bank statement at the start of each month"
              enabled={notifications.monthlyStatementReminder}
              onChange={(value) => updateNotifications({ monthlyStatementReminder: value })}
              icon={<Calendar className="w-5 h-5" />}
            />
            <SettingToggle
              label="Weekly Investment Reports"
              description="Receive weekly updates on your stocks and investment performance"
              enabled={notifications.weeklyInvestmentReports}
              onChange={(value) => updateNotifications({ weeklyInvestmentReports: value })}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <SettingToggle
              label="Goal Progress Alerts"
              description="Get notified when you're close to achieving a goal or falling behind"
              enabled={notifications.goalReminders}
              onChange={(value) => updateNotifications({ goalReminders: value })}
              icon={<Target className="w-5 h-5" />}
            />
            <SettingToggle
              label="Budget Alerts"
              description="Alerts when you're approaching or exceeding budget limits"
              enabled={notifications.budgetAlerts}
              onChange={(value) => updateNotifications({ budgetAlerts: value })}
              icon={<FileText className="w-5 h-5" />}
            />
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-dark-700/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-400" />
              Change Password
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword}
              className="mt-4 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Data & Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-dark-700/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary-400" />
              Data & Account
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Export Your Data</p>
                  <p className="text-sm text-gray-400">Download all your financial data and insights as PDF</p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                disabled={exportingData}
                className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exportingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Delete Account</p>
                  <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
                </div>
              </div>
              <button 
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
