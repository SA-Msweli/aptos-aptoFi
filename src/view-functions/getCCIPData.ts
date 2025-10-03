import { aptos } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { SUPPORTED_CHAINS, type SupportedChainName } from "@/entry-functions/ccipBridge";

// TypeScript interfaces matching smart contract data structures
export interface SupportedChain {
  name: string;
  selector: number;
  isActive: boolean;
  minGasLimit: number;
  maxGasLimit: number;
  baseFee: number; // in native token units
}

export interface CrossChainTransfer {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
  destinationChain: number;
  fee: number;
  status: TransferStatus;
  createdAt: number; // Unix timestamp
  executedAt: number; // Unix timestamp
  ccipMessageId: number[];
}

export interface TransferStatus {
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  errorMessage?: string;
}

export interface CCIPStats {
  totalTransfers: number;
  totalMessages: number;
  totalSent: number;
  totalReceived: number;
  totalVolume: number;
  successRate: number;
}

export interface CrossChainMessage {
  id: number;
  sender: string;
  recipient: string;
  message: string;
  destinationChain: number;
  fee: number;
  status: TransferStatus;
  createdAt: number;
  ccipMessageId: number[];
}

export interface FeeEstimate {
  baseFee: number;
  gasPrice: number;
  totalFee: number;
  estimatedTime: number; // in seconds
}

/**
 * Get all supported chains for cross-chain operations
 * @returns Array of supported chain information
 */
export async function getSupportedChains(): Promise<SupportedChain[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_supported_chains`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    const chains = response[0] as any[];
    return chains.map((chain: any) => ({
      name: getChainNameBySelector(parseInt(chain.selector)) || `Chain-${chain.selector}`,
      selector: parseInt(chain.selector),
      isActive: chain.is_active,
      minGasLimit: parseInt(chain.min_gas_limit),
      maxGasLimit: parseInt(chain.max_gas_limit),
      baseFee: parseFloat(chain.base_fee),
    }));
  } catch (error) {
    console.error("Error fetching supported chains:", error);
    // Return default supported chains if contract call fails
    return Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => ({
      name,
      selector,
      isActive: true,
      minGasLimit: 100000,
      maxGasLimit: 2000000,
      baseFee: 0.01,
    }));
  }
}

/**
 * Get transfer status by transfer ID
 * @param transferId The transfer ID
 * @returns Transfer status information
 */
export async function getTransferStatus(transferId: number): Promise<TransferStatus | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_transfer_status`,
        typeArguments: [],
        functionArguments: [transferId.toString()],
      },
    });

    const status = response[0] as any;
    return {
      status: mapStatusCode(parseInt(status.status)),
      timestamp: parseInt(status.timestamp),
      blockNumber: status.block_number ? parseInt(status.block_number) : undefined,
      transactionHash: status.transaction_hash || undefined,
      errorMessage: status.error_message || undefined,
    };
  } catch (error) {
    console.error(`Error fetching transfer status for ID ${transferId}:`, error);
    return null;
  }
}

/**
 * Get detailed transfer information
 * @param transferId The transfer ID
 * @returns Complete transfer information
 */
export async function getTransferDetails(transferId: number): Promise<CrossChainTransfer | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_transfer_details`,
        typeArguments: [],
        functionArguments: [transferId.toString()],
      },
    });

    const transfer = response[0] as any;
    const status = await getTransferStatus(transferId);

    return {
      id: parseInt(transfer.id),
      sender: transfer.sender,
      recipient: transfer.recipient,
      token: transfer.token,
      amount: parseInt(transfer.amount),
      destinationChain: parseInt(transfer.destination_chain),
      fee: parseInt(transfer.fee),
      status: status || { status: 'pending', timestamp: Date.now() },
      createdAt: parseInt(transfer.created_at),
      executedAt: parseInt(transfer.executed_at),
      ccipMessageId: transfer.ccip_message_id || [],
    };
  } catch (error) {
    console.error(`Error fetching transfer details for ID ${transferId}:`, error);
    return null;
  }
}

/**
 * Get user's cross-chain activity statistics
 * @param userAddress User's wallet address
 * @returns User's CCIP statistics
 */
export async function getUserCCIPStats(userAddress: string): Promise<CCIPStats> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_user_ccip_stats`,
        typeArguments: [],
        functionArguments: [userAddress],
      },
    });

    const stats = response[0] as any;
    return {
      totalTransfers: parseInt(stats.total_transfers),
      totalMessages: parseInt(stats.total_messages),
      totalSent: parseInt(stats.total_sent),
      totalReceived: parseInt(stats.total_received),
      totalVolume: parseInt(stats.total_volume),
      successRate: parseFloat(stats.success_rate),
    };
  } catch (error) {
    console.error("Error fetching user CCIP stats:", error);
    return {
      totalTransfers: 0,
      totalMessages: 0,
      totalSent: 0,
      totalReceived: 0,
      totalVolume: 0,
      successRate: 0,
    };
  }
}

/**
 * Get user's transfer history
 * @param userAddress User's wallet address
 * @param limit Maximum number of transfers to return
 * @param offset Offset for pagination
 * @returns Array of user's transfers
 */
export async function getUserTransferHistory(
  userAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<CrossChainTransfer[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_user_transfer_history`,
        typeArguments: [],
        functionArguments: [userAddress, limit.toString(), offset.toString()],
      },
    });

    const transfers = response[0] as any[];
    const result = [];

    for (const transfer of transfers) {
      const status = await getTransferStatus(parseInt(transfer.id));
      result.push({
        id: parseInt(transfer.id),
        sender: transfer.sender,
        recipient: transfer.recipient,
        token: transfer.token,
        amount: parseInt(transfer.amount),
        destinationChain: parseInt(transfer.destination_chain),
        fee: parseInt(transfer.fee),
        status: status || { status: 'pending' as const, timestamp: Date.now() },
        createdAt: parseInt(transfer.created_at),
        executedAt: parseInt(transfer.executed_at),
        ccipMessageId: transfer.ccip_message_id || [],
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching user transfer history:", error);
    return [];
  }
}

/**
 * Estimate cross-chain transfer fee
 * @param destinationChain Destination chain selector
 * @param gasLimit Gas limit for the operation
 * @param amount Transfer amount (for percentage-based fees)
 * @returns Fee estimate
 */
export async function estimateCrossChainFee(
  destinationChain: number,
  gasLimit: number,
  amount: number = 0
): Promise<FeeEstimate> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::estimate_cross_chain_fee`,
        typeArguments: [],
        functionArguments: [destinationChain.toString(), gasLimit.toString(), amount.toString()],
      },
    });

    const estimate = response[0] as any;
    return {
      baseFee: parseFloat(estimate.base_fee),
      gasPrice: parseFloat(estimate.gas_price),
      totalFee: parseFloat(estimate.total_fee),
      estimatedTime: parseInt(estimate.estimated_time),
    };
  } catch (error) {
    console.error("Error estimating cross-chain fee:", error);
    // Return fallback estimate
    return {
      baseFee: 0.01,
      gasPrice: 0.001,
      totalFee: 0.01 + (gasLimit * 0.001) + (amount * 0.001),
      estimatedTime: 600, // 10 minutes
    };
  }
}

/**
 * Get pending transfers for a user
 * @param userAddress User's wallet address
 * @returns Array of pending transfers
 */
export async function getPendingTransfers(userAddress: string): Promise<CrossChainTransfer[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_pending_transfers`,
        typeArguments: [],
        functionArguments: [userAddress],
      },
    });

    const transfers = response[0] as any[];
    const result = [];

    for (const transfer of transfers) {
      const status = await getTransferStatus(parseInt(transfer.id));
      if (status?.status === 'pending' || status?.status === 'sent') {
        result.push({
          id: parseInt(transfer.id),
          sender: transfer.sender,
          recipient: transfer.recipient,
          token: transfer.token,
          amount: parseInt(transfer.amount),
          destinationChain: parseInt(transfer.destination_chain),
          fee: parseInt(transfer.fee),
          status,
          createdAt: parseInt(transfer.created_at),
          executedAt: parseInt(transfer.executed_at),
          ccipMessageId: transfer.ccip_message_id || [],
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching pending transfers:", error);
    return [];
  }
}

/**
 * Get cross-chain messages for a user
 * @param userAddress User's wallet address
 * @param limit Maximum number of messages to return
 * @returns Array of cross-chain messages
 */
export async function getUserMessages(userAddress: string, limit: number = 50): Promise<CrossChainMessage[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_user_messages`,
        typeArguments: [],
        functionArguments: [userAddress, limit.toString()],
      },
    });

    const messages = response[0] as any[];
    const result = [];

    for (const message of messages) {
      const status = await getTransferStatus(parseInt(message.id));
      result.push({
        id: parseInt(message.id),
        sender: message.sender,
        recipient: message.recipient,
        message: message.message,
        destinationChain: parseInt(message.destination_chain),
        fee: parseInt(message.fee),
        status: status || { status: 'pending' as const, timestamp: Date.now() },
        createdAt: parseInt(message.created_at),
        ccipMessageId: message.ccip_message_id || [],
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching user messages:", error);
    return [];
  }
}

/**
 * Get global CCIP bridge statistics
 * @returns Global bridge statistics
 */
export async function getGlobalCCIPStats(): Promise<CCIPStats> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_global_stats`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    const stats = response[0] as any;
    return {
      totalTransfers: parseInt(stats.total_transfers),
      totalMessages: parseInt(stats.total_messages),
      totalSent: parseInt(stats.total_sent),
      totalReceived: parseInt(stats.total_received),
      totalVolume: parseInt(stats.total_volume),
      successRate: parseFloat(stats.success_rate),
    };
  } catch (error) {
    console.error("Error fetching global CCIP stats:", error);
    return {
      totalTransfers: 0,
      totalMessages: 0,
      totalSent: 0,
      totalReceived: 0,
      totalVolume: 0,
      successRate: 0,
    };
  }
}

/**
 * Check if a chain is supported and active
 * @param chainSelector Chain selector to check
 * @returns Whether the chain is supported and active
 */
export async function isChainSupported(chainSelector: number): Promise<boolean> {
  try {
    const supportedChains = await getSupportedChains();
    const chain = supportedChains.find(c => c.selector === chainSelector);
    return chain ? chain.isActive : false;
  } catch (error) {
    console.error(`Error checking if chain ${chainSelector} is supported:`, error);
    return Object.values(SUPPORTED_CHAINS).includes(chainSelector as any);
  }
}

/**
 * Get recommended gas limit for a destination chain
 * @param chainSelector Destination chain selector
 * @param operation Operation type
 * @returns Recommended gas limit
 */
export async function getRecommendedGasLimit(
  chainSelector: number,
  operation: 'transfer' | 'message' | 'swap'
): Promise<number> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CCIP_BRIDGE}::get_recommended_gas_limit`,
        typeArguments: [],
        functionArguments: [chainSelector.toString(), operation],
      },
    });

    return parseInt(response[0] as string);
  } catch (error) {
    console.error(`Error getting recommended gas limit for ${operation} on chain ${chainSelector}:`, error);

    // Fallback gas limits
    const fallbackLimits = {
      transfer: 200000,
      message: 150000,
      swap: 300000,
    };

    return fallbackLimits[operation];
  }
}

// Utility functions

/**
 * Map status code to status string
 * @param statusCode Numeric status code from contract
 * @returns Status string
 */
function mapStatusCode(statusCode: number): 'pending' | 'sent' | 'confirmed' | 'failed' {
  const statusMap = {
    0: 'pending' as const,
    1: 'sent' as const,
    2: 'confirmed' as const,
    3: 'failed' as const,
  };
  return statusMap[statusCode as keyof typeof statusMap] || 'pending';
}

/**
 * Get chain name by selector
 * @param selector Chain selector
 * @returns Chain name or undefined
 */
function getChainNameBySelector(selector: number): string | undefined {
  const entry = Object.entries(SUPPORTED_CHAINS).find(([, value]) => value === selector);
  return entry ? entry[0] : undefined;
}

/**
 * Format transfer amount for display
 * @param amount Amount in smallest unit
 * @param decimals Token decimals
 * @returns Formatted amount string
 */
export function formatTransferAmount(amount: number, decimals: number = 8): string {
  const divisor = Math.pow(10, decimals);
  const formatted = (amount / divisor).toFixed(decimals);
  return parseFloat(formatted).toString();
}

/**
 * Get transfer status color for UI
 * @param status Transfer status
 * @returns Color class or hex code
 */
export function getStatusColor(status: string): string {
  const colors = {
    pending: '#f59e0b', // yellow
    sent: '#3b82f6', // blue
    confirmed: '#10b981', // green
    failed: '#ef4444', // red
  };
  return colors[status as keyof typeof colors] || '#6b7280'; // gray
}

/**
 * Calculate estimated completion time
 * @param status Current status
 * @param createdAt Creation timestamp
 * @returns Estimated completion time in seconds
 */
export function getEstimatedCompletionTime(status: string, createdAt: number): number {
  const now = Date.now() / 1000;
  const elapsed = now - createdAt;

  const estimatedTimes = {
    pending: 300, // 5 minutes
    sent: 600, // 10 minutes
    confirmed: 0, // already complete
    failed: 0, // already complete
  };

  const totalTime = estimatedTimes[status as keyof typeof estimatedTimes] || 300;
  return Math.max(0, totalTime - elapsed);
}