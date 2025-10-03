"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getTransferStatus,
  getTransferDetails,
  getUserTransferHistory,
  getPendingTransfers,
  type CrossChainTransfer,
  type TransferStatus
} from "@/view-functions/getCCIPData";

export interface PaymentTrackingState {
  transfers: CrossChainTransfer[];
  pendingTransfers: CrossChainTransfer[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface PaymentTrackingActions {
  refreshTransfers: () => Promise<void>;
  trackTransfer: (transferId: number) => Promise<CrossChainTransfer | null>;
  retryTransfer: (transferId: number) => Promise<boolean>;
  subscribeToTransfer: (transferId: number, callback: (status: TransferStatus) => void) => () => void;
}

export interface UsePaymentTrackingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxRetries?: number;
  enableRealTimeUpdates?: boolean;
}

export function usePaymentTracking(
  options: UsePaymentTrackingOptions = {}
): PaymentTrackingState & PaymentTrackingActions {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    maxRetries = 3,
    enableRealTimeUpdates = true
  } = options;

  const { connected, account } = useWallet();

  const [state, setState] = useState<PaymentTrackingState>({
    transfers: [],
    pendingTransfers: [],
    loading: false,
    error: null,
    lastUpdate: null
  });

  const subscriptionsRef = useRef<Map<number, Set<(status: TransferStatus) => void>>>(new Map());
  const retryCountsRef = useRef<Map<number, number>>(new Map());

  // Refresh transfers data
  const refreshTransfers = useCallback(async () => {
    if (!connected || !account?.address) {
      setState(prev => ({
        ...prev,
        transfers: [],
        pendingTransfers: [],
        error: null
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [history, pending] = await Promise.all([
        getUserTransferHistory(account.address.toString(), 50),
        getPendingTransfers(account.address.toString())
      ]);

      setState(prev => ({
        ...prev,
        transfers: history,
        pendingTransfers: pending,
        loading: false,
        lastUpdate: new Date()
      }));
    } catch (err: any) {
      console.error('Error refreshing transfers:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to refresh transfers'
      }));
    }
  }, [connected, account]);

  // Track specific transfer
  const trackTransfer = useCallback(async (transferId: number): Promise<CrossChainTransfer | null> => {
    try {
      const transfer = await getTransferDetails(transferId);

      if (transfer) {
        // Update the transfer in state
        setState(prev => ({
          ...prev,
          transfers: prev.transfers.map(t => t.id === transferId ? transfer : t),
          pendingTransfers: prev.pendingTransfers.map(t => t.id === transferId ? transfer : t)
        }));

        // Notify subscribers
        const callbacks = subscriptionsRef.current.get(transferId);
        if (callbacks) {
          callbacks.forEach(callback => callback(transfer.status));
        }
      }

      return transfer;
    } catch (err: any) {
      console.error(`Error tracking transfer ${transferId}:`, err);
      return null;
    }
  }, []);

  // Retry failed transfer
  const retryTransfer = useCallback(async (transferId: number): Promise<boolean> => {
    const currentRetries = retryCountsRef.current.get(transferId) || 0;

    if (currentRetries >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for transfer ${transferId}`);
      return false;
    }

    try {
      // Increment retry count
      retryCountsRef.current.set(transferId, currentRetries + 1);

      // In a real implementation, this would call a retry function on the smart contract
      // For now, we'll just refresh the transfer status
      const updatedTransfer = await trackTransfer(transferId);

      if (updatedTransfer) {
        // If the transfer is no longer failed, consider retry successful
        return updatedTransfer.status.status !== 'failed';
      }

      return false;
    } catch (err: any) {
      console.error(`Error retrying transfer ${transferId}:`, err);
      return false;
    }
  }, [maxRetries, trackTransfer]);

  // Subscribe to transfer status updates
  const subscribeToTransfer = useCallback((
    transferId: number,
    callback: (status: TransferStatus) => void
  ): (() => void) => {
    if (!subscriptionsRef.current.has(transferId)) {
      subscriptionsRef.current.set(transferId, new Set());
    }

    subscriptionsRef.current.get(transferId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = subscriptionsRef.current.get(transferId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscriptionsRef.current.delete(transferId);
        }
      }
    };
  }, []);

  // Real-time updates for pending transfers
  useEffect(() => {
    if (!enableRealTimeUpdates || state.pendingTransfers.length === 0) {
      return;
    }

    const updatePendingStatuses = async () => {
      const pendingIds = state.pendingTransfers
        .filter(t => t.status.status === 'pending' || t.status.status === 'sent')
        .map(t => t.id);

      if (pendingIds.length === 0) return;

      try {
        const statusUpdates = await Promise.all(
          pendingIds.map(async (id) => {
            const status = await getTransferStatus(id);
            return { id, status };
          })
        );

        // Update state with new statuses
        setState(prev => {
          const updatedTransfers = prev.transfers.map(transfer => {
            const update = statusUpdates.find(u => u.id === transfer.id);
            if (update?.status && update.status.status !== transfer.status.status) {
              // Notify subscribers
              const callbacks = subscriptionsRef.current.get(transfer.id);
              if (callbacks) {
                callbacks.forEach(callback => callback(update.status!));
              }

              return { ...transfer, status: update.status };
            }
            return transfer;
          });

          const updatedPending = prev.pendingTransfers.map(transfer => {
            const update = statusUpdates.find(u => u.id === transfer.id);
            if (update?.status && update.status.status !== transfer.status.status) {
              return { ...transfer, status: update.status };
            }
            return transfer;
          }).filter(t => t.status.status === 'pending' || t.status.status === 'sent');

          return {
            ...prev,
            transfers: updatedTransfers,
            pendingTransfers: updatedPending
          };
        });
      } catch (err) {
        console.error('Error updating pending transfer statuses:', err);
      }
    };

    // Update pending transfers every 10 seconds
    const interval = setInterval(updatePendingStatuses, 10000);
    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, state.pendingTransfers]);

  // Auto-refresh effect
  useEffect(() => {
    refreshTransfers();

    if (autoRefresh) {
      const interval = setInterval(refreshTransfers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshTransfers, autoRefresh, refreshInterval]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.clear();
      retryCountsRef.current.clear();
    };
  }, []);

  return {
    ...state,
    refreshTransfers,
    trackTransfer,
    retryTransfer,
    subscribeToTransfer
  };
}

// Helper hook for tracking a specific transfer
export function useTransferTracking(transferId: number | null) {
  const { connected, account } = useWallet();
  const [transfer, setTransfer] = useState<CrossChainTransfer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackTransfer = useCallback(async () => {
    if (!transferId || !connected || !account?.address) {
      setTransfer(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const transferData = await getTransferDetails(transferId);
      setTransfer(transferData);
    } catch (err: any) {
      console.error(`Error tracking transfer ${transferId}:`, err);
      setError(err.message || 'Failed to track transfer');
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  }, [transferId, connected, account]);

  useEffect(() => {
    trackTransfer();

    // Auto-refresh every 15 seconds for active tracking
    if (transferId && transfer && (transfer.status.status === 'pending' || transfer.status.status === 'sent')) {
      const interval = setInterval(trackTransfer, 15000);
      return () => clearInterval(interval);
    }
  }, [trackTransfer, transferId, transfer]);

  return {
    transfer,
    loading,
    error,
    refresh: trackTransfer
  };
}

// Helper hook for monitoring payment failures and retries
export function usePaymentFailureHandling() {
  const [failedTransfers, setFailedTransfers] = useState<CrossChainTransfer[]>([]);
  const [retryAttempts, setRetryAttempts] = useState<Map<number, number>>(new Map());

  const addFailedTransfer = useCallback((transfer: CrossChainTransfer) => {
    setFailedTransfers(prev => {
      const exists = prev.find(t => t.id === transfer.id);
      if (exists) return prev;
      return [...prev, transfer];
    });
  }, []);

  const removeFailedTransfer = useCallback((transferId: number) => {
    setFailedTransfers(prev => prev.filter(t => t.id !== transferId));
    setRetryAttempts(prev => {
      const newMap = new Map(prev);
      newMap.delete(transferId);
      return newMap;
    });
  }, []);

  const incrementRetryAttempt = useCallback((transferId: number) => {
    setRetryAttempts(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(transferId) || 0;
      newMap.set(transferId, current + 1);
      return newMap;
    });
  }, []);

  const getRetryCount = useCallback((transferId: number): number => {
    return retryAttempts.get(transferId) || 0;
  }, [retryAttempts]);

  const canRetry = useCallback((transferId: number, maxRetries: number = 3): boolean => {
    return getRetryCount(transferId) < maxRetries;
  }, [getRetryCount]);

  return {
    failedTransfers,
    retryAttempts,
    addFailedTransfer,
    removeFailedTransfer,
    incrementRetryAttempt,
    getRetryCount,
    canRetry
  };
}