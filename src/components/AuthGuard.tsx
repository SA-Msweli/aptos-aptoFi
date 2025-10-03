"use client";

import { useState, useEffect, ReactNode } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getUserProfile } from "@/view-functions/getProfile";
import { useSecurity } from "@/hooks/useSecurity";

interface AuthGuardProps {
  children: ReactNode;
  requireProfile?: boolean;
  requireSecureDevice?: boolean;
  fallback?: ReactNode;
}

export function AuthGuard({
  children,
  requireProfile = false,
  requireSecureDevice = false,
  fallback
}: AuthGuardProps) {
  const { connected, account } = useWallet();
  const { securityStatus, hasActiveAlerts, requiresAttention, loading: securityLoading } = useSecurity();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (!connected || !account?.address) {
        setHasProfile(null);
        setIsLoading(false);
        return;
      }

      if (!requireProfile) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(account.address.toString());
        setHasProfile(profile !== null && profile.isActive);
      } catch (error) {
        console.error("Failed to check profile:", error);
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, [connected, account, requireProfile]);

  // Show loading state
  if (isLoading || securityLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-yellow-800">Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  // Connected but no profile required
  if (!requireProfile) {
    return <>{children}</>;
  }

  // Profile required but not found
  if (requireProfile && !hasProfile) {
    return fallback || (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-600">🚫</span>
          <div>
            <p className="text-red-800 font-medium">DID Profile Required</p>
            <p className="text-red-700 text-sm">
              You need to create a DID profile before accessing this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Security checks
  if (requiresAttention) {
    return fallback || (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-600 text-2xl">🚨</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Security Alert</h3>
          <p className="text-red-700 mb-4">
            Your account has been flagged for security review due to {securityStatus.riskLevel} risk activity.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-200 mb-4">
            <h4 className="font-medium text-red-800 mb-2">Security Status:</h4>
            <div className="text-sm text-red-700 space-y-1">
              <p>• Risk Level: {securityStatus.riskLevel.toUpperCase()}</p>
              <p>• Device Trusted: {securityStatus.deviceTrusted ? 'Yes' : 'No'}</p>
              <p>• Active Alerts: {securityStatus.activeAlerts.length}</p>
              <p>• Last Check: {new Date(securityStatus.lastSecurityCheck).toLocaleString()}</p>
            </div>
          </div>
          <div className="space-x-3">
            <button
              onClick={() => window.location.href = '#security'}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Review Security
            </button>
            <button
              onClick={() => window.location.href = '#support'}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Device security check
  if (requireSecureDevice && !securityStatus.deviceTrusted) {
    return fallback || (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-orange-600 text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Device Verification Required</h3>
          <p className="text-orange-700 mb-4">
            This device is not recognized. For your security, please verify device ownership.
          </p>
          <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
            <h4 className="font-medium text-orange-800 mb-2">Security Information:</h4>
            <div className="text-sm text-orange-700 space-y-1">
              <p>• New device detected</p>
              <p>• Additional verification required</p>
              <p>• Enhanced monitoring active</p>
            </div>
          </div>
          <div className="space-x-3">
            <button
              onClick={() => window.location.href = '#device-verification'}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Verify Device
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show security alerts if any
  const SecurityAlertsDisplay = () => {
    if (!hasActiveAlerts) return null;

    return (
      <div className="mb-4 space-y-2">
        {securityStatus.activeAlerts.slice(0, 3).map(alert => (
          <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
              alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                'bg-yellow-50 border-yellow-200'
            }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <span className={
                  alert.severity === 'critical' ? 'text-red-600' :
                    alert.severity === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                }>
                  {alert.severity === 'critical' ? '🚨' :
                    alert.severity === 'high' ? '⚠️' : 'ℹ️'}
                </span>
                <div>
                  <p className={`font-medium ${alert.severity === 'critical' ? 'text-red-800' :
                      alert.severity === 'high' ? 'text-orange-800' :
                        'text-yellow-800'
                    }`}>
                    {alert.title}
                  </p>
                  <p className={`text-sm ${alert.severity === 'critical' ? 'text-red-700' :
                      alert.severity === 'high' ? 'text-orange-700' :
                        'text-yellow-700'
                    }`}>
                    {alert.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {/* Handle alert action */ }}
                className={`text-xs px-2 py-1 rounded ${alert.severity === 'critical' ? 'bg-red-600 text-white hover:bg-red-700' :
                    alert.severity === 'high' ? 'bg-orange-600 text-white hover:bg-orange-700' :
                      'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
              >
                Review
              </button>
            </div>
          </div>
        ))}
        {securityStatus.activeAlerts.length > 3 && (
          <div className="text-center">
            <button
              onClick={() => window.location.href = '#security-alerts'}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View {securityStatus.activeAlerts.length - 3} more alerts
            </button>
          </div>
        )}
      </div>
    );
  };

  // All checks passed
  return (
    <>
      <SecurityAlertsDisplay />
      {children}
    </>
  );
}