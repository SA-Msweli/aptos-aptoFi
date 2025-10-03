"use client";

import { useState, useEffect, ReactNode } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getKYCProfile, isKYCCompliant, KYCProfile, KYC_LEVELS, COMPLIANCE_STATUS, getKYCLevelName } from "@/view-functions/getKYCProfile";

interface KYCGuardProps {
  children: ReactNode;
  requiredLevel?: number;
  operationType?: string;
  fallback?: ReactNode;
}

export function KYCGuard({
  children,
  requiredLevel = KYC_LEVELS.BASIC,
  operationType = "general",
  fallback
}: KYCGuardProps) {
  const { connected, account } = useWallet();
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCompliance = async () => {
      if (!connected || !account?.address) {
        setKycProfile(null);
        setIsCompliant(false);
        setIsLoading(false);
        return;
      }

      try {
        const [profile, compliant] = await Promise.all([
          getKYCProfile(account.address.toString()),
          isKYCCompliant(account.address.toString(), requiredLevel)
        ]);

        setKycProfile(profile);
        setIsCompliant(compliant);
      } catch (error) {
        console.error("Failed to check KYC compliance:", error);
        setKycProfile(null);
        setIsCompliant(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCompliance();
  }, [connected, account, requiredLevel]);

  // Show loading state
  if (isLoading) {
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

  // No KYC profile
  if (!kycProfile) {
    return fallback || (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-600 text-2xl">🚫</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">KYC Verification Required</h3>
          <p className="text-red-700 mb-4">
            You need to complete KYC verification to access this feature.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-200 mb-4">
            <h4 className="font-medium text-red-800 mb-2">Required for {operationType}:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Minimum verification level: {getKYCLevelName(requiredLevel)}</li>
              <li>• Identity document verification</li>
              <li>• Compliance screening</li>
              <li>• Risk assessment</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.href = '#profile'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Start KYC Verification
          </button>
        </div>
      </div>
    );
  }

  // KYC profile exists but not compliant
  if (!isCompliant) {
    const getComplianceIssue = () => {
      if (!kycProfile.isActive) return "Profile is inactive";
      if (kycProfile.isSuspended) return "Profile is suspended";
      if (kycProfile.kycLevel < requiredLevel) return `Insufficient verification level (${getKYCLevelName(kycProfile.kycLevel)} < ${getKYCLevelName(requiredLevel)})`;
      if (kycProfile.complianceStatus !== COMPLIANCE_STATUS.APPROVED) return "Compliance approval pending";
      if (kycProfile.expiresAt < Date.now() / 1000) return "KYC verification expired";
      return "Compliance requirements not met";
    };

    return fallback || (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-orange-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Compliance Issue</h3>
          <p className="text-orange-700 mb-4">
            {getComplianceIssue()}
          </p>

          <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
            <h4 className="font-medium text-orange-800 mb-2">Current Status:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-orange-700">
                  <strong>Level:</strong> {getKYCLevelName(kycProfile.kycLevel)}
                </p>
                <p className="text-orange-700">
                  <strong>Required:</strong> {getKYCLevelName(requiredLevel)}
                </p>
              </div>
              <div>
                <p className="text-orange-700">
                  <strong>Status:</strong> {kycProfile.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-orange-700">
                  <strong>Expires:</strong> {new Date(kycProfile.expiresAt * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-x-3">
            <button
              onClick={() => window.location.href = '#profile'}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Complete Verification
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed - show success indicator and content
  return (
    <div>
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-green-600">✅</span>
          <div className="flex-1">
            <p className="text-sm text-green-800">
              <strong>KYC Verified:</strong> {getKYCLevelName(kycProfile.kycLevel)} - Access granted for {operationType}
            </p>
          </div>
          <div className="text-xs text-green-600">
            Expires: {new Date(kycProfile.expiresAt * 1000).toLocaleDateString()}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}