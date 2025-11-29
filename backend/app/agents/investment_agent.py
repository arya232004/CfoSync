"""Investment Analysis Agent with real-time market data, portfolio recommendations, and A2A protocol."""

import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from google.adk import Agent
from google.adk.tools import FunctionTool

# Try to import yfinance, fallback gracefully if not available
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    print("Warning: yfinance not installed. Install with: pip install yfinance")


# ─────────────────────────────────────────────────────────────
# A2A Protocol - Agent-to-Agent Communication
# ─────────────────────────────────────────────────────────────

class A2AProtocol:
    """Agent-to-Agent communication protocol for coordinated analysis."""
    
    @staticmethod
    async def request_risk_analysis(portfolio_data: dict, user_context: dict = None) -> dict:
        """Request portfolio risk analysis from Risk Agent.
        
        Args:
            portfolio_data: Portfolio with holdings and values
            user_context: Additional user context (risk tolerance, goals, etc.)
        
        Returns:
            Risk analysis from Risk Agent
        """
        try:
            # Import risk agent functions
            from app.agents.risk_agent import assess_debt_risk, detect_unusual_transactions
            
            holdings = portfolio_data.get("holdings", [])
            total_value = portfolio_data.get("total_value", 0)
            sectors = portfolio_data.get("sectors", {})
            
            # Analyze concentration risk
            concentration_risks = []
            for sector, value in sectors.items():
                pct = (value / total_value * 100) if total_value > 0 else 0
                if pct > 30:
                    concentration_risks.append({
                        "sector": sector,
                        "percentage": round(pct, 1),
                        "severity": "HIGH" if pct > 50 else "MEDIUM",
                        "recommendation": f"Consider reducing {sector} exposure below 30%"
                    })
            
            # Analyze volatility risk
            volatility_risks = []
            for holding in holdings:
                if holding.get("volatility", 0) > 0.03:  # High volatility
                    volatility_risks.append({
                        "symbol": holding.get("symbol"),
                        "volatility": round(holding.get("volatility", 0) * 100, 2),
                        "severity": "HIGH" if holding.get("volatility", 0) > 0.05 else "MEDIUM"
                    })
            
            # Calculate overall portfolio risk score
            risk_score = min(100, len(concentration_risks) * 20 + len(volatility_risks) * 10)
            risk_level = "LOW" if risk_score < 30 else "MEDIUM" if risk_score < 60 else "HIGH"
            
            return {
                "source_agent": "risk_agent",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "concentration_risks": concentration_risks,
                "volatility_risks": volatility_risks,
                "recommendations": [
                    {"type": "diversify", "message": f"Current diversification score: {100 - risk_score}/100"}
                ],
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e), "source_agent": "risk_agent"}
    
    @staticmethod
    async def request_hedging_strategies(portfolio_data: dict, market_conditions: dict = None) -> dict:
        """Request hedging strategies based on portfolio exposure.
        
        Args:
            portfolio_data: Portfolio analysis data
            market_conditions: Current market conditions
        
        Returns:
            Hedging recommendations
        """
        try:
            sectors = portfolio_data.get("sectors", {})
            total_value = portfolio_data.get("total_value", 0)
            
            hedging_strategies = []
            
            # Sector-based hedging
            for sector, value in sectors.items():
                pct = (value / total_value * 100) if total_value > 0 else 0
                if pct > 25:
                    # Suggest sector-specific hedges
                    hedge_etfs = {
                        "Technology": ["SQQQ", "PSQ"],  # Inverse tech ETFs
                        "Financial Services": ["FAZ", "SKF"],  # Inverse financials
                        "Healthcare": ["RXD"],  # Inverse healthcare
                        "Energy": ["ERY", "DUG"],  # Inverse energy
                        "Consumer Cyclical": ["SCC"],  # Inverse consumer
                    }
                    
                    if sector in hedge_etfs:
                        hedging_strategies.append({
                            "type": "sector_hedge",
                            "sector": sector,
                            "exposure_percent": round(pct, 1),
                            "hedge_instruments": hedge_etfs.get(sector, []),
                            "reason": f"High {sector} concentration ({pct:.1f}%)",
                            "suggested_allocation": f"{min(10, pct * 0.2):.1f}% of portfolio"
                        })
            
            # Market-wide hedging for high portfolio values
            if total_value > 50000:
                hedging_strategies.append({
                    "type": "portfolio_protection",
                    "instruments": ["VIX calls", "SPY puts", "SH (inverse S&P)"],
                    "reason": "Portfolio protection for significant holdings",
                    "suggested_allocation": "2-5% of portfolio"
                })
            
            return {
                "source_agent": "hedging_advisor",
                "strategies": hedging_strategies,
                "total_hedges_suggested": len(hedging_strategies),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e), "source_agent": "hedging_advisor"}
    
    @staticmethod
    async def request_sector_analysis(holdings: list) -> dict:
        """Request detailed sector analysis from market data.
        
        Args:
            holdings: List of portfolio holdings
        
        Returns:
            Detailed sector breakdown with analysis
        """
        try:
            sector_data = {}
            
            for holding in holdings:
                symbol = holding.get("symbol", "")
                if not symbol:
                    continue
                
                # Get sector info from yfinance
                if YFINANCE_AVAILABLE:
                    try:
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        sector = info.get("sector", "Unknown")
                        industry = info.get("industry", "Unknown")
                        market_cap = info.get("marketCap", 0)
                        
                        if sector not in sector_data:
                            sector_data[sector] = {
                                "holdings": [],
                                "total_value": 0,
                                "industries": set(),
                                "market_caps": []
                            }
                        
                        current_value = holding.get("current_value", holding.get("shares", 0) * holding.get("purchase_price", 0))
                        
                        sector_data[sector]["holdings"].append({
                            "symbol": symbol,
                            "industry": industry,
                            "value": current_value
                        })
                        sector_data[sector]["total_value"] += current_value
                        sector_data[sector]["industries"].add(industry)
                        sector_data[sector]["market_caps"].append(market_cap)
                    except:
                        pass
            
            # Convert sets to lists for JSON serialization
            for sector in sector_data:
                sector_data[sector]["industries"] = list(sector_data[sector]["industries"])
                sector_data[sector]["num_holdings"] = len(sector_data[sector]["holdings"])
                sector_data[sector]["avg_market_cap"] = (
                    sum(sector_data[sector]["market_caps"]) / len(sector_data[sector]["market_caps"])
                    if sector_data[sector]["market_caps"] else 0
                )
                del sector_data[sector]["market_caps"]
            
            # Calculate percentages
            total_value = sum(s["total_value"] for s in sector_data.values())
            sector_percentages = {
                sector: round(data["total_value"] / total_value * 100, 1) if total_value > 0 else 0
                for sector, data in sector_data.items()
            }
            
            return {
                "source_agent": "sector_analyst",
                "sector_breakdown": sector_data,
                "sector_percentages": sector_percentages,
                "total_sectors": len(sector_data),
                "diversification_score": min(100, len(sector_data) * 15 + sum(1 for s in sector_data.values() if len(s["industries"]) > 1) * 10),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e), "source_agent": "sector_analyst"}


# ─────────────────────────────────────────────────────────────
# Market Data Tools
# ─────────────────────────────────────────────────────────────

def get_stock_price(symbol: str) -> dict:
    """Get current stock price and basic info for a symbol.
    
    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL', 'GOOGL', 'MSFT')
    
    Returns:
        Dictionary with current price, change, and basic info
    """
    if not YFINANCE_AVAILABLE:
        return {"error": "yfinance not installed", "symbol": symbol}
    
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get current price data
        current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
        previous_close = info.get('previousClose', current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        return {
            "symbol": symbol.upper(),
            "name": info.get('shortName', symbol),
            "currentPrice": round(current_price, 2),
            "previousClose": round(previous_close, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "dayHigh": info.get('dayHigh', 0),
            "dayLow": info.get('dayLow', 0),
            "volume": info.get('volume', 0),
            "marketCap": info.get('marketCap', 0),
            "pe_ratio": info.get('trailingPE', 0),
            "dividend_yield": info.get('dividendYield', 0),
            "52weekHigh": info.get('fiftyTwoWeekHigh', 0),
            "52weekLow": info.get('fiftyTwoWeekLow', 0),
            "sector": info.get('sector', 'Unknown'),
            "industry": info.get('industry', 'Unknown'),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}


def get_stock_history(symbol: str, period: str = "1mo") -> dict:
    """Get historical stock data for analysis.
    
    Args:
        symbol: Stock ticker symbol
        period: Time period - 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
    
    Returns:
        Dictionary with historical price data and statistics
    """
    if not YFINANCE_AVAILABLE:
        return {"error": "yfinance not installed", "symbol": symbol}
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"error": "No data available", "symbol": symbol}
        
        # Calculate statistics
        prices = hist['Close'].tolist()
        returns = hist['Close'].pct_change().dropna().tolist()
        
        avg_price = sum(prices) / len(prices)
        min_price = min(prices)
        max_price = max(prices)
        volatility = (sum((r - sum(returns)/len(returns))**2 for r in returns) / len(returns)) ** 0.5 if returns else 0
        
        # Calculate simple moving averages
        sma_20 = sum(prices[-20:]) / min(20, len(prices)) if len(prices) >= 1 else 0
        sma_50 = sum(prices[-50:]) / min(50, len(prices)) if len(prices) >= 1 else 0
        
        return {
            "symbol": symbol.upper(),
            "period": period,
            "dataPoints": len(prices),
            "startPrice": round(prices[0], 2),
            "endPrice": round(prices[-1], 2),
            "periodReturn": round((prices[-1] - prices[0]) / prices[0] * 100, 2),
            "avgPrice": round(avg_price, 2),
            "minPrice": round(min_price, 2),
            "maxPrice": round(max_price, 2),
            "volatility": round(volatility * 100, 2),  # As percentage
            "sma20": round(sma_20, 2),
            "sma50": round(sma_50, 2),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}


def get_market_overview() -> dict:
    """Get overview of major market indices and sectors.
    
    Returns:
        Dictionary with major index data and market sentiment
    """
    if not YFINANCE_AVAILABLE:
        return {"error": "yfinance not installed"}
    
    try:
        indices = {
            "SPY": "S&P 500",
            "QQQ": "NASDAQ 100",
            "DIA": "Dow Jones",
            "IWM": "Russell 2000",
            "VTI": "Total US Market"
        }
        
        sector_etfs = {
            "XLK": "Technology",
            "XLF": "Financial",
            "XLV": "Healthcare",
            "XLE": "Energy",
            "XLI": "Industrial",
            "XLY": "Consumer Discretionary",
            "XLP": "Consumer Staples",
            "XLU": "Utilities",
            "XLRE": "Real Estate",
            "XLB": "Materials"
        }
        
        market_data = {"indices": [], "sectors": [], "timestamp": datetime.now().isoformat()}
        
        # Get index data
        for symbol, name in indices.items():
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                current = info.get('currentPrice') or info.get('regularMarketPrice', 0)
                prev = info.get('previousClose', current)
                change_pct = ((current - prev) / prev * 100) if prev else 0
                
                market_data["indices"].append({
                    "symbol": symbol,
                    "name": name,
                    "price": round(current, 2),
                    "change": round(change_pct, 2)
                })
            except:
                pass
        
        # Get sector data
        for symbol, name in sector_etfs.items():
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                current = info.get('currentPrice') or info.get('regularMarketPrice', 0)
                prev = info.get('previousClose', current)
                change_pct = ((current - prev) / prev * 100) if prev else 0
                
                market_data["sectors"].append({
                    "symbol": symbol,
                    "name": name,
                    "price": round(current, 2),
                    "change": round(change_pct, 2)
                })
            except:
                pass
        
        # Calculate market sentiment
        positive_sectors = sum(1 for s in market_data["sectors"] if s.get("change", 0) > 0)
        total_sectors = len(market_data["sectors"]) or 1
        
        if positive_sectors / total_sectors > 0.7:
            sentiment = "bullish"
        elif positive_sectors / total_sectors < 0.3:
            sentiment = "bearish"
        else:
            sentiment = "neutral"
        
        market_data["sentiment"] = sentiment
        market_data["positiveSectors"] = positive_sectors
        market_data["totalSectors"] = total_sectors
        
        return market_data
    except Exception as e:
        return {"error": str(e)}


def search_stocks(query: str, limit: int = 10) -> dict:
    """Search for stocks by name or symbol.
    
    Args:
        query: Search query (company name or symbol)
        limit: Maximum number of results
    
    Returns:
        List of matching stocks
    """
    if not YFINANCE_AVAILABLE:
        return {"error": "yfinance not installed"}
    
    try:
        # Common stocks database for quick search
        common_stocks = {
            "AAPL": "Apple Inc.",
            "MSFT": "Microsoft Corporation",
            "GOOGL": "Alphabet Inc.",
            "AMZN": "Amazon.com Inc.",
            "NVDA": "NVIDIA Corporation",
            "META": "Meta Platforms Inc.",
            "TSLA": "Tesla Inc.",
            "BRK-B": "Berkshire Hathaway",
            "JPM": "JPMorgan Chase",
            "V": "Visa Inc.",
            "JNJ": "Johnson & Johnson",
            "WMT": "Walmart Inc.",
            "PG": "Procter & Gamble",
            "MA": "Mastercard Inc.",
            "HD": "Home Depot",
            "DIS": "Walt Disney Co.",
            "NFLX": "Netflix Inc.",
            "PYPL": "PayPal Holdings",
            "ADBE": "Adobe Inc.",
            "CRM": "Salesforce Inc.",
            "INTC": "Intel Corporation",
            "AMD": "Advanced Micro Devices",
            "BA": "Boeing Co.",
            "KO": "Coca-Cola Co.",
            "PEP": "PepsiCo Inc.",
            "NKE": "Nike Inc.",
            "MCD": "McDonald's Corp.",
            "SBUX": "Starbucks Corp.",
            "COST": "Costco Wholesale",
            "TGT": "Target Corp."
        }
        
        query_lower = query.lower()
        results = []
        
        for symbol, name in common_stocks.items():
            if query_lower in symbol.lower() or query_lower in name.lower():
                results.append({
                    "symbol": symbol,
                    "name": name
                })
                if len(results) >= limit:
                    break
        
        return {"results": results, "query": query}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────
# Portfolio Analysis Tools
# ─────────────────────────────────────────────────────────────

def analyze_portfolio(holdings: List[dict]) -> dict:
    """Analyze a portfolio and provide insights.
    
    Args:
        holdings: List of holdings with symbol, shares, and avgCost
    
    Returns:
        Comprehensive portfolio analysis
    """
    if not YFINANCE_AVAILABLE:
        return {"error": "yfinance not installed"}
    
    if not holdings:
        return {"error": "No holdings provided"}
    
    try:
        analysis = {
            "holdings": [],
            "totalValue": 0,
            "totalCost": 0,
            "totalGain": 0,
            "totalGainPercent": 0,
            "sectorAllocation": {},
            "topPerformers": [],
            "worstPerformers": [],
            "diversificationScore": 0,
            "riskLevel": "unknown",
            "timestamp": datetime.now().isoformat()
        }
        
        sector_values = {}
        holding_details = []
        
        for h in holdings:
            symbol = h.get("symbol", "").upper()
            shares = float(h.get("shares", 0))
            avg_cost = float(h.get("avgCost", 0))
            
            if not symbol or shares <= 0:
                continue
            
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
                sector = info.get('sector', 'Other')
                
                current_value = shares * current_price
                cost_basis = shares * avg_cost
                gain = current_value - cost_basis
                gain_percent = (gain / cost_basis * 100) if cost_basis > 0 else 0
                
                holding_data = {
                    "symbol": symbol,
                    "name": info.get('shortName', symbol),
                    "shares": shares,
                    "avgCost": round(avg_cost, 2),
                    "currentPrice": round(current_price, 2),
                    "currentValue": round(current_value, 2),
                    "costBasis": round(cost_basis, 2),
                    "gain": round(gain, 2),
                    "gainPercent": round(gain_percent, 2),
                    "sector": sector,
                    "pe_ratio": info.get('trailingPE', 0),
                    "dividend_yield": info.get('dividendYield', 0)
                }
                
                holding_details.append(holding_data)
                analysis["totalValue"] += current_value
                analysis["totalCost"] += cost_basis
                
                # Track sector allocation
                sector_values[sector] = sector_values.get(sector, 0) + current_value
                
            except Exception as e:
                holding_details.append({
                    "symbol": symbol,
                    "error": str(e),
                    "shares": shares,
                    "avgCost": avg_cost
                })
        
        # Calculate totals
        analysis["holdings"] = holding_details
        analysis["totalGain"] = round(analysis["totalValue"] - analysis["totalCost"], 2)
        analysis["totalGainPercent"] = round(
            (analysis["totalGain"] / analysis["totalCost"] * 100) if analysis["totalCost"] > 0 else 0, 2
        )
        analysis["totalValue"] = round(analysis["totalValue"], 2)
        analysis["totalCost"] = round(analysis["totalCost"], 2)
        
        # Sector allocation percentages
        for sector, value in sector_values.items():
            analysis["sectorAllocation"][sector] = round(value / analysis["totalValue"] * 100, 1) if analysis["totalValue"] > 0 else 0
        
        # Top/worst performers
        valid_holdings = [h for h in holding_details if "gainPercent" in h]
        sorted_by_gain = sorted(valid_holdings, key=lambda x: x["gainPercent"], reverse=True)
        analysis["topPerformers"] = sorted_by_gain[:3]
        analysis["worstPerformers"] = sorted_by_gain[-3:][::-1]
        
        # Diversification score (0-100)
        num_holdings = len(valid_holdings)
        num_sectors = len(sector_values)
        max_allocation = max(analysis["sectorAllocation"].values()) if analysis["sectorAllocation"] else 100
        
        # Score based on number of holdings, sectors, and concentration
        holding_score = min(num_holdings * 5, 30)  # Max 30 for 6+ holdings
        sector_score = min(num_sectors * 7, 35)    # Max 35 for 5+ sectors
        concentration_score = 35 - (max_allocation - 20) * 0.5 if max_allocation > 20 else 35  # Penalize over-concentration
        
        analysis["diversificationScore"] = round(max(0, min(100, holding_score + sector_score + concentration_score)))
        
        # Risk level based on sectors and concentration
        high_risk_sectors = ["Technology", "Consumer Discretionary", "Energy"]
        high_risk_allocation = sum(analysis["sectorAllocation"].get(s, 0) for s in high_risk_sectors)
        
        if high_risk_allocation > 60 or max_allocation > 40:
            analysis["riskLevel"] = "high"
        elif high_risk_allocation > 40 or max_allocation > 30:
            analysis["riskLevel"] = "moderate"
        else:
            analysis["riskLevel"] = "low"
        
        return analysis
    except Exception as e:
        return {"error": str(e)}


def get_investment_recommendations(portfolio_analysis: dict, risk_tolerance: str = "moderate") -> dict:
    """Generate investment recommendations based on portfolio analysis.
    
    Args:
        portfolio_analysis: Output from analyze_portfolio
        risk_tolerance: 'conservative', 'moderate', or 'aggressive'
    
    Returns:
        Investment recommendations and action items
    """
    try:
        recommendations = {
            "actions": [],
            "rebalancing": [],
            "opportunities": [],
            "risks": [],
            "hedging": [],
            "timestamp": datetime.now().isoformat()
        }
        
        if "error" in portfolio_analysis:
            return {"error": portfolio_analysis["error"]}
        
        sector_allocation = portfolio_analysis.get("sectorAllocation", {})
        diversification = portfolio_analysis.get("diversificationScore", 0)
        risk_level = portfolio_analysis.get("riskLevel", "unknown")
        holdings = portfolio_analysis.get("holdings", [])
        
        # Target allocations based on risk tolerance
        target_allocations = {
            "conservative": {
                "Technology": 15,
                "Healthcare": 15,
                "Financial": 15,
                "Consumer Staples": 15,
                "Utilities": 15,
                "Bonds/Fixed Income": 25
            },
            "moderate": {
                "Technology": 25,
                "Healthcare": 15,
                "Financial": 15,
                "Consumer Discretionary": 15,
                "Industrial": 10,
                "Other": 20
            },
            "aggressive": {
                "Technology": 40,
                "Consumer Discretionary": 20,
                "Healthcare": 15,
                "Financial": 10,
                "Energy": 10,
                "Other": 5
            }
        }
        
        target = target_allocations.get(risk_tolerance, target_allocations["moderate"])
        
        # Rebalancing recommendations
        for sector, target_pct in target.items():
            current_pct = sector_allocation.get(sector, 0)
            diff = current_pct - target_pct
            
            if diff > 10:
                recommendations["rebalancing"].append({
                    "action": "reduce",
                    "sector": sector,
                    "current": current_pct,
                    "target": target_pct,
                    "message": f"Consider reducing {sector} allocation by {diff:.1f}%"
                })
            elif diff < -10:
                recommendations["rebalancing"].append({
                    "action": "increase",
                    "sector": sector,
                    "current": current_pct,
                    "target": target_pct,
                    "message": f"Consider increasing {sector} allocation by {abs(diff):.1f}%"
                })
        
        # Diversification recommendations
        if diversification < 50:
            recommendations["actions"].append({
                "priority": "high",
                "type": "diversification",
                "message": "Your portfolio is under-diversified. Consider adding positions in different sectors.",
                "suggestions": ["Add ETFs for broad market exposure", "Consider international diversification"]
            })
        
        # Risk-based recommendations
        if risk_level == "high" and risk_tolerance != "aggressive":
            recommendations["risks"].append({
                "type": "risk_mismatch",
                "message": "Your portfolio risk level doesn't match your risk tolerance.",
                "suggestion": "Consider reducing exposure to volatile sectors"
            })
        
        # Hedging recommendations
        tech_allocation = sector_allocation.get("Technology", 0)
        if tech_allocation > 30:
            recommendations["hedging"].append({
                "type": "sector_hedge",
                "message": f"High tech exposure ({tech_allocation:.1f}%). Consider hedging strategies.",
                "suggestions": [
                    "Add defensive sectors like Utilities or Consumer Staples",
                    "Consider put options on QQQ for downside protection",
                    "Add inverse ETFs during high volatility periods"
                ]
            })
        
        # Individual stock recommendations
        for holding in holdings:
            gain_pct = holding.get("gainPercent", 0)
            if gain_pct > 50:
                recommendations["actions"].append({
                    "priority": "medium",
                    "type": "profit_taking",
                    "symbol": holding.get("symbol"),
                    "message": f"{holding.get('symbol')} is up {gain_pct:.1f}%. Consider taking partial profits."
                })
            elif gain_pct < -20:
                recommendations["actions"].append({
                    "priority": "medium",
                    "type": "loss_review",
                    "symbol": holding.get("symbol"),
                    "message": f"{holding.get('symbol')} is down {abs(gain_pct):.1f}%. Review thesis or consider tax-loss harvesting."
                })
        
        # Opportunity recommendations based on market
        recommendations["opportunities"].append({
            "type": "market_timing",
            "message": "Dollar-cost averaging into broad market ETFs reduces timing risk",
            "suggestions": ["VTI for total US market", "VXUS for international exposure", "BND for bond allocation"]
        })
        
        return recommendations
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────
# Helper Functions for API Routes
# ─────────────────────────────────────────────────────────────

def get_stock_data(symbol: str) -> dict:
    """Get stock data in the format expected by the frontend.
    
    Args:
        symbol: Stock ticker symbol
    
    Returns:
        Dictionary with stock data formatted for frontend
    """
    price_data = get_stock_price(symbol)
    
    if "error" in price_data:
        return {
            "symbol": symbol.upper(),
            "current_price": 0,
            "change_percent": 0,
            "error": price_data.get("error")
        }
    
    return {
        "symbol": price_data.get("symbol", symbol.upper()),
        "name": price_data.get("name", symbol),
        "current_price": price_data.get("currentPrice", 0),
        "change_percent": price_data.get("changePercent", 0),
        "volume": price_data.get("volume", 0),
        "market_cap": price_data.get("marketCap", 0),
        "pe_ratio": price_data.get("pe_ratio", 0),
        "dividend_yield": price_data.get("dividend_yield", 0),
        "sector": price_data.get("sector", "Unknown"),
        "high_52w": price_data.get("52weekHigh", 0),
        "low_52w": price_data.get("52weekLow", 0),
        "day_high": price_data.get("dayHigh", 0),
        "day_low": price_data.get("dayLow", 0)
    }


def get_portfolio_analysis(holdings: list) -> dict:
    """Analyze portfolio and return enriched data.
    
    Args:
        holdings: List of holdings with symbol, shares, purchase_price
    
    Returns:
        Dictionary with enriched portfolio data
    """
    enriched_holdings = []
    total_value = 0
    total_cost = 0
    sectors = {}
    
    for holding in holdings:
        symbol = holding.get("symbol", "")
        shares = holding.get("shares", 0)
        purchase_price = holding.get("purchase_price", 0)
        
        # Get live data
        stock_data = get_stock_data(symbol)
        current_price = stock_data.get("current_price", purchase_price)
        
        current_value = shares * current_price
        cost_basis = shares * purchase_price
        gain_loss = current_value - cost_basis
        gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
        
        sector = stock_data.get("sector", "Unknown")
        sectors[sector] = sectors.get(sector, 0) + current_value
        
        enriched_holdings.append({
            **holding,
            "current_price": round(current_price, 2),
            "current_value": round(current_value, 2),
            "cost_basis": round(cost_basis, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_percent": round(gain_loss_percent, 2),
            "sector": sector,
            "company_name": stock_data.get("name", symbol)
        })
        
        total_value += current_value
        total_cost += cost_basis
    
    return {
        "enriched_holdings": enriched_holdings,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_gain_loss": round(total_value - total_cost, 2),
        "total_gain_loss_percent": round((total_value - total_cost) / total_cost * 100, 2) if total_cost > 0 else 0,
        "sectors": sectors,
        "risk_metrics": {
            "diversification_score": min(100, len(enriched_holdings) * 10 + len(sectors) * 15),
            "concentration_risk": max(sectors.values()) / total_value * 100 if total_value > 0 and sectors else 0
        }
    }


def get_investment_recommendations(holdings: list, risk_tolerance: str = "moderate") -> dict:
    """Generate AI-powered investment recommendations based on portfolio and market data.
    
    Args:
        holdings: List of user's holdings
        risk_tolerance: User's risk tolerance (conservative, moderate, aggressive)
    
    Returns:
        Dictionary with actionable recommendations
    """
    recommendations = []
    
    # Analyze current portfolio
    if holdings:
        analysis = get_portfolio_analysis(holdings)
        enriched = analysis.get("enriched_holdings", [])
        sectors = analysis.get("sectors", {})
        total_value = analysis.get("total_value", 0)
        
        # Check sector concentration
        for sector, value in sectors.items():
            pct = (value / total_value * 100) if total_value > 0 else 0
            if pct > 40:
                recommendations.append({
                    "type": "rebalance",
                    "title": f"High {sector} Concentration ({pct:.0f}%)",
                    "description": f"Consider reducing {sector} exposure to improve diversification.",
                    "reason": "Over-concentration increases risk",
                    "priority": "high"
                })
        
        # Check individual holdings performance
        for h in enriched:
            gain_pct = h.get("gain_loss_percent", 0)
            symbol = h.get("symbol", "")
            
            if gain_pct > 50:
                recommendations.append({
                    "type": "sell",
                    "symbol": symbol,
                    "title": f"Consider Taking Profits on {symbol}",
                    "description": f"{symbol} is up {gain_pct:.1f}%. Consider selling some shares to lock in gains.",
                    "reason": "Rebalancing after significant gains",
                    "priority": "medium"
                })
            elif gain_pct < -25:
                recommendations.append({
                    "type": "hold",
                    "symbol": symbol,
                    "title": f"Review {symbol} Position",
                    "description": f"{symbol} is down {abs(gain_pct):.1f}%. Review your investment thesis or consider tax-loss harvesting.",
                    "reason": "Significant loss requires attention",
                    "priority": "high"
                })
        
        # Check diversification
        if len(holdings) < 5:
            recommendations.append({
                "type": "diversify",
                "title": "Improve Diversification",
                "description": "Your portfolio has few holdings. Consider adding more positions across different sectors.",
                "reason": "Diversification reduces overall portfolio risk",
                "priority": "medium"
            })
    
    # Get market overview for context-aware recommendations
    try:
        market = get_market_overview()
        sentiment = market.get("sentiment", "neutral")
        
        if sentiment == "bullish":
            recommendations.append({
                "type": "buy",
                "title": "Market Sentiment is Bullish",
                "description": "Most sectors are positive. Consider adding to equity positions if aligned with your goals.",
                "reason": "Positive market momentum",
                "priority": "low"
            })
        elif sentiment == "bearish":
            recommendations.append({
                "type": "hedge",
                "title": "Market Sentiment is Bearish",
                "description": "Consider defensive positions or holding cash. Look at bonds (BND) or defensive sectors.",
                "reason": "Negative market momentum suggests caution",
                "priority": "high"
            })
        
        # Sector-specific recommendations from market data
        sectors_data = market.get("sectors", [])
        top_sectors = sorted(sectors_data, key=lambda x: x.get("change", 0), reverse=True)[:2]
        bottom_sectors = sorted(sectors_data, key=lambda x: x.get("change", 0))[:2]
        
        for sector in top_sectors:
            if sector.get("change", 0) > 1:
                recommendations.append({
                    "type": "buy",
                    "title": f"{sector.get('name', 'Unknown')} Sector Strong",
                    "description": f"Consider exposure to {sector.get('name')} ({sector.get('symbol')}) - up {sector.get('change', 0):.2f}% today.",
                    "reason": "Sector showing strength",
                    "priority": "low"
                })
        
        for sector in bottom_sectors:
            if sector.get("change", 0) < -1:
                recommendations.append({
                    "type": "hold",
                    "title": f"{sector.get('name', 'Unknown')} Sector Weak",
                    "description": f"Be cautious with {sector.get('name')} - down {abs(sector.get('change', 0)):.2f}% today.",
                    "reason": "Sector showing weakness",
                    "priority": "low"
                })
    except Exception as e:
        print(f"Error getting market data for recommendations: {e}")
    
    # Risk-based recommendations
    if risk_tolerance == "conservative":
        recommendations.append({
            "type": "hedge",
            "title": "Consider Bond Allocation",
            "description": "For conservative investors, maintain 30-40% in bonds (BND, AGG) for stability.",
            "reason": "Bonds reduce portfolio volatility",
            "priority": "medium"
        })
    elif risk_tolerance == "aggressive":
        recommendations.append({
            "type": "buy",
            "title": "Growth Opportunities",
            "description": "For aggressive investors, consider growth ETFs (QQQ, ARKK) or individual growth stocks.",
            "reason": "Higher risk tolerance allows for growth focus",
            "priority": "low"
        })
    
    # Always include general advice
    if not recommendations:
        recommendations = [
            {
                "type": "hold",
                "title": "Stay the Course",
                "description": "Your portfolio appears balanced. Continue regular contributions and rebalance quarterly.",
                "reason": "Consistency is key to long-term success",
                "priority": "low"
            },
            {
                "type": "diversify",
                "title": "Consider International Exposure",
                "description": "Add international stocks (VXUS, VEA) for global diversification.",
                "reason": "International exposure reduces US-only risk",
                "priority": "low"
            }
        ]
    
    return {
        "recommendations": recommendations,
        "portfolio_health": "good" if len([r for r in recommendations if r.get("priority") == "high"]) == 0 else "needs_attention"
    }


# ─────────────────────────────────────────────────────────────
# A2A Coordinated Analysis
# ─────────────────────────────────────────────────────────────

async def get_comprehensive_portfolio_analysis(holdings: list, risk_tolerance: str = "moderate") -> dict:
    """Get comprehensive portfolio analysis using A2A protocol.
    
    This function coordinates with multiple agents:
    - Investment Agent: Portfolio valuation and recommendations
    - Risk Agent: Risk assessment and alerts
    - Sector Analyst: Detailed sector breakdown
    - Hedging Advisor: Hedging strategies
    
    Args:
        holdings: List of holdings
        risk_tolerance: User's risk tolerance
    
    Returns:
        Comprehensive analysis from multiple agents
    """
    # Get basic portfolio analysis
    portfolio_analysis = get_portfolio_analysis(holdings)
    
    # Request A2A risk analysis
    risk_analysis = await A2AProtocol.request_risk_analysis(
        portfolio_data={
            "holdings": portfolio_analysis.get("enriched_holdings", []),
            "total_value": portfolio_analysis.get("total_value", 0),
            "sectors": portfolio_analysis.get("sectors", {})
        },
        user_context={"risk_tolerance": risk_tolerance}
    )
    
    # Request A2A sector analysis
    sector_analysis = await A2AProtocol.request_sector_analysis(holdings)
    
    # Request A2A hedging strategies
    hedging_strategies = await A2AProtocol.request_hedging_strategies(
        portfolio_data={
            "sectors": portfolio_analysis.get("sectors", {}),
            "total_value": portfolio_analysis.get("total_value", 0)
        }
    )
    
    # Get investment recommendations
    recommendations = get_investment_recommendations(holdings, risk_tolerance)
    
    # Combine all analyses
    return {
        "portfolio": {
            "total_value": portfolio_analysis.get("total_value", 0),
            "total_cost": portfolio_analysis.get("total_cost", 0),
            "total_gain_loss": portfolio_analysis.get("total_gain_loss", 0),
            "total_gain_loss_percent": portfolio_analysis.get("total_gain_loss_percent", 0),
            "holdings": portfolio_analysis.get("enriched_holdings", [])
        },
        "sector_allocation": sector_analysis.get("sector_percentages", {}),
        "sector_details": sector_analysis.get("sector_breakdown", {}),
        "risk_assessment": {
            "risk_score": risk_analysis.get("risk_score", 0),
            "risk_level": risk_analysis.get("risk_level", "UNKNOWN"),
            "concentration_risks": risk_analysis.get("concentration_risks", []),
            "volatility_risks": risk_analysis.get("volatility_risks", [])
        },
        "hedging": {
            "strategies": hedging_strategies.get("strategies", []),
            "total_strategies": hedging_strategies.get("total_hedges_suggested", 0)
        },
        "recommendations": recommendations.get("recommendations", []),
        "portfolio_health": recommendations.get("portfolio_health", "unknown"),
        "diversification_score": sector_analysis.get("diversification_score", 0),
        "a2a_agents_consulted": ["investment_agent", "risk_agent", "sector_analyst", "hedging_advisor"],
        "timestamp": datetime.now().isoformat()
    }


def get_portfolio_analysis_sync(holdings: list, risk_tolerance: str = "moderate") -> dict:
    """Synchronous wrapper for comprehensive portfolio analysis with A2A.
    
    This version can be called from synchronous code.
    """
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If there's already a running loop, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    get_comprehensive_portfolio_analysis(holdings, risk_tolerance)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                get_comprehensive_portfolio_analysis(holdings, risk_tolerance)
            )
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(get_comprehensive_portfolio_analysis(holdings, risk_tolerance))


# ─────────────────────────────────────────────────────────────
# Create Investment Agent
# ─────────────────────────────────────────────────────────────

def create_investment_agent() -> Agent:
    """Create an investment analysis agent with market data tools."""
    
    tools = [
        FunctionTool(func=get_stock_price),
        FunctionTool(func=get_stock_history),
        FunctionTool(func=get_market_overview),
        FunctionTool(func=search_stocks),
        FunctionTool(func=analyze_portfolio),
        FunctionTool(func=get_investment_recommendations),
    ]
    
    agent = Agent(
        name="investment_analyst",
        model="gemini-2.0-flash",
        description="Expert investment analyst providing real-time market data, portfolio analysis, and investment recommendations.",
        instruction="""You are an expert investment analyst with access to real-time market data.

Your capabilities include:
1. Fetching real-time stock prices and market data
2. Analyzing historical stock performance
3. Providing market overview and sector analysis
4. Analyzing user portfolios for diversification and risk
5. Generating personalized investment recommendations

When analyzing portfolios:
- Always consider the user's risk tolerance
- Provide specific, actionable recommendations
- Explain the reasoning behind each suggestion
- Consider tax implications when suggesting changes
- Recommend hedging strategies when appropriate

When discussing market data:
- Provide current prices and recent performance
- Explain market sentiment and trends
- Highlight potential opportunities and risks

Always be balanced and remind users that past performance doesn't guarantee future results.
Never provide specific buy/sell timing advice - instead focus on allocation and strategy.""",
        tools=tools
    )
    
    return agent


# Global agent instance
_investment_agent = None


def get_investment_agent() -> Agent:
    """Get or create the investment agent instance."""
    global _investment_agent
    if _investment_agent is None:
        _investment_agent = create_investment_agent()
    return _investment_agent


async def run_investment_query(query: str, context: dict = None) -> str:
    """Run an investment-related query through the agent.
    
    Args:
        query: User's investment question
        context: Optional context (portfolio data, risk tolerance, etc.)
    
    Returns:
        Agent's response
    """
    try:
        from google.adk.runners import InMemoryRunner
        from google.genai import types
        
        agent = get_investment_agent()
        runner = InMemoryRunner(agent=agent, app_name="investment_analyst")
        
        # Build context-aware prompt
        full_query = query
        if context:
            if "portfolio" in context:
                full_query = f"User's portfolio: {json.dumps(context['portfolio'])}\n\nQuestion: {query}"
            if "risk_tolerance" in context:
                full_query += f"\n\nUser's risk tolerance: {context['risk_tolerance']}"
        
        user_id = context.get("user_id", "user") if context else "user"
        session = await runner.session_service.create_session(
            app_name="investment_analyst",
            user_id=user_id
        )
        
        content = types.Content(
            role="user",
            parts=[types.Part(text=full_query)]
        )
        
        response_text = ""
        async for event in runner.run(
            user_id=user_id,
            session_id=session.id,
            new_message=content
        ):
            if hasattr(event, 'content') and event.content:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_text += part.text
        
        return response_text if response_text else "I couldn't generate a response. Please try again."
    except Exception as e:
        return f"Error processing investment query: {str(e)}"
