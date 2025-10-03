"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getUserLendingPositions,
  getUserLoans,
  getLoanHealth,
  type LendingPosition,
  type UserLoan,
  type LoanHealthData
} from "../view-functions/getLendingData";

interface LendingPositionsCardProps {
  onNavigate?: (section: string) => void;
}

export function LendingPositionsCard({ onNavigate }: LendingPositionsCardProps) {
  const { connected, account } = useWallet();
  const [lendingPositions, setLendingPositions] = useState<LendingPosition[]>([]);
  const [userLoans, setUserLoans] = useState<UserLoan[]>([]);
  const [loanHealthData, setLoanHealthData] = useState<Record<string, LoanHealthData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLendingData = async () => {
      if (!connected || !account?.address) {
        setLendingPositions([]);
        setUserLoans([]);
        setLoanHealthData({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [positions, loans] = await Promise.all([
          getUserLendingPositions(account.address.toString()),
          getUserLoans(account.address.toString())
        ]);

        setLendingPositions(positions);
        setUserLoans(loans);

        // Fetch health data for each loan
        const healthPromises = loans.map(async (loan) => {
          const health = await getLoanHealth(account.address.toString(), loan.tokenSymbol);
          return { tokenSymbol: loan.tokenSymbol, health };
        });

        const healthResults = await Promise.all(healthPromises);
        const healthMap: Record<string, LoanHealthData> = {};
        healthResults.forEach(({ tokenSymbol, health }) => {
          if (health) {
            healthMap[tokenSymbol] = health;
          }
        });

        setLoanHealthData(healthMap);
      } catch (error: any) {
        console.error("Error fetching lending data:", error);
        setError("Failed to fetch lending data");
      } finally {
        setLoading(false);
      }
    };

    fetchLendingData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLendingData, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  const formatAmount = (amount: number, decimals: number = 8) => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const formatAPY = (apy: number) => {
    return (apy / 100).toFixed(2);
  };

  const formatHealthFactor = (healthFactor: number) => {
    if (healthFactor >= 999) return "∞";
    return healthFactor.toFixed(2);
  };

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2.0) return "text-green-600";
    if (healthFactor >= 1.5) return "text-yellow-600";
    if (healthFactor >= 1.1) return "text-orange-600";
    return "text-red-600";
  };

  const formatNextPaymentDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const totalSupplied = lendingPositions.reduce((sum, pos) => sum + pos.suppliedAmount, 0);
  const totalBorrowed = userLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalEarned = lendingPositions.reduce((sum, pos) => sum + pos.earnedInterest, 0);

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lending Positions</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">🏦</span>
          </div>
          <p className="text-gray-500 text-sm">Connect wallet to view lending positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Lending Positions</h3>
        {loading && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Supplied</p>
          <p className="text-lg font-semibold text-green-600">
            ${formatAmount(totalSupplied)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Borrowed</p>
          <p className="text-lg font-semibold text-blue-600">
            ${formatAmount(totalBorrowed)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Interest Earned</p>
          <p className="text-lg font-semibold text-purple-600">
            ${formatAmount(totalEarned)}
          </p>
        </div>
      </div>

      {/* Lending Positions */}
      {lendingPositions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Supply Positions</h4>
          <div className="space-y-3">
            {lendingPositions.map((position, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-bold">
                        {position.tokenSymbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{position.tokenSymbol}</p>
                      <p className="text-sm text-gray-600">
                        APY: {formatAPY(position.currentAPY)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatAmount(position.suppliedAmount)} {position.tokenSymbol}
                    </p>
                    <p className="text-sm text-green-600">
                      +{formatAmount(position.earnedInterest)} earned
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Loans */}
      {userLoans.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Active Loans</h4>
          <div className="space-y-3">
            {userLoans.map((loan, index) => {
              const healthData = loanHealthData[loan.tokenSymbol];
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-bold">
                          {loan.tokenSymbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{loan.tokenSymbol} Loan</p>
                        <p className="text-sm text-gray-600">
                          Rate: {formatAPY(loan.interestRate)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatAmount(loan.amount)} {loan.tokenSymbol}
                      </p>
                      <p className="text-sm text-gray-600">
                        Collateral: {formatAmount(loan.collateralAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">
                        Health Factor:
                        <span className={`ml-1 font-medium ${getHealthFactorColor(loan.healthFactor)}`}>
                          {formatHealthFactor(loan.healthFactor)}
                        </span>
                      </span>
                      {healthData && loan.healthFactor < 1.5 && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                          ⚠️ Monitor closely
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      Next Payment: {formatNextPaymentDate(loan.nextPaymentDate)}
                    </div>
                  </div>

                  {/* Payment Schedule Info */}
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Payment Amount: ${formatAmount(loan.paymentAmount)}</span>
                      <span>Frequency: {loan.paymentFrequency}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && lendingPositions.length === 0 && userLoans.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">🏦</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">No lending positions found</p>
          <p className="text-gray-400 text-xs mb-4">Start lending or borrowing to see your positions here</p>
          <button
            onClick={() => onNavigate?.('lending')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Start Lending
          </button>
        </div>
      )}
    </div>
  );
}