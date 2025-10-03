import { EventEmitter } from 'events';
import { getTokenPriceInfo, getMultipleTokenPrices, type TokenPriceInfo } from '@/view-functions/getOracleData';
import { getAvailableVaults, getVaultAPY, type VaultInfo } from '@/view-functions/getYieldVaultData';
import { getLendingPools, type LendingPool } from '@/view-functions/getLendingData';
import { getPoolInfo, type PoolInfo } from '@/view-functions/getPoolInfo';
import { getRealTimeDataService, type PriceUpdate } from '@/lib/realTimeDataService';

export interface YieldOpportunity {
  id: string;
  type: 'lending' | 'vault' | 'liquidity_pool' | 'arbitrage';
  tokenSymbol: string;
  platform: string;
  apy: number;
  tvl: number;
  riskLevel: 'low' | 'medium' | 'high';
  minDeposit: number;
  lockupPeriod: number; // in days
  description: string;
  advantages: string[];
  risks: string[];
  timestamp: number;
  confidence: number; // 0-100
}

export interface ArbitrageOpportunity {
  id: string;
  tokenSymbol: string;
  buyPlatform: string;
  sellPlatform: string;
  buyPrice: number;
  sellPrice: number;
  priceDifference: number;
  profitPercentage: number;
  estimatedProfit: number;
  volume24h: number;
  liquidityScore: number;
  executionComplexity: 'simple' | 'medium' | 'complex';
  timeWindow: number; // estimated time window in seconds
  gasEstimate: number;
  minProfitThreshold: number;
  timestamp: number;
}

export interface MarketTiming {
  tokenSymbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string[];
  technicalIndicators: {
    rsi: number;
    macd: number;
    sma: number;
    volatility: number;
  };
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  priceTarget: number;
  stopLoss: number;
  timeHorizon: '1h' | '4h' | '1d' | '1w';
  timestamp: number;
}

export interface InvestmentRecommendation {
  id: string;
  type: 'yield_farming' | 'lending' | 'trading' | 'arbitrage' | 'diversification';
  title: string;
  description: string;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  requiredCapital: number;
  steps: string[];
  pros: string[];
  cons: string[];
  marketConditions: string[];
  confidence: number;
  timestamp: number;
}

export interface OpportunityDetectionConfig {
  scanInterval: number; // milliseconds
  minYieldThreshold: number; // minimum APY to consider
  minArbitrageProfit: number; // minimum profit percentage
  maxRiskLevel: 'low' | 'medium' | 'high';
  enabledOpportunityTypes: {
    yield: boolean;
    arbitrage: boolean;
    timing: boolean;
    recommendations: boolean;
  };
  notificationThresholds: {
    highYield: number; // APY threshold for notifications
    arbitrageProfit: number; // profit percentage threshold
    timingConfidence: number; // confidence threshold for timing alerts
  };
}

export interface OpportunityStats {
  totalOpportunities: number;
  yieldOpportunities: number;
  arbitrageOpportunities: number;
  averageYield: number;
  bestYieldOpportunity: YieldOpportunity | null;
  bestArbitrageOpportunity: ArbitrageOpportunity | null;
  lastScan: number;
  scanDuration: number;
}

export class MarketOpportunityService extends EventEmitter {
  private config: OpportunityDetectionConfig;
  private yieldOpportunities: Map<string, YieldOpportunity> = new Map();
  private arbitrageOpportunities: Map<string, ArbitrageOpportunity> = new Map();
  private marketTimings: Map<string, MarketTiming> = new Map();
  private recommendations: Map<string, InvestmentRecommendation> = new Map();
  private scanTimer: NodeJS.Timeout | null = null;
  private isScanning = false;
  private lastScanTime = 0;
  private scanDuration = 0;
  private supportedTokens: string[] = [];
  private priceHistory: Map<string, PriceUpdate[]> = new Map();
  private isDestroyed = false;

  constructor(config: Partial<OpportunityDetectionConfig> = {}) {
    super();

    this.config = {
      scanInterval: 300000, // 5 minutes
      minYieldThreshold: 5, // 5% APY minimum
      minArbitrageProfit: 0.5, // 0.5% minimum profit
      maxRiskLevel: 'high',
      enabledOpportunityTypes: {
        yield: true,
        arbitrage: true,
        timing: true,
        recommendations: true
      },
      notificationThresholds: {
        highYield: 15, // 15% APY
        arbitrageProfit: 2, // 2% profit
        timingConfidence: 80 // 80% confidence
      },
      ...config
    };

    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Get supported tokens
      this.supportedTokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH']; // Default tokens

      // Listen to price updates for opportunity detection
      const realTimeService = getRealTimeDataService();
      realTimeService.on('marketDataUpdated', (data) => {
        this.handlePriceUpdates(data);
      });

      console.log('🔍 Market opportunity service initialized');
      this.emit('initialized', { supportedTokens: this.supportedTokens });

    } catch (error) {
      console.error('❌ Failed to initialize market opportunity service:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  private handlePriceUpdates(data: any): void {
    const { updates } = data;

    updates.forEach((update: PriceUpdate) => {
      // Update price history
      this.updatePriceHistory(update.tokenSymbol, update);

      // Trigger opportunity detection for significant price changes
      if (Math.abs(update.priceChange24h) > 5) { // 5% change
        this.detectTimingOpportunities(update.tokenSymbol);
      }
    });
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

  public async startScanning(): Promise<void> {
    if (this.isScanning) {
      console.warn('⚠️ Market opportunity scanning is already active');
      return;
    }

    if (this.isDestroyed) {
      throw new Error('Service has been destroyed');
    }

    this.isScanning = true;
    console.log('🚀 Starting market opportunity scanning...');

    // Start scanning loop
    this.scanTimer = setInterval(async () => {
      await this.performOpportunityScan();
    }, this.config.scanInterval);

    // Initial scan
    await this.performOpportunityScan();

    this.emit('scanningStarted', { timestamp: Date.now() });
  }

  public stopScanning(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    console.log('🛑 Market opportunity scanning stopped');
    this.emit('scanningStopped', { timestamp: Date.now() });
  }

  private async performOpportunityScan(): Promise<void> {
    if (!this.isScanning || this.isDestroyed) {
      return;
    }

    const scanStartTime = Date.now();
    console.log('🔍 Performing opportunity scan...');

    try {
      const scanPromises: Promise<void>[] = [];

      // Scan for yield opportunities
      if (this.config.enabledOpportunityTypes.yield) {
        scanPromises.push(this.scanYieldOpportunities());
      }

      // Scan for arbitrage opportunities
      if (this.config.enabledOpportunityTypes.arbitrage) {
        scanPromises.push(this.scanArbitrageOpportunities());
      }

      // Analyze market timing
      if (this.config.enabledOpportunityTypes.timing) {
        scanPromises.push(this.analyzeMarketTiming());
      }

      // Generate investment recommendations
      if (this.config.enabledOpportunityTypes.recommendations) {
        scanPromises.push(this.generateInvestmentRecommendations());
      }

      await Promise.all(scanPromises);

      this.lastScanTime = Date.now();
      this.scanDuration = this.lastScanTime - scanStartTime;

      console.log(`✅ Opportunity scan completed in ${this.scanDuration}ms`);

      this.emit('scanCompleted', {
        duration: this.scanDuration,
        opportunities: this.getOpportunityStats(),
        timestamp: this.lastScanTime
      });

    } catch (error) {
      console.error('❌ Opportunity scan failed:', error);
      this.emit('scanError', { error, timestamp: Date.now() });
    }
  }

  private async scanYieldOpportunities(): Promise<void> {
    try {
      // Scan yield vaults
      await this.scanVaultOpportunities();

      // Scan lending opportunities
      await this.scanLendingOpportunities();

      // Scan liquidity pool opportunities
      await this.scanLiquidityPoolOpportunities();

    } catch (error) {
      console.error('❌ Failed to scan yield opportunities:', error);
    }
  }

  private async scanVaultOpportunities(): Promise<void> {
    try {
      const vaults = await getAvailableVaults();

      for (const vault of vaults) {
        const apy = await getVaultAPY(vault.id);
        const apyPercentage = apy / 100; // Convert from basis points to percentage

        if (apyPercentage >= this.config.minYieldThreshold) {
          const opportunity: YieldOpportunity = {
            id: `vault_${vault.id}`,
            type: 'vault',
            tokenSymbol: vault.tokenSymbol,
            platform: 'AptoFi Vaults',
            apy: apyPercentage,
            tvl: vault.totalDeposits,
            riskLevel: this.assessVaultRiskLevel(vault),
            minDeposit: 0, // No minimum for vaults
            lockupPeriod: 0, // No lockup for vaults
            description: `${vault.name} - Strategy Type ${vault.strategyType}`,
            advantages: [
              'Automated yield optimization',
              'Professional strategy management',
              'No lockup period',
              'Compound interest'
            ],
            risks: [
              'Smart contract risk',
              'Strategy risk',
              'Market volatility',
              'Impermanent loss (for LP strategies)'
            ],
            timestamp: Date.now(),
            confidence: this.calculateYieldConfidence(vault.apy, vault.totalDeposits)
          };

          this.yieldOpportunities.set(opportunity.id, opportunity);

          // Emit high yield notification
          if (vault.apy >= this.config.notificationThresholds.highYield) {
            this.emit('highYieldOpportunity', opportunity);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to scan vault opportunities:', error);
    }
  }

  private async scanLendingOpportunities(): Promise<void> {
    try {
      const lendingPools = await getLendingPools();

      for (const pool of lendingPools) {
        if (pool.supplyAPY >= this.config.minYieldThreshold) {
          const opportunity: YieldOpportunity = {
            id: `lending_${pool.tokenSymbol}`,
            type: 'lending',
            tokenSymbol: pool.tokenSymbol,
            platform: 'AptoFi Lending',
            apy: pool.supplyAPY,
            tvl: pool.totalLiquidity,
            riskLevel: this.assessLendingRiskLevel(pool),
            minDeposit: 0,
            lockupPeriod: 0,
            description: `Supply ${pool.tokenSymbol} to earn interest`,
            advantages: [
              'Stable yield',
              'High liquidity',
              'No lockup period',
              'Established protocol'
            ],
            risks: [
              'Protocol risk',
              'Liquidation risk for borrowers',
              'Interest rate volatility'
            ],
            timestamp: Date.now(),
            confidence: this.calculateYieldConfidence(pool.supplyAPY, pool.totalLiquidity)
          };

          this.yieldOpportunities.set(opportunity.id, opportunity);

          if (pool.supplyAPY >= this.config.notificationThresholds.highYield) {
            this.emit('highYieldOpportunity', opportunity);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to scan lending opportunities:', error);
    }
  }

  private async scanLiquidityPoolOpportunities(): Promise<void> {
    try {
      const pools = await getPoolInfo();

      for (const pool of pools) {
        // Calculate estimated APY based on fees and volume
        const estimatedAPY = this.calculateLPAPY(pool);

        if (estimatedAPY >= this.config.minYieldThreshold) {
          const opportunity: YieldOpportunity = {
            id: `lp_${pool.tokenA}_${pool.tokenB}`,
            type: 'liquidity_pool',
            tokenSymbol: `${pool.tokenA}/${pool.tokenB}`,
            platform: 'AptoFi AMM',
            apy: estimatedAPY,
            tvl: pool.totalLiquidity,
            riskLevel: 'medium', // LP positions always have medium risk
            minDeposit: 0,
            lockupPeriod: 0,
            description: `Provide liquidity for ${pool.tokenA}/${pool.tokenB} pair`,
            advantages: [
              'Trading fee rewards',
              'High potential returns',
              'No lockup period',
              'Diversified exposure'
            ],
            risks: [
              'Impermanent loss',
              'Price volatility',
              'Smart contract risk',
              'Liquidity risk'
            ],
            timestamp: Date.now(),
            confidence: this.calculateYieldConfidence(estimatedAPY, pool.totalLiquidity)
          };

          this.yieldOpportunities.set(opportunity.id, opportunity);

          if (estimatedAPY >= this.config.notificationThresholds.highYield) {
            this.emit('highYieldOpportunity', opportunity);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to scan liquidity pool opportunities:', error);
    }
  }

  private async scanArbitrageOpportunities(): Promise<void> {
    try {
      // For demonstration, we'll simulate arbitrage opportunities
      // In a real implementation, this would compare prices across multiple DEXs

      const tokens = this.supportedTokens;

      for (const token of tokens) {
        const priceInfo = await getTokenPriceInfo(token);

        // Simulate price differences between platforms
        const platforms = ['AptoFi', 'PancakeSwap', 'Uniswap'];
        const basePriceVariation = 0.002; // 0.2% base variation

        for (let i = 0; i < platforms.length - 1; i++) {
          for (let j = i + 1; j < platforms.length; j++) {
            const variation1 = (Math.random() - 0.5) * basePriceVariation * 2;
            const variation2 = (Math.random() - 0.5) * basePriceVariation * 2;

            const price1 = priceInfo.priceUSD * (1 + variation1);
            const price2 = priceInfo.priceUSD * (1 + variation2);

            const priceDiff = Math.abs(price2 - price1);
            const profitPercentage = (priceDiff / Math.min(price1, price2)) * 100;

            if (profitPercentage >= this.config.minArbitrageProfit) {
              const buyPlatform = price1 < price2 ? platforms[i] : platforms[j];
              const sellPlatform = price1 < price2 ? platforms[j] : platforms[i];
              const buyPrice = Math.min(price1, price2);
              const sellPrice = Math.max(price1, price2);

              const opportunity: ArbitrageOpportunity = {
                id: `arb_${token}_${buyPlatform}_${sellPlatform}_${Date.now()}`,
                tokenSymbol: token,
                buyPlatform,
                sellPlatform,
                buyPrice,
                sellPrice,
                priceDifference: priceDiff,
                profitPercentage,
                estimatedProfit: priceDiff * 1000, // Assuming 1000 token trade
                volume24h: Math.random() * 1000000, // Mock volume
                liquidityScore: Math.random() * 100,
                executionComplexity: profitPercentage > 2 ? 'simple' : 'medium',
                timeWindow: Math.max(60, 300 - (profitPercentage * 50)), // Smaller window for higher profit
                gasEstimate: Math.random() * 50 + 10,
                minProfitThreshold: this.config.minArbitrageProfit,
                timestamp: Date.now()
              };

              this.arbitrageOpportunities.set(opportunity.id, opportunity);

              if (profitPercentage >= this.config.notificationThresholds.arbitrageProfit) {
                this.emit('arbitrageOpportunity', opportunity);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to scan arbitrage opportunities:', error);
    }
  }

  private async analyzeMarketTiming(): Promise<void> {
    try {
      for (const token of this.supportedTokens) {
        const timing = await this.detectTimingOpportunities(token);
        if (timing) {
          this.marketTimings.set(token, timing);

          if (timing.confidence >= this.config.notificationThresholds.timingConfidence) {
            this.emit('timingOpportunity', timing);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to analyze market timing:', error);
    }
  }

  private async detectTimingOpportunities(tokenSymbol: string): Promise<MarketTiming | null> {
    try {
      const priceHistory = this.priceHistory.get(tokenSymbol);
      if (!priceHistory || priceHistory.length < 20) {
        return null;
      }

      const currentPrice = priceHistory[priceHistory.length - 1];
      const prices = priceHistory.map(p => p.priceUSD);

      // Calculate technical indicators
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const sma = this.calculateSMA(prices, 20);
      const volatility = currentPrice.volatility || 0;

      // Determine action based on indicators
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      let confidence = 50;
      const reasoning: string[] = [];

      // RSI analysis
      if (rsi < 30) {
        action = 'buy';
        confidence += 20;
        reasoning.push('RSI indicates oversold conditions');
      } else if (rsi > 70) {
        action = 'sell';
        confidence += 20;
        reasoning.push('RSI indicates overbought conditions');
      }

      // Price vs SMA analysis
      if (currentPrice.priceUSD > sma * 1.05) {
        if (action !== 'sell') action = 'buy';
        confidence += 15;
        reasoning.push('Price significantly above moving average');
      } else if (currentPrice.priceUSD < sma * 0.95) {
        if (action !== 'buy') action = 'sell';
        confidence += 15;
        reasoning.push('Price significantly below moving average');
      }

      // MACD analysis
      if (macd.macd > macd.signal) {
        if (action !== 'sell') action = 'buy';
        confidence += 10;
        reasoning.push('MACD shows bullish momentum');
      } else {
        if (action !== 'buy') action = 'sell';
        confidence += 10;
        reasoning.push('MACD shows bearish momentum');
      }

      // Volatility analysis
      if (volatility > 15) {
        confidence -= 10;
        reasoning.push('High volatility increases uncertainty');
      }

      // Market sentiment (simplified)
      const priceChange24h = currentPrice.priceChange24h;
      const marketSentiment: 'bullish' | 'bearish' | 'neutral' =
        priceChange24h > 2 ? 'bullish' : priceChange24h < -2 ? 'bearish' : 'neutral';

      // Calculate price targets
      const priceTarget = action === 'buy' ?
        currentPrice.priceUSD * 1.1 : currentPrice.priceUSD * 0.9;
      const stopLoss = action === 'buy' ?
        currentPrice.priceUSD * 0.95 : currentPrice.priceUSD * 1.05;

      return {
        tokenSymbol,
        action,
        confidence: Math.min(100, Math.max(0, confidence)),
        reasoning,
        technicalIndicators: {
          rsi,
          macd: macd.macd,
          sma,
          volatility
        },
        marketSentiment,
        priceTarget,
        stopLoss,
        timeHorizon: volatility > 10 ? '1h' : volatility > 5 ? '4h' : '1d',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ Failed to detect timing opportunities for ${tokenSymbol}:`, error);
      return null;
    }
  }

  private async generateInvestmentRecommendations(): Promise<void> {
    try {
      // Generate recommendations based on current opportunities
      const recommendations: InvestmentRecommendation[] = [];

      // High yield recommendation
      const bestYieldOpp = this.getBestYieldOpportunity();
      if (bestYieldOpp && bestYieldOpp.apy > 10) {
        recommendations.push({
          id: `rec_yield_${Date.now()}`,
          type: 'yield_farming',
          title: `High Yield Opportunity: ${bestYieldOpp.apy.toFixed(1)}% APY`,
          description: `Earn ${bestYieldOpp.apy.toFixed(1)}% APY by ${bestYieldOpp.description}`,
          expectedReturn: bestYieldOpp.apy,
          riskLevel: bestYieldOpp.riskLevel,
          timeHorizon: 'medium',
          requiredCapital: bestYieldOpp.minDeposit,
          steps: [
            'Connect your wallet',
            `Navigate to ${bestYieldOpp.platform}`,
            `Deposit ${bestYieldOpp.tokenSymbol}`,
            'Monitor your position regularly'
          ],
          pros: bestYieldOpp.advantages,
          cons: bestYieldOpp.risks,
          marketConditions: ['Favorable yield environment', 'High TVL indicates trust'],
          confidence: bestYieldOpp.confidence,
          timestamp: Date.now()
        });
      }

      // Arbitrage recommendation
      const bestArbOpp = this.getBestArbitrageOpportunity();
      if (bestArbOpp && bestArbOpp.profitPercentage > 1) {
        recommendations.push({
          id: `rec_arb_${Date.now()}`,
          type: 'arbitrage',
          title: `Arbitrage Opportunity: ${bestArbOpp.profitPercentage.toFixed(2)}% Profit`,
          description: `Profit from price difference between ${bestArbOpp.buyPlatform} and ${bestArbOpp.sellPlatform}`,
          expectedReturn: bestArbOpp.profitPercentage,
          riskLevel: 'medium',
          timeHorizon: 'short',
          requiredCapital: bestArbOpp.buyPrice * 100, // Assuming 100 token trade
          steps: [
            `Buy ${bestArbOpp.tokenSymbol} on ${bestArbOpp.buyPlatform}`,
            `Transfer to ${bestArbOpp.sellPlatform}`,
            `Sell for profit`,
            'Account for gas fees and slippage'
          ],
          pros: ['Quick profit potential', 'Market neutral strategy'],
          cons: ['Execution risk', 'Gas fees', 'Time sensitive'],
          marketConditions: ['Price inefficiency detected', 'Sufficient liquidity'],
          confidence: 75,
          timestamp: Date.now()
        });
      }

      // Store recommendations
      recommendations.forEach(rec => {
        this.recommendations.set(rec.id, rec);
      });

      if (recommendations.length > 0) {
        this.emit('recommendationsGenerated', recommendations);
      }

    } catch (error) {
      console.error('❌ Failed to generate investment recommendations:', error);
    }
  }

  // Utility methods
  private assessVaultRiskLevel(vault: any): 'low' | 'medium' | 'high' {
    if (vault.strategyType === 'lending') return 'low';
    if (vault.strategyType === 'staking') return 'medium';
    return 'high'; // LP strategies
  }

  private assessLendingRiskLevel(pool: any): 'low' | 'medium' | 'high' {
    if (pool.utilizationRate < 0.5) return 'low';
    if (pool.utilizationRate < 0.8) return 'medium';
    return 'high';
  }

  private calculateLPAPY(pool: any): number {
    // Simplified LP APY calculation
    const feeAPY = (pool.volume24h * 0.003 * 365) / pool.totalLiquidity * 100;
    return Math.min(feeAPY, 100); // Cap at 100%
  }

  private calculateYieldConfidence(apy: number, tvl: number): number {
    let confidence = 50;

    // Higher TVL increases confidence
    if (tvl > 1000000) confidence += 20;
    else if (tvl > 100000) confidence += 10;

    // Reasonable APY increases confidence
    if (apy > 5 && apy < 50) confidence += 20;
    else if (apy > 50) confidence -= 10; // Too good to be true

    return Math.min(100, Math.max(0, confidence));
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

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  // Public API methods
  public getYieldOpportunities(minAPY?: number): YieldOpportunity[] {
    const opportunities = Array.from(this.yieldOpportunities.values());
    return minAPY ? opportunities.filter(opp => opp.apy >= minAPY) : opportunities;
  }

  public getArbitrageOpportunities(minProfit?: number): ArbitrageOpportunity[] {
    const opportunities = Array.from(this.arbitrageOpportunities.values());
    return minProfit ? opportunities.filter(opp => opp.profitPercentage >= minProfit) : opportunities;
  }

  public getMarketTimings(): MarketTiming[] {
    return Array.from(this.marketTimings.values());
  }

  public getInvestmentRecommendations(): InvestmentRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  public getBestYieldOpportunity(): YieldOpportunity | null {
    const opportunities = this.getYieldOpportunities();
    return opportunities.length > 0 ?
      opportunities.reduce((best, current) => current.apy > best.apy ? current : best) : null;
  }

  public getBestArbitrageOpportunity(): ArbitrageOpportunity | null {
    const opportunities = this.getArbitrageOpportunities();
    return opportunities.length > 0 ?
      opportunities.reduce((best, current) => current.profitPercentage > best.profitPercentage ? current : best) : null;
  }

  public getOpportunityStats(): OpportunityStats {
    const yieldOpps = this.getYieldOpportunities();
    const arbOpps = this.getArbitrageOpportunities();

    return {
      totalOpportunities: yieldOpps.length + arbOpps.length,
      yieldOpportunities: yieldOpps.length,
      arbitrageOpportunities: arbOpps.length,
      averageYield: yieldOpps.length > 0 ?
        yieldOpps.reduce((sum, opp) => sum + opp.apy, 0) / yieldOpps.length : 0,
      bestYieldOpportunity: this.getBestYieldOpportunity(),
      bestArbitrageOpportunity: this.getBestArbitrageOpportunity(),
      lastScan: this.lastScanTime,
      scanDuration: this.scanDuration
    };
  }

  public updateConfig(newConfig: Partial<OpportunityDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated opportunity detection configuration');
    this.emit('configUpdated', this.config);
  }

  public clearOpportunities(): void {
    this.yieldOpportunities.clear();
    this.arbitrageOpportunities.clear();
    this.marketTimings.clear();
    this.recommendations.clear();
    console.log('🧹 Cleared all opportunities');
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('🧹 Destroying market opportunity service...');

    this.isDestroyed = true;
    this.stopScanning();
    this.removeAllListeners();
    this.clearOpportunities();
    this.priceHistory.clear();

    console.log('✅ Market opportunity service destroyed');
  }
}

// Singleton instance
let opportunityServiceInstance: MarketOpportunityService | null = null;

export const getMarketOpportunityService = (config?: Partial<OpportunityDetectionConfig>): MarketOpportunityService => {
  if (!opportunityServiceInstance) {
    opportunityServiceInstance = new MarketOpportunityService(config);
  }
  return opportunityServiceInstance;
};

export const destroyMarketOpportunityService = (): void => {
  if (opportunityServiceInstance) {
    opportunityServiceInstance.destroy();
    opportunityServiceInstance = null;
  }
};