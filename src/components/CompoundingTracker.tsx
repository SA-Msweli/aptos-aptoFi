"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getVaultHistoricalPerformance,
  getVaultPerformanceMetrics,
  getUserVaultPositions,
  formatAPY,
  VaultPerformanceMetrics
} from "@/view-functions/getYieldVaultData";

interface CompoundingTrackerProps {
  vaultId: number;
  vaultName: string;
  userShares: number;
  onClose: () => void;
}

interface PerformanceDataPoint {
  date: number;
  apy: number;
  tvl: number;
  sharePrice: number;
}

interface EarningsBreakdown {
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  yearlyProjection: number;
  compoundingEffect: number;
  traditionalSavingsComparison: number;
}

export function CompoundingTracker({ vaultId, vaultName, userShares, onClose }: CompoundingTrackerProps) {
  const { account } = useWallet();

  const [performanceMetrics, setPerformanceMetrics] = useState<VaultPerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<PerformanceDataPoint[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<EarningsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [showCompoundingAnimation, setShowCompoundingAnimation] = useState(false);

  useEffect(() => {
    loadPerformanceData();
  }, [vaultId, selectedTimeframe]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;

      const [metrics, historical] = await Promise.all([
        getVaultPerformanceMetrics(vaultId),
        getVaultHistoricalPerformance(vaultId, days)
      ]);

      setPerformanceMetrics(metrics);
      setHistoricalData(historical);

      if (metrics && userShares > 0) {
        calculateEarningsBreakdown(metrics, userShares);
      }
    } catch (error) {
      console.error("Error loading performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEarningsBreakdown = (metrics: VaultPerformanceMetrics, shares: number) => {
    const userValue = shares * metrics.sharePrice;
    const traditionalRate = 0.0045; // 0.45% traditional savings rate

    // Calculate earnings based on current APY
    const dailyRate = metrics.currentApy / 365 / 10000;
    const weeklyRate = metrics.currentApy / 52 / 10000;
    const monthlyRate = metrics.currentApy / 12 / 10000;
    const yearlyRate = metrics.currentApy / 10000;

    const dailyEarnings = userValue * dailyRate;
    const weeklyEarnings = userValue * weeklyRate;
    const monthlyEarnings = userValue * monthlyRate;
    const yearlyProjection = userValue * yearlyRate;

    // Calculate compounding effect (compound vs simple interest)
    const simpleInterest = userValue * yearlyRate;
    const compoundInterest = userValue * (Math.pow(1 + dailyRate, 365) - 1);
    const compoundingEffect = compoundInterest - simpleInterest;

    // Compare with traditional savings
    const traditionalEarnings = userValue * traditionalRate;
    const traditionalSavingsComparison = yearlyProjection - traditionalEarnings;

    setEarningsBreakdown({
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      yearlyProjection,
      compoundingEffect,
      traditionalSavingsComparison
    });
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100000000).toFixed(6); // Convert from octas with more precision
  };

  const formatUSD = (amount: number) => {
    const aptPrice = 8.45; // Mock APT price - in production, get from oracle
    return ((amount / 100000000) * aptPrice).toFixed(2);
  };

  const getTimeframeDays = () => {
    switch (selectedTimeframe) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  };

  const calculateGrowthRate = () => {
    if (historicalData.length < 2) return 0;

    const oldest = historicalData[0];
    const newest = historicalData[historicalData.length - 1];

    if (oldest.sharePrice === 0) return 0;

    return ((newest.sharePrice - oldest.sharePrice) / oldest.sharePrice) * 100;
  };

  const startCompoundingAnimation = () => {
    setShowCompoundingAnimation(true);
    setTimeout(() => setShowCompoundingAnimation(false), 3000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Interest & Compounding Tracker</h2>
            <p className="text-gray-600">{vaultName} - Real-time Performance Analysis</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-sm font-medium text-gray-700">Timeframe:</span>
          {(['7d', '30d', '90d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {timeframe.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Compounding Visualization */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Live Compounding Effect</h3>
              <button
                onClick={startCompoundingAnimation}
                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
              >
                Visualize
              </button>
            </div>

            {performanceMetrics && earningsBreakdown && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold text-green-600 transition-all duration-1000 ${showCompoundingAnimation ? 'scale-110 text-green-500' : ''
                    }`}>
                    {formatAPY(performanceMetrics.currentApy)}
                  </div>
                  <p className="text-sm text-gray-600">Current APY</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-lg font-semibold text-gray-900">
                      +{formatCurrency(earningsBreakdown.compoundingEffect * 100000000)} APT
                    </p>
                    <p className="text-xs text-gray-600">Compounding Bonus/Year</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-lg font-semibold text-blue-600">
                      +{formatCurrency(earningsBreakdown.traditionalSavingsComparison * 100000000)} APT
                    </p>
                    <p className="text-xs text-gray-600">vs Traditional Savings</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Earnings Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Daily:</span>
                      <span className="font-medium">+{formatCurrency(earningsBreakdown.dailyEarnings * 100000000)} APT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Weekly:</span>
                      <span className="font-medium">+{formatCurrency(earningsBreakdown.weeklyEarnings * 100000000)} APT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monthly:</span>
                      <span className="font-medium">+{formatCurrency(earningsBreakdown.monthlyEarnings * 100000000)} APT</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600">Yearly Projection:</span>
                      <span className="font-semibold text-green-600">+{formatCurrency(earningsBreakdown.yearlyProjection * 100000000)} APT</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Chart */}
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Price Performance</h3>

            {historicalData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {historicalData[historicalData.length - 1]?.sharePrice.toFixed(6) || '1.000000'}
                    </p>
                    <p className="text-sm text-gray-600">Current Share Price</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${calculateGrowthRate() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateGrowthRate() >= 0 ? '+' : ''}{calculateGrowthRate().toFixed(3)}%
                    </p>
                    <p className="text-sm text-gray-600">{getTimeframeDays()}-day change</p>
                  </div>
                </div>

                {/* Simple ASCII Chart */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-1">
                    {historicalData.slice(-10).map((point, index) => {
                      const maxPrice = Math.max(...historicalData.map(p => p.sharePrice));
                      const minPrice = Math.min(...historicalData.map(p => p.sharePrice));
                      const range = maxPrice - minPrice || 1;
                      const percentage = ((point.sharePrice - minPrice) / range) * 100;

                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 w-16">
                            {new Date(point.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(5, percentage)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-700 w-20 text-right">
                            {point.sharePrice.toFixed(6)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No historical data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Performance Metrics */}
        {performanceMetrics && (
          <div className="mt-6 bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Performance Metrics</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(performanceMetrics.totalValueLocked * 100000000)} APT
                </p>
                <p className="text-sm text-gray-600">Total Value Locked</p>
                <p className="text-xs text-gray-500">≈ ${formatUSD(performanceMetrics.totalValueLocked * 100000000)}</p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(performanceMetrics.dailyYield * 100).toFixed(4)}%
                </p>
                <p className="text-sm text-gray-600">Daily Yield</p>
                <p className="text-xs text-gray-500">Compounded daily</p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {(performanceMetrics.monthlyYield * 100).toFixed(2)}%
                </p>
                <p className="text-sm text-gray-600">Monthly Yield</p>
                <p className="text-xs text-gray-500">Average monthly return</p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {performanceMetrics.sharePrice.toFixed(6)}
                </p>
                <p className="text-sm text-gray-600">Share Price</p>
                <p className="text-xs text-gray-500">APT per share</p>
              </div>
            </div>
          </div>
        )}

        {/* Traditional Savings Comparison */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traditional Savings Comparison</h3>

          {earningsBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your DeFi Savings (Annual)</p>
                <p className="text-2xl font-bold text-green-600">
                  +{formatCurrency(earningsBreakdown.yearlyProjection * 100000000)} APT
                </p>
                <p className="text-xs text-gray-500">≈ ${formatUSD(earningsBreakdown.yearlyProjection * 100000000)}</p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Traditional Bank (0.45% APY)</p>
                <p className="text-2xl font-bold text-gray-600">
                  +{formatCurrency((earningsBreakdown.yearlyProjection - earningsBreakdown.traditionalSavingsComparison) * 100000000)} APT
                </p>
                <p className="text-xs text-gray-500">≈ ${formatUSD((earningsBreakdown.yearlyProjection - earningsBreakdown.traditionalSavingsComparison) * 100000000)}</p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your Additional Earnings</p>
                <p className="text-2xl font-bold text-blue-600">
                  +{formatCurrency(earningsBreakdown.traditionalSavingsComparison * 100000000)} APT
                </p>
                <p className="text-xs text-green-600">
                  {((earningsBreakdown.traditionalSavingsComparison / (earningsBreakdown.yearlyProjection - earningsBreakdown.traditionalSavingsComparison)) * 100).toFixed(0)}x more than traditional
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => {
              // Export earnings statement
              const data = {
                vault: vaultName,
                timeframe: selectedTimeframe,
                performanceMetrics,
                earningsBreakdown,
                historicalData
              };

              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${vaultName}-earnings-statement-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Export Statement
          </button>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}