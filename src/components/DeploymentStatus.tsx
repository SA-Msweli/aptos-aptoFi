"use client";

import { useState } from 'react';
import { useDeploymentStatus, useNetworkInfo, useFeatureFlags } from '@/hooks/useDeployment';

interface DeploymentStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function DeploymentStatus({ showDetails = false, className = '' }: DeploymentStatusProps) {
  const { status, loading, error, refresh } = useDeploymentStatus();
  const { networkInfo } = useNetworkInfo();
  const { features } = useFeatureFlags();
  const [expanded, setExpanded] = useState(showDetails);

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading deployment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">❌</span>
            <span className="text-red-800 font-medium">Deployment Error</span>
          </div>
          <button
            onClick={refresh}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            Retry
          </button>
        </div>
        <p className="text-red-700 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <span className="text-gray-600">No deployment status available</span>
      </div>
    );
  }

  const { isHealthy, config, info, validation } = status;

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Status Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Deployment Status
              </h3>
              <p className="text-sm text-gray-600">
                {isHealthy ? 'Healthy' : 'Issues Detected'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refresh}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Refresh status"
            >
              🔄
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Network</p>
            <p className="font-medium">{networkInfo?.network || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-gray-600">Version</p>
            <p className="font-medium">{config?.version || info?.version || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-gray-600">Contracts</p>
            <p className="font-medium">{config?.contracts ? Object.keys(config.contracts).length : 0}</p>
          </div>
          <div>
            <p className="text-gray-600">Build</p>
            <p className="font-medium">{info?.buildId || 'Unknown'}</p>
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="px-4 pb-4">
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
              <h4 className="text-red-800 font-medium text-sm mb-1">Errors</h4>
              <ul className="text-red-700 text-xs space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-yellow-800 font-medium text-sm mb-1">Warnings</h4>
              <ul className="text-yellow-700 text-xs space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Network Info */}
          {networkInfo && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Network Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-mono">{networkInfo.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Node URL:</span>
                  <span className="font-mono text-xs">{networkInfo.nodeUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deployer:</span>
                  <span className="font-mono text-xs">{networkInfo.deployerAddress}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contract Addresses */}
          {config?.contracts && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Contract Addresses</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(config.contracts).map(([name, address]) => (
                  <div key={name} className="flex justify-between">
                    <span className="text-gray-600">{name}:</span>
                    <span className="font-mono text-xs">{address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {Object.keys(features).length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Feature Flags</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(features).map(([name, enabled]) => (
                  <div key={name} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-gray-600">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Deployment Info</h4>
            <div className="space-y-2 text-sm">
              {config?.timestamp && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Deployed:</span>
                  <span>{new Date(config.timestamp).toLocaleString()}</span>
                </div>
              )}
              {info?.timestamp && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Built:</span>
                  <span>{new Date(info.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact deployment status indicator
 */
export function DeploymentStatusIndicator({ className = '' }: { className?: string }) {
  const { status, loading } = useDeploymentStatus();
  const { networkInfo } = useNetworkInfo();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs text-gray-500">Unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${status.isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-600">
        {networkInfo?.network || 'Unknown'} • {status.config?.version || 'Unknown'}
      </span>
    </div>
  );
}