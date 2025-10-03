import { EventEmitter } from 'events';
import { getTokenPriceInfo, isPriceFresh, getSupportedTokens, type TokenPriceInfo } from '@/view-functions/getOracleData';

export interface PriceUpdate {
  tokenSymbol: string;
  priceUSD: number;
  priceChange24h: number;
  timestamp: number;
  isStale: boolean;
  volatility?: number;
}

export interface MarketData {
  prices: Map<string, PriceUpdate>;
  lastUpdate: number;
  stalePrices: Set<string>;
  volatilityData: Map<string, number>;
}

export interface PriceAlert {
  id: string;
  tokenSymbol: string;
  type: 'price_above' | 'price_below' | 'volatility_high' | 'price_stale';
  threshold: number;
  currentValue: number;
  timestamp: number;
  message: string;
}

export interface DataServiceConfig {
  updateInterval: number; // milliseconds
  stalenessThreshold: number; // seconds
  volatilityThreshold: number; // percentage
  maxRetries: number;
  retryDelay: number; // milliseconds
}

export class RealTimeDataService extends EventEmitter {
  private config: DataServiceConfig;
  private marketData: MarketData;
  private updateTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private supportedTokens: string[] = [];
  private priceHistory: Map<string, PriceUpdate[]> = new Map();
  private alerts: Map<string, PriceAlert[]> = new Map();
  private retryCount = 0;

  constructor(config: Partial<DataServiceConfig> = {}) {
    super();

    this.config = {
      updateInterval: 30000, // 30 seconds
      stalenessThreshold: 300, // 5 minutes
      volatilityThreshold: 5, // 5%
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      ...config
    };

    this.marketData = {
      prices: new Map(),
      lastUpdate: 0,
      stalePrices: new Set(),
      volatilityData: new Map()
    };

    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Load supported tokens
      this.supportedTokens = await getSupportedTokens();
      console.log(`📊 Real-time data service initialized with ${this.supportedTokens.length} tokens`);

      // Initial data load
      await this.updateMarketData();

      this.emit('initialized', {
        supportedTokens: this.supportedTokens,
        initialData: this.marketData
      });
    } catch (error) {
      console.error('❌ Failed to initialize real-time data service:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Real-time data service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting real-time data service...');

    // Start periodic updates
    this.updateTimer = setInterval(async () => {
      await this.updateMarketData();
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

    console.log('🛑 Real-time data service stopped');
    this.emit('stopped');
  }

  private async updateMarketData(): Promise<void> {
    try {
      const updatePromises = this.supportedTokens.map(async (tokenSymbol) => {
        try {
          const priceInfo = await getTokenPriceInfo(tokenSymbol);
          const isFresh = await isPriceFresh(tokenSymbol);

          const priceUpdate: PriceUpdate = {
            ...priceInfo,
            isStale: !isFresh,
            volatility: this.calculateVolatility(tokenSymbol, priceInfo.priceUSD)
          };

          // Update market data
          this.marketData.prices.set(tokenSymbol, priceUpdate);

          // Track stale prices
          if (!isFresh) {
            this.marketData.stalePrices.add(tokenSymbol);
          } else {
            this.marketData.stalePrices.delete(tokenSymbol);
          }

          // Update volatility data
          if (priceUpdate.volatility !== undefined) {
            this.marketData.volatilityData.set(tokenSymbol, priceUpdate.volatility);
          }

          // Store price history
          this.updatePriceHistory(tokenSymbol, priceUpdate);

          // Check for alerts
          this.checkPriceAlerts(tokenSymbol, priceUpdate);

          return priceUpdate;
        } catch (error) {
          console.error(`❌ Failed to update price for ${tokenSymbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(result => result !== null);

      this.marketData.lastUpdate = Date.now();
      this.retryCount = 0; // Reset retry count on successful update

      // Emit update event
      this.emit('marketDataUpdated', {
        updates: successfulUpdates,
        stalePrices: Array.from(this.marketData.stalePrices),
        timestamp: this.marketData.lastUpdate
      });

      console.log(`📈 Updated prices for ${successfulUpdates.length}/${this.supportedTokens.length} tokens`);

    } catch (error) {
      console.error('❌ Failed to update market data:', error);
      await this.handleUpdateError(error);
    }
  }

  private async handleUpdateError(error: any): Promise<void> {
    this.retryCount++;

    if (this.retryCount <= this.config.maxRetries) {
      console.log(`🔄 Retrying market data update (${this.retryCount}/${this.config.maxRetries})...`);

      setTimeout(async () => {
        await this.updateMarketData();
      }, this.config.retryDelay);
    } else {
      console.error('❌ Max retries exceeded for market data update');
      this.emit('error', {
        type: 'update_failed',
        error,
        retryCount: this.retryCount
      });
      this.retryCount = 0; // Reset for next cycle
    }
  }

  private calculateVolatility(tokenSymbol: string, currentPrice: number): number {
    const history = this.priceHistory.get(tokenSymbol) || [];

    if (history.length < 2) {
      return 0;
    }

    // Calculate volatility based on recent price changes
    const recentPrices = history.slice(-10).map(h => h.priceUSD); // Last 10 data points
    recentPrices.push(currentPrice);

    if (recentPrices.length < 2) {
      return 0;
    }

    // Calculate standard deviation of price changes
    const priceChanges = [];
    for (let i = 1; i < recentPrices.length; i++) {
      const change = (recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1];
      priceChanges.push(change);
    }

    const mean = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const variance = priceChanges.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / priceChanges.length;
    const volatility = Math.sqrt(variance) * 100; // Convert to percentage

    return volatility;
  }

  private updatePriceHistory(tokenSymbol: string, priceUpdate: PriceUpdate): void {
    if (!this.priceHistory.has(tokenSymbol)) {
      this.priceHistory.set(tokenSymbol, []);
    }

    const history = this.priceHistory.get(tokenSymbol)!;
    history.push(priceUpdate);

    // Keep only last 100 data points
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private checkPriceAlerts(tokenSymbol: string, priceUpdate: PriceUpdate): void {
    const userAlerts = this.alerts.get(tokenSymbol) || [];

    userAlerts.forEach(alert => {
      let triggered = false;
      let message = '';

      switch (alert.type) {
        case 'price_above':
          if (priceUpdate.priceUSD >= alert.threshold) {
            triggered = true;
            message = `${tokenSymbol} price ($${priceUpdate.priceUSD.toFixed(2)}) is above your alert threshold ($${alert.threshold.toFixed(2)})`;
          }
          break;
        case 'price_below':
          if (priceUpdate.priceUSD <= alert.threshold) {
            triggered = true;
            message = `${tokenSymbol} price ($${priceUpdate.priceUSD.toFixed(2)}) is below your alert threshold ($${alert.threshold.toFixed(2)})`;
          }
          break;
        case 'volatility_high':
          if ((priceUpdate.volatility || 0) >= alert.threshold) {
            triggered = true;
            message = `${tokenSymbol} volatility (${priceUpdate.volatility?.toFixed(2)}%) exceeds your threshold (${alert.threshold}%)`;
          }
          break;
        case 'price_stale':
          if (priceUpdate.isStale) {
            triggered = true;
            message = `${tokenSymbol} price data is stale and may not be reliable`;
          }
          break;
      }

      if (triggered) {
        this.emit('priceAlert', {
          ...alert,
          currentValue: priceUpdate.priceUSD,
          timestamp: Date.now(),
          message
        });
      }
    });
  }

  // Public API methods
  public getMarketData(): MarketData {
    return { ...this.marketData };
  }

  public getTokenPrice(tokenSymbol: string): PriceUpdate | null {
    return this.marketData.prices.get(tokenSymbol) || null;
  }

  public getStalePrices(): string[] {
    return Array.from(this.marketData.stalePrices);
  }

  public getVolatilityData(): Map<string, number> {
    return new Map(this.marketData.volatilityData);
  }

  public getPriceHistory(tokenSymbol: string, limit: number = 50): PriceUpdate[] {
    const history = this.priceHistory.get(tokenSymbol) || [];
    return history.slice(-limit);
  }

  public addPriceAlert(tokenSymbol: string, alert: Omit<PriceAlert, 'id' | 'tokenSymbol' | 'currentValue' | 'timestamp' | 'message'>): string {
    const alertId = `${tokenSymbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullAlert: PriceAlert = {
      id: alertId,
      tokenSymbol,
      currentValue: 0,
      timestamp: Date.now(),
      message: '',
      ...alert
    };

    if (!this.alerts.has(tokenSymbol)) {
      this.alerts.set(tokenSymbol, []);
    }

    this.alerts.get(tokenSymbol)!.push(fullAlert);

    console.log(`🔔 Added price alert for ${tokenSymbol}: ${alert.type} at ${alert.threshold}`);
    return alertId;
  }

  public removePriceAlert(alertId: string): boolean {
    for (const [tokenSymbol, alerts] of this.alerts.entries()) {
      const index = alerts.findIndex(alert => alert.id === alertId);
      if (index !== -1) {
        alerts.splice(index, 1);
        if (alerts.length === 0) {
          this.alerts.delete(tokenSymbol);
        }
        console.log(`🗑️ Removed price alert: ${alertId}`);
        return true;
      }
    }
    return false;
  }

  public getUserAlerts(tokenSymbol?: string): PriceAlert[] {
    if (tokenSymbol) {
      return this.alerts.get(tokenSymbol) || [];
    }

    const allAlerts: PriceAlert[] = [];
    for (const alerts of this.alerts.values()) {
      allAlerts.push(...alerts);
    }
    return allAlerts;
  }

  public isDataStale(): boolean {
    const now = Date.now();
    const timeSinceUpdate = now - this.marketData.lastUpdate;
    return timeSinceUpdate > (this.config.stalenessThreshold * 1000);
  }

  public getServiceStatus(): {
    isRunning: boolean;
    lastUpdate: number;
    supportedTokens: number;
    stalePrices: number;
    isDataStale: boolean;
  } {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.marketData.lastUpdate,
      supportedTokens: this.supportedTokens.length,
      stalePrices: this.marketData.stalePrices.size,
      isDataStale: this.isDataStale()
    };
  }

  // Cleanup
  public destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.marketData.prices.clear();
    this.marketData.stalePrices.clear();
    this.marketData.volatilityData.clear();
    this.priceHistory.clear();
    this.alerts.clear();
    console.log('🧹 Real-time data service destroyed');
  }
}

// Singleton instance
let dataServiceInstance: RealTimeDataService | null = null;

export const getRealTimeDataService = (config?: Partial<DataServiceConfig>): RealTimeDataService => {
  if (!dataServiceInstance) {
    dataServiceInstance = new RealTimeDataService(config);
  }
  return dataServiceInstance;
};

export const destroyRealTimeDataService = (): void => {
  if (dataServiceInstance) {
    dataServiceInstance.destroy();
    dataServiceInstance = null;
  }
};