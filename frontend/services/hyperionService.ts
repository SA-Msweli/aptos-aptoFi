/**
 * Hyperion Service Layer
 * 
 * This service provides high-level functions for interacting with Hyperion's
 * Concentrated Liquidity Market Maker (CLMM) contracts and SDK functionality.
 */

// Note: Using 'any' type for now since the actual Hyperion SDK types may vary
import { ensureHyperionClient, getHyperionConfig } from '../utils/hyperionClient';
// Removed unused type imports

/**
 * Interface for liquidity pool information
 */
export interface LiquidityPool {
  address: string;
  tokenA: string;
  tokenB: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tickSpacing: number;
}

/**
 * Interface for swap parameters
 */
export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMinimum: string;
  sqrtPriceLimitX96?: string;
  recipient: string;
}

/**
 * Interface for liquidity position
 */
export interface LiquidityPosition {
  positionId: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  feesEarned: {
    tokenA: string;
    tokenB: string;
  };
}

/**
 * Interface for add liquidity parameters
 */
export interface AddLiquidityParams {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  tickLower: number;
  tickUpper: number;
  recipient: string;
}

/**
 * HyperionService class for CLMM interactions
 */
export class HyperionService {
  private client: any = null;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize the Hyperion client
   */
  private async initializeClient(): Promise<void> {
    try {
      this.client = await ensureHyperionClient();
    } catch (error) {
      console.error('Failed to initialize Hyperion client in service:', error);
      throw error;
    }
  }

  /**
   * Ensure client is initialized
   */
  private async ensureClient(): Promise<any> {
    if (!this.client) {
      await this.initializeClient();
    }
    if (!this.client) {
      throw new Error('Hyperion client not initialized');
    }
    return this.client;
  }

  /**
   * Get all available liquidity pools
   * @returns Promise<LiquidityPool[]> - Array of liquidity pools
   */
  async getLiquidityPools(): Promise<LiquidityPool[]> {
    try {
      const client = await this.ensureClient();

      // Use the correct Hyperion SDK method
      const pools = await client._pool.fetchAllPools();

      return pools.map((pool: any) => ({
        address: pool.pool_address || pool.address,
        tokenA: pool.token_a || pool.token0,
        tokenB: pool.token_b || pool.token1,
        fee: pool.fee_tier || pool.fee,
        liquidity: pool.liquidity,
        sqrtPriceX96: pool.sqrt_price_x96 || pool.sqrtPriceX96,
        tick: pool.current_tick || pool.tick,
        tickSpacing: pool.tick_spacing || pool.tickSpacing,
      }));
    } catch (error) {
      console.error('Failed to fetch liquidity pools:', error);
      throw new Error(`Failed to fetch liquidity pools: ${error}`);
    }
  }

  /**
   * Get specific liquidity pool information
   * @param poolAddress - Address of the liquidity pool
   * @returns Promise<LiquidityPool | null> - Pool information or null if not found
   */
  async getLiquidityPool(poolAddress: string): Promise<LiquidityPool | null> {
    try {
      const client = await this.ensureClient();

      const pool = await client._pool.fetchPoolById(poolAddress);

      if (!pool) {
        return null;
      }

      return {
        address: pool.pool_address || pool.address,
        tokenA: pool.token_a || pool.token0,
        tokenB: pool.token_b || pool.token1,
        fee: pool.fee_tier || pool.fee,
        liquidity: pool.liquidity,
        sqrtPriceX96: pool.sqrt_price_x96 || pool.sqrtPriceX96,
        tick: pool.current_tick || pool.tick,
        tickSpacing: pool.tick_spacing || pool.tickSpacing,
      };
    } catch (error) {
      console.error(`Failed to fetch pool ${poolAddress}:`, error);
      throw new Error(`Failed to fetch pool: ${error}`);
    }
  }

  /**
   * Execute a token swap through CLMM
   * @param swapParams - Parameters for the swap
   * @returns Promise<string> - Transaction hash
   */
  async executeSwap(swapParams: SwapParams): Promise<string> {
    try {
      const client = await this.ensureClient();

      // Validate swap parameters
      this.validateSwapParams(swapParams);

      const transaction = await client.swap({
        tokenIn: swapParams.tokenIn,
        tokenOut: swapParams.tokenOut,
        amountIn: swapParams.amountIn,
        amountOutMinimum: swapParams.amountOutMinimum,
        sqrtPriceLimitX96: swapParams.sqrtPriceLimitX96,
        recipient: swapParams.recipient,
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to execute swap:', error);
      throw new Error(`Swap execution failed: ${error}`);
    }
  }

  /**
   * Get quote for a potential swap using pool-specific estimation
   * @param poolId - Pool ID for the swap
   * @param tokenAAmount - Amount of token A
   * @param isAtoB - Direction of swap (true: A->B, false: B->A)
   * @returns Promise<string> - Expected output amount
   */
  async getSwapQuote(poolId: string, tokenAAmount: string, isAtoB: boolean = true): Promise<string> {
    try {
      const client = await this.ensureClient();

      // Use pool-specific estimation methods that actually work
      if (isAtoB) {
        // Estimate token B amount from token A amount
        const quote = await client._pool.estCurrencyBAmountFromA(poolId, tokenAAmount);
        return quote.toString();
      } else {
        // Estimate token A amount from token B amount
        const quote = await client._pool.estCurrencyAAmountFromB(poolId, tokenAAmount);
        return quote.toString();
      }
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw new Error(`Failed to get swap quote: ${error}`);
    }
  }

  /**
   * Add liquidity to a pool
   * @param params - Add liquidity parameters
   * @returns Promise<string> - Transaction hash
   */
  async addLiquidity(params: AddLiquidityParams): Promise<string> {
    try {
      const client = await this.ensureClient();

      this.validateAddLiquidityParams(params);

      const transaction = await client.addLiquidity({
        poolAddress: params.poolAddress,
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountADesired: params.amountADesired,
        amountBDesired: params.amountBDesired,
        amountAMin: params.amountAMin,
        amountBMin: params.amountBMin,
        tickLower: params.tickLower,
        tickUpper: params.tickUpper,
        recipient: params.recipient,
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to add liquidity:', error);
      throw new Error(`Add liquidity failed: ${error}`);
    }
  }

  /**
   * Remove liquidity from a position
   * @param positionId - ID of the liquidity position
   * @param liquidity - Amount of liquidity to remove
   * @param amountAMin - Minimum amount of token A to receive
   * @param amountBMin - Minimum amount of token B to receive
   * @returns Promise<string> - Transaction hash
   */
  async removeLiquidity(
    positionId: string,
    liquidity: string,
    amountAMin: string,
    amountBMin: string
  ): Promise<string> {
    try {
      const client = await this.ensureClient();

      const transaction = await client.removeLiquidity({
        positionId,
        liquidity,
        amountAMin,
        amountBMin,
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to remove liquidity:', error);
      throw new Error(`Remove liquidity failed: ${error}`);
    }
  }

  /**
   * Get user's liquidity positions
   * @param userAddress - User's wallet address
   * @returns Promise<LiquidityPosition[]> - Array of user's positions
   */
  async getUserPositions(userAddress: string): Promise<LiquidityPosition[]> {
    try {
      const client = await this.ensureClient();

      const positions = await client._position.fetchAllPositionsByAddress(userAddress);

      return positions.map((position: any) => ({
        positionId: position.position_id || position.id,
        poolAddress: position.pool_address || position.poolAddress,
        tokenA: position.token_a || position.token0,
        tokenB: position.token_b || position.token1,
        liquidity: position.liquidity,
        tickLower: position.tick_lower || position.tickLower,
        tickUpper: position.tick_upper || position.tickUpper,
        feesEarned: {
          tokenA: position.fees_earned_a || position.feesEarned0 || '0',
          tokenB: position.fees_earned_b || position.feesEarned1 || '0',
        },
      }));
    } catch (error) {
      console.error('Failed to fetch user positions:', error);
      throw new Error(`Failed to fetch user positions: ${error}`);
    }
  }

  /**
   * Collect fees from a liquidity position
   * @param positionId - ID of the liquidity position
   * @returns Promise<string> - Transaction hash
   */
  async collectFees(positionId: string): Promise<string> {
    try {
      const client = await this.ensureClient();

      const transaction = await client.collectFees({
        positionId,
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to collect fees:', error);
      throw new Error(`Fee collection failed: ${error}`);
    }
  }

  /**
   * Validate swap parameters
   */
  private validateSwapParams(params: SwapParams): void {
    if (!params.tokenIn || !params.tokenOut) {
      throw new Error('Token addresses are required');
    }
    if (!params.amountIn || parseFloat(params.amountIn) <= 0) {
      throw new Error('Valid input amount is required');
    }
    if (!params.recipient) {
      throw new Error('Recipient address is required');
    }
  }

  /**
   * Validate add liquidity parameters
   */
  private validateAddLiquidityParams(params: AddLiquidityParams): void {
    if (!params.poolAddress || !params.tokenA || !params.tokenB) {
      throw new Error('Pool and token addresses are required');
    }
    if (!params.amountADesired || !params.amountBDesired) {
      throw new Error('Desired amounts are required');
    }
    if (!params.recipient) {
      throw new Error('Recipient address is required');
    }
    if (params.tickLower >= params.tickUpper) {
      throw new Error('Invalid tick range');
    }
  }

  /**
   * Get service configuration status
   */
  getServiceStatus() {
    const config = getHyperionConfig();
    return {
      isInitialized: this.client !== null,
      isConfigured: config.isConfigured,
      config: config,
    };
  }
}

// Export singleton instance
export const hyperionService = new HyperionService();

export default hyperionService;