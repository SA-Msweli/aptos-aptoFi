import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export interface NextPayment {
  payment_number: string;
  due_date: string;
  total_amount: string;
  is_overdue: boolean;
}

export const getNextPaymentDue = async (loanAddress: string): Promise<NextPayment | null> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::lending::get_next_payment_due`,
        functionArguments: [loanAddress],
      },
    });

    if (result && result.length >= 4) {
      return {
        payment_number: result[0] as string,
        due_date: result[1] as string,
        total_amount: result[2] as string,
        is_overdue: result[3] as boolean,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting next payment due:", error);
    return null;
  }
};