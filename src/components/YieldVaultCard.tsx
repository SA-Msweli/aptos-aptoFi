"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getUserVaultPositions,
  getUserVaultSummary,
  getVaultAPY,
  getVaultPerformanceMetrics,
  formatAPY,
  getStrategyTypeName,
  getRiskLevelDescription,
  type VaultPosition,
  type VaultInfo,
  type UserVaultSummary,
  type VaultPerformanceMetrics
} from "../view-functions/getYieldVaultData";

interface YieldVaultCardProps {
  onNavigate?: (section: string) => void;
}

export function YieldVaultCard({ onNavigate }: YieldVaultCardProps) {
  const { connected, account } = useWallet();
  const [vaultPositions, setVaultPositions] = useState<Array<VaultPosition & { vaultInfo: VaultInfo }>>([]);
  const [vaultSummary, setVaultSummary] = useState<UserVaultSummary | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<number, VaultPerformanceMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYieldVaultData = async () => {
      if (!connected || !account?.address) {
        setVaultPositions([]);
        setVaultSummary(null);
        setPerformanceMetrics({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [positions, summary] = await Promise.all([
          getUserVaultPositions(account.address.toString()),
          getUserVaultSummary(account.address.toString())
        ]);

        setVaultPositions(positions);
        setVaultSummary(summary);

        // Fetch performance metrics for each vault
        const metricsPromises = positions.map(async (position) => {
          const metrics = await getVaultPerformanceMetrics(position.vaultInfo.id);
          return { vaultId: position.vaultInfo.id, metrics };
        });

        const metricsResults = await Promise.all(metricsPromises);
        const metricsMap: Record<number, VaultPerformanceMetrics> = {};
        metricsResults.forEach(({ vaultId, metrics }) => {
          if (metrics) {
            metricsMap[vaultId] = metrics;
          }
        });

        setPerformanceMetrics(metricsMap);
      } catch (error: any) {
        console.error("Error fetching yield vault data:", error);
        setError("Failed to fetch yield vault data");
      } finally {
        setLoading(false);
      }
    };

    fetchYieldVaultData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchYieldVaultData, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  const formatAmount = (amount: number, decimals: number = 8) => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const formatPercentage = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const getRiskLevelColor = (riskLevel: number) => {
    const colors = {
      1: "text-green-600 bg-green-100",
      2: "text-green-600 bg-green-100",
      3: "text-yellow-600 bg-yellow-100",
      4: "text-orange-600 bg-orange-100",
      5: "text-red-600 bg-red-100"
    };
    return colors[riskLevel as keyof typeof colors] || "text-gray-600 bg-gray-100";
  };

  const getStrategyIcon = (strategyType: number) => {
    const icons = {
      1: "🏦", // Lending
      2: "💧", // LP
      3: "🥩"  // Staking
    };
    return icons[strategyType as keyof typeof icons] || "💰";
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Accounts</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">💰</span>
          </div>
          <p className="text-gray-500 text-sm">Connect wallet to view savings accounts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">High-Yield Savings</h3>
        {loading && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      {vaultSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Deposited</p>
            <p className="text-lg font-semibold text-blue-600">
              ${formatAmount(vaultSummary.totalDeposited)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="text-lg font-semibold text-green-600">
              ${formatAmount(vaultSummary.currentValue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-lg font-semibold text-purple-600">
              ${formatAmount(vaultSummary.totalEarnings)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Accounts</p>
            <p className="text-lg font-semibold text-gray-900">
              {vaultSummary.activeVaults}
            </p>
          </div>
        </div>
      )}

      {/* Vault Positions */}
      {vaultPositions.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Your Savings Accounts</h4>
          {vaultPositions.map((position, index) => {
            const metrics = performanceMetrics[position.vaultInfo.id];
            const currentValue = position.shares * (metrics?.sharePrice || 1);
            const earnings = currentValue - position.totalDeposited + position.totalWithdrawn;
            const earningsPercentage = position.totalDeposited > 0
              ? (earnings / position.totalDeposited) * 100
              : 0;

            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">
                        {getStrategyIcon(position.vaultInfo.strategyType)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{position.vaultInfo.name}</p>
                      <p className="text-sm text-gray-600">
                        {getStrategyTypeName(position.vaultInfo.strategyType)} • {position.vaultInfo.tokenSymbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${formatAmount(currentValue)}
                    </p>
                    <p className={`text-sm ${earnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {earnings >= 0 ? '+' : ''}${formatAmount(Math.abs(earnings))}
                      ({formatPercentage(earningsPercentage)}%)
                    </p>
                  </div>
                </div>

                {/* Performance Metrics */}
                {metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Current APY</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatAPY(metrics.currentApy)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Daily Yield</p>
                      <p className="text-sm font-medium text-blue-600">
                        {formatPercentage(metrics.dailyYield * 100, 4)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Monthly Yield</p>
                      <p className="text-sm font-medium text-purple-600">
                        {formatPercentage(metrics.monthlyYield * 100)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">TVL</p>
                      <p className="text-sm font-medium text-gray-700">
                        ${formatAmount(metrics.totalValueLocked)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Position Details */}
                <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span>Shares: {formatAmount(position.shares)}</span>
                    <span>Deposited: {formatDate(position.depositTime)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(position.vaultInfo.strategyType)}`}>
                      Risk Level {position.vaultInfo.strategyType}/5
                    </span>
                  </div>
                </div>

                {/* Goal Progress (if applicable) */}
                {position.totalDeposited > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Growth Progress</span>
                      <span className="text-gray-900 font-medium">
                        {formatPercentage(earningsPercentage)}% return
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${earnings >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                          width: `${Math.min(Math.abs(earningsPercentage), 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && vaultPositions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">💰</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">No savings accounts found</p>
          <p className="text-gray-400 text-xs mb-4">Open a high-yield savings account to start earning</p>
          <button
            onClick={() => onNavigate?.('savings')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm transition-colors"
          >
            Open Savings Account
          </button>
        </div>
      )}

      {/* Performance Summary */}
      {vaultSummary && vaultSummary.totalEarnings > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">📈</span>
              </div>
              <div>
                <p className="text-green-800 font-medium">Great job saving!</p>
                <p className="text-green-700 text-sm">
                  You've earned ${formatAmount(vaultSummary.totalEarnings)} across {vaultSummary.activeVaults} savings accounts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}