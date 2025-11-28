import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Check,
  ChevronRight,
  Download,
  Trash2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import IndividualLayout from '../../components/layouts/IndividualLayout'
import toast from 'react-hot-toast'

interface SettingToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function SettingToggle({ label, description, enabled, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-sm text-gray-400">{description}</p>
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
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    budgetAlerts: true,
    goalReminders: true,
    securityAlerts: true,
    
    // Privacy
    shareAnalytics: false,
    showProfilePublic: false,
    twoFactorAuth: true,
    
    // Preferences
    darkMode: true,
    currency: 'INR',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    toast.success('Setting updated')
  }

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    toast.success('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleExportData = () => {
    toast.success('Preparing your data export...')
    setTimeout(() => {
      toast.success('Data export ready for download')
    }, 2000)
  }

  const settingSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
        { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get alerts on your device' },
        { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly financial summaries' },
        { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'Get notified when near budget limits' },
        { key: 'goalReminders', label: 'Goal Reminders', desc: 'Reminders about your financial goals' },
        { key: 'securityAlerts', label: 'Security Alerts', desc: 'Alerts for suspicious activities' },
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        { key: 'twoFactorAuth', label: 'Two-Factor Authentication', desc: 'Add extra security to your account' },
        { key: 'shareAnalytics', label: 'Share Analytics', desc: 'Help improve our AI with anonymized data' },
        { key: 'showProfilePublic', label: 'Public Profile', desc: 'Allow others to find your profile' },
      ]
    }
  ]

  return (
    <IndividualLayout
      title="Settings"
      description="Customize your CFOSync experience"
    >
      <div className="space-y-6">
        {/* Quick Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  {settings.darkMode ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                </div>
                <div>
                  <p className="text-white font-medium">Theme</p>
                  <p className="text-xs text-gray-400">{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('darkMode', !settings.darkMode)}
                className={`p-2 rounded-xl transition-colors ${settings.darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}
              >
                {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Currency</p>
                <p className="text-xs text-gray-400">Display currency</p>
              </div>
            </div>
            <select
              value={settings.currency}
              onChange={(e) => updateSetting('currency', e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="INR">₹ INR - Indian Rupee</option>
              <option value="USD">$ USD - US Dollar</option>
              <option value="EUR">€ EUR - Euro</option>
              <option value="GBP">£ GBP - British Pound</option>
            </select>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Language</p>
                <p className="text-xs text-gray-400">Interface language</p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="Telugu">తెలుగు (Telugu)</option>
            </select>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification & Privacy Settings */}
          {settingSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 3) }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
            >
              <div className="p-5 border-b border-dark-700/50">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-primary-400" />
                  {section.title}
                </h3>
              </div>
              <div className="p-5 divide-y divide-dark-700/50">
                {section.items.map(item => (
                  <SettingToggle
                    key={item.key}
                    label={item.label}
                    description={item.desc}
                    enabled={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(value) => updateSetting(item.key, value)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
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
              className="mt-4 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              Update Password
            </button>
          </div>
        </motion.div>

        {/* Data & Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
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
                  <p className="text-sm text-gray-400">Download all your financial data as CSV</p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl font-medium hover:bg-blue-500/20 transition-colors"
              >
                Export
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
              <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </motion.div>

        {/* Connected Apps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
        >
          <div className="p-5 border-b border-dark-700/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary-400" />
              Connected Services
            </h3>
          </div>
          <div className="divide-y divide-dark-700/50">
            {[
              { name: 'Google Account', status: 'Connected', icon: '🔗' },
              { name: 'Bank Sync (via Plaid)', status: 'Not Connected', icon: '🏦' },
              { name: 'Zerodha', status: 'Not Connected', icon: '📈' },
            ].map((service, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-dark-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{service.icon}</span>
                  <div>
                    <p className="text-white font-medium">{service.name}</p>
                    <p className={`text-sm ${service.status === 'Connected' ? 'text-green-400' : 'text-gray-400'}`}>
                      {service.status}
                    </p>
                  </div>
                </div>
                <button className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  service.status === 'Connected'
                    ? 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}>
                  {service.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
