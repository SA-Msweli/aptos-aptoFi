import { CONTRACT_ADDRESSES } from "@/lib/constants";

export interface CreateKYCProfileArguments {
  profileHash: string;
  fullNameHash: string;
  dateOfBirthHash: string;
  nationalityHash: string;
  addressHash: string;
  countryCode: string;
  metadataKeys: string[];
  metadataValues: string[];
}

export interface SubmitKYCDocumentArguments {
  documentType: number;
  documentHash: string;
  ipfsHash: string;
  issuedDate: number;
  expiryDate: number;
  issuingAuthority: string;
}

export interface VerifyKYCProfileArguments {
  userAddress: string;
  newKycLevel: number;
  verificationStatus: number;
  amlRiskScore: number;
  sanctionsCheck: boolean;
  pepCheck: boolean;
  notes: string;
}

export interface RegisterKYCProviderArguments {
  providerAddress: string;
  providerName: string;
  licenseNumber: string;
  authorizedLevels: number[];
}

/**
 * Create KYC profile entry function
 */
export const createKYCProfile = (args: CreateKYCProfileArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::create_kyc_profile`,
      functionArguments: [
        args.profileHash,
        args.fullNameHash,
        args.dateOfBirthHash,
        args.nationalityHash,
        args.addressHash,
        args.countryCode,
        args.metadataKeys,
        args.metadataValues,
      ],
    },
  };
};

/**
 * Submit KYC document entry function
 */
export const submitKYCDocument = (args: SubmitKYCDocumentArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::submit_kyc_document`,
      functionArguments: [
        args.documentType.toString(),
        args.documentHash,
        args.ipfsHash,
        args.issuedDate.toString(),
        args.expiryDate.toString(),
        args.issuingAuthority,
      ],
    },
  };
};

/**
 * Verify KYC profile entry function (for KYC providers)
 */
export const verifyKYCProfile = (args: VerifyKYCProfileArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::verify_kyc_profile`,
      functionArguments: [
        args.userAddress,
        args.newKycLevel.toString(),
        args.verificationStatus.toString(),
        args.amlRiskScore.toString(),
        args.sanctionsCheck,
        args.pepCheck,
        args.notes,
      ],
    },
  };
};

/**
 * Register KYC provider entry function (admin only)
 */
export const registerKYCProvider = (args: RegisterKYCProviderArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::register_kyc_provider`,
      functionArguments: [
        args.providerAddress,
        args.providerName,
        args.licenseNumber,
        args.authorizedLevels.map(level => level.toString()),
      ],
    },
  };
};

/**
 * Initialize KYC registry entry function (admin only)
 */
export const initializeKYCRegistry = () => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.KYC_DID_REGISTRY}::initialize`,
      functionArguments: [],
    },
  };
};