import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Account } from "@aptos-labs/ts-sdk";
import { lendingService, LoanDetails } from "@/services/lendingService";
import { didExists, isLoanEligible } from "@/view-functions/getDID";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, TrendingUp, AlertTriangle, CheckCircle, User } from "lucide-react";

export function LenderDashboard() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loanAddress, setLoanAddress] = useState("");
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [borrowerReputation, setBorrowerReputation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDefaulting, setIsDefaulting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLoanData = async (address: string) => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const details = await lendingService.getLoanDetails(address);

      if (details) {
        setLoanDetails(details);

        // Load borrower's current reputation
        try {
          const didData = await didExists(details.borrower);
          setBorrowerReputation(didData);
        } catch (error) {
          console.error("Error loading borrower reputation:", error);
        }
      } else {
        setError("Loan not found at this address");
      }
    } catch (error: any) {
      console.error("Error loading loan data:", error);
      setError("Failed to load loan data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLoan = () => {
    loadLoanData(loanAddress);
  };

  const handleApproveLoan = async () => {
    if (!loanDetails || !account) return;

    setIsApproving(true);
    setError(null);
    setSuccess(null);

    try {
      const accountObj = Account.fromPrivateKey({
        privateKey: account.privateKey!,
      });

      const txHash = await lendingService.approveLoan(accountObj, loanAddress);
      setSuccess(`Loan approved successfully! Transaction: ${txHash}`);

      // Reload loan data
      await loadLoanData(loanAddress);
    } catch (error: any) {
      console.error("Error approving loan:", error);
      setError(error.message || "Failed to approve loan");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDefaultLoan = async () => {
    if (!loanDetails || !account) return;

    setIsDefaulting(true);
    setError(null);
    setSuccess(null);

    try {
      const accountObj = Account.fromPrivateKey({
        privateKey: account.privateKey!,
      });

      const txHash = await lendingService.defaultLoan(accountObj, loanAddress);
      setSuccess(`Loan marked as defaulted! Transaction: ${txHash}`);

      // Reload loan data
      await loadLoanData(loanAddress);
    } catch (error: any) {
      console.error("Error defaulting loan:", error);
      setError(error.message || "Failed to default loan");
    } finally {
      setIsDefaulting(false);
    }
  };

  const getStatusBadgeVariant = (status: number) => {
    switch (status) {
      case 0: return "secondary"; // Pending
      case 1: return "default"; // Active
      case 2: return "success"; // Completed
      case 3: return "destructive"; // Defaulted
      default: return "secondary";
    }
  };

  const getRiskLevel = (reputation: number) => {
    if (reputation >= 80) return { level: "Low", color: "text-green-600" };
    if (reputation >= 60) return { level: "Medium", color: "text-yellow-600" };
    return { level: "High", color: "text-red-600" };
  };

  const formatAmount = (amount: string) => {
    return (parseInt(amount) / 100000000).toFixed(4) + " APT";
  };

  const calculateROI = () => {
    if (!loanDetails) return 0;

    const principal = parseInt(loanDetails.principal_amount);
    const totalRepaid = parseInt(loanDetails.total_repaid);
    const interestRate = parseInt(loanDetails.interest_rate);
    const duration = parseInt(loanDetails.duration);

    // Calculate expected total return
    const expectedInterest = (principal * interestRate * duration) / (10000 * 365 * 24 * 60 * 60);
    const expectedTotal = principal + expectedInterest;

    return ((expectedTotal - principal) / principal) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Loan Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Lender Dashboard</CardTitle>
          <CardDescription>
            Review and manage loan applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="loanAddress">Loan Contract Address</Label>
              <Input
                id="loanAddress"
                type="text"
                placeholder="0x..."
                value={loanAddress}
                onChange={(e) => setLoanAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleLoadLoan}
                disabled={isLoading || !loanAddress}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load Loan"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Loan Details */}
      {loanDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Loan #{loanDetails.id}
              <Badge variant={getStatusBadgeVariant(loanDetails.status)}>
                {lendingService.formatLoanStatus(loanDetails.status)}
              </Badge>
            </CardTitle>
            <CardDescription>
              Created: {lendingService.formatTimestamp(loanDetails.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Loan Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Loan Details
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Principal Amount:</span>
                    <span className="font-semibold">{formatAmount(loanDetails.principal_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-semibold">{lendingService.formatInterestRate(loanDetails.interest_rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold">{lendingService.formatDuration(loanDetails.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Collateral:</span>
                    <span className="font-semibold">{formatAmount(loanDetails.collateral_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected ROI:</span>
                    <span className="font-semibold text-green-600">{calculateROI().toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Borrower Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Borrower Profile
                </h4>

                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 block">Address:</span>
                    <span className="font-mono text-sm">{loanDetails.borrower}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Reputation at Application:</span>
                    <span className="font-semibold">{loanDetails.borrower_reputation}/100</span>
                  </div>

                  {borrowerReputation && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Reputation:</span>
                        <span className="font-semibold">{borrowerReputation.reputation_score}/100</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk Level:</span>
                        <span className={`font-semibold ${getRiskLevel(borrowerReputation.reputation_score).color}`}>
                          {getRiskLevel(borrowerReputation.reputation_score).level}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Successful Loans:</span>
                        <span className="font-semibold">{borrowerReputation.successful_loans}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Defaulted Loans:</span>
                        <span className="font-semibold text-red-600">{borrowerReputation.defaulted_loans}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Repayment Progress</span>
                <span className="text-sm font-medium">
                  {loanDetails.payments_made} payments made
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(parseInt(loanDetails.total_repaid) / (parseInt(loanDetails.principal_amount) + (parseInt(loanDetails.principal_amount) * parseInt(loanDetails.interest_rate) * parseInt(loanDetails.duration)) / (10000 * 365 * 24 * 60 * 60))) * 100}%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Repaid: {formatAmount(loanDetails.total_repaid)}</span>
                <span>
                  Expected Total: {formatAmount(
                    (parseInt(loanDetails.principal_amount) +
                      (parseInt(loanDetails.principal_amount) * parseInt(loanDetails.interest_rate) * parseInt(loanDetails.duration)) /
                      (10000 * 365 * 24 * 60 * 60)).toString()
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-4">
              {loanDetails.status === 0 && account?.address === loanDetails.lender && (
                <Button
                  onClick={handleApproveLoan}
                  disabled={isApproving}
                  className="flex-1"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve & Fund Loan"
                  )}
                </Button>
              )}

              {loanDetails.status === 1 && account?.address === loanDetails.lender && (
                <Button
                  onClick={handleDefaultLoan}
                  disabled={isDefaulting}
                  variant="destructive"
                  className="flex-1"
                >
                  {isDefaulting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Mark as Default"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}