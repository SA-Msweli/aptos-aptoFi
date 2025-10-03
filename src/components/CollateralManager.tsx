"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getLoanHealth,
  type UserLoan,
  type LoanHealthData
} from "@/view-functions/getLendingData";
import { getLatestPrice } from "@/view-functions/getOracleData";
import { useTransactionManager } from "@/hooks/useTransactionManager";

interface CollateralManagerProps {
  loan: UserLoan;
  onCollateralUpdated?: () => void;
}

interface CollateralAction {
  type: 'add' | 'remove';
  amount: number;
  newHealthFactor: number;
  newLiquidationPrice: number;
  riskLevel: 'safe' | 'warning' | 'critical';
}

export function CollateralManager({ loan, onCollateralUpdated }: CollateralManagerProps) {
  const { account } = useWallet();
  const { submitTransaction, isLoading } = useTransactionManager();

  const [healthData, setHealthData] = useState<LoanHealthData | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  const [previewAction, setPreviewAction] = useState<CollateralAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && loan) {
      loadHealthData();
    }
  }, [account, loan]);

  useEffect(() => {
    if (collateralAmount && healthData) {
      calculatePreview();
    } else {
      setPreviewAction(null);
    }
  }, [collateralAmount, actionType, healthData]);

  const loadHealthData = async () => {
    if (!account) return;

    setLoading(true);
    try {
      const [health, priceData] = await Promise.all([
        getLoanHealth(account.address.toString(), loan.tokenSymbol),
        getLatestPrice(loan.tokenSymbol).catch(() => [0, 0] as [number, number])
      ]);

      setHealthData(health);
      setCurrentPrice(Array.isArray(priceData) ? priceData[0] / 100000000 : 0);
    } catch (err: any) {
      setError("Failed to load health data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    if (!healthData || !collateralAmount) return;

    const amount = parseFloat(collateralAmount);
    if (isNaN(amount) || amount <= 0) return;

    const currentCollateral = healthData.collateralValue / 100000000;
    const borrowedValue = healthData.borrowedValue / 100000000;

    let newCollateralValue: number;
    if (actionType === 'add') {
      newCollateralValue = currentCollateral + amount;
    } else {
      newCollateralValue = Math.max(0, currentCollateral - amount);
    }

    // Calculate new health factor
    const liquidationThreshold = 0.8; // 80% threshold
    const newHealthFactor = borrowedValue > 0
      ? (newCollateralValue * liquidationThreshold) / borrowedValue
      : 999;

    // Calculate new liquidation price
    const newLiquidationPrice = newCollateralValue > 0
      ? (borrowedValue / (newCollateralValue * liquidationThreshold)) * currentPrice
      : 0;

    // Determine risk level
    let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
    if (newHealthFactor < 1.2) riskLevel = 'critical';
    else if (newHealthFactor < 1.5) riskLevel = 'warning';

    setPreviewAction({
      type: actionType,
      amount,
      newHealthFactor,
      newLiquidationPrice,
      riskLevel,
    });
  };

  const handleCollateralAction = async () => {
    if (!account || !collateralAmount || !previewAction) return;

    try {
      setError(null);

      // This would be implemented with actual contract calls
      // For now, we'll simulate the transaction
      const amountInUnits = Math.floor(previewAction.amount * 100000000);

      // Simulate transaction based on action type
      const transaction = {
        data: {
          function: actionType === 'add'
            ? `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}::lending_protocol::add_collateral`
            : `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}::lending_protocol::remove_collateral`,
          functionArguments: [
            loan.loanId,
            amountInUnits.toString(),
          ],
        },
      };

      await submitTransaction(transaction);

      // Reset form and refresh data
      setCollateralAmount('');
      setPreviewAction(null);
      await loadHealthData();
      onCollateralUpdated?.();

    } catch (err: any) {
      setError(err.message || `Failed to ${actionType} collateral`);
    }
  };

  const getRecommendedAction = (): {
    action: 'add' | 'remove' | 'none';
    amount: number;
    reason: string;
  } => {
    if (!healthData) return { action: 'none', amount: 0, reason: 'Loading...' };

    const healthFactor = healthData.healthFactor;
    const collateralValue = healthData.collateralValue / 100000000;
    const borrowedValue = healthData.borrowedValue / 100000000;

    if (healthFactor < 1.2) {
      // Critical: recommend adding collateral to reach 1.5 health factor
      const targetHealthFactor = 1.5;
      const requiredCollateral = (borrowedValue * targetHealthFactor) / 0.8;
      const additionalCollateral = Math.max(0, requiredCollateral - collateralValue);

      return {
        action: 'add',
        amount: Math.ceil(additionalCollateral * 1.1), // Add 10% buffer
        reason: 'Critical risk - add collateral to avoid liquidation'
      };
    } else if (healthFactor < 1.5) {
      // Warning: recommend adding some collateral
      const targetHealthFactor = 2.0;
      const requiredCollateral = (borrowedValue * targetHealthFactor) / 0.8;
      const additionalCollateral = Math.max(0, requiredCollateral - collateralValue);

      return {
        action: 'add',
        amount: Math.ceil(additionalCollateral),
        reason: 'High risk - consider adding collateral for safety'
      };
    } else if (healthFactor > 3.0) {
      // Very safe: could remove some collateral
      const targetHealthFactor = 2.5;
      const requiredCollateral = (borrowedValue * targetHealthFactor) / 0.8;
      const excessCollateral = Math.max(0, collateralValue - requiredCollateral);

      return {
        action: 'remove',
        amount: Math.floor(excessCollateral * 0.8), // Remove 80% of excess
        reason: 'Very safe - you could remove some collateral if needed'
      };
    }

    return { action: 'none', amount: 0, reason: 'Your collateral level is optimal' };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const recommendation = getRecommendedAction();

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Collateral Management</h3>
        <p className="text-gray-600 text-sm">
          Manage your {loan.tokenSymbol} loan collateral to maintain healthy positions
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Current Collateral</p>
            <p className="text-lg font-semibold text-gray-900">
              {healthData ? formatCurrency(healthData.collateralValue / 100000000) : 'Loading...'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Borrowed Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              {healthData ? formatCurrency(healthData.borrowedValue / 100000000) : 'Loading...'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Health Factor</p>
            <p className={`text-lg font-semibold ${healthData && healthData.healthFactor < 1.2 ? 'text-red-600' :
                healthData && healthData.healthFactor < 1.5 ? 'text-orange-600' :
                  'text-green-600'
              }`}>
              {healthData ? healthData.healthFactor.toFixed(2) : 'Loading...'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Liquidation Price</p>
            <p className="text-lg font-semibold text-red-600">
              {healthData ? formatCurrency(healthData.liquidationPrice / 100000000) : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        {recommendation.action !== 'none' && (
          <div className={`p-4 rounded-lg border-l-4 ${recommendation.action === 'add' && healthData && healthData.healthFactor < 1.2
              ? 'bg-red-50 border-red-500'
              : recommendation.action === 'add'
                ? 'bg-orange-50 border-orange-500'
                : 'bg-blue-50 border-blue-500'
            }`}>
            <div className="flex items-start space-x-3">
              <span className="text-xl">
                {recommendation.action === 'add' ? '⬆️' : '⬇️'}
              </span>
              <div>
                <h4 className={`font-medium ${recommendation.action === 'add' && healthData && healthData.healthFactor < 1.2
                    ? 'text-red-800'
                    : recommendation.action === 'add'
                      ? 'text-orange-800'
                      : 'text-blue-800'
                  }`}>
                  Recommended: {recommendation.action === 'add' ? 'Add' : 'Remove'} {formatCurrency(recommendation.amount)}
                </h4>
                <p className={`text-sm ${recommendation.action === 'add' && healthData && healthData.healthFactor < 1.2
                    ? 'text-red-700'
                    : recommendation.action === 'add'
                      ? 'text-orange-700'
                      : 'text-blue-700'
                  }`}>
                  {recommendation.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Form */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActionType('add')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${actionType === 'add'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Add Collateral
            </button>
            <button
              onClick={() => setActionType('remove')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${actionType === 'remove'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Remove Collateral
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({loan.tokenSymbol})
            </label>
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {recommendation.action !== 'none' && (
              <button
                onClick={() => setCollateralAmount(recommendation.amount.toString())}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Use recommended amount ({formatCurrency(recommendation.amount)})
              </button>
            )}
          </div>

          {/* Preview */}
          {previewAction && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Preview Changes</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">New Health Factor</p>
                  <p className={`font-semibold ${previewAction.riskLevel === 'critical' ? 'text-red-600' :
                      previewAction.riskLevel === 'warning' ? 'text-orange-600' :
                        'text-green-600'
                    }`}>
                    {previewAction.newHealthFactor.toFixed(2)}
                    <span className="ml-2 text-xs">
                      ({previewAction.newHealthFactor > (healthData?.healthFactor || 0) ? '↑' : '↓'})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">New Liquidation Price</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(previewAction.newLiquidationPrice)}
                  </p>
                </div>
              </div>

              {previewAction.riskLevel === 'critical' && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                  ⚠️ Warning: This action would result in a critical health factor
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleCollateralAction}
            disabled={!collateralAmount || !previewAction || isLoading || (previewAction.riskLevel === 'critical' && actionType === 'remove')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <span>
                {actionType === 'add' ? 'Add' : 'Remove'} Collateral
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}