import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  timestamp: Date
}

export interface Agent {
  name: string
  description: string
  status: string
}

export interface AgentResponse {
  response: string
  agent: string
  session_id: string
}

export interface ChatResponse {
  response: string
  agents_used: string[]
  session_id: string
}

// API Functions
export async function getAgents(): Promise<Agent[]> {
  const response = await api.get('/agents')
  return response.data.agents
}

export async function invokeAgent(
  agentName: string,
  message: string,
  sessionId?: string
): Promise<AgentResponse> {
  const response = await api.post(`/agents/${agentName}/invoke`, {
    message,
    session_id: sessionId,
  })
  return response.data
}

export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await api.post('/chat', {
    message,
    session_id: sessionId,
  })
  return response.data
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await api.get('/health')
  return response.data
}

export default api
