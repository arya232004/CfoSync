import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Message } from './api'

// Chat Store
interface ChatState {
  messages: Message[]
  sessionId: string | null
  isLoading: boolean
  addMessage: (message: Message) => void
  setSessionId: (id: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      sessionId: null,
      isLoading: false,
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setSessionId: (id) => set({ sessionId: id }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearMessages: () => set({ messages: [], sessionId: null }),
    }),
    {
      name: 'cfosync-chat',
    }
  )
)

// User Profile Store
interface UserProfile {
  userType: 'individual' | 'startup' | null
  name: string
  email: string
  income: number
  expenses: number
  savings: number
  goals: string[]
  riskTolerance: 'low' | 'medium' | 'high'
  // Startup specific
  companyName?: string
  revenue?: number
  runway?: number
  employees?: number
}

interface ProfileState {
  profile: UserProfile
  isOnboarded: boolean
  updateProfile: (updates: Partial<UserProfile>) => void
  setOnboarded: (value: boolean) => void
  resetProfile: () => void
}

const defaultProfile: UserProfile = {
  userType: null,
  name: '',
  email: '',
  income: 0,
  expenses: 0,
  savings: 0,
  goals: [],
  riskTolerance: 'medium',
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      isOnboarded: false,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      setOnboarded: (value) => set({ isOnboarded: value }),
      resetProfile: () => set({ profile: defaultProfile, isOnboarded: false }),
    }),
    {
      name: 'cfosync-profile',
    }
  )
)

// Financial Data Store
interface FinancialData {
  netWorth: number
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
  investmentReturns: number
  debtTotal: number
  emergencyFund: number
  // Startup metrics
  mrr?: number
  arr?: number
  burnRate?: number
  cac?: number
  ltv?: number
}

interface FinancialState {
  data: FinancialData
  insights: string[]
  updateData: (updates: Partial<FinancialData>) => void
  addInsight: (insight: string) => void
  clearInsights: () => void
}

const defaultFinancialData: FinancialData = {
  netWorth: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savingsRate: 0,
  investmentReturns: 0,
  debtTotal: 0,
  emergencyFund: 0,
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      data: defaultFinancialData,
      insights: [],
      updateData: (updates) =>
        set((state) => ({
          data: { ...state.data, ...updates },
        })),
      addInsight: (insight) =>
        set((state) => ({
          insights: [...state.insights, insight],
        })),
      clearInsights: () => set({ insights: [] }),
    }),
    {
      name: 'cfosync-financial',
    }
  )
)

// UI State Store
interface UIState {
  sidebarOpen: boolean
  currentAgent: string | null
  theme: 'dark' | 'light'
  toggleSidebar: () => void
  setCurrentAgent: (agent: string | null) => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentAgent: null,
  theme: 'dark',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  setTheme: (theme) => set({ theme }),
}))

// Uploaded Statements Store
export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  source: string // which statement it came from
}

export interface UploadedStatement {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  uploadedAt: string
  extractedData?: {
    transactions: number
    dateRange: string
    totalIncome: number
    totalExpenses: number
    categories: string[]
  }
}

interface StatementsState {
  statements: UploadedStatement[]
  transactions: Transaction[]
  isLoading: boolean
  addStatement: (statement: UploadedStatement) => void
  updateStatement: (id: string, updates: Partial<UploadedStatement>) => void
  removeStatement: (id: string) => void
  addTransactions: (transactions: Transaction[]) => void
  clearTransactions: () => void
  clearStatements: () => void
  clearAll: () => void
  getTransactionsByCategory: () => Record<string, Transaction[]>
  getTotalIncome: () => number
  getTotalExpenses: () => number
  getRecentTransactions: (limit?: number) => Transaction[]
}

export const useStatementsStore = create<StatementsState>()(
  persist(
    (set, get) => ({
      statements: [],
      transactions: [],
      isLoading: false,
      
      addStatement: (statement) =>
        set((state) => {
          // Prevent duplicates
          if (state.statements.some(s => s.id === statement.id || s.name === statement.name)) {
            return state
          }
          return { statements: [statement, ...state.statements].slice(0, 20) }
        }),
      
      updateStatement: (id, updates) =>
        set((state) => ({
          statements: state.statements.map(s => 
            s.id === id ? { ...s, ...updates } : s
          )
        })),
      
      removeStatement: (id) =>
        set((state) => ({
          statements: state.statements.filter(s => s.id !== id)
        })),
      
      addTransactions: (newTransactions) =>
        set((state) => {
          // Prevent duplicates by checking transaction IDs
          const existingIds = new Set(state.transactions.map(t => t.id))
          const uniqueNew = newTransactions.filter(t => !existingIds.has(t.id))
          return { transactions: [...state.transactions, ...uniqueNew] }
        }),
      
      clearTransactions: () => set({ transactions: [] }),
      
      clearStatements: () => set({ statements: [] }),
      
      clearAll: () => set({ transactions: [], statements: [] }),
      
      getTransactionsByCategory: () => {
        const transactions = get().transactions
        return transactions.reduce((acc, t) => {
          if (!acc[t.category]) acc[t.category] = []
          acc[t.category].push(t)
          return acc
        }, {} as Record<string, Transaction[]>)
      },
      
      getTotalIncome: () => {
        return get().transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
      },
      
      getTotalExpenses: () => {
        return get().transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      },
      
      getRecentTransactions: (limit = 10) => {
        return get().transactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit)
      }
    }),
    {
      name: 'cfosync-statements',
    }
  )
)


// Settings Store - Theme, Currency, Notifications
interface NotificationSettings {
  monthlyStatementReminder: boolean
  weeklyInvestmentReports: boolean
  goalReminders: boolean
  budgetAlerts: boolean
}

// Exchange rates relative to USD (base currency)
// These are approximate rates - in production, you'd fetch these from an API
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1,
  'EUR': 0.92,
  'GBP': 0.79,
  'INR': 83.50
}

interface SettingsState {
  theme: 'dark' | 'light'
  currency: 'USD' | 'EUR' | 'GBP' | 'INR'
  exchangeRates: Record<string, number>
  notifications: NotificationSettings
  
  setTheme: (theme: 'dark' | 'light') => void
  setCurrency: (currency: 'USD' | 'EUR' | 'GBP' | 'INR') => void
  updateNotifications: (updates: Partial<NotificationSettings>) => void
  convertFromUSD: (amountInUSD: number) => number
  getExchangeRate: () => number
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      currency: 'USD',
      exchangeRates: EXCHANGE_RATES,
      notifications: {
        monthlyStatementReminder: true,
        weeklyInvestmentReports: true,
        goalReminders: true,
        budgetAlerts: true,
      },
      
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      
      setCurrency: (currency) => set({ currency }),
      
      updateNotifications: (updates) =>
        set((state) => ({
          notifications: { ...state.notifications, ...updates }
        })),
      
      // Convert amount from USD to selected currency
      convertFromUSD: (amountInUSD: number) => {
        const { currency, exchangeRates } = get()
        const rate = exchangeRates[currency] || 1
        return amountInUSD * rate
      },
      
      // Get current exchange rate
      getExchangeRate: () => {
        const { currency, exchangeRates } = get()
        return exchangeRates[currency] || 1
      }
    }),
    {
      name: 'cfosync-settings',
    }
  )
)

// Apply theme to document - exported for use in App.tsx
export const applyTheme = (theme: 'dark' | 'light') => {
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
    root.style.colorScheme = 'dark'
    // Dark theme colors
    root.style.setProperty('--bg-primary', '#0f0f1a')
    root.style.setProperty('--bg-secondary', '#1a1a2e')
    root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.05)')
    root.style.setProperty('--text-primary', '#ffffff')
    root.style.setProperty('--text-secondary', '#a0a0a0')
    root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
    // Light theme colors
    root.style.setProperty('--bg-primary', '#f8fafc')
    root.style.setProperty('--bg-secondary', '#ffffff')
    root.style.setProperty('--bg-card', 'rgba(0, 0, 0, 0.02)')
    root.style.setProperty('--text-primary', '#1a1a2e')
    root.style.setProperty('--text-secondary', '#64748b')
    root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)')
  }
  
  localStorage.setItem('cfosync-theme', theme)
}

// Initialize theme on load
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('cfosync-theme') as 'dark' | 'light' | null
  const theme = savedTheme || 'dark'
  applyTheme(theme)
  return theme
}

// Currency formatting helper with conversion
export const formatCurrency = (valueInUSD: number, currency: string = 'USD'): string => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹'
  }
  
  // Convert from USD to target currency
  const rate = EXCHANGE_RATES[currency] || 1
  const convertedValue = valueInUSD * rate
  
  const symbol = symbols[currency] || '$'
  
  // Format based on currency
  if (currency === 'INR') {
    // Indian number format (lakhs, crores)
    return `${symbol}${convertedValue.toLocaleString('en-IN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`
  }
  
  return `${symbol}${convertedValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`
}
