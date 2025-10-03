import { CONTRACT_ADDRESSES } from "@/lib/constants";

// TypeScript interfaces matching smart contract parameters
export interface CreateVaultArguments {
  name: string;
  tokenSymbol: string;
  strategyType: number; // 1: Lending, 2: LP, 3: Staking
  performanceFee: number; // in basis points (e.g., 500 = 5%)
  managementFee: number; // in basis points (e.g., 200 = 2%)
}

export interface DepositToVaultArguments {
  vaultId: number;
  coinType: string;
  amount: number;
}

export interface WithdrawFromVaultArguments {
  vaultId: number;
  coinType: string;
  shares: number;
}

export interface HarvestVaultRewardsArguments {
  vaultId: number;
  coinType: string;
}

/**
 * Create a new yield vault
 * @param args CreateVaultArguments
 * @returns Transaction payload for creating a vault
 */
export const createVault = (args: CreateVaultArguments) => {
  const { name, tokenSymbol, strategyType, performanceFee, managementFee } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::create_vault`,
      typeArguments: [],
      functionArguments: [
        name,
        tokenSymbol,
        strategyType.toString(),
        performanceFee.toString(),
        managementFee.toString(),
      ],
    },
  };
};

/**
 * Deposit tokens into a yield vault
 * @param args DepositToVaultArguments
 * @returns Transaction payload for depositing to vault
 */
export const depositToVault = (args: DepositToVaultArguments) => {
  const { vaultId, coinType, amount } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::deposit`,
      typeArguments: [coinType],
      functionArguments: [
        vaultId.toString(),
        amount.toString(),
      ],
    },
  };
};

/**
 * Withdraw tokens from a yield vault
 * @param args WithdrawFromVaultArguments
 * @returns Transaction payload for withdrawing from vault
 */
export const withdrawFromVault = (args: WithdrawFromVaultArguments) => {
  const { vaultId, coinType, shares } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::withdraw`,
      typeArguments: [coinType],
      functionArguments: [
        vaultId.toString(),
        shares.toString(),
      ],
    },
  };
};

/**
 * Harvest rewards from a yield vault
 * @param args HarvestVaultRewardsArguments
 * @returns Transaction payload for harvesting vault rewards
 */
export const harvestVaultRewards = (args: HarvestVaultRewardsArguments) => {
  const { vaultId, coinType } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.YIELD_VAULT}::harvest`,
      typeArguments: [coinType],
      functionArguments: [
        vaultId.toString(),
      ],
    },
  };
};

// Additional utility functions for gas estimation and validation

/**
 * Estimate gas for vault operations
 * @param operation The vault operation type
 * @returns Estimated gas amount
 */
export const estimateVaultGas = (operation: 'create' | 'deposit' | 'withdraw' | 'harvest'): number => {
  const gasEstimates = {
    create: 2000,
    deposit: 1500,
    withdraw: 1500,
    harvest: 1800,
  };

  return gasEstimates[operation];
};

/**
 * Validate vault creation parameters
 * @param args CreateVaultArguments
 * @returns Validation result
 */
export const validateVaultCreation = (args: CreateVaultArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!args.name || args.name.trim().length === 0) {
    errors.push('Vault name is required');
  }

  if (!args.tokenSymbol || args.tokenSymbol.trim().length === 0) {
    errors.push('Token symbol is required');
  }

  if (args.strategyType < 1 || args.strategyType > 3) {
    errors.push('Strategy type must be 1 (Lending), 2 (LP), or 3 (Staking)');
  }

  if (args.performanceFee < 0 || args.performanceFee > 10000) {
    errors.push('Performance fee must be between 0 and 10000 basis points (0-100%)');
  }

  if (args.managementFee < 0 || args.managementFee > 10000) {
    errors.push('Management fee must be between 0 and 10000 basis points (0-100%)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate deposit parameters
 * @param args DepositToVaultArguments
 * @returns Validation result
 */
export const validateVaultDeposit = (args: DepositToVaultArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (args.vaultId < 0) {
    errors.push('Vault ID must be a positive number');
  }

  if (!args.coinType || args.coinType.trim().length === 0) {
    errors.push('Coin type is required');
  }

  if (args.amount <= 0) {
    errors.push('Deposit amount must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate withdrawal parameters
 * @param args WithdrawFromVaultArguments
 * @returns Validation result
 */
export const validateVaultWithdrawal = (args: WithdrawFromVaultArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (args.vaultId < 0) {
    errors.push('Vault ID must be a positive number');
  }

  if (!args.coinType || args.coinType.trim().length === 0) {
    errors.push('Coin type is required');
  }

  if (args.shares <= 0) {
    errors.push('Shares amount must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};