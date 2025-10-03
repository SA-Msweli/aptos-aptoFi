import { CONTRACT_ADDRESSES } from "@/lib/constants";

// TypeScript interfaces matching smart contract parameters
export interface UpdatePositionRiskArguments {
  userAddress: string;
  tokenSymbol: string;
  positionValue: number;
  collateralValue: number;
  borrowedValue: number;
}

export interface CheckLiquidationEligibilityArguments {
  userAddress: string;
  tokenSymbol: string;
}

export interface UpdateRiskParametersArguments {
  tokenSymbol: string;
  liquidationThreshold: number; // in basis points (e.g., 8000 = 80%)
  liquidationBonus: number; // in basis points (e.g., 500 = 5%)
  maxLTV: number; // in basis points (e.g., 7500 = 75%)
}

export interface SetRiskLimitsArguments {
  userAddress: string;
  maxBorrowLimit: number;
  maxPositionSize: number;
  riskTolerance: number; // 1-5 scale
}

/**
 * Update position risk for a user
 * @param args UpdatePositionRiskArguments
 * @returns Transaction payload for updating position risk
 */
export const updatePositionRisk = (args: UpdatePositionRiskArguments) => {
  const { userAddress, tokenSymbol, positionValue, collateralValue, borrowedValue } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::update_position_risk`,
      typeArguments: [],
      functionArguments: [
        userAddress,
        tokenSymbol,
        positionValue.toString(),
        collateralValue.toString(),
        borrowedValue.toString(),
      ],
    },
  };
};

/**
 * Check if a position is eligible for liquidation
 * @param args CheckLiquidationEligibilityArguments
 * @returns Transaction payload for checking liquidation eligibility
 */
export const checkLiquidationEligibility = (args: CheckLiquidationEligibilityArguments) => {
  const { userAddress, tokenSymbol } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::check_liquidation_eligibility`,
      typeArguments: [],
      functionArguments: [
        userAddress,
        tokenSymbol,
      ],
    },
  };
};

/**
 * Update risk parameters for a token
 * @param args UpdateRiskParametersArguments
 * @returns Transaction payload for updating risk parameters
 */
export const updateRiskParameters = (args: UpdateRiskParametersArguments) => {
  const { tokenSymbol, liquidationThreshold, liquidationBonus, maxLTV } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::update_risk_parameters`,
      typeArguments: [],
      functionArguments: [
        tokenSymbol,
        liquidationThreshold.toString(),
        liquidationBonus.toString(),
        maxLTV.toString(),
      ],
    },
  };
};

/**
 * Set risk limits for a user
 * @param args SetRiskLimitsArguments
 * @returns Transaction payload for setting risk limits
 */
export const setRiskLimits = (args: SetRiskLimitsArguments) => {
  const { userAddress, maxBorrowLimit, maxPositionSize, riskTolerance } = args;

  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::set_risk_limits`,
      typeArguments: [],
      functionArguments: [
        userAddress,
        maxBorrowLimit.toString(),
        maxPositionSize.toString(),
        riskTolerance.toString(),
      ],
    },
  };
};

/**
 * Trigger emergency liquidation for a position
 * @param userAddress Address of the user to liquidate
 * @param tokenSymbol Token symbol for the position
 * @returns Transaction payload for emergency liquidation
 */
export const triggerEmergencyLiquidation = (userAddress: string, tokenSymbol: string) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::trigger_emergency_liquidation`,
      typeArguments: [],
      functionArguments: [
        userAddress,
        tokenSymbol,
      ],
    },
  };
};

/**
 * Update global risk settings (admin only)
 * @param maxGlobalLeverage Maximum global leverage ratio
 * @param emergencyPauseEnabled Whether emergency pause is enabled
 * @returns Transaction payload for updating global risk settings
 */
export const updateGlobalRiskSettings = (maxGlobalLeverage: number, emergencyPauseEnabled: boolean) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::update_global_risk_settings`,
      typeArguments: [],
      functionArguments: [
        maxGlobalLeverage.toString(),
        emergencyPauseEnabled.toString(),
      ],
    },
  };
};

// Utility functions for risk calculations and validation

/**
 * Calculate health factor from position data
 * @param collateralValue Total collateral value in USD
 * @param borrowedValue Total borrowed value in USD
 * @param liquidationThreshold Liquidation threshold in basis points
 * @returns Health factor (values < 1.0 indicate liquidation risk)
 */
export const calculateHealthFactor = (
  collateralValue: number,
  borrowedValue: number,
  liquidationThreshold: number
): number => {
  if (borrowedValue === 0) return Number.MAX_SAFE_INTEGER;

  const adjustedCollateral = collateralValue * (liquidationThreshold / 10000);
  return adjustedCollateral / borrowedValue;
};

/**
 * Calculate maximum safe borrow amount
 * @param collateralValue Total collateral value in USD
 * @param maxLTV Maximum loan-to-value ratio in basis points
 * @param currentBorrowed Currently borrowed amount in USD
 * @returns Maximum additional amount that can be safely borrowed
 */
export const calculateSafeBorrowAmount = (
  collateralValue: number,
  maxLTV: number,
  currentBorrowed: number = 0
): number => {
  const maxBorrowable = collateralValue * (maxLTV / 10000);
  const safeBorrowAmount = maxBorrowable - currentBorrowed;
  return Math.max(0, safeBorrowAmount);
};

/**
 * Assess liquidation risk level
 * @param healthFactor Current health factor
 * @returns Risk level assessment
 */
export const assessLiquidationRisk = (healthFactor: number): {
  level: 'safe' | 'moderate' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
} => {
  if (healthFactor >= 2.0) {
    return {
      level: 'safe',
      description: 'Position is well-collateralized',
      recommendedAction: 'No action required',
    };
  } else if (healthFactor >= 1.5) {
    return {
      level: 'moderate',
      description: 'Position has moderate risk',
      recommendedAction: 'Consider adding collateral or reducing debt',
    };
  } else if (healthFactor >= 1.1) {
    return {
      level: 'high',
      description: 'Position is at high risk of liquidation',
      recommendedAction: 'Add collateral or repay debt immediately',
    };
  } else {
    return {
      level: 'critical',
      description: 'Position is eligible for liquidation',
      recommendedAction: 'Urgent action required - add collateral or repay debt',
    };
  }
};

/**
 * Estimate gas for risk management operations
 * @param operation The risk management operation type
 * @returns Estimated gas amount
 */
export const estimateRiskManagementGas = (
  operation: 'update_position' | 'check_liquidation' | 'update_parameters' | 'set_limits' | 'emergency_liquidation'
): number => {
  const gasEstimates = {
    update_position: 1800,
    check_liquidation: 1200,
    update_parameters: 1500,
    set_limits: 1300,
    emergency_liquidation: 2500,
  };

  return gasEstimates[operation];
};

/**
 * Validate position risk update parameters
 * @param args UpdatePositionRiskArguments
 * @returns Validation result
 */
export const validatePositionRiskUpdate = (args: UpdatePositionRiskArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!args.userAddress || args.userAddress.trim().length === 0) {
    errors.push('User address is required');
  }

  if (!args.tokenSymbol || args.tokenSymbol.trim().length === 0) {
    errors.push('Token symbol is required');
  }

  if (args.positionValue < 0) {
    errors.push('Position value cannot be negative');
  }

  if (args.collateralValue < 0) {
    errors.push('Collateral value cannot be negative');
  }

  if (args.borrowedValue < 0) {
    errors.push('Borrowed value cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate risk parameters
 * @param args UpdateRiskParametersArguments
 * @returns Validation result
 */
export const validateRiskParameters = (args: UpdateRiskParametersArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!args.tokenSymbol || args.tokenSymbol.trim().length === 0) {
    errors.push('Token symbol is required');
  }

  if (args.liquidationThreshold < 0 || args.liquidationThreshold > 10000) {
    errors.push('Liquidation threshold must be between 0 and 10000 basis points (0-100%)');
  }

  if (args.liquidationBonus < 0 || args.liquidationBonus > 2000) {
    errors.push('Liquidation bonus must be between 0 and 2000 basis points (0-20%)');
  }

  if (args.maxLTV < 0 || args.maxLTV > 10000) {
    errors.push('Max LTV must be between 0 and 10000 basis points (0-100%)');
  }

  if (args.maxLTV >= args.liquidationThreshold) {
    errors.push('Max LTV must be less than liquidation threshold');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate risk limits
 * @param args SetRiskLimitsArguments
 * @returns Validation result
 */
export const validateRiskLimits = (args: SetRiskLimitsArguments): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!args.userAddress || args.userAddress.trim().length === 0) {
    errors.push('User address is required');
  }

  if (args.maxBorrowLimit < 0) {
    errors.push('Max borrow limit cannot be negative');
  }

  if (args.maxPositionSize < 0) {
    errors.push('Max position size cannot be negative');
  }

  if (args.riskTolerance < 1 || args.riskTolerance > 5) {
    errors.push('Risk tolerance must be between 1 and 5');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get recommended risk parameters based on token volatility
 * @param tokenSymbol Token symbol
 * @param volatilityScore Volatility score (1-10, where 10 is most volatile)
 * @returns Recommended risk parameters
 */
export const getRecommendedRiskParameters = (tokenSymbol: string, volatilityScore: number) => {
  // Conservative parameters for high volatility tokens
  const baseParameters = {
    liquidationThreshold: 8500, // 85%
    liquidationBonus: 500, // 5%
    maxLTV: 7500, // 75%
  };

  // Adjust based on volatility
  const volatilityAdjustment = Math.max(0, (volatilityScore - 5) * 500); // Reduce by 5% per volatility point above 5

  return {
    liquidationThreshold: Math.max(5000, baseParameters.liquidationThreshold - volatilityAdjustment),
    liquidationBonus: Math.min(2000, baseParameters.liquidationBonus + volatilityAdjustment / 2),
    maxLTV: Math.max(3000, baseParameters.maxLTV - volatilityAdjustment),
  };
};