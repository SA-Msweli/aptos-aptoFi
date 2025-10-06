/**
 * Hyperion Test Utilities
 * 
 * This module provides utilities for testing the Hyperion SDK integration
 * and verifying that all functionality works correctly.
 */

import { hyperionService } from '../services/hyperionService';
import { validateHyperionConfig, getHyperionConfig } from './hyperionClient';

/**
 * Test configuration and connectivity
 */
export const testHyperionConfiguration = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🔧 Testing Hyperion configuration...');

    // Check configuration
    const config = getHyperionConfig();
    const isConfigValid = validateHyperionConfig();

    console.log('Network Configuration:', {
      envNetwork: config.network,
      resolvedNetwork: config.resolvedNetwork,
      aptosApiKeyPresent: !!config.aptosApiKey,
    });

    if (!isConfigValid) {
      return {
        success: false,
        message: 'Hyperion configuration is invalid. Please check your environment variables.',
        details: config,
      };
    }

    // Check service status
    const serviceStatus = hyperionService.getServiceStatus();
    console.log('Service Status:', serviceStatus);

    return {
      success: true,
      message: `Hyperion configuration is valid (Network: ${config.resolvedNetwork})`,
      details: serviceStatus,
    };
  } catch (error) {
    return {
      success: false,
      message: `Configuration test failed: ${error}`,
      details: { error },
    };
  }
};

/**
 * Test basic SDK connectivity
 */
export const testHyperionConnectivity = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🌐 Testing Hyperion SDK connectivity...');

    // Try to get liquidity pools (this will test SDK initialization)
    const pools = await hyperionService.getLiquidityPools();

    return {
      success: true,
      message: `Successfully connected to Hyperion SDK. Found ${pools.length} pools.`,
      details: { poolCount: pools.length, samplePools: pools.slice(0, 3) },
    };
  } catch (error) {
    return {
      success: false,
      message: `Connectivity test failed: ${error}`,
      details: { error: (error as Error).toString() },
    };
  }
};

/**
 * Test swap quote functionality
 */
export const testSwapQuote = async (
  tokenIn: string = '0x1::aptos_coin::AptosCoin', // Default to APT
  tokenOut: string = '0x1::coin::CoinStore', // Placeholder - replace with actual token
  amountIn: string = '1000000' // 1 APT (6 decimals)
): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('💱 Testing swap quote functionality...');

    const quote = await hyperionService.getSwapQuote(tokenIn, amountIn, true);

    return {
      success: true,
      message: 'Successfully retrieved swap quote',
      details: {
        tokenIn,
        tokenOut,
        amountIn,
        expectedOutput: quote,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Swap quote test failed: ${error}`,
      details: { error: (error as Error).toString(), tokenIn, tokenOut, amountIn },
    };
  }
};

/**
 * Test pool information retrieval
 */
export const testPoolInformation = async (
  poolAddress?: string
): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🏊 Testing pool information retrieval...');

    if (poolAddress) {
      // Test specific pool
      const pool = await hyperionService.getLiquidityPool(poolAddress);
      return {
        success: true,
        message: pool ? 'Successfully retrieved pool information' : 'Pool not found',
        details: { pool },
      };
    } else {
      // Test getting all pools
      const pools = await hyperionService.getLiquidityPools();
      return {
        success: true,
        message: `Successfully retrieved ${pools.length} pools`,
        details: {
          poolCount: pools.length,
          samplePools: pools.slice(0, 5).map(p => ({
            address: p.address,
            tokenA: p.tokenA,
            tokenB: p.tokenB,
            fee: p.fee,
          }))
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Pool information test failed: ${error}`,
      details: { error: (error as Error).toString(), poolAddress },
    };
  }
};

/**
 * Run all tests in sequence
 */
export const runAllHyperionTests = async (): Promise<{
  success: boolean;
  results: any[];
  summary: string;
}> => {
  console.log('🚀 Running comprehensive Hyperion integration tests...');

  const results = [];
  let successCount = 0;

  // Test 1: Configuration
  const configTest = await testHyperionConfiguration();
  results.push({ test: 'Configuration', ...configTest });
  if (configTest.success) successCount++;

  // Test 2: Connectivity (only if config is valid)
  if (configTest.success) {
    const connectivityTest = await testHyperionConnectivity();
    results.push({ test: 'Connectivity', ...connectivityTest });
    if (connectivityTest.success) successCount++;

    // Test 3: Pool Information (only if connectivity works)
    if (connectivityTest.success) {
      const poolTest = await testPoolInformation();
      results.push({ test: 'Pool Information', ...poolTest });
      if (poolTest.success) successCount++;

      // Test 4: Swap Quote (only if pools work)
      if (poolTest.success && poolTest.details?.samplePools?.length > 0) {
        // Use actual pool tokens if available
        const samplePool = poolTest.details.samplePools[0];
        const quoteTest = await testSwapQuote(
          samplePool.tokenA,
          samplePool.tokenB,
          '1000000'
        );
        results.push({ test: 'Swap Quote', ...quoteTest });
        if (quoteTest.success) successCount++;
      }
    }
  }

  const totalTests = results.length;
  const success = successCount === totalTests;

  return {
    success,
    results,
    summary: `${successCount}/${totalTests} tests passed. ${success ? '✅ All tests passed!' : '❌ Some tests failed.'}`,
  };
};

/**
 * Print test results in a readable format
 */
export const printTestResults = (results: any[]): void => {
  console.log('\n📊 Hyperion Integration Test Results:');
  console.log('=====================================');

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.test}: ${result.message}`);

    if (result.details && Object.keys(result.details).length > 0) {
      console.log('   Details:', JSON.stringify(result.details, null, 2));
    }
    console.log('');
  });
};

/**
 * Quick test function for development
 */
export const quickTest = async (): Promise<void> => {
  const { results, summary } = await runAllHyperionTests();
  printTestResults(results);
  console.log(summary);
};

export default {
  testHyperionConfiguration,
  testHyperionConnectivity,
  testSwapQuote,
  testPoolInformation,
  runAllHyperionTests,
  printTestResults,
  quickTest,
};