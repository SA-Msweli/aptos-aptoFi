/**
 * Hyperion SDK Client Configuration and Utilities
 * 
 * This module provides configuration and utility functions for interacting
 * with the Hyperion SDK for CLMM (Concentrated Liquidity Market Maker) operations.
 */

import { initHyperionSDK } from '@hyperionxyz/sdk';
import { Network } from "@aptos-labs/ts-sdk";

// Environment configuration
const HYPERION_CONFIG = {
  network: import.meta.env.VITE_APP_NETWORK || 'testnet',
  aptosApiKey: import.meta.env.VITE_APTOS_API_KEY || '',
  clmmAddress: import.meta.env.VITE_HYPERION_CLMM_ADDRESS || '',
};

/**
 * Get the Aptos Network enum value based on environment
 */
const getAptosNetwork = (): Network => {
  const networkName = HYPERION_CONFIG.network.toLowerCase();
  switch (networkName) {
    case 'mainnet':
      return Network.MAINNET;
    case 'testnet':
      return Network.TESTNET;
    case 'devnet':
      return Network.DEVNET;
    default:
      return Network.TESTNET;
  }
};

/**
 * Hyperion SDK client instance
 */
let hyperionClient: any = null;

/**
 * Initialize the Hyperion SDK client
 * @returns Promise<any> - Initialized Hyperion SDK client
 */
export const initializeHyperionClient = async (): Promise<any> => {
  if (hyperionClient) {
    return hyperionClient;
  }

  try {
    // Validate required configuration
    if (!HYPERION_CONFIG.aptosApiKey) {
      throw new Error('VITE_APTOS_API_KEY is required for Hyperion SDK initialization');
    }

    // Initialize Hyperion SDK with correct parameters
    const network = getAptosNetwork();
    hyperionClient = initHyperionSDK({
      network: network as Network.MAINNET | Network.TESTNET,
      APTOS_API_KEY: HYPERION_CONFIG.aptosApiKey,
    });

    console.log('Hyperion SDK client initialized successfully');
    return hyperionClient;
  } catch (error) {
    console.error('Failed to initialize Hyperion SDK client:', error);
    throw new Error(`Hyperion SDK initialization failed: ${error}`);
  }
};

/**
 * Get the current Hyperion SDK client instance
 * @returns any | null - Current client instance or null if not initialized
 */
export const getHyperionClient = (): any | null => {
  return hyperionClient;
};

/**
 * Ensure Hyperion client is initialized and return it
 * @returns Promise<any> - Initialized Hyperion SDK client
 */
export const ensureHyperionClient = async (): Promise<any> => {
  if (!hyperionClient) {
    return await initializeHyperionClient();
  }
  return hyperionClient;
};

/**
 * Get Hyperion configuration
 * @returns Object containing Hyperion configuration
 */
export const getHyperionConfig = () => {
  return {
    ...HYPERION_CONFIG,
    resolvedNetwork: getAptosNetwork(),
    isConfigured: Boolean(HYPERION_CONFIG.clmmAddress),
  };
};

/**
 * Validate Hyperion configuration
 * @returns boolean - True if configuration is valid
 */
export const validateHyperionConfig = (): boolean => {
  const requiredFields = ['aptosApiKey'];

  for (const field of requiredFields) {
    if (!HYPERION_CONFIG[field as keyof typeof HYPERION_CONFIG]) {
      console.warn(`Hyperion configuration missing: ${field}`);
      return false;
    }
  }

  return true;
};

/**
 * Reset Hyperion client (useful for testing or reconfiguration)
 */
export const resetHyperionClient = (): void => {
  hyperionClient = null;
};

export default {
  initializeHyperionClient,
  getHyperionClient,
  ensureHyperionClient,
  getHyperionConfig,
  validateHyperionConfig,
  resetHyperionClient,
};