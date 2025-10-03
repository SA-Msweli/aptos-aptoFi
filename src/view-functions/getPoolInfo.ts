import { aptosClient } from "@/lib/aptos";
import { MODULE_ADDRESS, CONTRACT_ADDRESSES } from "@/lib/constants";

export interface PoolInfo {
  coinTypeA: string;
  coinTypeB: string;
  reserveA: number;
  reserveB: number;
  lpSupply: number;
  feeRate: number;
}

export const getPoolInfo = async (
  coinTypeA: string,
  coinTypeB: string
): Promise<PoolInfo | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.AMM}::get_pool_info`,
        typeArguments: [coinTypeA, coinTypeB],
        functionArguments: [],
      },
    });

    if (result && result.length >= 5) {
      return {
        coinTypeA,
        coinTypeB,
        reserveA: parseInt(result[0] as string),
        reserveB: parseInt(result[1] as string),
        lpSupply: parseInt(result[2] as string),
        feeRate: parseInt(result[3] as string) / 10000, // Convert from basis points
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching pool info:", error);
    return null;
  }
};

export const getAllPools = async (): Promise<PoolInfo[]> => {
  try {
    // Get total pools count first
    const totalPoolsResult = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.AMM}::get_total_pools`,
        functionArguments: [],
      },
    });

    const totalPools = parseInt(totalPoolsResult[0] as string);
    console.log(`Found ${totalPools} total pools`);

    // For now, return empty array as we'd need to know the specific coin types
    // In a production app, you'd maintain a registry of known pools
    return [];
  } catch (error) {
    console.error("Error fetching all pools:", error);
    return [];
  }
};

// New helper functions for the production AMM
export const getSwapQuote = async (
  coinTypeIn: string,
  coinTypeOut: string,
  amountIn: number
): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.AMM}::get_swap_quote`,
        typeArguments: [coinTypeIn, coinTypeOut],
        functionArguments: [amountIn.toString()],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error getting swap quote:", error);
    return 0;
  }
};

export const getUserLPBalance = async (
  userAddress: string,
  coinTypeA: string,
  coinTypeB: string
): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.AMM}::get_user_lp_balance`,
        typeArguments: [coinTypeA, coinTypeB],
        functionArguments: [userAddress],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error getting user LP balance:", error);
    return 0;
  }
};

export const poolExists = async (
  coinTypeA: string,
  coinTypeB: string
): Promise<boolean> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.AMM}::pool_exists`,
        typeArguments: [coinTypeA, coinTypeB],
        functionArguments: [],
      },
    });

    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking if pool exists:", error);
    return false;
  }
};