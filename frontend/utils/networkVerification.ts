/**
 * Network Configuration Verification
 * 
 * Simple utility to verify that the network configuration is correct
 */

import { Network } from "@aptos-labs/ts-sdk";
import { getHyperionConfig } from './hyperionClient';

/**
 * Verify network configuration
 */
export const verifyNetworkConfig = () => {
  const config = getHyperionConfig();

  console.log('🌐 Network Configuration Verification:');
  console.log('=====================================');
  console.log(`Environment Network: ${config.network}`);
  console.log(`Resolved Network: ${config.resolvedNetwork}`);
  console.log(`Network Enum Value: ${config.resolvedNetwork}`);
  console.log(`API Key Present: ${config.aptosApiKey ? '✅ Yes' : '❌ No'}`);
  console.log(`CLMM Address: ${config.clmmAddress || 'Not set (optional)'}`);

  // Verify we're on testnet
  if (config.resolvedNetwork === Network.TESTNET) {
    console.log('✅ Correctly configured for TESTNET');
  } else {
    console.log(`⚠️  Currently configured for ${config.resolvedNetwork}`);
  }

  return {
    isTestnet: config.resolvedNetwork === Network.TESTNET,
    isMainnet: config.resolvedNetwork === Network.MAINNET,
    isDevnet: config.resolvedNetwork === Network.DEVNET,
    hasApiKey: !!config.aptosApiKey,
    config,
  };
};

export default verifyNetworkConfig;