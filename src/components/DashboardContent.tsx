"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getAccountAPTBalance } from "../view-functions/getAccountBalance";
import { useProfileStatus } from "../hooks/useProfileStatus";
import { PortfolioStats } from "./PortfolioStats";
import { LendingPositionsCard } from "./LendingPositionsCard";
import { YieldVaultCard } from "./YieldVaultCard";
import { CrossChainAssetsCard } from "./CrossChainAssetsCard";
import { RiskMonitoringCard } from "./RiskMonitoringCard";
import { MarketDataCard } from "./MarketDataCard";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

interface DashboardContentProps {
  onNavigate?: (section: 'wallet' | 'trading' | 'pools' | 'profile') => void;
}

export function DashboardContent({ onNavigate }: DashboardContentProps) {
  const { connected, account } = useWallet();
  const { profile, hasProfile, isActive, isLoading: profileLoading } = useProfileStatus();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connected || !account?.address) {
        setBalance('0');
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const accountBalance = await getAccountAPTBalance(account.address.toString());
        setBalance(accountBalance.toString());
      } catch (error: any) {
        console.error("Error fetching balance:", error);
        setError("Failed to fetch balance");
        setBalance('0');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Auto-refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  const formatBalance = (balance: string) => {
    const numBalance = parseFloat(balance) / 100000000; // Convert from octas
    return numBalance.toFixed(4);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600">Here's your DeFi portfolio overview</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1s' }}></div>
          <span>Refresh</span>
        </button>
      </div>

      {/* Profile Status Loading */}
      {connected && profileLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h3 className="text-blue-800 font-medium">Checking Profile Status</h3>
              <p className="text-blue-700 text-sm">
                Verifying your DID profile on the blockchain...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Status Alert */}
      {connected && !profileLoading && !hasProfile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-yellow-800 font-medium">Create Your DID Profile</h3>
              <p className="text-yellow-700 text-sm">
                Create a DID profile to access trading, lending, and other DeFi features.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('profile')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm"
            >
              Create Profile
            </button>
          </div>
        </div>
      )}

      {/* Profile Active Status */}
      {connected && !profileLoading && hasProfile && isActive && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <h3 className="text-green-800 font-medium">DID Profile Active</h3>
              <p className="text-green-700 text-sm">
                Your profile is verified and you have access to all DeFi features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Inactive Status */}
      {connected && !profileLoading && hasProfile && !isActive && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-red-600 text-xl">❌</span>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Profile Inactive</h3>
              <p className="text-red-700 text-sm">
                Your DID profile exists but is inactive. Please reactivate it to access DeFi features.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('profile')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              Manage Profile
            </button>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">APT Balance</p>
              {error ? (
                <div>
                  <p className="text-2xl font-bold text-red-600">Error</p>
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : formatBalance(balance)} APT
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ ${loading ? '...' : (parseFloat(formatBalance(balance)) * 8.45).toFixed(2)} USD
                  </p>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <PortfolioStats />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate?.('wallet')}
            className="flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <span className="text-blue-600 text-xl">💸</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-900">Send APT</span>
              <p className="text-xs text-gray-500">Transfer tokens</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('trading')}
            disabled={!hasProfile || !isActive}
            className={`flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg transition-all duration-200 group ${hasProfile && isActive
              ? 'hover:border-green-300 hover:bg-green-50'
              : 'opacity-50 cursor-not-allowed'
              }`}
          >
            <div className={`w-12 h-12 bg-green-100 rounded-full flex items-center justify-center transition-colors ${hasProfile && isActive ? 'group-hover:bg-green-200' : ''
              }`}>
              <span className="text-green-600 text-xl">💱</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-900">Swap</span>
              <p className="text-xs text-gray-500">
                {hasProfile && isActive ? 'Trade tokens' : 'Requires DID profile'}
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('pools')}
            disabled={!hasProfile || !isActive}
            className={`flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg transition-all duration-200 group ${hasProfile && isActive
              ? 'hover:border-purple-300 hover:bg-purple-50'
              : 'opacity-50 cursor-not-allowed'
              }`}
          >
            <div className={`w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center transition-colors ${hasProfile && isActive ? 'group-hover:bg-purple-200' : ''
              }`}>
              <span className="text-purple-600 text-xl">🏊</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-900">Add Liquidity</span>
              <p className="text-xs text-gray-500">
                {hasProfile && isActive ? 'Earn rewards' : 'Requires DID profile'}
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('profile')}
            className="flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 group"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <span className="text-orange-600 text-xl">👤</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-900">Profile</span>
              <p className="text-xs text-gray-500">
                {hasProfile ? 'Manage DID' : 'Create DID'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Lending Positions */}
      <LendingPositionsCard onNavigate={onNavigate} />

      {/* Yield Vault Positions */}
      <YieldVaultCard onNavigate={onNavigate} />

      {/* Cross-Chain Assets */}
      <CrossChainAssetsCard onNavigate={onNavigate} />

      {/* Risk Monitoring */}
      <RiskMonitoringCard onNavigate={onNavigate} />

      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketDataCard onNavigate={onNavigate} />

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-gray-400 text-xl">📋</span>
            </div>
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">Your transactions will appear here</p>
          </div>
        </div>
      </div>

      {/* Comprehensive Analytics Dashboard */}
      {connected && hasProfile && isActive && (
        <div className="mt-8">
          <AnalyticsDashboard />
        </div>
      )}
    </div>
  );
}