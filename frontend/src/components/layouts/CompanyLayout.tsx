import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  PieChart,
  Shield,
  Brain,
  User,
  LogOut,
  Menu,
  Settings,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth';

interface CompanyLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/company/dashboard' },
  { icon: TrendingUp, label: 'Cash Flow', path: '/company/cashflow' },
  { icon: Users, label: 'Payroll', path: '/company/payroll' },
  { icon: PieChart, label: 'Budgets', path: '/company/budgets' },
  { icon: Shield, label: 'Fraud Detection', path: '/company/fraud-detection' },
  { icon: FileText, label: 'Reports', path: '/company/reports' },
  { icon: Settings, label: 'Settings', path: '/company/settings' },
];

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-dark-950 text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="fixed left-0 top-0 h-full bg-dark-900/50 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"
            >
              CFOSync
            </motion.span>
          )}
        </div>

        {/* Portal Indicator */}
        {sidebarOpen && (
          <div className="mx-4 mb-4 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <span className="text-purple-400 text-sm font-medium">🏢 Company Portal</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white border border-primary-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-primary-400' : ''}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Switch Portal */}
        {sidebarOpen && (
          <div className="px-4 pb-2">
            <Link
              to="/individual/dashboard"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              Switch to Personal
            </Link>
          </div>
        )}

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Company Admin'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || 'admin@company.com'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-[280px]' : 'ml-20'}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">AI Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
