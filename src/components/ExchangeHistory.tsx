"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { TrendingUp, TrendingDown, Calendar, Filter, Download, BarChart3 } from "lucide-react";

interface ExchangeTransaction {
  id: string;
  timestamp: number;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  marketRate: number;
  fees: number;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
  profitLoss: number;
  profitLossPercentage: number;
}

interface PerformanceMetrics {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalProfitLoss: number;
  winRate: number;
  averageTradeSize: number;
  bestTrade: ExchangeTransaction | null;
  worstTrade: ExchangeTransaction | null;
}

export function ExchangeHistory() {
  const { account } = useWallet();
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<ExchangeTransaction[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedToken, setSelectedToken] = useState<string>('all');
  const [showMetrics, setShowMetrics] = useState(true);

  const supportedTokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH'];

  useEffect(() => {
    if (account?.address) {
      loadExchangeHistory();
    }
  }, [account?.address, selectedTimeframe]);

  useEffect(() => {
    applyFilters();
  }, [transactions, selectedToken, selectedTimeframe]);

  const loadExchangeHistory = async () => {
    if (!account?.address) return;

    setIsLoading(true);
    try {
      // In production, this would fetch from blockchain events or API
      const mockTransactions: ExchangeTransaction[] = [
        {
          id: '1',
          timestamp: Date.now() - 86400000, // 1 day ago
          fromToken: 'APT',
          toToken: 'USDC',
          fromAmount: 100,
          toAmount: 845,
          exchangeRate: 8.45,
          marketRate: 8.50,
          fees: 2.11,
          txHash: '0x1234...5678',
          status: 'completed',
          profitLoss: -5,
          profitLossPercentage: -0.59
        },
        {
          id: '2',
          timestamp: Date.now() - 172800000, // 2 days ago
          fromToken: 'USDC',
          toToken: 'APT',
          fromAmount: 500,
          fromAmount: 59.2,
          exchangeRate: 8.44,
          marketRate: 8.40,
          fees: 1.25,
          txHash: '0x2345...6789',
          status: 'completed',
          profitLoss: 2.37,
          profitLossPercentage: 0.47
        },
        {
          id: '3',
          timestamp: Date.now() - 259200000, // 3 days ago
          fromToken: 'BTC',
          toToken: 'USDC',
          fromAmount: 0.01,
          toAmount: 430,
          exchangeRate: 43000,
          marketRate: 43100,
          fees: 1.08,
          txHash: '0x3456...7890',
          status: 'completed',
          profitLoss: -1,
          profitLossPercentage: -0.23
        }
      ];

      setTransactions(mockTransactions);
      calculatePerformanceMetrics(mockTransactions);
    } catch (error) {
      console.error('Failed to load exchange history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by token
    if (selectedToken !== 'all') {
      filtered = filtered.filter(tx =>
        tx.fromToken === selectedToken || tx.toToken === selectedToken
      );
    }

    // Filter by timeframe
    const now = Date.now();
    const timeframes = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    if (selectedTimeframe !== 'all') {
      const cutoff = now - timeframes[selectedTimeframe];
      filtered = filtered.filter(tx => tx.timestamp >= cutoff);
    }

    setFilteredTransactions(filtered);
    calculatePerformanceMetrics(filtered);
  };

  const calculatePerformanceMetrics = (txs: ExchangeTransaction[]) => {
    if (txs.length === 0) {
      setPerformanceMetrics(null);
      return;
    }

    const completedTxs = txs.filter(tx => tx.status === 'completed');
    const totalVolume = completedTxs.reduce((sum, tx) => sum + (tx.fromAmount * tx.exchangeRate), 0);
    const totalFees = completedTxs.reduce((sum, tx) => sum + tx.fees, 0);
    const totalProfitLoss = completedTxs.reduce((sum, tx) => sum + tx.profitLoss, 0);
    const winningTrades = completedTxs.filter(tx => tx.profitLoss > 0);

    const bestTrade = completedTxs.reduce((best, tx) =>
      !best || tx.profitLoss > best.profitLoss ? tx : best, null as ExchangeTransaction | null
    );

    const worstTrade = completedTxs.reduce((worst, tx) =>
      !worst || tx.profitLoss < worst.profitLoss ? tx : worst, null as ExchangeTransaction | null
    );

    setPerformanceMetrics({
      totalTrades: completedTxs.length,
      totalVolume,
      totalFees,
      totalProfitLoss,
      winRate: completedTxs.length > 0 ? (winningTrades.length / completedTxs.length) * 100 : 0,
      averageTradeSize: completedTxs.length > 0 ? totalVolume / completedTxs.length : 0,
      bestTrade,
      worstTrade
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTokenAmount = (amount: number, token: string): string => {
    return `${amount.toFixed(token === 'BTC' ? 8 : 2)} ${token}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'From Token', 'From Amount', 'To Token', 'To Amount', 'Rate', 'Fees', 'P&L', 'Status'].join(','),
      ...filteredTransactions.map(tx => [
        new Date(tx.timestamp).toISOString(),
        tx.fromToken,
        tx.fromAmount,
        tx.toToken,
        tx.toAmount,
        tx.exchangeRate,
        tx.fees,
        tx.profitLoss,
        tx.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exchange-history-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!account?.address) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Exchange History</h3>
        <p className="text-gray-500">Connect your wallet to view exchange history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      {showMetrics && performanceMetrics && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Trading Performance
            </h3>
            <button
              onClick={() => setShowMetrics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{performanceMetrics.totalTrades}</p>
              <p className="text-sm text-gray-600">Total Trades</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(performanceMetrics.totalVolume)}
              </p>
              <p className="text-sm text-gray-600">Total Volume</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${performanceMetrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {formatCurrency(performanceMetrics.totalProfitLoss)}
              </p>
              <p className="text-sm text-gray-600">Total P&L</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {performanceMetrics.winRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Win Rate</p>
            </div>
          </div>

          {/* Best and Worst Trades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {performanceMetrics.bestTrade && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-1">Best Trade</h4>
                <p className="text-sm text-green-700">
                  {performanceMetrics.bestTrade.fromToken} → {performanceMetrics.bestTrade.toToken}
                </p>
                <p className="text-lg font-bold text-green-600">
                  +{formatCurrency(performanceMetrics.bestTrade.profitLoss)}
                </p>
              </div>
            )}

            {performanceMetrics.worstTrade && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-900 mb-1">Worst Trade</h4>
                <p className="text-sm text-red-700">
                  {performanceMetrics.worstTrade.fromToken} → {performanceMetrics.worstTrade.toToken}
                </p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(performanceMetrics.worstTrade.profitLoss)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exchange History */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Exchange History</h3>
            <div className="flex items-center space-x-3">
              {!showMetrics && (
                <button
                  onClick={() => setShowMetrics(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Show Metrics
                </button>
              )}
              <button
                onClick={exportHistory}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All tokens</option>
                {supportedTokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500">Loading exchange history...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No exchange transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${tx.status === 'completed' ? 'bg-green-500' :
                        tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {formatTokenAmount(tx.fromAmount, tx.fromToken)}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium text-gray-900">
                          {formatTokenAmount(tx.toAmount, tx.toToken)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(tx.timestamp)} • Rate: {tx.exchangeRate.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${tx.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {tx.profitLoss >= 0 ? (
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 inline mr-1" />
                        )}
                        {tx.profitLoss >= 0 ? '+' : ''}{formatCurrency(tx.profitLoss)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Fees: {formatCurrency(tx.fees)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}