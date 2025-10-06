import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export interface LoanDetails {
  id: string;
  borrower: string;
  lender: string;
  principal_amount: string;
  interest_rate: string;
  duration: string;
  collateral_amount: string;
  created_at: string;
  started_at: string;
  status: number;
  payments_made: string;
  total_repaid: string;
  borrower_reputation: string;
}

export const getLoanDetails = async (loanAddress: string): Promise<LoanDetails | null> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::lending::get_loan_details`,
        functionArguments: [loanAddress],
      },
    });

    if (result && result.length >= 13) {
      return {
        id: result[0] as string,
        borrower: result[1] as string,
        lender: result[2] as string,
        principal_amount: result[3] as string,
        interest_rate: result[4] as string,
        duration: result[5] as string,
        collateral_amount: result[6] as string,
        created_at: result[7] as string,
        started_at: result[8] as string,
        status: result[9] as number,
        payments_made: result[10] as string,
        total_repaid: result[11] as string,
        borrower_reputation: result[12] as string,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting loan details:", error);
    return null;
  }
};