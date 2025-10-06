import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Send, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

import { paymentService } from '@/services/paymentService';
import type { PaymentValidationResult, PaymentRequest } from '@/services/paymentService';
import { useGetAccountData } from '@/hooks/useGetAccountData';
import TokenSelector from './TokenSelector';

interface PaymentFormProps {
  onPaymentSubmit?: (paymentRequest: PaymentRequest) => void;
  onCancel?: () => void;
}

export function PaymentForm({ onPaymentSubmit, onCancel }: PaymentFormProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();
  const { accountTokenBalance } = useGetAccountData();

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // Token state
  const [availableTokens, setAvailableTokens] = useState<Array<{
    coinType: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: number;
    formattedBalance: string;
  }>>([]);
  const [selectedToken, setSelectedToken] = useState<{
    coinType: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: number;
    formattedBalance: string;
  } | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Validation state
  const [recipientValidation, setRecipientValidation] = useState<PaymentValidationResult | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load available tokens when account changes
  useEffect(() => {
    const loadTokens = async () => {
      if (!connected || !account?.address) {
        setAvailableTokens([]);
        setSelectedToken(null);
        return;
      }

      setLoadingTokens(true);
      try {
        const tokens = await paymentService.getAllTokenBalances(account.address.toStringLong());
        setAvailableTokens(tokens);

        // Select APT as default token
        const aptToken = tokens.find(token => token.symbol === 'APT');
        if (aptToken) {
          setSelectedToken(aptToken);
        } else if (tokens.length > 0) {
          setSelectedToken(tokens[0]);
        }
      } catch (error) {
        console.error('Failed to load token balances:', error);
        // Fallback to APT only
        const fallbackTokens = [{
          coinType: "0x1::aptos_coin::AptosCoin",
          name: "Aptos Coin",
          symbol: "APT",
          decimals: 8,
          balance: 0,
          formattedBalance: accountTokenBalance || '0.0000'
        }];
        setAvailableTokens(fallbackTokens);
        setSelectedToken(fallbackTokens[0]);
      } finally {
        setLoadingTokens(false);
      }
    };

    loadTokens();
  }, [connected, account?.address, accountTokenBalance]);

  // Validate recipient address when it changes
  useEffect(() => {
    const validateRecipient = async () => {
      if (!recipient.trim()) {
        setRecipientValidation(null);
        return;
      }

      setIsValidatingRecipient(true);
      try {
        const validation = await paymentService.validateRecipientAddress(recipient.trim());
        setRecipientValidation(validation);
      } catch (error) {
        console.error('Recipient validation failed:', error);
        setRecipientValidation({
          isValid: false,
          warnings: ['Failed to validate recipient address'],
          riskLevel: 'high'
        });
      } finally {
        setIsValidatingRecipient(false);
      }
    };

    const timeoutId = setTimeout(validateRecipient, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [recipient]);

  // Validate amount when it changes
  useEffect(() => {
    if (!amount.trim() || !selectedToken) {
      setAmountError(null);
      return;
    }

    try {
      const parsedAmount = paymentService.parseAmount(amount, selectedToken.decimals);
      const validation = paymentService.validatePaymentAmount(parsedAmount, selectedToken.balance, selectedToken.coinType);

      if (!validation.isValid) {
        setAmountError(validation.error || 'Invalid amount');
      } else {
        setAmountError(null);
      }
    } catch (error) {
      setAmountError('Invalid amount format');
    }
  }, [amount, selectedToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !account) {
      toast({
        variant: 'destructive',
        title: 'Wallet not connected',
        description: 'Please connect your wallet to send payments.',
      });
      return;
    }

    if (!recipientValidation?.isValid || amountError) {
      return;
    }

    if (!selectedToken) {
      toast({
        variant: 'destructive',
        title: 'No token selected',
        description: 'Please select a token to send.',
      });
      return;
    }

    try {
      const parsedAmount = paymentService.parseAmount(amount, selectedToken.decimals);
      const normalizedRecipient = paymentService.normalizeAddress(recipient.trim());

      const paymentRequest: PaymentRequest = {
        recipient: normalizedRecipient,
        amount: parsedAmount,
        coinType: selectedToken.coinType,
        memo: memo.trim() || undefined,
      };

      if (recipientValidation.riskLevel === 'high') {
        setShowConfirmation(true);
        return;
      }

      await executePayment(paymentRequest);
    } catch (error) {
      console.error('Payment preparation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: 'Failed to prepare payment transaction.',
      });
    }
  };

  const executePayment = async (paymentRequest: PaymentRequest) => {
    setIsSubmitting(true);
    try {
      const transactionData = paymentService.preparePaymentTransaction(paymentRequest);

      await signAndSubmitTransaction(transactionData);

      const tokenInfo = paymentService.getTokenInfo(paymentRequest.coinType);
      const tokenSymbol = tokenInfo?.symbol || 'tokens';
      const tokenDecimals = tokenInfo?.decimals || 8;

      toast({
        title: 'Payment sent successfully',
        description: `Sent ${paymentService.formatAmount(paymentRequest.amount, tokenDecimals)} ${tokenSymbol} to ${paymentRequest.recipient.slice(0, 6)}...${paymentRequest.recipient.slice(-4)}`,
      });

      // Reset form
      setRecipient('');
      setAmount('');
      setMemo('');
      setRecipientValidation(null);
      setShowConfirmation(false);

      // Notify parent component
      onPaymentSubmit?.(paymentRequest);

    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: 'Transaction was rejected or failed to process.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskLevelIcon = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (showConfirmation) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            High Risk Payment
          </CardTitle>
          <CardDescription>
            This payment has been flagged as high risk. Please review the details carefully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient</Label>
            <div className="p-2 bg-gray-50 rounded text-sm font-mono break-all">
              {recipient}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="p-2 bg-gray-50 rounded text-sm">
              {amount} {selectedToken?.symbol || 'tokens'}
            </div>
          </div>

          {recipientValidation?.warnings && recipientValidation.warnings.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {recipientValidation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => executePayment({
                recipient: paymentService.normalizeAddress(recipient.trim()),
                amount: paymentService.parseAmount(amount, selectedToken?.decimals || 8),
                coinType: selectedToken?.coinType || "0x1::aptos_coin::AptosCoin",
                memo: memo.trim() || undefined,
              })}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Anyway'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Payment
        </CardTitle>
        <CardDescription>
          Send tokens to another Aptos address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label>Select Token</Label>
            {loadingTokens ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Loading tokens...</span>
              </div>
            ) : selectedToken && availableTokens.length > 0 ? (
              <TokenSelector
                selectedToken={selectedToken}
                availableTokens={availableTokens}
                onTokenSelect={setSelectedToken}
                showBalance={true}
              />
            ) : (
              <div className="p-3 border rounded-md text-sm text-gray-500">
                No tokens available
              </div>
            )}
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="0x1234..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={recipientValidation?.isValid === false ? 'border-red-500' : ''}
            />

            {isValidatingRecipient && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Validating address...
              </div>
            )}

            {recipientValidation && !isValidatingRecipient && (
              <div className={`flex items-center gap-2 text-sm ${getRiskLevelColor(recipientValidation.riskLevel)}`}>
                {getRiskLevelIcon(recipientValidation.riskLevel)}
                {recipientValidation.isValid ? (
                  <span>
                    Address verified - {recipientValidation.riskLevel} risk
                    {recipientValidation.reputation && (
                      <span className="text-gray-500 ml-1">
                        ({recipientValidation.reputation.transaction_count} transactions)
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Invalid address</span>
                )}
              </div>
            )}

            {recipientValidation?.warnings && recipientValidation.warnings.length > 0 && (
              <Alert variant={recipientValidation.riskLevel === 'high' ? 'destructive' : 'warning'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {recipientValidation.warnings.slice(0, 2).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({selectedToken?.symbol || 'tokens'})</Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={amountError ? 'border-red-500' : ''}
            />

            {amountError && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {amountError}
              </div>
            )}

            {selectedToken && (
              <div className="text-sm text-gray-500">
                Available: {selectedToken.formattedBalance} {selectedToken.symbol}
              </div>
            )}
          </div>

          {/* Memo (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Input
              id="memo"
              type="text"
              placeholder="Payment description..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !connected ||
                !selectedToken ||
                !recipientValidation?.isValid ||
                !!amountError ||
                !amount.trim() ||
                isSubmitting ||
                isValidatingRecipient ||
                loadingTokens
              }
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PaymentForm;