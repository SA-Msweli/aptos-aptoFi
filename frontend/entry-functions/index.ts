// Existing entry functions
export { claimRewards } from "./claimRewards";
export { compound } from "./compound";
export { createRewardSchedule } from "./createRewardSchedule";
export { stake } from "./stake";
export { unstake } from "./unstake";
export { transferToken } from "./transfer";

// Lending entry functions
export {
  createLoan,
  approveLoan,
  makePayment,
  defaultLoan,
  initializeLending,
  createLendingPool
} from "./lending";

// Export types
export type { CreateRewardScheduleArguments } from "./createRewardSchedule";
export type { StakeTokenArguments } from "./stake";
export type { UnstakeArguments } from "./unstake";
export type { TransferTokenArguments } from "./transfer";
export type {
  CreateLoanArguments,
  ApproveLoanArguments,
  MakePaymentArguments,
  DefaultLoanArguments
} from "./lending";