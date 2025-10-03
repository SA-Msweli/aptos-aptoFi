"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aptosClient } from "@/lib/aptos";
import { getAccountAPTBalance } from "@/view-functions/getAccountBalance";
import { transferAPT } from "@/entry-functions/transferAPT";

export function TransferAPT() {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();

  const [aptBalance, setAptBalance] = useState<number>(0);
  const [recipient, setRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const { data: balance } = useQuery({
    queryKey: ["apt-balance", account?.address],
    queryFn: () => getAccountAPTBalance(account!.address.toString()),
    enabled: !!account,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  useEffect(() => {
    if (balance !== undefined) {
      setAptBalance(balance);
    }
  }, [balance]);

  const handleTransfer = async () => {
    if (!account || !recipient || transferAmount <= 0) return;

    try {
      setIsTransferring(true);

      const transaction = transferAPT({
        recipient,
        amount: transferAmount * 100000000, // Convert to octas (1 APT = 100,000,000 octas)
      });

      const response = await signAndSubmitTransaction(transaction);

      // Wait for transaction to be confirmed
      const committedTransaction = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });

      console.log("Transfer successful:", committedTransaction);

      // Invalidate and refetch balance
      queryClient.invalidateQueries({
        queryKey: ["apt-balance", account?.address],
      });

      // Reset form
      setRecipient("");
      setTransferAmount(0);

    } catch (error) {
      console.error("Transfer failed:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!account) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Transfer APT</h3>
        <p className="text-gray-600">Please connect your wallet to transfer APT.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Transfer APT</h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Your Balance</p>
        <p className="text-2xl font-bold text-blue-600">
          {(aptBalance / 100000000).toFixed(8)} APT
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <Input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (APT)
          </label>
          <Input
            type="number"
            placeholder="0.0"
            value={transferAmount || ""}
            onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
            className="w-full"
            step="0.00000001"
            min="0"
          />
        </div>

        <Button
          onClick={handleTransfer}
          disabled={!recipient || transferAmount <= 0 || isTransferring || transferAmount > aptBalance / 100000000}
          className="w-full"
        >
          {isTransferring ? "Transferring..." : "Transfer APT"}
        </Button>
      </div>
    </div>
  );
}