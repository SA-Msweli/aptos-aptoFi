/**
 * Vault Service
 * 
 * Service for interacting with Optimus vault smart contracts
 * Handles vault creation, deposits, withdrawals, and performance tracking
 */

import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { NETWORK } from '@/constants';
import { aptosClient } from '@/utils/aptosClient';
import { noditService } from './noditService';

// ================================= Types ================================= //

export interface VaultInfo {
  id: number;
  assetMetadata: string;
  totalAssets: number;
  totalShares: number;
  manager: string;
  strategyType: number;
  targetApy: number;
  isPaused: boolean;
}

export interface VaultPosition {
  shares: number;
  initialDeposit: number;
  depositTimestamp: number;
  currentValue: number;
}

export interface VaultPerformance {
  currentApy: number;
  totalYieldGenerated: number;
  feesCollected: number;
  lastRebalance: number;
  lastCompound: number;
}

export interface CreateVaultParams {
  assetMetadata: string;
  strategyType: number; // 0=conservative, 1=balanced, 2=aggressive
  targetApy: number; // in basis points
  performanceFee: number; // in basis points
  managementFee: number; // in basis points
  capacityLimit: number;
  minimumDeposit: number;
}

export interface DepositParams {
  vaultId: number;
  amount: number;
}

export interface WithdrawParams {
  vaultId: number;
  sharesToBurn: number;
}

export interface VaultStats {
  totalVaults: number;
  totalValueLocked: number;
  averageApy: number;
  totalUsers: number;
}

// ================================= Constants ================================= //

const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x42';
const VAULT_MODULE = `${MODULE_ADDRESS}::vault`;

// Strategy type mappings
export const STRATEGY_TYPES = {
  CONSERVATIVE: 0,
  BALANCED: 1,
  AGGRESSIVE: 2,
} as const;

export const STRATEGY_NAMES = {
  [STRATEGY_TYPES.CONSERVATIVE]: 'Conservative',
  [STRATEGY_TYPES.BALANCED]: 'Balanced',
  [STRATEGY_TYPES.AGGRESSIVE]: 'Aggressive',
} as const;

// ================================= Vault Service Class ================================= //

export class VaultService {
  private aptos: Aptos;

  constructor() {
    this.aptos = aptosClient();
  }

  // ================================= Vault Management ================================= //

  /**
   * Create a new vault
   */
  async createVault(
    account: Account,
    params: CreateVaultParams
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${VAULT_MODULE}::create_vault`,
          functionArguments: [
            params.assetMetadata,
            params.strategyType,
            params.targetApy,
            params.performanceFee,
            params.managementFee,
            params.capacityLimit,
            params.minimumDeposit,
          ],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log('Vault created successfully:', executedTransaction.hash);
      return executedTransaction.hash;
    } catch (error) {
      console.error('Failed to create vault:', error);
      throw new Error(`Failed to create vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deposit assets into a vault
   */
  async deposit(
    account: Account,
    params: DepositParams
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${VAULT_MODULE}::deposit`,
          functionArguments: [
            params.vaultId,
            params.amount,
          ],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log('Deposit successful:', executedTransaction.hash);
      return executedTransaction.hash;
    } catch (error) {
      console.error('Failed to deposit:', error);
      throw new Error(`Failed to deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw assets from a vault
   */
  async withdraw(
    account: Account,
    params: WithdrawParams
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${VAULT_MODULE}::withdraw`,
          functionArguments: [
            params.vaultId,
            params.sharesToBurn,
          ],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log('Withdrawal successful:', executedTransaction.hash);
      return executedTransaction.hash;
    } catch (error) {
      console.error('Failed to withdraw:', error);
      throw new Error(`Failed to withdraw: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rebalance a vault (manager only)
   */
  async rebalanceVault(
    account: Account,
    vaultId: number
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${VAULT_MODULE}::rebalance_vault`,
          functionArguments: [vaultId],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log('Vault rebalanced successfully:', executedTransaction.hash);
      return executedTransaction.hash;
    } catch (error) {
      console.error('Failed to rebalance vault:', error);
      throw new Error(`Failed to rebalance vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compound vault yields (manager only)
   */
  async compoundVault(
    account: Account,
    vaultId: number
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${VAULT_MODULE}::compound_vault`,
          functionArguments: [vaultId],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log('Vault compounded successfully:', executedTransaction.hash);
      return executedTransaction.hash;
    } catch (error) {
      console.error('Failed to compound vault:', error);
      throw new Error(`Failed to compound vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ================================= View Functions ================================= //

  /**
   * Check if a vault exists
   */
  async vaultExists(vaultId: number): Promise<boolean> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${VAULT_MODULE}::vault_exists`,
          functionArguments: [vaultId],
        },
      });

      return result[0] as boolean;
    } catch (error) {
      console.error('Failed to check vault existence:', error);
      return false;
    }
  }

  /**
   * Get vault information
   */
  async getVaultInfo(vaultId: number): Promise<VaultInfo | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${VAULT_MODULE}::get_vault_info`,
          functionArguments: [vaultId],
        },
      });

      if (!result || result.length === 0) {
        return null;
      }

      return {
        id: Number(result[0]),
        assetMetadata: result[1] as string,
        totalAssets: Number(result[2]),
        totalShares: Number(result[3]),
        manager: result[4] as string,
        strategyType: Number(result[5]),
        targetApy: Number(result[6]),
        isPaused: result[7] as boolean,
      };
    } catch (error) {
      console.error('Failed to get vault info:', error);
      return null;
    }
  }

  /**
   * Get user position in a vault
   */
  async getUserPosition(userAddress: string, vaultId: number): Promise<VaultPosition | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${VAULT_MODULE}::get_user_position`,
          functionArguments: [userAddress, vaultId],
        },
      });

      if (!result || result.length === 0) {
        return null;
      }

      return {
        shares: Number(result[0]),
        initialDeposit: Number(result[1]),
        depositTimestamp: Number(result[2]),
        currentValue: Number(result[3]),
      };
    } catch (error) {
      console.error('Failed to get user position:', error);
      return null;
    }
  }

  /**
   * Get vault performance metrics
   */
  async getVaultPerformance(vaultId: number): Promise<VaultPerformance | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${VAULT_MODULE}::get_vault_performance`,
          functionArguments: [vaultId],
        },
      });

      if (!result || result.length === 0) {
        return null;
      }

      return {
        currentApy: Number(result[0]),
        totalYieldGenerated: Number(result[1]),
        feesCollected: Number(result[2]),
        lastRebalance: Number(result[3]),
        lastCompound: Number(result[4]),
      };
    } catch (error) {
      console.error('Failed to get vault performance:', error);
      return null;
    }
  }

  /**
   * Get total number of vaults
   */
  async getTotalVaults(): Promise<number> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${VAULT_MODULE}::get_total_vaults`,
          functionArguments: [],
        },
      });

      return Number(result[0]) || 0;
    } catch (error) {
      console.error('Failed to get total vaults:', error);
      return 0;
    }
  }

  // ================================= Utility Functions ================================= //

  /**
   * Calculate yield percentage
   */
  calculateYieldPercentage(initialDeposit: number, currentValue: number): number {
    if (initialDeposit === 0) return 0;
    return ((currentValue - initialDeposit) / initialDeposit) * 100;
  }

  /**
   * Format APY for display
   */
  formatApy(apyBasisPoints: number): string {
    const percentage = apyBasisPoints / 100;
    return `${percentage.toFixed(2)}%`;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, decimals: number = 8): string {
    const divisor = Math.pow(10, decimals);
    const formatted = (amount / divisor).toFixed(decimals);
    // Remove trailing zeros
    return parseFloat(formatted).toString();
  }

  /**
   * Get strategy name from type
   */
  getStrategyName(strategyType: number): string {
    return STRATEGY_NAMES[strategyType as keyof typeof STRATEGY_NAMES] || 'Unknown';
  }

  /**
   * Get strategy description
   */
  getStrategyDescription(strategyType: number): string {
    switch (strategyType) {
      case STRATEGY_TYPES.CONSERVATIVE:
        return 'Lower risk, stable returns. 30% Hyperion, 50% Staking, 20% Cash';
      case STRATEGY_TYPES.BALANCED:
        return 'Balanced risk and returns. 50% Hyperion, 40% Staking, 10% Cash';
      case STRATEGY_TYPES.AGGRESSIVE:
        return 'Higher risk, higher potential returns. 70% Hyperion, 25% Staking, 5% Cash';
      default:
        return 'Unknown strategy';
    }
  }

  /**
   * Get vault statistics using Nodit APIs
   */
  async getVaultStats(): Promise<VaultStats> {
    try {
      const totalVaults = await this.getTotalVaults();

      // Use Nodit to get additional statistics
      let totalValueLocked = 0;
      let averageApy = 0;
      let totalUsers = 0;

      // Get vault data for all vaults
      const vaultPromises = [];
      for (let i = 1; i <= totalVaults; i++) {
        vaultPromises.push(this.getVaultInfo(i));
      }

      const vaults = await Promise.all(vaultPromises);
      const validVaults = vaults.filter(v => v !== null) as VaultInfo[];

      // Calculate statistics
      totalValueLocked = validVaults.reduce((sum, vault) => sum + vault.totalAssets, 0);
      averageApy = validVaults.length > 0
        ? validVaults.reduce((sum, vault) => sum + vault.targetApy, 0) / validVaults.length
        : 0;

      // Estimate total users (simplified - in production would track unique depositors)
      totalUsers = validVaults.reduce((sum, vault) => sum + (vault.totalShares > 0 ? 1 : 0), 0);

      return {
        totalVaults,
        totalValueLocked,
        averageApy,
        totalUsers,
      };
    } catch (error) {
      console.error('Failed to get vault stats:', error);
      return {
        totalVaults: 0,
        totalValueLocked: 0,
        averageApy: 0,
        totalUsers: 0,
      };
    }
  }

  /**
   * Get vault performance history using Nodit APIs
   */
  async getVaultPerformanceHistory(vaultId: number, days: number = 30): Promise<Array<{
    timestamp: number;
    totalAssets: number;
    apy: number;
    yield: number;
  }>> {
    try {
      // In a production environment, this would query Nodit APIs for historical data
      // For now, return mock data structure
      const history = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let i = days; i >= 0; i--) {
        const timestamp = now - (i * dayMs);
        history.push({
          timestamp,
          totalAssets: 1000000 + Math.random() * 100000, // Mock data
          apy: 800 + Math.random() * 400, // 8-12% APY in basis points
          yield: Math.random() * 1000, // Mock yield
        });
      }

      return history;
    } catch (error) {
      console.error('Failed to get vault performance history:', error);
      return [];
    }
  }
}

// ================================= Service Instance ================================= //

export const vaultService = new VaultService();

export default vaultService;