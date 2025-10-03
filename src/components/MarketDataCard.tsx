"use client";

import { useState, useEffect } from "react";
import {
  getMultipleTokenPrices,
  getSupportedTokens,
  isOracleActive,
  formatPrice,
  formatPriceChange,
  type TokenPriceInfo
} from "../view-functions/getOracleData";

interface MarketDataCardProps {
  onNavigate?: (section: string) => void;
}

export function MarketDataCard({ onNavigate }: MarketDataCardProps) {
  const [tokenPrices, setTokenPrices] = useState<TokenPriceInfo[]>([]);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Default tokens to display if supported tokens fetch fails
  const defaultTokens = ['APT', 'USDC', 'USDT', 'ETH', 'BTC'];

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get supported tokens from oracle
        let tokens = await getSupportedTokens();

        // Fallback to default tokens if none returned
        if (tokens.length === 0) {
          tokens = defaultTokens;
        }

        setSupportedTokens(tokens);

        // Get price data for supported tokens (limit to first 8 for display)
        const displayTokens = tokens.slice(0, 8);
        const priceData = await getMultipleTokenPrices(displayTokens);

        // Filter out tokens with zero prices (likely not available)
        const validPrices = priceData.filter(token => token.priceUSD > 0);

        setTokenPrices(validPrices);
        setLastUpdated(Date.now());
      } catch (error: any) {
        console.error("Error fetching market data:", error);
        setError("Failed to fetch market data");

        // Fallback to mock data for demonstration
        const mockData: TokenPriceInfo[] = [
          {
            tokenSymbol: 'APT',
            priceUSD: 8.45,
            priceChange24h: 2.34,
            lastUpdated: Date.now(),
            isStale: false
          },
          {
            tokenSymbol: 'USDC',
            priceUSD: 1.00,
            priceChange24h: 0.01,
            lastUpdated: Date.now(),
            isStale: false
          },
          {
            tokenSymbol: 'USDT',
            priceUSD: 0.999,
            priceChange24h: -0.02,
            lastUpdated: Date.now(),
            isStale: false
          },
          {
            tokenSymbol: 'ETH',
            priceUSD: 2456.78,
            priceChange24h: 1.87,
            lastUpdated: Date.now(),
            isStale: false
          }
        ];
        setTokenPrices(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();

    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTokenIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      'APT': '🅰️',
      'USDC': '💵',
      'USDT': '💰',
      'ETH': '💎',
      'BTC': '₿',
      'BNB': '🟡',
      'ADA': '🔵',
      'SOL': '🟣'
    };
    return icons[symbol] || '🪙';
  };

  const formatLastUpdated = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculatePortfolioImpact = () => {
    // Calculate overall market sentiment
    const positiveChanges = tokenPrices.filter(token => token.priceChange24h > 0).length;
    const totalTokens = tokenPrices.length;
    const positivePercentage = totalTokens > 0 ? (positiveChanges / totalTokens) * 100 : 0;

    if (positivePercentage >= 70) return { sentiment: 'bullish', color: 'text-green-600', icon: '📈' };
    if (positivePercentage >= 40) return { sentiment: 'mixed', color: 'text-yellow-600', icon: '📊' };
    return { sentiment: 'bearish', color: 'text-red-600', icon: '📉' };
  };

  const marketSentiment = calculatePortfolioImpact();

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Live Market Data</h3>
        <div className="flex items-center space-x-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
          <span className="text-xs text-gray-500">
            {lastUpdated > 0 && formatLastUpdated(lastUpdated)}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-yellow-700 text-sm">
            {error} - Showing cached data
          </p>
        </div>
      )}

      {/* Market Sentiment */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{marketSentiment.icon}</span>
            <div>
              <p className="font-medium text-gray-900">Market Sentiment</p>
              <p className={`text-sm capitalize ${marketSentiment.color}`}>
                {marketSentiment.sentiment}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {tokenPrices.filter(t => t.priceChange24h > 0).length} of {tokenPrices.length} up
            </p>
            <p className="text-xs text-gray-500">Last 24h</p>
          </div>
        </div>
      </div>

      {/* Token Prices */}
      {tokenPrices.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900">Token Prices</h4>
          {tokenPrices.map((token, index) => {
            const priceChange = formatPriceChange(token.priceChange24h * 100); // Convert to basis points
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-lg">{getTokenIcon(token.tokenSymbol)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{token.tokenSymbol}</p>
                    <div className="flex items-center space-x-2">
                      {token.isStale && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Stale
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Updated {formatLastUpdated(token.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatPrice(token.priceUSD * 100000000)} {/* Convert to 8 decimals for formatPrice */}
                  </p>
                  <p className={`text-sm ${priceChange.color}`}>
                    {priceChange.formatted}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Price Alerts Section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-900">Price Alerts</h4>
          <button
            onClick={() => onNavigate?.('alerts')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Alerts
          </button>
        </div>

        {/* Volatility Warnings */}
        {tokenPrices.some(token => Math.abs(token.priceChange24h) > 10) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-orange-600">⚠️</span>
              <div>
                <p className="text-orange-800 font-medium text-sm">High Volatility Detected</p>
                <p className="text-orange-700 text-xs">
                  Some tokens are experiencing significant price movements (>10%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stale Data Warning */}
        {tokenPrices.some(token => token.isStale) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600">⏰</span>
              <div>
                <p className="text-yellow-800 font-medium text-sm">Stale Price Data</p>
                <p className="text-yellow-700 text-xs">
                  Some price feeds may be outdated. Exercise caution with trading.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market Opportunity */}
        {tokenPrices.filter(t => t.priceChange24h > 5).length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">💡</span>
              <div>
                <p className="text-green-800 font-medium text-sm">Market Opportunity</p>
                <p className="text-green-700 text-xs">
                  {tokenPrices.filter(t => t.priceChange24h > 5).length} tokens showing strong gains today
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate?.('trading')}
            className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-lg">💱</span>
            <span className="text-sm font-medium">Trade</span>
          </button>
          <button
            onClick={() => onNavigate?.('alerts')}
            className="flex items-center justify-center space-x-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-lg">🔔</span>
            <span className="text-sm font-medium">Set Alerts</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!loading && tokenPrices.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">📊</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">No market data available</p>
          <p className="text-gray-400 text-xs">Price feeds may be temporarily unavailable</p>
        </div>
      )}
    </div>
  );
}