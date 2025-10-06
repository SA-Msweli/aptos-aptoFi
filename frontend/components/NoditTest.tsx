/**
 * Nodit Integration Test Component
 * 
 * A React component to test Nodit service functionality
 */

import React, { useState, useEffect } from 'react';
import { noditService } from '../services/noditService';
import type { AddressReputation, AccountInfo } from '../utils/noditTypes';

export const NoditTest: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testAddress] = useState('0x1'); // Aptos Foundation address

  useEffect(() => {
    // Get initial status
    const serviceStatus = noditService.getServiceStatus();
    setStatus(serviceStatus);
  }, []);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runBasicTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      addResult('🔍 Starting Nodit integration tests...');

      // Test 1: Service Status
      addResult('📊 Testing service status...');
      const serviceStatus = noditService.getServiceStatus();
      addResult(`✅ Service status: ${serviceStatus.isConfigured ? 'Configured' : 'Not configured'}`);

      if (!serviceStatus.isConfigured) {
        addResult('⚠️ Nodit is not fully configured. Please set VITE_NODIT_API_KEY in your .env file');
        return;
      }

      // Test 2: Account Info
      addResult(`🔍 Testing account info for ${testAddress}...`);
      try {
        const accountInfo: AccountInfo = await noditService.getAccountInfo(testAddress);
        addResult(`✅ Account info retrieved - Sequence: ${accountInfo.sequence_number}`);
      } catch (error) {
        addResult(`❌ Account info failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 3: Account Balances
      addResult(`💰 Testing account balances for ${testAddress}...`);
      try {
        const balances = await noditService.getAccountBalances(testAddress);
        addResult(`✅ Found ${balances.length} token balances`);
        if (balances.length > 0) {
          addResult(`   First balance: ${balances[0].coin_type} = ${balances[0].amount}`);
        }
      } catch (error) {
        addResult(`❌ Account balances failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 4: Transaction History
      addResult(`📜 Testing transaction history for ${testAddress}...`);
      try {
        const history = await noditService.getAccountTransactionHistory(testAddress, { limit: 5 });
        addResult(`✅ Found ${history.transactions.length} recent transactions`);
      } catch (error) {
        addResult(`❌ Transaction history failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 5: Address Analysis
      addResult(`🏆 Testing address analysis for ${testAddress}...`);
      try {
        const reputation: AddressReputation = await noditService.getAddressReputation(testAddress);
        addResult(`✅ Reputation calculated - Risk: ${reputation.risk_score}/100`);
        addResult(`   Transaction count: ${reputation.transaction_count}, Is contract: ${reputation.is_contract}`);
      } catch (error) {
        addResult(`❌ Address reputation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      addResult('🎉 Nodit integration tests completed!');

    } catch (error) {
      addResult(`❌ Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTransactionMonitoring = async () => {
    addResult('🔄 Testing transaction monitoring...');
    try {
      const subscriptionId = await noditService.startTransactionMonitoring(testAddress, (update) => {
        addResult(`📨 Transaction update: ${update.transaction_hash} - ${update.status}`);
      });
      addResult(`✅ Transaction monitoring started with ID: ${subscriptionId}`);

      // Stop monitoring after 10 seconds
      setTimeout(() => {
        noditService.stopTransactionMonitoring(subscriptionId);
        addResult('🛑 Transaction monitoring stopped');
      }, 10000);
    } catch (error) {
      addResult(`❌ Transaction monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nodit Integration Test</h1>

      {/* Service Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Service Status</h2>
        {status ? (
          <div className="space-y-1 text-sm">
            <div>Initialized: {status.isInitialized ? '✅' : '❌'}</div>
            <div>Configured: {status.isConfigured ? '✅' : '❌'}</div>
            <div>Has API Key: {status.config.hasApiKey ? '✅' : '❌'}</div>
            <div>Web3 Data API: {status.config.web3DataApiUrl}</div>
            <div>Indexer API: {status.config.indexerApiUrl}</div>
            <div>Has Webhook URL: {status.config.hasWebhookUrl ? '✅' : '❌'}</div>
          </div>
        ) : (
          <div>Loading status...</div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 space-x-4">
        <button
          onClick={runBasicTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Running Tests...' : 'Run Basic Tests'}
        </button>

        <button
          onClick={testTransactionMonitoring}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Transaction Monitoring
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
        <div className="mb-2 text-white">Test Results:</div>
        {testResults.length === 0 ? (
          <div className="text-gray-400">Click "Run Basic Tests" to start testing...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))
        )}
      </div>

      {/* Test Address Info */}
      <div className="mt-4 text-sm text-gray-600">
        <div>Test Address: {testAddress} (Aptos Foundation)</div>
        <div>Note: Some tests may fail if VITE_NODIT_API_KEY is not configured</div>
      </div>
    </div>
  );
};

export default NoditTest;