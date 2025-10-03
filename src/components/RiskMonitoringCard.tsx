"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getUserRiskProfile,
  getUserRiskAlerts,
  getHealthFactor,
  getGlobalRiskMetrics,
  formatHealthFactor,
  getRiskLevelColor,
  getRecommendedActions,
  type UserRiskProfile,
  type RiskAlert,
  type HealthFactor,
  type GlobalRiskMetrics
} from "../view-functions/getRiskData";

interface RiskMonitoringCardProps {
  onNavigate?: (section: string) => void;
}

export function RiskMonitoringCard({ onNavigate }: RiskMonitoringCardProps) {
  const { connected, account } = useWallet();
  const [riskProfile, setRiskProfile] = useState<UserRiskProfile | null>(null);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [healthFactor, setHealthFactor] = useState<HealthFactor | null>(null);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalRiskMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRiskData = async () => {
      if (!connected || !account?.address) {
        setRiskProfile(null);
        setRiskAlerts([]);
        setHealthFactor(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [profile, alerts, health, global] = await Promise.all([
          getUserRiskProfile(account.address.toString()),
          getUserRiskAlerts(account.address.toString()),
          getHealthFactor(account.address.toString()),
          getGlobalRiskMetrics()
        ]);

        setRiskProfile(profile);
        setRiskAlerts(alerts);
        setHealthFactor(health);
        setGlobalMetrics(global);
      } catch (error: any) {
        console.error("Error fetching risk data:", error);
        setError("Failed to fetch risk data");
      } finally {
        setLoading(false);
      }
    };

    fetchRiskData();

    // Auto-refresh every 30 seconds for real-time risk monitoring
    const interval = setInterval(fetchRiskData, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  const formatAmount = (amount: number, decimals: number = 8) => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const formatPercentage = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 20) return "text-green-600 bg-green-100";
    if (score <= 40) return "text-yellow-600 bg-yellow-100";
    if (score <= 60) return "text-orange-600 bg-orange-100";
    if (score <= 80) return "text-red-600 bg-red-100";
    return "text-red-800 bg-red-200";
  };

  const getRiskScoreLabel = (score: number) => {
    if (score <= 20) return "Very Low";
    if (score <= 40) return "Low";
    if (score <= 60) return "Medium";
    if (score <= 80) return "High";
    return "Critical";
  };

  const getAlertIcon = (type: string) => {
    const icons = {
      liquidation_warning: "⚠️",
      high_volatility: "📈",
      concentration_risk: "🎯",
      correlation_risk: "🔗"
    };
    return icons[type as keyof typeof icons] || "⚠️";
  };

  const getAlertColor = (severity: string) => {
    const colors = {
      low: "bg-blue-50 border-blue-200 text-blue-800",
      medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
      high: "bg-orange-50 border-orange-200 text-orange-800",
      critical: "bg-red-50 border-red-200 text-red-800"
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Monitoring</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">🛡️</span>
          </div>
          <p className="text-gray-500 text-sm">Connect wallet to view risk monitoring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Risk Monitoring</h3>
        {loading && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Overall Risk Score */}
      {riskProfile && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">Portfolio Risk Score</h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskScoreColor(riskProfile.overallRiskScore)}`}>
              {riskProfile.overallRiskScore}/100 - {getRiskScoreLabel(riskProfile.overallRiskScore)}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${riskProfile.overallRiskScore <= 20 ? 'bg-green-500' :
                  riskProfile.overallRiskScore <= 40 ? 'bg-yellow-500' :
                    riskProfile.overallRiskScore <= 60 ? 'bg-orange-500' :
                      riskProfile.overallRiskScore <= 80 ? 'bg-red-500' : 'bg-red-700'
                }`}
              style={{ width: `${riskProfile.overallRiskScore}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Health Factor */}
      {healthFactor && (
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-medium text-gray-900">Health Factor</h4>
              <span className={`text-lg font-bold ${getRiskLevelColor(healthFactor.status)}`}>
                {formatHealthFactor(healthFactor.value)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Collateral Value</p>
                <p className="font-medium">${formatAmount(healthFactor.collateralValue)}</p>
              </div>
              <div>
                <p className="text-gray-600">Borrowed Value</p>
                <p className="font-medium">${formatAmount(healthFactor.borrowedValue)}</p>
              </div>
            </div>

            {healthFactor.value < 1.5 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <p className="text-sm text-yellow-800 font-medium">
                    Health factor is low - consider adding collateral
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Profile Summary */}
      {riskProfile && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Risk Profile</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Collateral</p>
              <p className="text-lg font-semibold text-green-600">
                ${formatAmount(riskProfile.totalCollateral)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Borrowed</p>
              <p className="text-lg font-semibold text-blue-600">
                ${formatAmount(riskProfile.totalBorrowed)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Active Positions</p>
              <p className="text-lg font-semibold text-purple-600">
                {riskProfile.activePositions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Risk Tolerance</p>
              <p className="text-lg font-semibold text-gray-900">
                {riskProfile.riskTolerance}/5
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Risk Alerts */}
      {riskAlerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Active Alerts ({riskAlerts.filter(alert => !alert.acknowledged).length})
          </h4>
          <div className="space-y-3">
            {riskAlerts.filter(alert => !alert.acknowledged).slice(0, 3).map((alert, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getAlertColor(alert.severity)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <span className="font-medium capitalize">
                      {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs opacity-75">
                    {formatDate(alert.createdAt)}
                  </span>
                </div>
                <p className="text-sm mb-2">{alert.message}</p>
                {alert.tokenSymbol && (
                  <div className="flex items-center justify-between text-xs">
                    <span>Token: {alert.tokenSymbol}</span>
                    <span>
                      Current: {formatPercentage(alert.currentValue)} /
                      Threshold: {formatPercentage(alert.threshold)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {riskAlerts.filter(alert => !alert.acknowledged).length > 3 && (
            <button
              onClick={() => onNavigate?.('risk')}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all {riskAlerts.filter(alert => !alert.acknowledged).length} alerts →
            </button>
          )}
        </div>
      )}

      {/* Global Risk Context */}
      {globalMetrics && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Market Risk Context</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Global Utilization</p>
                <p className="font-medium">{formatPercentage(globalMetrics.globalUtilizationRate)}%</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Health Factor</p>
                <p className="font-medium">{formatHealthFactor(globalMetrics.averageHealthFactor)}</p>
              </div>
              <div>
                <p className="text-gray-600">Positions at Risk</p>
                <p className="font-medium text-orange-600">{globalMetrics.positionsAtRisk}</p>
              </div>
              <div>
                <p className="text-gray-600">System Risk Score</p>
                <p className={`font-medium ${getRiskScoreColor(globalMetrics.systemRiskScore).split(' ')[0]}`}>
                  {globalMetrics.systemRiskScore}/100
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {healthFactor && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Recommended Actions</h4>
          <div className="space-y-2">
            {getRecommendedActions(healthFactor.value).map((action, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className="text-blue-600">•</span>
                <span className="text-gray-700">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !riskProfile && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">🛡️</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">No risk data available</p>
          <p className="text-gray-400 text-xs mb-4">Start lending or borrowing to see risk monitoring</p>
          <button
            onClick={() => onNavigate?.('lending')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Start Lending
          </button>
        </div>
      )}

      {/* Quick Actions */}
      {riskProfile && riskProfile.activePositions > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.('lending')}
              className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-lg">💰</span>
              <span className="text-sm font-medium">Add Collateral</span>
            </button>
            <button
              onClick={() => onNavigate?.('risk')}
              className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium">View Details</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}