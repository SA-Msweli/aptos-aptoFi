"use client";

import { useState, useEffect } from 'react';
import {
  getDeploymentConfig,
  getDeploymentInfo,
  getDeploymentStatus,
  type DeploymentConfig,
  type DeploymentInfo
} from '@/lib/deployment';

/**
 * Hook to access deployment configuration
 */
export function useDeploymentConfig() {
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        const deploymentConfig = await getDeploymentConfig();

        if (mounted) {
          setConfig(deploymentConfig);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load deployment config');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return { config, loading, error };
}

/**
 * Hook to access deployment info
 */
export function useDeploymentInfo() {
  const [info, setInfo] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const deploymentInfo = await getDeploymentInfo();

        if (mounted) {
          setInfo(deploymentInfo);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load deployment info');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInfo();

    return () => {
      mounted = false;
    };
  }, []);

  return { info, loading, error };
}

/**
 * Hook to access deployment status
 */
export function useDeploymentStatus() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getDeploymentStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);

      const deploymentStatus = await getDeploymentStatus();
      setStatus(deploymentStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { status, loading, error, refresh };
}

/**
 * Hook to get contract addresses
 */
export function useContractAddresses() {
  const { config, loading, error } = useDeploymentConfig();

  const getAddress = (contractName: string): string | null => {
    if (!config || !config.contracts) {
      return null;
    }
    return config.contracts[contractName] || null;
  };

  const getAllAddresses = (): Record<string, string> => {
    if (!config || !config.contracts) {
      return {};
    }
    return config.contracts;
  };

  return {
    contracts: config?.contracts || {},
    getAddress,
    getAllAddresses,
    loading,
    error
  };
}

/**
 * Hook to check feature flags
 */
export function useFeatureFlags() {
  const { config, loading, error } = useDeploymentConfig();

  const isEnabled = (featureName: string): boolean => {
    if (!config || !config.features) {
      return false;
    }
    return config.features[featureName] === true;
  };

  const getAllFeatures = (): Record<string, boolean> => {
    if (!config || !config.features) {
      return {};
    }
    return config.features;
  };

  return {
    features: config?.features || {},
    isEnabled,
    getAllFeatures,
    loading,
    error
  };
}

/**
 * Hook to get network information
 */
export function useNetworkInfo() {
  const { config, loading, error } = useDeploymentConfig();

  const networkInfo = config ? {
    network: config.network,
    nodeUrl: config.nodeUrl,
    deployerAddress: config.deployerAddress
  } : null;

  return {
    networkInfo,
    network: config?.network || null,
    nodeUrl: config?.nodeUrl || null,
    deployerAddress: config?.deployerAddress || null,
    loading,
    error
  };
}