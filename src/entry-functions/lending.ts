import { CONTRACT_ADDRESSES } from "@/lib/constants";

export type SupplyArguments = {
  coinType: string;
  amount: number;
};

export const supply = (args: SupplyArguments) => {
  const { coinType, amount } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::supply_liquidity`,
      typeArguments: [coinType],
      functionArguments: [amount.toString()],
    },
  };
};

export type BorrowArguments = {
  coinType: string;
  amount: number;
};

export const borrow = (args: BorrowArguments) => {
  const { coinType, amount } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::request_loan`,
      typeArguments: [coinType],
      functionArguments: [amount.toString()],
    },
  };
};

export type RepayArguments = {
  coinType: string;
  amount: number;
};

export const repay = (args: RepayArguments) => {
  const { coinType, amount } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::repay_loan`,
      typeArguments: [coinType],
      functionArguments: [amount.toString()],
    },
  };
};

export type WithdrawArguments = {
  coinType: string;
  amount: number;
};

export const withdraw = (args: WithdrawArguments) => {
  const { coinType, amount } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::withdraw_liquidity`,
      typeArguments: [coinType],
      functionArguments: [amount.toString()],
    },
  };
};

export type SetupAutoPaymentArguments = {
  loanId: string;
  enabled: boolean;
  frequency: string;
  amount: number;
  sourceAccount: string;
  customDays?: number;
};

export const setupAutoPayment = (args: SetupAutoPaymentArguments) => {
  const { loanId, enabled, frequency, amount, sourceAccount, customDays = 0 } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::setup_auto_payment`,
      typeArguments: [],
      functionArguments: [
        loanId,
        enabled,
        frequency,
        amount.toString(),
        sourceAccount,
        customDays.toString(),
      ],
    },
  };
};

export type ExecuteScheduledPaymentArguments = {
  loanId: string;
};

export const executeScheduledPayment = (args: ExecuteScheduledPaymentArguments) => {
  const { loanId } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::execute_scheduled_payment`,
      typeArguments: [],
      functionArguments: [loanId],
    },
  };
};

export type UpdatePaymentScheduleArguments = {
  loanId: string;
  frequency: string;
  amount: number;
  customDays?: number;
};

export const updatePaymentSchedule = (args: UpdatePaymentScheduleArguments) => {
  const { loanId, frequency, amount, customDays = 0 } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::update_payment_schedule`,
      typeArguments: [],
      functionArguments: [
        loanId,
        frequency,
        amount.toString(),
        customDays.toString(),
      ],
    },
  };
};