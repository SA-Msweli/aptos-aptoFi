"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "../hooks/useProfileStatus";

interface PortfolioData {
  activePositions: number;
  totalRewards: number;
  weeklyChange: number;
}

export function PortfolioStats() {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    activePositions: 0,
    totalRewards: 0,
    weeklyChange: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!connected || !account?.address || !hasProfile || !isActive) {
        setPortfolioData({
          activePositions: 0,
          totalRewards: 0,
          weeklyChange: 0,
        });
        return;
      }

      setIsLoading(true);
      try {
        // TODO: Implement actual portfolio data fetching from contracts
        // For now, simulate some data based on profile status
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

        setPortfolioData({
          activePositions: Math.floor(Math.random() * 5),
          totalRewards: Math.random() * 10,
          weeklyChange: (Math.random() - 0.5) * 50, // -25% to +25%
        });
      } catch (error) {
        console.error("Failed to fetch portfolio data:", error);
        setPortfolioData({
          activePositions: 0,
          totalRewards: 0,
          weeklyChange: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [connected, account, hasProfile, isActive]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Positions</p>
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : portfolioData.activePositions}
            </p>
            <p className={`text-xs mt-1 ${portfolioData.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {isLoading ? '...' : `${portfolioData.weeklyChange >= 0 ? '+' : ''}${portfolioData.weeklyChange.toFixed(1)}% this week`}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-xl">📊</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Rewards Earned</p>
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : `${portfolioData.totalRewards.toFixed(2)} APT`}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {hasProfile && isActive ? 'From liquidity pools' : 'Create profile to earn'}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 text-xl">🎁</span>
          </div>
        </div>
      </div>
    </>
  );
}