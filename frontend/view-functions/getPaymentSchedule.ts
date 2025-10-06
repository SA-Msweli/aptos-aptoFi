import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export interface PaymentSchedule {
  payment_number: string;
  due_date: string;
  principal_amount: string;
  interest_amount: string;
  total_amount: string;
  is_paid: boolean;
  paid_timestamp: string;
}

export const getPaymentSchedule = async (loanAddress: string): Promise<PaymentSchedule[]> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::lending::get_payment_schedule`,
        functionArguments: [loanAddress],
      },
    });

    if (result && Array.isArray(result[0])) {
      return (result[0] as any[]).map((payment: any) => ({
        payment_number: payment.payment_number,
        due_date: payment.due_date,
        principal_amount: payment.principal_amount,
        interest_amount: payment.interest_amount,
        total_amount: payment.total_amount,
        is_paid: payment.is_paid,
        paid_timestamp: payment.paid_timestamp,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting payment schedule:", error);
    return [];
  }
};