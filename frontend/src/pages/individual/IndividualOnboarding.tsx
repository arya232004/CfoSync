import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  DollarSign,
  CreditCard,
  PiggyBank,
  Target,
  Upload,
  CheckCircle,
  Loader2,
  Home,
  Car,
  GraduationCap,
  Heart,
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Employment', icon: Briefcase },
  { id: 3, title: 'Income', icon: DollarSign },
  { id: 4, title: 'Expenses', icon: CreditCard },
  { id: 5, title: 'Debts', icon: AlertTriangle },
  { id: 6, title: 'Assets', icon: PiggyBank },
  { id: 7, title: 'Goals', icon: Target },
  { id: 8, title: 'Risk Profile', icon: Shield },
  { id: 9, title: 'Bank Statements', icon: Upload },
]

const employmentTypes = [
  'Full-time Employee',
  'Part-time Employee',
  'Self-employed',
  'Freelancer',
  'Business Owner',
  'Retired',
  'Student',
  'Unemployed'
]

const expenseCategories = [
  { name: 'Housing (Rent/Mortgage)', key: 'housing', icon: Home },
  { name: 'Utilities', key: 'utilities', icon: DollarSign },
  { name: 'Transportation', key: 'transportation', icon: Car },
  { name: 'Groceries & Food', key: 'food', icon: DollarSign },
  { name: 'Healthcare', key: 'healthcare', icon: Heart },
  { name: 'Insurance', key: 'insurance', icon: Shield },
  { name: 'Education', key: 'education', icon: GraduationCap },
  { name: 'Entertainment', key: 'entertainment', icon: DollarSign },
  { name: 'Personal Care', key: 'personal', icon: User },
  { name: 'Other', key: 'other', icon: DollarSign },
]

const debtTypes = [
  { name: 'Mortgage', key: 'mortgage' },
  { name: 'Car Loan', key: 'car_loan' },
  { name: 'Student Loan', key: 'student_loan' },
  { name: 'Credit Card', key: 'credit_card' },
  { name: 'Personal Loan', key: 'personal_loan' },
  { name: 'Medical Debt', key: 'medical' },
  { name: 'Other Debt', key: 'other' },
]

const assetTypes = [
  { name: 'Cash & Savings', key: 'cash' },
  { name: 'Checking Account', key: 'checking' },
  { name: 'Investment Accounts', key: 'investments' },
  { name: 'Retirement Accounts (401k, IRA)', key: 'retirement' },
  { name: 'Real Estate', key: 'real_estate' },
  { name: 'Vehicle Value', key: 'vehicles' },
  { name: 'Cryptocurrency', key: 'crypto' },
  { name: 'Other Assets', key: 'other' },
]

const goalTypes = [
  { name: 'Emergency Fund', icon: Shield, color: 'from-blue-500 to-cyan-500' },
  { name: 'Pay Off Debt', icon: CreditCard, color: 'from-red-500 to-orange-500' },
  { name: 'Buy a Home', icon: Home, color: 'from-green-500 to-emerald-500' },
  { name: 'Save for Retirement', icon: PiggyBank, color: 'from-purple-500 to-pink-500' },
  { name: 'Buy a Car', icon: Car, color: 'from-yellow-500 to-amber-500' },
  { name: 'Travel/Vacation', icon: Target, color: 'from-cyan-500 to-blue-500' },
  { name: 'Education Fund', icon: GraduationCap, color: 'from-indigo-500 to-purple-500' },
  { name: 'Start a Business', icon: Briefcase, color: 'from-orange-500 to-red-500' },
  { name: 'Wedding Fund', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { name: 'Invest More', icon: TrendingUp, color: 'from-teal-500 to-green-500' },
]

const riskProfiles = [
  { 
    name: 'Conservative',
    description: 'Prioritize capital preservation. Prefer low-risk investments like bonds and savings.',
    icon: Shield,
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    name: 'Moderate',
    description: 'Balance growth and security. Mix of stocks and bonds.',
    icon: Target,
    color: 'from-green-500 to-emerald-500'
  },
  { 
    name: 'Aggressive',
    description: 'Maximize growth potential. Higher risk tolerance for potentially higher returns.',
    icon: TrendingUp,
    color: 'from-orange-500 to-red-500'
  },
]

interface OnboardingData {
  // Personal Info
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string
  city: string
  state: string
  
  // Employment
  employmentType: string
  employer: string
  jobTitle: string
  yearsAtJob: string
  
  // Income
  monthlyIncome: string
  additionalIncome: string
  incomeFrequency: string
  
  // Expenses
  expenses: Record<string, string>
  
  // Debts
  debts: Array<{ type: string; balance: string; interestRate: string; monthlyPayment: string }>
  
  // Assets
  assets: Record<string, string>
  
  // Goals
  selectedGoals: Array<{ name: string; targetAmount: string; targetDate: string; priority: string }>
  
  // Risk Profile
  riskProfile: string
  investmentExperience: string
  investmentTimeframe: string
  
  // Bank Statements
  statements: File[]
}

export default function IndividualOnboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [data, setData] = useState<OnboardingData>({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    dateOfBirth: '',
    phone: '',
    city: '',
    state: '',
    employmentType: '',
    employer: '',
    jobTitle: '',
    yearsAtJob: '',
    monthlyIncome: '',
    additionalIncome: '',
    incomeFrequency: 'monthly',
    expenses: {},
    debts: [],
    assets: {},
    selectedGoals: [],
    riskProfile: '',
    investmentExperience: '',
    investmentTimeframe: '',
    statements: [],
  })

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Parse CSV file content to extract real transactions
  const parseCSVFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.trim().split('\n')
          const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
          
          const transactions: any[] = []
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            if (values.length < 3) continue
            
            // Find column indices (flexible for different CSV formats)
            const dateIdx = headers.findIndex(h => h.includes('date'))
            const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('merchant') || h.includes('name'))
            const amountIdx = headers.findIndex(h => h.includes('amount'))
            const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type'))
            
            // Default indices if not found
            const date = dateIdx >= 0 ? values[dateIdx] : values[0]
            const description = descIdx >= 0 ? values[descIdx] : values[1]
            const amountStr = amountIdx >= 0 ? values[amountIdx] : values[3] || values[2]
            const categoryRaw = categoryIdx >= 0 ? values[categoryIdx] : ''
            
            // Parse amount - handle various formats
            const amount = parseFloat(amountStr?.replace(/[$,]/g, '') || '0')
            if (isNaN(amount) || amount === 0) continue
            
            // Skip opening balance or header-like rows
            if (description?.toLowerCase().includes('opening balance')) continue
            if (description?.toLowerCase().includes('closing balance')) continue
            
            // Determine if income or expense and categorize
            const isIncome = amount > 0 || description?.toLowerCase().includes('deposit') || 
                            description?.toLowerCase().includes('income') || 
                            description?.toLowerCase().includes('salary') ||
                            description?.toLowerCase().includes('refund')
            
            // Auto-categorize based on description if no category provided
            let category = categoryRaw || categorizeTransaction(description)
            
            transactions.push({
              date: formatDateString(date),
              description: description || 'Unknown',
              amount: amount,
              type: isIncome ? 'income' : 'expense',
              category: category || (isIncome ? 'Income' : 'Other'),
              source: file.name
            })
          }
          
          resolve(transactions)
        } catch (err) {
          console.error('Error parsing CSV:', err)
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // Helper to format date strings
  const formatDateString = (dateStr: string): string => {
    try {
      // Handle various date formats
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
      // Try MM/DD/YYYY format
      const parts = dateStr.split(/[\/\-]/)
      if (parts.length === 3) {
        const [a, b, c] = parts
        // Try different interpretations
        if (parseInt(a) > 12) {
          // YYYY-MM-DD
          return new Date(parseInt(a), parseInt(b) - 1, parseInt(c)).toISOString()
        } else {
          // MM/DD/YYYY or MM-DD-YYYY
          return new Date(parseInt(c), parseInt(a) - 1, parseInt(b)).toISOString()
        }
      }
      return new Date().toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  // Auto-categorize transaction based on description
  const categorizeTransaction = (description: string): string => {
    const desc = description?.toLowerCase() || ''
    
    // Income patterns
    if (desc.includes('deposit') || desc.includes('payroll') || desc.includes('salary') || 
        desc.includes('direct dep') || desc.includes('income')) {
      return 'Income'
    }
    
    // Housing
    if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('apartment') ||
        desc.includes('housing') || desc.includes('hoa')) {
      return 'Housing'
    }
    
    // Groceries
    if (desc.includes('whole foods') || desc.includes('trader joe') || desc.includes('costco') ||
        desc.includes('grocery') || desc.includes('safeway') || desc.includes('kroger') ||
        desc.includes('aldi') || desc.includes('wegmans') || desc.includes('publix')) {
      return 'Groceries'
    }
    
    // Dining
    if (desc.includes('starbucks') || desc.includes('mcdonald') || desc.includes('chipotle') ||
        desc.includes('restaurant') || desc.includes('doordash') || desc.includes('uber eats') ||
        desc.includes('grubhub') || desc.includes('dining') || desc.includes('cafe') ||
        desc.includes('coffee') || desc.includes('pizza')) {
      return 'Dining'
    }
    
    // Transportation
    if (desc.includes('uber') || desc.includes('lyft') || desc.includes('gas') ||
        desc.includes('shell') || desc.includes('chevron') || desc.includes('exxon') ||
        desc.includes('parking') || desc.includes('metro') || desc.includes('transit') ||
        desc.includes('car') || desc.includes('auto')) {
      return 'Transportation'
    }
    
    // Utilities
    if (desc.includes('electric') || desc.includes('water') || desc.includes('gas bill') ||
        desc.includes('utility') || desc.includes('comcast') || desc.includes('verizon') ||
        desc.includes('at&t') || desc.includes('internet') || desc.includes('phone bill')) {
      return 'Utilities'
    }
    
    // Entertainment
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') ||
        desc.includes('disney') || desc.includes('amazon prime') || desc.includes('hbo') ||
        desc.includes('theater') || desc.includes('movie') || desc.includes('concert') ||
        desc.includes('game') || desc.includes('entertainment')) {
      return 'Entertainment'
    }
    
    // Shopping
    if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') ||
        desc.includes('best buy') || desc.includes('nike') || desc.includes('apple store') ||
        desc.includes('shopping') || desc.includes('purchase')) {
      return 'Shopping'
    }
    
    // Health
    if (desc.includes('pharmacy') || desc.includes('cvs') || desc.includes('walgreens') ||
        desc.includes('doctor') || desc.includes('medical') || desc.includes('dental') ||
        desc.includes('health') || desc.includes('gym') || desc.includes('fitness')) {
      return 'Health'
    }
    
    // Insurance
    if (desc.includes('insurance') || desc.includes('geico') || desc.includes('state farm') ||
        desc.includes('allstate') || desc.includes('progressive')) {
      return 'Insurance'
    }
    
    // Transfer
    if (desc.includes('transfer') || desc.includes('zelle') || desc.includes('venmo') ||
        desc.includes('paypal') || desc.includes('wire')) {
      return 'Transfer'
    }
    
    return 'Other'
  }

  // Define transaction type
  interface ParsedTransaction {
    date: string
    description: string
    amount: number
    type: 'income' | 'expense'
    category: string
    source: string
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const STORAGE_KEY = 'cfosync_uploaded_statements'
      const existingData = localStorage.getItem(STORAGE_KEY)
      const existingHistory = existingData ? JSON.parse(existingData) : []
      
      // Process uploaded statements
      if (data.statements.length > 0) {
        const newStatements = []
        
        for (let index = 0; index < data.statements.length; index++) {
          const file = data.statements[index]
          
          // Parse actual CSV content instead of generating mock data
          let parsedTransactions: ParsedTransaction[] = []
          try {
            parsedTransactions = await parseCSVFile(file) as ParsedTransaction[]
            console.log(`Parsed ${parsedTransactions.length} transactions from ${file.name}`)
          } catch (err) {
            console.error(`Failed to parse ${file.name}:`, err)
            // If parsing fails, create empty array
            parsedTransactions = []
          }
          
          // Calculate totals from actual parsed data
          const totalIncome = parsedTransactions
            .filter((t: ParsedTransaction) => t.type === 'income')
            .reduce((sum: number, t: ParsedTransaction) => sum + Math.abs(t.amount), 0)
          const totalExpenses = parsedTransactions
            .filter((t: ParsedTransaction) => t.type === 'expense')
            .reduce((sum: number, t: ParsedTransaction) => sum + Math.abs(t.amount), 0)
          const categories: string[] = [...new Set(parsedTransactions.map((t: ParsedTransaction) => t.category))]
          
          // Determine date range from transactions
          let dateRange = 'No transactions'
          if (parsedTransactions.length > 0) {
            const dates = parsedTransactions.map((t: ParsedTransaction) => new Date(t.date).getTime())
            const minDate = new Date(Math.min(...dates))
            const maxDate = new Date(Math.max(...dates))
            dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
          }
          
          const statementData = {
            id: `onboarding-${Date.now()}-${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'completed',
            progress: 100,
            uploadedAt: new Date().toISOString(),
            extractedData: {
              transactions: parsedTransactions.length,
              dateRange,
              totalIncome,
              totalExpenses,
              categories
            }
          }
          
          newStatements.push(statementData)
          
          // Try to save to Firebase (async, don't wait)
          try {
            const { statementsAPI } = await import('../../services/aiService')
            await statementsAPI.uploadStatement({
              name: file.name,
              size: file.size,
              file_type: file.type,
              extracted_data: statementData.extractedData,
              transactions: parsedTransactions
            })
            console.log(`Statement ${file.name} saved to Firebase with ${parsedTransactions.length} real transactions`)
          } catch (error) {
            console.error('Failed to save to Firebase:', error)
            // Continue anyway, data is saved to localStorage
          }
        }
        
        // Save to localStorage
        const updatedHistory = [...newStatements, ...existingHistory].slice(0, 20)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
      }
      
      // Navigate to dashboard
      await new Promise(resolve => setTimeout(resolve, 1000))
      navigate('/individual/dashboard')
    } catch (error) {
      console.error('Error submitting onboarding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addDebt = () => {
    setData(prev => ({
      ...prev,
      debts: [...prev.debts, { type: '', balance: '', interestRate: '', monthlyPayment: '' }]
    }))
  }

  const updateDebt = (index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      debts: prev.debts.map((debt, i) => i === index ? { ...debt, [field]: value } : debt)
    }))
  }

  const removeDebt = (index: number) => {
    setData(prev => ({
      ...prev,
      debts: prev.debts.filter((_, i) => i !== index)
    }))
  }

  const toggleGoal = (goalName: string) => {
    setData(prev => {
      const exists = prev.selectedGoals.find(g => g.name === goalName)
      if (exists) {
        return {
          ...prev,
          selectedGoals: prev.selectedGoals.filter(g => g.name !== goalName)
        }
      }
      return {
        ...prev,
        selectedGoals: [...prev.selectedGoals, { name: goalName, targetAmount: '', targetDate: '', priority: 'medium' }]
      }
    })
  }

  const updateGoal = (goalName: string, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      selectedGoals: prev.selectedGoals.map(g => 
        g.name === goalName ? { ...g, [field]: value } : g
      )
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setData(prev => ({
        ...prev,
        statements: [...prev.statements, ...Array.from(e.target.files || [])]
      }))
    }
  }

  const removeFile = (index: number) => {
    setData(prev => ({
      ...prev,
      statements: prev.statements.filter((_, i) => i !== index)
    }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Personal Information</h2>
              <p className="text-gray-400">Let's start with some basic information about you.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={data.firstName}
                  onChange={(e) => updateData('firstName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={data.lastName}
                  onChange={(e) => updateData('lastName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={(e) => updateData('dateOfBirth', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateData('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State/Province</label>
                <input
                  type="text"
                  value={data.state}
                  onChange={(e) => updateData('state', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="California"
                />
              </div>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Employment Details</h2>
              <p className="text-gray-400">Tell us about your current employment situation.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Employment Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {employmentTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateData('employmentType', type)}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      data.employmentType === type
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-white/10 bg-dark-800 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            {['Full-time Employee', 'Part-time Employee', 'Self-employed', 'Freelancer', 'Business Owner'].includes(data.employmentType) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {data.employmentType === 'Self-employed' || data.employmentType === 'Business Owner' 
                        ? 'Business Name' 
                        : 'Employer Name'}
                    </label>
                    <input
                      type="text"
                      value={data.employer}
                      onChange={(e) => updateData('employer', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                      placeholder="Company Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Job Title / Role</label>
                    <input
                      type="text"
                      value={data.jobTitle}
                      onChange={(e) => updateData('jobTitle', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                      placeholder="Software Engineer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Years at Current Position</label>
                  <input
                    type="number"
                    value={data.yearsAtJob}
                    onChange={(e) => updateData('yearsAtJob', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="3"
                  />
                </div>
              </>
            )}
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Income Information</h2>
              <p className="text-gray-400">Help us understand your income sources.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Monthly Income (After Tax)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={data.monthlyIncome}
                    onChange={(e) => updateData('monthlyIncome', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="5,000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Additional Monthly Income</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={data.additionalIncome}
                    onChange={(e) => updateData('additionalIncome', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="500"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Side jobs, investments, rental income, etc.</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">How often are you paid?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Weekly', 'Bi-weekly', 'Semi-monthly', 'Monthly'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => updateData('incomeFrequency', freq.toLowerCase())}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      data.incomeFrequency === freq.toLowerCase()
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-white/10 bg-dark-800 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-primary-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Estimated Total Monthly Income</p>
                  <p className="text-2xl font-bold text-primary-400 mt-1">
                    ${((Number(data.monthlyIncome) || 0) + (Number(data.additionalIncome) || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Monthly Expenses</h2>
              <p className="text-gray-400">Enter your average monthly expenses by category.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expenseCategories.map((category) => (
                <div key={category.key}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <category.icon className="w-4 h-4" />
                    {category.name}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={data.expenses[category.key] || ''}
                      onChange={(e) => updateData('expenses', { ...data.expenses, [category.key]: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Total Monthly Expenses</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    ${Object.values(data.expenses).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Current Debts</h2>
              <p className="text-gray-400">List all your outstanding debts. This helps us create a debt payoff strategy.</p>
            </div>
            
            {data.debts.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No debts added yet</p>
                <button
                  onClick={addDebt}
                  className="mt-4 btn-primary px-6 py-2"
                >
                  Add Debt
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.debts.map((debt, index) => (
                  <div key={index} className="p-4 rounded-xl bg-dark-800 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Debt #{index + 1}</span>
                      <button
                        onClick={() => removeDebt(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Debt Type</label>
                        <select
                          value={debt.type}
                          onChange={(e) => updateDebt(index, 'type', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                        >
                          <option value="">Select type...</option>
                          {debtTypes.map(t => (
                            <option key={t.key} value={t.key}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Current Balance</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            value={debt.balance}
                            onChange={(e) => updateDebt(index, 'balance', e.target.value)}
                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                            placeholder="10,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Interest Rate</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={debt.interestRate}
                            onChange={(e) => updateDebt(index, 'interestRate', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors pr-8"
                            placeholder="5.5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Payment</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            value={debt.monthlyPayment}
                            onChange={(e) => updateDebt(index, 'monthlyPayment', e.target.value)}
                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                            placeholder="350"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addDebt}
                  className="w-full p-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:border-white/40 hover:text-white transition-all"
                >
                  + Add Another Debt
                </button>
              </div>
            )}
            
            {data.debts.length > 0 && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Total Debt</p>
                    <p className="text-2xl font-bold text-orange-400 mt-1">
                      ${data.debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Monthly payments: ${data.debts.reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Assets & Savings</h2>
              <p className="text-gray-400">Tell us about your current assets and savings.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assetTypes.map((asset) => (
                <div key={asset.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{asset.name}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={data.assets[asset.key] || ''}
                      onChange={(e) => updateData('assets', { ...data.assets, [asset.key]: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-3">
                <PiggyBank className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Total Assets</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    ${Object.values(data.assets).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Net Worth: ${(
                      Object.values(data.assets).reduce((sum, val) => sum + (Number(val) || 0), 0) -
                      data.debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Financial Goals</h2>
              <p className="text-gray-400">Select the goals that matter most to you.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {goalTypes.map((goal) => {
                const isSelected = data.selectedGoals.some(g => g.name === goal.name)
                return (
                  <button
                    key={goal.name}
                    onClick={() => toggleGoal(goal.name)}
                    className={`p-4 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-white/10 bg-dark-800 hover:border-white/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${goal.color}`}>
                      <goal.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {goal.name}
                    </span>
                  </button>
                )
              })}
            </div>
            
            {data.selectedGoals.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-white">Configure Your Goals</h3>
                {data.selectedGoals.map((goal) => (
                  <div key={goal.name} className="p-4 rounded-xl bg-dark-800 border border-white/10 space-y-4">
                    <p className="text-white font-medium">{goal.name}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Amount</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            value={goal.targetAmount}
                            onChange={(e) => updateGoal(goal.name, 'targetAmount', e.target.value)}
                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                            placeholder="10,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Date</label>
                        <input
                          type="date"
                          value={goal.targetDate}
                          onChange={(e) => updateGoal(goal.name, 'targetDate', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                        <select
                          value={goal.priority}
                          onChange={(e) => updateGoal(goal.name, 'priority', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      
      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Risk Profile</h2>
              <p className="text-gray-400">Help us understand your investment preferences.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">What's your risk tolerance?</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {riskProfiles.map((profile) => (
                  <button
                    key={profile.name}
                    onClick={() => updateData('riskProfile', profile.name.toLowerCase())}
                    className={`p-6 rounded-xl border text-left transition-all ${
                      data.riskProfile === profile.name.toLowerCase()
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-white/10 bg-dark-800 hover:border-white/30'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${profile.color}`}>
                      <profile.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-white font-medium mb-2">{profile.name}</h4>
                    <p className="text-gray-400 text-sm">{profile.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Experience</label>
                <select
                  value={data.investmentExperience}
                  onChange={(e) => updateData('investmentExperience', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                >
                  <option value="">Select...</option>
                  <option value="none">No experience</option>
                  <option value="beginner">Beginner (1-2 years)</option>
                  <option value="intermediate">Intermediate (3-5 years)</option>
                  <option value="experienced">Experienced (5+ years)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Time Horizon</label>
                <select
                  value={data.investmentTimeframe}
                  onChange={(e) => updateData('investmentTimeframe', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                >
                  <option value="">Select...</option>
                  <option value="short">Short-term (1-3 years)</option>
                  <option value="medium">Medium-term (3-7 years)</option>
                  <option value="long">Long-term (7+ years)</option>
                </select>
              </div>
            </div>
          </div>
        )
      
      case 9:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Bank Statements</h2>
              <p className="text-gray-400">
                Upload 3-6 months of bank statements for AI-powered spending analysis.
                This helps us provide personalized insights.
              </p>
            </div>
            
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Drop files here or click to upload</p>
                <p className="text-gray-500 text-sm">Supports PDF, CSV, XLSX (Max 10MB each)</p>
              </label>
            </div>
            
            {data.statements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Uploaded Files ({data.statements.length})</h4>
                {data.statements.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-dark-800 border border-white/10">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary-400" />
                      <div>
                        <p className="text-white text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Your data is secure</p>
                  <p className="text-gray-400 text-sm mt-1">
                    We use bank-level encryption. Your statements are analyzed locally and never shared.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                CFOSync
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              Step {currentStep} of {steps.length}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-dark-900/50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 flex-shrink-0 ${
                    index < steps.length - 1 ? 'flex-1' : ''
                  }`}
                >
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                      ${isCompleted ? 'bg-green-500 cursor-pointer' : ''}
                      ${isCurrent ? 'bg-primary-500' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-dark-700 cursor-not-allowed' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <step.icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 rounded-full ${
                      isCompleted ? 'bg-green-500' : 'bg-dark-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
              currentStep === 1
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary px-8 py-3 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Completing Setup...
                </>
              ) : (
                <>
                  Complete Setup
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn-primary px-8 py-3 flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
