import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type CreateLoanArguments = {
  lender_addr: string;
  asset_metadata: string;
  principal_amount: number;
  interest_rate: number;
  duration: number;
  collateral_amount: number;
  collateral_metadata?: string;
  num_payments: number;
};

export type ApproveLoanArguments = {
  loan_address: string;
};

export type MakePaymentArguments = {
  loan_address: string;
  payment_number: number;
};

export type DefaultLoanArguments = {
  loan_address: string;
};

export const createLoan = (args: CreateLoanArguments): InputTransactionData => {
  const {
    lender_addr,
    asset_metadata,
    principal_amount,
    interest_rate,
    duration,
    collateral_amount,
    collateral_metadata,
    num_payments
  } = args;

  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::create_loan`,
      functionArguments: [
        lender_addr,
        asset_metadata,
        principal_amount,
        interest_rate,
        duration,
        collateral_amount,
        collateral_metadata ? [collateral_metadata] : [],
        num_payments,
      ],
    },
  };
};

export const approveLoan = (args: ApproveLoanArguments): InputTransactionData => {
  const { loan_address } = args;

  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::approve_loan`,
      functionArguments: [loan_address],
    },
  };
};

export const makePayment = (args: MakePaymentArguments): InputTransactionData => {
  const { loan_address, payment_number } = args;

  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::make_payment`,
      functionArguments: [loan_address, payment_number],
    },
  };
};

export const defaultLoan = (args: DefaultLoanArguments): InputTransactionData => {
  const { loan_address } = args;

  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::default_loan`,
      functionArguments: [loan_address],
    },
  };
};

export const initializeLending = (): InputTransactionData => {
  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::initialize`,
      functionArguments: [],
    },
  };
};

export const createLendingPool = (asset_metadata: string): InputTransactionData => {
  return {
    data: {
      function: `${MODULE_ADDRESS}::lending::create_lending_pool`,
      functionArguments: [asset_metadata],
    },
  };
};