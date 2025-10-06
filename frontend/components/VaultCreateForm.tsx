import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { X, PlusCircle, AlertCircle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { vaultService, STRATEGY_TYPES } from '@/services/vaultService';
import { useToast } from '@/components/ui/use-toast';

interface VaultCreateFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function VaultCreateForm({ onClose, onSuccess }: VaultCreateFormProps) {
  const { account } = useWallet();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    strategyType: STRATEGY_TYPES.BALANCED,
    targetApy: '1000', // 10% in basis points
    performanceFee: '200', // 2% in basis points
    managementFee: '100', // 1% in basis points
    capacityLimit: '1000000', // 10,000 APT in smallest units
    minimumDeposit: '100000000', // 1 APT in smallest units
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    // Validation
    if (parseInt(formData.performanceFee) > 2000) {
      setError('Performance fee cannot exceed 20%');
      return;
    }

    if (parseInt(formData.managementFee) > 500) {
      setError('Management fee cannot exceed 5%');
      return;
    }

    if (parseInt(formData.targetApy) <= 0) {
      setError('Target APY must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For now, use a placeholder asset metadata address
      // In production, this would be selected from available tokens
      const assetMetadata = '0x1::aptos_coin::AptosCoin';

      const txHash = await vaultService.createVault(account, {
        assetMetadata,
        strategyType: formData.strategyType,
        targetApy: parseInt(formData.targetApy),
        performanceFee: parseInt(formData.performanceFee),
        managementFee: parseInt(formData.managementFee),
        capacityLimit: parseInt(formData.capacityLimit),
        minimumDeposit: parseInt(formData.minimumDeposit),
      });

      toast({
        title: "Vault Created Successfully!",
        description: `Your new ${vaultService.getStrategyName(formData.strategyType)} vault has been created.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Vault creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vault';
      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Vault Creation Failed",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrategyDescription = (strategyType: number) => {
    return vaultService.getStrategyDescription(strategyType);
  };

  const formatPercentage = (basisPoints: string) => {
    const percentage = parseInt(basisPoints || '0') / 100;
    return `${percentage.toFixed(2)}%`;
  };

  const formatAmount = (amount: string, decimals: number = 8) => {
    const value = parseInt(amount || '0') / Math.pow(10, decimals);
    return value.toFixed(decimals);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create New Vault
              </CardTitle>
              <CardDescription>
                Set up an automated yield generation vault with custom parameters
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Strategy Selection */}
            <div className="space-y-3">
              <Label>Investment Strategy</Label>
              <Select
                value={formData.strategyType.toString()}
                onValueChange={(value) => handleInputChange('strategyType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STRATEGY_TYPES.CONSERVATIVE.toString()}>
                    Conservative - Lower Risk
                  </SelectItem>
                  <SelectItem value={STRATEGY_TYPES.BALANCED.toString()}>
                    Balanced - Medium Risk
                  </SelectItem>
                  <SelectItem value={STRATEGY_TYPES.AGGRESSIVE.toString()}>
                    Aggressive - Higher Risk
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                {getStrategyDescription(formData.strategyType)}
              </div>
            </div>

            {/* Target APY */}
            <div className="space-y-2">
              <Label htmlFor="targetApy">Target APY</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="targetApy"
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  value={formData.targetApy}
                  onChange={(e) => handleInputChange('targetApy', e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 min-w-[60px]">
                  ({formatPercentage(formData.targetApy)})
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Target annual percentage yield in basis points (100 = 1%)
              </div>
            </div>

            {/* Fee Structure */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Fee Structure</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="performanceFee">Performance Fee</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="performanceFee"
                      type="number"
                      min="0"
                      max="2000"
                      step="1"
                      value={formData.performanceFee}
                      onChange={(e) => handleInputChange('performanceFee', e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 min-w-[50px]">
                      ({formatPercentage(formData.performanceFee)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fee on profits (max 20%)
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="managementFee">Management Fee</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="managementFee"
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      value={formData.managementFee}
                      onChange={(e) => handleInputChange('managementFee', e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 min-w-[50px]">
                      ({formatPercentage(formData.managementFee)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Annual fee on assets (max 5%)
                  </div>
                </div>
              </div>
            </div>

            {/* Vault Limits */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Vault Limits</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacityLimit">Capacity Limit (APT)</Label>
                  <Input
                    id="capacityLimit"
                    type="number"
                    min="1"
                    step="1"
                    value={parseInt(formData.capacityLimit) / 100000000}
                    onChange={(e) => handleInputChange('capacityLimit', (parseFloat(e.target.value) * 100000000).toString())}
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-gray-500">
                    Maximum total deposits allowed
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumDeposit">Minimum Deposit (APT)</Label>
                  <Input
                    id="minimumDeposit"
                    type="number"
                    min="0.00000001"
                    step="0.00000001"
                    value={parseInt(formData.minimumDeposit) / 100000000}
                    onChange={(e) => handleInputChange('minimumDeposit', (parseFloat(e.target.value) * 100000000).toString())}
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-gray-500">
                    Minimum amount per deposit
                  </div>
                </div>
              </div>
            </div>

            {/* Vault Preview */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-3">
                Vault Configuration Preview
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-blue-700">
                <div>
                  <span className="font-medium">Strategy:</span> {vaultService.getStrategyName(formData.strategyType)}
                </div>
                <div>
                  <span className="font-medium">Target APY:</span> {formatPercentage(formData.targetApy)}
                </div>
                <div>
                  <span className="font-medium">Performance Fee:</span> {formatPercentage(formData.performanceFee)}
                </div>
                <div>
                  <span className="font-medium">Management Fee:</span> {formatPercentage(formData.managementFee)}
                </div>
                <div>
                  <span className="font-medium">Max Capacity:</span> {formatAmount(formData.capacityLimit)} APT
                </div>
                <div>
                  <span className="font-medium">Min Deposit:</span> {formatAmount(formData.minimumDeposit)} APT
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
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Vault...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Vault
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Important Notice */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-700">
                <div className="font-medium mb-1">Important Notice</div>
                <div>
                  As the vault manager, you will be responsible for executing rebalancing and compounding operations.
                  Ensure you understand the strategy allocation and fee structure before creating the vault.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VaultCreateForm;