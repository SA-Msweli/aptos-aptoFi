import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "./aptos";
import {
  UserTransactionResponse,
  PendingTransactionResponse,
  AccountAddress
} from "@aptos-labs/ts-sdk";

// Import entry functions
import { transferAPT, TransferAPTArguments } from "@/entry-functions/transferAPT";
import {
  createProfile,
  updateProfile,
  deactivateProfile,
  CreateProfileArguments,
  UpdateProfileArguments,
  DeactivateProfileArguments
} from "@/entry-functions/didRegistry";
import {
  initializeReputation,
  updateTransactionScore,
  updateLendingScore,
  InitializeReputationArguments,
  UpdateTransactionScoreArguments,
  UpdateLendingScoreArguments
} from "@/entry-functions/reputation";
import {
  swap,
  addLiquidity,
  removeLiquidity,
  SwapArguments,
  AddLiquidityArguments,
  RemoveLiquidityArguments
} from "@/entry-functions/amm";
import {
  createKYCProfile,
  submitKYCDocument,
  verifyKYCProfile,
  registerKYCProvider,
  initializeKYCRegistry,
  CreateKYCProfileArguments,
  SubmitKYCDocumentArguments,
  VerifyKYCProfileArguments,
  RegisterKYCProviderArguments
} from "@/entry-functions/kycRegistry";

// Import new entry functions
import {
  createVault,
  depositToVault,
  withdrawFromVault,
  harvestVaultRewards,
  CreateVaultArguments,
  DepositToVaultArguments,
  WithdrawFromVaultArguments,
  HarvestVaultRewardsArguments
} from "@/entry-functions/yieldVault";
import {
  initiateCrossChainTransfer,
  sendCrossChainMessage,
  initiateCrossChainSwap,
  CrossChainTransferArguments,
  CrossChainMessageArguments,
  CrossChainSwapArguments
} from "@/entry-functions/ccipBridge";
import {
  updatePositionRisk,
  checkLiquidationEligibility,
  updateRiskParameters,
  setRiskLimits,
  UpdatePositionRiskArguments,
  CheckLiquidationEligibilityArguments,
  UpdateRiskParametersArguments,
  SetRiskLimitsArguments
} from "@/entry-functions/riskManager";

export interface TransactionResult {
  hash: string;
  success: boolean;
  gasUsed?: number;
  errorMessage?: string;
  userFriendlyError?: string;
  retryable?: boolean;
  timestamp?: number;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  gasUsed?: number;
  errorCode?: string;
  errorMessage?: string;
  blockNumber?: number;
}

export interface EventSubscription {
  id: string;
  contractAddress: string;
  eventTypes: string[];
  callback: (event: ContractEvent) => void;
  unsubscribe: () => void;
}

export interface ContractEvent {
  type: string;
  data: any;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface RetryableTransaction {
  hash: string;
  transactionData: any;
  maxRetries: number;
  currentRetries: number;
  retryDelayMs: number;
  nextRetryTime: number;
  lastError: any;
}

// Enhanced error types for better error handling
export enum ErrorCategory {
  WALLET_ERROR = 'wallet',
  CONTRACT_ERROR = 'contract',
  NETWORK_ERROR = 'network',
  VALIDATION_ERROR = 'validation',
  COMPLIANCE_ERROR = 'compliance',
  BUSINESS_LOGIC_ERROR = 'business_logic'
}

export interface UserFriendlyError {
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  suggestedActions: string[];
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error translation service for converting Move error codes to user-friendly messages
 */
class ErrorTranslationService {
  private static errorMappings: Record<string, UserFriendlyError> = {
    // Authorization and Access Errors
    'E_NOT_AUTHORIZED': {
      category: ErrorCategory.COMPLIANCE_ERROR,
      code: 'E_NOT_AUTHORIZED',
      message: 'Not authorized to perform this action',
      userMessage: 'You are not authorized to perform this action. Please complete your profile setup and KYC verification.',
      suggestedActions: ['Complete your profile setup', 'Verify your KYC status', 'Contact support if issues persist'],
      retryable: false,
      severity: 'medium'
    },
    'E_ADMIN_ONLY': {
      category: ErrorCategory.COMPLIANCE_ERROR,
      code: 'E_ADMIN_ONLY',
      message: 'Admin access required',
      userMessage: 'This operation requires administrator privileges.',
      suggestedActions: ['Contact an administrator', 'Check your account permissions'],
      retryable: false,
      severity: 'high'
    },

    // Balance and Fund Errors
    'E_INSUFFICIENT_BALANCE': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_INSUFFICIENT_BALANCE',
      message: 'Insufficient balance for transaction',
      userMessage: 'You don\'t have enough balance to complete this transaction.',
      suggestedActions: ['Add funds to your account', 'Reduce transaction amount', 'Check your available balance'],
      retryable: true,
      severity: 'medium'
    },
    'E_INSUFFICIENT_COLLATERAL': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_INSUFFICIENT_COLLATERAL',
      message: 'Insufficient collateral',
      userMessage: 'You need more collateral to complete this borrowing operation.',
      suggestedActions: ['Add more collateral', 'Reduce borrow amount', 'Check collateral requirements'],
      retryable: true,
      severity: 'medium'
    },
    'E_INSUFFICIENT_LIQUIDITY': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_INSUFFICIENT_LIQUIDITY',
      message: 'Insufficient liquidity in pool',
      userMessage: 'There isn\'t enough liquidity in the pool for this transaction.',
      suggestedActions: ['Reduce transaction amount', 'Try again later', 'Check pool liquidity'],
      retryable: true,
      severity: 'medium'
    },

    // KYC and Compliance Errors
    'E_KYC_NOT_VERIFIED': {
      category: ErrorCategory.COMPLIANCE_ERROR,
      code: 'E_KYC_NOT_VERIFIED',
      message: 'KYC verification required',
      userMessage: 'This operation requires KYC verification. Please complete your identity verification.',
      suggestedActions: ['Complete KYC verification', 'Upload required documents', 'Contact support for assistance'],
      retryable: false,
      severity: 'high'
    },
    'E_KYC_LEVEL_INSUFFICIENT': {
      category: ErrorCategory.COMPLIANCE_ERROR,
      code: 'E_KYC_LEVEL_INSUFFICIENT',
      message: 'Higher KYC level required',
      userMessage: 'This operation requires a higher level of KYC verification.',
      suggestedActions: ['Upgrade your KYC level', 'Submit additional documents', 'Contact support'],
      retryable: false,
      severity: 'high'
    },
    'E_TRANSACTION_LIMIT_EXCEEDED': {
      category: ErrorCategory.COMPLIANCE_ERROR,
      code: 'E_TRANSACTION_LIMIT_EXCEEDED',
      message: 'Transaction limit exceeded',
      userMessage: 'This transaction exceeds your current limits.',
      suggestedActions: ['Reduce transaction amount', 'Upgrade your KYC level', 'Contact support for higher limits'],
      retryable: true,
      severity: 'medium'
    },

    // Vault and Yield Errors
    'E_VAULT_NOT_FOUND': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_VAULT_NOT_FOUND',
      message: 'Vault not found',
      userMessage: 'The requested vault could not be found or may have been deactivated.',
      suggestedActions: ['Check vault ID', 'Browse available vaults', 'Contact support if vault should exist'],
      retryable: false,
      severity: 'medium'
    },
    'E_VAULT_INACTIVE': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_VAULT_INACTIVE',
      message: 'Vault is inactive',
      userMessage: 'This vault is currently inactive and not accepting deposits.',
      suggestedActions: ['Choose an active vault', 'Check vault status', 'Contact support'],
      retryable: false,
      severity: 'medium'
    },
    'E_INSUFFICIENT_SHARES': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_INSUFFICIENT_SHARES',
      message: 'Insufficient vault shares',
      userMessage: 'You don\'t have enough shares in this vault for the withdrawal.',
      suggestedActions: ['Reduce withdrawal amount', 'Check your vault balance', 'Deposit more to the vault'],
      retryable: true,
      severity: 'medium'
    },

    // Risk Management Errors
    'E_LIQUIDATION_THRESHOLD_EXCEEDED': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_LIQUIDATION_THRESHOLD_EXCEEDED',
      message: 'Position would exceed liquidation threshold',
      userMessage: 'This action would put your position at risk of liquidation.',
      suggestedActions: ['Add more collateral', 'Reduce borrow amount', 'Check your health factor'],
      retryable: true,
      severity: 'high'
    },
    'E_POSITION_UNHEALTHY': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_POSITION_UNHEALTHY',
      message: 'Position health factor too low',
      userMessage: 'Your position health is too low to perform this action.',
      suggestedActions: ['Improve your health factor', 'Add collateral', 'Repay some debt'],
      retryable: true,
      severity: 'high'
    },
    'E_RISK_LIMIT_EXCEEDED': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_RISK_LIMIT_EXCEEDED',
      message: 'Risk limit exceeded',
      userMessage: 'This operation would exceed your risk limits.',
      suggestedActions: ['Reduce position size', 'Check risk settings', 'Contact support for limit adjustments'],
      retryable: true,
      severity: 'medium'
    },

    // Cross-Chain Errors
    'E_CHAIN_NOT_SUPPORTED': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_CHAIN_NOT_SUPPORTED',
      message: 'Destination chain not supported',
      userMessage: 'The selected destination chain is not currently supported for cross-chain operations.',
      suggestedActions: ['Choose a supported chain', 'Check supported chains list', 'Contact support for new chain requests'],
      retryable: false,
      severity: 'medium'
    },
    'E_CCIP_FEE_INSUFFICIENT': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_CCIP_FEE_INSUFFICIENT',
      message: 'Insufficient fee for cross-chain operation',
      userMessage: 'The provided fee is insufficient for this cross-chain operation.',
      suggestedActions: ['Increase the fee amount', 'Check current fee rates', 'Try again with updated fees'],
      retryable: true,
      severity: 'medium'
    },
    'E_TRANSFER_FAILED': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_TRANSFER_FAILED',
      message: 'Cross-chain transfer failed',
      userMessage: 'The cross-chain transfer could not be completed.',
      suggestedActions: ['Check destination address', 'Verify chain connectivity', 'Contact support'],
      retryable: true,
      severity: 'high'
    },

    // Oracle and Price Errors
    'E_PRICE_STALE': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_PRICE_STALE',
      message: 'Price data is stale',
      userMessage: 'Price data is outdated. Please wait for fresh price data before proceeding.',
      suggestedActions: ['Wait for price update', 'Try again in a few minutes', 'Contact support if issue persists'],
      retryable: true,
      severity: 'medium'
    },
    'E_ORACLE_NOT_FOUND': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_ORACLE_NOT_FOUND',
      message: 'Price oracle not found',
      userMessage: 'Price data is not available for this asset.',
      suggestedActions: ['Check asset symbol', 'Contact support', 'Try with a different asset'],
      retryable: false,
      severity: 'medium'
    },
    'E_PRICE_DEVIATION_TOO_HIGH': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_PRICE_DEVIATION_TOO_HIGH',
      message: 'Price deviation too high',
      userMessage: 'Current price deviates too much from expected range.',
      suggestedActions: ['Wait for price stabilization', 'Check market conditions', 'Try again later'],
      retryable: true,
      severity: 'medium'
    },

    // AMM and Trading Errors
    'E_SLIPPAGE_EXCEEDED': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_SLIPPAGE_EXCEEDED',
      message: 'Slippage tolerance exceeded',
      userMessage: 'The price moved too much during the transaction.',
      suggestedActions: ['Increase slippage tolerance', 'Reduce trade size', 'Try again'],
      retryable: true,
      severity: 'medium'
    },
    'E_POOL_NOT_FOUND': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_POOL_NOT_FOUND',
      message: 'Trading pool not found',
      userMessage: 'The requested trading pool does not exist.',
      suggestedActions: ['Check token pair', 'Browse available pools', 'Contact support'],
      retryable: false,
      severity: 'medium'
    },
    'E_MINIMUM_AMOUNT_NOT_MET': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'E_MINIMUM_AMOUNT_NOT_MET',
      message: 'Minimum amount requirement not met',
      userMessage: 'The transaction amount is below the minimum required.',
      suggestedActions: ['Increase transaction amount', 'Check minimum requirements', 'Try a different pool'],
      retryable: true,
      severity: 'medium'
    },

    // Network and Technical Errors
    'ABORT_1': {
      category: ErrorCategory.CONTRACT_ERROR,
      code: 'ABORT_1',
      message: 'Contract execution aborted',
      userMessage: 'The transaction was rejected by the smart contract.',
      suggestedActions: ['Check transaction parameters', 'Try again', 'Contact support if issue persists'],
      retryable: true,
      severity: 'medium'
    },
    'ABORT_2': {
      category: ErrorCategory.CONTRACT_ERROR,
      code: 'ABORT_2',
      message: 'Invalid parameters',
      userMessage: 'The transaction parameters are invalid.',
      suggestedActions: ['Check input values', 'Verify addresses and amounts', 'Try again with correct parameters'],
      retryable: true,
      severity: 'medium'
    },
    'SEQUENCE_NUMBER_TOO_OLD': {
      category: ErrorCategory.NETWORK_ERROR,
      code: 'SEQUENCE_NUMBER_TOO_OLD',
      message: 'Transaction sequence number too old',
      userMessage: 'This transaction is outdated. Please try again.',
      suggestedActions: ['Refresh the page', 'Try the transaction again', 'Check your wallet connection'],
      retryable: true,
      severity: 'low'
    },
    'SEQUENCE_NUMBER_TOO_NEW': {
      category: ErrorCategory.NETWORK_ERROR,
      code: 'SEQUENCE_NUMBER_TOO_NEW',
      message: 'Transaction sequence number too new',
      userMessage: 'Please wait for previous transactions to complete.',
      suggestedActions: ['Wait a moment', 'Check pending transactions', 'Try again'],
      retryable: true,
      severity: 'low'
    },
    'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE': {
      category: ErrorCategory.BUSINESS_LOGIC_ERROR,
      code: 'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE',
      message: 'Insufficient balance for transaction fee',
      userMessage: 'You don\'t have enough APT to pay for transaction fees.',
      suggestedActions: ['Add APT to your wallet', 'Reduce transaction amount', 'Check your APT balance'],
      retryable: true,
      severity: 'medium'
    }
  };

  static translateContractError(error: any): UserFriendlyError {
    // Extract error code from various error formats
    let errorCode = '';

    if (typeof error === 'string') {
      // Simple string error - check for known patterns
      errorCode = error;

      // Check for Move error patterns in string
      const moveErrorMatch = error.match(/E_[A-Z_]+/);
      if (moveErrorMatch) {
        errorCode = moveErrorMatch[0];
      }

      // Check for abort code patterns
      const abortMatch = error.match(/ABORT.*code (\d+)/i);
      if (abortMatch) {
        errorCode = `ABORT_${abortMatch[1]}`;
      }

      // Check for sequence number errors
      if (error.includes('SEQUENCE_NUMBER_TOO_OLD')) {
        errorCode = 'SEQUENCE_NUMBER_TOO_OLD';
      } else if (error.includes('SEQUENCE_NUMBER_TOO_NEW')) {
        errorCode = 'SEQUENCE_NUMBER_TOO_NEW';
      } else if (error.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
        errorCode = 'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE';
      }
    } else if (error?.message) {
      // Extract error code from message
      const moveErrorMatch = error.message.match(/E_[A-Z_]+/);
      if (moveErrorMatch) {
        errorCode = moveErrorMatch[0];
      } else {
        // Check for other error patterns in message
        const abortMatch = error.message.match(/ABORT.*code (\d+)/i);
        if (abortMatch) {
          errorCode = `ABORT_${abortMatch[1]}`;
        } else if (error.message.includes('SEQUENCE_NUMBER_TOO_OLD')) {
          errorCode = 'SEQUENCE_NUMBER_TOO_OLD';
        } else if (error.message.includes('SEQUENCE_NUMBER_TOO_NEW')) {
          errorCode = 'SEQUENCE_NUMBER_TOO_NEW';
        } else if (error.message.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
          errorCode = 'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE';
        } else {
          // Use the full message as error code for exact matching
          errorCode = error.message;
        }
      }
    } else if (error?.move_abort_code) {
      // Move abort code
      errorCode = `ABORT_${error.move_abort_code}`;
    } else if (error?.vm_status) {
      // VM status error
      const abortMatch = error.vm_status.match(/ABORT.*code (\d+)/i);
      if (abortMatch) {
        errorCode = `ABORT_${abortMatch[1]}`;
      } else {
        errorCode = error.vm_status;
      }
    } else if (error?.code) {
      // Error with code property
      errorCode = error.code;
    } else if (error?.type) {
      // Error with type property
      errorCode = error.type;
    }

    // Return mapped error or generic error
    return this.errorMappings[errorCode] || this.getGenericError(error);
  }

  private static getGenericError(error: any): UserFriendlyError {
    return {
      category: ErrorCategory.CONTRACT_ERROR,
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      suggestedActions: ['Try again', 'Check your internet connection', 'Contact support if issue persists'],
      retryable: true,
      severity: 'medium'
    };
  }
}

/**
 * Enhanced transaction manager with event listening and status tracking
 */
class EnhancedTransactionManager {
  private eventSubscriptions: Map<string, EventSubscription> = new Map();
  private transactionStatuses: Map<string, TransactionStatus> = new Map();
  private eventPollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private retryQueue: Map<string, RetryableTransaction> = new Map();

  /**
   * Subscribe to contract events with real-time polling
   */
  subscribeToContractEvents(
    contractAddress: string,
    eventTypes: string[],
    callback: (event: ContractEvent) => void
  ): EventSubscription {
    const subscriptionId = `${contractAddress}_${Date.now()}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      contractAddress,
      eventTypes,
      callback,
      unsubscribe: () => {
        this.unsubscribeFromEvents(subscriptionId);
      }
    };

    this.eventSubscriptions.set(subscriptionId, subscription);
    this.startEventListening(subscription);

    return subscription;
  }

  private async startEventListening(subscription: EventSubscription) {
    let lastProcessedVersion = 0;

    const pollEvents = async () => {
      try {
        // Get account transactions to find events
        const transactions = await aptos.getAccountTransactions({
          accountAddress: subscription.contractAddress,
          options: {
            limit: 25
          }
        });

        for (const txn of transactions) {
          if (txn.type === 'user_transaction' && txn.success) {
            const userTxn = txn as UserTransactionResponse;

            // Process events from this transaction
            if (userTxn.events) {
              for (const event of userTxn.events) {
                // Check if this event type is subscribed to
                const eventType = event.type.split('::').pop() || '';
                if (subscription.eventTypes.includes(eventType) || subscription.eventTypes.includes('*')) {
                  const contractEvent: ContractEvent = {
                    type: eventType,
                    data: event.data,
                    transactionHash: userTxn.hash,
                    blockNumber: parseInt(userTxn.version),
                    timestamp: parseInt(userTxn.timestamp)
                  };

                  // Call the callback
                  try {
                    subscription.callback(contractEvent);
                  } catch (callbackError) {
                    console.error('Event callback error:', callbackError);
                  }
                }
              }
            }

            lastProcessedVersion = Math.max(lastProcessedVersion, parseInt(userTxn.version));
          }
        }
      } catch (error) {
        console.error('Event polling error:', error);
      }
    };

    // Start polling every 5 seconds
    const intervalId = setInterval(pollEvents, 5000);
    this.eventPollingIntervals.set(subscription.id, intervalId);

    // Initial poll
    pollEvents();
  }

  private unsubscribeFromEvents(subscriptionId: string) {
    // Clear polling interval
    const intervalId = this.eventPollingIntervals.get(subscriptionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.eventPollingIntervals.delete(subscriptionId);
    }

    // Remove subscription
    this.eventSubscriptions.delete(subscriptionId);
  }

  /**
   * Track transaction status with enhanced retry mechanism
   */
  async trackTransactionStatus(
    txHash: string,
    maxRetries: number = 5,
    retryDelayMs: number = 2000
  ): Promise<TransactionStatus> {
    let retries = 0;
    let lastError: any = null;

    while (retries < maxRetries) {
      try {
        // First try to get the transaction
        const txn = await aptos.getTransactionByHash({ transactionHash: txHash });

        let status: TransactionStatus;

        if (txn.type === 'pending_transaction') {
          status = {
            hash: txHash,
            status: 'pending',
            timestamp: Date.now(),
          };
        } else if (txn.type === 'user_transaction') {
          const userTxn = txn as UserTransactionResponse;
          status = {
            hash: txHash,
            status: userTxn.success ? 'success' : 'failed',
            timestamp: parseInt(userTxn.timestamp),
            gasUsed: parseInt(userTxn.gas_used || '0'),
            blockNumber: parseInt(userTxn.version || '0'),
            errorCode: userTxn.success ? undefined : this.extractErrorCode(userTxn),
            errorMessage: userTxn.success ? undefined : this.extractErrorMessage(userTxn),
          };
        } else {
          status = {
            hash: txHash,
            status: 'failed',
            timestamp: Date.now(),
            errorMessage: 'Unknown transaction type',
          };
        }

        this.transactionStatuses.set(txHash, status);
        return status;
      } catch (error: any) {
        lastError = error;
        retries++;

        if (retries >= maxRetries) {
          const status: TransactionStatus = {
            hash: txHash,
            status: 'failed',
            timestamp: Date.now(),
            errorMessage: error instanceof Error ? error.message : 'Failed to fetch transaction status after max retries',
          };
          this.transactionStatuses.set(txHash, status);
          return status;
        }

        // Exponential backoff with jitter
        const delay = retryDelayMs * Math.pow(2, retries - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Max retries exceeded. Last error: ${lastError?.message}`);
  }

  /**
   * Extract error code from failed transaction
   */
  private extractErrorCode(txn: UserTransactionResponse): string | undefined {
    if (txn.success) return undefined;

    // Try to extract from vm_status
    if (txn.vm_status && txn.vm_status.includes('ABORTED')) {
      const match = txn.vm_status.match(/code (\d+)/);
      if (match) {
        return `ABORT_${match[1]}`;
      }
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Extract error message from failed transaction
   */
  private extractErrorMessage(txn: UserTransactionResponse): string | undefined {
    if (txn.success) return undefined;
    return txn.vm_status || 'Transaction failed';
  }

  /**
   * Add transaction to retry queue
   */
  addToRetryQueue(
    txHash: string,
    transactionData: any,
    maxRetries: number = 3,
    retryDelayMs: number = 5000
  ) {
    const retryableTransaction: RetryableTransaction = {
      hash: txHash,
      transactionData,
      maxRetries,
      currentRetries: 0,
      retryDelayMs,
      nextRetryTime: Date.now() + retryDelayMs,
      lastError: null,
    };

    this.retryQueue.set(txHash, retryableTransaction);
  }

  /**
   * Process retry queue
   */
  async processRetryQueue(): Promise<void> {
    const now = Date.now();

    for (const [txHash, retryableTransaction] of this.retryQueue.entries()) {
      if (now >= retryableTransaction.nextRetryTime) {
        try {
          // Check if original transaction succeeded
          const status = await this.trackTransactionStatus(txHash, 1, 1000);

          if (status.status === 'success') {
            // Transaction succeeded, remove from retry queue
            this.retryQueue.delete(txHash);
            continue;
          }

          if (status.status === 'pending') {
            // Still pending, check again later
            retryableTransaction.nextRetryTime = now + retryableTransaction.retryDelayMs;
            continue;
          }

          // Transaction failed, retry if we haven't exceeded max retries
          if (retryableTransaction.currentRetries < retryableTransaction.maxRetries) {
            retryableTransaction.currentRetries++;
            retryableTransaction.nextRetryTime = now + (retryableTransaction.retryDelayMs * retryableTransaction.currentRetries);

            console.log(`Retrying transaction ${txHash} (attempt ${retryableTransaction.currentRetries}/${retryableTransaction.maxRetries})`);

            // This would trigger a re-submission of the transaction
            // For now, we just log it
          } else {
            // Max retries exceeded, remove from queue
            console.error(`Transaction ${txHash} failed after ${retryableTransaction.maxRetries} retries`);
            this.retryQueue.delete(txHash);
          }
        } catch (error) {
          retryableTransaction.lastError = error;
          retryableTransaction.currentRetries++;

          if (retryableTransaction.currentRetries >= retryableTransaction.maxRetries) {
            this.retryQueue.delete(txHash);
          } else {
            retryableTransaction.nextRetryTime = now + (retryableTransaction.retryDelayMs * retryableTransaction.currentRetries);
          }
        }
      }
    }
  }

  /**
   * Get cached transaction status
   */
  getCachedTransactionStatus(txHash: string): TransactionStatus | undefined {
    return this.transactionStatuses.get(txHash);
  }

  /**
   * Clear old cached statuses (cleanup)
   */
  clearOldStatuses(maxAgeMs: number = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();

    for (const [hash, status] of this.transactionStatuses.entries()) {
      if (now - status.timestamp > maxAgeMs) {
        this.transactionStatuses.delete(hash);
      }
    }
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): { pending: number; failed: number; total: number } {
    let pending = 0;
    let failed = 0;

    for (const retryableTransaction of this.retryQueue.values()) {
      if (retryableTransaction.currentRetries >= retryableTransaction.maxRetries) {
        failed++;
      } else {
        pending++;
      }
    }

    return {
      pending,
      failed,
      total: this.retryQueue.size
    };
  }
}

// Global instance of enhanced transaction manager
const transactionManager = new EnhancedTransactionManager();

/**
 * Custom hook for blockchain transaction operations
 */
export function useTransactions() {
  const { signAndSubmitTransaction, account, connected } = useWallet();

  /**
   * Execute any transaction and return result with enhanced error handling
   */
  const executeTransaction = async (
    transactionData: any,
    options?: {
      checkSuccess?: boolean;
      maxGasAmount?: number;
      gasUnitPrice?: number;
      retryOnFailure?: boolean;
      maxRetries?: number;
      retryDelayMs?: number;
      enableRetryQueue?: boolean;
    }
  ): Promise<TransactionResult> => {
    if (!connected || !account) {
      const error: UserFriendlyError = {
        category: ErrorCategory.WALLET_ERROR,
        code: 'WALLET_NOT_CONNECTED',
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to continue.',
        suggestedActions: ['Connect your wallet', 'Refresh the page', 'Check wallet extension'],
        retryable: true,
        severity: 'high'
      };

      return {
        hash: '',
        success: false,
        errorMessage: error.message,
        userFriendlyError: error.userMessage,
        retryable: error.retryable,
        timestamp: Date.now(),
      };
    }

    const maxRetries = options?.maxRetries || 1;
    const retryDelayMs = options?.retryDelayMs || 2000;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        // Estimate gas if not provided
        let gasAmount = options?.maxGasAmount;
        if (!gasAmount) {
          try {
            gasAmount = await estimateGas(transactionData);
            // Add 20% buffer for gas estimation
            gasAmount = Math.floor(gasAmount * 1.2);
          } catch (gasError) {
            console.warn('Gas estimation failed, using default:', gasError);
            gasAmount = 10000; // Default gas amount
          }
        }

        const response = await signAndSubmitTransaction({
          ...transactionData,
          maxGasAmount: gasAmount,
          gasUnitPrice: options?.gasUnitPrice || 100,
        });

        // Track transaction status with enhanced monitoring
        const statusPromise = transactionManager.trackTransactionStatus(
          response.hash,
          5, // max retries for status tracking
          1000 // retry delay for status tracking
        );

        // Wait for transaction confirmation if requested
        if (options?.checkSuccess !== false) {
          try {
            const txnResult = await aptos.waitForTransaction({
              transactionHash: response.hash,
              options: {
                timeoutSecs: 30,
                checkSuccess: true,
              }
            });

            const result: TransactionResult = {
              hash: response.hash,
              success: txnResult.success,
              gasUsed: parseInt(txnResult.gas_used || '0'),
              timestamp: Date.now(),
            };

            // If transaction failed, extract error details
            if (!txnResult.success) {
              const userFriendlyError = ErrorTranslationService.translateContractError(txnResult);
              result.errorMessage = txnResult.vm_status || 'Transaction failed';
              result.userFriendlyError = userFriendlyError.userMessage;
              result.retryable = userFriendlyError.retryable;

              // Add to retry queue if enabled and retryable
              if (options?.enableRetryQueue && userFriendlyError.retryable) {
                transactionManager.addToRetryQueue(
                  response.hash,
                  transactionData,
                  maxRetries,
                  retryDelayMs
                );
              }
            }

            return result;
          } catch (waitError: any) {
            // Transaction was submitted but confirmation failed
            console.error('Transaction confirmation failed:', waitError);

            // Still track the transaction status
            statusPromise.catch(console.error);

            const userFriendlyError = ErrorTranslationService.translateContractError(waitError);

            return {
              hash: response.hash,
              success: false,
              errorMessage: waitError.message || 'Transaction confirmation failed',
              userFriendlyError: userFriendlyError.userMessage,
              retryable: userFriendlyError.retryable,
              timestamp: Date.now(),
            };
          }
        }

        // If not waiting for confirmation, assume success
        return {
          hash: response.hash,
          success: true,
          timestamp: Date.now(),
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Transaction failed (attempt ${retryCount + 1}/${maxRetries}):`, error);

        // Translate error to user-friendly format
        const userFriendlyError = ErrorTranslationService.translateContractError(error);

        // Check if we should retry
        if (options?.retryOnFailure && userFriendlyError.retryable && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(`Retrying transaction (attempt ${retryCount + 1}/${maxRetries})`);

          // Exponential backoff with jitter
          const delay = retryDelayMs * Math.pow(2, retryCount - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final failure
        const result: TransactionResult = {
          hash: '',
          success: false,
          errorMessage: error.message || 'Transaction failed',
          userFriendlyError: userFriendlyError.userMessage,
          retryable: userFriendlyError.retryable,
          timestamp: Date.now(),
        };

        // Add to retry queue if enabled and retryable
        if (options?.enableRetryQueue && userFriendlyError.retryable) {
          // Generate a temporary hash for retry queue tracking
          const tempHash = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          transactionManager.addToRetryQueue(
            tempHash,
            transactionData,
            maxRetries,
            retryDelayMs
          );
        }

        return result;
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      hash: '',
      success: false,
      errorMessage: `Max retries exceeded. Last error: ${lastError?.message}`,
      retryable: false,
      timestamp: Date.now(),
    };
  };

  /**
   * Transfer APT to another address
   */
  const transferAPTTokens = async (
    args: TransferAPTArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = transferAPT(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Create DID profile
   */
  const createDIDProfile = async (
    args: CreateProfileArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = createProfile(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Update DID profile
   */
  const updateDIDProfile = async (
    args: UpdateProfileArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = updateProfile(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Deactivate DID profile
   */
  const deactivateDIDProfile = async (
    args: DeactivateProfileArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = deactivateProfile(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Initialize reputation system for user
   */
  const initializeUserReputation = async (
    args: InitializeReputationArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = initializeReputation(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Update transaction reputation score
   */
  const updateUserTransactionScore = async (
    args: UpdateTransactionScoreArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = updateTransactionScore(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Update lending reputation score
   */
  const updateUserLendingScore = async (
    args: UpdateLendingScoreArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = updateLendingScore(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Perform AMM swap
   */
  const performSwap = async (
    args: SwapArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = swap(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Add liquidity to AMM pool
   */
  const addLiquidityToPool = async (
    args: AddLiquidityArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = addLiquidity(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Remove liquidity from AMM pool
   */
  const removeLiquidityFromPool = async (
    args: RemoveLiquidityArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = removeLiquidity(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Create KYC profile
   */
  const createKYCProfileTransaction = async (
    args: CreateKYCProfileArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = createKYCProfile(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Submit KYC document
   */
  const submitKYCDocumentTransaction = async (
    args: SubmitKYCDocumentArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = submitKYCDocument(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Verify KYC profile (for KYC providers)
   */
  const verifyKYCProfileTransaction = async (
    args: VerifyKYCProfileArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = verifyKYCProfile(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Register KYC provider (admin only)
   */
  const registerKYCProviderTransaction = async (
    args: RegisterKYCProviderArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = registerKYCProvider(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Initialize KYC registry (admin only)
   */
  const initializeKYCRegistryTransaction = async (
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = initializeKYCRegistry();
    return executeTransaction(transactionData, options);
  };

  // Yield Vault Transactions

  /**
   * Create a new yield vault
   */
  const createYieldVault = async (
    args: CreateVaultArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = createVault(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Deposit to yield vault
   */
  const depositToYieldVault = async (
    args: DepositToVaultArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = depositToVault(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Withdraw from yield vault
   */
  const withdrawFromYieldVault = async (
    args: WithdrawFromVaultArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = withdrawFromVault(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Harvest yield vault rewards
   */
  const harvestYieldVaultRewards = async (
    args: HarvestVaultRewardsArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = harvestVaultRewards(args);
    return executeTransaction(transactionData, options);
  };

  // Cross-Chain Bridge Transactions

  /**
   * Initiate cross-chain transfer
   */
  const executeCrossChainTransfer = async (
    args: CrossChainTransferArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = initiateCrossChainTransfer(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Send cross-chain message
   */
  const executeCrossChainMessage = async (
    args: CrossChainMessageArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = sendCrossChainMessage(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Initiate cross-chain swap
   */
  const executeCrossChainSwap = async (
    args: CrossChainSwapArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = initiateCrossChainSwap(args);
    return executeTransaction(transactionData, options);
  };

  // Risk Management Transactions

  /**
   * Update position risk
   */
  const updateUserPositionRisk = async (
    args: UpdatePositionRiskArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = updatePositionRisk(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Check liquidation eligibility
   */
  const checkUserLiquidationEligibility = async (
    args: CheckLiquidationEligibilityArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = checkLiquidationEligibility(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Update risk parameters (admin only)
   */
  const updateTokenRiskParameters = async (
    args: UpdateRiskParametersArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = updateRiskParameters(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Set user risk limits
   */
  const setUserRiskLimits = async (
    args: SetRiskLimitsArguments,
    options?: { maxGasAmount?: number }
  ): Promise<TransactionResult> => {
    const transactionData = setRiskLimits(args);
    return executeTransaction(transactionData, options);
  };

  /**
   * Get enhanced transaction status with caching
   */
  const getTransactionStatus = async (txHash: string): Promise<TransactionStatus | null> => {
    // Check cache first
    const cachedStatus = transactionManager.getCachedTransactionStatus(txHash);
    if (cachedStatus) {
      return cachedStatus;
    }

    // Fetch from blockchain with retry mechanism
    try {
      return await transactionManager.trackTransactionStatus(txHash);
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return null;
    }
  };

  /**
   * Subscribe to contract events
   */
  const subscribeToEvents = (
    contractAddress: string,
    eventTypes: string[],
    callback: (event: ContractEvent) => void
  ): EventSubscription => {
    return transactionManager.subscribeToContractEvents(contractAddress, eventTypes, callback);
  };

  /**
   * Wait for transaction with timeout
   */
  const waitForTransactionWithTimeout = async (
    txHash: string,
    timeoutMs: number = 30000
  ): Promise<TransactionStatus> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transaction timeout'));
      }, timeoutMs);

      const checkStatus = async () => {
        try {
          const status = await getTransactionStatus(txHash);
          if (status && status.status !== 'pending') {
            clearTimeout(timeout);
            resolve(status);
          } else {
            // Check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      checkStatus();
    });
  };

  /**
   * Estimate gas for transaction
   */
  const estimateGas = async (transactionData: any): Promise<number> => {
    if (!connected || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Build the transaction to estimate gas
      const transaction = await aptos.transaction.build.simple({
        sender: account.address,
        data: transactionData.data || transactionData,
      });

      // Simulate the transaction to get gas estimate
      const simulationResult = await aptos.transaction.simulate.simple({
        signerPublicKey: account.publicKey,
        transaction,
      });

      return parseInt(simulationResult[0].gas_used);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return 1000; // Default gas estimate
    }
  };

  /**
   * Check if transaction is pending
   */
  const isTransactionPending = async (txHash: string): Promise<boolean> => {
    try {
      const txn = await aptos.getTransactionByHash({ transactionHash: txHash });
      return txn.type === 'pending_transaction';
    } catch (error) {
      return false;
    }
  };

  /**
   * Get account transactions
   */
  const getAccountTransactions = async (address?: string, limit = 25) => {
    const accountAddress = address || account?.address.toString();
    if (!accountAddress) return [];

    try {
      const transactions = await aptos.getAccountTransactions({
        accountAddress,
        options: { limit },
      });
      return transactions;
    } catch (error) {
      console.error('Failed to get account transactions:', error);
      return [];
    }
  };

  return {
    // Core functionality
    executeTransaction,
    estimateGas,
    getTransactionStatus,
    isTransactionPending,
    getAccountTransactions,
    subscribeToEvents,
    waitForTransactionWithTimeout,

    // Specific transaction types
    transferAPTTokens,
    createDIDProfile,
    updateDIDProfile,
    deactivateDIDProfile,
    initializeUserReputation,
    updateUserTransactionScore,
    updateUserLendingScore,
    performSwap,
    addLiquidityToPool,
    removeLiquidityFromPool,
    createKYCProfileTransaction,
    submitKYCDocumentTransaction,
    verifyKYCProfileTransaction,
    registerKYCProviderTransaction,
    initializeKYCRegistryTransaction,

    // Yield Vault transactions
    createYieldVault,
    depositToYieldVault,
    withdrawFromYieldVault,
    harvestYieldVaultRewards,

    // Cross-chain transactions
    executeCrossChainTransfer,
    executeCrossChainMessage,
    executeCrossChainSwap,

    // Risk management transactions
    updateUserPositionRisk,
    checkUserLiquidationEligibility,
    updateTokenRiskParameters,
    setUserRiskLimits,

    // State
    connected,
    account,
  };
}

/**
 * Transaction status helpers
 */
export const TransactionStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, short = true): string {
  if (!hash) return '';
  return short ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}

/**
 * Get transaction explorer URL
 */
export function getExplorerUrl(txHash: string, network = 'testnet'): string {
  const baseUrl = network === 'mainnet'
    ? 'https://explorer.aptoslabs.com'
    : 'https://explorer.aptoslabs.com';
  return `${baseUrl}/txn/${txHash}?network=${network}`;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const userFriendlyError = ErrorTranslationService.translateContractError(error);
  return userFriendlyError.userMessage;
}

/**
 * Get suggested actions for an error
 */
export function getErrorSuggestedActions(error: any): string[] {
  const userFriendlyError = ErrorTranslationService.translateContractError(error);
  return userFriendlyError.suggestedActions;
}

/**
 * Check if error is retryable
 */
export function isErrorRetryable(error: any): boolean {
  const userFriendlyError = ErrorTranslationService.translateContractError(error);
  return userFriendlyError.retryable;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  const userFriendlyError = ErrorTranslationService.translateContractError(error);
  return userFriendlyError.severity;
}

/**
 * Format transaction result for display
 */
export function formatTransactionResult(result: TransactionResult): string {
  if (result.success) {
    return `Transaction successful: ${formatTxHash(result.hash)}`;
  } else {
    return result.userFriendlyError || result.errorMessage || 'Transaction failed';
  }
}

/**
 * Get transaction status color for UI
 */
export function getTransactionStatusColor(status: string): string {
  const colors = {
    pending: '#f59e0b', // yellow
    success: '#10b981', // green
    failed: '#ef4444', // red
  };
  return colors[status as keyof typeof colors] || '#6b7280'; // gray
}

/**
 * Calculate transaction fee in APT
 */
export function calculateTransactionFee(gasUsed: number, gasPrice: number = 100): number {
  return (gasUsed * gasPrice) / 100000000; // Convert to APT (8 decimals)
}

/**
 * Estimate transaction completion time
 */
export function estimateTransactionTime(gasAmount: number): number {
  // Rough estimation: higher gas = longer time
  const baseTime = 5; // 5 seconds base
  const additionalTime = Math.floor(gasAmount / 1000); // 1 second per 1000 gas
  return Math.min(baseTime + additionalTime, 30); // Max 30 seconds
}

/**
 * Batch multiple transactions
 */
export async function batchTransactions(
  transactions: Array<{ data: any; options?: any }>,
  executeTransaction: (data: any, options?: any) => Promise<TransactionResult>
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];

  for (const tx of transactions) {
    try {
      const result = await executeTransaction(tx.data, tx.options);
      results.push(result);

      // If transaction fails and is not retryable, stop batch
      if (!result.success && !result.retryable) {
        break;
      }
    } catch (error) {
      results.push({
        hash: '',
        success: false,
        errorMessage: 'Batch transaction failed',
        timestamp: Date.now(),
      });
      break;
    }
  }

  return results;
}

// Export the enhanced transaction manager for direct access if needed
export { transactionManager as EnhancedTransactionManager };/**

 * Start retry queue processor (should be called once in app initialization)
 */
export function startRetryQueueProcessor(intervalMs: number = 10000) {
  const processRetries = async () => {
    try {
      await transactionManager.processRetryQueue();
    } catch (error) {
      console.error('Retry queue processing error:', error);
    }
  };

  // Process retry queue every 10 seconds by default
  setInterval(processRetries, intervalMs);

  // Initial processing
  processRetries();
}

/**
 * Get retry queue statistics
 */
export function getRetryQueueStats() {
  return transactionManager.getRetryQueueStatus();
}

/**
 * Clear old transaction statuses (cleanup utility)
 */
export function cleanupOldTransactionStatuses(maxAgeMs: number = 24 * 60 * 60 * 1000) {
  transactionManager.clearOldStatuses(maxAgeMs);
}

/**
 * Subscribe to all contract events for a given address
 */
export function subscribeToAllContractEvents(
  contractAddress: string,
  callback: (event: ContractEvent) => void
): EventSubscription {
  return transactionManager.subscribeToContractEvents(contractAddress, ['*'], callback);
}

/**
 * Get comprehensive error information
 */
export function getErrorDetails(error: any): {
  userFriendlyError: UserFriendlyError;
  canRetry: boolean;
  suggestedWaitTime: number;
} {
  const userFriendlyError = ErrorTranslationService.translateContractError(error);

  // Calculate suggested wait time based on error type
  let suggestedWaitTime = 0;
  if (userFriendlyError.retryable) {
    switch (userFriendlyError.severity) {
      case 'low':
        suggestedWaitTime = 5000; // 5 seconds
        break;
      case 'medium':
        suggestedWaitTime = 15000; // 15 seconds
        break;
      case 'high':
        suggestedWaitTime = 30000; // 30 seconds
        break;
      case 'critical':
        suggestedWaitTime = 60000; // 1 minute
        break;
    }
  }

  return {
    userFriendlyError,
    canRetry: userFriendlyError.retryable,
    suggestedWaitTime,
  };
}

/**
 * Monitor transaction until completion with timeout
 */
export async function monitorTransactionUntilCompletion(
  txHash: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<TransactionStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await transactionManager.trackTransactionStatus(txHash, 1, 500);

      if (status.status !== 'pending') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.error('Error monitoring transaction:', error);

      // Continue monitoring unless we've exceeded timeout
      if (Date.now() - startTime >= timeoutMs) {
        throw new Error(`Transaction monitoring timeout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error('Transaction monitoring timeout');
}

/**
 * Enhanced batch transaction execution with comprehensive error handling
 */
export async function executeBatchTransactionsEnhanced(
  transactions: Array<{ data: any; options?: any }>,
  executeTransaction: (data: any, options?: any) => Promise<TransactionResult>,
  options?: {
    stopOnFirstFailure?: boolean;
    maxConcurrent?: number;
    retryFailedTransactions?: boolean;
    progressCallback?: (completed: number, total: number, currentResult: TransactionResult) => void;
  }
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];
  const maxConcurrent = options?.maxConcurrent || 3;
  const stopOnFirstFailure = options?.stopOnFirstFailure ?? true;

  // Process transactions in batches
  for (let i = 0; i < transactions.length; i += maxConcurrent) {
    const batch = transactions.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (txn, batchIndex) => {
      const globalIndex = i + batchIndex;

      try {
        const result = await executeTransaction(txn.data, {
          retryOnFailure: true,
          maxRetries: 3,
          enableRetryQueue: options?.retryFailedTransactions,
          ...txn.options,
        });

        // Call progress callback if provided
        if (options?.progressCallback) {
          options.progressCallback(globalIndex + 1, transactions.length, result);
        }

        return { index: globalIndex, result };
      } catch (error) {
        const userFriendlyError = ErrorTranslationService.translateContractError(error);
        const result: TransactionResult = {
          hash: '',
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Transaction failed',
          userFriendlyError: userFriendlyError.userMessage,
          retryable: userFriendlyError.retryable,
          timestamp: Date.now(),
        };

        // Call progress callback if provided
        if (options?.progressCallback) {
          options.progressCallback(globalIndex + 1, transactions.length, result);
        }

        return { index: globalIndex, result };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Add results in correct order
    for (const { index, result } of batchResults) {
      results[index] = result;

      // Stop on first failure if requested
      if (stopOnFirstFailure && !result.success) {
        // Fill remaining results with cancelled status
        for (let j = index + 1; j < transactions.length; j++) {
          const cancelledResult: TransactionResult = {
            hash: '',
            success: false,
            errorMessage: 'Transaction cancelled due to previous failure',
            userFriendlyError: 'This transaction was cancelled because a previous transaction failed.',
            retryable: false,
            timestamp: Date.now(),
          };

          results[j] = cancelledResult;

          // Call progress callback for cancelled transactions
          if (options?.progressCallback) {
            options.progressCallback(j + 1, transactions.length, cancelledResult);
          }
        }
        return results;
      }
    }
  }

  return results;
}

/**
 * Create a transaction retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'E_INSUFFICIENT_BALANCE',
    'E_PRICE_STALE',
    'E_SLIPPAGE_EXCEEDED',
    'SEQUENCE_NUMBER_TOO_OLD',
    'SEQUENCE_NUMBER_TOO_NEW',
  ],
};

/**
 * Execute transaction with custom retry policy
 */
export async function executeTransactionWithRetryPolicy(
  transactionData: any,
  executeTransaction: (data: any, options?: any) => Promise<TransactionResult>,
  retryPolicy: Partial<RetryPolicy> = {}
): Promise<TransactionResult> {
  const policy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
  let lastResult: TransactionResult | null = null;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      const result = await executeTransaction(transactionData, {
        retryOnFailure: false, // We handle retries here
        maxRetries: 1,
      });

      if (result.success) {
        return result;
      }

      lastResult = result;

      // Check if error is retryable according to policy
      const errorCode = result.errorMessage || '';
      const isRetryableError = policy.retryableErrors.some(retryableError =>
        errorCode.includes(retryableError)
      );

      if (!isRetryableError || attempt >= policy.maxRetries) {
        return result;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt),
        policy.maxDelayMs
      );

      console.log(`Transaction failed, retrying in ${delay}ms (attempt ${attempt + 1}/${policy.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      const userFriendlyError = ErrorTranslationService.translateContractError(error);
      lastResult = {
        hash: '',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Transaction failed',
        userFriendlyError: userFriendlyError.userMessage,
        retryable: userFriendlyError.retryable,
        timestamp: Date.now(),
      };

      if (attempt >= policy.maxRetries) {
        return lastResult;
      }
    }
  }

  return lastResult || {
    hash: '',
    success: false,
    errorMessage: 'Transaction failed after all retries',
    retryable: false,
    timestamp: Date.now(),
  };
}