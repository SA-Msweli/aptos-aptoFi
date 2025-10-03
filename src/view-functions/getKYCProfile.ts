import { aptosClient } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export interface KYCProfile {
  kycLevel: number;
  verificationStatus: number;
  complianceStatus: number;
  verifiedAt: number;
  expiresAt: number;
  isActive: boolean;
  isSuspended: boolean;
}

export interface ComplianceData {
  countryCode: string;
  amlRiskScore: number;
  sanctionsCheck: boolean;
  pepCheck: boolean;
  complianceExpiry: number;
  lastComplianceCheck?: number;
}

export interface KYCRegistryStats {
  totalProfiles: number;
  verifiedProfiles: number;
}

// KYC Levels
export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  ENHANCED: 2,
  INSTITUTIONAL: 3,
} as const;

// Compliance Status
export const COMPLIANCE_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  SUSPENDED: 3,
  EXPIRED: 4,
} as const;

// Document Types
export const DOCUMENT_TYPES = {
  PASSPORT: 1,
  DRIVERS_LICENSE: 2,
  NATIONAL_ID: 3,
  PROOF_OF_ADDRESS: 4,
  BANK_STATEMENT: 5,
  BUSINESS_REGISTRATION: 6,
} as const;

export const getKYCProfile = async (accountAddress: string): Promise<KYCProfile | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::get_kyc_profile`,
        functionArguments: [accountAddress],
      },
    });

    if (result && result.length >= 7) {
      return {
        kycLevel: parseInt(result[0] as string),
        verificationStatus: parseInt(result[1] as string),
        complianceStatus: parseInt(result[2] as string),
        verifiedAt: parseInt(result[3] as string),
        expiresAt: parseInt(result[4] as string),
        isActive: result[5] as boolean,
        isSuspended: result[6] as boolean,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching KYC profile:", error);
    return null;
  }
};

export const getComplianceData = async (accountAddress: string): Promise<ComplianceData | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::get_compliance_data`,
        functionArguments: [accountAddress],
      },
    });

    if (result && result.length >= 5) {
      return {
        countryCode: result[0] as string,
        amlRiskScore: parseInt(result[1] as string),
        sanctionsCheck: result[2] as boolean,
        pepCheck: result[3] as boolean,
        complianceExpiry: parseInt(result[4] as string),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching compliance data:", error);
    return null;
  }
};

export const isKYCCompliant = async (
  accountAddress: string,
  requiredLevel: number
): Promise<boolean> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::is_kyc_compliant`,
        functionArguments: [accountAddress, requiredLevel.toString()],
      },
    });

    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking KYC compliance:", error);
    return false;
  }
};

export const getDocumentCount = async (accountAddress: string): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::get_document_count`,
        functionArguments: [accountAddress],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error fetching document count:", error);
    return 0;
  }
};

export const getKYCRegistryStats = async (): Promise<KYCRegistryStats> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::get_registry_stats`,
        functionArguments: [],
      },
    });

    return {
      totalProfiles: parseInt(result[0] as string),
      verifiedProfiles: parseInt(result[1] as string),
    };
  } catch (error) {
    console.error("Error fetching registry stats:", error);
    return { totalProfiles: 0, verifiedProfiles: 0 };
  }
};

export const getKYCLevelName = (level: number): string => {
  switch (level) {
    case KYC_LEVELS.NONE: return "Not Verified";
    case KYC_LEVELS.BASIC: return "Basic Verification";
    case KYC_LEVELS.ENHANCED: return "Enhanced Verification";
    case KYC_LEVELS.INSTITUTIONAL: return "Institutional Verification";
    default: return "Unknown";
  }
};

export const getComplianceStatusName = (status: number): string => {
  switch (status) {
    case COMPLIANCE_STATUS.PENDING: return "Pending Review";
    case COMPLIANCE_STATUS.APPROVED: return "Approved";
    case COMPLIANCE_STATUS.REJECTED: return "Rejected";
    case COMPLIANCE_STATUS.SUSPENDED: return "Suspended";
    case COMPLIANCE_STATUS.EXPIRED: return "Expired";
    default: return "Unknown";
  }
};

export const getComplianceStatusColor = (status: number): string => {
  switch (status) {
    case COMPLIANCE_STATUS.PENDING: return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case COMPLIANCE_STATUS.APPROVED: return "text-green-600 bg-green-50 border-green-200";
    case COMPLIANCE_STATUS.REJECTED: return "text-red-600 bg-red-50 border-red-200";
    case COMPLIANCE_STATUS.SUSPENDED: return "text-orange-600 bg-orange-50 border-orange-200";
    case COMPLIANCE_STATUS.EXPIRED: return "text-gray-600 bg-gray-50 border-gray-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

export const getRiskScoreColor = (score: number): string => {
  if (score <= 20) return "text-green-600";
  if (score <= 50) return "text-yellow-600";
  if (score <= 70) return "text-orange-600";
  return "text-red-600";
};

export const getRiskScoreLabel = (score: number): string => {
  if (score <= 20) return "Low Risk";
  if (score <= 50) return "Medium Risk";
  if (score <= 70) return "High Risk";
  return "Very High Risk";
};