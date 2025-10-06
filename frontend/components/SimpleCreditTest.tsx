/**
 * SimpleCreditTest Component
 * 
 * Simple test component to verify basic credit score functionality
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';
// Reputation service removed - using mock data for testing

export function SimpleCreditTest() {
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
      setError('Reputation service is not available. Use mock data for testing UI components.');

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
    // Create simple mock data for testing
    const mockResult = {
      address: testAddress,
      credit_score: 720,
      credit_grade: 'A',
      reputation_score: 76,
      risk_level: 'low',
      transaction_count: 156,
      total_volume: '125000',
      unique_counterparties: 25,
      governance_participation: 8,
      last_updated: Date.now(),
    };

    setResult(mockResult);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center space-y-4 mb-8">
        <TestTube className="h-12 w-12 mx-auto text-blue-600" />
        <h1 className="text-3xl font-bold">Simple Credit Score Test</h1>
        <p className="text-muted-foreground">
          Basic test of the DeFi credit score calculation system
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

      {result && (
        <>
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Credit score calculation successful!
              Score: {result.credit_score || 'N/A'}
              Grade: {result.credit_grade || 'N/A'}
              Legacy Score: {result.reputation_score || 'N/A'}
            </AlertDescription>
          </Alert>

          {/* Simple Credit Score Display */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Credit Score Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.credit_score || result.reputation_score || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Credit Score</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {result.credit_grade || 'B'}
                  </div>
                  <div className="text-sm text-muted-foreground">Grade</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.transaction_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 capitalize">
                    {result.risk_level || 'medium'}
                  </div>
                  <div className="text-sm text-muted-foreground">Risk Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Data (JSON)</CardTitle>
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
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Mock Test:</strong> Click "Test with Mock Data" to see sample results without making API calls.
          </p>
          <p className="text-sm">
            <strong>Real Test:</strong> Enter an Aptos address and click "Test Real Calculation" to test with actual blockchain data.
          </p>
          <p className="text-sm text-muted-foreground">
            Note: Real tests may return default values for addresses with no transaction history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimpleCreditTest;