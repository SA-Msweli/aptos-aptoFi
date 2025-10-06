import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { X, ArrowUpRight, AlertCircle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { vaultService, VaultInfo } from '@/services/vaultService';
import { useToast } from '@/components/ui/use-toast';

interface VaultDepositFormProps {
  vault: VaultInfo;
  onClose: () => void;
  onSuccess: () => void;
}

export function VaultDepositForm({ vault, onClose, onSuccess }: VaultDepositFormProps) {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const depositAmount = parseFloat(amount) * 100000000; // Convert to smallest units (8 decimals)

    setIsSubmitting(true);
    setError(null);

    try {
      const txHash = await vaultService.deposit(account, {
        vaultId: vault.id,
        amount: depositAmount,
      });

      toast({
        title: "Deposit Successful!",
        description: `Successfully deposited ${amount} tokens into Vault #${vault.id}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Deposit failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deposit';
      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Deposit Failed",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrategyColor = (strategyType: number) => {
    switch (strategyType) {
      case 0: return 'bg-green-100 text-green-800';
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100000000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Deposit to Vault #{vault.id}
              </CardTitle>
              <CardDescription>
                Add funds to start earning automated yield
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vault Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Strategy</span>
              <Badge className={getStrategyColor(vault.strategyType)}>
                {vaultService.getStrategyName(vault.strategyType)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Target APY</span>
              <span className="text-sm font-medium text-green-600">
                {vaultService.formatApy(vault.targetApy)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Value Locked</span>
              <span className="text-sm font-medium">
                {formatCurrency(vault.totalAssets)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {vaultService.getStrategyDescription(vault.strategyType)}
            </div>
          </div>

          {/* Deposit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Deposit Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.00000001"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="pr-16"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  APT
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Minimum deposit: {vaultService.formatAmount(vault.minimumDeposit || 0)} APT
              </div>
            </div>

            {/* Estimated Returns */}
            {amount && parseFloat(amount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  Estimated Annual Returns
                </div>
                <div className="space-y-1 text-xs text-blue-700">
                  <div className="flex justify-between">
                    <span>Deposit Amount:</span>
                    <span>{amount} APT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target APY:</span>
                    <span>{vaultService.formatApy(vault.targetApy)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Est. Annual Yield:</span>
                    <span>
                      {(parseFloat(amount) * (vault.targetApy / 10000)).toFixed(4)} APT
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Depositing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Deposit
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Risk Disclaimer */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-700">
                <div className="font-medium mb-1">Risk Disclaimer</div>
                <div>
                  Vault investments carry risk. Past performance does not guarantee future results.
                  Your capital is at risk and you may lose some or all of your investment.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VaultDepositForm;