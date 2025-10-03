"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getLoanHealth,
  getUserLoans,
  type UserLoan,
  type LoanHealthData
} from "@/view-functions/getLendingData";
import { getLatestPrice } from "@/view-functions/getOracleData";
import { CollateralManager } from "./CollateralManager";

interface LoanHealthDashboardProps {
  loans: UserLoan[];
  onLoanAction?: (action: 'repay' | 'addCollateral', loan: UserLoan) => void;
}

interface LoanHealthWithData extends UserLoan {
  healthData: LoanHealthData | null;
  currentPrice: number;
  priceChange24h: number;
}

interface AlertNotification {
  id: string;
  loanId: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
  actionRequired: boolean;
}

interface AlertSettings {
  enableNotifications: boolean;
  enableSound: boolean;
  enableEmail: boolean;
  criticalThreshold: number;
  warningThreshold: number;
  safeThreshold: number;
  monitoringInterval: number; // in seconds
}

export function LoanHealthDashboard({ loans, onLoanAction }: LoanHealthDashboardProps) {
  const { account } = useWallet();
  const [loansWithHealth, setLoansWithHealth] = useState<LoanHealthWithData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enableNotifications: true,
    enableSound: true,
    enableEmail: false,
    criticalThreshold: 1.2,
    warningThreshold: 1.5,
    safeThreshold: 2.0,
    monitoringInterval: 30,
  });
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [selectedLoanForCollateral, setSelectedLoanForCollateral] = useState<string | null>(null);
  const previousHealthFactors = useRef<Map<string, number>>(new Map());
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // Load health data with alert checking
  const loadHealthDataWithAlerts = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    try {
      const healthPromises = loans.map(async (loan) => {
        const [healthData, priceData] = await Promise.all([
          getLoanHealth(account.address.toString(), loan.tokenSymbol),
          getLatestPrice(loan.tokenSymbol).catch(() => [0, 0] as [number, number])
        ]);

        return {
          ...loan,
          healthData,
          currentPrice: Array.isArray(priceData) ? priceData[0] / 100000000 : 0,
          priceChange24h: Array.isArray(priceData) ? priceData[1] / 100 : 0,
        };
      });

      const results = await Promise.all(healthPromises);
      setLoansWithHealth(results);

      // Check for health factor changes and generate alerts
      checkHealthFactorAlerts(results);
    } catch (err: any) {
      setError("Failed to load health data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [account, loans, alertSettings]);

  // Check for health factor changes and generate alerts
  const checkHealthFactorAlerts = useCallback((loansData: LoanHealthWithData[]) => {
    const newAlerts: AlertNotification[] = [];

    loansData.forEach((loan) => {
      if (!loan.healthData) return;

      const currentHealthFactor = loan.healthData.healthFactor;
      const previousHealthFactor = previousHealthFactors.current.get(loan.loanId);

      // Store current health factor for next comparison
      previousHealthFactors.current.set(loan.loanId, currentHealthFactor);

      // Skip alert generation on first load
      if (previousHealthFactor === undefined) return;

      // Generate alerts based on thresholds and changes
      if (currentHealthFactor < alertSettings.criticalThreshold) {
        if (previousHealthFactor >= alertSettings.criticalThreshold) {
          // Health factor dropped into critical zone
          newAlerts.push({
            id: `critical-${loan.loanId}-${Date.now()}`,
            loanId: loan.loanId,
            type: 'critical',
            title: 'Critical Liquidation Risk!',
            message: `Your ${loan.tokenSymbol} loan health factor dropped to ${currentHealthFactor.toFixed(2)}. Immediate action required to avoid liquidation.`,
            timestamp: Date.now(),
            dismissed: false,
            actionRequired: true,
          });
        }
      } else if (currentHealthFactor < alertSettings.warningThreshold) {
        if (previousHealthFactor >= alertSettings.warningThreshold) {
          // Health factor dropped into warning zone
          newAlerts.push({
            id: `warning-${loan.loanId}-${Date.now()}`,
            loanId: loan.loanId,
            type: 'warning',
            title: 'Health Factor Warning',
            message: `Your ${loan.tokenSymbol} loan health factor is ${currentHealthFactor.toFixed(2)}. Consider adding collateral or repaying part of the loan.`,
            timestamp: Date.now(),
            dismissed: false,
            actionRequired: true,
          });
        }
      }

      // Alert for significant health factor drops (>10% in one update)
      if (previousHealthFactor > 0 && currentHealthFactor > 0) {
        const percentageChange = ((currentHealthFactor - previousHealthFactor) / previousHealthFactor) * 100;
        if (percentageChange < -10) {
          newAlerts.push({
            id: `drop-${loan.loanId}-${Date.now()}`,
            loanId: loan.loanId,
            type: 'warning',
            title: 'Significant Health Factor Drop',
            message: `Your ${loan.tokenSymbol} loan health factor dropped by ${Math.abs(percentageChange).toFixed(1)}% to ${currentHealthFactor.toFixed(2)}.`,
            timestamp: Date.now(),
            dismissed: false,
            actionRequired: false,
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts

      // Play sound notification if enabled
      if (alertSettings.enableSound && newAlerts.some(alert => alert.type === 'critical')) {
        playAlertSound();
      }

      // Show browser notification if enabled
      if (alertSettings.enableNotifications) {
        showBrowserNotification(newAlerts[0]);
      }
    }
  }, [alertSettings]);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((alert: AlertNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.loanId,
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/favicon.ico',
            tag: alert.loanId,
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (loans.length > 0 && account) {
      loadHealthDataWithAlerts();
    }
  }, [loans, account, loadHealthDataWithAlerts]);

  useEffect(() => {
    // Set up real-time monitoring with configurable interval
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
    }

    if (loans.length > 0 && account && alertSettings.enableNotifications) {
      monitoringInterval.current = setInterval(() => {
        loadHealthDataWithAlerts();
      }, alertSettings.monitoringInterval * 1000);
    }

    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
    };
  }, [loans, account, alertSettings.monitoringInterval, alertSettings.enableNotifications, loadHealthDataWithAlerts]);

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Update alert settings
  const updateAlertSettings = useCallback((newSettings: Partial<AlertSettings>) => {
    setAlertSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getHealthStatus = (healthFactor: number): {
    status: 'critical' | 'warning' | 'safe';
    color: string;
    bgColor: string;
    label: string;
  } => {
    if (healthFactor < alertSettings.criticalThreshold) {
      return {
        status: 'critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        label: 'Critical Risk'
      };
    } else if (healthFactor < alertSettings.warningThreshold) {
      return {
        status: 'warning',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        label: 'High Risk'
      };
    } else if (healthFactor < alertSettings.safeThreshold) {
      return {
        status: 'warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        label: 'Medium Risk'
      };
    } else {
      return {
        status: 'safe',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        label: 'Safe'
      };
    }
  };

  const calculateLiquidationDistance = (loan: LoanHealthWithData): {
    priceDropPercentage: number;
    priceTarget: number;
  } => {
    if (!loan.healthData || loan.currentPrice === 0) {
      return { priceDropPercentage: 0, priceTarget: 0 };
    }

    const liquidationPrice = loan.healthData.liquidationPrice / 100000000;
    const priceDropPercentage = ((loan.currentPrice - liquidationPrice) / loan.currentPrice) * 100;

    return {
      priceDropPercentage: Math.max(0, priceDropPercentage),
      priceTarget: liquidationPrice,
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const criticalLoans = loansWithHealth.filter(loan =>
    loan.healthData && loan.healthData.healthFactor < alertSettings.criticalThreshold
  );

  const warningLoans = loansWithHealth.filter(loan =>
    loan.healthData &&
    loan.healthData.healthFactor >= alertSettings.criticalThreshold &&
    loan.healthData.healthFactor < alertSettings.warningThreshold
  );

  const activeAlerts = alerts.filter(alert => !alert.dismissed);
  const criticalAlerts = activeAlerts.filter(alert => alert.type === 'critical');
  const warningAlerts = activeAlerts.filter(alert => alert.type === 'warning');

  if (loans.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xl">📊</span>
          </div>
          <p className="text-gray-600">No active loans to monitor</p>
          <p className="text-gray-400 text-sm">Your loan health metrics will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Alert Notifications */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span className="animate-pulse">🔔</span>
              <span>Active Alerts ({activeAlerts.length})</span>
            </h3>
            <button
              onClick={clearAllAlerts}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${alert.type === 'critical'
                  ? 'bg-red-50 border-red-500'
                  : alert.type === 'warning'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${alert.type === 'critical' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-orange-800' : 'text-blue-800'
                        }`}>
                        {alert.title}
                      </span>
                      {alert.actionRequired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${alert.type === 'critical' ? 'text-red-700' :
                      alert.type === 'warning' ? 'text-orange-700' : 'text-blue-700'
                      }`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Summary */}
      {(criticalLoans.length > 0 || warningLoans.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalLoans.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-red-600 text-xl animate-pulse">🚨</span>
                <div>
                  <h3 className="text-red-800 font-medium">Critical Risk Alert</h3>
                  <p className="text-red-700 text-sm">
                    {criticalLoans.length} loan{criticalLoans.length > 1 ? 's' : ''} at risk of liquidation
                  </p>
                </div>
              </div>
            </div>
          )}

          {warningLoans.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-orange-600 text-xl">⚠️</span>
                <div>
                  <h3 className="text-orange-800 font-medium">High Risk Warning</h3>
                  <p className="text-orange-700 text-sm">
                    {warningLoans.length} loan{warningLoans.length > 1 ? 's' : ''} require attention
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Monitoring Status */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${alertSettings.enableNotifications ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Real-time Monitoring {alertSettings.enableNotifications ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-gray-600">
                {alertSettings.enableNotifications
                  ? `Updating every ${alertSettings.monitoringInterval} seconds`
                  : 'Enable notifications to activate monitoring'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Last Update</p>
            <p className="text-xs text-gray-500">
              {loading ? 'Updating...' : new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loansWithHealth.map((loan) => {
          const healthStatus = getHealthStatus(loan.healthData?.healthFactor || 0);
          const liquidationData = calculateLiquidationDistance(loan);

          return (
            <div
              key={loan.loanId}
              className={`bg-white rounded-xl shadow-sm border-2 ${healthStatus.bgColor}`}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">{loan.tokenSymbol[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{loan.tokenSymbol} Loan</h3>
                      <p className="text-gray-600 text-sm">
                        {formatCurrency(loan.amount / 100000000)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthStatus.status === 'critical' ? 'bg-red-100 text-red-800' :
                      healthStatus.status === 'warning' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {healthStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Health Metrics */}
              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading health data...</p>
                  </div>
                ) : loan.healthData ? (
                  <>
                    {/* Health Factor */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Health Factor</p>
                      <p className={`text-3xl font-bold ${healthStatus.color}`}>
                        {loan.healthData.healthFactor.toFixed(2)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${healthStatus.status === 'critical' ? 'bg-red-500' :
                            healthStatus.status === 'warning' ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                          style={{
                            width: `${Math.min(100, (loan.healthData.healthFactor / 3) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Collateral Value</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(loan.healthData.collateralValue / 100000000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Borrowed Value</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(loan.healthData.borrowedValue / 100000000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available to Borrow</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(loan.healthData.availableToBorrow / 100000000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Liquidation Threshold</p>
                        <p className="font-semibold text-gray-900">
                          {(loan.healthData.liquidationThreshold * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Price Information */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Current Price</p>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(loan.currentPrice)}
                          </p>
                          <p className={`text-xs ${loan.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {formatPercentage(loan.priceChange24h)} 24h
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Liquidation Price</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(liquidationData.priceTarget)}
                        </p>
                      </div>

                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-600">
                          {liquidationData.priceDropPercentage.toFixed(1)}% price drop to liquidation
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onLoanAction?.('repay', loan)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Repay
                      </button>
                      <button
                        onClick={() => setSelectedLoanForCollateral(
                          selectedLoanForCollateral === loan.loanId ? null : loan.loanId
                        )}
                        className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        {selectedLoanForCollateral === loan.loanId ? 'Hide' : 'Manage'} Collateral
                      </button>
                    </div>

                    {/* Risk Warnings */}
                    {healthStatus.status === 'critical' && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <span className="text-red-600 text-sm">🚨</span>
                          <div className="text-red-800 text-xs">
                            <p className="font-medium">Liquidation Risk!</p>
                            <p>Your loan may be liquidated soon. Consider repaying or adding collateral immediately.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {healthStatus.status === 'warning' && (
                      <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <span className="text-orange-600 text-sm">⚠️</span>
                          <div className="text-orange-800 text-xs">
                            <p className="font-medium">Monitor Closely</p>
                            <p>Your health factor is getting low. Consider improving your position.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 text-sm">Unable to load health data</p>
                  </div>
                )}
              </div>

              {/* Collateral Manager */}
              {selectedLoanForCollateral === loan.loanId && (
                <div className="mt-4">
                  <CollateralManager
                    loan={loan}
                    onCollateralUpdated={() => {
                      loadHealthDataWithAlerts();
                      setSelectedLoanForCollateral(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Alert Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Alert & Monitoring Settings</h3>
              <p className="text-gray-600 text-sm">Configure automated alerts and real-time monitoring</p>
            </div>
            <button
              onClick={() => setShowAlertSettings(!showAlertSettings)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showAlertSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
          </div>
        </div>

        {showAlertSettings && (
          <div className="p-6 space-y-6">
            {/* Notification Preferences */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableNotifications}
                    onChange={(e) => updateAlertSettings({ enableNotifications: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable browser notifications</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableSound}
                    onChange={(e) => updateAlertSettings({ enableSound: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable sound alerts for critical risks</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableEmail}
                    onChange={(e) => updateAlertSettings({ enableEmail: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable email notifications (coming soon)</span>
                </label>
              </div>
            </div>

            {/* Monitoring Interval */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Monitoring Frequency</h4>
              <div className="flex items-center space-x-4">
                <label className="block text-sm font-medium text-gray-700">
                  Update Interval (seconds)
                </label>
                <select
                  value={alertSettings.monitoringInterval}
                  onChange={(e) => updateAlertSettings({ monitoringInterval: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
                <span className="text-xs text-gray-500">
                  More frequent updates use more resources
                </span>
              </div>
            </div>

            {/* Alert Thresholds */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Alert Thresholds</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Critical Threshold
                  </label>
                  <input
                    type="number"
                    value={alertSettings.criticalThreshold}
                    onChange={(e) => updateAlertSettings({
                      criticalThreshold: parseFloat(e.target.value) || 1.2
                    })}
                    step="0.1"
                    min="1.0"
                    max="2.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Triggers immediate liquidation warnings</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warning Threshold
                  </label>
                  <input
                    type="number"
                    value={alertSettings.warningThreshold}
                    onChange={(e) => updateAlertSettings({
                      warningThreshold: parseFloat(e.target.value) || 1.5
                    })}
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Triggers risk monitoring alerts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Safe Threshold
                  </label>
                  <input
                    type="number"
                    value={alertSettings.safeThreshold}
                    onChange={(e) => updateAlertSettings({
                      safeThreshold: parseFloat(e.target.value) || 2.0
                    })}
                    step="0.1"
                    min="1.5"
                    max="5.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Health factor considered safe above this</p>
                </div>
              </div>
            </div>

            {/* Alert History Summary */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Alert History</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
                  <p className="text-sm text-red-700">Critical Alerts</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-orange-600">{warningAlerts.length}</p>
                  <p className="text-sm text-orange-700">Warning Alerts</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-600">{alerts.length}</p>
                  <p className="text-sm text-blue-700">Total Alerts</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}