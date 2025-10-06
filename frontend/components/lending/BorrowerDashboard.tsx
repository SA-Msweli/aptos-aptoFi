import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { lendingService, LoanDetails, PaymentSchedule } from "@/services/lendingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, DollarSign, Clock, AlertTriangle } from "lucide-react";

export function BorrowerDashboard() {
  const { account } = useWallet();
  const [loanAddress, setLoanAddress] = useState("");
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLoanData = async (address: string) => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const [details, schedule] = await Promise.all([
        lendingService.getLoanDetails(address),
        lendingService.getPaymentSchedule(address)
      ]);

      if (details) {
        setLoanDetails(details);
        setPaymentSchedule(schedule);
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

  const getStatusBadgeVariant = (status: number) => {
    switch (status) {
      case 0: return "secondary"; // Pending
      case 1: return "default"; // Active
      case 2: return "success"; // Completed
      case 3: return "destructive"; // Defaulted
      default: return "secondary";
    }
  };

  const getPaymentStatus = (payment: PaymentSchedule) => {
    if (payment.is_paid) return "paid";

    const now = Date.now() / 1000;
    const dueDate = parseInt(payment.due_date);

    if (now > dueDate + (7 * 24 * 60 * 60)) return "overdue"; // 7 days grace period
    if (now > dueDate) return "grace";
    return "upcoming";
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-green-600 bg-green-50";
      case "overdue": return "text-red-600 bg-red-50";
      case "grace": return "text-yellow-600 bg-yellow-50";
      case "upcoming": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const formatAmount = (amount: string) => {
    return (parseInt(amount) / 100000000).toFixed(4) + " APT";
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Loan Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Borrower Dashboard</CardTitle>
          <CardDescription>
            View your loan details and payment schedule
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Principal Amount</p>
                    <p className="font-semibold">{formatAmount(loanDetails.principal_amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Interest Rate</p>
                    <p className="font-semibold">{lendingService.formatInterestRate(loanDetails.interest_rate)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold">{lendingService.formatDuration(loanDetails.duration)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Collateral</p>
                  <p className="font-semibold">{formatAmount(loanDetails.collateral_amount)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Payments Made</p>
                  <p className="font-semibold">{loanDetails.payments_made} / {paymentSchedule.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Repaid</p>
                  <p className="font-semibold">{formatAmount(loanDetails.total_repaid)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Lender</p>
                  <p className="font-mono text-sm">{loanDetails.lender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your Reputation at Loan Creation</p>
                  <p className="font-semibold">{loanDetails.borrower_reputation}/100</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Schedule */}
      {paymentSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
            <CardDescription>
              Track your scheduled payments and due dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentSchedule.map((payment, index) => {
                const status = getPaymentStatus(payment);
                const statusColor = getPaymentStatusColor(status);

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${statusColor}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Payment #{payment.payment_number}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Due: {formatDate(payment.due_date)}
                        </p>
                        {payment.is_paid && (
                          <p className="text-sm text-green-600">
                            Paid: {formatDate(payment.paid_timestamp)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(payment.total_amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Principal: {formatAmount(payment.principal_amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Interest: {formatAmount(payment.interest_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}