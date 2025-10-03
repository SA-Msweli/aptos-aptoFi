"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useTransactions } from "@/lib/transactions";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import {
  getAvailableVaults,
  getUserVaultPositions,
  getUserVaultSummary,
  getVaultAPY,
  getVaultStrategy,
  calculateWithdrawalAmount,
  formatAPY,
  getStrategyTypeName,
  getRiskLevelDescription,
  VaultInfo,
  VaultPosition,
  VaultStrategy,
  UserVaultSummary
} from "@/view-functions/getYieldVaultData";
import {
  depositToVault,
  withdrawFromVault,
  DepositToVaultArguments,
  WithdrawFromVaultArguments
} from "@/entry-functions/yieldVault";
import { CompoundingTracker } from "./CompoundingTracker";
import { SavingsGoals } from "./SavingsGoals";
import { StrategyExplainer } from "./StrategyExplainer";

interface SavingsAccountsProps {
  onNavigate?: (section: string) => void;
}

interface VaultWithDetails extends VaultInfo {
  apy: number;
  strategy: VaultStrategy | null;
  userPosition: VaultPosition | null;
  currentValue: number;
}

export function SavingsAccounts({ onNavigate }: SavingsAccountsProps) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();
  const { executeTransaction } = useTransactions();

  // State management
  const [vaults, setVaults] = useState<VaultWithDetails[]>([]);
  const [userSummary, setUserSummary] = useState<UserVaultSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVault, setSelectedVault] = useState<VaultWithDetails | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [filterRiskLevel, setFilterRiskLevel] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'risk'>('apy');
  const [showCompoundingTracker, setShowCompoundingTracker] = useState(false);
  const [selectedVaultForTracking, setSelectedVaultForTracking] = useState<VaultWithDetails | null>(null);
  const [showSavingsGoals, setShowSavingsGoals] = useState(false);
  const [showStrategyExplainer, setShowStrategyExplainer] = useState(false);
  const [selectedVaultForStrategy, setSelectedVaultForStrategy] = useState<VaultWithDetails | null>(null);

  // Load vaults and user data
  useEffect(() => {
    if (connected && account && hasProfile && isActive) {
      loadVaultsData();
    }
  }, [connected, account, hasProfile, isActive]);

  const loadVaultsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [availableVaults, userPositions, summary] = await Promise.all([
        getAvailableVaults(),
        getUserVaultPositions(account!.address.toString()),
        getUserVaultSummary(account!.address.toString())
      ]);

      // Enrich vaults with additional data
      const enrichedVaults: VaultWithDetails[] = [];

      for (const vault of availableVaults.filter(v => v.isActive)) {
        const [apy, strategy] = await Promise.all([
          getVaultAPY(vault.id),
          getVaultStrategy(vault.id)
        ]);

        const userPosition = userPositions.find(p => p.vaultInfo.id === vault.id) || null;
        let currentValue = 0;

        if (userPosition && userPosition.shares > 0) {
          currentValue = await calculateWithdrawalAmount(vault.id, userPosition.shares);
        }

        enrichedVaults.push({
          ...vault,
          apy,
          strategy,
          userPosition,
          currentValue
        });
      }

      // Sort vaults
      const sortedVaults = sortVaults(enrichedVaults, sortBy);
      setVaults(sortedVaults);
      setUserSummary(summary);
    } catch (err) {
      console.error("Error loading vaults data:", err);
      setError("Failed to load savings accounts data");
    } finally {
      setLoading(false);
    }
  };

  const sortVaults = (vaultList: VaultWithDetails[], sortType: 'apy' | 'tvl' | 'risk') => {
    return [...vaultList].sort((a, b) => {
      switch (sortType) {
        case 'apy':
          return b.apy - a.apy;
        case 'tvl':
          return b.totalDeposits - a.totalDeposits;
        case 'risk':
          return (a.strategy?.riskLevel || 0) - (b.strategy?.riskLevel || 0);
        default:
          return 0;
      }
    });
  };

  const filteredVaults = filterRiskLevel
    ? vaults.filter(v => v.strategy?.riskLevel === filterRiskLevel)
    : vaults;

  const handleDeposit = async () => {
    if (!selectedVault || !depositAmount || !account) return;

    setTransactionLoading(true);
    try {
      const amount = parseFloat(depositAmount) * 100000000; // Convert to octas

      const depositArgs: DepositToVaultArguments = {
        vaultId: selectedVault.id,
        coinType: `0x1::aptos_coin::AptosCoin`, // Using APT for now
        amount: Math.floor(amount)
      };

      const result = await executeTransaction(depositToVault(depositArgs));

      if (result.success) {
        setShowDepositModal(false);
        setDepositAmount("");
        setSelectedVault(null);
        await loadVaultsData(); // Refresh data
      } else {
        setError(result.userFriendlyError || result.errorMessage || "Deposit failed");
      }
    } catch (err) {
      console.error("Deposit error:", err);
      setError("Failed to process deposit");
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault || !withdrawShares || !account) return;

    setTransactionLoading(true);
    try {
      const shares = parseFloat(withdrawShares);

      const withdrawArgs: WithdrawFromVaultArguments = {
        vaultId: selectedVault.id,
        coinType: `0x1::aptos_coin::AptosCoin`,
        shares: Math.floor(shares)
      };

      const result = await executeTransaction(withdrawFromVault(withdrawArgs));

      if (result.success) {
        setShowWithdrawModal(false);
        setWithdrawShares("");
        setSelectedVault(null);
        await loadVaultsData(); // Refresh data
      } else {
        setError(result.userFriendlyError || result.errorMessage || "Withdrawal failed");
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      setError("Failed to process withdrawal");
    } finally {
      setTransactionLoading(false);
    }
  };

  const getRiskColor = (riskLevel: number) => {
    switch (riskLevel) {
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-blue-600 bg-blue-100';
      case 3: return 'text-yellow-600 bg-yellow-100';
      case 4: return 'text-orange-600 bg-orange-100';
      case 5: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100000000).toFixed(4); // Convert from octas
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-blue-600 text-2xl">🏦</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your wallet to access high-yield savings accounts</p>
      </div>
    );
  }

  if (!hasProfile || !isActive) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-yellow-600 text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Required</h3>
        <p className="text-gray-600 mb-4">Create and activate your DID profile to access savings accounts</p>
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
          <h1 className="text-2xl font-bold text-gray-900">High-Yield Savings Accounts</h1>
          <p className="text-gray-600">Earn competitive yields on your digital assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSavingsGoals(true)}
            disabled={!hasProfile || !isActive}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🎯</span>
            <span>Savings Goals</span>
          </button>
          <button
            onClick={loadVaultsData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${loading ? 'animate-spin' : ''}`}></div>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-red-600 text-xl">❌</span>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Summary */}
      {userSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Savings Portfolio</h3>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Earning interest in real-time</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(userSummary.currentValue)} APT</p>
              <p className="text-sm text-gray-600">Total Balance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(userSummary.totalEarnings)} APT</p>
              <p className="text-sm text-gray-600">Total Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{userSummary.activeVaults}</p>
              <p className="text-sm text-gray-600">Active Accounts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {userSummary.totalEarnings > 0 && userSummary.totalDeposited > 0
                  ? ((userSummary.totalEarnings / userSummary.totalDeposited) * 100).toFixed(2)
                  : '0.00'}%
              </p>
              <p className="text-sm text-gray-600">Total Return</p>
            </div>
          </div>

          {/* Real-time Interest Ticker */}
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated daily earnings:</span>
              <span className="font-medium text-green-600">
                +{formatCurrency(userSummary.totalEarnings * 0.0027)} APT
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">vs. Traditional savings (0.45% APY):</span>
              <span className="font-medium text-blue-600">
                +{formatCurrency(userSummary.currentValue * 0.0045 / 365)} APT
              </span>
            </div>
            <div className="mt-2 text-xs text-center text-gray-500">
              💡 Your DeFi savings earn ~{((userSummary.totalEarnings * 0.0027) / (userSummary.currentValue * 0.0045 / 365)).toFixed(0)}x more daily than traditional banks
            </div>
            <div className="mt-2 text-center">
              <button
                onClick={() => setShowSavingsGoals(true)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Set savings goals to track your progress 🎯
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-lg border p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Risk Level:</label>
            <select
              value={filterRiskLevel || ''}
              onChange={(e) => setFilterRiskLevel(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="">All Levels</option>
              <option value="1">Very Low Risk</option>
              <option value="2">Low Risk</option>
              <option value="3">Medium Risk</option>
              <option value="4">High Risk</option>
              <option value="5">Very High Risk</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => {
                const newSortBy = e.target.value as 'apy' | 'tvl' | 'risk';
                setSortBy(newSortBy);
                setVaults(sortVaults(vaults, newSortBy));
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="apy">Highest APY</option>
              <option value="tvl">Total Value Locked</option>
              <option value="risk">Lowest Risk</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {filteredVaults.length} savings account{filteredVaults.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading savings accounts...</p>
        </div>
      )}

      {/* Savings Accounts Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVaults.map((vault) => (
            <div key={vault.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Account Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{vault.name}</h3>
                    <p className="text-sm text-gray-600">{getStrategyTypeName(vault.strategyType)} Strategy</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(vault.strategy?.riskLevel || 1)}`}>
                    {getRiskLevelDescription(vault.strategy?.riskLevel || 1)}
                  </div>
                </div>

                {/* APY Display */}
                <div className="text-center mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{formatAPY(vault.apy)}</p>
                  <p className="text-sm text-green-700">Annual Percentage Yield</p>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <p className="text-xs text-gray-600">
                      vs. 0.45% traditional savings
                    </p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {((vault.apy / 100) / 0.45).toFixed(0)}x better
                    </span>
                  </div>
                </div>

                {/* Strategy Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Strategy Overview</span>
                    <button
                      onClick={() => {
                        setSelectedVaultForStrategy(vault);
                        setShowStrategyExplainer(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Learn more →
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    {vault.strategyType === 1 && "Earn steady returns by lending to over-collateralized borrowers"}
                    {vault.strategyType === 2 && "Provide liquidity to DEX pools and earn trading fees"}
                    {vault.strategyType === 3 && "Stake tokens to secure the network and earn rewards"}
                  </p>
                </div>

                {/* Account Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Deposits:</span>
                    <span className="font-medium">{formatCurrency(vault.totalDeposits)} APT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your Balance:</span>
                    <span className="font-medium text-blue-600">
                      {vault.userPosition ? formatCurrency(vault.currentValue) : '0.0000'} APT
                    </span>
                  </div>
                  {vault.userPosition && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Your Earnings:</span>
                      <span className="font-medium text-green-600">
                        +{formatCurrency(Math.max(0, vault.currentValue - vault.userPosition.totalDeposited + vault.userPosition.totalWithdrawn))} APT
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedVault(vault);
                        setShowDepositModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVault(vault);
                        setShowWithdrawModal(true);
                      }}
                      disabled={!vault.userPosition || vault.userPosition.shares === 0}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Withdraw
                    </button>
                  </div>

                  {/* Additional Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedVaultForTracking(vault);
                        setShowCompoundingTracker(true);
                      }}
                      className="bg-green-50 text-green-700 py-2 px-3 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium border border-green-200"
                    >
                      📊 Earnings
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVaultForStrategy(vault);
                        setShowStrategyExplainer(true);
                      }}
                      className="bg-blue-50 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200"
                    >
                      📋 Strategy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredVaults.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-gray-400 text-2xl">🏦</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Savings Accounts Available</h3>
          <p className="text-gray-600">
            {filterRiskLevel ? 'No accounts match your risk level filter.' : 'No savings accounts are currently available.'}
          </p>
          {filterRiskLevel && (
            <button
              onClick={() => setFilterRiskLevel(null)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deposit to {selectedVault.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount (APT)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Expected APY:</span>
                  <span className="font-medium text-blue-600">{formatAPY(selectedVault.apy)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Risk Level:</span>
                  <span className="font-medium">{getRiskLevelDescription(selectedVault.strategy?.riskLevel || 1)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount("");
                    setSelectedVault(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || transactionLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transactionLoading ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Withdraw from {selectedVault.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shares to Withdraw
                </label>
                <input
                  type="number"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(e.target.value)}
                  placeholder="0"
                  max={selectedVault.userPosition?.shares || 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {selectedVault.userPosition?.shares || 0} shares
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Balance:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedVault.currentValue)} APT
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Earnings:</span>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(Math.max(0, selectedVault.currentValue - (selectedVault.userPosition?.totalDeposited || 0) + (selectedVault.userPosition?.totalWithdrawn || 0)))} APT
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawShares("");
                    setSelectedVault(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawShares || parseFloat(withdrawShares) <= 0 || transactionLoading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transactionLoading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compounding Tracker Modal */}
      {showCompoundingTracker && selectedVaultForTracking && (
        <CompoundingTracker
          vaultId={selectedVaultForTracking.id}
          vaultName={selectedVaultForTracking.name}
          userShares={selectedVaultForTracking.userPosition?.shares || 0}
          onClose={() => {
            setShowCompoundingTracker(false);
            setSelectedVaultForTracking(null);
          }}
        />
      )}

      {/* Savings Goals Modal */}
      {showSavingsGoals && (
        <SavingsGoals
          vaults={vaults.map(v => ({ id: v.id, name: v.name, apy: v.apy }))}
          onClose={() => setShowSavingsGoals(false)}
        />
      )}

      {/* Strategy Explainer Modal */}
      {showStrategyExplainer && selectedVaultForStrategy && (
        <StrategyExplainer
          vault={selectedVaultForStrategy}
          availableVaults={vaults}
          onClose={() => {
            setShowStrategyExplainer(false);
            setSelectedVaultForStrategy(null);
          }}
          onSwitchStrategy={(newVaultId) => {
            // In a real implementation, this would handle switching strategies
            console.log(`Switching to vault ${newVaultId}`);
            setShowStrategyExplainer(false);
            setSelectedVaultForStrategy(null);
          }}
        />
      )}
    </div>
  );
}