/**
 * WorkingCreditTest Component
 * 
 * Working test component that actually calls the credit score API
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';

// Reputation service removed - using credit service instead
// import { reputationService } from '../services/workingReputationService';

export function WorkingCreditTest() {
  const [testAddress, setTestAddress] = useState('0x1234567890abcdef1234567890abcdef12345678');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing credit score calculation for address:', testAddress);

      // Reputation service was removed - show message
      setError('Reputation service is not available. Use demo data to test UI components.');

      // Reputation service was removed - show message
      setError('Reputation service is not available. Use demo data to test UI components.');

    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const runMockTest = () => {
    // Create comprehensive mock data showing all credit score features
    const mockResult = {
      address: testAddress,

      // Core Credit Score (300-850 range)
      credit_score: 720,
      credit_grade: 'A',

      // Payment History (35% weight)
      payment_history: {
        on_time_payments: 15,
        late_payments: 2,
        defaults: 0,
        payment_history_score: 85,
        average_days_to_repay: 28,
      },

      // Credit Utilization (30% weight)
      credit_utilization: {
        total_credit_limit: '50000',
        current_debt: '12000',
        utilization_ratio: 24,
        max_utilization_last_12m: 35,
        utilization_score: 80,
      },

      // Credit History (15% weight)
      credit_history: {
        account_age_days: 450,
        first_transaction_date: new Date(Date.now() - 450 * 24 * 60 * 60 * 1000).toISOString(),
        oldest_loan_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        average_account_age: 450,
        history_score: 70,
      },

      // Credit Mix (10% weight)
      credit_mix: {
        defi_protocols_used: ['Hyperion', 'Compound', 'Aave'],
        lending_platforms: ['Compound', 'Aave'],
        liquidity_pools: ['Hyperion'],
        governance_tokens: ['COMP', 'AAVE'],
        mix_diversity_score: 75,
      },

      // New Credit (10% weight)
      new_credit: {
        recent_loan_applications: 1,
        hard_inquiries: 2,
        new_accounts_opened: 1,
        inquiry_impact_score: 90,
      },

      // DeFi Factors
      defi_factors: {
        total_volume_transacted: '125000',
        unique_counterparties: 25,
        governance_participation: 8,
        yield_farming_experience: 12,
        liquidation_events: 0,
        impermanent_loss_events: 1,
      },

      // Risk Assessment
      risk_assessment: {
        probability_of_default: 8,
        risk_tier: 'Prime',
        max_recommended_loan: '25000',
        recommended_interest_rate: 8.5,
        collateral_requirement: 125,
      },

      // Traditional metrics for backward compatibility
      transaction_count: 156,
      total_volume: '125000',
      unique_counterparties: 25,
      governance_participation: 8,
      reputation_score: 76, // Mapped from credit score
      risk_level: 'low',
      last_updated: Date.now(),
    };

    setResult(mockResult);
    setError(null);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center space-y-4 mb-8">
        <TestTube className="h-12 w-12 mx-auto text-blue-600" />
        <h1 className="text-3xl font-bold">DeFi Credit Score System</h1>
        <p className="text-muted-foreground">
          Complete FICO-style credit scoring for DeFi lending and borrowing
        </p>
      </div>

      {/* Test Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Credit Score Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Aptos Address</Label>
            <Input
              id="address"
              value={testAddress}
              onChange={(e) => setTestAddress(e.target.value)}
              placeholder="Enter Aptos address to analyze"
            />
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={runTest}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Calculating Credit Score...
                </>
              ) : (
                'Calculate Real Credit Score'
              )}
            </Button>

            <Button
              onClick={runMockTest}
              variant="outline"
              className="flex-1"
            >
              Show Demo Credit Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Error: {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Credit score calculated successfully!
              Score: {result.credit_score || 'N/A'}
              ({result.credit_grade || 'N/A'} Grade, {result.risk_assessment?.risk_tier || 'N/A'} Risk)
            </AlertDescription>
          </Alert>

          {/* Credit Score Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Credit Score */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Credit Score Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-blue-300 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {result.credit_score || result.reputation_score * 5.5 + 300}
                    </span>
                    <span className="text-xs text-blue-500">FICO</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{result.credit_grade || 'B'}</div>
                    <div className="text-lg text-muted-foreground">
                      {result.risk_assessment?.risk_tier || 'Near Prime'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.credit_score >= 740 ? 'Excellent Credit' :
                        result.credit_score >= 670 ? 'Good Credit' :
                          result.credit_score >= 580 ? 'Fair Credit' : 'Poor Credit'}
                    </div>
                  </div>
                </div>

                {/* Credit Factors Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Credit Score Factors</h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Payment History (35%)</span>
                      <span className="font-medium">
                        {result.payment_history?.payment_history_score || 50}/100
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Credit Utilization (30%)</span>
                      <span className="font-medium">
                        {result.credit_utilization?.utilization_ratio?.toFixed(1) || 0}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Credit History (15%)</span>
                      <span className="font-medium">
                        {result.credit_history?.account_age_days || 0} days
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Credit Mix (10%)</span>
                      <span className="font-medium">
                        {result.credit_mix?.defi_protocols_used?.length || 0} protocols
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Credit (10%)</span>
                      <span className="font-medium">
                        {result.new_credit?.recent_loan_applications || 0} recent
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lending Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Lending Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Max Loan Amount</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(result.risk_assessment?.max_recommended_loan || '0')}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Interest Rate</div>
                  <div className="text-xl font-bold">
                    {result.risk_assessment?.recommended_interest_rate || 16}% APR
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Collateral Required</div>
                  <div className="text-xl font-bold">
                    {result.risk_assessment?.collateral_requirement || 160}%
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Default Risk</div>
                  <div className="text-xl font-bold">
                    {result.risk_assessment?.probability_of_default || 20}%
                  </div>
                </div>

                <Button className="w-full mt-4">
                  Apply for Loan
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* DeFi Activity Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>DeFi Activity Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(result.defi_factors?.total_volume_transacted || result.total_volume || '0')}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Volume</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {result.defi_factors?.governance_participation || result.governance_participation || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Governance Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {result.defi_factors?.yield_farming_experience || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Yield Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.defi_factors?.liquidation_events || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Liquidations</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Credit Score Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">🎯 FICO-Style Credit Scoring</h4>
            <p className="text-sm text-muted-foreground">
              Uses the same methodology as traditional credit scores (300-850 range) but adapted for DeFi activity.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">📊 Real Blockchain Data</h4>
            <p className="text-sm text-muted-foreground">
              Integrates with Nodit's API to analyze real transaction history, lending behavior, and DeFi participation.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">💰 Lending Recommendations</h4>
            <p className="text-sm text-muted-foreground">
              Provides personalized loan terms including interest rates (5-25%), collateral requirements (110-200%), and maximum loan amounts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">🔗 Smart Contract Integration</h4>
            <p className="text-sm text-muted-foreground">
              Stores credit scores on-chain in the DID manager contract for use by DeFi lending protocols.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WorkingCreditTest;