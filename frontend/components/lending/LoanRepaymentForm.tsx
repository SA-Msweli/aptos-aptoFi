import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Account } from "@aptos-labs/ts-sdk";
import { lendingService, LoanDetails, PaymentSchedule, NextPayment } from "@/services/lendingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export function LoanRepaymentForm() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loanAddress, setLoanAddress] = useState("");
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayingLoading, setIsPayingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLoanData = async (address: string) => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const [details, schedule, next] = await Promise.all([
        lendingService.getLoanDetails(address),
        lendingService.getPaymentSchedule(address),
        lendingService.getNextPaymentDue(address)
      ]);

      if (details) {
        setLoanDetails(details);
        setPaymentSchedule(schedule);
        setNextPayment(next);

        // Auto-select next payment due
        if (next && parseInt(next.payment_number) > 0) {
          setSelectedPayment(parseInt(next.payment_number));
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

  const handleMakePayment = async () => {
    if (!loanDetails || !account || selectedPayment === 0) return;

    setIsPayingLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const accountObj = Account.fromPrivateKey({
        privateKey: account.privateKey!,
      });

      const txHash = await lendingService.makePayment(accountObj, loanAddress, selectedPayment);
      setSuccess(`Payment made successfully! Transaction: ${txHash}`);

      // Reload loan data
      await loadLoanData(loanAddress);
      setSelectedPayment(0);
    } catch (error: any) {
      console.error("Error making payment:", error);
      setError(error.message || "Failed to make payment");
    } finally {
      setIsPayingLoading(false);
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
      case "paid": return "text-green-600 bg-green-50 border-green-200";
      case "overdue": return "text-red-600 bg-red-50 border-red-200";
      case "grace": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "upcoming": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatAmount = (amount: string) => {
    return (parseInt(amount) / 100000000).toFixed(4) + " APT";
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getSelectedPaymentDetails = () => {
    if (selectedPayment === 0) return null;
    return paymentSchedule.find(p => parseInt(p.payment_number) === selectedPayment);
  };

  const canMakePayment = () => {
    if (!loanDetails || !account) return false;
    if (loanDetails.status !== 1) return false; // Must be active
    if (loanDetails.borrower !== account.address) return false; // Must be borrower
    if (selectedPayment === 0) return false;

    const payment = getSelectedPaymentDetails();
    return payment && !payment.is_paid;
  };

  return (
    <div className="space-y-6">
      {/* Loan Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Make Loan Payment</CardTitle>
          <CardDescription>
            Make scheduled payments for your active loans
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

      {/* Next Payment Due */}
      {nextPayment && parseInt(nextPayment.payment_number) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Payment Due
              {nextPayment.is_overdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-semibold">Payment #{nextPayment.payment_number}</p>
                <p className="text-sm text-gray-600">
                  Due: {formatDate(nextPayment.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">
                  {formatAmount(nextPayment.total_amount)}
                </p>
                <Button
                  onClick={() => setSelectedPayment(parseInt(nextPayment.payment_number))}
                  size="sm"
                  variant={selectedPayment === parseInt(nextPayment.payment_number) ? "default" : "outline"}
                >
                  {selectedPayment === parseInt(nextPayment.payment_number) ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Selection */}
      {paymentSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
            <CardDescription>
              Select a payment to make
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentSchedule.map((payment, index) => {
                const status = getPaymentStatus(payment);
                const statusColor = getPaymentStatusColor(status);
                const isSelected = selectedPayment === parseInt(payment.payment_number);

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                        ? "border-blue-500 bg-blue-50"
                        : statusColor
                      }`}
                    onClick={() => {
                      if (!payment.is_paid) {
                        setSelectedPayment(parseInt(payment.payment_number));
                      }
                    }}
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
                          {isSelected && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
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

      {/* Payment Confirmation */}
      {selectedPayment > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Confirm Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const payment = getSelectedPaymentDetails();
              if (!payment) return null;

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Payment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Payment Number:</span>
                        <span className="ml-2 font-medium">#{payment.payment_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="ml-2 font-medium">{formatAmount(payment.total_amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Principal:</span>
                        <span className="ml-2 font-medium">{formatAmount(payment.principal_amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Interest:</span>
                        <span className="ml-2 font-medium">{formatAmount(payment.interest_amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Due Date:</span>
                        <span className="ml-2 font-medium">{formatDate(payment.due_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium">
                          {getPaymentStatus(payment).charAt(0).toUpperCase() + getPaymentStatus(payment).slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleMakePayment}
                    disabled={isPayingLoading || !canMakePayment()}
                    className="w-full"
                    size="lg"
                  >
                    {isPayingLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      `Pay ${formatAmount(payment.total_amount)}`
                    )}
                  </Button>

                  {!canMakePayment() && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {!account ? "Please connect your wallet" :
                          loanDetails?.borrower !== account.address ? "Only the borrower can make payments" :
                            loanDetails?.status !== 1 ? "Loan is not active" :
                              payment.is_paid ? "This payment has already been made" :
                                "Unable to make payment"}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}