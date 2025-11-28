import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Brain, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  User, 
  Building2,
  CheckCircle
} from 'lucide-react'
import { useAuthStore } from '../lib/auth'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

type UserType = 'individual' | 'company' | null

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1)
  const [userType, setUserType] = useState<UserType>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!name || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (!userType) {
      toast.error('Please select account type')
      setStep(1)
      return
    }

    const success = await register(email, password, name, userType)
    
    if (success) {
      toast.success('Account created! Let\'s set up your profile.')
      // Redirect to onboarding
      navigate(userType === 'individual' ? '/individual/onboarding' : '/company/onboarding')
    } else if (error) {
      toast.error(error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
      {/* Background */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">CFOSync</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">
            {step === 1 ? 'Choose your account type' : 'Fill in your details'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={cn(
            'flex-1 h-1 rounded-full transition-colors',
            step >= 1 ? 'bg-gradient-to-r from-primary-500 to-accent-500' : 'bg-white/10'
          )} />
          <div className={cn(
            'flex-1 h-1 rounded-full transition-colors',
            step >= 2 ? 'bg-gradient-to-r from-primary-500 to-accent-500' : 'bg-white/10'
          )} />
        </div>

        <div className="glass-card p-8">
          {/* Step 1: Choose Account Type */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <button
                onClick={() => handleUserTypeSelect('individual')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 text-left transition-all flex items-start gap-4',
                  userType === 'individual'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                )}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Individual</h3>
                  <p className="text-sm text-gray-400">
                    Personal finance management, budgeting, investments, and retirement planning
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['Budget Tracking', 'Investment Tips', 'Goal Planning'].map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUserTypeSelect('company')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 text-left transition-all flex items-start gap-4',
                  userType === 'company'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                )}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Company / Startup</h3>
                  <p className="text-sm text-gray-400">
                    AI-powered CFO for business finances, cash flow, payroll, and strategic planning
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['Cash Flow', 'Payroll', 'Budgeting'].map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Step 2: Account Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Selected Type Badge */}
              <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-white/5">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  userType === 'individual' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                )}>
                  {userType === 'individual' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Building2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-sm capitalize">{userType} Account</span>
                <button 
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs text-primary-400 hover:text-primary-300"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {userType === 'company' ? 'Company Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    {userType === 'company' ? (
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    ) : (
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    )}
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field pl-12"
                      placeholder={userType === 'company' ? 'Acme Inc.' : 'John Doe'}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-12"
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-12"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    {password && confirmPassword && password === confirmPassword && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'w-full btn-primary flex items-center justify-center gap-2 mt-6',
                    isLoading && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
