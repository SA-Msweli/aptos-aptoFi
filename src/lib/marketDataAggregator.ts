import { EventEmitter } from 'events';
import { getRealTimeDataService, type PriceUpdate } from '@/lib/realTimeDataService';
import { getPriceStreamingService, type PriceStreamData } from '@/lib/priceStreamingService';
import { getTokenPriceInfo, getSupportedTokens } from '@/view-functions/getOracleData';

export interface AggregatedMarketData {
  tokenSymbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  volatility: number;
  timestamp: number;
  sources: DataSource[];
  confidence: number; // 0-100 confidence score
  isStale: boolean;
}

export interface DataSource {
  name: string;
  price: number;
  timestamp: number;
  weight: number; // Weight in aggregation (0-1)
  isActive: boolean;
}

export interface MarketTrend {
  tokenSymbol: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  timeframe: '1h' | '4h' | '24h' | '7d';
  indicators: TechnicalIndicator[];
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
}

export interface MarketSummary {
  totalMarketCap: number;
  totalVolume24h: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  topGainers: AggregatedMarketData[];
  topLosers: AggregatedMarketData[];
  mostVolatile: AggregatedMarketData[];
  lastUpdated: number;
}

export interface AggregatorConfig {
  updateInterval: number;
  confidenceThreshold: number;
  maxDataAge: number; // milliseconds
  enableTechnicalAnalysis: boolean;
  dataSources: {
    oracle: { enabled: boolean; weight: number };
    streaming: { enabled: boolean; weight: number };
    fallback: { enabled: boolean; weight: number };
  };
}

export class MarketDataAggregator extends EventEmitter {
  private config: AggregatorConfig;
  private aggregatedData: Map<string, AggregatedMarketData> = new Map();
  private marketTrends: Map<string, MarketTrend> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private supportedTokens: string[] = [];

  constructor(config: Partial<AggregatorConfig> = {}) {
    super();

    this.config = {
      updateInterval: 10000, // 10 seconds
      confidenceThreshold: 70, // Minimum confidence score
      maxDataAge: 300000, // 5 minutes
      enableTechnicalAnalysis: true,
      dataSources: {
        oracle: { enabled: true, weight: 0.6 },
        streaming: { enabled: true, weight: 0.3 },
        fallback: { enabled: true, weight: 0.1 }
      },
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load supported tokens
      this.supportedTokens = await getSupportedTokens();
      console.log(`📊 Market data aggregator initialized with ${this.supportedTokens.length} tokens`);

      // Set up data source listeners
      this.setupDataSourceListeners();

      this.emit('initialized', {
        supportedTokens: this.supportedTokens,
        config: this.config
      });
    } catch (error) {
      console.error('❌ Failed to initialize market data aggregator:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  private setupDataSourceListeners(): void {
    // Listen to real-time data service
    if (this.config.dataSources.oracle.enabled) {
      const realTimeService = getRealTimeDataService();
      realTimeService.on('marketDataUpdated', (data) => {
        this.handleOracleData(data);
      });
    }

    // Listen to streaming service
    if (this.config.dataSources.streaming.enabled) {
      const streamingService = getPriceStreamingService();
      streamingService.on('priceUpdate', (data: PriceStreamData) => {
        this.handleStreamingData(data);
      });
    }
  }

  private handleOracleData(data: any): void {
    const { updates } = data;

    updates.forEach((update: PriceUpdate) => {
      this.updateAggregatedData(update.tokenSymbol, {
        source: 'oracle',
        price: update.priceUSD,
        priceChange24h: update.priceChange24h,
        timestamp: update.timestamp,
        isStale: update.isStale,
        volatility: update.volatility || 0
      });
    });
  }

  private handleStreamingData(data: PriceStreamData): void {
    this.updateAggregatedData(data.tokenSymbol, {
      source: 'streaming',
      price: data.price,
      priceChange24h: data.priceChange24h,
      timestamp: data.timestamp,
      isStale: !data.isFresh,
      volume24h: data.volume24h,
      marketCap: data.marketCap
    });
  }

  private updateAggregatedData(tokenSymbol: string, sourceData: any): void {
    const existing = this.aggregatedData.get(tokenSymbol);
    const now = Date.now();

    // Create or update aggregated data
    const aggregated: AggregatedMarketData = existing || {
      tokenSymbol,
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
      volatility: 0,
      timestamp: now,
      sources: [],
      confidence: 0,
      isStale: true
    };

    // Update or add source data
    const sourceIndex = aggregated.sources.findIndex(s => s.name === sourceData.source);
    const sourceWeight = this.config.dataSources[sourceData.source as keyof typeof this.config.dataSources]?.weight || 0.1;

    const source: DataSource = {
      name: sourceData.source,
      price: sourceData.price,
      timestamp: sourceData.timestamp,
      weight: sourceWeight,
      isActive: !sourceData.isStale && (now - sourceData.timestamp) < this.config.maxDataAge
    };

    if (sourceIndex >= 0) {
      aggregated.sources[sourceIndex] = source;
    } else {
      aggregated.sources.push(source);
    }

    // Calculate weighted average price
    const activeSources = aggregated.sources.filter(s => s.isActive);
    if (activeSources.length > 0) {
      const totalWeight = activeSources.reduce((sum, s) => sum + s.weight, 0);
      const weightedPrice = activeSources.reduce((sum, s) => sum + (s.price * s.weight), 0) / totalWeight;

      aggregated.price = weightedPrice;
      aggregated.timestamp = now;
      aggregated.isStale = false;
    } else {
      aggregated.isStale = true;
    }

    // Update other fields from the most recent source
    if (sourceData.priceChange24h !== undefined) {
      aggregated.priceChange24h = sourceData.priceChange24h;
    }
    if (sourceData.volume24h !== undefined) {
      aggregated.volume24h = sourceData.volume24h;
    }
    if (sourceData.marketCap !== undefined) {
      aggregated.marketCap = sourceData.marketCap;
    }
    if (sourceData.volatility !== undefined) {
      aggregated.volatility = sourceData.volatility;
    }

    // Calculate confidence score
    aggregated.confidence = this.calculateConfidence(aggregated);

    // Update price history for technical analysis
    this.updatePriceHistory(tokenSymbol, aggregated.price);

    // Perform technical analysis if enabled
    if (this.config.enableTechnicalAnalysis) {
      this.updateTechnicalAnalysis(tokenSymbol, aggregated);
    }

    // Store updated data
    this.aggregatedData.set(tokenSymbol, aggregated);

    // Emit update event
    this.emit('dataUpdated', {
      tokenSymbol,
      data: aggregated,
      timestamp: now
    });
  }

  private calculateConfidence(data: AggregatedMarketData): number {
    let confidence = 0;
    const now = Date.now();

    // Base confidence from number of active sources
    const activeSources = data.sources.filter(s => s.isActive);
    confidence += (activeSources.length / data.sources.length) * 40;

    // Confidence from data freshness
    const dataAge = now - data.timestamp;
    const freshnessScore = Math.max(0, 1 - (dataAge / this.config.maxDataAge));
    confidence += freshnessScore * 30;

    // Confidence from price consistency across sources
    if (activeSources.length > 1) {
      const prices = activeSources.map(s => s.price);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 1 - (stdDev / avgPrice));
      confidence += consistencyScore * 30;
    } else {
      confidence += 15; // Partial score for single source
    }

    return Math.min(100, Math.max(0, confidence));
  }

  private updatePriceHistory(tokenSymbol: string, price: number): void {
    if (!this.priceHistory.has(tokenSymbol)) {
      this.priceHistory.set(tokenSymbol, []);
    }

    const history = this.priceHistory.get(tokenSymbol)!;
    history.push(price);

    // Keep only last 200 data points
    if (history.length > 200) {
      history.splice(0, history.length - 200);
    }
  }

  private updateTechnicalAnalysis(tokenSymbol: string, data: AggregatedMarketData): void {
    const history = this.priceHistory.get(tokenSymbol) || [];

    if (history.length < 20) {
      return; // Need at least 20 data points for analysis
    }

    const indicators = this.calculateTechnicalIndicators(history);
    const trend = this.determineTrend(indicators, data.priceChange24h);

    const marketTrend: MarketTrend = {
      tokenSymbol,
      trend: trend.direction,
      strength: trend.strength,
      timeframe: '24h',
      indicators
    };

    this.marketTrends.set(tokenSymbol, marketTrend);

    this.emit('trendUpdated', {
      tokenSymbol,
      trend: marketTrend,
      timestamp: Date.now()
    });
  }

  private calculateTechnicalIndicators(prices: number[]): TechnicalIndicator[] {
    const indicators: TechnicalIndicator[] = [];

    // Simple Moving Average (SMA)
    const sma20 = this.calculateSMA(prices, 20);
    const currentPrice = prices[prices.length - 1];

    indicators.push({
      name: 'SMA20',
      value: sma20,
      signal: currentPrice > sma20 ? 'buy' : currentPrice < sma20 ? 'sell' : 'neutral',
      strength: Math.abs((currentPrice - sma20) / sma20) * 100
    });

    // Relative Strength Index (RSI)
    const rsi = this.calculateRSI(prices, 14);
    indicators.push({
      name: 'RSI',
      value: rsi,
      signal: rsi > 70 ? 'sell' : rsi < 30 ? 'buy' : 'neutral',
      strength: rsi > 70 ? (rsi - 70) * 3.33 : rsi < 30 ? (30 - rsi) * 3.33 : 0
    });

    // MACD
    const macd = this.calculateMACD(prices);
    indicators.push({
      name: 'MACD',
      value: macd.macd,
      signal: macd.macd > macd.signal ? 'buy' : 'sell',
      strength: Math.abs(macd.macd - macd.signal) * 10
    });

    return indicators;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // For simplicity, using SMA instead of EMA for signal line
    const macdHistory = [macd]; // In real implementation, you'd maintain MACD history
    const signal = macd; // Simplified

    return {
      macd,
      signal,
      histogram: macd - signal
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private determineTrend(indicators: TechnicalIndicator[], priceChange24h: number): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalStrength = 0;

    indicators.forEach(indicator => {
      if (indicator.signal === 'buy') {
        bullishSignals++;
        totalStrength += indicator.strength;
      } else if (indicator.signal === 'sell') {
        bearishSignals++;
        totalStrength += indicator.strength;
      }
    });

    // Factor in price change
    if (priceChange24h > 2) bullishSignals++;
    if (priceChange24h < -2) bearishSignals++;

    const avgStrength = totalStrength / indicators.length;

    if (bullishSignals > bearishSignals) {
      return { direction: 'bullish', strength: Math.min(100, avgStrength) };
    } else if (bearishSignals > bullishSignals) {
      return { direction: 'bearish', strength: Math.min(100, avgStrength) };
    } else {
      return { direction: 'neutral', strength: Math.min(100, avgStrength / 2) };
    }
  }

  // Public API methods
  public start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Market data aggregator is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting market data aggregator...');

    // Start periodic aggregation
    this.updateTimer = setInterval(() => {
      this.performAggregation();
    }, this.config.updateInterval);

    this.emit('started');
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    console.log('🛑 Market data aggregator stopped');
    this.emit('stopped');
  }

  private async performAggregation(): Promise<void> {
    // This method can be used for additional aggregation logic
    // Currently, aggregation happens in real-time via event listeners

    // Generate market summary
    const summary = this.generateMarketSummary();
    this.emit('marketSummaryUpdated', summary);
  }

  private generateMarketSummary(): MarketSummary {
    const allData = Array.from(this.aggregatedData.values());
    const validData = allData.filter(data => !data.isStale && data.confidence >= this.config.confidenceThreshold);

    const totalMarketCap = validData.reduce((sum, data) => sum + data.marketCap, 0);
    const totalVolume24h = validData.reduce((sum, data) => sum + data.volume24h, 0);

    // Sort by price change
    const sortedByChange = [...validData].sort((a, b) => b.priceChange24h - a.priceChange24h);
    const topGainers = sortedByChange.slice(0, 5);
    const topLosers = sortedByChange.slice(-5).reverse();

    // Sort by volatility
    const sortedByVolatility = [...validData].sort((a, b) => b.volatility - a.volatility);
    const mostVolatile = sortedByVolatility.slice(0, 5);

    // Determine overall market trend
    const avgPriceChange = validData.reduce((sum, data) => sum + data.priceChange24h, 0) / validData.length;
    const marketTrend = avgPriceChange > 1 ? 'bullish' : avgPriceChange < -1 ? 'bearish' : 'neutral';

    return {
      totalMarketCap,
      totalVolume24h,
      marketTrend,
      topGainers,
      topLosers,
      mostVolatile,
      lastUpdated: Date.now()
    };
  }

  public getAggregatedData(tokenSymbol?: string): AggregatedMarketData | AggregatedMarketData[] {
    if (tokenSymbol) {
      return this.aggregatedData.get(tokenSymbol) || null;
    }
    return Array.from(this.aggregatedData.values());
  }

  public getMarketTrend(tokenSymbol: string): MarketTrend | null {
    return this.marketTrends.get(tokenSymbol) || null;
  }

  public getAllMarketTrends(): MarketTrend[] {
    return Array.from(this.marketTrends.values());
  }

  public getHighConfidenceData(): AggregatedMarketData[] {
    return Array.from(this.aggregatedData.values())
      .filter(data => data.confidence >= this.config.confidenceThreshold);
  }

  public updateConfig(newConfig: Partial<AggregatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated aggregator configuration');
    this.emit('configUpdated', this.config);
  }

  public destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.aggregatedData.clear();
    this.marketTrends.clear();
    this.priceHistory.clear();
    console.log('🧹 Market data aggregator destroyed');
  }
}

// Singleton instance
let aggregatorInstance: MarketDataAggregator | null = null;

export const getMarketDataAggregator = (config?: Partial<AggregatorConfig>): MarketDataAggregator => {
  if (!aggregatorInstance) {
    aggregatorInstance = new MarketDataAggregator(config);
  }
  return aggregatorInstance;
};

export const destroyMarketDataAggregator = (): void => {
  if (aggregatorInstance) {
    aggregatorInstance.destroy();
    aggregatorInstance = null;
  }
};