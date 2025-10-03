"use client";

import { useState, useEffect } from "react";
import { getTokenPriceInfo, getMultipleTokenPrices, TokenPriceInfo } from "@/view-functions/getOracleData";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Clock, Target, Zap, Info } from "lucide-react";

interface VolatilityData {
  tokenSymbol: string;
  currentPrice: number;
  volatility1h: number;
  volatility24h: number;
  volatility7d: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  trend: 'bullish' | 'bearish' | 'sideways';
  recommendation: string;
  lastUpdated: number;
}

interface MarketTiming {
  tokenPair: string;
  currentSpread: number;
  averageSpread: number;
  liquidityScore: number;
  optimalWindow: boolean;
  recommendation: 'buy' | 'sell' | 'hold' | 'wait';
  confidence: number;
}

interface TrendIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

export function VolatilityMonitor() {
  const [volatilityData, setVolatilityData] = useState<VolatilityData[]>([]);
  const [marketTiming, setMarketTiming] = useState<MarketTiming[]>([]);
  const [trendIndicators, setTrendIndicators] = useState<TrendIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string>('APT');
  const [alertThreshold, setAlertThreshold] = useState<number>(5); // 5% volatility threshold

  const supportedTokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH'];

  useEffect(() => {
    loadVolatilityData();
    const interval = setInterval(loadVolatilityData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadVolatilityData = async () => {
    setIsLoading(true);
    try {
      const priceData = await getMultipleTokenPrices(supportedTokens);

      // Calculate volatility data (in production, this would come from historical price data)
      const volatilityData: VolatilityData[] = priceData.map(token => {
        const volatility24h = Math.abs(token.priceChange24h);
        const volatility1h = Math.random() * 3; // Mock 1h volatility
        const volatility7d = volatility24h * (0.8 + Math.random() * 0.4); // Mock 7d volatility

        let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
        if (volatility24h > 10) riskLevel = 'extreme';
        else if (volatility24h > 5) riskLevel = 'high';
        else if (volatility24h > 2) riskLevel = 'medium';

        const trend = token.priceChange24h > 1 ? 'bullish' :
          token.priceChange24h < -1 ? 'bearish' : 'sideways';

        let recommendation = '';
        if (riskLevel === 'extreme') {
          recommendation = 'Avoid large trades - extreme volatility detected';
        } else if (riskLevel === 'high') {
          recommendation = 'Use smaller position sizes and tight stop losses';
        } else if (trend === 'bullish' && riskLevel === 'low') {
          recommendation = 'Favorable conditions for buying';
        } else if (trend === 'bearish' && riskLevel === 'low') {
          recommendation = 'Consider taking profits or waiting';
        } else {
          recommendation = 'Monitor closely for trend confirmation';
        }

        return {
          tokenSymbol: token.tokenSymbol,
          currentPrice: token.priceUSD,
          volatility1h,
          volatility24h,
          volatility7d,
          riskLevel,
          trend,
          recommendation,
          lastUpdated: Date.now()
        };
      });

      setVolatilityData(volatilityData);
      generateMarketTiming(volatilityData);
      generateTrendIndicators(selectedToken, volatilityData);

    } catch (error) {
      console.error('Failed to load volatility data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMarketTiming = (volatilityData: VolatilityData[]) => {
    const timingData: MarketTiming[] = [
      {
        tokenPair: 'APT/USDC',
        currentSpread: 0.25,
        averageSpread: 0.35,
        liquidityScore: 85,
        optimalWindow: true,
        recommendation: 'buy',
        confidence: 78
      },
      {
        tokenPair: 'BTC/USDC',
        currentSpread: 0.15,
        averageSpread: 0.20,
        liquidityScore: 92,
        optimalWindow: true,
        recommendation: 'hold',
        confidence: 65
      },
      {
        tokenPair: 'ETH/USDC',
        currentSpread: 0.30,
        averageSpread: 0.25,
        liquidityScore: 88,
        optimalWindow: false,
        recommendation: 'wait',
        confidence: 82
      }
    ];

    setMarketTiming(timingData);
  };

  const generateTrendIndicators = (token: string, volatilityData: VolatilityData[]) => {
    const tokenData = volatilityData.find(v => v.tokenSymbol === token);
    if (!tokenData) return;

    const indicators: TrendIndicator[] = [
      {
        name: 'RSI (14)',
        value: 45 + Math.random() * 20, // Mock RSI
        signal: tokenData.trend === 'bullish' ? 'bullish' : 'bearish',
        strength: tokenData.volatility24h > 3 ? 'strong' : 'moderate',
        description: 'Relative Strength Index indicates momentum'
      },
      {
        name: 'MACD',
        value: tokenData.priceChange24h * 0.1,
        signal: tokenData.priceChange24h > 0 ? 'bullish' : 'bearish',
        strength: Math.abs(tokenData.priceChange24h) > 2 ? 'strong' : 'weak',
        description: 'Moving Average Convergence Divergence shows trend direction'
      },
      {
        name: 'Volume Profile',
        value: 75 + Math.random() * 20, // Mock volume score
        signal: 'neutral',
        strength: 'moderate',
        description: 'Trading volume relative to historical average'
      },
      {
        name: 'Support/Resistance',
        value: tokenData.currentPrice * (0.95 + Math.random() * 0.1),
        signal: tokenData.trend === 'bullish' ? 'bullish' : 'neutral',
        strength: tokenData.riskLevel === 'low' ? 'strong' : 'weak',
        description: 'Key price levels based on historical data'
      }
    ];

    setTrendIndicators(indicators);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'extreme': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation === 'buy') return 'text-green-600 bg-green-50';
    if (recommendation === 'sell') return 'text-red-600 bg-red-50';
    if (recommendation === 'wait') return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Volatility Overview */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Volatility Monitor
            </h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">Alert Threshold:</span>
                <select
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={2}>2%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                </select>
              </div>
              {isLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volatilityData.map((data) => (
              <div key={data.tokenSymbol} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{data.tokenSymbol}</h4>
                    <p className="text-sm text-gray-500">${data.currentPrice.toFixed(4)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(data.riskLevel)}`}>
                    {data.riskLevel.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">1h Volatility:</span>
                    <span className={data.volatility1h > alertThreshold ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {data.volatility1h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">24h Volatility:</span>
                    <span className={data.volatility24h > alertThreshold ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {data.volatility24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">7d Volatility:</span>
                    <span className="text-gray-900">{data.volatility7d.toFixed(2)}%</span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {data.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Timing Analysis */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Optimal Trading Windows
          </h3>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {marketTiming.map((timing, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${timing.optimalWindow ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                  <div>
                    <h4 className="font-medium text-gray-900">{timing.tokenPair}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Spread: {timing.currentSpread}% (avg: {timing.averageSpread}%)</span>
                      <span>Liquidity: {timing.liquidityScore}/100</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(timing.recommendation)}`}>
                    {timing.recommendation.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {timing.confidence}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Analysis */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Technical Indicators
            </h3>
            <select
              value={selectedToken}
              onChange={(e) => {
                setSelectedToken(e.target.value);
                generateTrendIndicators(e.target.value, volatilityData);
              }}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              {supportedTokens.map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendIndicators.map((indicator, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {getSignalIcon(indicator.signal)}
                    <h4 className="font-medium text-gray-900">{indicator.name}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${indicator.strength === 'strong' ? 'bg-green-100 text-green-800' :
                      indicator.strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {indicator.strength}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {indicator.name === 'Support/Resistance' ?
                      `$${indicator.value.toFixed(4)}` :
                      indicator.value.toFixed(2)
                    }
                  </span>
                </div>

                <p className="text-xs text-gray-600">{indicator.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Alerts */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Active Market Alerts
          </h3>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {volatilityData
              .filter(data => data.volatility24h > alertThreshold || data.riskLevel === 'extreme')
              .map((data, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${data.riskLevel === 'extreme' ? 'border-red-500 bg-red-50' :
                    data.volatility24h > alertThreshold ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                  }`}>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${data.riskLevel === 'extreme' ? 'text-red-600' :
                        data.volatility24h > alertThreshold ? 'text-yellow-600' :
                          'text-blue-600'
                      }`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {data.tokenSymbol} High Volatility Alert
                      </h4>
                      <p className="text-sm text-gray-700 mt-1">
                        24h volatility of {data.volatility24h.toFixed(2)}% exceeds your {alertThreshold}% threshold
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        Recommendation: {data.recommendation}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(data.lastUpdated).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}

            {volatilityData.filter(data => data.volatility24h > alertThreshold || data.riskLevel === 'extreme').length === 0 && (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No active volatility alerts</p>
                <p className="text-sm text-gray-400">Market conditions are within normal ranges</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}