import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRealTimeDataService,
  type RealTimeDataService,
  type PriceUpdate,
  type MarketData,
  type PriceAlert,
  type DataServiceConfig
} from '@/lib/realTimeDataService';

export interface UseRealTimeDataOptions {
  autoStart?: boolean;
  config?: Partial<DataServiceConfig>;
  tokens?: string[];
}

export interface RealTimeDataState {
  marketData: MarketData | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastUpdate: number;
  stalePrices: string[];
}

export interface UseRealTimeDataReturn extends RealTimeDataState {
  // Service control
  start: () => Promise<void>;
  stop: () => void;
  refresh: () => Promise<void>;

  // Data access
  getTokenPrice: (tokenSymbol: string) => PriceUpdate | null;
  getPriceHistory: (tokenSymbol: string, limit?: number) => PriceUpdate[];
  getVolatilityData: () => Map<string, number>;

  // Alerts
  addPriceAlert: (tokenSymbol: string, alert: Omit<PriceAlert, 'id' | 'tokenSymbol' | 'currentValue' | 'timestamp' | 'message'>) => string;
  removePriceAlert: (alertId: string) => boolean;
  getUserAlerts: (tokenSymbol?: string) => PriceAlert[];

  // Status
  getServiceStatus: () => ReturnType<RealTimeDataService['getServiceStatus']>;
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}): UseRealTimeDataReturn => {
  const { autoStart = true, config, tokens } = options;

  const [state, setState] = useState<RealTimeDataState>({
    marketData: null,
    isLoading: true,
    isConnected: false,
    error: null,
    lastUpdate: 0,
    stalePrices: []
  });

  const serviceRef = useRef<RealTimeDataService | null>(null);
  const alertsRef = useRef<PriceAlert[]>([]);

  // Initialize service
  useEffect(() => {
    try {
      serviceRef.current = getRealTimeDataService(config);

      // Set up event listeners
      const service = serviceRef.current;

      const handleInitialized = (data: any) => {
        console.log('📊 Real-time data service initialized:', data);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isConnected: true,
          error: null
        }));
      };

      const handleStarted = () => {
        console.log('🚀 Real-time data service started');
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null
        }));
      };

      const handleStopped = () => {
        console.log('🛑 Real-time data service stopped');
        setState(prev => ({
          ...prev,
          isConnected: false
        }));
      };

      const handleMarketDataUpdated = (data: any) => {
        const { updates, stalePrices, timestamp } = data;

        setState(prev => ({
          ...prev,
          marketData: serviceRef.current?.getMarketData() || null,
          lastUpdate: timestamp,
          stalePrices: stalePrices || [],
          isLoading: false,
          error: null
        }));
      };

      const handlePriceAlert = (alert: PriceAlert) => {
        console.log('🔔 Price alert triggered:', alert);
        alertsRef.current.push(alert);

        // You can emit custom events or use a notification system here
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('priceAlert', { detail: alert }));
        }
      };

      const handleError = (errorData: any) => {
        console.error('❌ Real-time data service error:', errorData);
        setState(prev => ({
          ...prev,
          error: errorData.error?.message || 'Unknown error occurred',
          isLoading: false
        }));
      };

      // Attach event listeners
      service.on('initialized', handleInitialized);
      service.on('started', handleStarted);
      service.on('stopped', handleStopped);
      service.on('marketDataUpdated', handleMarketDataUpdated);
      service.on('priceAlert', handlePriceAlert);
      service.on('error', handleError);

      // Auto-start if requested
      if (autoStart) {
        service.start().catch(error => {
          console.error('Failed to auto-start real-time data service:', error);
          setState(prev => ({
            ...prev,
            error: error.message,
            isLoading: false
          }));
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      }

      // Cleanup function
      return () => {
        service.off('initialized', handleInitialized);
        service.off('started', handleStarted);
        service.off('stopped', handleStopped);
        service.off('marketDataUpdated', handleMarketDataUpdated);
        service.off('priceAlert', handlePriceAlert);
        service.off('error', handleError);
      };
    } catch (error) {
      console.error('Failed to initialize real-time data service:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize service',
        isLoading: false
      }));
    }
  }, [autoStart, config]);

  // Service control methods
  const start = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await serviceRef.current.start();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start service',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const stop = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.stop();
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Force an immediate update by stopping and starting
      serviceRef.current.stop();
      await serviceRef.current.start();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
        isLoading: false
      }));
    }
  }, []);

  // Data access methods
  const getTokenPrice = useCallback((tokenSymbol: string): PriceUpdate | null => {
    return serviceRef.current?.getTokenPrice(tokenSymbol) || null;
  }, []);

  const getPriceHistory = useCallback((tokenSymbol: string, limit?: number): PriceUpdate[] => {
    return serviceRef.current?.getPriceHistory(tokenSymbol, limit) || [];
  }, []);

  const getVolatilityData = useCallback((): Map<string, number> => {
    return serviceRef.current?.getVolatilityData() || new Map();
  }, []);

  // Alert methods
  const addPriceAlert = useCallback((
    tokenSymbol: string,
    alert: Omit<PriceAlert, 'id' | 'tokenSymbol' | 'currentValue' | 'timestamp' | 'message'>
  ): string => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }
    return serviceRef.current.addPriceAlert(tokenSymbol, alert);
  }, []);

  const removePriceAlert = useCallback((alertId: string): boolean => {
    if (!serviceRef.current) {
      return false;
    }
    return serviceRef.current.removePriceAlert(alertId);
  }, []);

  const getUserAlerts = useCallback((tokenSymbol?: string): PriceAlert[] => {
    return serviceRef.current?.getUserAlerts(tokenSymbol) || [];
  }, []);

  // Status method
  const getServiceStatus = useCallback(() => {
    return serviceRef.current?.getServiceStatus() || {
      isRunning: false,
      lastUpdate: 0,
      supportedTokens: 0,
      stalePrices: 0,
      isDataStale: true
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    refresh,
    getTokenPrice,
    getPriceHistory,
    getVolatilityData,
    addPriceAlert,
    removePriceAlert,
    getUserAlerts,
    getServiceStatus
  };
};

// Hook for specific token data
export const useTokenPrice = (tokenSymbol: string, options: UseRealTimeDataOptions = {}) => {
  const realTimeData = useRealTimeData(options);
  const [tokenData, setTokenData] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    if (realTimeData.marketData) {
      const price = realTimeData.getTokenPrice(tokenSymbol);
      setTokenData(price);
    }
  }, [realTimeData.marketData, tokenSymbol, realTimeData]);

  return {
    ...realTimeData,
    tokenData,
    price: tokenData?.priceUSD || 0,
    priceChange24h: tokenData?.priceChange24h || 0,
    isStale: tokenData?.isStale || false,
    volatility: tokenData?.volatility || 0
  };
};

// Hook for multiple tokens
export const useMultipleTokenPrices = (tokenSymbols: string[], options: UseRealTimeDataOptions = {}) => {
  const realTimeData = useRealTimeData(options);
  const [tokensData, setTokensData] = useState<Map<string, PriceUpdate>>(new Map());

  useEffect(() => {
    if (realTimeData.marketData) {
      const newTokensData = new Map<string, PriceUpdate>();

      tokenSymbols.forEach(symbol => {
        const price = realTimeData.getTokenPrice(symbol);
        if (price) {
          newTokensData.set(symbol, price);
        }
      });

      setTokensData(newTokensData);
    }
  }, [realTimeData.marketData, tokenSymbols, realTimeData]);

  return {
    ...realTimeData,
    tokensData,
    getTokenData: (symbol: string) => tokensData.get(symbol) || null,
    getAllTokensData: () => Array.from(tokensData.values())
  };
};