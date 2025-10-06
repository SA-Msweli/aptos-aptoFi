/**
 * Services Index
 * 
 * Central export point for all service modules
 */

export { HyperionService, hyperionService } from './hyperionService';
export type {
  LiquidityPool,
  SwapParams,
  LiquidityPosition,
  AddLiquidityParams,
} from './hyperionService';

export { NoditService, noditService } from './noditService';
export { PaymentService, paymentService } from './paymentService';
export { VaultService, vaultService } from './vaultService';
export { LendingService, lendingService } from './lendingService';
export type {
  VaultInfo,
  VaultPosition,
  VaultPerformance,
  CreateVaultParams,
  DepositParams,
  WithdrawParams,
  VaultStats,
} from './vaultService';
export type {
  LoanDetails,
  PaymentSchedule,
  NextPayment,
  LoanRequest,
} from './lendingService';
// Reputation functionality removed

// Re-export Hyperion utilities
export {
  initializeHyperionClient,
  getHyperionClient,
  ensureHyperionClient,
  getHyperionConfig,
  validateHyperionConfig,
  resetHyperionClient,
} from '../utils/hyperionClient';

// Re-export Nodit utilities
export {
  initializeNoditClients,
  getWeb3DataClient,
  getIndexerClient,
  ensureNoditClients,
  getNoditConfig,
  validateNoditConfig,
  resetNoditClients,
  getNoditClientsStatus,
} from '../utils/noditClient';

// Re-export Hyperion types
export type * from '../utils/hyperionTypes';

// Re-export Nodit types (excluding conflicting TokenInfo)
export type {
  AccountInfo,
  AccountBalance,
  AccountResource,
  TransactionInfo,
  BlockInfo,
  AddressReputation,
  TransactionMonitorData,
  TransactionUpdate,
  WebhookPayload,
  NFTInfo,
  IndexerQueryParams,
  IndexerResponse,
  AccountTransactionHistory,
  NoditResponse,
  NoditError,
  StateChange,
  Event,
  // ReputationMetrics, // Not exported from noditTypes
  // NoditConfig, // Not exported from noditTypes
} from '../utils/noditTypes';