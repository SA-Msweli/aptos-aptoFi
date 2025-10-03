import { InputSubmitTransactionData } from "@aptos-labs/ts-sdk";

export type TransferAPTArguments = {
  recipient: string;
  amount: number;
};

export const transferAPT = (args: TransferAPTArguments): InputSubmitTransactionData => {
  const { recipient, amount } = args;
  return {
    function: "0x1::aptos_account::transfer",
    functionArguments: [recipient, amount.toString()],
  };
};