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
