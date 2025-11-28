import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  TrendingUp,
  Shield,
  Camera,
  Edit3,
  CheckCircle2,
  Loader2,
  Award,
  Target,
  PieChart,
  Wallet
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import IndividualLayout from '../../components/layouts/IndividualLayout'
import toast from 'react-hot-toast'
import { useStatementsStore } from '../../lib/store'
import { statementsAPI } from '../../services/aiService'

export default function Profile() {
  const { user } = useAuthStore()
  const { getTotalIncome, getTotalExpenses } = useStatementsStore()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    occupation: '',
    company: '',
    joinedDate: 'November 2025',
    financialScore: 0,
    riskProfile: 'Unknown',
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    netWorth: 0,
    totalInvestments: 0,
    emergencyFund: 0,
    goals: 0,
    goalsCompleted: 0,
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // First, load from Firebase
        const { addStatement, addTransactions } = useStatementsStore.getState()
        try {
          const statementsResponse = await statementsAPI.getStatements()
          if (statementsResponse.statements.length > 0) {
            statementsResponse.statements.forEach((stmt: any) => {
              addStatement({
                id: stmt.id,
                name: stmt.name,
                size: stmt.size,
                type: stmt.file_type,
                status: 'completed',
                progress: 100,
                uploadedAt: stmt.uploaded_at,
                extractedData: stmt.extracted_data
              })
            })
          }
          
          const transactionsResponse = await statementsAPI.getTransactions(500)
          if (transactionsResponse.transactions.length > 0) {
            addTransactions(transactionsResponse.transactions.map((t: any) => ({
              id: t.id,
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type as 'income' | 'expense',
              category: t.category,
              source: t.source
            })))
          }
        } catch (e) {
          console.log('No Firebase data yet')
        }
        
        // Get summary from API
        const summary = await statementsAPI.getFinancialSummary()
        
        const totalIncome = summary.total_income || getTotalIncome()
        const totalExpenses = summary.total_expenses || getTotalExpenses()
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
        
        // Calculate financial score based on real data
        let financialScore = 50
        if (savingsRate > 30) financialScore += 25
        else if (savingsRate > 20) financialScore += 15
        else if (savingsRate > 10) financialScore += 5
        if (totalIncome - totalExpenses > 0) financialScore += 15
        if (summary.transactions_count > 10) financialScore += 10
        
        setProfileData(prev => ({
          ...prev,
          name: user?.name || 'User',
          email: user?.email || 'user@example.com',
          monthlyIncome: totalIncome,
          monthlyExpenses: totalExpenses,
          savingsRate: savingsRate,
          netWorth: totalIncome - totalExpenses,
          financialScore: Math.min(100, financialScore),
          riskProfile: savingsRate > 25 ? 'Low Risk' : savingsRate > 10 ? 'Moderate' : 'High Risk',
        }))
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, getTotalIncome, getTotalExpenses])

  const [editForm, setEditForm] = useState({ ...profileData })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setProfileData(editForm)
    setIsEditing(false)
    setSaving(false)
    toast.success('Profile updated successfully!')
  }

  if (loading) {
    return (
      <IndividualLayout title="Profile" description="Your personal information">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      </IndividualLayout>
    )
  }

  return (
    <IndividualLayout
      title="Profile"
      description="Manage your personal and financial information"
      headerActions={
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={saving}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isEditing ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Edit3 className="w-4 h-4" />
          )}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      }
    >
      <div className="space-y-6">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-4xl font-bold">
                {profileData.name.charAt(0)}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl text-primary-600 hover:bg-primary-50 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{profileData.name}</h2>
              <p className="text-primary-200 mb-3">{profileData.occupation} at {profileData.company}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-primary-200">
                  <Mail className="w-4 h-4" />
                  <span>{profileData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-primary-200">
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.location}</span>
                </div>
                <div className="flex items-center gap-2 text-primary-200">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {profileData.joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Financial Score */}
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(profileData.financialScore / 100) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{profileData.financialScore}</span>
                </div>
              </div>
              <p className="text-sm text-primary-200">Financial Score</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
          >
            <div className="p-5 border-b border-dark-700/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Personal Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.location}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Occupation</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.occupation}
                      onChange={e => setEditForm({ ...editForm, occupation: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.occupation}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.company}
                      onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.company}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Risk Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
          >
            <div className="p-5 border-b border-dark-700/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-400" />
                Risk Profile
              </h3>
            </div>
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Shield className="w-10 h-10 text-yellow-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-1">{profileData.riskProfile}</h4>
              <p className="text-sm text-gray-400 mb-4">Risk Tolerance Level</p>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Conservative</span>
                  <span className="text-gray-400">Aggressive</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-green-500 via-yellow-500 to-yellow-500 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Financial Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
        >
          <div className="p-5 border-b border-dark-700/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-400" />
              Financial Overview
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-dark-900/50 rounded-xl">
                <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">₹{(profileData.monthlyIncome / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-400">Monthly Income</p>
              </div>
              <div className="text-center p-4 bg-dark-900/50 rounded-xl">
                <TrendingUp className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">₹{(profileData.monthlyExpenses / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-400">Monthly Expenses</p>
              </div>
              <div className="text-center p-4 bg-dark-900/50 rounded-xl">
                <PieChart className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profileData.savingsRate}%</p>
                <p className="text-sm text-gray-400">Savings Rate</p>
              </div>
              <div className="text-center p-4 bg-dark-900/50 rounded-xl">
                <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">₹{(profileData.netWorth / 100000).toFixed(1)}L</p>
                <p className="text-sm text-gray-400">Net Worth</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-dark-900/50 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">₹{(profileData.totalInvestments / 100000).toFixed(1)}L</p>
                  <p className="text-sm text-gray-400">Total Investments</p>
                </div>
              </div>
              <div className="p-4 bg-dark-900/50 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">₹{(profileData.emergencyFund / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-gray-400">Emergency Fund</p>
                </div>
              </div>
              <div className="p-4 bg-dark-900/50 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{profileData.goalsCompleted}/{profileData.goals}</p>
                  <p className="text-sm text-gray-400">Goals Completed</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
