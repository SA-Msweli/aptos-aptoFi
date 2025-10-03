import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMarketOpportunityService,
  type MarketOpportunityService,
  type OpportunityDetectionConfig,
  type YieldOpportunity,
  type ArbitrageOpportunity,
  type MarketTiming,
  type InvestmentRecommendation,
  type OpportunityStats
} from '@/lib/marketOpportunityService';

export interface UseMarketOpportunitiesOptions {
  autoStart?: boolean;
  config?: Partial<OpportunityDetectionConfig>;
  filters?: {
    minYield?: number;
    minArbitrageProfit?: number;
    maxRiskLevel?: 'low' | 'medium' | 'high';
    opportunityTypes?: ('yield' | 'arbitrage' | 'timing' | 'recommendations')[];
  };
}

export interface MarketOpportunitiesState {
  isScanning: boolean;
  isLoading: boolean;
  error: string | null;
  yieldOpportunities: YieldOpportunity[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  marketTimings: MarketTiming[];
  recommendations: InvestmentRecommendation[];
  stats: OpportunityStats;
  lastScan: number;
}

export interface UseMarketOpportunitiesReturn extends MarketOpportunitiesState {
  // Service control
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  refreshOpportunities: () => Promise<void>;

  // Data access
  getBestYieldOpportunity: () => YieldOpportunity | null;
  getBestArbitrageOpportunity: () => ArbitrageOpportunity | null;
  getFilteredYieldOpportunities: (minAPY?: number) => YieldOpportunity[];
  getFilteredArbitrageOpportunities: (minProfit?: number) => ArbitrageOpportunity[];

  // Configuration
  updateConfig: (config: Partial<OpportunityDetectionConfig>) => void;
  clearOpportunities: () => void;
}

export const useMarketOpportunities = (options: UseMarketOpportunitiesOptions = {}): UseMarketOpportunitiesReturn => {
  const { autoStart = false, config, filters } = options;

  const [state, setState] = useState<MarketOpportunitiesState>({
    isScanning: false,
    isLoading: false,
    error: null,
    yieldOpportunities: [],
    arbitrageOpportunities: [],
    marketTimings: [],
    recommendations: [],
    stats: {
      totalOpportunities: 0,
      yieldOpportunities: 0,
      arbitrageOpportunities: 0,
      averageYield: 0,
      bestYieldOpportunity: null,
      bestArbitrageOpportunity: null,
      lastScan: 0,
      scanDuration: 0
    },
    lastScan: 0
  });

  const serviceRef = useRef<MarketOpportunityService | null>(null);
  const eventListenersSetup = useRef(false);

  // Initialize service
  useEffect(() => {
    try {
      serviceRef.current = getMarketOpportunityService(config);

      if (!eventListenersSetup.current) {
        setupEventListeners();
        eventListenersSetup.current = true;
      }

      // Auto-start if requested
      if (autoStart) {
        serviceRef.current.startScanning().catch(error => {
          console.error('Failed to auto-start opportunity scanning:', error);
          setState(prev => ({
            ...prev,
            error: error.message,
            isLoading: false
          }));
        });
      }

      // Initial state update
      updateState();

    } catch (error) {
      console.error('Failed to initialize market opportunity service:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize service',
        isLoading: false
      }));
    }
  }, [autoStart, config]);

  const setupEventListeners = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    const handleScanningStarted = () => {
      console.log('🚀 Opportunity scanning started');
      setState(prev => ({
        ...prev,
        isScanning: true,
        isLoading: false,
        error: null
      }));
    };

    const handleScanningStopped = () => {
      console.log('🛑 Opportunity scanning stopped');
      setState(prev => ({
        ...prev,
        isScanning: false
      }));
    };

    const handleScanCompleted = (data: any) => {
      console.log('✅ Opportunity scan completed:', data);
      updateState();
      setState(prev => ({
        ...prev,
        lastScan: data.timestamp,
        isLoading: false
      }));
    };

    const handleHighYieldOpportunity = (opportunity: YieldOpportunity) => {
      console.log('💰 High yield opportunity detected:', opportunity);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('High Yield Opportunity', {
          body: `${opportunity.apy.toFixed(1)}% APY available for ${opportunity.tokenSymbol}`,
          icon: '/favicon.ico',
          tag: `yield-${opportunity.id}`
        });
      }

      updateState();
    };

    const handleArbitrageOpportunity = (opportunity: ArbitrageOpportunity) => {
      console.log('⚡ Arbitrage opportunity detected:', opportunity);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Arbitrage Opportunity', {
          body: `${opportunity.profitPercentage.toFixed(2)}% profit potential for ${opportunity.tokenSymbol}`,
          icon: '/favicon.ico',
          tag: `arb-${opportunity.id}`
        });
      }

      updateState();
    };

    const handleTimingOpportunity = (timing: MarketTiming) => {
      console.log('📈 Market timing opportunity:', timing);

      // Show browser notification for high confidence signals
      if (timing.confidence >= 80 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Market Timing Signal', {
          body: `${timing.action.toUpperCase()} signal for ${timing.tokenSymbol} (${timing.confidence}% confidence)`,
          icon: '/favicon.ico',
          tag: `timing-${timing.tokenSymbol}`
        });
      }

      updateState();
    };

    const handleRecommendationsGenerated = (recommendations: InvestmentRecommendation[]) => {
      console.log('💡 Investment recommendations generated:', recommendations);
      updateState();
    };

    const handleScanError = (data: any) => {
      console.error('❌ Opportunity scan error:', data);
      setState(prev => ({
        ...prev,
        error: data.error?.message || 'Scan failed',
        isLoading: false
      }));
    };

    const handleInitialized = (data: any) => {
      console.log('📊 Market opportunity service initialized:', data);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
    };

    // Attach event listeners
    service.on('scanningStarted', handleScanningStarted);
    service.on('scanningStopped', handleScanningStopped);
    service.on('scanCompleted', handleScanCompleted);
    service.on('highYieldOpportunity', handleHighYieldOpportunity);
    service.on('arbitrageOpportunity', handleArbitrageOpportunity);
    service.on('timingOpportunity', handleTimingOpportunity);
    service.on('recommendationsGenerated', handleRecommendationsGenerated);
    service.on('scanError', handleScanError);
    service.on('initialized', handleInitialized);

    // Cleanup function
    return () => {
      service.off('scanningStarted', handleScanningStarted);
      service.off('scanningStopped', handleScanningStopped);
      service.off('scanCompleted', handleScanCompleted);
      service.off('highYieldOpportunity', handleHighYieldOpportunity);
      service.off('arbitrageOpportunity', handleArbitrageOpportunity);
      service.off('timingOpportunity', handleTimingOpportunity);
      service.off('recommendationsGenerated', handleRecommendationsGenerated);
      service.off('scanError', handleScanError);
      service.off('initialized', handleInitialized);
    };
  }, []);

  const updateState = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    let yieldOpportunities = service.getYieldOpportunities();
    let arbitrageOpportunities = service.getArbitrageOpportunities();

    // Apply filters
    if (filters) {
      if (filters.minYield) {
        yieldOpportunities = yieldOpportunities.filter(opp => opp.apy >= filters.minYield!);
      }

      if (filters.minArbitrageProfit) {
        arbitrageOpportunities = arbitrageOpportunities.filter(opp => opp.profitPercentage >= filters.minArbitrageProfit!);
      }

      if (filters.maxRiskLevel) {
        const riskLevels = ['low', 'medium', 'high'];
        const maxRiskIndex = riskLevels.indexOf(filters.maxRiskLevel);
        yieldOpportunities = yieldOpportunities.filter(opp =>
          riskLevels.indexOf(opp.riskLevel) <= maxRiskIndex
        );
      }
    }

    setState(prev => ({
      ...prev,
      yieldOpportunities,
      arbitrageOpportunities,
      marketTimings: service.getMarketTimings(),
      recommendations: service.getInvestmentRecommendations(),
      stats: service.getOpportunityStats()
    }));
  }, [filters]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Service control methods
  const startScanning = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await serviceRef.current.startScanning();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start scanning',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const stopScanning = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.stopScanning();
    }
  }, []);

  const refreshOpportunities = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Clear existing opportunities and trigger a new scan
      serviceRef.current.clearOpportunities();

      if (serviceRef.current) {
        // If scanning is active, it will automatically scan
        // If not, we need to trigger a manual scan
        const wasScanning = state.isScanning;
        if (!wasScanning) {
          await serviceRef.current.startScanning();
          // Stop after one scan cycle
          setTimeout(() => {
            if (serviceRef.current && !wasScanning) {
              serviceRef.current.stopScanning();
            }
          }, 1000);
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh opportunities',
        isLoading: false
      }));
    }
  }, [state.isScanning]);

  // Data access methods
  const getBestYieldOpportunity = useCallback((): YieldOpportunity | null => {
    return serviceRef.current?.getBestYieldOpportunity() || null;
  }, []);

  const getBestArbitrageOpportunity = useCallback((): ArbitrageOpportunity | null => {
    return serviceRef.current?.getBestArbitrageOpportunity() || null;
  }, []);

  const getFilteredYieldOpportunities = useCallback((minAPY?: number): YieldOpportunity[] => {
    return serviceRef.current?.getYieldOpportunities(minAPY) || [];
  }, []);

  const getFilteredArbitrageOpportunities = useCallback((minProfit?: number): ArbitrageOpportunity[] => {
    return serviceRef.current?.getArbitrageOpportunities(minProfit) || [];
  }, []);

  // Configuration methods
  const updateConfig = useCallback((config: Partial<OpportunityDetectionConfig>): void => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  }, []);

  const clearOpportunities = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.clearOpportunities();
      updateState();
    }
  }, [updateState]);

  return {
    ...state,
    startScanning,
    stopScanning,
    refreshOpportunities,
    getBestYieldOpportunity,
    getBestArbitrageOpportunity,
    getFilteredYieldOpportunities,
    getFilteredArbitrageOpportunities,
    updateConfig,
    clearOpportunities
  };
};

// Hook for yield opportunities only
export const useYieldOpportunities = (options: UseMarketOpportunitiesOptions = {}) => {
  const marketOpportunities = useMarketOpportunities({
    ...options,
    config: {
      ...options.config,
      enabledOpportunityTypes: {
        yield: true,
        arbitrage: false,
        timing: false,
        recommendations: false
      }
    }
  });

  return {
    ...marketOpportunities,
    opportunities: marketOpportunities.yieldOpportunities,
    bestOpportunity: marketOpportunities.getBestYieldOpportunity(),
    highYieldOpportunities: marketOpportunities.yieldOpportunities.filter(opp => opp.apy > 15),
    lowRiskOpportunities: marketOpportunities.yieldOpportunities.filter(opp => opp.riskLevel === 'low')
  };
};

// Hook for arbitrage opportunities only
export const useArbitrageOpportunities = (options: UseMarketOpportunitiesOptions = {}) => {
  const marketOpportunities = useMarketOpportunities({
    ...options,
    config: {
      ...options.config,
      enabledOpportunityTypes: {
        yield: false,
        arbitrage: true,
        timing: false,
        recommendations: false
      }
    }
  });

  return {
    ...marketOpportunities,
    opportunities: marketOpportunities.arbitrageOpportunities,
    bestOpportunity: marketOpportunities.getBestArbitrageOpportunity(),
    highProfitOpportunities: marketOpportunities.arbitrageOpportunities.filter(opp => opp.profitPercentage > 2),
    quickOpportunities: marketOpportunities.arbitrageOpportunities.filter(opp => opp.timeWindow < 300)
  };
};

// Hook for market timing signals
export const useMarketTiming = (tokenSymbol?: string, options: UseMarketOpportunitiesOptions = {}) => {
  const marketOpportunities = useMarketOpportunities({
    ...options,
    config: {
      ...options.config,
      enabledOpportunityTypes: {
        yield: false,
        arbitrage: false,
        timing: true,
        recommendations: false
      }
    }
  });

  const tokenTiming = tokenSymbol ?
    marketOpportunities.marketTimings.find(timing => timing.tokenSymbol === tokenSymbol) : null;

  return {
    ...marketOpportunities,
    timings: marketOpportunities.marketTimings,
    tokenTiming,
    buySignals: marketOpportunities.marketTimings.filter(timing => timing.action === 'buy' && timing.confidence > 70),
    sellSignals: marketOpportunities.marketTimings.filter(timing => timing.action === 'sell' && timing.confidence > 70),
    highConfidenceSignals: marketOpportunities.marketTimings.filter(timing => timing.confidence > 80)
  };
};

// Hook for investment recommendations
export const useInvestmentRecommendations = (options: UseMarketOpportunitiesOptions = {}) => {
  const marketOpportunities = useMarketOpportunities({
    ...options,
    config: {
      ...options.config,
      enabledOpportunityTypes: {
        yield: false,
        arbitrage: false,
        timing: false,
        recommendations: true
      }
    }
  });

  return {
    ...marketOpportunities,
    recommendations: marketOpportunities.recommendations,
    highConfidenceRecommendations: marketOpportunities.recommendations.filter(rec => rec.confidence > 80),
    lowRiskRecommendations: marketOpportunities.recommendations.filter(rec => rec.riskLevel === 'low'),
    shortTermRecommendations: marketOpportunities.recommendations.filter(rec => rec.timeHorizon === 'short')
  };
};