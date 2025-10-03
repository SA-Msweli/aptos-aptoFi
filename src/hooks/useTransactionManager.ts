"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/lib/aptos";

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export function useTransactionManager() {
  const { signAndSubmitTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTransaction = async (transaction: any): Promise<TransactionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await signAndSubmitTransaction({
        data: transaction.data,
      });

      // Wait for transaction to be confirmed
      const committedTransaction = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });

      console.log("Transaction successful:", committedTransaction);

      return {
        success: true,
        hash: response.hash,
      };
    } catch (err: any) {
      const errorMessage = err.message || "Transaction failed";
      setError(errorMessage);
      console.error("Transaction failed:", err);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    submitTransaction,
    isLoading,
    error,
    clearError,
  };
}