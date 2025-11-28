import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../lib/auth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedUserTypes?: ('individual' | 'company')[]
  requireOnboarding?: boolean
}

export default function ProtectedRoute({ 
  children, 
  allowedUserTypes,
  requireOnboarding = false 
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user, isLoading } = useAuthStore()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check user type restriction
  if (allowedUserTypes && user && !allowedUserTypes.includes(user.user_type)) {
    // Redirect to their correct portal
    const redirectPath = user.user_type === 'individual' ? '/individual/dashboard' : '/company/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  // Check if onboarding is required but not completed
  if (requireOnboarding && user && !user.is_onboarded) {
    const onboardingPath = user.user_type === 'individual' ? '/individual/onboarding' : '/company/onboarding'
    return <Navigate to={onboardingPath} replace />
  }

  return <>{children}</>
}

// Route guard for onboarding pages - only allow if NOT onboarded
interface OnboardingRouteProps {
  children: React.ReactNode
  userType: 'individual' | 'company'
}

export function OnboardingRoute({ children, userType }: OnboardingRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check user type matches
  if (user && user.user_type !== userType) {
    const correctPath = user.user_type === 'individual' ? '/individual/onboarding' : '/company/onboarding'
    return <Navigate to={correctPath} replace />
  }

  // Already onboarded - redirect to dashboard
  if (user && user.is_onboarded) {
    const dashboardPath = user.user_type === 'individual' ? '/individual/dashboard' : '/company/dashboard'
    return <Navigate to={dashboardPath} replace />
  }

  return <>{children}</>
}
