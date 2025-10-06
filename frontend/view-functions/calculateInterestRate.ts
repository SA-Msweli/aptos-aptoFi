import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export const calculateInterestRateForReputation = async (reputationScore: number): Promise<number> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::lending::calculate_interest_rate_for_reputation`,
        functionArguments: [reputationScore],
      },
    });

    return result[0] as number;
  } catch (error) {
    console.error("Error calculating interest rate:", error);
    return 1500; // Default 15%
  }
};