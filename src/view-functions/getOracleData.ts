import { aptosClient } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export interface PriceData {
  price: number; // Price in USD with 8 decimals
  timestamp: number; // Unix timestamp
  roundId: number;
  isFresh: boolean;
}

export interface TokenPriceInfo {
  tokenSymbol: string;
  priceUSD: number;
  priceChange24h: number;
  lastUpdated: number;
  isStale: boolean;
}

/**
 * Get the latest price for a token from Chainlink oracle
 * @param tokenSymbol Token symbol (e.g., "APT", "USDC")
 * @returns [price, priceChange24h] tuple
 */
export const getLatestPrice = async (tokenSymbol: string): Promise<[number, number]> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::get_latest_price`,
        functionArguments: [tokenSymbol],
      },
    });

    if (result && result.length >= 2) {
      const price = parseInt(result[0] as string); // Price in 8 decimals
      const priceChange = parseInt(result[1] as string); // 24h change in basis points
      return [price, priceChange];
    }

    return [0, 0];
  } catch (error) {
    console.error(`Error fetching price for ${tokenSymbol}:`, error);
    return [0, 0];
  }
};

/**
 * Check if price data is fresh (not stale)
 * @param tokenSymbol Token symbol
 * @returns true if price is fresh, false if stale
 */
export const isPriceFresh = async (tokenSymbol: string): Promise<boolean> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::is_price_fresh`,
        functionArguments: [tokenSymbol],
      },
    });

    return result[0] as boolean;
  } catch (error) {
    console.error(`Error checking price freshness for ${tokenSymbol}:`, error);
    return false;
  }
};

/**
 * Calculate USD value of a token amount
 * @param tokenSymbol Token symbol
 * @param amount Token amount (in token's native decimals)
 * @returns USD value
 */
export const calculateUSDValue = async (
  tokenSymbol: string,
  amount: number
): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::calculate_usd_value`,
        functionArguments: [tokenSymbol, amount.toString()],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error(`Error calculating USD value for ${tokenSymbol}:`, error);
    return 0;
  }
};

/**
 * Get comprehensive price information for a token
 * @param tokenSymbol Token symbol
 * @returns TokenPriceInfo object
 */
export const getTokenPriceInfo = async (tokenSymbol: string): Promise<TokenPriceInfo> => {
  try {
    const [priceData, isFresh] = await Promise.all([
      getLatestPrice(tokenSymbol),
      isPriceFresh(tokenSymbol)
    ]);

    const [price, priceChange24h] = priceData;

    return {
      tokenSymbol,
      priceUSD: price / 100000000, // Convert from 8 decimals to USD
      priceChange24h: priceChange24h / 100, // Convert from basis points to percentage
      lastUpdated: Date.now(), // Current timestamp as we don't have this from contract
      isStale: !isFresh,
    };
  } catch (error) {
    console.error(`Error fetching token price info for ${tokenSymbol}:`, error);
    return {
      tokenSymbol,
      priceUSD: 0,
      priceChange24h: 0,
      lastUpdated: 0,
      isStale: true,
    };
  }
};

/**
 * Get price data for multiple tokens
 * @param tokenSymbols Array of token symbols
 * @returns Array of TokenPriceInfo objects
 */
export const getMultipleTokenPrices = async (tokenSymbols: string[]): Promise<TokenPriceInfo[]> => {
  try {
    const pricePromises = tokenSymbols.map(symbol => getTokenPriceInfo(symbol));
    return await Promise.all(pricePromises);
  } catch (error) {
    console.error("Error fetching multiple token prices:", error);
    return tokenSymbols.map(symbol => ({
      tokenSymbol: symbol,
      priceUSD: 0,
      priceChange24h: 0,
      lastUpdated: 0,
      isStale: true,
    }));
  }
};

/**
 * Get historical price data (if available)
 * @param tokenSymbol Token symbol
 * @param roundId Specific round ID to fetch
 * @returns PriceData object
 */
export const getHistoricalPrice = async (
  tokenSymbol: string,
  roundId: number
): Promise<PriceData | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::get_historical_price`,
        functionArguments: [tokenSymbol, roundId.toString()],
      },
    });

    if (result && result.length >= 4) {
      return {
        price: parseInt(result[0] as string),
        timestamp: parseInt(result[1] as string),
        roundId: parseInt(result[2] as string),
        isFresh: result[3] as boolean,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching historical price for ${tokenSymbol}:`, error);
    return null;
  }
};

/**
 * Get the latest round data for a token
 * @param tokenSymbol Token symbol
 * @returns Round data including price, timestamp, and round ID
 */
export const getLatestRoundData = async (tokenSymbol: string): Promise<PriceData | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::get_latest_round_data`,
        functionArguments: [tokenSymbol],
      },
    });

    if (result && result.length >= 4) {
      return {
        price: parseInt(result[0] as string),
        timestamp: parseInt(result[1] as string),
        roundId: parseInt(result[2] as string),
        isFresh: result[3] as boolean,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching latest round data for ${tokenSymbol}:`, error);
    return null;
  }
};

/**
 * Check if oracle is active and responding
 * @param tokenSymbol Token symbol
 * @returns true if oracle is active
 */
export const isOracleActive = async (tokenSymbol: string): Promise<boolean> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::is_oracle_active`,
        functionArguments: [tokenSymbol],
      },
    });

    return result[0] as boolean;
  } catch (error) {
    console.error(`Error checking oracle status for ${tokenSymbol}:`, error);
    return false;
  }
};

/**
 * Get supported tokens by the oracle
 * @returns Array of supported token symbols
 */
export const getSupportedTokens = async (): Promise<string[]> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::get_supported_tokens`,
        functionArguments: [],
      },
    });

    return result[0] as string[] || [];
  } catch (error) {
    console.error("Error fetching supported tokens:", error);
    return [];
  }
};

/**
 * Get price staleness threshold (in seconds)
 * @param tokenSymbol Token symbol
 * @returns Staleness threshold in seconds
 */
export const getPriceStalenessThreshold = async (tokenSymbol: string): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.CHAINLINK_ORACLE}::get_staleness_threshold`,
        functionArguments: [tokenSymbol],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error(`Error fetching staleness threshold for ${tokenSymbol}:`, error);
    return 3600; // Default to 1 hour
  }
};

/**
 * Format price for display
 * @param price Price in 8 decimals
 * @param decimals Number of decimal places to show
 * @returns Formatted price string
 */
export const formatPrice = (price: number, decimals: number = 2): string => {
  const priceInUSD = price / 100000000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(priceInUSD);
};

/**
 * Format price change percentage
 * @param change Price change in basis points
 * @returns Formatted percentage string with color indication
 */
export const formatPriceChange = (change: number): {
  formatted: string;
  color: string;
  isPositive: boolean;
} => {
  const percentage = change / 100;
  const isPositive = percentage >= 0;

  return {
    formatted: `${isPositive ? '+' : ''}${percentage.toFixed(2)}%`,
    color: isPositive ? 'text-green-600' : 'text-red-600',
    isPositive,
  };
};