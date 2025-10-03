import { aptos } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

// TypeScript interfaces matching smart contract data structures
export interface VaultInfo {
  id: number;
  name: string;
  tokenSymbol: string;
  totalDeposits: number;
  totalShares: number;
  strategyType: number; // 1: Lending, 2: LP, 3: Staking
  performanceFee: number; // in basis points
  managementFee: number; // in basis points
  lastHarvest: number; // Unix timestamp
  totalRewards: number;
  isActive: boolean;
  createdAt: number; // Unix timestamp
}

export interface VaultPosition {
  shares: number;
  depositTime: number; // Unix timestamp
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface VaultStrategy {
  strategyType: number;
  targetToken: string;
  expectedApy: number; // in basis points
  riskLevel: number; // 1-5 scale
}

export interface VaultPerformanceMetrics {
  currentApy: number; // in basis points
  totalValueLocked: number;
  sharePrice: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  yearlyYield: number;
}

export interface UserVaultSummary {
  totalDeposited: number;
  totalShares: number;
  currentValue: number;
  totalEarnings: number;
  activeVaults: number;
}

/**
 * Get information about all available vaults
 * @returns Array of vault information
 */
export async function getAvailableVaults(): Promise<VaultInfo[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_all_vaults`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    // Transform the response data to match our interface
    return (response[0] as any[]).map((vault: any) => ({
      id: parseInt(vault.id),
      name: vault.name,
      tokenSymbol: vault.token_symbol,
      totalDeposits: parseInt(vault.total_deposits),
      totalShares: parseInt(vault.total_shares),
      strategyType: parseInt(vault.strategy_type),
      performanceFee: parseInt(vault.performance_fee),
      managementFee: parseInt(vault.management_fee),
      lastHarvest: parseInt(vault.last_harvest),
      totalRewards: parseInt(vault.total_rewards),
      isActive: vault.is_active,
      createdAt: parseInt(vault.created_at),
    }));
  } catch (error) {
    console.error("Error fetching available vaults:", error);
    return [];
  }
}

/**
 * Get detailed information about a specific vault
 * @param vaultId The vault ID
 * @returns Vault information or null if not found
 */
export async function getVaultInfo(vaultId: number): Promise<VaultInfo | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_vault_info`,
        typeArguments: [],
        functionArguments: [vaultId.toString()],
      },
    });

    const vault = response[0] as any;
    return {
      id: parseInt(vault.id),
      name: vault.name,
      tokenSymbol: vault.token_symbol,
      totalDeposits: parseInt(vault.total_deposits),
      totalShares: parseInt(vault.total_shares),
      strategyType: parseInt(vault.strategy_type),
      performanceFee: parseInt(vault.performance_fee),
      managementFee: parseInt(vault.management_fee),
      lastHarvest: parseInt(vault.last_harvest),
      totalRewards: parseInt(vault.total_rewards),
      isActive: vault.is_active,
      createdAt: parseInt(vault.created_at),
    };
  } catch (error) {
    console.error(`Error fetching vault info for vault ${vaultId}:`, error);
    return null;
  }
}

/**
 * Get user's position in a specific vault
 * @param userAddress User's wallet address
 * @param vaultId The vault ID
 * @returns User's vault position or null if no position
 */
export async function getUserVaultPosition(userAddress: string, vaultId: number): Promise<VaultPosition | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_user_position`,
        typeArguments: [],
        functionArguments: [userAddress, vaultId.toString()],
      },
    });

    const position = response[0] as any;
    return {
      shares: parseInt(position.shares),
      depositTime: parseInt(position.deposit_time),
      totalDeposited: parseInt(position.total_deposited),
      totalWithdrawn: parseInt(position.total_withdrawn),
    };
  } catch (error) {
    console.error(`Error fetching user position for vault ${vaultId}:`, error);
    return null;
  }
}

/**
 * Get all vault positions for a user
 * @param userAddress User's wallet address
 * @returns Array of user's vault positions with vault info
 */
export async function getUserVaultPositions(userAddress: string): Promise<Array<VaultPosition & { vaultInfo: VaultInfo }>> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_user_all_positions`,
        typeArguments: [],
        functionArguments: [userAddress],
      },
    });

    const positions = response[0] as any[];
    const result = [];

    for (const position of positions) {
      const vaultInfo = await getVaultInfo(parseInt(position.vault_id));
      if (vaultInfo) {
        result.push({
          shares: parseInt(position.shares),
          depositTime: parseInt(position.deposit_time),
          totalDeposited: parseInt(position.total_deposited),
          totalWithdrawn: parseInt(position.total_withdrawn),
          vaultInfo,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching user vault positions:", error);
    return [];
  }
}

/**
 * Calculate current APY for a vault
 * @param vaultId The vault ID
 * @returns Current APY in basis points
 */
export async function getVaultAPY(vaultId: number): Promise<number> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::calculate_vault_apy_view`,
        typeArguments: [],
        functionArguments: [vaultId.toString()],
      },
    });

    return parseInt(response[0] as string);
  } catch (error) {
    console.error(`Error calculating APY for vault ${vaultId}:`, error);
    return 0;
  }
}

/**
 * Get vault strategy information
 * @param vaultId The vault ID
 * @returns Vault strategy details
 */
export async function getVaultStrategy(vaultId: number): Promise<VaultStrategy | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_vault_strategy`,
        typeArguments: [],
        functionArguments: [vaultId.toString()],
      },
    });

    const strategy = response[0] as any;
    return {
      strategyType: parseInt(strategy.strategy_type),
      targetToken: strategy.target_token,
      expectedApy: parseInt(strategy.expected_apy),
      riskLevel: parseInt(strategy.risk_level),
    };
  } catch (error) {
    console.error(`Error fetching vault strategy for vault ${vaultId}:`, error);
    return null;
  }
}

/**
 * Calculate withdrawal amount for given shares
 * @param vaultId The vault ID
 * @param shares Number of shares to withdraw
 * @returns Amount of tokens that would be received
 */
export async function calculateWithdrawalAmount(vaultId: number, shares: number): Promise<number> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::calculate_withdrawal_amount`,
        typeArguments: [],
        functionArguments: [vaultId.toString(), shares.toString()],
      },
    });

    return parseInt(response[0] as string);
  } catch (error) {
    console.error(`Error calculating withdrawal amount for vault ${vaultId}:`, error);
    return 0;
  }
}

/**
 * Get comprehensive performance metrics for a vault
 * @param vaultId The vault ID
 * @returns Performance metrics
 */
export async function getVaultPerformanceMetrics(vaultId: number): Promise<VaultPerformanceMetrics | null> {
  try {
    const [vaultInfo, apy] = await Promise.all([
      getVaultInfo(vaultId),
      getVaultAPY(vaultId),
    ]);

    if (!vaultInfo) return null;

    // Calculate share price
    const sharePrice = vaultInfo.totalShares > 0 ? vaultInfo.totalDeposits / vaultInfo.totalShares : 1;

    // Calculate yields (simplified calculations - in production, these would come from historical data)
    const dailyRate = apy / 365 / 10000;
    const weeklyRate = apy / 52 / 10000;
    const monthlyRate = apy / 12 / 10000;
    const yearlyRate = apy / 10000;

    return {
      currentApy: apy,
      totalValueLocked: vaultInfo.totalDeposits,
      sharePrice,
      dailyYield: dailyRate,
      weeklyYield: weeklyRate,
      monthlyYield: monthlyRate,
      yearlyYield: yearlyRate,
    };
  } catch (error) {
    console.error(`Error fetching performance metrics for vault ${vaultId}:`, error);
    return null;
  }
}

/**
 * Get user's vault summary across all positions
 * @param userAddress User's wallet address
 * @returns Summary of user's vault activities
 */
export async function getUserVaultSummary(userAddress: string): Promise<UserVaultSummary> {
  try {
    const positions = await getUserVaultPositions(userAddress);

    let totalDeposited = 0;
    let totalShares = 0;
    let currentValue = 0;
    let totalEarnings = 0;

    for (const position of positions) {
      totalDeposited += position.totalDeposited;
      totalShares += position.shares;

      // Calculate current value of shares
      const withdrawalAmount = await calculateWithdrawalAmount(position.vaultInfo.id, position.shares);
      currentValue += withdrawalAmount;

      // Calculate earnings (current value - deposited + withdrawn)
      const earnings = withdrawalAmount - position.totalDeposited + position.totalWithdrawn;
      totalEarnings += Math.max(0, earnings);
    }

    return {
      totalDeposited,
      totalShares,
      currentValue,
      totalEarnings,
      activeVaults: positions.length,
    };
  } catch (error) {
    console.error("Error calculating user vault summary:", error);
    return {
      totalDeposited: 0,
      totalShares: 0,
      currentValue: 0,
      totalEarnings: 0,
      activeVaults: 0,
    };
  }
}

/**
 * Get vaults filtered by strategy type
 * @param strategyType Strategy type (1: Lending, 2: LP, 3: Staking)
 * @returns Array of vaults with the specified strategy
 */
export async function getVaultsByStrategy(strategyType: number): Promise<VaultInfo[]> {
  try {
    const allVaults = await getAvailableVaults();
    return allVaults.filter(vault => vault.strategyType === strategyType && vault.isActive);
  } catch (error) {
    console.error(`Error fetching vaults by strategy ${strategyType}:`, error);
    return [];
  }
}

/**
 * Get vaults sorted by APY (highest first)
 * @param limit Maximum number of vaults to return
 * @returns Array of vaults sorted by APY
 */
export async function getTopPerformingVaults(limit: number = 10): Promise<Array<VaultInfo & { apy: number }>> {
  try {
    const allVaults = await getAvailableVaults();
    const vaultsWithAPY = [];

    for (const vault of allVaults.filter(v => v.isActive)) {
      const apy = await getVaultAPY(vault.id);
      vaultsWithAPY.push({ ...vault, apy });
    }

    return vaultsWithAPY
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching top performing vaults:", error);
    return [];
  }
}

/**
 * Check if user can deposit to a vault
 * @param userAddress User's wallet address
 * @param vaultId The vault ID
 * @param amount Amount to deposit
 * @returns Whether deposit is allowed and any restrictions
 */
export async function checkDepositEligibility(
  userAddress: string,
  vaultId: number,
  amount: number
): Promise<{ eligible: boolean; reason?: string; maxAmount?: number }> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::check_deposit_eligibility`,
        typeArguments: [],
        functionArguments: [userAddress, vaultId.toString(), amount.toString()],
      },
    });

    const result = response[0] as any;
    return {
      eligible: result.eligible,
      reason: result.reason || undefined,
      maxAmount: result.max_amount ? parseInt(result.max_amount) : undefined,
    };
  } catch (error) {
    console.error("Error checking deposit eligibility:", error);
    return { eligible: false, reason: "Unable to verify eligibility" };
  }
}

/**
 * Get historical performance data for a vault
 * @param vaultId The vault ID
 * @param days Number of days of history to fetch
 * @returns Array of historical performance data points
 */
export async function getVaultHistoricalPerformance(
  vaultId: number,
  days: number = 30
): Promise<Array<{ date: number; apy: number; tvl: number; sharePrice: number }>> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::get_historical_performance`,
        typeArguments: [],
        functionArguments: [vaultId.toString(), days.toString()],
      },
    });

    const history = response[0] as any[];
    return history.map((point: any) => ({
      date: parseInt(point.timestamp),
      apy: parseInt(point.apy),
      tvl: parseInt(point.tvl),
      sharePrice: parseFloat(point.share_price),
    }));
  } catch (error) {
    console.error(`Error fetching historical performance for vault ${vaultId}:`, error);
    return [];
  }
}

// Utility functions for formatting and calculations

/**
 * Format APY for display
 * @param apyBasisPoints APY in basis points
 * @returns Formatted APY string
 */
export function formatAPY(apyBasisPoints: number): string {
  const percentage = apyBasisPoints / 100;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Get strategy type name
 * @param strategyType Strategy type number
 * @returns Human-readable strategy name
 */
export function getStrategyTypeName(strategyType: number): string {
  const strategies = {
    1: 'Lending',
    2: 'Liquidity Provision',
    3: 'Staking',
  };
  return strategies[strategyType as keyof typeof strategies] || 'Unknown';
}

/**
 * Get risk level description
 * @param riskLevel Risk level (1-5)
 * @returns Risk level description
 */
export function getRiskLevelDescription(riskLevel: number): string {
  const descriptions = {
    1: 'Very Low Risk',
    2: 'Low Risk',
    3: 'Medium Risk',
    4: 'High Risk',
    5: 'Very High Risk',
  };
  return descriptions[riskLevel as keyof typeof descriptions] || 'Unknown Risk';
}