import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  DollarSign,
  Globe,
  Calendar,
  Upload,
  CheckCircle,
  Loader2,
  Shield,
  FileText,
  Briefcase,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const steps = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Business Details', icon: Briefcase },
  { id: 3, title: 'Financials', icon: DollarSign },
  { id: 4, title: 'Documents', icon: Upload },
]

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Consulting',
  'Education',
  'Food & Beverage',
  'Transportation',
  'Energy',
  'Entertainment',
  'Other'
]

const companySizes = [
  { label: '1-10', value: '1-10', description: 'Startup / Small Team' },
  { label: '11-50', value: '11-50', description: 'Small Business' },
  { label: '51-200', value: '51-200', description: 'Medium Business' },
  { label: '201-500', value: '201-500', description: 'Large Business' },
  { label: '500+', value: '500+', description: 'Enterprise' },
]

const fundingStages = [
  { label: 'Bootstrapped', value: 'bootstrapped' },
  { label: 'Pre-seed', value: 'pre-seed' },
  { label: 'Seed', value: 'seed' },
  { label: 'Series A', value: 'series-a' },
  { label: 'Series B+', value: 'series-b-plus' },
  { label: 'Profitable', value: 'profitable' },
]

const revenueRanges = [
  { label: 'Pre-revenue', value: 'pre-revenue' },
  { label: 'Under $100K', value: 'under-100k' },
  { label: '$100K - $500K', value: '100k-500k' },
  { label: '$500K - $1M', value: '500k-1m' },
  { label: '$1M - $5M', value: '1m-5m' },
  { label: '$5M - $10M', value: '5m-10m' },
  { label: '$10M+', value: '10m-plus' },
]

interface CompanyData {
  // Company Info
  companyName: string
  website: string
  industry: string
  foundedYear: string
  headquarters: string
  
  // Business Details
  companySize: string
  fundingStage: string
  businessModel: string
  description: string
  
  // Financials
  annualRevenue: string
  monthlyBurnRate: string
  cashOnHand: string
  profitMargin: string
  
  // Documents
  documents: File[]
}

export default function CompanyOnboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [data, setData] = useState<CompanyData>({
    companyName: user?.name || '',
    website: '',
    industry: '',
    foundedYear: '',
    headquarters: '',
    companySize: '',
    fundingStage: '',
    businessModel: '',
    description: '',
    annualRevenue: '',
    monthlyBurnRate: '',
    cashOnHand: '',
    profitMargin: '',
    documents: [],
  })

  const [uploadedResults, setUploadedResults] = useState<{filename: string, type: string, success: boolean}[]>([])

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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // CSVs are already uploaded immediately when selected via handleFileUpload
      // Check if we have financial data from CSVs
      const hasCsvFinancials = uploadedResults.some(r => 
        r.success && (r.type === 'profit_loss' || r.type === 'balance_sheet' || r.type === 'bank_statement')
      )

      // Parse financial values from form (only as fallback if no CSV data)
      const parseRevenue = (range: string) => {
        const map: Record<string, number> = {
          'pre-revenue': 0,
          'under-100k': 50000,
          '100k-500k': 300000,
          '500k-1m': 750000,
          '1m-5m': 3000000,
          '5m-10m': 7500000,
          '10m-plus': 15000000
        }
        return map[range] || 0
      }

      const parseNumber = (str: string) => {
        const num = parseFloat(str.replace(/[^0-9.-]/g, ''))
        return isNaN(num) ? 0 : num
      }

      // Save company info (backend will merge with CSV-parsed data)
      const companyData: any = {
        company_name: data.companyName,
        industry: data.industry,
      }
      
      // Only include form financials if no CSV financials were parsed
      // This prevents overwriting actual CSV data with form estimates
      if (!hasCsvFinancials) {
        companyData.financials = {
          revenue: parseRevenue(data.annualRevenue),
          expenses: parseNumber(data.monthlyBurnRate) * 12,
          cash_balance: parseNumber(data.cashOnHand),
        }
      }

      await api.post('/api/agents/company/save', companyData)
      
      toast.success('Company data saved successfully!')
      navigate('/company/dashboard')
    } catch (error) {
      console.error('Error submitting onboarding:', error)
      toast.error('Failed to save company data')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newFiles]
      }))
      
      // Immediately upload CSV files for parsing
      for (const file of newFiles) {
        if (file.name.endsWith('.csv')) {
          toast.loading(`Parsing ${file.name}...`, { id: file.name })
          
          const formData = new FormData()
          formData.append('file', file)
          formData.append('document_type', 'auto')
          
          try {
            const response = await api.post('/api/agents/company/upload-csv', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
            
            const docType = response.data.document_type
            let message = `Parsed ${file.name} as ${docType.replace('_', ' ')}`
            
            if (response.data.data) {
              const d = response.data.data
              if (d.revenue) message += ` - Revenue: $${d.revenue.toLocaleString()}`
              if (d.net_income) message += `, Net Income: $${d.net_income.toLocaleString()}`
              if (d.transactions_count) message += ` - ${d.transactions_count} transactions`
              if (d.employees_count) message += ` - ${d.employees_count} employees`
            }
            
            toast.success(message, { id: file.name, duration: 5000 })
            
            setUploadedResults(prev => [...prev, {
              filename: file.name,
              type: docType,
              success: true
            }])
          } catch (error) {
            console.error(`Failed to parse ${file.name}:`, error)
            toast.error(`Failed to parse ${file.name}`, { id: file.name })
            
            setUploadedResults(prev => [...prev, {
              filename: file.name,
              type: 'error',
              success: false
            }])
          }
        }
      }
    }
  }

  const removeFile = (index: number) => {
    setData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Company Information</h2>
              <p className="text-gray-400">Let's start with some basic information about your company.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={data.companyName}
                  onChange={(e) => updateData('companyName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.website}
                    onChange={(e) => updateData('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Year Founded</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={data.foundedYear}
                    onChange={(e) => updateData('foundedYear', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Headquarters</label>
                <input
                  type="text"
                  value={data.headquarters}
                  onChange={(e) => updateData('headquarters', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                <select
                  value={data.industry}
                  onChange={(e) => updateData('industry', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                >
                  <option value="">Select industry...</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind.toLowerCase()}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Business Details</h2>
              <p className="text-gray-400">Tell us more about your business operations.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Company Size</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {companySizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => updateData('companySize', size.value)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      data.companySize === size.value
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-white/10 bg-dark-800 hover:border-white/30'
                    }`}
                  >
                    <Users className={`w-6 h-6 mx-auto mb-2 ${
                      data.companySize === size.value ? 'text-primary-400' : 'text-gray-400'
                    }`} />
                    <p className={`font-medium ${data.companySize === size.value ? 'text-white' : 'text-gray-400'}`}>
                      {size.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{size.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Funding Stage</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {fundingStages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => updateData('fundingStage', stage.value)}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      data.fundingStage === stage.value
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-white/10 bg-dark-800 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business Model</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['B2B', 'B2C', 'B2B2C', 'Marketplace'].map((model) => (
                  <button
                    key={model}
                    onClick={() => updateData('businessModel', model.toLowerCase())}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      data.businessModel === model.toLowerCase()
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-white/10 bg-dark-800 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Brief Description</label>
              <textarea
                value={data.description}
                onChange={(e) => updateData('description', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors resize-none"
                rows={3}
                placeholder="What does your company do? (2-3 sentences)"
              />
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Financial Overview</h2>
              <p className="text-gray-400">Provide high-level financial information to help us give better insights.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Annual Revenue</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {revenueRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => updateData('annualRevenue', range.value)}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      data.annualRevenue === range.value
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-white/10 bg-dark-800 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Burn Rate</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={data.monthlyBurnRate}
                    onChange={(e) => updateData('monthlyBurnRate', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="50,000"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Net monthly cash outflow</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cash on Hand</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={data.cashOnHand}
                    onChange={(e) => updateData('cashOnHand', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="500,000"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Current cash reserves</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gross Margin %</label>
                <div className="relative">
                  <input
                    type="number"
                    value={data.profitMargin}
                    onChange={(e) => updateData('profitMargin', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none transition-colors pr-8"
                    placeholder="65"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">If applicable</p>
              </div>
            </div>
            
            {data.monthlyBurnRate && data.cashOnHand && (
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Estimated Runway</p>
                    <p className="text-2xl font-bold text-primary-400 mt-1">
                      {Math.round(Number(data.cashOnHand) / Number(data.monthlyBurnRate))} months
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Based on current burn rate
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload Documents</h2>
              <p className="text-gray-400">
                Upload past financial documents for AI analysis. This helps us provide accurate insights.
              </p>
            </div>
            
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Drop files here or click to upload</p>
                <p className="text-gray-500 text-sm">Financial statements, P&L reports, balance sheets, etc.</p>
                <p className="text-gray-600 text-xs mt-2">Supports PDF, CSV, XLSX, DOC (Max 10MB each)</p>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-dark-800 border border-white/10">
                <p className="text-white font-medium mb-2">Recommended Documents</p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Profit & Loss Statements
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Balance Sheets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Cash Flow Statements
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Bank Statements (3-6 months)
                  </li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-dark-800 border border-white/10">
                <p className="text-white font-medium mb-2">Optional Documents</p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Cap Table
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Tax Returns
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Payroll Reports
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Budget Forecasts
                  </li>
                </ul>
              </div>
            </div>
            
            {data.documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Uploaded Files ({data.documents.length})</h4>
                {data.documents.map((file, index) => {
                  const result = uploadedResults.find(r => r.filename === file.name)
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl bg-dark-800 border ${
                      result?.success ? 'border-green-500/30' : result?.success === false ? 'border-red-500/30' : 'border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <FileText className={`w-5 h-5 ${result?.success ? 'text-green-400' : 'text-primary-400'}`} />
                        <div>
                          <p className="text-white text-sm">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                            {result && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                result.success 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {result.success ? `✓ Parsed as ${result.type.replace('_', ' ')}` : '✗ Parse failed'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Enterprise-Grade Security</p>
                  <p className="text-gray-400 text-sm mt-1">
                    All documents are encrypted and stored securely. Access is strictly controlled.
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
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Building2 className="w-4 h-4" />
              Business Setup
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-dark-900/50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    className="flex flex-col items-center"
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all mb-2
                      ${isCompleted ? 'bg-green-500 cursor-pointer' : ''}
                      ${isCurrent ? 'bg-primary-500' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-dark-700 cursor-not-allowed' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <step.icon className={`w-6 h-6 ${isCurrent ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded-full ${
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
                  Setting up...
                </>
              ) : (
                <>
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5" />
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
