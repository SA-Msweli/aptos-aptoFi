import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS, NETWORK } from "@/constants";

const aptos = new Aptos(new AptosConfig({ network: NETWORK as Network }));

/**
 * Check if a DID exists for the given address
 */
export const didExists = async (ownerAddress: string): Promise<boolean> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::did::did_exists`,
        functionArguments: [ownerAddress],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking DID existence:", error);
    return false;
  }
};

// Reputation functionality removed

/**
 * Check if address is eligible for loans
 */
export const isLoanEligible = async (ownerAddress: string, minCreditScore: number = 600): Promise<boolean> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::did::is_loan_eligible`,
        functionArguments: [ownerAddress, minCreditScore],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    return false;
  }
};

/**
 * Get risk assessment for P2P payments
 */
export const getRiskAssessment = async (ownerAddress: string): Promise<number> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::did::get_risk_assessment`,
        functionArguments: [ownerAddress],
      },
    });
    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error fetching risk assessment:", error);
    return 2; // High risk default
  }
};