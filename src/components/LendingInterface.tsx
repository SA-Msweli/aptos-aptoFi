"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import {
  getLendingPools,
  getUserLendingPositions,
  getUserLoans,
  getLoanHealth,
  canUserBorrow,
  type LendingPool,
  type UserLoan,
  type LendingPosition,
  type LoanHealthData
} from "@/view-functions/getLendingData";
import { getKYCProfile, isKYCCompliant, KYC_LEVELS } from "@/view-functions/getKYCProfile";
import { getReputationData } from "@/view-functions/getProfile";
import { supply, borrow, repay } from "@/entry-functions/lending";
import { useTransactionManager } from "../hooks/useTransactionManager";
import { PaymentScheduler, PaymentReminder } from "./PaymentScheduler";
import { LoanHealthDashboard } from "./LoanHealthDashboard";
import { ReputationRateDisplay } from "./ReputationRateDisplay";

interface LendingInterfaceProps {
  onNavigate?: (section: string) => void;
}

export function LendingInterface({ onNavigate }: LendingInterfaceProps) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();
  const { submitTransaction, isLoading: transactionLoading } = useTransactionManager();

  // State management
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow' | 'positions' | 'health'>('supply');
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userPositions, setUserPositions] = useState<LendingPosition[]>([]);
  const [userLoans, setUserLoans] = useState<UserLoan[]>([]);
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KYC and compliance state
  const [kycLevel, setKycLevel] = useState(0);
  const [isKycCompliant, setIsKycCompliant] = useState(false);
  const [reputationScore, setReputationScore] = useState(0);
  const [borrowLimit, setBorrowLimit] = useState(0);

  // Load data on component mount and wallet connection
  useEffect(() => {
    if (connected && account && hasProfile && isActive) {
      loadLendingData();
      loadUserData();
    }
  }, [connected, account, hasProfile, isActive]);

  const loadLendingData = async () => {
    setLoading(true);
    try {
      const poolsData = await getLendingPools();
      setPools(poolsData);

      if (poolsData.length > 0) {
        setSelectedPool(poolsData[0]);
      }
    } catch (err: any) {
      setError("Failed to load lending pools");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!account?.address) return;

    try {
      // Load user positions and loans
      const [positions, loans] = await Promise.all([
        getUserLendingPositions(account.address.toString()),
        getUserLoans(account.address.toString())
      ]);

      setUserPositions(positions);
      setUserLoans(loans);

      // Load KYC and compliance data
      const [kycProfile, reputationData] = await Promise.all([
        getKYCProfile(account.address.toString()),
        getReputationData(account.address.toString())
      ]);

      if (kycProfile) {
        setKycLevel(kycProfile.kycLevel);
        const compliant = await isKYCCompliant(account.address.toString(), KYC_LEVELS.BASIC);
        setIsKycCompliant(compliant);
      }

      if (reputationData) {
        setReputationScore(reputationData.totalScore);
        // Calculate borrow limit based on reputation
        setBorrowLimit(calculateBorrowLimit(reputationData.totalScore, kycProfile?.kycLevel || 0));
      }
    } catch (err: any) {
      console.error("Failed to load user data:", err);
    }
  };

  const calculateBorrowLimit = (reputation: number, kycLevel: number): number => {
    // Base limits by KYC level
    const baseLimits = {
      [KYC_LEVELS.NONE]: 0,
      [KYC_LEVELS.BASIC]: 1000,
      [KYC_LEVELS.ENHANCED]: 10000,
      [KYC_LEVELS.INSTITUTIONAL]: 100000,
    };

    const baseLimit = baseLimits[kycLevel as keyof typeof baseLimits] || 0;

    // Reputation multiplier (0.5x to 2x based on score)
    const reputationMultiplier = Math.max(0.5, Math.min(2, reputation / 1000));

    return Math.floor(baseLimit * reputationMultiplier);
  };

  const getPersonalizedInterestRate = (baseRate: number): number => {
    // This is a simplified version for quick display
    // The full calculation is done in ReputationRateDisplay component
    const reputationDiscount = Math.min(0.2, reputationScore / 5000);
    return Math.max(baseRate * 0.8, baseRate * (1 - reputationDiscount));
  };

  const handleSupply = async () => {
    if (!selectedPool || !amount || !account) return;

    try {
      const amountInUnits = Math.floor(parseFloat(amount) * 100000000); // Convert to octas

      const transaction = supply({
        coinType: `0x1::aptos_coin::AptosCoin`, // Simplified for demo
        amount: amountInUnits,
      });

      await submitTransaction(transaction);

      // Refresh data after successful transaction
      await loadUserData();
      setAmount('');

    } catch (err: any) {
      setError(err.message || "Failed to supply liquidity");
    }
  };

  const handleBorrow = async () => {
    if (!selectedPool || !amount || !account) return;

    const borrowAmount = parseFloat(amount);

    // Check borrow eligibility
    const eligibility = await canUserBorrow(
      account.address.toString(),
      borrowAmount,
      selectedPool.tokenSymbol
    );

    if (!eligibility.canBorrow) {
      setError(eligibility.reason || "Cannot borrow this amount");
      return;
    }

    try {
      const amountInUnits = Math.floor(borrowAmount * 100000000);

      const transaction = borrow({
        coinType: `0x1::aptos_coin::AptosCoin`,
        amount: amountInUnits,
      });

      await submitTransaction(transaction);

      // Refresh data after successful transaction
      await loadUserData();
      setAmount('');

    } catch (err: any) {
      setError(err.message || "Failed to borrow");
    }
  };

  const handleRepay = async (loan: UserLoan, repayAmount: number) => {
    if (!account) return;

    try {
      const amountInUnits = Math.floor(repayAmount * 100000000);

      const transaction = repay({
        coinType: `0x1::aptos_coin::AptosCoin`,
        amount: amountInUnits,
      });

      await submitTransaction(transaction);

      // Refresh data after successful transaction
      await loadUserData();

    } catch (err: any) {
      setError(err.message || "Failed to repay loan");
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAPY = (apy: number): string => {
    return `${(apy / 100).toFixed(2)}%`;
  };

  const getHealthFactorColor = (healthFactor: number): string => {
    if (healthFactor >= 2) return "text-green-600";
    if (healthFactor >= 1.5) return "text-yellow-600";
    if (healthFactor >= 1.2) return "text-orange-600";
    return "text-red-600";
  };

  // Render compliance requirements
  if (connected && (!hasProfile || !isActive)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-yellow-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-yellow-800 mb-2">Profile Required</h3>
          <p className="text-yellow-700 mb-4">
            You need an active DID profile to access lending features.
          </p>
          <button
            onClick={() => onNavigate?.('profile')}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-blue-600 text-2xl">🔗</span>
          </div>
          <h3 className="text-xl font-semibold text-blue-800 mb-2">Connect Wallet</h3>
          <p className="text-blue-700">
            Please connect your wallet to access lending features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">P2P Lending</h1>
          <p className="text-gray-600">Supply liquidity or borrow with competitive rates</p>
        </div>

        {/* User Status */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">KYC Level</p>
            <p className="font-semibold text-gray-900">
              {kycLevel === KYC_LEVELS.BASIC && "Basic"}
              {kycLevel === KYC_LEVELS.ENHANCED && "Enhanced"}
              {kycLevel === KYC_LEVELS.INSTITUTIONAL && "Institutional"}
              {kycLevel === KYC_LEVELS.NONE && "Not Verified"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Borrow Limit</p>
            <p className="font-semibold text-gray-900">{formatCurrency(borrowLimit)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Reputation Score</p>
            <p className="font-semibold text-gray-900">{reputationScore}</p>
          </div>
        </div>
      </div>

      {/* KYC Compliance Warning */}
      {!isKycCompliant && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-orange-600 text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-orange-800 font-medium">KYC Verification Required</h3>
              <p className="text-orange-700 text-sm">
                Complete KYC verification to access borrowing features and higher limits.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('profile')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm"
            >
              Verify Now
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-red-600 text-xl">❌</span>
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'supply', label: 'Supply', icon: '💰' },
            { id: 'borrow', label: 'Borrow', icon: '🏦' },
            { id: 'positions', label: 'My Positions', icon: '📊' },
            { id: 'health', label: 'Loan Health', icon: '🏥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'supply' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pool Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Available Pools</h3>
                <p className="text-gray-600 text-sm">Select a pool to supply liquidity</p>
              </div>

              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading pools...</p>
                  </div>
                ) : pools.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-600">No pools available</p>
                  </div>
                ) : (
                  pools.map((pool) => (
                    <div
                      key={pool.tokenSymbol}
                      className={`p-6 cursor-pointer hover:bg-gray-50 ${selectedPool?.tokenSymbol === pool.tokenSymbol ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      onClick={() => setSelectedPool(pool)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">{pool.tokenSymbol[0]}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{pool.tokenSymbol}</h4>
                            <p className="text-gray-600 text-sm">
                              Total Liquidity: {formatCurrency(pool.totalLiquidity / 100000000)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{formatAPY(pool.supplyAPY)}</p>
                          <p className="text-gray-600 text-sm">Supply APY</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Utilization</p>
                          <p className="font-medium">{(pool.utilizationRate / 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Borrowed</p>
                          <p className="font-medium">{formatCurrency(pool.totalBorrowed / 100000000)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Available</p>
                          <p className="font-medium">
                            {formatCurrency((pool.totalLiquidity - pool.totalBorrowed) / 100000000)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Supply Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supply Liquidity</h3>

            {selectedPool ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ({selectedPool.tokenSymbol})
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Supply APY</span>
                    <span className="font-medium">{formatAPY(selectedPool.supplyAPY)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Est. Daily Earnings</span>
                    <span className="font-medium">
                      {amount ? formatCurrency((parseFloat(amount) * selectedPool.supplyAPY / 100) / 365) : '$0.00'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSupply}
                  disabled={!amount || parseFloat(amount) <= 0 || transactionLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {transactionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Supplying...</span>
                    </>
                  ) : (
                    <span>Supply Liquidity</span>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Select a pool to supply liquidity</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'borrow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pool Selection for Borrowing */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Borrow Markets</h3>
                <p className="text-gray-600 text-sm">Select an asset to borrow</p>
              </div>

              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading markets...</p>
                  </div>
                ) : pools.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-600">No borrow markets available</p>
                  </div>
                ) : (
                  pools.map((pool) => {
                    const personalizedRate = getPersonalizedInterestRate(pool.borrowAPY);
                    const available = (pool.totalLiquidity - pool.totalBorrowed) / 100000000;

                    return (
                      <div
                        key={pool.tokenSymbol}
                        className={`p-6 cursor-pointer hover:bg-gray-50 ${selectedPool?.tokenSymbol === pool.tokenSymbol ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        onClick={() => setSelectedPool(pool)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-red-600 font-bold">{pool.tokenSymbol[0]}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{pool.tokenSymbol}</h4>
                              <p className="text-gray-600 text-sm">
                                Available: {formatCurrency(available)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{formatAPY(personalizedRate)}</p>
                            <p className="text-gray-600 text-sm">Your Rate</p>
                            {personalizedRate < pool.borrowAPY && (
                              <p className="text-green-600 text-xs">
                                {formatAPY(pool.borrowAPY - personalizedRate)} discount
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Base Rate</p>
                            <p className="font-medium">{formatAPY(pool.borrowAPY)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Utilization</p>
                            <p className="font-medium">{(pool.utilizationRate / 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Your Limit</p>
                            <p className="font-medium">{formatCurrency(Math.min(borrowLimit, available))}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Borrow Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrow Assets</h3>

            {!isKycCompliant ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-orange-600 text-xl">⚠️</span>
                </div>
                <p className="text-gray-600 mb-4">KYC verification required to borrow</p>
                <button
                  onClick={() => onNavigate?.('profile')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  Complete KYC
                </button>
              </div>
            ) : selectedPool ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ({selectedPool.tokenSymbol})
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={Math.min(borrowLimit, (selectedPool.totalLiquidity - selectedPool.totalBorrowed) / 100000000)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {formatCurrency(Math.min(borrowLimit, (selectedPool.totalLiquidity - selectedPool.totalBorrowed) / 100000000))}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-medium">{formatAPY(getPersonalizedInterestRate(selectedPool.borrowAPY))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Est. Monthly Payment</span>
                    <span className="font-medium">
                      {amount ? formatCurrency((parseFloat(amount) * getPersonalizedInterestRate(selectedPool.borrowAPY) / 100) / 12) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collateral Required</span>
                    <span className="font-medium">
                      {amount ? formatCurrency(parseFloat(amount) * 1.5) : '$0.00'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBorrow}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > borrowLimit || transactionLoading}
                  className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {transactionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Borrowing...</span>
                    </>
                  ) : (
                    <span>Borrow Assets</span>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Select a market to borrow from</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-6">
          {/* Supply Positions */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Supply Positions</h3>
              <p className="text-gray-600 text-sm">Your active liquidity positions</p>
            </div>

            <div className="divide-y divide-gray-200">
              {userPositions.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">💰</span>
                  </div>
                  <p className="text-gray-600">No supply positions</p>
                  <p className="text-gray-400 text-sm">Start supplying liquidity to earn interest</p>
                </div>
              ) : (
                userPositions.map((position, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold">{position.tokenSymbol[0]}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{position.tokenSymbol}</h4>
                          <p className="text-gray-600 text-sm">
                            Supplied: {formatCurrency(position.suppliedAmount / 100000000)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(position.earnedInterest / 100000000)}
                        </p>
                        <p className="text-gray-600 text-sm">Interest Earned</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Current APY</p>
                        <p className="font-medium">{formatAPY(position.currentAPY)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Shares</p>
                        <p className="font-medium">{(position.shares / 100000000).toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Value</p>
                        <p className="font-medium">
                          {formatCurrency((position.suppliedAmount + position.earnedInterest) / 100000000)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Borrow Positions */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Borrow Positions</h3>
              <p className="text-gray-600 text-sm">Your active loans and payment schedules</p>
            </div>

            <div className="divide-y divide-gray-200">
              {userLoans.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">🏦</span>
                  </div>
                  <p className="text-gray-600">No active loans</p>
                  <p className="text-gray-400 text-sm">Borrow assets to see your loans here</p>
                </div>
              ) : (
                userLoans.map((loan) => (
                  <div key={loan.loanId} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold">{loan.tokenSymbol[0]}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{loan.tokenSymbol} Loan</h4>
                          <p className="text-gray-600 text-sm">
                            Borrowed: {formatCurrency(loan.amount / 100000000)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getHealthFactorColor(loan.healthFactor)}`}>
                          {loan.healthFactor.toFixed(2)}
                        </p>
                        <p className="text-gray-600 text-sm">Health Factor</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-600">Interest Rate</p>
                        <p className="font-medium">{formatAPY(loan.interestRate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Collateral</p>
                        <p className="font-medium">{formatCurrency(loan.collateralAmount / 100000000)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Repaid</p>
                        <p className="font-medium">{formatCurrency(loan.totalRepaid / 100000000)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Next Payment</p>
                        <p className="font-medium">
                          {new Date(loan.nextPaymentDate * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-sm text-gray-600">Monthly Payment</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(loan.paymentAmount / 100000000)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRepay(loan, loan.paymentAmount / 100000000)}
                        disabled={transactionLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        Make Payment
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Loan Health Dashboard */}
          <LoanHealthDashboard
            loans={userLoans}
            onLoanAction={(action, loan) => {
              if (action === 'repay') {
                handleRepay(loan, loan.paymentAmount / 100000000);
              }
              // Add collateral action would be implemented here
            }}
          />

          {/* Payment Schedulers for each loan */}
          {userLoans.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Schedules</h3>
              {userLoans.map((loan) => (
                <PaymentScheduler
                  key={loan.loanId}
                  loan={loan}
                  onScheduleUpdated={loadUserData}
                />
              ))}
            </div>
          )}

          {/* Reputation Rate Information */}
          {selectedPool && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Personalized Interest Rates</h3>
                <ReputationRateDisplay
                  baseRate={selectedPool.borrowAPY}
                  tokenSymbol={selectedPool.tokenSymbol}
                  loanAmount={amount ? parseFloat(amount) : 10000}
                  showDetails={true}
                  onRateCalculated={(personalizedRate, discount) => {
                    // Update any parent state if needed
                    console.log(`Personalized rate: ${personalizedRate}, Discount: ${discount}`);
                  }}
                />
              </div>

              {/* Rate Comparison Table */}
              <div className="bg-white rounded-lg border">
                <div className="p-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">Rate Comparison</h4>
                  <p className="text-gray-600 text-sm">See how your rates compare across different loan amounts</p>
                </div>

                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-600">Loan Amount</th>
                          <th className="text-left py-2 text-gray-600">Base Rate</th>
                          <th className="text-left py-2 text-gray-600">Your Rate</th>
                          <th className="text-left py-2 text-gray-600">Annual Savings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1000, 5000, 10000, 25000, 50000].map((loanAmount) => {
                          const personalizedRate = getPersonalizedInterestRate(selectedPool.borrowAPY);
                          const savings = (loanAmount * (selectedPool.borrowAPY - personalizedRate)) / 10000;

                          return (
                            <tr key={loanAmount} className="border-b border-gray-100">
                              <td className="py-2 font-medium">{formatCurrency(loanAmount)}</td>
                              <td className="py-2">{formatAPY(selectedPool.borrowAPY)}</td>
                              <td className="py-2 text-green-600 font-medium">{formatAPY(personalizedRate)}</td>
                              <td className="py-2 text-green-600">{formatCurrency(savings)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}