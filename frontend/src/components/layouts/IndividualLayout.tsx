import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Brain,
  LayoutDashboard,
  MessageSquare,
  Upload,
  LineChart,
  BarChart3,
  Heart,
  User,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Receipt
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/individual/dashboard' },
  { icon: Sparkles, label: 'AI Agents', path: '/individual/agents' },
  { icon: MessageSquare, label: 'AI Chat', path: '/individual/chat' },
  { icon: Upload, label: 'Upload Statements', path: '/individual/upload' },
  { icon: Receipt, label: 'Transactions', path: '/individual/transactions' },
  { icon: LineChart, label: 'Planning', path: '/individual/planning' },
  { icon: BarChart3, label: 'Investments', path: '/individual/investments' },
  { icon: Heart, label: 'Life Simulator', path: '/individual/simulator' },
  { icon: User, label: 'Profile', path: '/individual/profile' },
  { icon: Settings, label: 'Settings', path: '/individual/settings' },
]

interface IndividualLayoutProps {
  children: React.ReactNode
  title: React.ReactNode
  description?: string
  headerActions?: React.ReactNode
}

export default function IndividualLayout({ children, title, description, headerActions }: IndividualLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-900/50 backdrop-blur-xl border-r border-white/5 transition-all duration-300`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/5">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  CFOSync
                </span>
              )}
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          
          {/* Logout */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5"
              >
                <Menu className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{title}</h1>
                {description && <p className="text-gray-400 text-sm">{description}</p>}
              </div>
            </div>
            {headerActions && (
              <div className="flex items-center gap-3">
                {headerActions}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
