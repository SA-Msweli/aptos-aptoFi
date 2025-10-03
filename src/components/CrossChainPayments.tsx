"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { usePaymentTracking } from "@/hooks/usePaymentTracking";
import { PaymentTracker } from "./PaymentTracker";
import { RecurringPayments } from "./RecurringPayments";
import { ComplianceVerification, type ComplianceResult } from "./ComplianceVerification";
import {
  SUPPORTED_CHAINS,
  type SupportedChainName,
  initiateCrossChainTransfer,
  sendCrossChainMessage,
  initiateCrossChainSwap,
  estimateCrossChainGas,
  estimateCrossChainFee,
  validateCrossChainTransfer,
  validateCrossChainMessage,
  validateCrossChainSwap,
  getSupportedChains,
  getChainName,
  requiresKYCCompliance
} from "@/entry-functions/ccipBridge";
import {
  getSupportedChains as getSupportedChainsView,
  estimateCrossChainFee as estimateFeeView,
  getUserCCIPStats,
  getUserTransferHistory,
  getPendingTransfers,
  type SupportedChain,
  type CCIPStats,
  type CrossChainTransfer,
  formatTransferAmount,
  getStatusColor
} from "@/view-functions/getCCIPData";
import { submitTransaction } from "@/lib/transactions";

interface CrossChainPaymentsProps {
  onNavigate?: (section: string) => void;
}

type PaymentType = 'transfer' | 'message' | 'swap';

interface PaymentForm {
  type: PaymentType;
  recipient: string;
  token: string;
  amount: string;
  destinationChain: number;
  message?: string;
  tokenOut?: string;
  minAmountOut?: string;
  gasLimit: number;
}

const CHAIN_ICONS: Record<SupportedChainName, string> = {
  ETHEREUM: '🔷',
  POLYGON: '🟣',
  AVALANCHE: '🔺',
  ARBITRUM: '🔵',
  OPTIMISM: '🔴',
  BASE: '🔵'
};

const CHAIN_COLORS: Record<SupportedChainName, string> = {
  ETHEREUM: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  AVALANCHE: 'bg-red-100 text-red-800',
  ARBITRUM: 'bg-blue-100 text-blue-800',
  OPTIMISM: 'bg-red-100 text-red-800',
  BASE: 'bg-blue-100 text-blue-800'
};

export function CrossChainPayments({ onNavigate }: CrossChainPaymentsProps) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();

  // Payment tracking hook
  const {
    transfers: transferHistory,
    pendingTransfers,
    loading: trackingLoading,
    error: trackingError,
    refreshTransfers,
    retryTransfer
  } = usePaymentTracking({
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTimeUpdates: true
  });

  // State management
  const [activeTab, setActiveTab] = useState<PaymentType>('transfer');
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);
  const [userStats, setUserStats] = useState<CCIPStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTracker, setShowTracker] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Form state
  const [form, setForm] = useState<PaymentForm>({
    type: 'transfer',
    recipient: '',
    token: 'APT',
    amount: '',
    destinationChain: SUPPORTED_CHAINS.ETHEREUM,
    gasLimit: 200000
  });

  // Fee estimation
  const [feeEstimate, setFeeEstimate] = useState<number>(0);
  const [estimatingFee, setEstimatingFee] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!connected || !account?.address) return;

      setLoading(true);
      try {
        const [chains, stats] = await Promise.all([
          getSupportedChainsView(),
          getUserCCIPStats(account.address.toString())
        ]);

        setSupportedChains(chains);
        setUserStats(stats);
      } catch (err: any) {
        console.error('Error loading cross-chain data:', err);
        setError('Failed to load cross-chain data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connected, account]);

  // Update gas limit when form changes
  useEffect(() => {
    const gasLimit = estimateCrossChainGas(form.type, form.destinationChain);
    setForm(prev => ({ ...prev, gasLimit }));
  }, [form.type, form.destinationChain]);

  // Estimate fees when form changes
  useEffect(() => {
    const estimateFees = async () => {
      if (!form.amount || parseFloat(form.amount) <= 0) {
        setFeeEstimate(0);
        return;
      }

      setEstimatingFee(true);
      try {
        const amount = parseFloat(form.amount) * 100000000; // Convert to octas
        const estimate = await estimateFeeView(form.destinationChain, form.gasLimit, amount);
        setFeeEstimate(estimate.totalFee);
      } catch (err) {
        console.error('Error estimating fee:', err);
        // Fallback to client-side estimation
        const fallbackFee = estimateCrossChainFee(form.type, parseFloat(form.amount), form.destinationChain);
        setFeeEstimate(fallbackFee);
      } finally {
        setEstimatingFee(false);
      }
    };

    const debounceTimer = setTimeout(estimateFees, 500);
    return () => clearTimeout(debounceTimer);
  }, [form.amount, form.destinationChain, form.gasLimit, form.type]);

  const handleFormChange = (field: keyof PaymentForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleTabChange = (type: PaymentType) => {
    setActiveTab(type);
    setForm(prev => ({
      ...prev,
      type,
      message: type === 'message' ? prev.message || '' : undefined,
      tokenOut: type === 'swap' ? prev.tokenOut || 'USDC' : undefined,
      minAmountOut: type === 'swap' ? prev.minAmountOut || '' : undefined
    }));
  };

  const handleSubmit = async () => {
    if (!connected || !account?.address) {
      setError('Please connect your wallet');
      return;
    }

    if (!hasProfile || !isActive) {
      setError('Please create and activate your DID profile first');
      return;
    }

    // Check compliance approval
    if (!complianceResult || !complianceResult.approved) {
      setError('Transaction does not meet compliance requirements. Please address the compliance issues above.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let transactionPayload;
      let validation;

      switch (form.type) {
        case 'transfer':
          const transferArgs = {
            recipient: form.recipient,
            token: form.token,
            amount: parseFloat(form.amount) * 100000000, // Convert to octas
            destinationChain: form.destinationChain,
            gasLimit: form.gasLimit
          };

          validation = validateCrossChainTransfer(transferArgs);
          if (!validation.valid) {
            setError(validation.errors.join(', '));
            return;
          }

          // Check KYC compliance
          if (requiresKYCCompliance(transferArgs.amount, form.destinationChain)) {
            setError('This transaction requires enhanced KYC verification');
            return;
          }

          transactionPayload = initiateCrossChainTransfer(transferArgs);
          break;

        case 'message':
          if (!form.message) {
            setError('Message content is required');
            return;
          }

          const messageArgs = {
            recipient: form.recipient,
            message: form.message,
            destinationChain: form.destinationChain,
            gasLimit: form.gasLimit
          };

          validation = validateCrossChainMessage(messageArgs);
          if (!validation.valid) {
            setError(validation.errors.join(', '));
            return;
          }

          transactionPayload = sendCrossChainMessage(messageArgs);
          break;

        case 'swap':
          if (!form.tokenOut || !form.minAmountOut) {
            setError('Output token and minimum amount are required for swaps');
            return;
          }

          const swapArgs = {
            recipient: form.recipient,
            tokenIn: form.token,
            tokenOut: form.tokenOut,
            amountIn: parseFloat(form.amount) * 100000000,
            minAmountOut: parseFloat(form.minAmountOut) * 100000000,
            destinationChain: form.destinationChain,
            gasLimit: form.gasLimit
          };

          validation = validateCrossChainSwap(swapArgs);
          if (!validation.valid) {
            setError(validation.errors.join(', '));
            return;
          }

          transactionPayload = initiateCrossChainSwap(swapArgs);
          break;

        default:
          setError('Invalid payment type');
          return;
      }

      const result = await submitTransaction(transactionPayload);

      if (result.success) {
        // Reset form
        setForm({
          type: form.type,
          recipient: '',
          token: 'APT',
          amount: '',
          destinationChain: form.destinationChain,
          gasLimit: form.gasLimit
        });

        // Refresh data
        const stats = await getUserCCIPStats(account.address.toString());
        setUserStats(stats);
        await refreshTransfers();
      } else {
        setError(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error('Cross-chain payment error:', err);
      setError(err.message || 'Failed to process cross-chain payment');
    } finally {
      setLoading(false);
    }
  };

  const getChainDisplay = (chainSelector: number) => {
    const chainName = getChainName(chainSelector);
    if (!chainName) return { name: `Chain-${chainSelector}`, icon: '🔗', color: 'bg-gray-100 text-gray-800' };

    return {
      name: chainName,
      icon: CHAIN_ICONS[chainName],
      color: CHAIN_COLORS[chainName]
    };
  };

  const handleRetryTransfer = async (transferId: number) => {
    try {
      const success = await retryTransfer(transferId);
      if (success) {
        // Refresh user stats after successful retry
        if (account?.address) {
          const stats = await getUserCCIPStats(account.address.toString());
          setUserStats(stats);
        }
      } else {
        setError('Failed to retry transfer. Maximum retry attempts reached.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry transfer');
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-gray-400 text-2xl">🔗</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your wallet to access cross-chain payments</p>
      </div>
    );
  }

  if (!hasProfile || !isActive) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-yellow-600 text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">DID Profile Required</h3>
        <p className="text-gray-600 mb-4">Create and activate your DID profile to access cross-chain payments</p>
        <button
          onClick={() => onNavigate?.('profile')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cross-Chain Payments</h1>
          <p className="text-gray-600">Send tokens, messages, and swaps across multiple blockchains</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRecurring(!showRecurring)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showRecurring
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {showRecurring ? 'Hide Recurring' : 'Recurring Payments'}
          </button>
          <button
            onClick={() => setShowTracker(!showTracker)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showTracker
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {showTracker ? 'Hide Tracker' : 'Show Tracker'}
          </button>
          <button
            onClick={refreshTransfers}
            disabled={trackingLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${trackingLoading ? 'animate-spin' : ''}`}></div>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transfers</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.totalTransfers}</p>
              </div>
              <span className="text-blue-600 text-2xl">📤</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">${formatTransferAmount(userStats.totalVolume)}</p>
              </div>
              <span className="text-green-600 text-2xl">💰</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{(userStats.successRate * 100).toFixed(1)}%</p>
              </div>
              <span className="text-purple-600 text-2xl">✅</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingTransfers.length}</p>
              </div>
              <span className="text-orange-600 text-2xl">⏳</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment Form */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">New Cross-Chain Payment</h3>

            {/* Payment Type Tabs */}
            <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
              {(['transfer', 'message', 'swap'] as PaymentType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTabChange(type)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {type === 'transfer' && '💸 Transfer'}
                  {type === 'message' && '💬 Message'}
                  {type === 'swap' && '🔄 Swap'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Destination Chain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Chain
              </label>
              <select
                value={form.destinationChain}
                onChange={(e) => handleFormChange('destinationChain', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => {
                  const display = getChainDisplay(selector);
                  return (
                    <option key={name} value={selector}>
                      {display.icon} {display.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={form.recipient}
                onChange={(e) => handleFormChange('recipient', e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Token and Amount (for transfer and swap) */}
            {(form.type === 'transfer' || form.type === 'swap') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {form.type === 'swap' ? 'Input Token' : 'Token'}
                  </label>
                  <select
                    value={form.token}
                    onChange={(e) => handleFormChange('token', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="APT">APT</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => handleFormChange('amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Output Token and Min Amount (for swap only) */}
            {form.type === 'swap' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Token
                  </label>
                  <select
                    value={form.tokenOut || 'USDC'}
                    onChange={(e) => handleFormChange('tokenOut', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="APT">APT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Output Amount
                  </label>
                  <input
                    type="number"
                    value={form.minAmountOut || ''}
                    onChange={(e) => handleFormChange('minAmountOut', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Message (for message only) */}
            {form.type === 'message' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={form.message || ''}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  placeholder="Enter your message..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(form.message || '').length}/1000 characters
                </p>
              </div>
            )}

            {/* Fee Estimate */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estimated Fee:</span>
                <span className="text-sm font-medium text-gray-900">
                  {estimatingFee ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Calculating...</span>
                    </div>
                  ) : (
                    `${feeEstimate.toFixed(6)} APT`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Gas Limit:</span>
                <span className="text-xs text-gray-500">{form.gasLimit.toLocaleString()}</span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Compliance Verification */}
            {form.recipient && ((form.type !== 'message' && form.amount && parseFloat(form.amount) > 0) || (form.type === 'message' && form.message)) && (
              <ComplianceVerification
                amount={form.type !== 'message' ? parseFloat(form.amount || '0') * 100000000 : 0}
                token={form.token}
                destinationChain={form.destinationChain}
                recipient={form.recipient}
                onComplianceResult={setComplianceResult}
                showDetails={true}
              />
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                !form.recipient ||
                (!form.amount && form.type !== 'message') ||
                (form.type === 'message' && !form.message) ||
                (complianceResult && !complianceResult.approved)
              }
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {complianceResult && !complianceResult.approved ? 'Compliance Required' :
                    form.type === 'transfer' ? 'Send Transfer' :
                      form.type === 'message' ? 'Send Message' :
                        'Execute Swap'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Transaction History and Status */}
        <div className="space-y-6">
          {/* Pending Transfers */}
          {pendingTransfers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Pending Transfers</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {pendingTransfers.map((transfer) => {
                    const chainDisplay = getChainDisplay(transfer.destinationChain);
                    return (
                      <div key={transfer.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-orange-600 text-lg">⏳</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTransferAmount(transfer.amount)} {transfer.token}
                            </p>
                            <p className="text-xs text-gray-500">
                              To {chainDisplay.name} • {new Date(transfer.createdAt * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${chainDisplay.color}`}>
                            {chainDisplay.icon} {chainDisplay.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent History */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transfers</h3>
            </div>
            <div className="p-6">
              {transferHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📋</span>
                  </div>
                  <p className="text-gray-500 text-sm">No transfer history</p>
                  <p className="text-gray-400 text-xs mt-1">Your cross-chain transfers will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transferHistory.map((transfer) => {
                    const chainDisplay = getChainDisplay(transfer.destinationChain);
                    const statusColor = getStatusColor(transfer.status.status);

                    return (
                      <div key={transfer.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          ></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTransferAmount(transfer.amount)} {transfer.token}
                            </p>
                            <p className="text-xs text-gray-500">
                              To {chainDisplay.name} • {new Date(transfer.createdAt * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${chainDisplay.color}`}>
                            {chainDisplay.icon} {chainDisplay.name}
                          </span>
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            {transfer.status.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Supported Chains */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Supported Chains</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => {
                  const display = getChainDisplay(selector);
                  const chain = supportedChains.find(c => c.selector === selector);

                  return (
                    <div key={name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{display.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{display.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${chain?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-500">
                          {chain?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Payments */}
      {showRecurring && (
        <RecurringPayments onNavigate={onNavigate} />
      )}

      {/* Payment Tracker */}
      {showTracker && (
        <PaymentTracker
          onRetry={handleRetryTransfer}
          showHistory={true}
          autoRefresh={true}
          refreshInterval={30000}
        />
      )}
    </div>
  );
}