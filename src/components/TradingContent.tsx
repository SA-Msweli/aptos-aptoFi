"use client";

import { useState, useEffect } from "react";
import { DeFiTradingInterface } from "./DeFiTradingInterface";
import { ExchangeHistory } from "./ExchangeHistory";
import { VolatilityMonitor } from "./VolatilityMonitor";
import { getTokenPriceInfo, getMultipleTokenPrices, TokenPriceInfo } from "@/view-functions/getOracleData";
import { getSwapQuote } from "@/view-functions/getPoolInfo";
import { AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign, Zap, History, BarChart3, Activity } from "lucide-react";

interface RateAlert {
  id: string;
  fromToken: string;
  toToken: string;
  targetRate: number;
  currentRate: number;
  isActive: boolean;
  createdAt: number;
}

interface MarketInsight {
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
  icon: React.ReactNode;
}

export function TradingContent() {
  const [activeTab, setActiveTab] = useState<'exchange' | 'history' | 'analysis'>('exchange');
  const [priceData, setPriceData] = useState<TokenPriceInfo[]>([]);
  const [rateAlerts, setRateAlerts] = useState<RateAlert[]>([]);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [showRateAlerts, setShowRateAlerts] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const supportedTokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH'];

  useEffect(() => {
    loadPriceData();
    generateMarketInsights();
    const interval = setInterval(loadPriceData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPriceData = async () => {
    try {
      setIsLoadingPrices(true);
      const prices = await getMultipleTokenPrices(supportedTokens);
      setPriceData(prices);
      checkRateAlerts(prices);
    } catch (error) {
      console.error('Failed to load price data:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const checkRateAlerts = (prices: TokenPriceInfo[]) => {
    const updatedAlerts = rateAlerts.map(alert => {
      const fromPrice = prices.find(p => p.tokenSymbol === alert.fromToken)?.priceUSD || 0;
      const toPrice = prices.find(p => p.tokenSymbol === alert.toToken)?.priceUSD || 0;
      const currentRate = toPrice > 0 ? fromPrice / toPrice : 0;

      return {
        ...alert,
        currentRate,
      };
    });
    setRateAlerts(updatedAlerts);
  };

  const generateMarketInsights = () => {
    // Generate dynamic insights based on price data
    const insights: MarketInsight[] = [];

    // Check for high volatility tokens
    const highVolatilityTokens = priceData.filter(token => Math.abs(token.priceChange24h) > 5);
    if (highVolatilityTokens.length > 0) {
      insights.push({
        type: 'warning',
        title: 'High Volatility Alert',
        description: `${highVolatilityTokens.map(t => t.tokenSymbol).join(', ')} showing high volatility (>5% in 24h)`,
        action: 'Use smaller position sizes and consider stop losses',
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }

    // Check for favorable rates
    const strongPerformers = priceData.filter(token => token.priceChange24h > 3);
    if (strongPerformers.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Strong Market Performance',
        description: `${strongPerformers[0].tokenSymbol} up ${strongPerformers[0].priceChange24h.toFixed(1)}% in 24h`,
        action: 'Consider taking profits or riding the trend',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }

    // Check for stale price data
    const staleTokens = priceData.filter(token => token.isStale);
    if (staleTokens.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Stale Price Data',
        description: `Price feeds for ${staleTokens.map(t => t.tokenSymbol).join(', ')} may be outdated`,
        action: 'Avoid trading these tokens until prices refresh',
        icon: <Clock className="w-4 h-4" />
      });
    }

    // Add general market insights
    insights.push({
      type: 'info',
      title: 'Optimal Trading Conditions',
      description: 'Network fees are currently low and liquidity is high',
      action: 'Good time for large trades and portfolio rebalancing',
      icon: <Zap className="w-4 h-4" />
    });

    // Market timing insight
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 16) {
      insights.push({
        type: 'info',
        title: 'Peak Trading Hours',
        description: 'Higher liquidity and tighter spreads during market hours',
        action: 'Optimal time for large transactions',
        icon: <Clock className="w-4 h-4" />
      });
    }

    setMarketInsights(insights);
  };

  const addRateAlert = (fromToken: string, toToken: string, targetRate: number) => {
    const newAlert: RateAlert = {
      id: Date.now().toString(),
      fromToken,
      toToken,
      targetRate,
      currentRate: 0,
      isActive: true,
      createdAt: Date.now(),
    };
    setRateAlerts([...rateAlerts, newAlert]);
  };

  const removeRateAlert = (alertId: string) => {
    setRateAlerts(rateAlerts.filter(alert => alert.id !== alertId));
  };

  const calculateSpread = (fromToken: string, toToken: string): number => {
    const fromPrice = priceData.find(p => p.tokenSymbol === fromToken)?.priceUSD || 0;
    const toPrice = priceData.find(p => p.tokenSymbol === toToken)?.priceUSD || 0;
    // Simulate spread calculation (in production, this would come from AMM)
    return 0.25; // 0.25% spread
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Navigation */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Exchange</h1>
          <p className="text-gray-600">Professional-grade token exchange with competitive rates</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Live Prices</span>
          </div>
          {activeTab === 'exchange' && (
            <button
              onClick={() => setShowRateAlerts(!showRateAlerts)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Rate Alerts ({rateAlerts.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('exchange')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${activeTab === 'exchange'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Exchange</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${activeTab === 'history'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <History className="w-4 h-4" />
          <span>History & Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${activeTab === 'analysis'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Activity className="w-4 h-4" />
          <span>Market Analysis</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'exchange' && (
        <>
          {/* Rate Alerts Panel */}
          {showRateAlerts && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rate Alerts</h3>
                <button
                  onClick={() => setShowRateAlerts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {rateAlerts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active rate alerts</p>
              ) : (
                <div className="space-y-3">
                  {rateAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {alert.fromToken}/{alert.toToken}
                        </p>
                        <p className="text-sm text-gray-500">
                          Target: {alert.targetRate.toFixed(4)} | Current: {alert.currentRate.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeRateAlert(alert.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Enhanced Trading Interface */}
            <div className="space-y-6">
              <DeFiTradingInterface />

              {/* Fee Transparency Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Fee Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network Fee</span>
                    <span className="font-medium">~0.001 APT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Exchange Fee</span>
                    <span className="font-medium">0.25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Slippage Tolerance</span>
                    <span className="font-medium">0.5%</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center font-semibold">
                    <span>Total Est. Cost</span>
                    <span className="text-green-600">0.75% + gas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Market Overview & Insights */}
            <div className="space-y-6">
              {/* Real-time Market Data */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Live Market Data</h3>
                  {isLoadingPrices && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {priceData.map((token, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-gray-900">{token.tokenSymbol}/USD</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                Spread: {calculateSpread(token.tokenSymbol, 'USDC').toFixed(2)}%
                              </span>
                              {token.isStale && (
                                <span className="text-xs text-amber-600 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Stale
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ${token.priceUSD.toFixed(token.priceUSD < 1 ? 6 : 2)}
                          </p>
                          <p className={`text-sm flex items-center ${token.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {token.priceChange24h >= 0 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Market Insights */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Market Insights</h3>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {marketInsights.map((insight, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${insight.type === 'opportunity' ? 'bg-green-50 border-green-200' :
                        insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-start space-x-3">
                          <span className={`${insight.type === 'opportunity' ? 'text-green-600' :
                            insight.type === 'warning' ? 'text-amber-600' :
                              'text-blue-600'
                            }`}>
                            {insight.icon}
                          </span>
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${insight.type === 'opportunity' ? 'text-green-900' :
                              insight.type === 'warning' ? 'text-amber-900' :
                                'text-blue-900'
                              }`}>
                              {insight.title}
                            </h4>
                            <p className={`text-sm mt-1 ${insight.type === 'opportunity' ? 'text-green-700' :
                              insight.type === 'warning' ? 'text-amber-700' :
                                'text-blue-700'
                              }`}>
                              {insight.description}
                            </p>
                            {insight.action && (
                              <p className={`text-xs mt-2 font-medium ${insight.type === 'opportunity' ? 'text-green-800' :
                                insight.type === 'warning' ? 'text-amber-800' :
                                  'text-blue-800'
                                }`}>
                                💡 {insight.action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Institutional Features */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Institutional Features</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Large Order Support</p>
                      <p className="text-sm text-gray-500">Optimized routing for trades >$10K</p>
                    </div>
                    <span className="text-green-600 text-sm font-medium">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Smart Order Routing</p>
                      <p className="text-sm text-gray-500">Best execution across multiple pools</p>
                    </div>
                    <span className="text-green-600 text-sm font-medium">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Rate Guarantees</p>
                      <p className="text-sm text-gray-500">Lock rates for up to 30 seconds</p>
                    </div>
                    <span className="text-blue-600 text-sm font-medium">Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <ExchangeHistory />
      )}

      {activeTab === 'analysis' && (
        <VolatilityMonitor />
      )}
    </div>
  );
}