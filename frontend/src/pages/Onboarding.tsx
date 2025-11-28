import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
  Brain,
  User,
  Building2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Target,
  Shield,
  Check,
  Sparkles
} from 'lucide-react'
import { useProfileStore } from '../lib/store'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

type Step = 1 | 2 | 3 | 4

const riskOptions = [
  {
    value: 'low' as const,
    label: 'Conservative',
    description: 'Prefer stable, low-risk investments',
    icon: Shield,
  },
  {
    value: 'medium' as const,
    label: 'Balanced',
    description: 'Mix of growth and stability',
    icon: Target,
  },
  {
    value: 'high' as const,
    label: 'Aggressive',
    description: 'Higher risk for higher returns',
    icon: Sparkles,
  },
]

const goalOptions = [
  'Build Emergency Fund',
  'Save for Retirement',
  'Buy a Home',
  'Pay Off Debt',
  'Start Investing',
  'Save for Education',
  'Build Wealth',
  'Start a Business',
]

export default function Onboarding() {
  const [step, setStep] = useState<Step>(1)
  const navigate = useNavigate()
  const { profile, updateProfile, setOnboarded } = useProfileStore()

  const [formData, setFormData] = useState({
    userType: profile.userType,
    name: profile.name,
    email: profile.email,
    income: profile.income || '',
    expenses: profile.expenses || '',
    savings: profile.savings || '',
    riskTolerance: profile.riskTolerance,
    goals: profile.goals,
    // Startup fields
    companyName: profile.companyName || '',
    revenue: profile.revenue || '',
    runway: profile.runway || '',
    employees: profile.employees || '',
  })

  const handleNext = () => {
    if (step === 1 && !formData.userType) {
      toast.error('Please select your profile type')
      return
    }
    if (step === 2 && (!formData.name || !formData.email)) {
      toast.error('Please fill in all required fields')
      return
    }
    if (step < 4) {
      setStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step)
    }
  }

  const handleComplete = () => {
    updateProfile({
      userType: formData.userType,
      name: formData.name,
      email: formData.email,
      income: Number(formData.income) || 0,
      expenses: Number(formData.expenses) || 0,
      savings: Number(formData.savings) || 0,
      riskTolerance: formData.riskTolerance,
      goals: formData.goals,
      companyName: formData.companyName,
      revenue: Number(formData.revenue) || 0,
      runway: Number(formData.runway) || 0,
      employees: Number(formData.employees) || 0,
    })
    setOnboarded(true)
    toast.success('Profile created successfully!')
    navigate('/dashboard')
  }

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }))
  }

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
      {/* Background */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />

      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">CFOSync</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Let's Set Up Your Profile</h1>
          <p className="text-gray-400">
            Tell us about yourself so we can personalize your experience
          </p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                  s < step
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                    : s === step
                    ? 'bg-white/20 text-white border-2 border-primary-500'
                    : 'bg-white/5 text-gray-500'
                )}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((step - 1) / 3) * 100}%` }}
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>

        {/* Form Card */}
        <motion.div className="glass-card p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: User Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold mb-6">
                  What best describes you?
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, userType: 'individual' })}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all',
                      formData.userType === 'individual'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-white/10 hover:border-white/30'
                    )}
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Individual</h3>
                    <p className="text-sm text-gray-400">
                      Personal finance, savings, investments, and retirement planning
                    </p>
                  </button>

                  <button
                    onClick={() => setFormData({ ...formData, userType: 'startup' })}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all',
                      formData.userType === 'startup'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-white/10 hover:border-white/30'
                    )}
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Startup / Business</h3>
                    <p className="text-sm text-gray-400">
                      Business finance, runway, burn rate, and growth metrics
                    </p>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold mb-6">
                  Tell us about yourself
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {formData.userType === 'startup' ? 'Your Name' : 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                      placeholder="john@example.com"
                    />
                  </div>

                  {formData.userType === 'startup' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Company Name</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="input-field"
                        placeholder="Acme Inc."
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Financial Info */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold mb-6">
                  {formData.userType === 'startup' ? 'Business Financials' : 'Your Financial Snapshot'}
                </h2>

                {formData.userType === 'individual' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Monthly Income</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="input-field pl-12"
                          placeholder="5000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Monthly Expenses</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={formData.expenses}
                          onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                          className="input-field pl-12"
                          placeholder="3000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Current Savings</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={formData.savings}
                          onChange={(e) => setFormData({ ...formData, savings: e.target.value })}
                          className="input-field pl-12"
                          placeholder="10000"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Monthly Revenue</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={formData.revenue}
                          onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                          className="input-field pl-12"
                          placeholder="50000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Runway (months)</label>
                      <input
                        type="number"
                        value={formData.runway}
                        onChange={(e) => setFormData({ ...formData, runway: e.target.value })}
                        className="input-field"
                        placeholder="18"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Employees</label>
                      <input
                        type="number"
                        value={formData.employees}
                        onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                        className="input-field"
                        placeholder="12"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Goals & Risk */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-4">Risk Tolerance</h2>
                  <div className="grid md:grid-cols-3 gap-3">
                    {riskOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, riskTolerance: option.value })}
                        className={cn(
                          'p-4 rounded-xl border-2 text-center transition-all',
                          formData.riskTolerance === option.value
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <option.icon className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Goals</h2>
                  <div className="flex flex-wrap gap-2">
                    {goalOptions.map((goal) => (
                      <button
                        key={goal}
                        onClick={() => toggleGoal(goal)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm transition-all',
                          formData.goals.includes(goal)
                            ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                            : 'bg-white/10 hover:bg-white/20'
                        )}
                      >
                        {formData.goals.includes(goal) && <Check className="w-4 h-4 inline mr-1" />}
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                step === 1 ? 'invisible' : 'hover:bg-white/10'
              )}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 4 ? (
              <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleComplete} className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Complete Setup
              </button>
            )}
          </div>
        </motion.div>

        {/* Skip */}
        <div className="text-center mt-6">
          <Link to="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
            Skip for now →
          </Link>
        </div>
      </div>
    </div>
  )
}
