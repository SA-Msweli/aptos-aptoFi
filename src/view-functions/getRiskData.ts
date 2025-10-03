import { aptos } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

// TypeScript interfaces matching smart contract data structures
export interface HealthFactor {
  value: number; // Health factor value (1.0 = at liquidation threshold)
  status: 'safe' | 'moderate' | 'high' | 'critical';
  liquidationThreshold: number; // in basis points
  collateralValue: number;
  borrowedValue: number;
}

export interface LiquidationRisk {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  healthFactor: number;
  liquidationPrice: number;
  timeToLiquidation: number; // estimated seconds until liquidation
  recommendedActions: string[];
}

export interface PositionAssessment {
  userAddress: string;
  tokenSymbol: string;
  positionValue: number;
  collateralValue: number;
  borrowedValue: number;
  healthFactor: number;
  riskScore: number; // 0-100 scale
  maxBorrowAmount: number;
  liquidationRisk: LiquidationRisk;
  lastUpdated: number; // Unix timestamp
}

export interface MarketRiskData {
  tokenSymbol: string;
  volatility: number; // 30-day volatility percentage
  liquidityRisk: number; // 0-100 scale
  concentrationRisk: number; // 0-100 scale
  correlationRisk: number; // correlation with other assets
  riskParameters: RiskParameters;
}

export interface RiskParameters {
  liquidationThreshold: number; // in basis points
  liquidationBonus: number; // in basis points
  maxLTV: number; // in basis points
  reserveFactor: number; // in basis points
  borrowCap: number;
  supplyCap: number;
}

export interface UserRiskProfile {
  userAddress: string;
  overallRiskScore: number; // 0-100 scale
  riskTolerance: number; // 1-5 scale
  maxBorrowLimit: number;
  maxPositionSize: number;
  totalCollateral: number;
  totalBorrowed: number;
  portfolioHealthFactor: number;
  activePositions: number;
  riskAlerts: RiskAlert[];
}

export interface RiskAlert {
  id: string;
  type: 'liquidation_warning' | 'high_volatility' | 'concentration_risk' | 'correlation_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  tokenSymbol?: string;
  threshold: number;
  currentValue: number;
  createdAt: number;
  acknowledged: boolean;
}

export interface GlobalRiskMetrics {
  totalValueLocked: number;
  totalBorrowed: number;
  globalUtilizationRate: number;
  averageHealthFactor: number;
  positionsAtRisk: number;
  liquidationQueue: string[];
  systemRiskScore: number;
}

/**
 * Get health factor for a user's position
 * @param userAddress User's wallet address
 * @param tokenSymbol Token symbol (optional, if not provided returns overall health factor)
 * @returns Health factor information
 */
export async function getHealthFactor(userAddress: string, tokenSymbol?: string): Promise<HealthFactor | null> {
  try {
    const functionArgs = tokenSymbol
      ? [userAddress, tokenSymbol]
      : [userAddress];

    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_health_factor`,
        typeArguments: [],
        functionArguments: functionArgs,
      },
    });

    const data = response[0] as any;
    const healthFactorValue = parseFloat(data.health_factor) / 10000; // Convert from basis points

    return {
      value: healthFactorValue,
      status: getHealthFactorStatus(healthFactorValue),
      liquidationThreshold: parseInt(data.liquidation_threshold),
      collateralValue: parseInt(data.collateral_value),
      borrowedValue: parseInt(data.borrowed_value),
    };
  } catch (error) {
    console.error(`Error fetching health factor for ${userAddress}:`, error);
    return null;
  }
}

/**
 * Calculate safe borrow amount for a user
 * @param userAddress User's wallet address
 * @param tokenSymbol Token symbol to borrow
 * @param additionalCollateral Additional collateral to consider
 * @returns Safe borrow amount
 */
export async function getSafeBorrowAmount(
  userAddress: string,
  tokenSymbol: string,
  additionalCollateral: number = 0
): Promise<number> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::calculate_safe_borrow_amount`,
        typeArguments: [],
        functionArguments: [userAddress, tokenSymbol, additionalCollateral.toString()],
      },
    });

    return parseInt(response[0] as string);
  } catch (error) {
    console.error(`Error calculating safe borrow amount for ${userAddress}:`, error);
    return 0;
  }
}

/**
 * Get liquidation queue (users eligible for liquidation)
 * @param limit Maximum number of positions to return
 * @returns Array of user addresses eligible for liquidation
 */
export async function getLiquidationQueue(limit: number = 50): Promise<string[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_liquidation_queue`,
        typeArguments: [],
        functionArguments: [limit.toString()],
      },
    });

    return response[0] as string[];
  } catch (error) {
    console.error("Error fetching liquidation queue:", error);
    return [];
  }
}

/**
 * Get comprehensive position assessment for a user
 * @param userAddress User's wallet address
 * @param tokenSymbol Token symbol
 * @returns Complete position assessment
 */
export async function getPositionAssessment(userAddress: string, tokenSymbol: string): Promise<PositionAssessment | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_position_assessment`,
        typeArguments: [],
        functionArguments: [userAddress, tokenSymbol],
      },
    });

    const data = response[0] as any;
    const healthFactor = parseFloat(data.health_factor) / 10000;

    return {
      userAddress,
      tokenSymbol,
      positionValue: parseInt(data.position_value),
      collateralValue: parseInt(data.collateral_value),
      borrowedValue: parseInt(data.borrowed_value),
      healthFactor,
      riskScore: parseInt(data.risk_score),
      maxBorrowAmount: parseInt(data.max_borrow_amount),
      liquidationRisk: {
        riskLevel: getLiquidationRiskLevel(healthFactor),
        healthFactor,
        liquidationPrice: parseFloat(data.liquidation_price),
        timeToLiquidation: parseInt(data.time_to_liquidation),
        recommendedActions: data.recommended_actions || [],
      },
      lastUpdated: parseInt(data.last_updated),
    };
  } catch (error) {
    console.error(`Error fetching position assessment for ${userAddress}:`, error);
    return null;
  }
}

/**
 * Get market risk data for a token
 * @param tokenSymbol Token symbol
 * @returns Market risk information
 */
export async function getMarketRiskData(tokenSymbol: string): Promise<MarketRiskData | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_market_risk_data`,
        typeArguments: [],
        functionArguments: [tokenSymbol],
      },
    });

    const data = response[0] as any;
    return {
      tokenSymbol,
      volatility: parseFloat(data.volatility),
      liquidityRisk: parseInt(data.liquidity_risk),
      concentrationRisk: parseInt(data.concentration_risk),
      correlationRisk: parseFloat(data.correlation_risk),
      riskParameters: {
        liquidationThreshold: parseInt(data.risk_parameters.liquidation_threshold),
        liquidationBonus: parseInt(data.risk_parameters.liquidation_bonus),
        maxLTV: parseInt(data.risk_parameters.max_ltv),
        reserveFactor: parseInt(data.risk_parameters.reserve_factor),
        borrowCap: parseInt(data.risk_parameters.borrow_cap),
        supplyCap: parseInt(data.risk_parameters.supply_cap),
      },
    };
  } catch (error) {
    console.error(`Error fetching market risk data for ${tokenSymbol}:`, error);
    return null;
  }
}

/**
 * Get user's complete risk profile
 * @param userAddress User's wallet address
 * @returns Complete user risk profile
 */
export async function getUserRiskProfile(userAddress: string): Promise<UserRiskProfile | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_user_risk_profile`,
        typeArguments: [],
        functionArguments: [userAddress],
      },
    });

    const data = response[0] as any;
    return {
      userAddress,
      overallRiskScore: parseInt(data.overall_risk_score),
      riskTolerance: parseInt(data.risk_tolerance),
      maxBorrowLimit: parseInt(data.max_borrow_limit),
      maxPositionSize: parseInt(data.max_position_size),
      totalCollateral: parseInt(data.total_collateral),
      totalBorrowed: parseInt(data.total_borrowed),
      portfolioHealthFactor: parseFloat(data.portfolio_health_factor) / 10000,
      activePositions: parseInt(data.active_positions),
      riskAlerts: (data.risk_alerts || []).map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        tokenSymbol: alert.token_symbol,
        threshold: parseFloat(alert.threshold),
        currentValue: parseFloat(alert.current_value),
        createdAt: parseInt(alert.created_at),
        acknowledged: alert.acknowledged,
      })),
    };
  } catch (error) {
    console.error(`Error fetching user risk profile for ${userAddress}:`, error);
    return null;
  }
}

/**
 * Get global risk metrics for the entire system
 * @returns Global risk metrics
 */
export async function getGlobalRiskMetrics(): Promise<GlobalRiskMetrics> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_global_risk_metrics`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    const data = response[0] as any;
    return {
      totalValueLocked: parseInt(data.total_value_locked),
      totalBorrowed: parseInt(data.total_borrowed),
      globalUtilizationRate: parseFloat(data.global_utilization_rate),
      averageHealthFactor: parseFloat(data.average_health_factor) / 10000,
      positionsAtRisk: parseInt(data.positions_at_risk),
      liquidationQueue: data.liquidation_queue || [],
      systemRiskScore: parseInt(data.system_risk_score),
    };
  } catch (error) {
    console.error("Error fetching global risk metrics:", error);
    return {
      totalValueLocked: 0,
      totalBorrowed: 0,
      globalUtilizationRate: 0,
      averageHealthFactor: 0,
      positionsAtRisk: 0,
      liquidationQueue: [],
      systemRiskScore: 0,
    };
  }
}

/**
 * Get risk alerts for a user
 * @param userAddress User's wallet address
 * @param includeAcknowledged Whether to include acknowledged alerts
 * @returns Array of risk alerts
 */
export async function getUserRiskAlerts(userAddress: string, includeAcknowledged: boolean = false): Promise<RiskAlert[]> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_user_risk_alerts`,
        typeArguments: [],
        functionArguments: [userAddress, includeAcknowledged.toString()],
      },
    });

    const alerts = response[0] as any[];
    return alerts.map((alert: any) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      tokenSymbol: alert.token_symbol,
      threshold: parseFloat(alert.threshold),
      currentValue: parseFloat(alert.current_value),
      createdAt: parseInt(alert.created_at),
      acknowledged: alert.acknowledged,
    }));
  } catch (error) {
    console.error(`Error fetching risk alerts for ${userAddress}:`, error);
    return [];
  }
}

/**
 * Check if a position is eligible for liquidation
 * @param userAddress User's wallet address
 * @param tokenSymbol Token symbol
 * @returns Whether position is eligible for liquidation
 */
export async function isEligibleForLiquidation(userAddress: string, tokenSymbol: string): Promise<boolean> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::is_eligible_for_liquidation`,
        typeArguments: [],
        functionArguments: [userAddress, tokenSymbol],
      },
    });

    return response[0] as boolean;
  } catch (error) {
    console.error(`Error checking liquidation eligibility for ${userAddress}:`, error);
    return false;
  }
}

/**
 * Get risk parameters for a token
 * @param tokenSymbol Token symbol
 * @returns Risk parameters
 */
export async function getRiskParameters(tokenSymbol: string): Promise<RiskParameters | null> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::get_risk_parameters`,
        typeArguments: [],
        functionArguments: [tokenSymbol],
      },
    });

    const params = response[0] as any;
    return {
      liquidationThreshold: parseInt(params.liquidation_threshold),
      liquidationBonus: parseInt(params.liquidation_bonus),
      maxLTV: parseInt(params.max_ltv),
      reserveFactor: parseInt(params.reserve_factor),
      borrowCap: parseInt(params.borrow_cap),
      supplyCap: parseInt(params.supply_cap),
    };
  } catch (error) {
    console.error(`Error fetching risk parameters for ${tokenSymbol}:`, error);
    return null;
  }
}

/**
 * Calculate liquidation price for a position
 * @param userAddress User's wallet address
 * @param tokenSymbol Token symbol
 * @returns Liquidation price
 */
export async function calculateLiquidationPrice(userAddress: string, tokenSymbol: string): Promise<number> {
  try {
    const response = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESSES.RISK_MANAGER}::calculate_liquidation_price`,
        typeArguments: [],
        functionArguments: [userAddress, tokenSymbol],
      },
    });

    return parseFloat(response[0] as string);
  } catch (error) {
    console.error(`Error calculating liquidation price for ${userAddress}:`, error);
    return 0;
  }
}

// Utility functions

/**
 * Get health factor status based on value
 * @param healthFactor Health factor value
 * @returns Status classification
 */
function getHealthFactorStatus(healthFactor: number): 'safe' | 'moderate' | 'high' | 'critical' {
  if (healthFactor >= 2.0) return 'safe';
  if (healthFactor >= 1.5) return 'moderate';
  if (healthFactor >= 1.1) return 'high';
  return 'critical';
}

/**
 * Get liquidation risk level based on health factor
 * @param healthFactor Health factor value
 * @returns Risk level
 */
function getLiquidationRiskLevel(healthFactor: number): 'low' | 'medium' | 'high' | 'critical' {
  if (healthFactor >= 2.0) return 'low';
  if (healthFactor >= 1.5) return 'medium';
  if (healthFactor >= 1.1) return 'high';
  return 'critical';
}

/**
 * Format health factor for display
 * @param healthFactor Health factor value
 * @returns Formatted string
 */
export function formatHealthFactor(healthFactor: number): string {
  if (healthFactor === Number.MAX_SAFE_INTEGER) return '∞';
  return healthFactor.toFixed(2);
}

/**
 * Get risk level color for UI
 * @param riskLevel Risk level
 * @returns Color class or hex code
 */
export function getRiskLevelColor(riskLevel: string): string {
  const colors = {
    safe: '#10b981', // green
    low: '#10b981', // green
    moderate: '#f59e0b', // yellow
    medium: '#f59e0b', // yellow
    high: '#f97316', // orange
    critical: '#ef4444', // red
  };
  return colors[riskLevel as keyof typeof colors] || '#6b7280'; // gray
}

/**
 * Get recommended actions based on health factor
 * @param healthFactor Health factor value
 * @returns Array of recommended actions
 */
export function getRecommendedActions(healthFactor: number): string[] {
  if (healthFactor >= 2.0) {
    return ['Position is healthy', 'Consider additional borrowing if needed'];
  } else if (healthFactor >= 1.5) {
    return ['Monitor position closely', 'Consider adding collateral'];
  } else if (healthFactor >= 1.1) {
    return ['Add collateral immediately', 'Consider partial repayment', 'Reduce position size'];
  } else {
    return ['URGENT: Add collateral now', 'Repay debt immediately', 'Position at risk of liquidation'];
  }
}

/**
 * Calculate time to liquidation based on current trends
 * @param healthFactor Current health factor
 * @param volatility Asset volatility
 * @returns Estimated time to liquidation in seconds
 */
export function estimateTimeToLiquidation(healthFactor: number, volatility: number): number {
  if (healthFactor >= 1.1) {
    // Rough estimation based on volatility and current health factor
    const buffer = healthFactor - 1.0;
    const dailyVolatility = volatility / Math.sqrt(365);
    const daysToLiquidation = buffer / (2 * dailyVolatility); // 2 standard deviations
    return Math.max(0, daysToLiquidation * 24 * 60 * 60); // Convert to seconds
  }
  return 0; // Already at liquidation threshold
}