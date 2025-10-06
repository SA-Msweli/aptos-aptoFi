/**
 * CreditScoreTest Component
 * 
 * Test component to verify credit score functionality
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { CreditScore } from './CreditScore';
import { CreditDashboard } from './CreditDashboard';
// Reputation service removed - using mock data for testing
type ReputationMetrics = {
  address: string;
  credit_score: number;
  credit_grade: string;
  payment_history: any;
  credit_utilization: any;
  credit_history: any;
  credit_mix: any;
  new_credit: any;
  defi_factors: any;
  risk_assessment: any;
  transaction_count: number;
  total_volume: string;
  unique_counterparties: number;
  governance_participation: number;
  reputation_score: number;
  risk_level: string;
  last_updated: number;
};

export function CreditScoreTest() {
  const [testAddress, setTestAddress] = useState('0x1234567890abcdef1234567890abcdef12345678');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<ReputationMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setMetrics(null);

    try {
      console.log('Testing credit score calculation for address:', testAddress);

      // Reputation service was removed - show message
      setError('Reputation service is not available. Use mock data for testing UI components.');

    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const runMockTest = () => {
    // Create mock data for testing UI components
    const mockMetrics: ReputationMetrics = {
      address: testAddress,

      // Core Credit Score
      credit_score: 720,
      credit_grade: 'A',

      // Payment History (35%)
      payment_history: {
        on_time_payments: 15,
        late_payments: 2,
        defaults: 0,
        payment_history_score: 85,
        average_days_to_repay: 28,
      },

      // Credit Utilization (30%)
      credit_utilization: {
        total_credit_limit: '50000',
        current_debt: '12000',
        utilization_ratio: 24,
        max_utilization_last_12m: 35,
        utilization_score: 80,
      },

      // Credit History Length (15%)
      credit_history: {
        account_age_days: 450,
        first_transaction_date: new Date(Date.now() - 450 * 24 * 60 * 60 * 1000).toISOString(),
        oldest_loan_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        average_account_age: 450,
        history_score: 70,
      },

      // Credit Mix (10%)
      credit_mix: {
        defi_protocols_used: ['Hyperion', 'Compound', 'Aave'],
        lending_platforms: ['Compound', 'Aave'],
        liquidity_pools: ['Hyperion'],
        governance_tokens: ['COMP', 'AAVE'],
        mix_diversity_score: 75,
      },

      // New Credit (10%)
      new_credit: {
        recent_loan_applications: 1,
        hard_inquiries: 2,
        new_accounts_opened: 1,
        inquiry_impact_score: 90,
      },

      // DeFi-specific factors
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

    setMetrics(mockMetrics);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-8">
          <TestTube className="h-12 w-12 mx-auto text-blue-600" />
          <h1 className="text-3xl font-bold">Credit Score System Test</h1>
          <p className="text-muted-foreground">
            Test the DeFi credit score calculation and UI components
          </p>
        </div>

        {/* Test Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Test Address</Label>
              <Input
                id="address"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="Enter Aptos address to test"
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
                    Calculating...
                  </>
                ) : (
                  'Test Real Calculation'
                )}
              </Button>

              <Button
                onClick={runMockTest}
                variant="outline"
                className="flex-1"
              >
                Test with Mock Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Test Error: {error}
            </AlertDescription>
          </Alert>
        )}

        {metrics && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Credit score calculation successful! Score: {metrics.credit_score} ({metrics.credit_grade})
            </AlertDescription>
          </Alert>
        )}

        {/* Credit Score Display */}
        {metrics && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Credit Score Component Test</CardTitle>
              </CardHeader>
              <CardContent>
                <CreditScore
                  metrics={metrics}
                  showDetails={true}
                />
              </CardContent>
            </Card>

            {/* Full Dashboard Test */}
            <Card>
              <CardHeader>
                <CardTitle>Credit Dashboard Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4">
                  <CreditDashboard address={metrics.address} />
                </div>
              </CardContent>
            </Card>

            {/* Raw Data Display */}
            <Card>
              <CardHeader>
                <CardTitle>Raw Credit Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Mock Data Test</h4>
              <p className="text-sm text-muted-foreground">
                Click "Test with Mock Data" to see the UI components with sample credit score data.
                This tests the UI rendering and layout.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Real Calculation Test</h4>
              <p className="text-sm text-muted-foreground">
                Enter a real Aptos address and click "Test Real Calculation" to test the actual
                credit score calculation using Nodit data. This may return default values for
                addresses with no transaction history.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Expected Results</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Credit score should be between 300-850</li>
                <li>• Credit grade should be A+ to F</li>
                <li>• Risk tier should be Prime, Near Prime, Subprime, or Deep Subprime</li>
                <li>• All percentage values should be 0-100</li>
                <li>• Loan recommendations should be calculated</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CreditScoreTest;