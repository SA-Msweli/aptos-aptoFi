import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAnalyticsService,
  type AnalyticsService,
  type AnalyticsConfig,
  type PortfolioAnalytics,
  type HistoricalPerformance,
  type RebalancingRecommendation,
  type AnalyticsServiceState
} from '@/lib/analyticsService';

export interface UseAnalyticsOptions {
  userAddress?: string;
  autoStart?: boolean;
  config?: Partial<AnalyticsConfig>;
}

export interface AnalyticsHookState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  portfolioAnalytics: PortfolioAnalytics | null;
  historicalData: HistoricalPerformance[];
  rebalancingRecommendations: RebalancingRecommendation[];
  trackedUsers: string[];
  lastUpdate: number;
}

export interface UseAnalyticsReturn extends AnalyticsHookState {
  // Service control
  startAnalytics: () => Promise<void>;
  stopAnalytics: () => void;
  addUserToTracking: (userAddress: string) => void;
  removeUserFromTracking: (userAddress: string) => void;

  // Data refresh
  refreshUserAnalytics: (userAddress?: string) => Promise<void>;
  refreshAllAnalytics: () => Promise<void>;

  // Data access
  getUserAnalytics: (userAddress: string) => PortfolioAnalytics | null;
  getUserHistoricalData: (userAddress: string) => HistoricalPerformance[];
  getUserRebalancingRecommendations: (userAddress: string) => RebalancingRecommendation[];

  // Configuration
  updateConfig: (config: Partial<AnalyticsConfig>) => void;
  getServiceState: () => AnalyticsServiceState;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}): UseAnalyticsReturn => {
  const { userAddress, autoStart = false, config } = options;

  const [state, setState] = useState<AnalyticsHookState>({
    isActive: false,
    isLoading: false,
    error: null,
    portfolioAnalytics: null,
    historicalData: [],
    rebalancingRecommendations: [],
    trackedUsers: [],
    lastUpdate: 0
  });

  const serviceRef = useRef<AnalyticsService | null>(null);
  const eventListenersSetup = useRef(false);

  // Initialize service
  useEffect(() => {
    try {
      serviceRef.current = getAnalyticsService(config);

      if (!eventListenersSetup.current) {
        setupEventListeners();
        eventListenersSetup.current = true;
      }

      // Add user to tracking if provided
      if (userAddress) {
        serviceRef.current.addUserToTracking(userAddress);
      }

      // Auto-start if requested
      if (autoStart) {
        serviceRef.current.startAnalytics().catch(error => {
          console.error('Failed to auto-start analytics:', error);
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
      console.error('Failed to initialize analytics service:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize service',
        isLoading: false
      }));
    }
  }, [userAddress, autoStart, config]);

  const setupEventListeners = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    const handleAnalyticsStarted = (data: any) => {
      console.log('📊 Analytics started:', data);
      setState(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
        error: null
      }));
    };

    const handleAnalyticsStopped = (data: any) => {
      console.log('🛑 Analytics stopped:', data);
      setState(prev => ({
        ...prev,
        isActive: false
      }));
    };

    const handleAnalyticsUpdated = (data: any) => {
      console.log('✅ Analytics updated:', data);
      updateState();
      setState(prev => ({
        ...prev,
        lastUpdate: data.timestamp,
        isLoading: false
      }));
    };

    const handleUserAnalyticsUpdated = (data: any) => {
      console.log('👤 User analytics updated:', data);

      // Update state if this is the current user
      if (data.userAddress === userAddress) {
        setState(prev => ({
          ...prev,
          portfolioAnalytics: data.analytics,
          historicalData: service.getUserHistoricalData(data.userAddress),
          rebalancingRecommendations: service.getUserRebalancingRecommendations(data.userAddress),
          lastUpdate: data.timestamp
        }));
      }
    };

    const handleUserAdded = (data: any) => {
      console.log('👤 User added to analytics tracking:', data);
      updateState();
    };

    const handleUserRemoved = (data: any) => {
      console.log('👤 User removed from analytics tracking:', data);
      updateState();
    };

    const handleAnalyticsError = (data: any) => {
      console.error('❌ Analytics error:', data);
      setState(prev => ({
        ...prev,
        error: data.error?.message || 'Analytics error occurred',
        isLoading: false
      }));
    };

    const handleConfigUpdated = (data: any) => {
      console.log('⚙️ Analytics config updated:', data);
    };

    // Attach event listeners
    service.on('analyticsStarted', handleAnalyticsStarted);
    service.on('analyticsStopped', handleAnalyticsStopped);
    service.on('analyticsUpdated', handleAnalyticsUpdated);
    service.on('userAnalyticsUpdated', handleUserAnalyticsUpdated);
    service.on('userAdded', handleUserAdded);
    service.on('userRemoved', handleUserRemoved);
    service.on('analyticsError', handleAnalyticsError);
    service.on('configUpdated', handleConfigUpdated);

    // Cleanup function
    return () => {
      service.off('analyticsStarted', handleAnalyticsStarted);
      service.off('analyticsStopped', handleAnalyticsStopped);
      service.off('analyticsUpdated', handleAnalyticsUpdated);
      service.off('userAnalyticsUpdated', handleUserAnalyticsUpdated);
      service.off('userAdded', handleUserAdded);
      service.off('userRemoved', handleUserRemoved);
      service.off('analyticsError', handleAnalyticsError);
      service.off('configUpdated', handleConfigUpdated);
    };
  }, [userAddress]);

  const updateState = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;
    const serviceState = service.getServiceState();

    setState(prev => ({
      ...prev,
      isActive: serviceState.isActive,
      trackedUsers: service.getTrackedUsers(),
      portfolioAnalytics: userAddress ? service.getUserAnalytics(userAddress) : null,
      historicalData: userAddress ? service.getUserHistoricalData(userAddress) : [],
      rebalancingRecommendations: userAddress ? service.getUserRebalancingRecommendations(userAddress) : [],
      lastUpdate: serviceState.lastUpdate
    }));
  }, [userAddress]);

  // Service control methods
  const startAnalytics = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await serviceRef.current.startAnalytics();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start analytics',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const stopAnalytics = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.stopAnalytics();
    }
  }, []);

  const addUserToTracking = useCallback((userAddress: string): void => {
    if (serviceRef.current) {
      serviceRef.current.addUserToTracking(userAddress);
    }
  }, []);

  const removeUserFromTracking = useCallback((userAddress: string): void => {
    if (serviceRef.current) {
      serviceRef.current.removeUserFromTracking(userAddress);
    }
  }, []);

  // Data refresh methods
  const refreshUserAnalytics = useCallback(async (targetUserAddress?: string): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    const addressToRefresh = targetUserAddress || userAddress;
    if (!addressToRefresh) {
      throw new Error('No user address provided for refresh');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await serviceRef.current.refreshUserAnalytics(addressToRefresh);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh user analytics',
        isLoading: false
      }));
      throw error;
    }
  }, [userAddress]);

  const refreshAllAnalytics = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await serviceRef.current.refreshAllAnalytics();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh analytics',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  // Data access methods
  const getUserAnalytics = useCallback((userAddress: string): PortfolioAnalytics | null => {
    return serviceRef.current?.getUserAnalytics(userAddress) || null;
  }, []);

  const getUserHistoricalData = useCallback((userAddress: string): HistoricalPerformance[] => {
    return serviceRef.current?.getUserHistoricalData(userAddress) || [];
  }, []);

  const getUserRebalancingRecommendations = useCallback((userAddress: string): RebalancingRecommendation[] => {
    return serviceRef.current?.getUserRebalancingRecommendations(userAddress) || [];
  }, []);

  // Configuration methods
  const updateConfig = useCallback((config: Partial<AnalyticsConfig>): void => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  }, []);

  const getServiceState = useCallback((): AnalyticsServiceState => {
    return serviceRef.current?.getServiceState() || {
      isActive: false,
      lastUpdate: 0,
      trackedUsers: new Set(),
      portfolioAnalytics: new Map(),
      historicalData: new Map(),
      rebalancingRecommendations: new Map()
    };
  }, []);

  return {
    ...state,
    startAnalytics,
    stopAnalytics,
    addUserToTracking,
    removeUserFromTracking,
    refreshUserAnalytics,
    refreshAllAnalytics,
    getUserAnalytics,
    getUserHistoricalData,
    getUserRebalancingRecommendations,
    updateConfig,
    getServiceState
  };
};

// Hook for specific user analytics
export const useUserAnalytics = (userAddress: string, options: Omit<UseAnalyticsOptions, 'userAddress'> = {}) => {
  const analytics = useAnalytics({ ...options, userAddress });

  return {
    ...analytics,
    userAddress,
    isUserTracked: analytics.trackedUsers.includes(userAddress),
    userPortfolioAnalytics: analytics.portfolioAnalytics,
    userHistoricalData: analytics.historicalData,
    userRebalancingRecommendations: analytics.rebalancingRecommendations
  };
};

// Hook for portfolio performance metrics only
export const usePortfolioPerformance = (userAddress: string, options: UseAnalyticsOptions = {}) => {
  const analytics = useAnalytics({ ...options, userAddress });

  return {
    isLoading: analytics.isLoading,
    error: analytics.error,
    performanceMetrics: analytics.portfolioAnalytics?.performanceMetrics || null,
    totalReturn: analytics.portfolioAnalytics?.totalPnLPercentage || 0,
    totalValue: analytics.portfolioAnalytics?.totalValue || 0,
    sharpeRatio: analytics.portfolioAnalytics?.performanceMetrics.sharpeRatio || 0,
    maxDrawdown: analytics.portfolioAnalytics?.performanceMetrics.maxDrawdown || 0,
    volatility: analytics.portfolioAnalytics?.performanceMetrics.volatility || 0,
    refreshPerformance: () => analytics.refreshUserAnalytics(userAddress)
  };
};

// Hook for asset allocation analysis
export const useAssetAllocation = (userAddress: string, options: UseAnalyticsOptions = {}) => {
  const analytics = useAnalytics({ ...options, userAddress });

  const assetAllocation = analytics.portfolioAnalytics?.assetAllocation || [];
  const overweightAssets = assetAllocation.filter(asset => asset.allocation === 'overweight');
  const underweightAssets = assetAllocation.filter(asset => asset.allocation === 'underweight');
  const optimalAssets = assetAllocation.filter(asset => asset.allocation === 'optimal');

  return {
    isLoading: analytics.isLoading,
    error: analytics.error,
    assetAllocation,
    overweightAssets,
    underweightAssets,
    optimalAssets,
    totalValue: assetAllocation.reduce((sum, asset) => sum + asset.value, 0),
    diversificationScore: optimalAssets.length / assetAllocation.length * 100,
    refreshAllocation: () => analytics.refreshUserAnalytics(userAddress)
  };
};

// Hook for rebalancing recommendations
export const useRebalancingRecommendations = (userAddress: string, options: UseAnalyticsOptions = {}) => {
  const analytics = useAnalytics({ ...options, userAddress });

  const recommendations = analytics.rebalancingRecommendations;
  const buyRecommendations = recommendations.filter(rec => rec.action === 'buy');
  const sellRecommendations = recommendations.filter(rec => rec.action === 'sell');
  const holdRecommendations = recommendations.filter(rec => rec.action === 'hold');

  const totalExpectedReturn = recommendations.reduce((sum, rec) => sum + rec.expectedImpact.returnIncrease, 0);
  const totalRiskReduction = recommendations.reduce((sum, rec) => sum + rec.expectedImpact.riskReduction, 0);
  const totalSharpeImprovement = recommendations.reduce((sum, rec) => sum + rec.expectedImpact.sharpeImprovement, 0);

  return {
    isLoading: analytics.isLoading,
    error: analytics.error,
    recommendations,
    buyRecommendations,
    sellRecommendations,
    holdRecommendations,
    hasRecommendations: recommendations.length > 0,
    expectedImpact: {
      returnIncrease: totalExpectedReturn,
      riskReduction: totalRiskReduction,
      sharpeImprovement: totalSharpeImprovement
    },
    refreshRecommendations: () => analytics.refreshUserAnalytics(userAddress)
  };
};