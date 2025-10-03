"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  getAutoPaymentSchedule,
  getUserLoans,
  type UserLoan,
  type AutoPaymentSchedule
} from "@/view-functions/getLendingData";
import { useTransactionManager } from "../hooks/useTransactionManager";

interface PaymentSchedulerProps {
  loan: UserLoan;
  onScheduleUpdated?: () => void;
}

interface PaymentScheduleForm {
  enabled: boolean;
  frequency: 'weekly' | 'monthly' | 'custom';
  customDays?: number;
  amount: number;
  sourceAccount: string;
}

export function PaymentScheduler({ loan, onScheduleUpdated }: PaymentSchedulerProps) {
  const { account } = useWallet();
  const { submitTransaction, isLoading } = useTransactionManager();

  const [schedule, setSchedule] = useState<AutoPaymentSchedule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PaymentScheduleForm>({
    enabled: false,
    frequency: 'monthly',
    amount: loan.paymentAmount / 100000000,
    sourceAccount: account?.address.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [loan.loanId]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const scheduleData = await getAutoPaymentSchedule(loan.loanId);
      setSchedule(scheduleData);

      if (scheduleData) {
        setForm({
          enabled: scheduleData.enabled,
          frequency: scheduleData.frequency as any,
          amount: scheduleData.amount / 100000000,
          sourceAccount: scheduleData.sourceAccount,
        });
      }
    } catch (err: any) {
      setError("Failed to load payment schedule");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!account) return;

    try {
      // Create transaction for setting up auto payment
      const transaction = {
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::lending_protocol::setup_auto_payment`,
          functionArguments: [
            loan.loanId,
            form.enabled,
            form.frequency,
            Math.floor(form.amount * 100000000).toString(), // Convert to octas
            form.sourceAccount,
            form.frequency === 'custom' ? (form.customDays || 30).toString() : '0',
          ],
        },
      };

      const result = await submitTransaction(transaction);

      if (result.success) {
        await loadSchedule();
        setIsEditing(false);
        onScheduleUpdated?.();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save payment schedule");
    }
  };

  const handleExecutePayment = async () => {
    if (!account || !schedule) return;

    try {
      const transaction = {
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::lending_protocol::execute_scheduled_payment`,
          functionArguments: [loan.loanId],
        },
      };

      const result = await submitTransaction(transaction);

      if (result.success) {
        await loadSchedule();
        onScheduleUpdated?.();
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute payment");
    }
  };

  const getNextPaymentDate = (): Date => {
    if (schedule?.nextPaymentDate) {
      return new Date(schedule.nextPaymentDate * 1000);
    }

    // Calculate next payment based on frequency
    const now = new Date();
    switch (form.frequency) {
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'custom':
        return new Date(now.getTime() + (form.customDays || 30) * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading payment schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Schedule</h3>
            <p className="text-gray-600 text-sm">
              Automate your loan payments for {loan.tokenSymbol}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {schedule?.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-sm">❌</span>
            <span className="text-red-800 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 ml-auto"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Automatic Payments
                </label>
                <p className="text-xs text-gray-500">
                  Automatically deduct payments from your account
                </p>
              </div>
              <button
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {form.enabled && (
              <>
                {/* Payment Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Frequency
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'weekly', label: 'Weekly', desc: 'Every 7 days' },
                      { value: 'monthly', label: 'Monthly', desc: 'Every 30 days' },
                      { value: 'custom', label: 'Custom', desc: 'Set custom interval' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setForm({ ...form, frequency: option.value as any })}
                        className={`p-3 text-left border rounded-lg transition-colors ${form.frequency === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Days Input */}
                {form.frequency === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Interval (Days)
                    </label>
                    <input
                      type="number"
                      value={form.customDays || 30}
                      onChange={(e) => setForm({ ...form, customDays: parseInt(e.target.value) || 30 })}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount ({loan.tokenSymbol})
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum payment: {formatCurrency(loan.paymentAmount / 100000000)}
                  </p>
                </div>

                {/* Source Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Account
                  </label>
                  <input
                    type="text"
                    value={form.sourceAccount}
                    onChange={(e) => setForm({ ...form, sourceAccount: e.target.value })}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Account to deduct payments from
                  </p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleSaveSchedule}
                disabled={isLoading || (form.enabled && (!form.amount || !form.sourceAccount))}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Schedule</span>
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {schedule?.enabled ? (
              <>
                {/* Active Schedule Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Payment Frequency</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {schedule.frequency}
                      {schedule.frequency === 'custom' && ` (${form.customDays} days)`}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Payment Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(schedule.amount / 100000000)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Next Payment</p>
                    <p className="font-semibold text-gray-900">
                      {getNextPaymentDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Payment History */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Payment Status</h4>
                    <button
                      onClick={handleExecutePayment}
                      disabled={isLoading}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      Make Payment Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Last Payment</p>
                      <p className="font-medium">
                        {schedule.lastPaymentDate
                          ? new Date(schedule.lastPaymentDate * 1000).toLocaleDateString()
                          : 'No payments yet'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Failed Attempts</p>
                      <p className={`font-medium ${schedule.failureCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {schedule.failureCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Failure Warnings */}
                {schedule.failureCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-600">⚠️</span>
                      <div>
                        <p className="text-yellow-800 font-medium">Payment Failures Detected</p>
                        <p className="text-yellow-700 text-sm">
                          {schedule.failureCount} recent payment{schedule.failureCount > 1 ? 's' : ''} failed.
                          Please ensure sufficient balance in your source account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">📅</span>
                </div>
                <p className="text-gray-600 mb-2">No automatic payments scheduled</p>
                <p className="text-gray-400 text-sm">
                  Set up automatic payments to never miss a due date
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Notification component for payment reminders
export function PaymentReminder({ loan }: { loan: UserLoan }) {
  const daysUntilPayment = Math.ceil(
    (loan.nextPaymentDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilPayment > 7) return null;

  const urgencyLevel = daysUntilPayment <= 1 ? 'critical' : daysUntilPayment <= 3 ? 'high' : 'medium';

  const colors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const icons = {
    critical: '🚨',
    high: '⚠️',
    medium: '📅',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[urgencyLevel]}`}>
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icons[urgencyLevel]}</span>
        <div className="flex-1">
          <h4 className="font-medium">
            Payment Due {daysUntilPayment === 0 ? 'Today' : `in ${daysUntilPayment} day${daysUntilPayment > 1 ? 's' : ''}`}
          </h4>
          <p className="text-sm opacity-90">
            {loan.tokenSymbol} loan payment of {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(loan.paymentAmount / 100000000)} is due
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">
            {new Date(loan.nextPaymentDate * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}