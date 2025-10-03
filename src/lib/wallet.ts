import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "./aptos";
import { 
  AccountAddress,
  UserTransactionResponse
} from "@aptos-labs/ts-sdk";

export interface WalletBalance {
  apt: number;
  usd: number;
}

export interface TransactionHistory {
  hash: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  type: 'sent' | 'received';
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Custom hook for wallet operations
 */
export function useWalletOperations() {
  const { account, signAndSubmitTransaction, connected } = useWallet();

  /**
   * Get APT balance for connected account
   */
  const getBalance = async (): Promise<WalletBalance> => {
    if (!account) {
      throw new Error('No wallet connected');
    }

    try {
      const resources = await aptos.getAccountResources({
        accountAddress: account.address,
      });

      const coinResource = resources.find(
        (resource) => resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );

      if (coinResource) {
        const balance = (coinResource.data as any).coin.value;
        const aptBalance = parseInt(balance) / 100000000; // Convert from octas to APT
        
        // Mock USD conversion (in real app, fetch from price API)
        const usdBalance = aptBalance * 8.5; // Mock APT price

        return {
          apt: aptBalance,
          usd: usdBalance,
        };
      }

      return { apt: 0, usd: 0 };
    } catch (error) {
      console.error('Failed to get balance:', error);
      return { apt: 0, usd: 0 };
    }
  };

  /**
   * Send APT to another address
   */
  const sendAPT = async (toAddress: string, amount: number): Promise<string> => {
    if (!account) {
      throw new Error('No wallet connected');
    }

    try {
      const transaction = await signAndSubmitTransaction({
        data: {
          function: '0x1::coin::transfer',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [toAddress, (amount * 100000000).toString()], // Convert APT to octas
        },
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error('Transaction failed');
    }
  };

  /**
   * Get transaction history for connected account
   */
  const getTransactionHistory = async (): Promise<TransactionHistory[]> => {
    if (!account) {
      return [];
    }

    try {
      const transactions = await aptos.getAccountTransactions({
        accountAddress: account.address,
        options: { limit: 50 },
      });

      return transactions.map((tx: any) => ({
        hash: tx.hash,
        sender: tx.sender,
        receiver: tx.payload?.arguments?.[0] || '',
        amount: tx.payload?.arguments?.[1] ? parseInt(tx.payload.arguments[1]) / 100000000 : 0,
        timestamp: parseInt(tx.timestamp),
        type: tx.sender === account.address.toString() ? 'sent' : 'received',
        status: tx.success ? 'confirmed' : 'failed',
      }));
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  };

  /**
   * Fund account from faucet (testnet only)
   */
  const fundFromFaucet = async (): Promise<boolean> => {
    if (!account) {
      throw new Error('No wallet connected');
    }

    try {
      await aptos.fundAccount({
        accountAddress: account.address,
        amount: 100000000, // 1 APT in octas
      });

      return true;
    } catch (error) {
      console.error('Failed to fund from faucet:', error);
      return false;
    }
  };

  /**
   * Execute contract function
   */
  const executeContract = async (
    contractAddress: string,
    moduleName: string,
    functionName: string,
    typeArguments: string[] = [],
    functionArguments: any[] = []
  ): Promise<string> => {
    if (!account) {
      throw new Error('No wallet connected');
    }

    try {
      const transaction = await signAndSubmitTransaction({
        data: {
          function: `${contractAddress}::${moduleName}::${functionName}`,
          typeArguments,
          functionArguments,
        },
      });

      return transaction.hash;
    } catch (error) {
      console.error('Failed to execute contract function:', error);
      throw new Error('Contract execution failed');
    }
  };

  /**
   * Check if address is valid
   */
  const isValidAddress = (address: string): boolean => {
    try {
      AccountAddress.from(address);
      return true;
    } catch {
      return false;
    }
  };

  return {
    account,
    connected,
    getBalance,
    sendAPT,
    getTransactionHistory,
    fundFromFaucet,
    executeContract,
    isValidAddress,
  };
}

/**
 * Format address for display
 */
export function formatAddress(address: string, short = true): string {
  if (!address) return '';
  
  if (short) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return address;
}

/**
 * Format APT amount
 */
export function formatAPT(amount: number, decimals = 4): string {
  return `${amount.toFixed(decimals)} APT`;
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number, decimals = 2): string {
  return `$${amount.toFixed(decimals)}`;
}

/**
 * Convert octas to APT
 */
export function octasToAPT(octas: string | number): number {
  return parseInt(octas.toString()) / 100000000;
}

/**
 * Convert APT to octas
 */
export function aptToOctas(apt: number): string {
  return (apt * 100000000).toString();
}