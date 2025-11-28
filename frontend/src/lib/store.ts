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
