import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { X, ArrowDownRight, AlertCircle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

import { vaultService, VaultInfo, VaultPosition } from '@/services/vaultService';
import { useToast } from '@/components/ui/use-toast';

interface VaultWithdrawFormProps {
  vault: VaultInfo;
  position: VaultPosition | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function VaultWithdrawForm({ vault, position, onClose, onSuccess }: VaultWithdrawFormProps) {
  const { account } = useWallet();
  const { toast } = useToast();

  const [withdrawPercentage, setWithdrawPercentage] = useState(25);
  const [customShares, setCustomShares] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!position) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Position Found</CardTitle>
            <CardDescription>
              You don't have any shares in this vault.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateSharesToWithdraw = () => {
    if (useCustomAmount && customShares) {
      return Math.min(parseFloat(customShares), position.shares);
    }
    return Math.floor((position.shares * withdrawPercentage) / 100);
  };

  const calculateWithdrawValue = () => {
    const sharesToWithdraw = calculateSharesToWithdraw();
    if (vault.totalShares === 0) return 0;
    return (sharesToWithdraw * vault.totalAssets) / vault.totalShares;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    const sharesToWithdraw = calculateSharesToWithdraw();

    if (sharesToWithdraw <= 0) {
      setError('Please enter a valid amount to withdraw');
      return;
    }

    if (sharesToWithdraw > position.shares) {
      setError('Cannot withdraw more shares than you own');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const txHash = await vaultService.withdraw(account, {
        vaultId: vault.id,
        sharesToBurn: sharesToWithdraw,
      });

      toast({
        title: "Withdrawal Successful!",
        description: `Successfully withdrew ${vaultService.formatAmount(sharesToWithdraw)} shares from Vault #${vault.id}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Withdrawal failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw';
      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
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
      maximumFractionDigits: 8,
    }).format(amount / 100000000);
  };

  const yieldPercentage = vaultService.calculateYieldPercentage(
    position.initialDeposit,
    position.currentValue
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5" />
                Withdraw from Vault #{vault.id}
              </CardTitle>
              <CardDescription>
                Withdraw your shares and earned yield
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
          {/* Position Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Strategy</span>
              <Badge className={getStrategyColor(vault.strategyType)}>
                {vaultService.getStrategyName(vault.strategyType)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Your Shares</div>
                <div className="font-medium">
                  {vaultService.formatAmount(position.shares)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Current Value</div>
                <div className="font-medium">
                  {formatCurrency(position.currentValue)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Initial Deposit</div>
                <div className="font-medium">
                  {formatCurrency(position.initialDeposit)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Total Yield</div>
                <div className={`font-medium ${yieldPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {yieldPercentage >= 0 ? '+' : ''}{yieldPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Withdrawal Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!useCustomAmount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseCustomAmount(false)}
                  >
                    Percentage
                  </Button>
                  <Button
                    type="button"
                    variant={useCustomAmount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseCustomAmount(true)}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {!useCustomAmount ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Withdraw Percentage</span>
                    <span className="text-sm font-medium">{withdrawPercentage}%</span>
                  </div>
                  <Slider
                    value={[withdrawPercentage]}
                    onValueChange={(value) => setWithdrawPercentage(value[0])}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customShares">Shares to Withdraw</Label>
                  <Input
                    id="customShares"
                    type="number"
                    step="0.00000001"
                    min="0"
                    max={vaultService.formatAmount(position.shares)}
                    placeholder="0.00"
                    value={customShares}
                    onChange={(e) => setCustomShares(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-gray-500">
                    Maximum: {vaultService.formatAmount(position.shares)} shares
                  </div>
                </div>
              )}
            </div>

            {/* Withdrawal Preview */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Withdrawal Preview
              </div>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Shares to Withdraw:</span>
                  <span>{vaultService.formatAmount(calculateSharesToWithdraw())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Value:</span>
                  <span>{formatCurrency(calculateWithdrawValue())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Shares:</span>
                  <span>{vaultService.formatAmount(position.shares - calculateSharesToWithdraw())}</span>
                </div>
              </div>
            </div>

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
                disabled={isSubmitting || calculateSharesToWithdraw() <= 0}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 mr-2" />
                    Withdraw
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Info Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <div className="font-medium mb-1">Withdrawal Information</div>
                <div>
                  Withdrawals are processed immediately. You will receive the current value
                  of your shares based on the vault's total assets and share supply.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VaultWithdrawForm;