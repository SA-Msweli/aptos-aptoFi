"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { initiateCrossChainTransfer } from "@/entry-functions/ccipBridge";
import { submitTransaction } from "@/lib/transactions";

export interface RecurringPayment {
  id: string;
  recipient: string;
  token: string;
  amount: number;
  destinationChain: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customInterval?: number;
  nextPayment: Date;
  isActive: boolean;
  createdAt: Date;
  lastPayment?: Date;
  totalPayments: number;
  failedPayments: number;
  maxRetries?: number;
  currentRetries?: number;
}

export interface PaymentExecution {
  paymentId: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  transactionHash?: string;
  error?: string;
  executedAt: Date;
  retryCount: number;
}

export interface UseRecurringPaymentsOptions {
  autoExecute?: boolean;
  executionInterval?: number; // in milliseconds
  maxRetries?: number;
  retryDelay?: number; // in milliseconds
}

export function useRecurringPayments(options: UseRecurringPaymentsOptions = {}) {
  const {
    autoExecute = true,
    executionInterval = 60000, // 1 minute
    maxRetries = 3,
    retryDelay = 30000 // 30 seconds
  } = options;

  const { connected, account } = useWallet();

  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [executionHistory, setExecutionHistory] = useState<PaymentExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<Date | null>(null);

  const executionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load recurring payments from localStorage
  const loadRecurringPayments = useCallback(() => {
    if (!connected || !account?.address) {
      setRecurringPayments([]);
      return;
    }

    try {
      const userKey = account.address.toString();
      const stored = localStorage.getItem(`recurringPayments_${userKey}`);

      if (stored) {
        const payments = JSON.parse(stored).map((p: any) => ({
          ...p,
          nextPayment: new Date(p.nextPayment),
          createdAt: new Date(p.createdAt),
          lastPayment: p.lastPayment ? new Date(p.lastPayment) : undefined
        }));
        setRecurringPayments(payments);
      }

      // Load execution history
      const historyStored = localStorage.getItem(`paymentExecutions_${userKey}`);
      if (historyStored) {
        const history = JSON.parse(historyStored).map((e: any) => ({
          ...e,
          executedAt: new Date(e.executedAt)
        }));
        setExecutionHistory(history);
      }
    } catch (err) {
      console.error('Error loading recurring payments:', err);
    }
  }, [connected, account]);

  // Save recurring payments to localStorage
  const saveRecurringPayments = useCallback((payments: RecurringPayment[]) => {
    if (!account?.address) return;

    const userKey = account.address.toString();
    localStorage.setItem(`recurringPayments_${userKey}`, JSON.stringify(payments));
  }, [account]);

  // Save execution history to localStorage
  const saveExecutionHistory = useCallback((history: PaymentExecution[]) => {
    if (!account?.address) return;

    const userKey = account.address.toString();
    // Keep only last 100 executions
    const trimmedHistory = history.slice(-100);
    localStorage.setItem(`paymentExecutions_${userKey}`, JSON.stringify(trimmedHistory));
  }, [account]);

  // Calculate next payment date
  const calculateNextPayment = useCallback((payment: RecurringPayment): Date => {
    const now = new Date();
    const next = new Date(payment.nextPayment);

    switch (payment.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'custom':
        next.setDate(next.getDate() + (payment.customInterval || 30));
        break;
    }

    // Ensure next payment is in the future
    while (next <= now) {
      switch (payment.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'custom':
          next.setDate(next.getDate() + (payment.customInterval || 30));
          break;
      }
    }

    return next;
  }, []);

  // Execute a single payment
  const executePayment = useCallback(async (payment: RecurringPayment): Promise<PaymentExecution> => {
    const execution: PaymentExecution = {
      paymentId: payment.id,
      status: 'pending',
      executedAt: new Date(),
      retryCount: payment.currentRetries || 0
    };

    try {
      // Create transaction payload
      const transferArgs = {
        recipient: payment.recipient,
        token: payment.token,
        amount: payment.amount,
        destinationChain: payment.destinationChain,
        gasLimit: 200000
      };

      const transactionPayload = initiateCrossChainTransfer(transferArgs);
      const result = await submitTransaction(transactionPayload);

      if (result.success) {
        execution.status = 'success';
        execution.transactionHash = result.transactionHash;

        // Update payment: increment total payments, reset retries, calculate next payment
        const updatedPayments = recurringPayments.map(p =>
          p.id === payment.id
            ? {
              ...p,
              totalPayments: p.totalPayments + 1,
              lastPayment: new Date(),
              nextPayment: calculateNextPayment(p),
              currentRetries: 0
            }
            : p
        );

        setRecurringPayments(updatedPayments);
        saveRecurringPayments(updatedPayments);
      } else {
        execution.status = 'failed';
        execution.error = result.error || 'Transaction failed';

        // Update payment: increment failed payments and retries
        const updatedPayments = recurringPayments.map(p =>
          p.id === payment.id
            ? {
              ...p,
              failedPayments: p.failedPayments + 1,
              currentRetries: (p.currentRetries || 0) + 1
            }
            : p
        );

        setRecurringPayments(updatedPayments);
        saveRecurringPayments(updatedPayments);

        // Schedule retry if under max retries
        if ((payment.currentRetries || 0) < maxRetries) {
          execution.status = 'retrying';
          scheduleRetry(payment);
        }
      }
    } catch (err: any) {
      console.error(`Error executing payment ${payment.id}:`, err);
      execution.status = 'failed';
      execution.error = err.message || 'Execution failed';

      // Update payment with failure
      const updatedPayments = recurringPayments.map(p =>
        p.id === payment.id
          ? {
            ...p,
            failedPayments: p.failedPayments + 1,
            currentRetries: (p.currentRetries || 0) + 1
          }
          : p
      );

      setRecurringPayments(updatedPayments);
      saveRecurringPayments(updatedPayments);

      // Schedule retry if under max retries
      if ((payment.currentRetries || 0) < maxRetries) {
        execution.status = 'retrying';
        scheduleRetry(payment);
      }
    }

    return execution;
  }, [recurringPayments, calculateNextPayment, saveRecurringPayments, maxRetries]);

  // Schedule a retry for a failed payment
  const scheduleRetry = useCallback((payment: RecurringPayment) => {
    // Clear existing retry timeout
    const existingTimeout = retryTimeoutsRef.current.get(payment.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new retry
    const timeout = setTimeout(async () => {
      console.log(`Retrying payment ${payment.id} (attempt ${(payment.currentRetries || 0) + 1})`);
      const execution = await executePayment(payment);

      setExecutionHistory(prev => {
        const updated = [...prev, execution];
        saveExecutionHistory(updated);
        return updated;
      });

      retryTimeoutsRef.current.delete(payment.id);
    }, retryDelay);

    retryTimeoutsRef.current.set(payment.id, timeout);
  }, [executePayment, retryDelay, saveExecutionHistory]);

  // Execute all due payments
  const executeDuePayments = useCallback(async () => {
    if (isExecuting || !connected || !account?.address) return;

    const now = new Date();
    const duePayments = recurringPayments.filter(
      payment => payment.isActive && payment.nextPayment <= now
    );

    if (duePayments.length === 0) return;

    console.log(`Executing ${duePayments.length} due payments`);
    setIsExecuting(true);

    try {
      const executions = await Promise.all(
        duePayments.map(payment => executePayment(payment))
      );

      setExecutionHistory(prev => {
        const updated = [...prev, ...executions];
        saveExecutionHistory(updated);
        return updated;
      });

      setLastExecution(new Date());
    } catch (err) {
      console.error('Error executing due payments:', err);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, connected, account, recurringPayments, executePayment, saveExecutionHistory]);

  // Manual execution of a specific payment
  const executePaymentManually = useCallback(async (paymentId: string): Promise<boolean> => {
    const payment = recurringPayments.find(p => p.id === paymentId);
    if (!payment) return false;

    setIsExecuting(true);
    try {
      const execution = await executePayment(payment);

      setExecutionHistory(prev => {
        const updated = [...prev, execution];
        saveExecutionHistory(updated);
        return updated;
      });

      return execution.status === 'success';
    } catch (err) {
      console.error(`Error manually executing payment ${paymentId}:`, err);
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [recurringPayments, executePayment, saveExecutionHistory]);

  // Add a new recurring payment
  const addRecurringPayment = useCallback((payment: Omit<RecurringPayment, 'id' | 'createdAt' | 'totalPayments' | 'failedPayments'>) => {
    const newPayment: RecurringPayment = {
      ...payment,
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      totalPayments: 0,
      failedPayments: 0
    };

    const updatedPayments = [...recurringPayments, newPayment];
    setRecurringPayments(updatedPayments);
    saveRecurringPayments(updatedPayments);

    return newPayment.id;
  }, [recurringPayments, saveRecurringPayments]);

  // Update a recurring payment
  const updateRecurringPayment = useCallback((paymentId: string, updates: Partial<RecurringPayment>) => {
    const updatedPayments = recurringPayments.map(payment =>
      payment.id === paymentId ? { ...payment, ...updates } : payment
    );

    setRecurringPayments(updatedPayments);
    saveRecurringPayments(updatedPayments);
  }, [recurringPayments, saveRecurringPayments]);

  // Remove a recurring payment
  const removeRecurringPayment = useCallback((paymentId: string) => {
    // Clear any pending retry
    const timeout = retryTimeoutsRef.current.get(paymentId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeoutsRef.current.delete(paymentId);
    }

    const updatedPayments = recurringPayments.filter(p => p.id !== paymentId);
    setRecurringPayments(updatedPayments);
    saveRecurringPayments(updatedPayments);
  }, [recurringPayments, saveRecurringPayments]);

  // Get payment statistics
  const getPaymentStats = useCallback(() => {
    const totalPayments = recurringPayments.reduce((sum, p) => sum + p.totalPayments, 0);
    const totalFailed = recurringPayments.reduce((sum, p) => sum + p.failedPayments, 0);
    const activePayments = recurringPayments.filter(p => p.isActive).length;
    const duePayments = recurringPayments.filter(p => p.isActive && p.nextPayment <= new Date()).length;

    return {
      totalRecurring: recurringPayments.length,
      activePayments,
      duePayments,
      totalPayments,
      totalFailed,
      successRate: totalPayments > 0 ? ((totalPayments - totalFailed) / totalPayments) * 100 : 0
    };
  }, [recurringPayments]);

  // Load data on mount and account change
  useEffect(() => {
    loadRecurringPayments();
  }, [loadRecurringPayments]);

  // Set up auto-execution interval
  useEffect(() => {
    if (!autoExecute || !connected) return;

    // Execute immediately on setup
    executeDuePayments();

    // Set up interval
    executionIntervalRef.current = setInterval(executeDuePayments, executionInterval);

    return () => {
      if (executionIntervalRef.current) {
        clearInterval(executionIntervalRef.current);
      }
    };
  }, [autoExecute, connected, executeDuePayments, executionInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear execution interval
      if (executionIntervalRef.current) {
        clearInterval(executionIntervalRef.current);
      }

      // Clear all retry timeouts
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  }, []);

  return {
    // State
    recurringPayments,
    executionHistory,
    isExecuting,
    lastExecution,

    // Actions
    addRecurringPayment,
    updateRecurringPayment,
    removeRecurringPayment,
    executePaymentManually,
    executeDuePayments,

    // Utilities
    getPaymentStats,
    loadRecurringPayments
  };
}