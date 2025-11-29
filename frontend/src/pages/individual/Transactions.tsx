import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  AlertTriangle,
  BarChart3,
  PieChart,
  X
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { useStatementsStore, useSettingsStore, formatCurrency as globalFormatCurrency } from '../../lib/store'
import { statementsAPI } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

type SortField = 'date' | 'amount' | 'category' | 'description'
type SortOrder = 'asc' | 'desc'

export default function Transactions() {
  const { user } = useAuthStore()
  const { transactions, addTransactions, addStatement, clearTransactions } = useStatementsStore()
  const { currency } = useSettingsStore()
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 20

  // Load transactions from Firebase
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true)
      try {
        // Clear old data first to ensure fresh state
        clearTransactions()
        
        // Load all transactions from Firebase
        const transactionsResponse = await statementsAPI.getTransactions(1000)
        if (transactionsResponse.transactions.length > 0) {
          addTransactions(transactionsResponse.transactions.map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type as 'income' | 'expense',
            category: t.category,
            source: t.source
          })))
        }
        
        // Load statements
        const statementsResponse = await statementsAPI.getStatements()
        if (statementsResponse.statements.length > 0) {
          statementsResponse.statements.forEach((stmt: any) => {
            addStatement({
              id: stmt.id,
              name: stmt.name,
              size: stmt.size,
              type: stmt.file_type,
              status: 'completed',
              progress: 100,
              uploadedAt: stmt.uploaded_at,
              extractedData: stmt.extracted_data
            })
          })
        }
      } catch (e) {
        console.error('Failed to load transactions:', e)
        // On error, still clear the old mock data
        clearTransactions()
      } finally {
        setLoading(false)
      }
    }
    loadTransactions()
  }, [user?.id])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category))
    return Array.from(cats).sort()
  }, [transactions])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(t => 
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
      )
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType)
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount)
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [transactions, searchTerm, filterType, filterCategory, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Statistics
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    // Category breakdown for filtered transactions
    const categoryBreakdown: Record<string, number> = {}
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount)
    })
    
    return {
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      transactionCount: filteredTransactions.length,
      categoryBreakdown
    }
  }, [filteredTransactions])

  // Use global formatCurrency with real exchange rate conversion
  const formatCurrency = (value: number) => globalFormatCurrency(value, currency)

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount']
    const rows = filteredTransactions.map(t => [
      t.date,
      t.description,
      t.category,
      t.type,
      t.amount.toString()
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions.csv'
    a.click()
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        onClick={exportCSV}
        disabled={filteredTransactions.length === 0}
        className="btn-secondary px-4 py-2 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      <Link to="/individual/upload" className="btn-primary px-4 py-2 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        Upload
      </Link>
    </div>
  )

  if (loading) {
    return (
      <IndividualLayout title="Transactions" description="View and manage all your transactions" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  if (transactions.length === 0) {
    return (
      <IndividualLayout title="Transactions" description="View and manage all your transactions" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
            <p className="text-gray-400 mb-6">Upload your bank statements to see your transactions here.</p>
            <Link to="/individual/upload" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Statements
            </Link>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  return (
    <IndividualLayout
      title="Transactions"
      description="View and manage all your transactions"
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Income</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(stats.totalIncome)}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Expenses</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(stats.totalExpenses)}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net Flow</p>
                <p className={`text-xl font-bold ${stats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.netFlow >= 0 ? '+' : ''}{formatCurrency(stats.netFlow)}
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Transactions</p>
                <p className="text-xl font-bold text-white">{stats.transactionCount}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => { setFilterType('all'); setCurrentPage(1) }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === 'all' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setFilterType('income'); setCurrentPage(1) }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === 'income' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => { setFilterType('expense'); setCurrentPage(1) }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === 'expense' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  showFilters || filterCategory !== 'all'
                    ? 'bg-accent-500 text-white' 
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
              >
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1) }}
                      className="px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(filterCategory !== 'all' || searchTerm) && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterType('all')
                        setFilterCategory('all')
                        setCurrentPage(1)
                      }}
                      className="self-end px-4 py-2 rounded-lg bg-dark-800 text-gray-400 hover:text-white flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transactions Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th 
                    className="text-left p-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date
                      {sortField === 'date' && (
                        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort('description')}
                  >
                    <div className="flex items-center gap-2">
                      Description
                      {sortField === 'description' && (
                        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort('category')}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Category
                      {sortField === 'category' && (
                        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                  <th 
                    className="text-right p-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort('amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      <DollarSign className="w-4 h-4" />
                      Amount
                      {sortField === 'amount' && (
                        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((txn, index) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-gray-300">{formatDate(txn.date)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          txn.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {txn.type === 'income' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <span className="text-white font-medium">{txn.description}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full bg-dark-800 text-gray-300 text-sm">
                        {txn.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        txn.type === 'income' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {txn.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-semibold ${
                      txn.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        {Object.keys(stats.categoryBreakdown).length > 0 && filterType !== 'income' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-accent-400" />
              Spending by Category
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([category, amount], index) => {
                  const percentage = Math.round((amount / stats.totalExpenses) * 100)
                  const colors = [
                    'from-red-500 to-pink-500',
                    'from-orange-500 to-amber-500',
                    'from-yellow-500 to-lime-500',
                    'from-green-500 to-emerald-500',
                    'from-teal-500 to-cyan-500',
                    'from-blue-500 to-indigo-500',
                    'from-violet-500 to-purple-500',
                    'from-fuchsia-500 to-pink-500',
                    'from-rose-500 to-red-500',
                    'from-slate-500 to-gray-500',
                  ]
                  return (
                    <motion.button
                      key={category}
                      onClick={() => { setFilterCategory(category); setShowFilters(true) }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-dark-800/50 border border-white/10 hover:border-white/20 transition-all text-left"
                    >
                      <div className={`h-2 rounded-full bg-gradient-to-r ${colors[index % colors.length]} mb-3`} 
                           style={{ width: `${Math.max(20, percentage)}%` }} />
                      <p className="text-white font-medium truncate">{category}</p>
                      <p className="text-gray-400 text-sm">{formatCurrency(amount)}</p>
                      <p className="text-gray-500 text-xs">{percentage}% of expenses</p>
                    </motion.button>
                  )
                })}
            </div>
          </motion.div>
        )}
      </div>
    </IndividualLayout>
  )
}
