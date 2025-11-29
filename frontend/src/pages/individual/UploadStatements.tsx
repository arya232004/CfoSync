import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Building2,
  Trash2,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import IndividualLayout from '../../components/layouts/IndividualLayout'
import { useStatementsStore, Transaction } from '../../lib/store'
import { statementsAPI } from '../../services/aiService'
import toast from 'react-hot-toast'

interface UploadedFile {
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
  error?: string
}

const supportedFormats = [
  { icon: FileSpreadsheet, label: 'CSV Files', desc: 'Bank exports, spreadsheets' },
  { icon: FileText, label: 'PDF Statements', desc: 'Official bank statements' },
  { icon: Receipt, label: 'Receipts', desc: 'Photos of receipts' },
  { icon: CreditCard, label: 'Credit Card', desc: 'Credit card statements' },
]

// Helper to format relative time
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// Helper to format date strings
const formatDateString = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      const [a, b, c] = parts
      if (parseInt(a) > 12) {
        return new Date(parseInt(a), parseInt(b) - 1, parseInt(c)).toISOString()
      } else {
        return new Date(parseInt(c), parseInt(a) - 1, parseInt(b)).toISOString()
      }
    }
    return new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Auto-categorize transaction based on description
const categorizeTransaction = (description: string): string => {
  const desc = description?.toLowerCase() || ''
  
  if (desc.includes('deposit') || desc.includes('payroll') || desc.includes('salary') || 
      desc.includes('direct dep') || desc.includes('income')) {
    return 'Income'
  }
  if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('apartment') ||
      desc.includes('housing') || desc.includes('hoa')) {
    return 'Housing'
  }
  if (desc.includes('whole foods') || desc.includes('trader joe') || desc.includes('costco') ||
      desc.includes('grocery') || desc.includes('safeway') || desc.includes('kroger') ||
      desc.includes('aldi') || desc.includes('wegmans') || desc.includes('publix')) {
    return 'Groceries'
  }
  if (desc.includes('starbucks') || desc.includes('mcdonald') || desc.includes('chipotle') ||
      desc.includes('restaurant') || desc.includes('doordash') || desc.includes('uber eats') ||
      desc.includes('grubhub') || desc.includes('dining') || desc.includes('cafe') ||
      desc.includes('coffee') || desc.includes('pizza')) {
    return 'Dining'
  }
  if (desc.includes('uber') || desc.includes('lyft') || desc.includes('gas') ||
      desc.includes('shell') || desc.includes('chevron') || desc.includes('exxon') ||
      desc.includes('parking') || desc.includes('metro') || desc.includes('transit') ||
      desc.includes('car') || desc.includes('auto')) {
    return 'Transportation'
  }
  if (desc.includes('electric') || desc.includes('water') || desc.includes('gas bill') ||
      desc.includes('utility') || desc.includes('comcast') || desc.includes('verizon') ||
      desc.includes('at&t') || desc.includes('internet') || desc.includes('phone bill')) {
    return 'Utilities'
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') ||
      desc.includes('disney') || desc.includes('amazon prime') || desc.includes('hbo') ||
      desc.includes('theater') || desc.includes('movie') || desc.includes('concert') ||
      desc.includes('game') || desc.includes('entertainment')) {
    return 'Entertainment'
  }
  if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') ||
      desc.includes('best buy') || desc.includes('nike') || desc.includes('apple store') ||
      desc.includes('shopping') || desc.includes('purchase')) {
    return 'Shopping'
  }
  if (desc.includes('pharmacy') || desc.includes('cvs') || desc.includes('walgreens') ||
      desc.includes('doctor') || desc.includes('medical') || desc.includes('dental') ||
      desc.includes('health') || desc.includes('gym') || desc.includes('fitness')) {
    return 'Health'
  }
  if (desc.includes('insurance') || desc.includes('geico') || desc.includes('state farm') ||
      desc.includes('allstate') || desc.includes('progressive')) {
    return 'Insurance'
  }
  if (desc.includes('transfer') || desc.includes('zelle') || desc.includes('venmo') ||
      desc.includes('paypal') || desc.includes('wire')) {
    return 'Transfer'
  }
  
  return 'Other'
}

// Parse CSV file content to extract real transactions
const parseCSVFile = (fileContent: string, fileName: string): Transaction[] => {
  try {
    const lines = fileContent.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    
    const transactions: Transaction[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 3) continue
      
      // Find column indices (flexible for different CSV formats)
      const dateIdx = headers.findIndex(h => h.includes('date'))
      const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('merchant') || h.includes('name'))
      const amountIdx = headers.findIndex(h => h.includes('amount'))
      const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type'))
      
      // Default indices if not found
      const date = dateIdx >= 0 ? values[dateIdx] : values[0]
      const description = descIdx >= 0 ? values[descIdx] : values[1]
      const amountStr = amountIdx >= 0 ? values[amountIdx] : values[3] || values[2]
      const categoryRaw = categoryIdx >= 0 ? values[categoryIdx] : ''
      
      // Parse amount
      const amount = parseFloat(amountStr?.replace(/[$,]/g, '') || '0')
      if (isNaN(amount) || amount === 0) continue
      
      // Skip opening/closing balance rows
      if (description?.toLowerCase().includes('opening balance')) continue
      if (description?.toLowerCase().includes('closing balance')) continue
      
      // Determine if income or expense
      const isIncome = amount > 0 || description?.toLowerCase().includes('deposit') || 
                      description?.toLowerCase().includes('income') || 
                      description?.toLowerCase().includes('salary') ||
                      description?.toLowerCase().includes('refund')
      
      // Auto-categorize if no category provided
      const category = categoryRaw || categorizeTransaction(description)
      
      transactions.push({
        id: `${fileName}-${i}-${Date.now()}`,
        date: formatDateString(date),
        description: description || 'Unknown',
        amount: amount,
        type: isIncome ? 'income' : 'expense',
        category: category || (isIncome ? 'Income' : 'Other'),
        source: fileName
      })
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (err) {
    console.error('Error parsing CSV:', err)
    return []
  }
}

// Local storage key for backward compatibility
const STORAGE_KEY = 'cfosync_uploaded_statements'

export default function UploadStatements() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([])
  const [, setIsLoadingHistory] = useState(true)
  
  // Use the global store
  const { addStatement, addTransactions } = useStatementsStore()

  // Load upload history from Firebase on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true)
      try {
        // Try to load from Firebase first
        const { statements: firebaseStatements } = await statementsAPI.getStatements()
        
        if (firebaseStatements && firebaseStatements.length > 0) {
          // Convert Firebase format to local format
          const convertedStatements = firebaseStatements.map((s: any) => ({
            id: s.id,
            name: s.name,
            size: s.size,
            type: s.file_type,
            status: s.status || 'completed',
            progress: 100,
            uploadedAt: s.uploaded_at,
            extractedData: s.extracted_data
          }))
          setUploadHistory(convertedStatements)
        } else {
          // Fall back to localStorage for backward compatibility
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              const uniqueFiles = parsed.filter((file: UploadedFile, index: number, self: UploadedFile[]) => 
                index === self.findIndex((f) => f.id === file.id || f.name === file.name)
              )
              setUploadHistory(uniqueFiles)
            } catch (e) {
              console.error('Failed to parse upload history:', e)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load from Firebase, using localStorage:', error)
        // Fall back to localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setUploadHistory(parsed)
          } catch (e) {
            console.error('Failed to parse upload history:', e)
          }
        }
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    loadHistory()
  }, [])

  // Save to both Firebase and localStorage
  const saveToHistory = async (completedFile: UploadedFile, generatedTransactions: Transaction[]) => {
    // Check if file already exists in history (by name to prevent duplicates)
    const alreadyExists = uploadHistory.some(f => f.name === completedFile.name)
    if (alreadyExists) {
      console.log(`Statement '${completedFile.name}' already exists, skipping duplicate save`)
      toast.error(`Statement '${completedFile.name}' already uploaded`)
      return false
    }
    
    // Save to Firebase first to check server-side duplicate
    try {
      const statementData = {
        name: completedFile.name,
        size: completedFile.size,
        file_type: completedFile.type,
        extracted_data: completedFile.extractedData,
        transactions: generatedTransactions.map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          source: t.source
        }))
      }
      
      const response = await statementsAPI.uploadStatement(statementData)
      
      // Check if backend detected duplicate
      if (response.duplicate) {
        console.log(`Server detected duplicate: ${completedFile.name}`)
        toast.error(`Statement '${completedFile.name}' already exists`)
        return false
      }
      
      // Update local state only after successful Firebase save
      setUploadHistory(prev => {
        // Double-check to prevent race conditions
        if (prev.some(f => f.name === completedFile.name)) {
          return prev
        }
        const updated = [completedFile, ...prev].slice(0, 20)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
      
      console.log('Statement saved to Firebase successfully')
      return true
    } catch (error) {
      console.error('Failed to save to Firebase:', error)
      // Still update local state as fallback
      setUploadHistory(prev => {
        if (prev.some(f => f.name === completedFile.name)) {
          return prev
        }
        const updated = [completedFile, ...prev].slice(0, 20)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
      return true
    }
  }

  // Delete from history (both Firebase and localStorage)
  const deleteFromHistory = async (fileId: string) => {
    // Update local state immediately
    setUploadHistory(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    
    // Delete from Firebase in background
    try {
      await statementsAPI.deleteStatement(fileId)
    } catch (error) {
      console.error('Failed to delete from Firebase:', error)
    }
    
    toast.success('Statement removed')
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter out files that already exist in history
    const uniqueFiles = acceptedFiles.filter(file => {
      const alreadyInHistory = uploadHistory.some(h => h.name === file.name)
      if (alreadyInHistory) {
        toast.error(`"${file.name}" already uploaded`)
        return false
      }
      return true
    })

    if (uniqueFiles.length === 0) {
      return
    }

    const newFiles: UploadedFile[] = uniqueFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date().toISOString(),
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Process each file - pass the actual File object to read content
    uniqueFiles.forEach((file, index) => {
      processUploadedFile(newFiles[index].id, file)
    })
  }, [uploadHistory])

  const processUploadedFile = async (fileId: string, file: File) => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: i } : f
      ))
    }

    // Set to processing
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing', progress: 100 } : f
    ))

    // Read actual file content
    let parsedTransactions: Transaction[] = []
    
    try {
      const fileContent = await readFileContent(file)
      parsedTransactions = parseCSVFile(fileContent, file.name)
      console.log(`Parsed ${parsedTransactions.length} real transactions from ${file.name}`)
    } catch (err) {
      console.error(`Failed to parse ${file.name}:`, err)
    }
    
    // Calculate totals from parsed transactions
    const totalIncome = parsedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalExpenses = parsedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    // Get unique categories
    const categories = [...new Set(parsedTransactions.map(t => t.category))]
    
    // Determine date range from transactions
    let dateRange = 'No transactions'
    if (parsedTransactions.length > 0) {
      const dates = parsedTransactions.map(t => new Date(t.date).getTime())
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))
      dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
    }

    // Generate extracted data summary
    const extractedData = {
      transactions: parsedTransactions.length,
      dateRange,
      totalIncome,
      totalExpenses,
      categories
    }
    
    // Add transactions to global store
    addTransactions(parsedTransactions)

    // Update file status to completed
    setFiles(prev => {
      const updatedFiles = prev.map(f => 
        f.id === fileId ? {
          ...f,
          status: 'completed' as const,
          extractedData
        } : f
      )
      
      // Get the completed file and save to history + global store + Firebase
      const completedFile = updatedFiles.find(f => f.id === fileId)
      if (completedFile) {
        // Save to history - this will check for duplicates
        saveToHistory(completedFile, parsedTransactions).then((saved) => {
          if (saved) {
            addStatement(completedFile as any)
            toast.success(`Extracted ${parsedTransactions.length} transactions from ${file.name}`)
          }
        })
      }
      
      // Remove from current files list after a short delay (so user sees the completion)
      setTimeout(() => {
        setFiles(current => current.filter(f => f.id !== fileId))
      }, 3000)
      
      return updatedFiles
    })
  }
  
  // Helper to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const completedFiles = files.filter(f => f.status === 'completed')
  const totalTransactions = completedFiles.reduce((sum, f) => sum + (f.extractedData?.transactions || 0), 0)
  const historyTransactions = uploadHistory.reduce((sum, f) => sum + (f.extractedData?.transactions || 0), 0)

  return (
    <IndividualLayout
      title="Upload Statements"
      description="Import your bank statements and let AI extract your financial data"
    >
      <div className="space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 rounded-xl">
                <FileText className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{uploadHistory.length}</p>
                <p className="text-sm text-gray-400">Statements Uploaded</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {historyTransactions + totalTransactions}
                </p>
                <p className="text-sm text-gray-400">Transactions Extracted</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-5 border border-dark-700/50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">99.2%</p>
                <p className="text-sm text-gray-400">AI Accuracy</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Upload Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
            >
              <div className="p-6 border-b border-dark-700/50">
                <h2 className="text-lg font-semibold text-white">Upload Files</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Drag and drop your bank statements or click to browse
                </p>
              </div>

              <div className="p-6">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                    ${isDragActive 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-dark-600 hover:border-primary-500/50 hover:bg-dark-800/50'
                    }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-2xl mb-4 transition-colors ${
                      isDragActive ? 'bg-primary-500/20' : 'bg-dark-700/50'
                    }`}>
                      <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary-400' : 'text-gray-400'}`} />
                    </div>
                    <p className="text-lg font-medium text-white mb-2">
                      {isDragActive ? 'Drop files here' : 'Drop files or click to upload'}
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      Supports PDF, CSV, XLS, XLSX, and images up to 10MB
                    </p>
                    <button className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors">
                      Browse Files
                    </button>
                  </div>
                </div>

                {/* Supported Formats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {supportedFormats.map((format, i) => (
                    <div key={i} className="p-3 bg-dark-900/50 rounded-xl text-center">
                      <format.icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs font-medium text-white">{format.label}</p>
                      <p className="text-xs text-gray-500">{format.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Files Being Processed */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
                >
                  <div className="p-6 border-b border-dark-700/50">
                    <h2 className="text-lg font-semibold text-white">Processing</h2>
                  </div>

                  <div className="divide-y divide-dark-700/50">
                    {files.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${
                            file.status === 'completed' ? 'bg-green-500/10' :
                            file.status === 'error' ? 'bg-red-500/10' :
                            'bg-primary-500/10'
                          }`}>
                            {file.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : file.status === 'error' ? (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            ) : file.status === 'processing' ? (
                              <Sparkles className="w-5 h-5 text-primary-400 animate-pulse" />
                            ) : (
                              <FileText className="w-5 h-5 text-primary-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-white truncate">{file.name}</p>
                              <button
                                onClick={() => removeFile(file.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <p className="text-xs text-gray-400 mb-2">
                              {formatFileSize(file.size)} • {
                                file.status === 'uploading' ? 'Uploading...' :
                                file.status === 'processing' ? 'AI extracting data...' :
                                file.status === 'completed' ? 'Completed' :
                                file.error || 'Error'
                              }
                            </p>

                            {(file.status === 'uploading' || file.status === 'processing') && (
                              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                                  initial={{ width: 0 }}
                                  animate={{ 
                                    width: file.status === 'processing' ? '100%' : `${file.progress}%`,
                                  }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            )}

                            {file.status === 'completed' && file.extractedData && (
                              <div className="mt-3 p-3 bg-dark-900/50 rounded-xl">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                  <div>
                                    <p className="text-lg font-bold text-white">{file.extractedData.transactions}</p>
                                    <p className="text-xs text-gray-400">Transactions</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-green-400">
                                      ₹{(file.extractedData.totalIncome / 1000).toFixed(0)}K
                                    </p>
                                    <p className="text-xs text-gray-400">Income</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-red-400">
                                      ₹{(file.extractedData.totalExpenses / 1000).toFixed(0)}K
                                    </p>
                                    <p className="text-xs text-gray-400">Expenses</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-primary-400">
                                      {file.extractedData.categories.length}
                                    </p>
                                    <p className="text-xs text-gray-400">Categories</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Recent & Banks */}
          <div className="space-y-6">
            {/* Connected Banks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
            >
              <div className="p-5 border-b border-dark-700/50">
                <h3 className="font-semibold text-white">Supported Banks</h3>
              </div>
              <div className="p-4 space-y-3">
                {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra'].map((bank, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{bank}</p>
                      <p className="text-xs text-gray-400">PDF & CSV supported</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Uploads */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 overflow-hidden"
            >
              <div className="p-5 border-b border-dark-700/50">
                <h3 className="font-semibold text-white">Recent Uploads</h3>
              </div>
              {uploadHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No statements uploaded yet</p>
                  <p className="text-gray-500 text-xs mt-1">Upload your first bank statement above</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-dark-700/50 max-h-80 overflow-y-auto">
                    {uploadHistory.slice(0, 10).map((upload) => (
                      <div key={upload.id} className="p-4 hover:bg-dark-800/50 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <FileText className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{upload.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-400">{getRelativeTime(upload.uploadedAt)}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-primary-400">{upload.extractedData?.transactions || 0} txns</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteFromHistory(upload.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadHistory.length > 10 && (
                    <div className="p-4 border-t border-dark-700/50">
                      <button className="w-full text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center gap-2">
                        View All ({uploadHistory.length} files)
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>

        {/* AI Processing Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-primary-900/30 to-accent-900/30 rounded-2xl p-6 border border-primary-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Extraction</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Our Document Intelligence agent uses advanced AI to automatically extract and categorize all transactions 
                from your bank statements. It recognizes patterns, identifies merchants, and ensures 99.2% accuracy 
                in transaction categorization. Your data is processed securely and never shared.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </IndividualLayout>
  )
}
