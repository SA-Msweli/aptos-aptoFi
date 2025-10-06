import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type TransferTokenArguments = {
  recipient: string; // The recipient's address
  amount: number; // The amount to transfer in smallest units
  coinType?: string; // Optional coin type, defaults to APT
};

/**
 * Transfer tokens to another address
 * Uses standard Aptos coin transfer functionality
 */
export const transferToken = (args: TransferTokenArguments): InputTransactionData => {
  const { recipient, amount, coinType = "0x1::aptos_coin::AptosCoin" } = args;

  return {
    data: {
      function: "0x1::aptos_account::transfer_coins",
      typeArguments: [coinType],
      functionArguments: [recipient, amount],
    },
  };
};