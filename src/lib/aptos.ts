import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import { NETWORK, APTOS_API_KEY } from './constants';

// Import deployment configuration
import deploymentConfig from '../deployment.json';

export const NETWORK_CONFIG = {
  NETWORK: NETWORK as 'testnet' | 'mainnet' | 'devnet',
  NODE_URL: deploymentConfig.nodeUrl,
  DEPLOYER_ADDRESS: deploymentConfig.deployerAddress,
} as const;

export const CONTRACTS = {
  DID_REGISTRY: deploymentConfig.contracts.did_registry,
  KYC_DID_REGISTRY: deploymentConfig.contracts.kyc_did_registry,
  CHAINLINK_ORACLE: deploymentConfig.contracts.chainlink_oracle,
  REPUTATION_SYSTEM: deploymentConfig.contracts.reputation_system,
  RISK_MANAGER: deploymentConfig.contracts.risk_manager,
  AMM: deploymentConfig.contracts.amm,
  YIELD_VAULT: deploymentConfig.contracts.yield_vault,
  LENDING_PROTOCOL: deploymentConfig.contracts.lending_protocol,
  CCIP_BRIDGE: deploymentConfig.contracts.ccip_bridge,
} as const;

// Initialize Aptos client exactly like optimus
const aptos = new Aptos(new AptosConfig({
  network: NETWORK,
  clientConfig: { API_KEY: APTOS_API_KEY }
}));

// Reuse same Aptos instance to utilize cookie based sticky routing (like optimus)
export function aptosClient() {
  return aptos;
}

// Also export the instance directly for convenience
export { aptos };

// Validate configuration
export const validateContractConfig = (): boolean => {
  const requiredContracts = [
    'did_registry',
    'kyc_did_registry',
    'chainlink_oracle',
    'reputation_system',
    'risk_manager',
    'amm',
    'yield_vault',
    'lending_protocol',
    'ccip_bridge'
  ];

  for (const contract of requiredContracts) {
    if (!deploymentConfig.contracts[contract as keyof typeof deploymentConfig.contracts]) {
      console.error(`Missing contract address for: ${contract}`);
      return false;
    }
  }

  if (!deploymentConfig.nodeUrl || !deploymentConfig.deployerAddress) {
    console.error('Missing network configuration');
    return false;
  }

  return true;
};

console.log('📋 Aptos Configuration Loaded:');
console.log(`🌐 Network: ${NETWORK_CONFIG.NETWORK}`);
console.log(`🔗 Node URL: ${NETWORK_CONFIG.NODE_URL}`);
console.log(`📝 Deployer: ${NETWORK_CONFIG.DEPLOYER_ADDRESS}`);
console.log(`📦 Contracts: ${Object.keys(CONTRACTS).length} loaded`);

if (!validateContractConfig()) {
  console.warn('⚠️  Contract configuration validation failed');
}