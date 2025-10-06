/**
 * Hyperion Test Panel Component
 * 
 * A development component for testing Hyperion SDK integration
 * This component provides a UI to test various Hyperion functionalities
 */

import React, { useState } from 'react';
import {
  testHyperionConfiguration,
  testHyperionConnectivity,
  testPoolInformation,
  testSwapQuote,
  runAllHyperionTests,
} from '../utils/hyperionTestUtils';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const HyperionTestPanel: React.FC = () => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [allTestsResult, setAllTestsResult] = useState<any>(null);

  const runTest = async (testName: string, testFunction: () => Promise<TestResult>) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFunction();
      setResults(prev => ({ ...prev, [testName]: result }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          message: `Test failed: ${error}`,
          details: { error }
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const runAllTests = async () => {
    setLoading(prev => ({ ...prev, 'all': true }));
    try {
      const result = await runAllHyperionTests();
      setAllTestsResult(result);

      // Update individual results
      const individualResults: Record<string, TestResult> = {};
      result.results.forEach((testResult: any) => {
        individualResults[testResult.test] = {
          success: testResult.success,
          message: testResult.message,
          details: testResult.details,
        };
      });
      setResults(individualResults);
    } catch (error) {
      setAllTestsResult({
        success: false,
        results: [],
        summary: `All tests failed: ${error}`,
      });
    } finally {
      setLoading(prev => ({ ...prev, 'all': false }));
    }
  };

  const TestButton: React.FC<{
    testName: string;
    testFunction: () => Promise<TestResult>;
    description: string;
  }> = ({ testName, testFunction, description }) => (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-semibold">{testName}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button
          onClick={() => runTest(testName, testFunction)}
          disabled={loading[testName]}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading[testName] ? 'Testing...' : 'Run Test'}
        </button>
      </div>

      {results[testName] && (
        <div className={`mt-2 p-3 rounded ${results[testName].success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {results[testName].success ? '✅' : '❌'}
            </span>
            <span>{results[testName].message}</span>
          </div>

          {results[testName].details && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">Details</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                {JSON.stringify(results[testName].details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Hyperion SDK Integration Tests</h1>
        <p className="text-gray-600">
          Use this panel to test the Hyperion SDK integration and verify all functionality works correctly.
        </p>
      </div>

      {/* Run All Tests Button */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">Run All Tests</h2>
            <p className="text-sm text-gray-600">Execute all tests in sequence</p>
          </div>
          <button
            onClick={runAllTests}
            disabled={loading['all']}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading['all'] ? 'Running All Tests...' : 'Run All Tests'}
          </button>
        </div>

        {allTestsResult && (
          <div className={`mt-4 p-3 rounded ${allTestsResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            <div className="font-medium">{allTestsResult.summary}</div>
            {allTestsResult.results.length > 0 && (
              <div className="mt-2 text-sm">
                {allTestsResult.results.map((result: any, index: number) => (
                  <div key={index} className="flex items-center">
                    <span className="mr-2">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span>{result.test}: {result.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Tests */}
      <div className="space-y-4">
        <TestButton
          testName="Configuration"
          testFunction={testHyperionConfiguration}
          description="Verify that Hyperion SDK configuration is valid and all required environment variables are set"
        />

        <TestButton
          testName="Connectivity"
          testFunction={testHyperionConnectivity}
          description="Test connection to Hyperion SDK and verify it can initialize properly"
        />

        <TestButton
          testName="Pool Information"
          testFunction={testPoolInformation}
          description="Test retrieval of liquidity pool information from Hyperion"
        />

        <TestButton
          testName="Swap Quote"
          testFunction={() => testSwapQuote(
            '0x1::aptos_coin::AptosCoin',
            '0x1::coin::CoinStore',
            '1000000'
          )}
          description="Test swap quote functionality with sample tokens"
        />
      </div>

      {/* Configuration Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Configuration Requirements</h3>
        <div className="text-sm space-y-1">
          <div>✅ <code>VITE_APTOS_API_KEY</code>: Required for Hyperion SDK initialization</div>
          <div>✅ <code>VITE_APP_NETWORK</code>: Network configuration (mainnet/testnet/devnet)</div>
          <div>⚠️ <code>VITE_HYPERION_CLMM_ADDRESS</code>: Optional, for specific CLMM contract</div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Make sure these environment variables are properly set in your .env file
        </div>
      </div>
    </div>
  );
};

export default HyperionTestPanel;