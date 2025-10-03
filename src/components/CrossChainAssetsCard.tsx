"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getUserCCIPStats,
  getUserTransferHistory,
  getPendingTransfers,
  getSupportedChains,
  getTransferStatus,
  formatTransferAmount,
  getStatusColor,
  type CCIPStats,
  type CrossChainTransfer,
  type SupportedChain
} from "../view-functions/getCCIPData";

interface CrossChainAssetsCardProps {
  onNavigate?: (section: string) => void;
}

export function CrossChainAssetsCard({ onNavigate }: CrossChainAssetsCardProps) {
  const { connected, account } = useWallet();
  const [ccipStats, setCcipStats] = useState<CCIPStats | null>(null);
  const [pendingTransfers, setPendingTransfers] = useState<CrossChainTransfer[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<CrossChainTransfer[]>([]);
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCrossChainData = async () => {
      if (!connected || !account?.address) {
        setCcipStats(null);
        setPendingTransfers([]);
        setRecentTransfers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [stats, pending, recent, chains] = await Promise.all([
          getUserCCIPStats(account.address.toString()),
          getPendingTransfers(account.address.toString()),
          getUserTransferHistory(account.address.toString(), 5), // Last 5 transfers
          getSupportedChains()
        ]);

        setCcipStats(stats);
        setPendingTransfers(pending);
        setRecentTransfers(recent);
        setSupportedChains(chains);
      } catch (error: any) {
        console.error("Error fetching cross-chain data:", error);
        setError("Failed to fetch cross-chain data");
      } finally {
        setLoading(false);
      }
    };

    fetchCrossChainData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCrossChainData, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  const formatAmount = (amount: number, decimals: number = 8) => {
    return formatTransferAmount(amount, decimals);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChainName = (selector: number) => {
    const chain = supportedChains.find(c => c.selector === selector);
    return chain?.name || `Chain-${selector}`;
  };

  const getChainIcon = (chainName: string) => {
    const icons: Record<string, string> = {
      'ETHEREUM': '🔷',
      'POLYGON': '🟣',
      'AVALANCHE': '🔺',
      'ARBITRUM': '🔵',
      'OPTIMISM': '🔴',
      'BASE': '🟦'
    };
    return icons[chainName.toUpperCase()] || '⛓️';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      sent: { color: 'bg-blue-100 text-blue-800', text: 'Sent' },
      confirmed: { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cross-Chain Assets</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">⛓️</span>
          </div>
          <p className="text-gray-500 text-sm">Connect wallet to view cross-chain assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cross-Chain Portfolio</h3>
        {loading && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Cross-Chain Stats */}
      {ccipStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Transfers</p>
            <p className="text-lg font-semibold text-blue-600">
              {ccipStats.totalTransfers}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Volume</p>
            <p className="text-lg font-semibold text-green-600">
              ${formatAmount(ccipStats.totalVolume)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="text-lg font-semibold text-purple-600">
              {(ccipStats.successRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Messages Sent</p>
            <p className="text-lg font-semibold text-gray-900">
              {ccipStats.totalMessages}
            </p>
          </div>
        </div>
      )}

      {/* Supported Chains */}
      {supportedChains.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Supported Networks</h4>
          <div className="flex flex-wrap gap-2">
            {supportedChains.filter(chain => chain.isActive).map((chain, index) => (
              <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-lg">{getChainIcon(chain.name)}</span>
                <span className="text-sm font-medium text-gray-700">{chain.name}</span>
                <span className="text-xs text-gray-500">
                  Fee: ${chain.baseFee.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Transfers */}
      {pendingTransfers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Pending Transfers ({pendingTransfers.length})
          </h4>
          <div className="space-y-3">
            {pendingTransfers.map((transfer, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">🏠</span>
                      <span className="text-sm text-gray-600">→</span>
                      <span className="text-lg">{getChainIcon(getChainName(transfer.destinationChain))}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatAmount(transfer.amount)} {transfer.token}
                      </p>
                      <p className="text-sm text-gray-600">
                        To: {getChainName(transfer.destinationChain)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(transfer.status.status)}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(transfer.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Fee: ${formatAmount(transfer.fee)}</span>
                  <span>ID: #{transfer.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transfer History */}
      {recentTransfers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {recentTransfers.slice(0, 3).map((transfer, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">🏠</span>
                      <span className="text-sm text-gray-600">→</span>
                      <span className="text-lg">{getChainIcon(getChainName(transfer.destinationChain))}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatAmount(transfer.amount)} {transfer.token}
                      </p>
                      <p className="text-sm text-gray-600">
                        To: {getChainName(transfer.destinationChain)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(transfer.status.status)}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(transfer.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Fee: ${formatAmount(transfer.fee)}</span>
                  <span>ID: #{transfer.id}</span>
                </div>
              </div>
            ))}
          </div>

          {recentTransfers.length > 3 && (
            <button
              onClick={() => onNavigate?.('cross-chain')}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all {recentTransfers.length} transfers →
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && ccipStats && ccipStats.totalTransfers === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">⛓️</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">No cross-chain activity yet</p>
          <p className="text-gray-400 text-xs mb-4">Send assets across blockchains to get started</p>
          <button
            onClick={() => onNavigate?.('cross-chain')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Send Cross-Chain
          </button>
        </div>
      )}

      {/* Quick Actions */}
      {ccipStats && ccipStats.totalTransfers > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.('cross-chain')}
              className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg">📤</span>
              <span className="text-sm font-medium">Send Assets</span>
            </button>
            <button
              onClick={() => onNavigate?.('cross-chain')}
              className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium">View History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}