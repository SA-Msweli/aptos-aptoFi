import { Account, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

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

export interface PaymentSchedule {
  payment_number: string;
  due_date: string;
  principal_amount: string;
  interest_amount: string;
  total_amount: string;
  is_paid: boolean;
  paid_timestamp: string;
}

export interface NextPayment {
  payment_number: string;
  due_date: string;
  total_amount: string;
  is_overdue: boolean;
}

export interface LoanRequest {
  lender_addr: string;
  asset_metadata: string;
  principal_amount: number;
  interest_rate: number;
  duration: number;
  collateral_amount: number;
  collateral_metadata?: string;
  num_payments: number;
}

export class LendingService {
  private aptos: Aptos;

  constructor() {
    const config = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(config);
  }

  /**
   * Create a new loan request
   */
  async createLoan(
    account: Account,
    loanRequest: LoanRequest
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::lending::create_loan`,
          functionArguments: [
            loanRequest.lender_addr,
            loanRequest.asset_metadata,
            loanRequest.principal_amount,
            loanRequest.interest_rate,
            loanRequest.duration,
            loanRequest.collateral_amount,
            loanRequest.collateral_metadata ? [loanRequest.collateral_metadata] : [],
            loanRequest.num_payments,
          ],
        },
      });

      const committedTransaction = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      return executedTransaction.hash;
    } catch (error) {
      console.error("Error creating loan:", error);
      throw error;
    }
  }

  /**
   * Approve and fund a loan (called by lender)
   */
  async approveLoan(
    account: Account,
    loanAddress: string
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::lending::approve_loan`,
          functionArguments: [loanAddress],
        },
      });

      const committedTransaction = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      return executedTransaction.hash;
    } catch (error) {
      console.error("Error approving loan:", error);
      throw error;
    }
  }

  /**
   * Make a scheduled payment
   */
  async makePayment(
    account: Account,
    loanAddress: string,
    paymentNumber: number
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::lending::make_payment`,
          functionArguments: [loanAddress, paymentNumber],
        },
      });

      const committedTransaction = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      return executedTransaction.hash;
    } catch (error) {
      console.error("Error making payment:", error);
      throw error;
    }
  }

  /**
   * Default a loan (called by lender)
   */
  async defaultLoan(
    account: Account,
    loanAddress: string
  ): Promise<string> {
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::lending::default_loan`,
          functionArguments: [loanAddress],
        },
      });

      const committedTransaction = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      return executedTransaction.hash;
    } catch (error) {
      console.error("Error defaulting loan:", error);
      throw error;
    }
  }

  /**
   * Get loan details
   */
  async getLoanDetails(loanAddress: string): Promise<LoanDetails | null> {
    try {
      const result = await this.aptos.view({
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
  }

  /**
   * Get payment schedule for a loan
   */
  async getPaymentSchedule(loanAddress: string): Promise<PaymentSchedule[]> {
    try {
      const result = await this.aptos.view({
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
  }

  /**
   * Get next payment due for a loan
   */
  async getNextPaymentDue(loanAddress: string): Promise<NextPayment | null> {
    try {
      const result = await this.aptos.view({
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
  }

  /**
   * Calculate interest rate based on reputation score
   */
  async calculateInterestRateForReputation(reputationScore: number): Promise<number> {
    try {
      const result = await this.aptos.view({
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
  }

  /**
   * Helper function to format loan status
   */
  formatLoanStatus(status: number): string {
    switch (status) {
      case 0:
        return "Pending";
      case 1:
        return "Active";
      case 2:
        return "Completed";
      case 3:
        return "Defaulted";
      default:
        return "Unknown";
    }
  }

  /**
   * Helper function to format interest rate
   */
  formatInterestRate(rate: string): string {
    const rateNum = parseInt(rate);
    return `${(rateNum / 100).toFixed(2)}%`;
  }

  /**
   * Helper function to format duration
   */
  formatDuration(durationSeconds: string): string {
    const seconds = parseInt(durationSeconds);
    const days = Math.floor(seconds / (24 * 60 * 60));
    const months = Math.floor(days / 30);

    if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  /**
   * Helper function to format timestamp
   */
  formatTimestamp(timestamp: string): string {
    const timestampNum = parseInt(timestamp);
    if (timestampNum === 0) return "Not set";

    const date = new Date(timestampNum * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }
}

export const lendingService = new LendingService();