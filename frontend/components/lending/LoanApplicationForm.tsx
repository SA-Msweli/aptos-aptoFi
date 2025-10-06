import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Account } from "@aptos-labs/ts-sdk";
import { lendingService, LoanRequest } from "@/services/lendingService";
import { didExists, isLoanEligible } from "@/view-functions/getDID";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export function LoanApplicationForm() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reputationScore, setReputationScore] = useState<number>(0);
  const [suggestedRate, setSuggestedRate] = useState<number>(1500);

  const [formData, setFormData] = useState({
    lenderAddress: "",
    principalAmount: "",
    duration: "30", // days
    numPayments: "4", // weekly payments
    collateralAmount: "0",
  });

  // Load user's reputation score
  useEffect(() => {
    const loadReputation = async () => {
      if (account?.address) {
        try {
          const didData = await didExists(account.address.toString());
          if (didData) {
            setReputationScore(didData.reputation_score);
            const rate = await lendingService.calculateInterestRateForReputation(didData.reputation_score);
            setSuggestedRate(rate);
          }
        } catch (error) {
          console.error("Error loading reputation:", error);
        }
      }
    };

    loadReputation();
  }, [account]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const validateForm = (): string | null => {
    if (!account?.address) return "Please connect your wallet";
    if (!formData.lenderAddress) return "Lender address is required";
    if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
      return "Principal amount must be greater than 0";
    }
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      return "Duration must be greater than 0";
    }
    if (!formData.numPayments || parseInt(formData.numPayments) <= 0) {
      return "Number of payments must be greater than 0";
    }
    if (reputationScore < 60) {
      return "Minimum reputation score of 60 required for loans";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const durationSeconds = parseInt(formData.duration) * 24 * 60 * 60; // Convert days to seconds
      const principalAmount = Math.floor(parseFloat(formData.principalAmount) * 100000000); // Convert to octas
      const collateralAmount = Math.floor(parseFloat(formData.collateralAmount) * 100000000); // Convert to octas

      const loanRequest: LoanRequest = {
        lender_addr: formData.lenderAddress,
        asset_metadata: "0x1::aptos_coin::AptosCoin", // APT for now
        principal_amount: principalAmount,
        interest_rate: suggestedRate,
        duration: durationSeconds,
        collateral_amount: collateralAmount,
        num_payments: parseInt(formData.numPayments),
      };

      const accountObj = Account.fromPrivateKey({
        privateKey: account!.privateKey!,
      });

      const txHash = await lendingService.createLoan(accountObj, loanRequest);

      setSuccess(`Loan application submitted successfully! Transaction: ${txHash}`);

      // Reset form
      setFormData({
        lenderAddress: "",
        principalAmount: "",
        duration: "30",
        numPayments: "4",
        collateralAmount: "0",
      });
    } catch (error: any) {
      console.error("Error creating loan:", error);
      setError(error.message || "Failed to create loan application");
    } finally {
      setIsLoading(false);
    }
  };

  const formatInterestRate = (rate: number) => {
    return `${(rate / 100).toFixed(2)}%`;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Apply for a Loan</CardTitle>
        <CardDescription>
          Create a loan request based on your reputation score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reputation Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Your Reputation Score</h4>
              <p className="text-sm text-blue-700">
                Score: {reputationScore}/100 | Suggested Rate: {formatInterestRate(suggestedRate)} APR
              </p>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {reputationScore}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lenderAddress">Lender Address</Label>
            <Input
              id="lenderAddress"
              type="text"
              placeholder="0x..."
              value={formData.lenderAddress}
              onChange={(e) => handleInputChange("lenderAddress", e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Address of the lender who will fund this loan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="principalAmount">Principal Amount (APT)</Label>
              <Input
                id="principalAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="100"
                value={formData.principalAmount}
                onChange={(e) => handleInputChange("principalAmount", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="collateralAmount">Collateral Amount (APT)</Label>
              <Input
                id="collateralAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.collateralAmount}
                onChange={(e) => handleInputChange("collateralAmount", e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                {reputationScore >= 80 ? "Optional for high reputation" : "Recommended for better rates"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Loan Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                placeholder="30"
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="numPayments">Number of Payments</Label>
              <Input
                id="numPayments"
                type="number"
                min="1"
                max="52"
                placeholder="4"
                value={formData.numPayments}
                onChange={(e) => handleInputChange("numPayments", e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Weekly or bi-weekly payments recommended
              </p>
            </div>
          </div>

          {/* Loan Summary */}
          {formData.principalAmount && formData.duration && formData.numPayments && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Loan Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Principal:</span>
                  <span className="ml-2 font-medium">{formData.principalAmount} APT</span>
                </div>
                <div>
                  <span className="text-gray-600">Interest Rate:</span>
                  <span className="ml-2 font-medium">{formatInterestRate(suggestedRate)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2 font-medium">{formData.duration} days</span>
                </div>
                <div>
                  <span className="text-gray-600">Payment Frequency:</span>
                  <span className="ml-2 font-medium">
                    Every {Math.floor(parseInt(formData.duration) / parseInt(formData.numPayments))} days
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading || !account}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Loan Application...
              </>
            ) : (
              "Submit Loan Application"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}