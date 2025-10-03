'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Clock,
  Signal
} from 'lucide-react';
import { useRealTimeData, useTokenPrice } from '@/hooks/useRealTimeData';
import { formatPrice, formatPriceChange } from '@/view-functions/getOracleData';

interface RealTimePriceDisplayProps {
  tokens?: string[];
  showVolatility?: boolean;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

interface PriceCardProps {
  tokenSymbol: string;
  showVolatility?: boolean;
}

const PriceCard: React.FC<PriceCardProps> = ({ tokenSymbol, showVolatility = true }) => {
  const { tokenData, isStale, volatility, isConnected, error } = useTokenPrice(tokenSymbol);
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number>(0);

  // Animate price changes
  useEffect(() => {
    if (tokenData && previousPrice > 0) {
      if (tokenData.priceUSD > previousPrice) {
        setPriceAnimation('up');
      } else if (tokenData.priceUSD < previousPrice) {
        setPriceAnimation('down');
      }

      const timer = setTimeout(() => setPriceAnimation(null), 1000);
      return () => clearTimeout(timer);
    }

    if (tokenData) {
      setPreviousPrice(tokenData.priceUSD);
    }
  }, [tokenData?.priceUSD, previousPrice]);

  const priceChangeFormatted = useMemo(() => {
    if (!tokenData) return null;
    return formatPriceChange(tokenData.priceChange24h * 100); // Convert to basis points
  }, [tokenData?.priceChange24h]);

  const volatilityLevel = useMemo(() => {
    if (!volatility) return 'low';
    if (volatility > 10) return 'high';
    if (volatility > 5) return 'medium';
    return 'low';
  }, [volatility]);

  const getVolatilityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Error loading {tokenSymbol}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenData) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-300 ${priceAnimation === 'up' ? 'ring-2 ring-green-200 bg-green-50' :
        priceAnimation === 'down' ? 'ring-2 ring-red-200 bg-red-50' : ''
      } ${isStale ? 'border-yellow-300 bg-yellow-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-lg">{tokenSymbol}</span>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {isStale && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  <Clock className="h-3 w-3 mr-1" />
                  Stale
                </Badge>
              )}
            </div>
          </div>

          {showVolatility && volatility > 0 && (
            <Badge className={`text-xs ${getVolatilityColor(volatilityLevel)}`}>
              <Activity className="h-3 w-3 mr-1" />
              {volatility.toFixed(1)}%
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <div className={`text-2xl font-bold transition-colors duration-300 ${priceAnimation === 'up' ? 'text-green-600' :
              priceAnimation === 'down' ? 'text-red-600' : 'text-gray-900'
            }`}>
            {formatPrice(tokenData.priceUSD * 100000000)} {/* Convert to 8 decimals for formatPrice */}
          </div>

          {priceChangeFormatted && (
            <div className={`flex items-center space-x-1 text-sm ${priceChangeFormatted.color}`}>
              {priceChangeFormatted.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{priceChangeFormatted.formatted}</span>
              <span className="text-gray-500">24h</span>
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Last updated: {new Date(tokenData.lastUpdated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

const ConnectionStatus: React.FC<{ isConnected: boolean; lastUpdate: number; stalePrices: string[] }> = ({
  isConnected,
  lastUpdate,
  stalePrices
}) => {
  const timeSinceUpdate = Date.now() - lastUpdate;
  const isDataFresh = timeSinceUpdate < 60000; // 1 minute

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
        {isConnected ? (
          <Signal className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {lastUpdate > 0 && (
        <div className={`flex items-center space-x-2 ${isDataFresh ? 'text-green-600' : 'text-yellow-600'
          }`}>
          <Clock className="h-4 w-4" />
          <span>
            {isDataFresh ? 'Fresh' : `${Math.round(timeSinceUpdate / 1000)}s ago`}
          </span>
        </div>
      )}

      {stalePrices.length > 0 && (
        <div className="flex items-center space-x-2 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>{stalePrices.length} stale</span>
        </div>
      )}
    </div>
  );
};

export const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({
  tokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH'],
  showVolatility = true,
  showAlerts = true,
  autoRefresh = true,
  className = ''
}) => {
  const {
    marketData,
    isLoading,
    isConnected,
    error,
    lastUpdate,
    stalePrices,
    start,
    stop,
    refresh,
    getServiceStatus
  } = useRealTimeData({ autoStart: autoRefresh });

  const [serviceStatus, setServiceStatus] = useState(getServiceStatus());

  // Update service status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setServiceStatus(getServiceStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, [getServiceStatus]);

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleToggleConnection = async () => {
    try {
      if (isConnected) {
        stop();
      } else {
        await start();
      }
    } catch (error) {
      console.error('Failed to toggle connection:', error);
    }
  };

  if (isLoading && !marketData) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Real-Time Prices</h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tokens.map((token) => (
            <Card key={token}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-Time Prices</h3>
        <div className="flex items-center space-x-2">
          <ConnectionStatus
            isConnected={isConnected}
            lastUpdate={lastUpdate}
            stalePrices={stalePrices}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleConnection}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && showAlerts && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stale Data Alert */}
      {stalePrices.length > 0 && showAlerts && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Price data for {stalePrices.join(', ')} may be stale. Please check your connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Price Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {tokens.map((tokenSymbol) => (
          <PriceCard
            key={tokenSymbol}
            tokenSymbol={tokenSymbol}
            showVolatility={showVolatility}
          />
        ))}
      </div>

      {/* Service Status */}
      {showAlerts && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Service Status: {serviceStatus.isRunning ? 'Running' : 'Stopped'}</div>
          <div>Supported Tokens: {serviceStatus.supportedTokens}</div>
          <div>Data Freshness: {serviceStatus.isDataStale ? 'Stale' : 'Fresh'}</div>
        </div>
      )}
    </div>
  );
};

export default RealTimePriceDisplay;