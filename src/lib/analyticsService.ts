import { EventEmitter } from 'events';
import { getRealTimeDataService, type PriceUpdate } from '@/lib/realTimeDataService';
import { getRiskMonitoringService, type PortfolioHealthSummary } from '@/lib/riskMonitoringService';
import { getMarketOpportunityService, type YieldOpportunity, type OpportunityStats } from '@/lib/marketOpportunityService';

export interface PerformanceMetrics {
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  volatility: number; // percentage
  sharpeRatio: number;
  maxDrawdown: number; // percentage
  winRate: number; // percentage
  profitFactor: number;
  calmarRatio: number;
  sortinoRatio: number;
}

export interface PortfolioAnalytics {
  userAddress: string;
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  assetAllocation: AssetAllocation[];
  performanceMetrics: PerformanceMetrics;
  riskMetrics: RiskMetrics;
  yieldMetrics: YieldMetrics;
  transactionMetrics: TransactionMetrics;
  lastUpdated: number;
}

export interface AssetAllocation {
  tokenSymbol: string;
  value: number;
  percentage: number;
  pnl: number;
  pnlPercentage: number;
  allocation: 'underweight' | 'optimal' | 'overweight';
}

export interface RiskMetrics {
  portfolioRisk: number; // 0-100 scale
  concentrationRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  healthFactor: number;
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number; // 95% ES
}

export interface YieldMetrics {
  totalYieldEarned: number;
  averageAPY: number;
  yieldByStrategy: YieldByStrategy[];
  compoundingEffect: number;
  yieldEfficiency: number; // yield per unit of risk
}

export interface YieldByStrategy {
  strategy: string;
  totalYield: number;
  apy: number;
  allocation: number;
  riskAdjustedReturn: number;
}

export interface TransactionMetrics {
  totalTransactions: number;
  totalFees: number;
  averageFee: number;
  successRate: number; // percentage
  gasEfficiency: number;
  failureRate: number; // percentage
}

export interface HistoricalPerformance {
  timestamp: number;
  portfolioValue: number;
  totalReturn: number;
  dailyReturn: number;
  volatility: number;
  drawdown: number;
}

export interface RebalancingRecommendation {
  action: 'buy' | 'sell' | 'hold';
  tokenSymbol: string;
  currentWeight: number;
  targetWeight: number;
  amount: number;
  reason: string;
  expectedImpact: {
    returnIncrease: number;
    riskReduction: number;
    sharpeImprovement: number;
  };
}

export interface AnalyticsConfig {
  updateInterval: number; // milliseconds
  historicalDataPeriod: number; // days
  riskFreeRate: number; // percentage
  benchmarkTokens: string[];
  enableRealTimeUpdates: boolean;
  enableNotifications: boolean;
}

export interface AnalyticsServiceState {
  isActive: boolean;
  lastUpdate: number;
  trackedUsers: Set<string>;
  portfolioAnalytics: Map<string, PortfolioAnalytics>;
  historicalData: Map<string, HistoricalPerformance[]>;
  rebalancingRecommendations: Map<string, RebalancingRecommendation[]>;
}

export class AnalyticsService extends EventEmitter {
  private config: AnalyticsConfig;
  private state: AnalyticsServiceState;
  private updateInterval: NodeJS.Timeout | null = null;
  private realTimeDataService: any;
  private riskMonitoringService: any;
  private marketOpportunityService: any;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();

    this.config = {
      updateInterval: 30000, // 30 seconds
      historicalDataPeriod: 365, // 1 year
      riskFreeRate: 2.0, // 2% risk-free rate
      benchmarkTokens: ['APT', 'BTC', 'ETH'],
      enableRealTimeUpdates: true,
      enableNotifications: true,
      ...config
    };

    this.state = {
      isActive: false,
      lastUpdate: 0,
      trackedUsers: new Set(),
      portfolioAnalytics: new Map(),
      historicalData: new Map(),
      rebalancingRecommendations: new Map()
    };

    // Initialize dependent services
    this.initializeServices();
  }

  private initializeServices() {
    try {
      this.realTimeDataService = getRealTimeDataService();
      this.riskMonitoringService = getRiskMonitoringService();
      this.marketOpportunityService = getMarketOpportunityService();
    } catch (error) {
      console.error('Failed to initialize analytics service dependencies:', error);
    }
  }

  async startAnalytics(): Promise<void> {
    if (this.state.isActive) {
      return;
    }

    try {
      this.state.isActive = true;
      this.state.lastUpdate = Date.now();

      // Start dependent services if needed
      if (this.realTimeDataService && this.config.enableRealTimeUpdates) {
        await this.realTimeDataService.start();
      }

      // Start periodic updates
      if (this.config.updateInterval > 0) {
        this.updateInterval = setInterval(() => {
          this.updateAllAnalytics();
        }, this.config.updateInterval);
      }

      this.emit('analyticsStarted', { timestamp: this.state.lastUpdate });
      console.log('📊 Analytics service started');

    } catch (error) {
      this.state.isActive = false;
      this.emit('analyticsError', { error, timestamp: Date.now() });
      throw error;
    }
  }

  stopAnalytics(): void {
    if (!this.state.isActive) {
      return;
    }

    this.state.isActive = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.emit('analyticsStopped', { timestamp: Date.now() });
    console.log('🛑 Analytics service stopped');
  }

  addUserToTracking(userAddress: string): void {
    this.state.trackedUsers.add(userAddress);

    // Initialize analytics for new user
    this.initializeUserAnalytics(userAddress);

    this.emit('userAdded', { userAddress, timestamp: Date.now() });
  }

  removeUserFromTracking(userAddress: string): void {
    this.state.trackedUsers.delete(userAddress);
    this.state.portfolioAnalytics.delete(userAddress);
    this.state.historicalData.delete(userAddress);
    this.state.rebalancingRecommendations.delete(userAddress);

    this.emit('userRemoved', { userAddress, timestamp: Date.now() });
  }

  private async initializeUserAnalytics(userAddress: string): Promise<void> {
    try {
      // Generate initial analytics
      const analytics = await this.generatePortfolioAnalytics(userAddress);
      this.state.portfolioAnalytics.set(userAddress, analytics);

      // Initialize historical data
      const historicalData = await this.generateHistoricalData(userAddress);
      this.state.historicalData.set(userAddress, historicalData);

      // Generate rebalancing recommendations
      const recommendations = await this.generateRebalancingRecommendations(userAddress, analytics);
      this.state.rebalancingRecommendations.set(userAddress, recommendations);

    } catch (error) {
      console.error(`Failed to initialize analytics for user ${userAddress}:`, error);
      this.emit('analyticsError', { error, userAddress, timestamp: Date.now() });
    }
  }

  private async updateAllAnalytics(): Promise<void> {
    const updatePromises = Array.from(this.state.trackedUsers).map(userAddress =>
      this.updateUserAnalytics(userAddress)
    );

    try {
      await Promise.all(updatePromises);
      this.state.lastUpdate = Date.now();
      this.emit('analyticsUpdated', { timestamp: this.state.lastUpdate });
    } catch (error) {
      console.error('Failed to update analytics:', error);
      this.emit('analyticsError', { error, timestamp: Date.now() });
    }
  }

  private async updateUserAnalytics(userAddress: string): Promise<void> {
    try {
      const analytics = await this.generatePortfolioAnalytics(userAddress);
      const previousAnalytics = this.state.portfolioAnalytics.get(userAddress);

      this.state.portfolioAnalytics.set(userAddress, analytics);

      // Update historical data
      const historicalData = this.state.historicalData.get(userAddress) || [];
      historicalData.push({
        timestamp: Date.now(),
        portfolioValue: analytics.totalValue,
        totalReturn: analytics.performanceMetrics.totalReturn,
        dailyReturn: this.calculateDailyReturn(analytics, previousAnalytics),
        volatility: analytics.performanceMetrics.volatility,
        drawdown: analytics.performanceMetrics.maxDrawdown
      });

      // Keep only recent historical data
      const cutoffTime = Date.now() - (this.config.historicalDataPeriod * 24 * 60 * 60 * 1000);
      const filteredData = historicalData.filter(data => data.timestamp > cutoffTime);
      this.state.historicalData.set(userAddress, filteredData);

      // Update rebalancing recommendations
      const recommendations = await this.generateRebalancingRecommendations(userAddress, analytics);
      this.state.rebalancingRecommendations.set(userAddress, recommendations);

      this.emit('userAnalyticsUpdated', { userAddress, analytics, timestamp: Date.now() });

    } catch (error) {
      console.error(`Failed to update analytics for user ${userAddress}:`, error);
      this.emit('analyticsError', { error, userAddress, timestamp: Date.now() });
    }
  }

  private async generatePortfolioAnalytics(userAddress: string): Promise<PortfolioAnalytics> {
    // In production, this would fetch real data from smart contracts
    // For now, we'll generate realistic mock data

    const mockAssetAllocation: AssetAllocation[] = [
      {
        tokenSymbol: 'APT',
        value: 12500,
        percentage: 45.2,
        pnl: 1850,
        pnlPercentage: 17.4,
        allocation: 'optimal'
      },
      {
        tokenSymbol: 'USDC',
        value: 8200,
        percentage: 29.6,
        pnl: 320,
        pnlPercentage: 4.1,
        allocation: 'overweight'
      },
      {
        tokenSymbol: 'ETH',
        value: 4800,
        percentage: 17.3,
        pnl: 680,
        pnlPercentage: 16.5,
        allocation: 'underweight'
      },
      {
        tokenSymbol: 'BTC',
        value: 2200,
        percentage: 7.9,
        pnl: 290,
        pnlPercentage: 15.2,
        allocation: 'optimal'
      }
    ];

    const totalValue = mockAssetAllocation.reduce((sum, asset) => sum + asset.value, 0);
    const totalPnL = mockAssetAllocation.reduce((sum, asset) => sum + asset.pnl, 0);

    const performanceMetrics: PerformanceMetrics = {
      totalReturn: 15.7,
      annualizedReturn: 23.4,
      volatility: 18.2,
      sharpeRatio: this.calculateSharpeRatio(23.4, 18.2),
      maxDrawdown: -8.3,
      winRate: 67.5,
      profitFactor: 2.1,
      calmarRatio: this.calculateCalmarRatio(23.4, 8.3),
      sortinoRatio: this.calculateSortinoRatio(23.4, 12.8)
    };

    const riskMetrics: RiskMetrics = {
      portfolioRisk: 32,
      concentrationRisk: 28,
      liquidityRisk: 15,
      correlationRisk: 42,
      healthFactor: 2.1,
      valueAtRisk: -1250,
      expectedShortfall: -1890
    };

    const yieldMetrics: YieldMetrics = {
      totalYieldEarned: 2340,
      averageAPY: 12.8,
      yieldByStrategy: [
        {
          strategy: 'Lending Pools',
          totalYield: 1200,
          apy: 15.2,
          allocation: 35,
          riskAdjustedReturn: 11.8
        },
        {
          strategy: 'Yield Vaults',
          totalYield: 890,
          apy: 18.7,
          allocation: 25,
          riskAdjustedReturn: 14.2
        },
        {
          strategy: 'LP Rewards',
          totalYield: 250,
          apy: 8.3,
          allocation: 40,
          riskAdjustedReturn: 6.9
        }
      ],
      compoundingEffect: 18.5,
      yieldEfficiency: 0.71
    };

    const transactionMetrics: TransactionMetrics = {
      totalTransactions: 156,
      totalFees: 45.7,
      averageFee: 0.29,
      successRate: 98.7,
      gasEfficiency: 85.3,
      failureRate: 1.3
    };

    return {
      userAddress,
      totalValue,
      totalPnL,
      totalPnLPercentage: (totalPnL / (totalValue - totalPnL)) * 100,
      assetAllocation: mockAssetAllocation,
      performanceMetrics,
      riskMetrics,
      yieldMetrics,
      transactionMetrics,
      lastUpdated: Date.now()
    };
  }

  private async generateHistoricalData(userAddress: string): Promise<HistoricalPerformance[]> {
    const data: HistoricalPerformance[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Generate 30 days of historical data
    for (let i = 30; i >= 0; i--) {
      const timestamp = now - (i * dayMs);
      const baseValue = 25000;
      const volatility = 0.02; // 2% daily volatility
      const trend = 0.001; // 0.1% daily trend

      const randomReturn = (Math.random() - 0.5) * volatility * 2;
      const trendReturn = trend * (30 - i) / 30;
      const totalReturn = (randomReturn + trendReturn) * 100;

      const portfolioValue = baseValue * (1 + (randomReturn + trendReturn));

      data.push({
        timestamp,
        portfolioValue,
        totalReturn,
        dailyReturn: randomReturn * 100,
        volatility: Math.abs(randomReturn) * 100,
        drawdown: Math.min(0, randomReturn * 100)
      });
    }

    return data;
  }

  private async generateRebalancingRecommendations(
    userAddress: string,
    analytics: PortfolioAnalytics
  ): Promise<RebalancingRecommendation[]> {
    const recommendations: RebalancingRecommendation[] = [];

    // Analyze current allocation vs optimal
    for (const asset of analytics.assetAllocation) {
      if (asset.allocation === 'overweight') {
        recommendations.push({
          action: 'sell',
          tokenSymbol: asset.tokenSymbol,
          currentWeight: asset.percentage,
          targetWeight: asset.percentage * 0.8, // Reduce by 20%
          amount: asset.value * 0.2,
          reason: 'Reduce overweight position',
          expectedImpact: {
            returnIncrease: 1.2,
            riskReduction: 2.5,
            sharpeImprovement: 0.08
          }
        });
      } else if (asset.allocation === 'underweight') {
        recommendations.push({
          action: 'buy',
          tokenSymbol: asset.tokenSymbol,
          currentWeight: asset.percentage,
          targetWeight: asset.percentage * 1.3, // Increase by 30%
          amount: asset.value * 0.3,
          reason: 'Increase underweight position',
          expectedImpact: {
            returnIncrease: 1.8,
            riskReduction: 1.2,
            sharpeImprovement: 0.12
          }
        });
      }
    }

    return recommendations;
  }

  private calculateDailyReturn(current: PortfolioAnalytics, previous?: PortfolioAnalytics): number {
    if (!previous) return 0;
    return ((current.totalValue - previous.totalValue) / previous.totalValue) * 100;
  }

  private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
    return (annualizedReturn - this.config.riskFreeRate) / volatility;
  }

  private calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
    return annualizedReturn / Math.abs(maxDrawdown);
  }

  private calculateSortinoRatio(annualizedReturn: number, downsideVolatility: number): number {
    return (annualizedReturn - this.config.riskFreeRate) / downsideVolatility;
  }

  // Public API methods
  getUserAnalytics(userAddress: string): PortfolioAnalytics | null {
    return this.state.portfolioAnalytics.get(userAddress) || null;
  }

  getUserHistoricalData(userAddress: string): HistoricalPerformance[] {
    return this.state.historicalData.get(userAddress) || [];
  }

  getUserRebalancingRecommendations(userAddress: string): RebalancingRecommendation[] {
    return this.state.rebalancingRecommendations.get(userAddress) || [];
  }

  getTrackedUsers(): string[] {
    return Array.from(this.state.trackedUsers);
  }

  getServiceState(): AnalyticsServiceState {
    return { ...this.state };
  }

  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', { config: this.config, timestamp: Date.now() });
  }

  async refreshUserAnalytics(userAddress: string): Promise<void> {
    if (!this.state.trackedUsers.has(userAddress)) {
      throw new Error(`User ${userAddress} is not being tracked`);
    }

    await this.updateUserAnalytics(userAddress);
  }

  async refreshAllAnalytics(): Promise<void> {
    await this.updateAllAnalytics();
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export const getAnalyticsService = (config?: Partial<AnalyticsConfig>): AnalyticsService => {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService(config);
  }
  return analyticsServiceInstance;
};