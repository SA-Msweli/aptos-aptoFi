"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getTransferStatus,
  getTransferDetails,
  getUserTransferHistory,
  getPendingTransfers,
  type CrossChainTransfer,
  type TransferStatus,
  formatTransferAmount,
  getStatusColor,
  getEstimatedCompletionTime
} from "@/view-functions/getCCIPData";
import { getChainName } from "@/entry-functions/ccipBridge";

interface PaymentTrackerProps {
  transferId?: number;
  onRetry?: (transferId: number) => void;
  showHistory?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TransferWithDetails extends CrossChainTransfer {
  estimatedCompletion?: number;
  retryCount?: number;
  canRetry?: boolean;
}

const STATUS_ICONS = {
  pending: '⏳',
  sent: '📤',
  confirmed: '✅',
  failed: '❌'
};

const STATUS_DESCRIPTIONS = {
  pending: 'Transaction is being processed',
  sent: 'Transaction sent to destination chain',
  confirmed: 'Transaction confirmed on destination chain',
  failed: 'Transaction failed - retry available'
};

export function PaymentTracker({
  transferId,
  onRetry,
  showHistory = true,
  autoRefresh = true,
  refreshInterval = 30000
}: PaymentTrackerProps) {
  const { connected, account } = useWallet();

  const [transfers, setTransfers] = useState<TransferWithDetails[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load transfer data
  const loadTransfers = useCallback(async () => {
    if (!connected || !account?.address) return;

    setLoading(true);
    setError(null);

    try {
      let transfersData: CrossChainTransfer[] = [];

      if (transferId) {
        // Load specific transfer
        const transfer = await getTransferDetails(transferId);
        if (transfer) {
          transfersData = [transfer];
        }
      } else {
        // Load user's transfer history
        const [history, pending] = await Promise.all([
          getUserTransferHistory(account.address.toString(), 20),
          getPendingTransfers(account.address.toString())
        ]);

        // Combine and sort by creation date
        transfersData = [...pending, ...history]
          .sort((a, b) => b.createdAt - a.createdAt);
      }

      // Enhance transfers with additional data
      const enhancedTransfers: TransferWithDetails[] = await Promise.all(
        transfersData.map(async (transfer) => {
          const estimatedCompletion = getEstimatedCompletionTime(
            transfer.status.status,
            transfer.createdAt
          );

          return {
            ...transfer,
            estimatedCompletion,
            retryCount: 0, // This would come from contract if implemented
            canRetry: transfer.status.status === 'failed'
          };
        })
      );

      setTransfers(enhancedTransfers);

      // Set selected transfer if viewing specific one
      if (transferId && enhancedTransfers.length > 0) {
        setSelectedTransfer(enhancedTransfers[0]);
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error loading transfers:', err);
      setError('Failed to load transfer data');
    } finally {
      setLoading(false);
    }
  }, [connected, account, transferId]);

  // Auto-refresh effect
  useEffect(() => {
    loadTransfers();

    if (autoRefresh) {
      const interval = setInterval(loadTransfers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadTransfers, autoRefresh, refreshInterval]);

  // Real-time status updates for pending transfers
  useEffect(() => {
    const updatePendingTransfers = async () => {
      const pendingTransfers = transfers.filter(
        t => t.status.status === 'pending' || t.status.status === 'sent'
      );

      if (pendingTransfers.length === 0) return;

      try {
        const updatedStatuses = await Promise.all(
          pendingTransfers.map(async (transfer) => {
            const status = await getTransferStatus(transfer.id);
            return { id: transfer.id, status };
          })
        );

        setTransfers(prev => prev.map(transfer => {
          const updatedStatus = updatedStatuses.find(u => u.id === transfer.id);
          if (updatedStatus?.status && updatedStatus.status.status !== transfer.status.status) {
            return {
              ...transfer,
              status: updatedStatus.status,
              estimatedCompletion: getEstimatedCompletionTime(
                updatedStatus.status.status,
                transfer.createdAt
              )
            };
          }
          return transfer;
        }));
      } catch (err) {
        console.error('Error updating transfer statuses:', err);
      }
    };

    // Update pending transfers more frequently
    const pendingInterval = setInterval(updatePendingTransfers, 10000); // 10 seconds
    return () => clearInterval(pendingInterval);
  }, [transfers]);

  const handleRetry = async (transferId: number) => {
    if (onRetry) {
      onRetry(transferId);
    } else {
      // Default retry logic - reload the transfer
      await loadTransfers();
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Complete';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getChainDisplay = (chainSelector: number) => {
    const chainName = getChainName(chainSelector);
    return chainName || `Chain-${chainSelector}`;
  };

  if (!connected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Connect your wallet to view payment tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Tracking</h3>
          <p className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadTransfers}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${loading ? 'animate-spin' : ''}`}></div>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Selected Transfer Details */}
      {selectedTransfer && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Transfer #{selectedTransfer.id}
              </h4>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {STATUS_ICONS[selectedTransfer.status.status]}
                </span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {selectedTransfer.status.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transfer Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTransferAmount(selectedTransfer.amount)} {selectedTransfer.token}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Destination Chain</label>
                  <p className="text-sm text-gray-900">
                    {getChainDisplay(selectedTransfer.destinationChain)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Recipient</label>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {selectedTransfer.recipient}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Fee Paid</label>
                  <p className="text-sm text-gray-900">
                    {formatTransferAmount(selectedTransfer.fee)} APT
                  </p>
                </div>
              </div>

              {/* Status and Timeline */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {STATUS_ICONS[selectedTransfer.status.status]}
                      </span>
                      <span className="font-medium capitalize">
                        {selectedTransfer.status.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {STATUS_DESCRIPTIONS[selectedTransfer.status.status]}
                    </p>
                  </div>
                </div>

                {/* Estimated Completion */}
                {selectedTransfer.estimatedCompletion && selectedTransfer.estimatedCompletion > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Completion</label>
                    <p className="text-sm text-gray-900">
                      {formatTimeRemaining(selectedTransfer.estimatedCompletion)}
                    </p>
                  </div>
                )}

                {/* CCIP Message ID */}
                {selectedTransfer.ccipMessageId && selectedTransfer.ccipMessageId.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">CCIP Message ID</label>
                    <p className="text-sm text-gray-900 font-mono break-all">
                      {selectedTransfer.ccipMessageId.map(byte => byte.toString(16).padStart(2, '0')).join('')}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTransfer.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>

                  {selectedTransfer.executedAt > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Executed</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedTransfer.executedAt * 1000).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Retry Button */}
                {selectedTransfer.canRetry && (
                  <button
                    onClick={() => handleRetry(selectedTransfer.id)}
                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Retry Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h4 className="text-lg font-semibold text-gray-900">Transfer History</h4>
          </div>

          <div className="p-6">
            {transfers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">📋</span>
                </div>
                <p className="text-gray-500 text-sm">No transfers found</p>
                <p className="text-gray-400 text-xs mt-1">Your cross-chain transfers will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => {
                  const statusColor = getStatusColor(transfer.status.status);
                  const isSelected = selectedTransfer?.id === transfer.id;

                  return (
                    <div
                      key={transfer.id}
                      onClick={() => setSelectedTransfer(transfer)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          ></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              #{transfer.id} • {formatTransferAmount(transfer.amount)} {transfer.token}
                            </p>
                            <p className="text-xs text-gray-500">
                              To {getChainDisplay(transfer.destinationChain)} •
                              {new Date(transfer.createdAt * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {STATUS_ICONS[transfer.status.status]}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {transfer.status.status}
                          </span>
                        </div>
                      </div>

                      {/* Progress indicator for pending/sent transfers */}
                      {(transfer.status.status === 'pending' || transfer.status.status === 'sent') && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Processing...</span>
                            {transfer.estimatedCompletion && transfer.estimatedCompletion > 0 && (
                              <span>~{formatTimeRemaining(transfer.estimatedCompletion)} remaining</span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full transition-all duration-1000"
                              style={{
                                width: transfer.status.status === 'sent' ? '75%' : '25%'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Retry option for failed transfers */}
                      {transfer.canRetry && (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-red-600">Transfer failed</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(transfer.id);
                            }}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}