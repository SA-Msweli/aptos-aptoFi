/**
 * Nodit API Types
 * 
 * Type definitions for Nodit Web3 Data API and Indexer API responses
 * Based on Nodit API documentation: https://developer.nodit.io/reference/aptos-quickstart
 */

/**
 * Common response wrapper for Nodit APIs
 */
export interface NoditResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * Account information from Web3 Data API
 */
export interface AccountInfo {
  sequence_number: string;
  authentication_key: string;
}

/**
 * Account balance information
 */
export interface AccountBalance {
  coin_type: string;
  amount: string;
  decimals: number;
}

/**
 * Account resources response
 */
export interface AccountResource {
  type: string;
  data: any;
}

/**
 * Transaction information
 */
export interface TransactionInfo {
  version: string;
  hash: string;
  state_change_hash: string;
  event_root_hash: string;
  state_checkpoint_hash?: string;
  gas_used: string;
  success: boolean;
  vm_status: string;
  accumulator_root_hash: string;
  changes: StateChange[];
  events: Event[];
  timestamp: string;
  type: string;
  sender?: string; // Optional sender field for user transactions
}

/**
 * State change information
 */
export interface StateChange {
  address: string;
  state_key_hash: string;
  data: {
    type: string;
    data: any;
  };
  type: string;
}

/**
 * Event information
 */
export interface Event {
  guid: {
    creation_number: string;
    account_address: string;
  };
  sequence_number: string;
  type: string;
  data: any;
}

/**
 * Block information
 */
export interface BlockInfo {
  block_height: string;
  block_hash: string;
  block_timestamp: string;
  first_version: string;
  last_version: string;
  transactions?: TransactionInfo[];
}

/**
 * Address analysis data
 */
export interface AddressReputation {
  address: string;
  transaction_count: number;
  total_volume: string;
  first_transaction_timestamp: string;
  last_transaction_timestamp: string;
  unique_counterparties: number;
  risk_score: number;
  is_contract: boolean;
  contract_type?: string;
}

/**
 * Transaction monitoring data
 */
export interface TransactionMonitorData {
  hash: string;
  sender: string;
  sequence_number: string;
  max_gas_amount: string;
  gas_unit_price: string;
  gas_used?: string;
  success?: boolean;
  timestamp: string;
  type: string;
  payload?: any;
  events?: Event[];
}

/**
 * Real-time transaction update
 */
export interface TransactionUpdate {
  transaction_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_height?: string;
  timestamp: string;
  gas_used?: string;
  success?: boolean;
  error_message?: string;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event_type: 'transaction' | 'block' | 'account_update';
  timestamp: string;
  data: TransactionInfo | BlockInfo | AccountInfo;
  network: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  coin_type: string;
  name: string;
  symbol: string;
  decimals: number;
  supply?: string;
  creator_address?: string;
}

/**
 * NFT information
 */
export interface NFTInfo {
  token_data_id: string;
  name: string;
  description: string;
  uri: string;
  collection: string;
  creator: string;
  owner?: string;
  property_version: string;
  amount: string;
}

/**
 * Indexer query parameters
 */
export interface IndexerQueryParams {
  limit?: number;
  offset?: number;
  order_by?: string;
  where?: Record<string, any>;
}

/**
 * Indexer response with pagination
 */
export interface IndexerResponse<T> {
  data: T[];
  total_count: number;
  has_next_page: boolean;
  next_cursor?: string;
}

/**
 * Account transaction history
 */
export interface AccountTransactionHistory {
  account_address: string;
  transactions: TransactionInfo[];
  total_count: number;
  has_more: boolean;
}

/**
 * Real-time subscription data
 */
export interface SubscriptionData {
  subscription_id: string;
  event_type: string;
  data: any;
  timestamp: string;
}

/**
 * Error response from Nodit APIs
 */
export interface NoditError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

/**
 * API rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_time: number;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  response_time_ms: number;
  error_rate: number;
}