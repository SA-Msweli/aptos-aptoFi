/**
 * Deployment configuration utilities
 * Provides access to deployment information and contract addresses
 */

export interface DeploymentConfig {
  network: string;
  nodeUrl: string;
  deployerAddress: string;
  timestamp: string;
  version: string;
  deployment_type: string;
  old_address?: string;
  contracts: Record<string, string>;
  features: Record<string, boolean>;
  transactions?: Record<string, string>;
}

export interface DeploymentInfo {
  network: string;
  nodeUrl: string;
  timestamp: string;
  version: string;
  buildId: string;
}

export interface DeploymentManifest {
  timestamp: string;
  buildId: string;
  version: string;
  environment: string;
  files: Array<{
    source: string;
    destination: string;
    size: number;
    modified: string;
  }>;
}

/**
 * Fetch deployment configuration from public directory
 */
export async function getDeploymentConfig(): Promise<DeploymentConfig | null> {
  try {
    const response = await fetch('/deployment/deployment.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch deployment config: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching deployment config:', error);
    return null;
  }
}

/**
 * Fetch deployment info from API endpoint
 */
export async function getDeploymentInfo(): Promise<DeploymentInfo | null> {
  try {
    const response = await fetch('/api/deployment-info.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch deployment info: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching deployment info:', error);
    return null;
  }
}

/**
 * Fetch deployment manifest
 */
export async function getDeploymentManifest(): Promise<DeploymentManifest | null> {
  try {
    const response = await fetch('/deployment/manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch deployment manifest: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching deployment manifest:', error);
    return null;
  }
}

/**
 * Get contract address by name
 */
export async function getContractAddress(contractName: string): Promise<string | null> {
  const config = await getDeploymentConfig();
  if (!config || !config.contracts) {
    return null;
  }

  return config.contracts[contractName] || null;
}

/**
 * Get all contract addresses
 */
export async function getAllContractAddresses(): Promise<Record<string, string>> {
  const config = await getDeploymentConfig();
  if (!config || !config.contracts) {
    return {};
  }

  return config.contracts;
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const config = await getDeploymentConfig();
  if (!config || !config.features) {
    return false;
  }

  return config.features[featureName] === true;
}

/**
 * Get network information
 */
export async function getNetworkInfo(): Promise<{ network: string; nodeUrl: string } | null> {
  const config = await getDeploymentConfig();
  if (!config) {
    return null;
  }

  return {
    network: config.network,
    nodeUrl: config.nodeUrl
  };
}

/**
 * Validate deployment configuration
 */
export async function validateDeploymentConfig(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const config = await getDeploymentConfig();

    if (!config) {
      errors.push('Deployment configuration not found');
      return { isValid: false, errors, warnings };
    }

    // Required fields validation
    const requiredFields = ['network', 'nodeUrl', 'deployerAddress', 'contracts'];
    for (const field of requiredFields) {
      if (!config[field as keyof DeploymentConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Contract validation
    if (config.contracts) {
      const contractCount = Object.keys(config.contracts).length;
      if (contractCount === 0) {
        errors.push('No contracts found in deployment configuration');
      } else if (contractCount < 5) {
        warnings.push(`Only ${contractCount} contracts found, expected more`);
      }

      // Validate contract address format
      for (const [name, address] of Object.entries(config.contracts)) {
        if (!address.startsWith('0x')) {
          errors.push(`Invalid contract address format for ${name}: ${address}`);
        }
      }
    }

    // Network validation
    const validNetworks = ['mainnet', 'testnet', 'devnet', 'local'];
    if (config.network && !validNetworks.includes(config.network)) {
      warnings.push(`Unknown network: ${config.network}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Get deployment status information
 */
export async function getDeploymentStatus(): Promise<{
  isHealthy: boolean;
  config: DeploymentConfig | null;
  info: DeploymentInfo | null;
  manifest: DeploymentManifest | null;
  validation: Awaited<ReturnType<typeof validateDeploymentConfig>>;
}> {
  const [config, info, manifest, validation] = await Promise.all([
    getDeploymentConfig(),
    getDeploymentInfo(),
    getDeploymentManifest(),
    validateDeploymentConfig()
  ]);

  const isHealthy = validation.isValid && config !== null;

  return {
    isHealthy,
    config,
    info,
    manifest,
    validation
  };
}