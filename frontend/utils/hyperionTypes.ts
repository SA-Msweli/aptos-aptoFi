/**
 * Hyperion-related TypeScript type definitions
 * 
 * This module contains all TypeScript interfaces and types related to
 * Hyperion SDK integration and CLMM operations.
 */

/**
 * Hyperion SDK configuration interface
 */
export interface HyperionConfig {
  apiUrl: string;
  sdkEndpoint: string;
  clmmAddress: string;
  network: string;
  isConfigured: boolean;
}

/**
 * Token information interface
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

/**
 * Pool statistics interface
 */
export interface PoolStats {
  totalValueLocked: string;
  volume24h: string;
  fees24h: string;
  apr: number;
  utilization: number;
}

/**
 * Price information interface
 */
export interface PriceInfo {
  price: string;
  priceImpact: number;
  minimumReceived: string;
  maximumSold: string;
  route: string[];
}

/**
 * Transaction result interface
 */
export interface TransactionResult {
  hash: string;
  success: boolean;
  gasUsed?: string;
  timestamp?: number;
  blockNumber?: number;
}

/**
 * Liquidity range interface for concentrated liquidity
 */
export interface LiquidityRange {
  tickLower: number;
  tickUpper: number;
  priceLower: string;
  priceUpper: string;
}

/**
 * Position performance metrics
 */
export interface PositionMetrics {
  currentValue: string;
  initialValue: string;
  pnl: string;
  pnlPercentage: number;
  feesEarned: string;
  impermanentLoss: string;
}

/**
 * Hyperion service status
 */
export interface ServiceStatus {
  isInitialized: boolean;
  isConfigured: boolean;
  config: HyperionConfig;
  lastError?: string;
}

/**
 * Swap route information
 */
export interface SwapRoute {
  path: string[];
  pools: string[];
  fees: number[];
  expectedOutput: string;
  priceImpact: number;
}

/**
 * Pool creation parameters
 */
export interface CreatePoolParams {
  tokenA: string;
  tokenB: string;
  fee: number;
  initialPrice: string;
}

/**
 * Liquidity mining rewards
 */
export interface LiquidityRewards {
  positionId: string;
  rewardTokens: {
    token: string;
    amount: string;
    apr: number;
  }[];
  totalValue: string;
}

// Removed default export to avoid type/value confusion