import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Send, 
  Sparkles, 
  Trash2,
  Bot,
  User,
  Info
} from 'lucide-react'
import { useChatStore } from '../lib/store'
import { sendChatMessage, Message } from '../lib/api'
import { cn, formatDate, generateId, agentColors, agentIcons } from '../lib/utils'
import IndividualLayout from '../components/layouts/IndividualLayout'
import { useAuthStore } from '../lib/auth'
import toast from 'react-hot-toast'

const quickPrompts = [
  "Analyze my financial health",
  "Create a savings plan",
  "What's my risk profile?",
  "Help me budget for next month",
  "What are my top spending categories?",
  "How much have I saved this month?",
  "Show me my investment portfolio",
  "Track my financial goals progress",
]

export default function Chat() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  
  const { messages, sessionId, isLoading, addMessage, setSessionId, setLoading, clearMessages } = useChatStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      const response = await sendChatMessage(input.trim(), sessionId || undefined)
      
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id)
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.response,
        agent: response.agent || 'coordinator',
        timestamp: new Date(),
      }

      addMessage(assistantMessage)
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMsg = error?.response?.data?.detail || 'Failed to get response. Make sure the backend is running.'
      toast.error(errorMsg)
      
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}`,
        agent: 'system',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      {user && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
          <Info className="w-4 h-4" />
          Using your financial data
        </div>
      )}
      <button
        onClick={() => {
          clearMessages()
          toast.success('Chat cleared')
        }}
        className="btn-secondary px-4 py-2 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Clear Chat
      </button>
      <Link to="/individual/dashboard" className="btn-secondary px-4 py-2">
        View Dashboard
      </Link>
    </div>
  )

  return (
    <IndividualLayout
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          AI Financial Assistant
        </span>
      }
      description={user ? `Personalized insights for ${user.name || user.email}` : "Powered by 11 specialized agents"}
      headerActions={headerActions}
    >
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center py-12"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-6 animate-float">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {user ? `Hello, ${user.name || 'there'}! 👋` : 'Welcome to CFOSync AI'}
              </h2>
              <p className="text-gray-400 max-w-md mb-8">
                {user 
                  ? "I have access to your financial data. Ask me about your spending, savings, investments, or goals - I'll give you personalized insights!"
                  : "I'm your AI financial assistant. Ask me anything about your finances, and I'll coordinate with specialized agents to help you."
                }
              </p>

              {/* Quick Prompts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="glass-card px-4 py-3 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl',
                      message.agent ? `bg-gradient-to-br ${agentColors[message.agent] || 'from-gray-500 to-gray-600'}` : 'bg-gradient-to-br from-primary-500 to-accent-500'
                    )}>
                      {message.agent ? agentIcons[message.agent] || '🤖' : '🤖'}
                    </div>
                  )}

                  <div className={cn(
                    'max-w-[70%]',
                    message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                  )}>
                    {message.role === 'assistant' && message.agent && (
                      <div className="text-xs text-gray-400 mb-2 capitalize">
                        {message.agent.replace('_', ' ')} Agent
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatDate(new Date(message.timestamp))}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="chat-bubble-ai">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="pt-4 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-2 flex items-center gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your finances..."
                className="flex-1 bg-transparent border-none outline-none resize-none px-4 py-2 text-white placeholder-gray-400 max-h-32"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'p-3 rounded-xl transition-all',
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 hover:shadow-glow'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              CFOSync AI can make mistakes. Consider checking important info.
            </p>
          </div>
        </div>
      </div>
    </IndividualLayout>
  )
}
