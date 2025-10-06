import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Send, History, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, ExternalLink, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import PaymentForm from './PaymentForm';
import { paymentService } from '@/services/paymentService';
import type { PaymentRequest } from '@/services/paymentService';
import { noditService } from '@/services';
// useGetAccountData import removed - not used in this component
import type { TransactionInfo } from '@/utils/noditTypes';
import { NETWORK } from '@/constants';
import { useToast } from '@/components/ui/use-toast';

interface PaymentDashboardProps {
  className?: string;
}

export function PaymentDashboard({ className }: PaymentDashboardProps) {
  const { account, connected } = useWallet();
  // accountTokenBalance removed - not used in this component
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('send');
  const [recentTransactions, setRecentTransactions] = useState<TransactionInfo[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  // hasApiError state removed - not used

  // Check if transaction hash is valid (not mock data)
  const isValidTransactionHash = (txHash: string): boolean => {
    if (!txHash || txHash.length < 10) return false;

    // Check for mock data patterns
    if (txHash.includes('aaaaaaa') || txHash.includes('bbbbbbb') || txHash === '0x0') {
      return false;
    }

    // Check if it's a proper hex string with 0x prefix and reasonable length
    const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
    if (cleanHash.length < 32) return false; // Aptos transaction hashes should be at least 32 chars

    // Check if it contains only valid hex characters
    return /^[0-9a-fA-F]+$/.test(cleanHash);
  };

  // Generate block explorer URL for transaction
  const getBlockExplorerUrl = (txHash: string): string => {
    const cleanHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;

    switch (NETWORK) {
      case 'mainnet':
        return `https://explorer.aptoslabs.com/txn/${cleanHash}?network=mainnet`;
      case 'testnet':
        return `https://explorer.aptoslabs.com/txn/${cleanHash}?network=testnet`;
      case 'devnet':
        return `https://explorer.aptoslabs.com/txn/${cleanHash}?network=devnet`;
      default:
        // Default to testnet if network is unknown
        return `https://explorer.aptoslabs.com/txn/${cleanHash}?network=testnet`;
    }
  };

  // Format transaction hash for display (show first 6 and last 4 characters)
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Copy transaction hash to clipboard
  const copyTxHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast({
        title: "Copied!",
        description: "Transaction hash copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy transaction hash to clipboard",
      });
    }
  };

  // Load recent transactions when component mounts or account changes
  useEffect(() => {
    if (connected && account?.address) {
      loadRecentTransactions();
    }
  }, [connected, account?.address]);

  const loadRecentTransactions = async () => {
    if (!account?.address) return;

    setIsLoadingTransactions(true);
    try {
      // First try to get real transactions from Nodit
      console.log('Loading transactions for address:', account.address.toStringLong());

      let transactions: TransactionInfo[] = [];

      try {
        // Try Nodit API first
        transactions = await noditService.getAccountTransactions(
          account.address.toStringLong(),
          10
        );

        // Check if we got mock data (indicated by repeated 'a' characters in hash)
        if (transactions.length > 0 && transactions[0].hash.includes('aaaaaaa')) {
          console.warn('Received mock data from Nodit, trying alternative approach');
          transactions = [];
        }

        // If Nodit returned empty array due to 500 error, try Aptos SDK
        if (transactions.length === 0) {
          console.log('Nodit returned empty array, will try Aptos SDK as fallback');
        }
      } catch (noditError) {
        console.warn('Nodit API failed, trying Aptos SDK:', noditError);
      }

      // If Nodit failed or returned mock data, try Aptos SDK directly
      if (transactions.length === 0) {
        try {
          const { aptosClient } = await import('@/utils/aptosClient');
          const aptos = aptosClient();

          const accountTransactions = await aptos.getAccountTransactions({
            accountAddress: account.address.toStringLong(),
            options: {
              limit: 10
            }
          });

          // Convert Aptos SDK format to our TransactionInfo format
          transactions = accountTransactions.map((tx: any) => ({
            version: tx.version?.toString() || '0',
            hash: tx.hash || '0x0',
            state_change_hash: tx.state_change_hash || '0x0',
            event_root_hash: tx.event_root_hash || '0x0',
            gas_used: tx.gas_used?.toString() || '0',
            success: tx.success || false,
            vm_status: tx.vm_status || 'Unknown',
            accumulator_root_hash: tx.accumulator_root_hash || '0x0',
            changes: tx.changes || [],
            events: tx.events || [],
            timestamp: tx.timestamp || new Date().toISOString(),
            type: tx.type || 'user_transaction',
            sender: tx.sender || account.address.toStringLong(),
          }));

          console.log('Successfully loaded transactions from Aptos SDK:', transactions.length);
        } catch (aptosError) {
          console.error('Aptos SDK also failed:', aptosError);
          // Return empty array if both methods fail
          transactions = [];
        }
      } else {
        console.log('Successfully loaded transactions from Nodit:', transactions.length);
      }

      // Filter out invalid transactions (mock data, etc.)
      const validTransactions = transactions.filter(tx => {
        // Keep transactions that have valid hashes OR are clearly real transactions
        return isValidTransactionHash(tx.hash) ||
          (tx.version && tx.version !== '0' && tx.version !== '1000000');
      });

      console.log(`Filtered ${transactions.length} transactions to ${validTransactions.length} valid ones`);
      setRecentTransactions(validTransactions);
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
      setRecentTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handlePaymentSubmit = (_paymentRequest: PaymentRequest) => {
    // Refresh transaction history after successful payment
    setTimeout(() => {
      loadRecentTransactions();
    }, 2000); // Wait a bit for transaction to be indexed

    // Switch to history tab to show the new transaction
    setActiveTab('history');
  };

  const formatTransactionType = (tx: TransactionInfo, userAddress: string) => {
    // Analyze transaction type based on events and payload
    let amount = '';
    let tokenSymbol = '';

    // Check if this is a coin transfer by looking at events
    if (tx.events && tx.events.length > 0) {
      const transferEvent = tx.events.find(event =>
        event.type?.includes('WithdrawEvent') ||
        event.type?.includes('DepositEvent') ||
        event.type?.includes('CoinTransfer')
      );

      if (transferEvent && transferEvent.data) {
        amount = transferEvent.data.amount || '';
        // Try to determine token type from event type
        if (transferEvent.type?.includes('aptos_coin')) {
          tokenSymbol = 'APT';
        } else {
          tokenSymbol = 'Token';
        }
      }
    }

    // Determine if sent or received
    if (tx.sender === userAddress) {
      return {
        type: 'sent',
        icon: ArrowUpRight,
        color: 'text-red-500',
        amount,
        tokenSymbol,
        counterparty: '' // Could extract from events if needed
      };
    } else {
      return {
        type: 'received',
        icon: ArrowDownLeft,
        color: 'text-green-500',
        amount,
        tokenSymbol,
        counterparty: tx.sender || ''
      };
    }
  };

  const getTransactionStatus = (tx: TransactionInfo) => {
    if (tx.success) {
      return { status: 'success', icon: CheckCircle, color: 'text-green-500', label: 'Success' };
    } else {
      return { status: 'failed', icon: XCircle, color: 'text-red-500', label: 'Failed' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown time';
    }
  };

  if (!connected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>P2P Payments</CardTitle>
          <CardDescription>
            Connect your wallet to send and receive payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Please connect your wallet to access payment features
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Payment
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <PaymentForm onPaymentSubmit={handlePaymentSubmit} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Your recent payment activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                    Loading transaction history...
                  </div>
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <History className="h-12 w-12 mx-auto text-gray-300" />
                  <div className="text-gray-500">
                    <div className="font-medium">No transactions found</div>
                    <div className="text-sm">
                      Your transaction history will appear here once you make your first payment
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('send')}
                    className="mt-4"
                  >
                    Send Your First Payment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((tx) => {
                    const txType = formatTransactionType(tx, account?.address.toStringLong() || '');
                    const txStatus = getTransactionStatus(tx);
                    const TypeIcon = txType.icon;
                    const StatusIcon = txStatus.icon;

                    return (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-gray-100 ${txType.color}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium capitalize">
                              {txType.type} {txType.tokenSymbol || 'Transaction'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTimestamp(tx.timestamp)}
                            </div>
                            {txType.amount && txType.tokenSymbol && (
                              <div className="text-sm font-medium">
                                {paymentService.formatAmount(parseInt(txType.amount), 8)} {txType.tokenSymbol}
                              </div>
                            )}
                            {isValidTransactionHash(tx.hash) ? (
                              <div className="flex items-center gap-2 mt-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={getBlockExplorerUrl(tx.hash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                      >
                                        <span>{formatTxHash(tx.hash)}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View transaction details on Aptos Explorer</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => copyTxHash(tx.hash)}
                                        className="text-xs text-gray-500 hover:text-gray-700 p-1"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copy full transaction hash</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 mt-1">
                                Transaction hash not available
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={tx.success ? 'default' : 'destructive'} className="text-xs">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {txStatus.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Gas: {tx.gas_used}
                          </div>
                          <div className="text-xs text-gray-500">
                            Version: {tx.version}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="text-center pt-4 space-y-2">
                    <Button
                      variant="outline"
                      onClick={loadRecentTransactions}
                      disabled={isLoadingTransactions}
                    >
                      {isLoadingTransactions ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <div className="text-xs text-gray-400">
                      Showing {recentTransactions.length} recent transactions
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PaymentDashboard;