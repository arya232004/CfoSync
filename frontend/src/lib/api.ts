import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Generate or get user ID from localStorage
function getUserId(): string {
  let userId = localStorage.getItem('cfosync_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('cfosync_user_id', userId)
  }
  return userId
}

// Types
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  timestamp: Date
}

export interface AgentInfo {
  name: string
  description: string
}

export interface AgentsListResponse {
  agents: string[]
  count: number
  descriptions: Record<string, string>
}

export interface AgentResponse {
  agent: string
  response: string
  session_id: string | null
  events: any[] | null
  data: any | null
}

export interface HealthResponse {
  status: string
  gemini_model: string
  agents_available: number
}

// API Functions

/**
 * Get list of all available agents
 */
export async function getAgents(): Promise<AgentsListResponse> {
  const response = await api.get('/agents')
  return response.data
}

/**
 * Invoke a specific agent by name
 */
export async function invokeAgent(
  agentName: string,
  message: string,
  sessionId?: string,
  context?: Record<string, any>
): Promise<AgentResponse> {
  const response = await api.post(`/agents/${agentName}/invoke`, {
    user_id: getUserId(),
    message,
    session_id: sessionId || null,
    context: context || null,
  })
  return response.data
}

/**
 * Send a chat message through the coordinator agent
 * Uses authenticated endpoint with full financial context
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<AgentResponse> {
  // Get auth token from localStorage
  const token = localStorage.getItem('cfosync_token')
  
  if (token) {
    // Use authenticated endpoint with financial context
    try {
      const response = await api.post('/chat', {
        message,
        session_id: sessionId || null,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return response.data
    } catch (error: any) {
      // If auth fails, fall back to legacy endpoint
      if (error?.response?.status === 401) {
        console.warn('Auth failed, falling back to legacy chat endpoint')
      } else {
        throw error
      }
    }
  }
  
  // Fallback to legacy endpoint (no financial context)
  const response = await api.post('/chat', {
    user_id: getUserId(),
    message,
    session_id: sessionId || null,
    context: null,
  }, {
    baseURL: '' // Use root path for legacy /chat endpoint
  })
  return response.data
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<HealthResponse> {
  const response = await api.get('/health')
  return response.data
}

/**
 * Get root status
 */
export async function getStatus(): Promise<{ status: string; message: string }> {
  const response = await api.get('/')
  return response.data
}

export default api
