/**
 * Nodit Client Utility
 * 
 * This utility provides configuration and client initialization for Nodit APIs
 * following the Nodit Aptos quickstart guide: https://developer.nodit.io/reference/aptos-quickstart
 */

import axios, { AxiosInstance } from 'axios';

/**
 * Nodit configuration interface
 */
export interface NoditConfig {
  apiKey: string;
  web3DataApiUrl: string;
  indexerApiUrl: string;
  webhookUrl?: string;
  isConfigured: boolean;
}

/**
 * Nodit client instances
 */
interface NoditClients {
  web3DataClient: AxiosInstance | null;
  indexerClient: AxiosInstance | null;
}

// Global client instances
let noditClients: NoditClients = {
  web3DataClient: null,
  indexerClient: null,
};

/**
 * Get Nodit configuration from environment variables
 */
export function getNoditConfig(): NoditConfig {
  // Feature flag to disable Nodit temporarily
  const noditDisabled = import.meta.env.VITE_DISABLE_NODIT === 'true';

  if (noditDisabled) {
    console.log('🚫 Nodit features disabled via VITE_DISABLE_NODIT=true');
    return {
      apiKey: '',
      web3DataApiUrl: '',
      indexerApiUrl: '',
      webhookUrl: '',
      isConfigured: false,
    };
  }

  const apiKey = import.meta.env.VITE_NODIT_API_KEY || '';
  // Force testnet for now - remove this line once env vars are correct
  const network = import.meta.env.VITE_APP_NETWORK || 'testnet';

  // Debug logging
  console.log('🔧 Nodit Config Debug:', {
    VITE_APP_NETWORK: import.meta.env.VITE_APP_NETWORK,
    detectedNetwork: network,
    VITE_NODIT_WEB3_DATA_API_URL: import.meta.env.VITE_NODIT_WEB3_DATA_API_URL,
    VITE_NODIT_INDEXER_API_URL: import.meta.env.VITE_NODIT_INDEXER_API_URL
  });

  // Set default URLs based on network
  let defaultWeb3DataUrl: string;
  let defaultIndexerUrl: string;

  switch (network) {
    case 'mainnet':
      defaultWeb3DataUrl = 'https://aptos-mainnet.nodit.io';
      defaultIndexerUrl = 'https://aptos-indexer.nodit.io';
      break;
    case 'testnet':
      defaultWeb3DataUrl = 'https://aptos-testnet.nodit.io';
      defaultIndexerUrl = 'https://aptos-testnet-indexer.nodit.io';
      break;
    case 'devnet':
      defaultWeb3DataUrl = 'https://aptos-devnet.nodit.io';
      defaultIndexerUrl = 'https://aptos-devnet-indexer.nodit.io';
      break;
    default:
      // Default to testnet
      defaultWeb3DataUrl = 'https://aptos-testnet.nodit.io';
      defaultIndexerUrl = 'https://aptos-testnet-indexer.nodit.io';
  }

  // Use proxy in development to bypass CORS
  const isDevelopment = import.meta.env.DEV;
  const web3DataApiUrl = isDevelopment
    ? '/api/nodit'  // Use Vite proxy in development
    : (import.meta.env.VITE_NODIT_WEB3_DATA_API_URL || defaultWeb3DataUrl);
  const indexerApiUrl = isDevelopment
    ? '/api/nodit'  // Use same proxy for indexer
    : (import.meta.env.VITE_NODIT_INDEXER_API_URL || defaultIndexerUrl);
  const webhookUrl = import.meta.env.VITE_NODIT_WEBHOOK_URL || '';

  console.log('🌐 Final Nodit URLs:', {
    network,
    web3DataApiUrl,
    indexerApiUrl,
    isDevelopment,
    apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT SET'
  });

  return {
    apiKey,
    web3DataApiUrl,
    indexerApiUrl,
    webhookUrl,
    isConfigured: Boolean(apiKey && web3DataApiUrl && indexerApiUrl),
  };
}

/**
 * Validate Nodit configuration
 */
export function validateNoditConfig(config: NoditConfig): void {
  if (!config.apiKey) {
    throw new Error('Nodit API key is required. Please set VITE_NODIT_API_KEY in your environment.');
  }
  if (!config.web3DataApiUrl) {
    throw new Error('Nodit Web3 Data API URL is required. Please set VITE_NODIT_WEB3_DATA_API_URL in your environment.');
  }
  if (!config.indexerApiUrl) {
    throw new Error('Nodit Indexer API URL is required. Please set VITE_NODIT_INDEXER_API_URL in your environment.');
  }
}

/**
 * Create Nodit Web3 Data API client
 */
function createWeb3DataClient(config: NoditConfig): AxiosInstance {
  return axios.create({
    baseURL: config.web3DataApiUrl,
    headers: {
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });
}

/**
 * Create Nodit Indexer API client
 */
function createIndexerClient(config: NoditConfig): AxiosInstance {
  return axios.create({
    baseURL: config.indexerApiUrl,
    headers: {
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });
}

/**
 * Initialize Nodit clients
 */
export function initializeNoditClients(): NoditClients {
  try {
    const config = getNoditConfig();
    validateNoditConfig(config);

    const network = import.meta.env.VITE_APP_NETWORK || 'testnet';
    console.log('Initializing Nodit clients with config:', {
      network: network,
      web3DataApiUrl: config.web3DataApiUrl,
      indexerApiUrl: config.indexerApiUrl,
      hasApiKey: Boolean(config.apiKey),
      hasWebhookUrl: Boolean(config.webhookUrl),
    });

    const web3DataClient = createWeb3DataClient(config);
    const indexerClient = createIndexerClient(config);

    // Add response interceptors for error handling
    web3DataClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Nodit Web3 Data API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    indexerClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Nodit Indexer API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    noditClients = {
      web3DataClient,
      indexerClient,
    };

    console.log('Nodit clients initialized successfully');
    return noditClients;

  } catch (error) {
    console.error('Failed to initialize Nodit clients:', error);
    throw error;
  }
}

/**
 * Get Web3 Data API client (initialize if needed)
 */
export function getWeb3DataClient(): AxiosInstance {
  if (!noditClients.web3DataClient) {
    initializeNoditClients();
  }
  if (!noditClients.web3DataClient) {
    throw new Error('Failed to initialize Nodit Web3 Data API client');
  }
  return noditClients.web3DataClient;
}

/**
 * Get Indexer API client (initialize if needed)
 */
export function getIndexerClient(): AxiosInstance {
  if (!noditClients.indexerClient) {
    initializeNoditClients();
  }
  if (!noditClients.indexerClient) {
    throw new Error('Failed to initialize Nodit Indexer API client');
  }
  return noditClients.indexerClient;
}

/**
 * Ensure both Nodit clients are initialized
 */
export function ensureNoditClients(): NoditClients {
  if (!noditClients.web3DataClient || !noditClients.indexerClient) {
    initializeNoditClients();
  }
  if (!noditClients.web3DataClient || !noditClients.indexerClient) {
    throw new Error('Failed to initialize Nodit clients');
  }
  return noditClients;
}

/**
 * Reset Nodit clients (useful for testing or reconfiguration)
 */
export function resetNoditClients(): void {
  noditClients = {
    web3DataClient: null,
    indexerClient: null,
  };
  console.log('Nodit clients reset');
}

/**
 * Force re-initialization of Nodit clients with current configuration
 */
export function reinitializeNoditClients(): NoditClients {
  console.log('Force re-initializing Nodit clients...');
  resetNoditClients();
  return initializeNoditClients();
}

/**
 * Get current Nodit clients status
 */
export function getNoditClientsStatus() {
  const config = getNoditConfig();
  return {
    isInitialized: Boolean(noditClients.web3DataClient && noditClients.indexerClient),
    isConfigured: config.isConfigured,
    config: {
      hasApiKey: Boolean(config.apiKey),
      web3DataApiUrl: config.web3DataApiUrl,
      indexerApiUrl: config.indexerApiUrl,
      hasWebhookUrl: Boolean(config.webhookUrl),
    },
  };
}