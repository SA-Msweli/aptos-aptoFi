import type { Network } from "@aptos-labs/wallet-adapter-react";

// Network configuration from environment variables (exactly like optimus)
export const NETWORK: Network = (process.env.NEXT_PUBLIC_APP_NETWORK as Network) ?? "testnet";
export const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS ?? "0x90b34a9b1c27e9f299a004f1878bc6ccef137ff6542790876c04f6a95db9e377";
export const APTOS_API_KEY = process.env.NEXT_PUBLIC_APTOS_API_KEY;

// Deployed contract addresses from deployment.json (Production v2.0.0)
export const CONTRACT_ADDRESSES = {
  DID_REGISTRY: `${MODULE_ADDRESS}::did_registry`,
  KYC_DID_REGISTRY: `${MODULE_ADDRESS}::kyc_did_registry`,
  CHAINLINK_ORACLE: `${MODULE_ADDRESS}::chainlink_oracle`,
  REPUTATION_SYSTEM: `${MODULE_ADDRESS}::reputation_system`,
  RISK_MANAGER: `${MODULE_ADDRESS}::risk_manager`,
  AMM: `${MODULE_ADDRESS}::amm`,
  YIELD_VAULT: `${MODULE_ADDRESS}::yield_vault`,
  LENDING_PROTOCOL: `${MODULE_ADDRESS}::lending_protocol`,
  CCIP_BRIDGE: `${MODULE_ADDRESS}::ccip_bridge`,
} as const;

// Validate required environment variables
export const validateEnvironment = (): boolean => {
  const required = [
    { key: 'NEXT_PUBLIC_APP_NETWORK', value: NETWORK },
    { key: 'NEXT_PUBLIC_MODULE_ADDRESS', value: MODULE_ADDRESS },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(({ key }) => console.error(`  - ${key}`));
    return false;
  }

  if (!APTOS_API_KEY) {
    console.warn('⚠️  NEXT_PUBLIC_APTOS_API_KEY not set - using public endpoints (rate limited)');
  }

  return true;
};

// Log configuration (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Configuration:');
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`📝 Module Address: ${MODULE_ADDRESS}`);
  console.log(`🔑 API Key: ${APTOS_API_KEY ? '✅ Set' : '❌ Not Set'}`);

  validateEnvironment();
}