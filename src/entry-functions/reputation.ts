import { CONTRACT_ADDRESSES } from "@/lib/constants";

export type InitializeReputationArguments = {};

export const initializeReputation = (args: InitializeReputationArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.REPUTATION_SYSTEM}::initialize_reputation`,
      functionArguments: [],
    },
  };
};

export type UpdateTransactionScoreArguments = {
  userAddress: string;
  amount: number;
  frequency: number;
};

export const updateTransactionScore = (args: UpdateTransactionScoreArguments) => {
  const { userAddress, amount, frequency } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.REPUTATION_SYSTEM}::update_transaction_score`,
      functionArguments: [userAddress, amount.toString(), frequency.toString()],
    },
  };
};

export type UpdateLendingScoreArguments = {
  userAddress: string;
  repaymentHistory: boolean[];
};

export const updateLendingScore = (args: UpdateLendingScoreArguments) => {
  const { userAddress, repaymentHistory } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.REPUTATION_SYSTEM}::update_lending_score`,
      functionArguments: [userAddress, repaymentHistory],
    },
  };
};