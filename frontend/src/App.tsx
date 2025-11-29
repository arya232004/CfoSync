import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from './lib/auth'
import { useEffect } from 'react'
import { initializeTheme, useSettingsStore } from './lib/store'

// Public pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// Shared pages (legacy)
import Chat from './pages/Chat'
import Agents from './pages/Agents'

// Layouts
import CompanyLayout from './components/layouts/CompanyLayout'
// import IndividualLayout from './components/layouts/IndividualLayout' // Individual pages have built-in sidebars

// Individual Portal
import IndividualDashboard from './pages/individual/IndividualDashboard'
import IndividualOnboarding from './pages/individual/IndividualOnboarding'
import Planning from './pages/individual/Planning'
import Investments from './pages/individual/Investments'
import LifeSimulator from './pages/individual/LifeSimulator'
import AIAgents from './pages/individual/AIAgents'
import UploadStatements from './pages/individual/UploadStatements'
import Profile from './pages/individual/Profile'
import Settings from './pages/individual/Settings'
import Transactions from './pages/individual/Transactions'

// Company Portal
import CompanyDashboard from './pages/company/CompanyDashboard'
import CompanyOnboarding from './pages/company/CompanyOnboarding'
import Cashflow from './pages/company/Cashflow'
import Payroll from './pages/company/Payroll'
import Budgets from './pages/company/Budgets'
import FraudDetection from './pages/company/FraudDetection'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { theme } = useSettingsStore()
  
  // Initialize theme on app load
  useEffect(() => {
    initializeTheme()
  }, [])
  
  // Also apply theme when it changes in settings
  useEffect(() => {
    // Theme is applied by the store's setTheme function
  }, [theme])

  // Helper to redirect to correct portal
  const getPortalRedirect = () => {
    if (!isAuthenticated || !user) return '/login'
    return user.user_type === 'individual' ? '/individual/dashboard' : '/company/dashboard'
  }

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to={getPortalRedirect()} replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to={getPortalRedirect()} replace /> : <Register />
        } />

        {/* Legacy routes - redirect to portal */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Navigate to={getPortalRedirect()} replace />
          </ProtectedRoute>
        } />

        {/* Individual Portal Routes */}
        <Route path="/individual/onboarding" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <IndividualOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/individual/dashboard" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <IndividualDashboard />
          </ProtectedRoute>
        } />
        <Route path="/individual/planning" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Planning />
          </ProtectedRoute>
        } />
        <Route path="/individual/investments" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Investments />
          </ProtectedRoute>
        } />
        <Route path="/individual/simulator" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <LifeSimulator />
          </ProtectedRoute>
        } />
        <Route path="/individual/chat" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Chat />
          </ProtectedRoute>
        } />
        <Route path="/individual/agents" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <AIAgents />
          </ProtectedRoute>
        } />
        <Route path="/individual/upload" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <UploadStatements />
          </ProtectedRoute>
        } />
        <Route path="/individual/profile" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/individual/settings" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/individual/transactions" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <Transactions />
          </ProtectedRoute>
        } />
        <Route path="/individual/*" element={
          <ProtectedRoute allowedUserTypes={['individual']}>
            <IndividualDashboard />
          </ProtectedRoute>
        } />

        {/* Company Portal Routes */}
        <Route path="/company/onboarding" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/company/dashboard" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><CompanyDashboard /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/cashflow" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><Cashflow /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/payroll" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><Payroll /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/budgets" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><Budgets /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/fraud" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><FraudDetection /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/fraud-detection" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><FraudDetection /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/chat" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><Chat /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/agents" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><Agents /></CompanyLayout>
          </ProtectedRoute>
        } />
        <Route path="/company/*" element={
          <ProtectedRoute allowedUserTypes={['company']}>
            <CompanyLayout><CompanyDashboard /></CompanyLayout>
          </ProtectedRoute>
        } />

        {/* Shared routes for quick access (no auth required for demo) */}
        <Route path="/chat" element={<Chat />} />
        <Route path="/agents" element={<Agents />} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App
