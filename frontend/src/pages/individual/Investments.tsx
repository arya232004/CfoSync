import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Sparkles,
  Wallet,
  Globe,
  Upload,
  X,
  Shield,
  Loader2,
  AlertTriangle,
  Trash2,
  AlertCircle,
  Zap,
  LineChart,
  Activity,
  FileText,
  File,
  Check
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { useSettingsStore, formatCurrency as globalFormatCurrency } from '../../lib/store'
import { investmentsAPI, PortfolioHolding, InvestmentRecommendationItem, StockData } from '../../services/aiService'
import IndividualLayout from '../../components/layouts/IndividualLayout'

// Popular stocks to show by default
const TRENDING_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM']
const SECTOR_ETFS = ['SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLK', 'XLE', 'XLV']

export default function Investments() {
  const { user } = useAuthStore()
  const { currency } = useSettingsStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Portfolio data (optional)
  const [hasPortfolio, setHasPortfolio] = useState(false)
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [riskTolerance, setRiskTolerance] = useState('moderate')
  
  // Market data (always loaded)
  const [trendingStocks, setTrendingStocks] = useState<Record<string, StockData>>({})
  const [marketIndices, setMarketIndices] = useState<Record<string, StockData>>({})
  const [loadingMarket, setLoadingMarket] = useState(true)
  
  // Analysis & Recommendations (A2A data)
  const [recommendations, setRecommendations] = useState<InvestmentRecommendationItem[]>([])
  const [sectorAllocation, setSectorAllocation] = useState<Record<string, number>>({})
  const [riskAssessment, setRiskAssessment] = useState<{
    risk_score: number
    risk_level: string
    concentration_risks: Array<{ sector: string; percentage: number; severity: string }>
    volatility_risks: Array<{ symbol: string; volatility: number; severity: string }>
  } | null>(null)
  const [hedgingStrategies, setHedgingStrategies] = useState<Array<{
    type: string
    sector?: string
    instruments: string[]
    reason: string
  }>>([])
  const [diversificationScore, setDiversificationScore] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  
  // UI State
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchSymbol, setSearchSymbol] = useState('')
  const [searchResult, setSearchResult] = useState<StockData | null>(null)
  const [searching, setSearching] = useState(false)
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    shares: '',
    purchase_price: '',
    purchase_date: ''
  })
  const [uploadText, setUploadText] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileParseError, setFileParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load market data (always)
  const loadMarketData = async () => {
    setLoadingMarket(true)
    try {
      // Load trending stocks
      const trendingResult = await investmentsAPI.getStockData(TRENDING_STOCKS)
      if (trendingResult.hasData) {
        setTrendingStocks(trendingResult.stocks)
      }
      
      // Load market indices/ETFs
      const indicesResult = await investmentsAPI.getStockData(SECTOR_ETFS)
      if (indicesResult.hasData) {
        setMarketIndices(indicesResult.stocks)
      }
      
      // Load general recommendations
      await loadGeneralRecommendations()
    } catch (err) {
      console.error('Failed to load market data:', err)
    } finally {
      setLoadingMarket(false)
    }
  }

  // Load portfolio (if exists)
  const loadPortfolio = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    
    try {
      const result = await investmentsAPI.getPortfolio()
      setHasPortfolio(result.hasData)
      
      if (result.hasData && result.portfolio) {
        setHoldings(result.portfolio.holdings || [])
        setTotalValue(result.portfolio.totalValue || 0)
        setTotalCost(result.portfolio.totalCost || 0)
        setTotalGainLoss(result.portfolio.totalGainLoss || 0)
        setTotalGainLossPercent(result.portfolio.totalGainLossPercent || 0)
        setRiskTolerance(result.portfolio.riskTolerance || 'moderate')
        
        // If portfolio exists, switch to portfolio tab
        if (result.portfolio.holdings?.length > 0) {
          setActiveTab('portfolio')
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err)
    } finally {
      setRefreshing(false)
    }
  }

  // Load AI-powered investment recommendations (works without portfolio too)
  const loadGeneralRecommendations = async () => {
    try {
      // Try to get recommendations from backend (uses real market data)
      const result = await investmentsAPI.getRecommendations()
      if (result.hasData && result.recommendations?.length > 0) {
        setRecommendations(result.recommendations)
      } else {
        // Fallback to general recommendations if API fails
        const generalRecs: InvestmentRecommendationItem[] = [
          {
            type: 'buy',
            title: 'Consider Index Funds',
            description: 'S&P 500 index funds (SPY, VOO) provide diversified exposure to the US market with low fees.',
            reason: 'Long-term growth with minimal management',
            priority: 'high'
          },
          {
            type: 'diversify',
            title: 'Diversify Across Sectors',
            description: 'Spread investments across Technology, Healthcare, Financials, and Consumer sectors to reduce risk.',
            reason: 'Reduces portfolio volatility',
            priority: 'medium'
          },
          {
            type: 'hold',
            title: 'Dollar-Cost Averaging',
            description: 'Invest a fixed amount regularly regardless of market conditions to average out your purchase price.',
            reason: 'Reduces timing risk',
            priority: 'medium'
          },
          {
            type: 'hedge',
            title: 'Consider Bonds for Stability',
            description: 'Allocate 20-40% to bonds (BND, AGG) if you have a conservative risk profile.',
            reason: 'Provides income and reduces volatility',
            priority: 'low'
          }
        ]
        setRecommendations(generalRecs)
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      // Fallback recommendations
      setRecommendations([
        {
          type: 'buy',
          title: 'Start with Index Funds',
          description: 'Consider SPY or VOO for broad market exposure with low fees.',
          reason: 'Best starting point for new investors',
          priority: 'high'
        }
      ])
    }
  }

  // Analyze portfolio with AI (A2A enabled)
  const analyzePortfolio = async () => {
    if (!hasPortfolio) return
    setAnalyzing(true)
    
    try {
      const result = await investmentsAPI.analyzePortfolio(riskTolerance, true)
      console.log('Portfolio analysis result:', result)
      
      if (result.hasData) {
        // Set recommendations
        if (result.recommendations?.length) {
          setRecommendations(result.recommendations)
        }
        
        // Set sector allocation from A2A analysis
        const sectors = result.analysis?.sectorAllocation || {}
        console.log('Sector allocation:', sectors)
        setSectorAllocation(sectors)
        
        // Set risk assessment from A2A
        if (result.analysis?.riskAssessment) {
          setRiskAssessment(result.analysis.riskAssessment)
        }
        
        // Set hedging strategies from A2A
        if (result.analysis?.hedgingStrategies) {
          setHedgingStrategies(result.analysis.hedgingStrategies)
        }
        
        // Set diversification score
        if (result.analysis?.diversificationScore !== undefined) {
          setDiversificationScore(result.analysis.diversificationScore)
        }
      }
    } catch (err) {
      console.error('Failed to analyze portfolio:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  // Search for a stock
  const searchStock = async () => {
    if (!searchSymbol.trim()) return
    setSearching(true)
    setSearchResult(null)
    
    try {
      const result = await investmentsAPI.getStockData([searchSymbol.toUpperCase()])
      if (result.hasData && result.stocks[searchSymbol.toUpperCase()]) {
        setSearchResult(result.stocks[searchSymbol.toUpperCase()])
      }
    } catch (err) {
      console.error('Failed to search stock:', err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true)
      await Promise.all([loadMarketData(), loadPortfolio()])
      setLoading(false)
    }
    initLoad()
  }, [user?.id])

  useEffect(() => {
    if (hasPortfolio && holdings.length > 0) {
      analyzePortfolio()
    }
  }, [hasPortfolio, holdings.length])

  // Use global formatCurrency with real exchange rate conversion
  const formatCurrency = (value: number) => globalFormatCurrency(value, currency)

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const handleAddHolding = async () => {
    if (!newHolding.symbol || !newHolding.shares || !newHolding.purchase_price) {
      alert('Please fill in symbol, shares, and purchase price')
      return
    }
    
    setSaving(true)
    try {
      const holding: PortfolioHolding = {
        symbol: newHolding.symbol.toUpperCase(),
        shares: parseFloat(newHolding.shares),
        purchase_price: parseFloat(newHolding.purchase_price),
        purchase_date: newHolding.purchase_date || undefined
      }
      
      await investmentsAPI.addHolding(holding)
      setShowAddModal(false)
      setNewHolding({ symbol: '', shares: '', purchase_price: '', purchase_date: '' })
      await loadPortfolio(true)
      setActiveTab('portfolio')
    } catch (err) {
      console.error('Failed to add holding:', err)
      alert('Failed to add holding. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveHolding = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from your portfolio?`)) return
    
    try {
      await investmentsAPI.removeHolding(symbol)
      await loadPortfolio(true)
    } catch (err) {
      console.error('Failed to remove holding:', err)
      alert('Failed to remove holding. Please try again.')
    }
  }

  const handleClearPortfolio = async () => {
    if (!confirm('Are you sure you want to clear your entire portfolio? This cannot be undone.')) return
    
    setRefreshing(true)
    try {
      await investmentsAPI.clearPortfolio()
      await loadPortfolio(true)
      setRecommendations([])
      setSectorAllocation({})
      setRiskAssessment(null)
      setHedgingStrategies([])
      setDiversificationScore(0)
    } catch (err) {
      console.error('Failed to clear portfolio:', err)
      alert('Failed to clear portfolio. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  // Parse CSV file content
  const parseCSVContent = (content: string): PortfolioHolding[] => {
    const lines = content.trim().split('\n')
    const holdings: PortfolioHolding[] = []
    
    // Skip header row if it exists
    const startIndex = lines.length > 0 && 
      (lines[0].toLowerCase().includes('symbol') || 
       lines[0].toLowerCase().includes('ticker') ||
       lines[0].toLowerCase().includes('stock')) ? 1 : 0
    
    // Try to detect column positions from header
    let symbolCol = 0, sharesCol = 1, priceCol = 2, dateCol = -1
    if (startIndex === 1) {
      const headerCols = lines[0].toLowerCase().split(',').map(h => h.trim())
      headerCols.forEach((col, idx) => {
        if (col.includes('symbol') || col.includes('ticker') || col.includes('stock')) symbolCol = idx
        if (col.includes('share') || col.includes('quantity') || col.includes('qty') || col.includes('units')) sharesCol = idx
        // Be more specific about price column - exclude date columns
        if ((col.includes('price') || col.includes('cost') || col.includes('avg')) && !col.includes('date')) priceCol = idx
        // Detect date column to avoid mixing with price
        if (col.includes('date') || col.includes('purchased') || col.includes('bought')) dateCol = idx
      })
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
      
      if (parts.length >= 3) {
        const symbol = parts[symbolCol]?.toUpperCase().replace(/[^A-Z]/g, '')
        const shares = parseFloat(parts[sharesCol]?.replace(/[^0-9.]/g, '') || '0')
        let price = parseFloat(parts[priceCol]?.replace(/[^0-9.]/g, '') || '0')
        
        // Validate price is reasonable (not a date disguised as number)
        // Dates like 20221014 (YYYYMMDD) would be > 10000000
        // Most stock prices are < $10,000 per share
        if (price > 10000) {
          console.warn(`Warning: Unusually high price detected for ${symbol}: $${price}. This might be a date value. Please check your CSV format.`)
          // Try to find a reasonable price in other columns
          for (let col = 0; col < parts.length; col++) {
            if (col !== symbolCol && col !== sharesCol && col !== dateCol) {
              const possiblePrice = parseFloat(parts[col]?.replace(/[^0-9.]/g, '') || '0')
              if (possiblePrice > 0 && possiblePrice < 10000) {
                price = possiblePrice
                console.log(`Using column ${col} as price: $${price}`)
                break
              }
            }
          }
          // If still too high, it's likely an error
          if (price > 10000) {
            console.error(`Skipping ${symbol}: Price $${price} seems invalid (possibly a date?)`)
            continue
          }
        }
        
        if (symbol && !isNaN(shares) && !isNaN(price) && shares > 0 && price > 0) {
          holdings.push({ symbol, shares, purchase_price: price })
        }
      }
    }
    
    return holdings
  }

  // Parse text content to holdings
  const parseTextContent = (content: string): PortfolioHolding[] => {
    const lines = content.trim().split('\n')
    const holdings: PortfolioHolding[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      
      let parts: string[] = []
      if (trimmed.includes(',')) {
        parts = trimmed.split(',').map(p => p.trim())
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|').map(p => p.trim())
      } else if (trimmed.includes('\t')) {
        parts = trimmed.split('\t').map(p => p.trim())
      } else {
        parts = trimmed.split(/\s+/)
      }
      
      if (parts.length >= 3) {
        const symbol = parts[0].toUpperCase().replace(/[^A-Z]/g, '')
        const shares = parseFloat(parts[1].replace(/[^0-9.]/g, ''))
        const price = parseFloat(parts[2].replace(/[^0-9.]/g, ''))
        
        if (symbol && !isNaN(shares) && !isNaN(price) && shares > 0 && price > 0) {
          holdings.push({ symbol, shares, purchase_price: price })
        }
      }
    }
    
    return holdings
  }

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setFileParseError(null)
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'text/csv' || 
          file.name.endsWith('.csv') || 
          file.type === 'application/pdf' ||
          file.name.endsWith('.pdf') ||
          file.type === 'text/plain' ||
          file.name.endsWith('.txt')) {
        handleFileSelect(file)
      } else {
        setFileParseError('Please upload a CSV, TXT, or PDF file')
      }
    }
  }

  // Parse file and upload
  const parseFileAndUpload = async () => {
    if (!selectedFile) {
      setFileParseError('Please select a file')
      return
    }
    
    setSaving(true)
    setFileParseError(null)
    
    try {
      let holdings: PortfolioHolding[] = []
      
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        // For PDF, we'll try to extract text - this is basic extraction
        // In a real app, you'd want a backend endpoint for better PDF parsing
        setFileParseError('PDF parsing is basic. For best results, use CSV format.')
        
        // Try using FileReader with PDF.js if available, otherwise show error
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = async (e) => {
            try {
              // Basic text extraction - PDFs are binary, so this may not work well
              // For production, recommend sending to backend with proper PDF parser
              const content = e.target?.result as string
              // Look for patterns like "AAPL 100 150.00" in the content
              resolve(content || '')
            } catch {
              reject(new Error('Could not read PDF'))
            }
          }
          reader.onerror = () => reject(new Error('Could not read file'))
          reader.readAsText(selectedFile)
        })
        
        holdings = parseTextContent(text)
        
        if (holdings.length === 0) {
          setFileParseError('Could not extract portfolio data from PDF. Please use CSV format or enter data manually.')
          setSaving(false)
          return
        }
      } else {
        // CSV or TXT file
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string || '')
          reader.onerror = () => reject(new Error('Could not read file'))
          reader.readAsText(selectedFile)
        })
        
        if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
          holdings = parseCSVContent(text)
        } else {
          holdings = parseTextContent(text)
        }
      }
      
      if (holdings.length === 0) {
        setFileParseError('Could not parse any holdings from file. Expected format:\nSymbol,Shares,Price\nAAPL,50,175.50\n\nNote: Price should be per-share cost, NOT total value or dates.')
        setSaving(false)
        return
      }
      
      // Show what we parsed for confirmation
      console.log('Parsed holdings:', holdings)
      
      const result = await investmentsAPI.savePortfolio(holdings, riskTolerance)
      
      // Check for warnings from server
      if (result.warnings && result.warnings.length > 0) {
        setFileParseError(`Saved ${result.holdingsCount} holdings. Warnings:\n${result.warnings.join('\n')}`)
      }
      
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadText('')
      await loadPortfolio(true)
      setActiveTab('portfolio')
    } catch (err: any) {
      console.error('Failed to parse and upload file:', err)
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error'
      setFileParseError(`Failed to process file: ${errorMessage}\n\nExpected format:\nSymbol,Shares,Price (per share)\nAAPL,50,175.50`)
    } finally {
      setSaving(false)
    }
  }

  const parseAndUploadPortfolio = async () => {
    // If file mode and file selected, use file parsing
    if (uploadMode === 'file' && selectedFile) {
      await parseFileAndUpload()
      return
    }
    
    // Otherwise use text parsing
    if (!uploadText.trim()) {
      alert('Please enter your portfolio data or upload a file')
      return
    }
    
    setSaving(true)
    try {
      const holdings = parseTextContent(uploadText)
      
      if (holdings.length === 0) {
        alert('Could not parse any holdings. Use format: SYMBOL SHARES PRICE (one per line)')
        setSaving(false)
        return
      }
      
      await investmentsAPI.savePortfolio(holdings, riskTolerance)
      setShowUploadModal(false)
      setUploadText('')
      await loadPortfolio(true)
      setActiveTab('portfolio')
    } catch (err) {
      console.error('Failed to upload portfolio:', err)
      alert('Failed to upload portfolio. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Reset modal state when closing
  const closeUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFile(null)
    setUploadText('')
    setUploadMode('file')
    setFileParseError(null)
  }

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'sell': return 'bg-red-500/10 border-red-500/30 text-red-400'
      case 'hold': return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      case 'rebalance': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      case 'hedge': return 'bg-purple-500/10 border-purple-500/30 text-purple-400'
      case 'diversify': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
      default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp className="w-4 h-4" />
      case 'sell': return <TrendingDown className="w-4 h-4" />
      case 'hold': return <Shield className="w-4 h-4" />
      case 'rebalance': return <Activity className="w-4 h-4" />
      case 'hedge': return <Shield className="w-4 h-4" />
      case 'diversify': return <PieChart className="w-4 h-4" />
      default: return <Zap className="w-4 h-4" />
    }
  }

  const refreshAll = async () => {
    setRefreshing(true)
    await Promise.all([loadMarketData(), loadPortfolio(true)])
    setRefreshing(false)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <button 
        onClick={refreshAll} 
        disabled={refreshing}
        className="btn-secondary px-4 py-2 flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
      <Link to="/individual/chat" className="btn-primary px-4 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Advisor
      </Link>
    </div>
  )

  if (loading) {
    return (
      <IndividualLayout title="Investments" description="Real-time market data & portfolio tracking" headerActions={headerActions}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading market data...</p>
          </div>
        </div>
      </IndividualLayout>
    )
  }

  return (
    <IndividualLayout
      title="Investments"
      description="Real-time market data & portfolio tracking"
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-dark-800/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'market'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Market Overview
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'portfolio'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            My Portfolio
            {hasPortfolio && <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{holdings.length}</span>}
          </button>
        </div>

        {/* Stock Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchSymbol}
                onChange={e => setSearchSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && searchStock()}
                placeholder="Search any stock symbol (e.g., AAPL, TSLA, MSFT)"
                className="input-field w-full pl-10"
              />
              <LineChart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
            <button
              onClick={searchStock}
              disabled={searching || !searchSymbol.trim()}
              className="btn-primary px-6 flex items-center gap-2"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Search
            </button>
          </div>
          
          {/* Search Result */}
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-dark-800/50 rounded-xl border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xl text-white">{searchResult.symbol}</span>
                    <span className="text-gray-400">{searchResult.name}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-2xl font-bold text-white">{formatCurrency(searchResult.current_price)}</span>
                    <span className={`flex items-center gap-1 ${searchResult.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {searchResult.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {formatPercent(searchResult.change_percent)}
                    </span>
                  </div>
                  {searchResult.sector && (
                    <span className="text-sm text-gray-500 mt-1 inline-block">Sector: {searchResult.sector}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setNewHolding({ ...newHolding, symbol: searchResult.symbol || '' })
                    setShowAddModal(true)
                  }}
                  className="btn-secondary px-4 py-2 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Portfolio
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Market Overview Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            {/* Market Indices */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Market Indices & ETFs
              </h2>
              
              {loadingMarket ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(marketIndices).map(([symbol, data]) => (
                    <div key={symbol} className="p-4 bg-dark-800/50 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-medium text-white">{symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${data.change_percent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {formatPercent(data.change_percent)}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-white">{formatCurrency(data.current_price)}</p>
                      <p className="text-xs text-gray-500 mt-1">{data.name || symbol}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Trending Stocks */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Trending Stocks
              </h2>
              
              {loadingMarket ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 text-sm font-medium pb-3">Symbol</th>
                        <th className="text-left text-gray-400 text-sm font-medium pb-3">Name</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-3">Price</th>
                        <th className="text-right text-gray-400 text-sm font-medium pb-3">Change</th>
                        <th className="text-center text-gray-400 text-sm font-medium pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(trendingStocks).map(([symbol, data], index) => (
                        <motion.tr
                          key={symbol}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="py-3">
                            <span className="font-mono font-medium text-white">{symbol}</span>
                          </td>
                          <td className="py-3 text-gray-400">{data.name || symbol}</td>
                          <td className="py-3 text-right text-white font-medium">{formatCurrency(data.current_price)}</td>
                          <td className="py-3 text-right">
                            <span className={`flex items-center justify-end gap-1 ${data.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {data.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {formatPercent(data.change_percent)}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => {
                                setNewHolding({ ...newHolding, symbol })
                                setShowAddModal(true)
                              }}
                              className="text-primary-400 hover:text-primary-300 text-sm"
                            >
                              + Add
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* AI Recommendations */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Investment Suggestions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border ${getRecommendationColor(rec.type)}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getRecommendationIcon(rec.type)}
                      <span className="text-xs font-medium uppercase">{rec.type}</span>
                      {rec.priority === 'high' && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full ml-auto">High Priority</span>
                      )}
                    </div>
                    <h3 className="text-white font-medium">{rec.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{rec.description}</p>
                    <p className="text-xs text-gray-500 mt-2 italic">{rec.reason}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Portfolio Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-secondary px-4 py-2 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Portfolio
              </button>
              {hasPortfolio && (
                <button
                  onClick={analyzePortfolio}
                  disabled={analyzing}
                  className="btn-secondary px-4 py-2 flex items-center gap-2"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              )}
              {hasPortfolio && (
                <button
                  onClick={handleClearPortfolio}
                  disabled={refreshing}
                  className="btn-secondary px-4 py-2 flex items-center gap-2 text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                  title="Clear all holdings and start fresh"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            {!hasPortfolio ? (
              /* Empty Portfolio State */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
                <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">No Portfolio Yet</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                  Add your stock holdings to track performance, get personalized AI recommendations, and see your sector allocation.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary px-6 py-3 flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Stock
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-secondary px-6 py-3 flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Bulk Upload
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Portfolio View */
              <>
                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:col-span-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                        <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalValue)}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`flex items-center text-sm ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalGainLoss >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {formatCurrency(Math.abs(totalGainLoss))} ({formatPercent(totalGainLossPercent)})
                          </span>
                          <span className="text-gray-500 text-sm">Total gain/loss</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                        <PieChart className="w-8 h-8 text-primary-400" />
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                    <p className="text-gray-400 text-sm">Cost Basis</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalCost)}</p>
                    <p className="text-gray-500 text-sm">Total invested</p>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
                    <p className="text-gray-400 text-sm">Holdings</p>
                    <p className="text-2xl font-bold text-white mt-1">{holdings.length}</p>
                    <p className="text-gray-500 text-sm capitalize">{riskTolerance} risk</p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sector Allocation */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary-400" />
                      Sector Allocation
                    </h2>
                    
                    {Object.keys(sectorAllocation).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(sectorAllocation)
                          .sort(([,a], [,b]) => b - a)
                          .map(([sector, percent], index) => (
                            <div key={sector} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white text-sm">{sector}</span>
                                <span className="text-gray-400 text-sm">{percent}%</span>
                              </div>
                              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.1 }}
                                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Click "Analyze" to see sector breakdown</p>
                      </div>
                    )}
                  </motion.div>

                  {/* AI Recommendations for Portfolio */}
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 lg:col-span-2">
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-accent-400" />
                      Portfolio Recommendations
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommendations.slice(0, 4).map((rec, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-3 rounded-xl border ${getRecommendationColor(rec.type)}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getRecommendationIcon(rec.type)}
                            <span className="text-xs font-medium uppercase">{rec.type}</span>
                            {rec.symbol && <span className="text-xs font-mono ml-auto">{rec.symbol}</span>}
                          </div>
                          <h3 className="text-white font-medium text-sm">{rec.title}</h3>
                          <p className="text-gray-400 text-xs mt-1">{rec.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Risk Assessment & Hedging from A2A */}
                {(riskAssessment || hedgingStrategies.length > 0 || diversificationScore > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Risk Assessment */}
                    {riskAssessment && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          Risk Assessment
                          <span className={`ml-auto text-sm px-2 py-1 rounded-full ${
                            riskAssessment.risk_level === 'LOW' ? 'bg-green-500/20 text-green-400' :
                            riskAssessment.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {riskAssessment.risk_level}
                          </span>
                        </h2>
                        
                        {/* Risk Score Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">Risk Score</span>
                            <span className="text-sm text-white">{riskAssessment.risk_score}/100</span>
                          </div>
                          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${riskAssessment.risk_score}%` }}
                              transition={{ duration: 0.8 }}
                              className={`h-full rounded-full ${
                                riskAssessment.risk_score < 30 ? 'bg-green-500' :
                                riskAssessment.risk_score < 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>
                        
                        {/* Concentration Risks */}
                        {riskAssessment.concentration_risks.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-400 font-medium">Concentration Risks</p>
                            {riskAssessment.concentration_risks.map((risk, idx) => (
                              <div key={idx} className={`p-2 rounded-lg border ${
                                risk.severity === 'HIGH' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-white text-sm">{risk.sector}</span>
                                  <span className={`text-xs ${risk.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {risk.percentage}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Diversification Score */}
                        {diversificationScore > 0 && (
                          <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">Diversification Score</span>
                              <span className="text-primary-400 font-medium">{diversificationScore}/100</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                    
                    {/* Hedging Strategies */}
                    {hedgingStrategies.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-purple-400" />
                          Hedging Strategies
                          <span className="ml-auto text-xs text-gray-400 bg-dark-700 px-2 py-1 rounded">
                            A2A Analysis
                          </span>
                        </h2>
                        
                        <div className="space-y-3">
                          {hedgingStrategies.map((strategy, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium uppercase text-purple-400">{strategy.type}</span>
                                {strategy.sector && (
                                  <span className="text-xs text-gray-400">• {strategy.sector}</span>
                                )}
                              </div>
                              <p className="text-white text-sm">{strategy.reason}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {strategy.instruments.map((inst, i) => (
                                  <span key={i} className="text-xs bg-dark-700 text-gray-300 px-2 py-1 rounded">
                                    {inst}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Holdings Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-400" />
                    Holdings ({holdings.length})
                  </h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-gray-400 text-sm font-medium pb-4">Symbol</th>
                          <th className="text-left text-gray-400 text-sm font-medium pb-4">Name</th>
                          <th className="text-right text-gray-400 text-sm font-medium pb-4">Shares</th>
                          <th className="text-right text-gray-400 text-sm font-medium pb-4">Avg Cost</th>
                          <th className="text-right text-gray-400 text-sm font-medium pb-4">Current</th>
                          <th className="text-right text-gray-400 text-sm font-medium pb-4">Value</th>
                          <th className="text-right text-gray-400 text-sm font-medium pb-4">Gain/Loss</th>
                          <th className="text-center text-gray-400 text-sm font-medium pb-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((holding, index) => (
                          <motion.tr
                            key={holding.symbol}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td className="py-4">
                              <span className="font-mono font-medium text-white">{holding.symbol}</span>
                            </td>
                            <td className="py-4 text-gray-400">
                              {holding.company_name || holding.name || holding.symbol}
                            </td>
                            <td className="py-4 text-right text-white">{holding.shares}</td>
                            <td className="py-4 text-right text-gray-400">
                              {formatCurrency(holding.purchase_price)}
                            </td>
                            <td className="py-4 text-right text-white">
                              {holding.current_price ? formatCurrency(holding.current_price) : '-'}
                            </td>
                            <td className="py-4 text-right text-white font-medium">
                              {holding.current_value ? formatCurrency(holding.current_value) : formatCurrency(holding.shares * holding.purchase_price)}
                            </td>
                            <td className="py-4 text-right">
                              {holding.gain_loss !== undefined ? (
                                <div className={`flex items-center justify-end gap-1 ${holding.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {holding.gain_loss >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                  <span>{formatPercent(holding.gain_loss_percent || 0)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-4 text-center">
                              <button
                                onClick={() => handleRemoveHolding(holding.symbol)}
                                className="text-red-400 hover:text-red-300 p-2"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Add Stock to Portfolio</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Stock Symbol *</label>
                  <input
                    type="text"
                    value={newHolding.symbol}
                    onChange={e => setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })}
                    placeholder="AAPL"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Number of Shares *</label>
                  <input
                    type="number"
                    value={newHolding.shares}
                    onChange={e => setNewHolding({ ...newHolding, shares: e.target.value })}
                    placeholder="10"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Purchase Price per Share *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newHolding.purchase_price}
                    onChange={e => setNewHolding({ ...newHolding, purchase_price: e.target.value })}
                    placeholder="150.00"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Purchase Date (optional)</label>
                  <input
                    type="date"
                    value={newHolding.purchase_date}
                    onChange={e => setNewHolding({ ...newHolding, purchase_date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                
                <button
                  onClick={handleAddHolding}
                  disabled={saving}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Adding...' : 'Add to Portfolio'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Portfolio Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeUploadModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Upload Portfolio</h3>
                <button onClick={closeUploadModal} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Upload Mode Toggle */}
                <div className="flex rounded-lg bg-dark-800 p-1">
                  <button
                    onClick={() => setUploadMode('file')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      uploadMode === 'file' 
                        ? 'bg-primary-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <File className="w-4 h-4" />
                      Upload File
                    </div>
                  </button>
                  <button
                    onClick={() => setUploadMode('text')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      uploadMode === 'text' 
                        ? 'bg-primary-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Enter Text
                    </div>
                  </button>
                </div>

                {/* File Upload Mode */}
                {uploadMode === 'file' && (
                  <div className="space-y-4">
                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center ${
                        isDragging 
                          ? 'border-primary-500 bg-primary-500/10' 
                          : selectedFile 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-white/20 hover:border-primary-500/50 hover:bg-dark-700'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.pdf"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      
                      {selectedFile ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center">
                            <div className="p-3 rounded-full bg-green-500/20">
                              <Check className="w-6 h-6 text-green-400" />
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-medium">{selectedFile.name}</p>
                            <p className="text-gray-400 text-sm">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                            }}
                            className="text-red-400 text-sm hover:text-red-300"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center">
                            <div className="p-3 rounded-full bg-primary-500/20">
                              <Upload className="w-6 h-6 text-primary-400" />
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {isDragging ? 'Drop your file here' : 'Click to upload or drag & drop'}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              Supports CSV, TXT, or PDF files
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File Format Help */}
                    <div className="p-4 bg-dark-800 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-400 mb-2">
                        <span className="text-white font-medium">CSV Format:</span> Include columns for Symbol, Shares, and Price
                      </p>
                      <pre className="text-xs text-gray-500 bg-dark-900 p-2 rounded mt-2">Symbol,Shares,Price
AAPL,10,150.00
MSFT,5,380.50</pre>
                    </div>

                    {/* Error Message */}
                    {fileParseError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{fileParseError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Input Mode */}
                {uploadMode === 'text' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-dark-800 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-400 mb-2">
                        Enter holdings, one per line: <span className="text-white">SYMBOL SHARES PRICE</span>
                      </p>
                      <pre className="text-xs text-gray-500 mt-1">AAPL 10 150.00
MSFT 5 380.50
GOOGL 3 140.00</pre>
                    </div>
                    
                    <textarea
                      value={uploadText}
                      onChange={e => setUploadText(e.target.value)}
                      placeholder="AAPL 10 150.00&#10;MSFT 5 380.50&#10;..."
                      className="input-field w-full h-40 font-mono text-sm"
                    />
                  </div>
                )}
                
                {/* Risk Tolerance */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Risk Tolerance</label>
                  <select
                    value={riskTolerance}
                    onChange={e => setRiskTolerance(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={parseAndUploadPortfolio}
                  disabled={saving || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !uploadText.trim())}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {saving ? 'Processing...' : 'Upload Portfolio'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </IndividualLayout>
  )
}
