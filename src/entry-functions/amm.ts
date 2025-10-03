import { CONTRACT_ADDRESSES } from "@/lib/constants";

export type SwapArguments = {
  coinTypeA: string;
  coinTypeB: string;
  amountIn: number;
  minAmountOut: number;
};

export const swap = (args: SwapArguments) => {
  const { coinTypeA, coinTypeB, amountIn, minAmountOut } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.AMM}::swap_exact_input`,
      typeArguments: [coinTypeA, coinTypeB],
      functionArguments: [amountIn.toString(), minAmountOut.toString()],
    },
  };
};

export type AddLiquidityArguments = {
  coinTypeA: string;
  coinTypeB: string;
  amountADesired: number;
  amountBDesired: number;
  amountAMin: number;
  amountBMin: number;
};

export const addLiquidity = (args: AddLiquidityArguments) => {
  const { coinTypeA, coinTypeB, amountADesired, amountBDesired, amountAMin, amountBMin } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.AMM}::add_liquidity`,
      typeArguments: [coinTypeA, coinTypeB],
      functionArguments: [
        amountADesired.toString(),
        amountBDesired.toString(),
        amountAMin.toString(),
        amountBMin.toString(),
      ],
    },
  };
};

export type RemoveLiquidityArguments = {
  coinTypeA: string;
  coinTypeB: string;
  lpTokensToBurn: number;
  amountAMin: number;
  amountBMin: number;
};

export const removeLiquidity = (args: RemoveLiquidityArguments) => {
  const { coinTypeA, coinTypeB, lpTokensToBurn, amountAMin, amountBMin } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.AMM}::remove_liquidity`,
      typeArguments: [coinTypeA, coinTypeB],
      functionArguments: [
        lpTokensToBurn.toString(),
        amountAMin.toString(),
        amountBMin.toString(),
      ],
    },
  };
};

// New function for creating pools in production AMM
export type CreatePoolArguments = {
  coinTypeA: string;
  coinTypeB: string;
  initialA: number;
  initialB: number;
};

export const createPool = (args: CreatePoolArguments) => {
  const { coinTypeA, coinTypeB, initialA, initialB } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.AMM}::create_pool`,
      typeArguments: [coinTypeA, coinTypeB],
      functionArguments: [
        initialA.toString(),
        initialB.toString(),
      ],
    },
  };
};