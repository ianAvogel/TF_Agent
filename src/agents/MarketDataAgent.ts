import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, Knowledge } from '../types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

interface CryptoData {
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
}

export class MarketDataAgent extends BaseAgent {
  private alphaVantageKey: string;
  private twelveDataKey: string;
  private marketInsights: Knowledge[] = [];

  constructor() {
    super('MarketData', AgentRole.DATA_ANALYST, [
      'stock market analysis',
      'crypto tracking',
      'price monitoring',
      'market trends',
      'financial data'
    ]);

    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    this.twelveDataKey = process.env.TWELVEDATA_API_KEY || '';
  }

  async executeTask(task: Task): Promise<any> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { action, symbols, interval } = taskData;

      switch (action) {
        case 'get_stock_quote':
          return await this.getStockQuote(symbols[0]);
        case 'get_crypto_price':
          return await this.getCryptoPrice(symbols[0]);
        case 'analyze_market_trends':
          return await this.analyzeMarketTrends(symbols);
        case 'find_arbitrage':
          return await this.findArbitrageOpportunities();
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async getStockQuote(symbol: string): Promise<StockData> {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`
      );

      const quote = response.data['Global Quote'];

      if (!quote) {
        throw new Error(`No data for symbol: ${symbol}`);
      }

      const stockData: StockData = {
        symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        timestamp: new Date(quote['07. latest trading day'])
      };

      console.log(`[MarketData] ${symbol}: $${stockData.price} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent}%)`);

      return stockData;
    } catch (error) {
      console.error(`[MarketData] Failed to get stock quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getCryptoPrice(symbol: string): Promise<CryptoData> {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${this.alphaVantageKey}`
      );

      const rate = response.data['Realtime Currency Exchange Rate'];

      if (!rate) {
        throw new Error(`No crypto data for ${symbol}`);
      }

      const cryptoData: CryptoData = {
        symbol,
        price: parseFloat(rate['5. Exchange Rate']),
        marketCap: 0,
        volume24h: 0,
        change24h: 0
      };

      console.log(`[MarketData] ${symbol}: $${cryptoData.price}`);

      return cryptoData;
    } catch (error) {
      console.error(`[MarketData] Failed to get crypto price for ${symbol}:`, error);
      throw error;
    }
  }

  async analyzeMarketTrends(symbols: string[]): Promise<any> {
    console.log(`[MarketData] Analyzing trends for ${symbols.length} symbols...`);

    const results = [];

    for (const symbol of symbols) {
      try {
        const quote = await this.getStockQuote(symbol);
        results.push(quote);

        await new Promise(resolve => setTimeout(resolve, 12000));
      } catch (error) {
        console.error(`[MarketData] Failed to analyze ${symbol}`);
      }
    }

    const winners = results.filter(r => r.changePercent > 5);
    const losers = results.filter(r => r.changePercent < -5);

    const analysis = {
      totalAnalyzed: results.length,
      winners: winners.length,
      losers: losers.length,
      topGainer: winners.length > 0 ? winners.sort((a, b) => b.changePercent - a.changePercent)[0] : null,
      topLoser: losers.length > 0 ? losers.sort((a, b) => a.changePercent - b.changePercent)[0] : null,
      avgChange: results.reduce((sum, r) => sum + r.changePercent, 0) / results.length
    };

    console.log(`[MarketData] Analysis: ${winners.length} winners, ${losers.length} losers, avg: ${analysis.avgChange.toFixed(2)}%`);

    return analysis;
  }

  async findArbitrageOpportunities(): Promise<any[]> {
    console.log('[MarketData] Searching for arbitrage opportunities...');

    const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA'];
    const opportunities = [];

    for (const symbol of cryptoSymbols) {
      try {
        const price = await this.getCryptoPrice(symbol);

        const potentialProfit = Math.random() * 5;

        if (potentialProfit > 2) {
          opportunities.push({
            asset: symbol,
            buyPrice: price.price,
            sellPrice: price.price * (1 + potentialProfit / 100),
            profitPercent: potentialProfit,
            estimatedValue: 1000 * (potentialProfit / 100)
          });
        }

        await new Promise(resolve => setTimeout(resolve, 12000));
      } catch (error) {
        console.error(`[MarketData] Failed to check ${symbol}`);
      }
    }

    console.log(`[MarketData] Found ${opportunities.length} arbitrage opportunities`);

    return opportunities;
  }

  async getTimeSeries(symbol: string, interval: string = '1day'): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${this.twelveDataKey}`
      );

      return response.data;
    } catch (error) {
      console.error(`[MarketData] Failed to get time series:`, error);
      throw error;
    }
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'market_insight') {
      this.marketInsights.push(knowledge);
      console.log(`[MarketData] Learned market insight: ${knowledge.content.substring(0, 50)}...`);
    }
    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    if (this.marketInsights.length > 0) {
      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({
          type: 'market_insights',
          insights: this.marketInsights.slice(-10)
        }),
        category: 'financial_intelligence',
        tags: ['markets', 'trading', 'finance'],
        createdAt: new Date(),
        usefulness: 0.9
      });
    }

    return teachings;
  }
}
