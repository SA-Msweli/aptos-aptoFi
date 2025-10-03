"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getReputationData, ReputationData } from "@/view-functions/getProfile";

export function ReputationBadge() {
  const { connected, account } = useWallet();
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchReputation = async () => {
      if (!connected || !account?.address) {
        setReputation(null);
        return;
      }

      setIsLoading(true);
      try {
        const reputationData = await getReputationData(account.address.toString());
        setReputation(reputationData);
      } catch (error) {
        console.error("Failed to fetch reputation:", error);
        setReputation(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReputation();
  }, [connected, account]);

  const getReputationTier = (score: number): { name: string; color: string; icon: string } => {
    if (score >= 900) return { name: "Platinum", color: "text-purple-600", icon: "💎" };
    if (score >= 750) return { name: "Gold", color: "text-yellow-600", icon: "🥇" };
    if (score >= 500) return { name: "Silver", color: "text-gray-600", icon: "🥈" };
    if (score >= 200) return { name: "Bronze", color: "text-orange-600", icon: "🥉" };
    return { name: "New User", color: "text-blue-600", icon: "🆕" };
  };

  if (!connected || isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!reputation) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
        <span className="text-gray-600">📊</span>
        <span className="text-sm text-gray-600">No Reputation</span>
      </div>
    );
  }

  const tier = getReputationTier(reputation.totalScore);

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-white border rounded-full shadow-sm">
      <span>{tier.icon}</span>
      <div className="flex items-center space-x-1">
        <span className={`text-sm font-medium ${tier.color}`}>{tier.name}</span>
        <span className="text-sm text-gray-500">({reputation.totalScore})</span>
      </div>
    </div>
  );
}