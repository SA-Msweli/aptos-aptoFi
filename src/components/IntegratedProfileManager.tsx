"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useTransactions } from "@/lib/transactions";
import { getUserProfile, getReputationData, getTotalUsers, UserProfile, ReputationData } from "@/view-functions/getProfile";
import {
  getKYCProfile,
  getComplianceData,
  getDocumentCount,
  getKYCRegistryStats,
  isKYCCompliant,
  KYCProfile,
  ComplianceData,
  KYCRegistryStats,
  KYC_LEVELS,
  COMPLIANCE_STATUS,
  DOCUMENT_TYPES,
  getKYCLevelName,
  getComplianceStatusName,
  getComplianceStatusColor,
  getRiskScoreColor,
  getRiskScoreLabel,
} from "@/view-functions/getKYCProfile";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { COUNTRY_CODES, getCountryName } from "@/lib/countryCodes";
import { useEnhancedKYC } from "@/hooks/useEnhancedKYC";
import { useSecurity } from "@/hooks/useSecurity";

interface DocumentUpload {
  type: number;
  file: File | null;
  issuedDate: string;
  expiryDate: string;
  issuingAuthority: string;
}

export function IntegratedProfileManager() {
  const { connected, account } = useWallet();
  const {
    executeTransaction,
    createDIDProfile,
    updateDIDProfile,
    deactivateDIDProfile,
    initializeUserReputation,
    createKYCProfileTransaction,
    submitKYCDocumentTransaction,
  } = useTransactions();

  // State for all profile data
  const [didProfile, setDidProfile] = useState<UserProfile | null>(null);
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [registryStats, setRegistryStats] = useState<KYCRegistryStats>({ totalProfiles: 0, verifiedProfiles: 0 });
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'did' | 'kyc' | 'documents' | 'compliance' | 'enhanced-kyc' | 'security'>('overview');

  // Enhanced KYC and Security hooks
  const {
    kycStatus: enhancedKycStatus,
    biometricCapabilities,
    loading: enhancedKycLoading,
    error: enhancedKycError,
    checkBiometricSupport,
    captureBiometric,
    validateDocument: validateEnhancedDocument,
    performComplianceScreening,
    performRiskAssessment,
    getKYCCompletionStatus,
    getNextRecommendedAction,
    clearError: clearEnhancedKycError
  } = useEnhancedKYC();

  const {
    securityStatus,
    performSecurityCheck,
    hasActiveAlerts,
    requiresAttention: securityRequiresAttention
  } = useSecurity();

  // DID Profile Form - Fixed essential fields + custom fields
  const [didForm, setDidForm] = useState({
    // Essential fixed fields
    displayName: "",
    bio: "",
    website: "",
    twitter: "",
    linkedin: "",
    github: "",
    // Custom fields (key-value pairs)
    customFields: [{ key: "", value: "" }],
  });

  // KYC Profile Form
  const [kycForm, setKycForm] = useState({
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    address: "",
    countryCode: "",
  });

  // Country search state
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Document Upload Form
  const [documentUpload, setDocumentUpload] = useState<DocumentUpload>({
    type: DOCUMENT_TYPES.PASSPORT,
    file: null,
    issuedDate: "",
    expiryDate: "",
    issuingAuthority: "",
  });

  useEffect(() => {
    if (connected && account) {
      loadAllProfileData();
    }
  }, [connected, account]);

  const loadAllProfileData = async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      const [
        userProfile,
        reputationData,
        totalUsersCount,
        kycProfileData,
        complianceInfo,
        docCount,
        stats
      ] = await Promise.all([
        getUserProfile(account.address.toString()),
        getReputationData(account.address.toString()),
        getTotalUsers(),
        getKYCProfile(account.address.toString()),
        getComplianceData(account.address.toString()),
        getDocumentCount(account.address.toString()),
        getKYCRegistryStats(),
      ]);

      setDidProfile(userProfile);
      setReputation(reputationData);
      setTotalUsers(totalUsersCount);
      setKycProfile(kycProfileData);
      setComplianceData(complianceInfo);
      setDocumentCount(docCount);
      setRegistryStats(stats);

      // Pre-populate forms if data exists
      if (userProfile) {
        const getMetadataValue = (key: string) => {
          const index = userProfile.metadataKeys.indexOf(key);
          return index >= 0 ? userProfile.metadataValues[index] : "";
        };

        // Extract custom fields (non-standard ones)
        const standardFields = ["displayName", "name", "bio", "website", "twitter", "linkedin", "github"];
        const customFields = userProfile.metadataKeys
          .map((key, index) => ({ key, value: userProfile.metadataValues[index] }))
          .filter(field => !standardFields.includes(field.key) && field.key.trim() && field.value.trim());

        setDidForm({
          displayName: getMetadataValue("displayName") || getMetadataValue("name"),
          bio: getMetadataValue("bio"),
          website: getMetadataValue("website"),
          twitter: getMetadataValue("twitter"),
          linkedin: getMetadataValue("linkedin"),
          github: getMetadataValue("github"),
          customFields: customFields.length > 0 ? customFields : [{ key: "", value: "" }],
        });
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDIDProfile = async () => {
    if (!account) {
      alert("Wallet not connected");
      return;
    }

    const metadata = convertFormToMetadata(didForm);

    // Check if at least one field is filled
    if (metadata.keys.length === 0) {
      alert("Please fill in at least one profile field");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate profile hash from metadata and wallet address
      const profileHash = await generateDIDProfileHash(metadata, account.address.toString());

      const result = await createDIDProfile({
        profileHash,
        metadataKeys: metadata.keys,
        metadataValues: metadata.values,
      });

      if (result.success) {
        alert("DID Profile created successfully!");
        // Auto-initialize reputation system
        try {
          await initializeUserReputation({});
        } catch (repError) {
          console.warn("Failed to initialize reputation:", repError);
        }
        loadAllProfileData();
      } else {
        alert(`Failed to create DID profile: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to create DID profile:", error);
      alert("Failed to create DID profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateKYCProfile = async () => {
    if (!kycForm.fullName || !kycForm.countryCode || !account) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate profile hash from user data
      const profileHash = await generateProfileHash({
        fullName: kycForm.fullName,
        dateOfBirth: kycForm.dateOfBirth,
        nationality: kycForm.nationality,
        address: kycForm.address,
        countryCode: kycForm.countryCode,
        walletAddress: account.address.toString(),
      });

      // Hash sensitive data (in production, use proper encryption)
      const fullNameHash = btoa(kycForm.fullName);
      const dateOfBirthHash = btoa(kycForm.dateOfBirth);
      const nationalityHash = btoa(kycForm.nationality);
      const addressHash = btoa(kycForm.address);

      const result = await createKYCProfileTransaction({
        profileHash,
        fullNameHash,
        dateOfBirthHash,
        nationalityHash,
        addressHash,
        countryCode: kycForm.countryCode,
        metadataKeys: ["email", "phone"],
        metadataValues: ["", ""],
      });

      if (result.success) {
        alert("KYC Profile created successfully!");
        loadAllProfileData();
        setKycForm({
          fullName: "",
          dateOfBirth: "",
          nationality: "",
          address: "",
          countryCode: "",
        });
      } else {
        alert(`Failed to create KYC profile: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to create KYC profile:", error);
      alert("Failed to create KYC profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentUpload.file || !documentUpload.issuingAuthority) {
      alert("Please select a document and fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // In production, upload to IPFS and get hash
      const mockIPFSHash = "QmMockHash" + Date.now();
      const documentHash = await hashFile(documentUpload.file);

      const result = await submitKYCDocumentTransaction({
        documentType: documentUpload.type,
        documentHash,
        ipfsHash: mockIPFSHash,
        issuedDate: new Date(documentUpload.issuedDate).getTime(),
        expiryDate: new Date(documentUpload.expiryDate).getTime(),
        issuingAuthority: documentUpload.issuingAuthority,
      });

      if (result.success) {
        alert("Document submitted successfully!");
        loadAllProfileData();
        setDocumentUpload({
          type: DOCUMENT_TYPES.PASSPORT,
          file: null,
          issuedDate: "",
          expiryDate: "",
          issuingAuthority: "",
        });
      } else {
        alert(`Failed to submit document: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to submit document:", error);
      alert("Failed to submit document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hashFile = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateProfileHash = async (userData: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    countryCode: string;
    walletAddress: string;
  }): Promise<string> => {
    // Create a deterministic string from user data
    const dataString = [
      userData.fullName.toLowerCase().trim(),
      userData.dateOfBirth,
      userData.nationality.toLowerCase().trim(),
      userData.address.toLowerCase().trim(),
      userData.countryCode.toUpperCase(),
      userData.walletAddress.toLowerCase(),
      Date.now().toString() // Add timestamp for uniqueness
    ].join('|');

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateDIDProfileHash = async (metadata: { keys: string[]; values: string[] }, walletAddress: string): Promise<string> => {
    // Create a deterministic string from metadata and wallet
    const metadataString = metadata.keys.map((key, index) => `${key}:${metadata.values[index]}`).join('|');
    const dataString = [
      walletAddress.toLowerCase(),
      metadataString,
      Date.now().toString() // Add timestamp for uniqueness
    ].join('|');

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const convertFormToMetadata = (form: typeof didForm) => {
    const keys: string[] = [];
    const values: string[] = [];

    // Add essential fields if they have values
    if (form.displayName.trim()) {
      keys.push("displayName");
      values.push(form.displayName.trim());
    }
    if (form.bio.trim()) {
      keys.push("bio");
      values.push(form.bio.trim());
    }
    if (form.website.trim()) {
      keys.push("website");
      values.push(form.website.trim());
    }
    if (form.twitter.trim()) {
      keys.push("twitter");
      values.push(form.twitter.trim());
    }
    if (form.linkedin.trim()) {
      keys.push("linkedin");
      values.push(form.linkedin.trim());
    }
    if (form.github.trim()) {
      keys.push("github");
      values.push(form.github.trim());
    }

    // Add custom fields if they have both key and value
    form.customFields.forEach(field => {
      if (field.key.trim() && field.value.trim()) {
        keys.push(field.key.trim());
        values.push(field.value.trim());
      }
    });

    return { keys, values };
  };

  const getReputationTier = (score: number): { name: string; color: string; icon: string } => {
    if (score >= 900) return { name: "Platinum", color: "text-purple-600", icon: "💎" };
    if (score >= 750) return { name: "Gold", color: "text-yellow-600", icon: "🥇" };
    if (score >= 500) return { name: "Silver", color: "text-gray-600", icon: "🥈" };
    if (score >= 200) return { name: "Bronze", color: "text-orange-600", icon: "🥉" };
    return { name: "New User", color: "text-blue-600", icon: "🆕" };
  };

  const getOverallComplianceStatus = () => {
    if (!didProfile && !kycProfile) return { status: "Not Started", color: "text-gray-500", icon: "⚪" };
    if (didProfile && !kycProfile) return { status: "Basic Profile", color: "text-blue-600", icon: "🔵" };
    if (kycProfile && kycProfile.complianceStatus === COMPLIANCE_STATUS.APPROVED) {
      return { status: "Fully Compliant", color: "text-green-600", icon: "🟢" };
    }
    if (kycProfile && kycProfile.complianceStatus === COMPLIANCE_STATUS.PENDING) {
      return { status: "Under Review", color: "text-yellow-600", icon: "🟡" };
    }
    return { status: "Incomplete", color: "text-orange-600", icon: "🟠" };
  };



  if (!connected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Profile Management</h3>
        <p className="text-gray-500">Connect your wallet to manage your profile and KYC compliance</p>
      </div>
    );
  }

  const complianceStatus = getOverallComplianceStatus();

  return (
    <div className="space-y-6">
      {/* Header with Overall Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Profile & Compliance Center</h2>
            <p className="text-gray-600">Manage your identity, reputation, and regulatory compliance</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">{complianceStatus.icon}</span>
              <span className={`font-semibold ${complianceStatus.color}`}>{complianceStatus.status}</span>
            </div>
            <p className="text-sm text-gray-500">Overall Status</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{didProfile ? "✅" : "❌"}</div>
            <div className="text-sm text-gray-600">DID Profile</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{kycProfile ? getKYCLevelName(kycProfile.kycLevel) : "None"}</div>
            <div className="text-sm text-gray-600">KYC Level</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {reputation ? getReputationTier(reputation.totalScore).icon : "🆕"}
            </div>
            <div className="text-sm text-gray-600">Reputation</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{documentCount}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </div>
        </div>

        <button
          onClick={loadAllProfileData}
          disabled={isLoading}
          className="mt-4 flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${isLoading ? 'animate-spin' : ''}`}></div>
          <span>{isLoading ? "Loading..." : "Refresh All Data"}</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'did', label: 'DID Profile', icon: '🆔' },
              { id: 'kyc', label: 'KYC Setup', icon: '🛡️' },
              { id: 'documents', label: 'Documents', icon: '📄' },
              { id: 'compliance', label: 'Compliance', icon: '✅' },
              { id: 'enhanced-kyc', label: 'Enhanced KYC', icon: '🔐' },
              { id: 'security', label: 'Security', icon: '🛡️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DID Profile Status */}
                <div className={`p-6 rounded-lg border ${didProfile?.isActive
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">DID Profile</h3>
                    <span className="text-2xl">{didProfile?.isActive ? "✅" : "❌"}</span>
                  </div>
                  {didProfile ? (
                    <div className="space-y-2 text-sm">
                      <p><strong>Status:</strong> {didProfile.isActive ? "Active" : "Inactive"}</p>
                      <p><strong>Created:</strong> {new Date(didProfile.createdAt * 1000).toLocaleDateString()}</p>
                      <p><strong>Reputation Score:</strong> {reputation?.totalScore || 0}</p>
                    </div>
                  ) : (
                    <p className="text-gray-600">Create a DID profile to get started with AptoFi</p>
                  )}
                </div>

                {/* KYC Status */}
                <div className={`p-6 rounded-lg border ${kycProfile
                  ? getComplianceStatusColor(kycProfile.complianceStatus)
                  : 'bg-gray-50 border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">KYC Compliance</h3>
                    <span className="text-2xl">{kycProfile ? "🛡️" : "⚪"}</span>
                  </div>
                  {kycProfile ? (
                    <div className="space-y-2 text-sm">
                      <p><strong>Level:</strong> {getKYCLevelName(kycProfile.kycLevel)}</p>
                      <p><strong>Status:</strong> {getComplianceStatusName(kycProfile.complianceStatus)}</p>
                      <p><strong>Documents:</strong> {documentCount} submitted</p>
                      {complianceData && (
                        <p><strong>Risk Score:</strong> <span className={getRiskScoreColor(complianceData.amlRiskScore)}>{complianceData.amlRiskScore}/100</span></p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600">Complete KYC verification for higher limits and features</p>
                  )}
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">🎯 Recommended Next Steps</h3>
                <div className="space-y-3">
                  {!didProfile && (
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <span className="text-blue-800">Create your DID profile to access basic DeFi features</span>
                    </div>
                  )}
                  {didProfile && !kycProfile && (
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <span className="text-blue-800">Set up KYC compliance for higher transaction limits</span>
                    </div>
                  )}
                  {kycProfile && documentCount === 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <span className="text-blue-800">Upload identity documents for verification</span>
                    </div>
                  )}
                  {kycProfile && kycProfile.kycLevel < KYC_LEVELS.ENHANCED && (
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      <span className="text-blue-800">Complete enhanced verification for institutional features</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center p-4 bg-white border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{registryStats.verifiedProfiles.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Verified Users</div>
                </div>
                <div className="text-center p-4 bg-white border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {registryStats.totalProfiles > 0
                      ? Math.round((registryStats.verifiedProfiles / registryStats.totalProfiles) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Verification Rate</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'did' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">DID Profile Management</h3>
                {didProfile && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${didProfile.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {didProfile.isActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>

              {didProfile ? (
                <div className="space-y-6">
                  {/* Current Profile Info */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium mb-4">Current Profile Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Profile Hash</p>
                        <p className="font-mono text-xs break-all">{didProfile.profileHash}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created</p>
                        <p>{new Date(didProfile.createdAt * 1000).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Updated</p>
                        <p>{new Date(didProfile.updatedAt * 1000).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p>{didProfile.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>

                    {didProfile.metadataKeys.length > 0 && (
                      <div className="mt-4">
                        <p className="text-gray-600 mb-2">Metadata</p>
                        <div className="space-y-2">
                          {didProfile.metadataKeys.map((key, index) => (
                            <div key={index} className="flex items-center space-x-4">
                              <span className="font-medium text-sm w-20">{key}:</span>
                              <span className="text-sm">{didProfile.metadataValues[index] || 'Not set'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reputation && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-gray-600 mb-2">Reputation Score</p>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(reputation.totalScore / 10, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{reputation.totalScore}</span>
                          <span className={`text-sm ${getReputationTier(reputation.totalScore).color}`}>
                            {getReputationTier(reputation.totalScore).name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Update Profile Form */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-medium mb-4">Update Profile</h4>
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">⚠️</span>
                          <p className="text-sm text-yellow-800">
                            Updating your profile will generate a new profile hash. Your existing reputation and data will be preserved.
                          </p>
                        </div>
                      </div>

                      {/* Essential Profile Fields */}
                      <div className="space-y-4">
                        <h5 className="font-medium text-gray-900">Essential Information</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={didForm.displayName}
                              onChange={(e) => setDidForm({ ...didForm, displayName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Your display name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Website
                            </label>
                            <input
                              type="url"
                              value={didForm.website}
                              onChange={(e) => setDidForm({ ...didForm, website: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://yourwebsite.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bio
                          </label>
                          <textarea
                            value={didForm.bio}
                            onChange={(e) => setDidForm({ ...didForm, bio: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Tell us about yourself..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Twitter
                            </label>
                            <input
                              type="text"
                              value={didForm.twitter}
                              onChange={(e) => setDidForm({ ...didForm, twitter: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="@username"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              LinkedIn
                            </label>
                            <input
                              type="text"
                              value={didForm.linkedin}
                              onChange={(e) => setDidForm({ ...didForm, linkedin: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="linkedin.com/in/username"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              GitHub
                            </label>
                            <input
                              type="text"
                              value={didForm.github}
                              onChange={(e) => setDidForm({ ...didForm, github: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="github.com/username"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Custom Fields */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">Custom Fields</h5>
                          <button
                            onClick={() => setDidForm({
                              ...didForm,
                              customFields: [...didForm.customFields, { key: "", value: "" }]
                            })}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Custom Field
                          </button>
                        </div>

                        <div className="space-y-2">
                          {didForm.customFields.map((field, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => {
                                  const newFields = [...didForm.customFields];
                                  newFields[index].key = e.target.value;
                                  setDidForm({ ...didForm, customFields: newFields });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Field name"
                              />
                              <input
                                type="text"
                                value={field.value}
                                onChange={(e) => {
                                  const newFields = [...didForm.customFields];
                                  newFields[index].value = e.target.value;
                                  setDidForm({ ...didForm, customFields: newFields });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Value"
                              />
                              <button
                                onClick={() => {
                                  const newFields = didForm.customFields.filter((_, i) => i !== index);
                                  setDidForm({ ...didForm, customFields: newFields });
                                }}
                                className="text-red-600 hover:text-red-800 px-2"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={async () => {
                            if (!account) {
                              alert("Wallet not connected");
                              return;
                            }

                            const metadata = convertFormToMetadata(didForm);

                            if (metadata.keys.length === 0) {
                              alert("Please fill in at least one profile field");
                              return;
                            }

                            setIsSubmitting(true);
                            try {
                              // Generate new profile hash
                              const profileHash = await generateDIDProfileHash(metadata, account.address.toString());

                              const result = await updateDIDProfile({
                                profileHash,
                                metadataKeys: metadata.keys,
                                metadataValues: metadata.values,
                              });
                              if (result.success) {
                                alert("Profile updated successfully!");
                                loadAllProfileData();
                              } else {
                                alert(`Failed to update profile: ${result.errorMessage}`);
                              }
                            } catch (error) {
                              console.error("Failed to update profile:", error);
                              alert("Failed to update profile");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting || convertFormToMetadata(didForm).keys.length === 0}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Updating..." : "Update Profile"}
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to deactivate your profile?")) {
                              setIsSubmitting(true);
                              try {
                                const result = await deactivateDIDProfile({});
                                if (result.success) {
                                  alert("Profile deactivated successfully!");
                                  loadAllProfileData();
                                } else {
                                  alert(`Failed to deactivate profile: ${result.errorMessage}`);
                                }
                              } catch (error) {
                                console.error("Failed to deactivate profile:", error);
                                alert("Failed to deactivate profile");
                              } finally {
                                setIsSubmitting(false);
                              }
                            }
                          }}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Processing..." : "Deactivate Profile"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6">
                  <h4 className="font-medium mb-4">Create DID Profile</h4>
                  <p className="text-gray-600 mb-6">
                    Create your decentralized identity profile to access AptoFi features.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">ℹ️</span>
                        <p className="text-sm text-blue-800">
                          Your profile hash will be automatically generated from your metadata and wallet address to ensure uniqueness.
                        </p>
                      </div>
                    </div>

                    {/* Essential Profile Fields */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">Essential Information</h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={didForm.displayName}
                            onChange={(e) => setDidForm({ ...didForm, displayName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your display name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website
                          </label>
                          <input
                            type="url"
                            value={didForm.website}
                            onChange={(e) => setDidForm({ ...didForm, website: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={didForm.bio}
                          onChange={(e) => setDidForm({ ...didForm, bio: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Twitter
                          </label>
                          <input
                            type="text"
                            value={didForm.twitter}
                            onChange={(e) => setDidForm({ ...didForm, twitter: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="@username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            LinkedIn
                          </label>
                          <input
                            type="text"
                            value={didForm.linkedin}
                            onChange={(e) => setDidForm({ ...didForm, linkedin: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="linkedin.com/in/username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            GitHub
                          </label>
                          <input
                            type="text"
                            value={didForm.github}
                            onChange={(e) => setDidForm({ ...didForm, github: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="github.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">Custom Fields</h5>
                        <button
                          onClick={() => setDidForm({
                            ...didForm,
                            customFields: [...didForm.customFields, { key: "", value: "" }]
                          })}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Add Custom Field
                        </button>
                      </div>

                      <div className="space-y-2">
                        {didForm.customFields.map((field, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={field.key}
                              onChange={(e) => {
                                const newFields = [...didForm.customFields];
                                newFields[index].key = e.target.value;
                                setDidForm({ ...didForm, customFields: newFields });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Field name (e.g., company, role)"
                            />
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => {
                                const newFields = [...didForm.customFields];
                                newFields[index].value = e.target.value;
                                setDidForm({ ...didForm, customFields: newFields });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Value"
                            />
                            <button
                              onClick={() => {
                                const newFields = didForm.customFields.filter((_, i) => i !== index);
                                setDidForm({ ...didForm, customFields: newFields });
                              }}
                              className="text-red-600 hover:text-red-800 px-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleCreateDIDProfile}
                      disabled={isSubmitting || convertFormToMetadata(didForm).keys.length === 0}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Creating Profile..." : "Create DID Profile"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'kyc' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">KYC Setup & Verification</h3>
                {kycProfile && (
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplianceStatusColor(kycProfile.complianceStatus)}`}>
                      {getComplianceStatusName(kycProfile.complianceStatus)}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {getKYCLevelName(kycProfile.kycLevel)}
                    </span>
                  </div>
                )}
              </div>

              {kycProfile ? (
                <div className="space-y-6">
                  {/* Current KYC Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium mb-4">Current KYC Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">KYC Level</p>
                        <p className="font-medium">{getKYCLevelName(kycProfile.kycLevel)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Compliance Status</p>
                        <p className={`font-medium ${getComplianceStatusColor(kycProfile.complianceStatus).replace('bg-', 'text-').replace('-50', '-600')}`}>
                          {getComplianceStatusName(kycProfile.complianceStatus)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Verified At</p>
                        <p>{kycProfile.verifiedAt > 0 ? new Date(kycProfile.verifiedAt * 1000).toLocaleString() : 'Not verified'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Expires At</p>
                        <p>{new Date(kycProfile.expiresAt * 1000).toLocaleString()}</p>
                      </div>
                    </div>

                    {complianceData && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-medium mb-2">Compliance Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Country</p>
                            <p className="font-medium">{getCountryName(complianceData.countryCode)} ({complianceData.countryCode})</p>
                          </div>
                          <div>
                            <p className="text-gray-600">AML Risk Score</p>
                            <p className={`font-medium ${getRiskScoreColor(complianceData.amlRiskScore)}`}>
                              {complianceData.amlRiskScore}/100 ({getRiskScoreLabel(complianceData.amlRiskScore)})
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Sanctions Check</p>
                            <p className={`font-medium ${complianceData.sanctionsCheck ? 'text-red-600' : 'text-green-600'}`}>
                              {complianceData.sanctionsCheck ? 'Failed' : 'Passed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KYC Level Progression */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-medium mb-4">KYC Level Progression</h4>
                    <div className="space-y-4">
                      {[
                        { level: KYC_LEVELS.BASIC, name: 'Basic KYC', description: 'Identity verification with basic documents' },
                        { level: KYC_LEVELS.ENHANCED, name: 'Enhanced KYC', description: 'Additional verification with proof of address' },
                        { level: KYC_LEVELS.INSTITUTIONAL, name: 'Institutional KYC', description: 'Full compliance for institutional trading' },
                      ].map((levelInfo) => (
                        <div key={levelInfo.level} className={`flex items-center space-x-4 p-4 rounded-lg ${kycProfile.kycLevel >= levelInfo.level
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                          }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kycProfile.kycLevel >= levelInfo.level
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                            }`}>
                            {kycProfile.kycLevel >= levelInfo.level ? '✓' : levelInfo.level}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{levelInfo.name}</p>
                            <p className="text-sm text-gray-600">{levelInfo.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6">
                  <h4 className="font-medium mb-4">Create KYC Profile</h4>
                  <p className="text-gray-600 mb-6">
                    Complete KYC verification to access higher transaction limits and advanced features.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">ℹ️</span>
                        <p className="text-sm text-blue-800">
                          Your profile hash will be automatically generated from your personal information to ensure uniqueness and security.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={kycForm.fullName}
                          onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your full legal name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={kycForm.dateOfBirth}
                          onChange={(e) => setKycForm({ ...kycForm, dateOfBirth: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nationality
                        </label>
                        <input
                          type="text"
                          value={kycForm.nationality}
                          onChange={(e) => setKycForm({ ...kycForm, nationality: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your nationality"
                        />
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={countrySearch || (kycForm.countryCode ? getCountryName(kycForm.countryCode) : "")}
                            onChange={(e) => {
                              setCountrySearch(e.target.value);
                              setShowCountryDropdown(true);
                              if (!e.target.value) {
                                setKycForm({ ...kycForm, countryCode: "" });
                              }
                            }}
                            onFocus={() => setShowCountryDropdown(true)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search for your country..."
                          />
                          {showCountryDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {COUNTRY_CODES
                                .filter(country =>
                                  country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                  country.code.toLowerCase().includes(countrySearch.toLowerCase())
                                )
                                .slice(0, 10) // Limit to 10 results for performance
                                .map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setKycForm({ ...kycForm, countryCode: country.code });
                                      setCountrySearch("");
                                      setShowCountryDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                  >
                                    {country.name} ({country.code})
                                  </button>
                                ))}
                              {COUNTRY_CODES.filter(country =>
                                country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                country.code.toLowerCase().includes(countrySearch.toLowerCase())
                              ).length === 0 && countrySearch && (
                                  <div className="px-3 py-2 text-gray-500">
                                    No countries found matching "{countrySearch}"
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        {/* Click outside to close dropdown */}
                        {showCountryDropdown && (
                          <div
                            className="fixed inset-0 z-5"
                            onClick={() => setShowCountryDropdown(false)}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={kycForm.address}
                        onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Enter your full address"
                      />
                    </div>

                    <button
                      onClick={handleCreateKYCProfile}
                      disabled={isSubmitting || !kycForm.fullName || !kycForm.countryCode}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Creating KYC Profile..." : "Create KYC Profile"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Document Management</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {documentCount} Documents
                </span>
              </div>

              {/* Document Upload Form */}
              <div className="border rounded-lg p-6">
                <h4 className="font-medium mb-4">Upload New Document</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Type *
                    </label>
                    <select
                      value={documentUpload.type}
                      onChange={(e) => setDocumentUpload({ ...documentUpload, type: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={DOCUMENT_TYPES.PASSPORT}>Passport</option>
                      <option value={DOCUMENT_TYPES.DRIVERS_LICENSE}>Driver's License</option>
                      <option value={DOCUMENT_TYPES.NATIONAL_ID}>National ID</option>
                      <option value={DOCUMENT_TYPES.PROOF_OF_ADDRESS}>Proof of Address</option>
                      <option value={DOCUMENT_TYPES.BANK_STATEMENT}>Bank Statement</option>
                      <option value={DOCUMENT_TYPES.BUSINESS_REGISTRATION}>Business Registration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document File *
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setDocumentUpload({ ...documentUpload, file: e.target.files?.[0] || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issued Date *
                      </label>
                      <input
                        type="date"
                        value={documentUpload.issuedDate}
                        onChange={(e) => setDocumentUpload({ ...documentUpload, issuedDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={documentUpload.expiryDate}
                        onChange={(e) => setDocumentUpload({ ...documentUpload, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Issuing Authority *
                    </label>
                    <input
                      type="text"
                      value={documentUpload.issuingAuthority}
                      onChange={(e) => setDocumentUpload({ ...documentUpload, issuingAuthority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Department of Motor Vehicles, Passport Office"
                    />
                  </div>

                  <button
                    onClick={handleDocumentUpload}
                    disabled={isSubmitting || !documentUpload.file || !documentUpload.issuingAuthority || !documentUpload.issuedDate}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Uploading Document..." : "Upload Document"}
                  </button>
                </div>
              </div>

              {/* Document Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-4">📋 Document Requirements by KYC Level</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-blue-800">Basic KYC</h5>
                    <ul className="text-sm text-blue-700 ml-4 list-disc">
                      <li>Government-issued photo ID (Passport, Driver's License, or National ID)</li>
                      <li>Clear, high-resolution images</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-800">Enhanced KYC</h5>
                    <ul className="text-sm text-blue-700 ml-4 list-disc">
                      <li>All Basic KYC requirements</li>
                      <li>Proof of address (utility bill, bank statement, lease agreement)</li>
                      <li>Document must be dated within the last 3 months</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-800">Institutional KYC</h5>
                    <ul className="text-sm text-blue-700 ml-4 list-disc">
                      <li>All Enhanced KYC requirements</li>
                      <li>Business registration documents</li>
                      <li>Corporate bank statements</li>
                      <li>Authorized signatory documentation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Document Status */}
              {documentCount > 0 && (
                <div className="border rounded-lg p-6">
                  <h4 className="font-medium mb-4">Document Status</h4>
                  <div className="text-center py-8 text-gray-500">
                    <p>📄 {documentCount} documents submitted</p>
                    <p className="text-sm mt-2">Document details are stored securely and verified by our KYC providers</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Compliance Dashboard</h3>
                {kycProfile && (
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplianceStatusColor(kycProfile.complianceStatus)}`}>
                      {getComplianceStatusName(kycProfile.complianceStatus)}
                    </span>
                  </div>
                )}
              </div>

              {complianceData ? (
                <div className="space-y-6">
                  {/* Compliance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-lg border ${complianceData.sanctionsCheck
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Sanctions Screening</h4>
                        <span className="text-2xl">{complianceData.sanctionsCheck ? '❌' : '✅'}</span>
                      </div>
                      <p className={`text-sm ${complianceData.sanctionsCheck ? 'text-red-700' : 'text-green-700'}`}>
                        {complianceData.sanctionsCheck ? 'Failed - Review Required' : 'Passed - Clear'}
                      </p>
                    </div>

                    <div className={`p-6 rounded-lg border ${complianceData.pepCheck
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">PEP Check</h4>
                        <span className="text-2xl">{complianceData.pepCheck ? '⚠️' : '✅'}</span>
                      </div>
                      <p className={`text-sm ${complianceData.pepCheck ? 'text-yellow-700' : 'text-green-700'}`}>
                        {complianceData.pepCheck ? 'PEP Identified - Enhanced Monitoring' : 'Not a PEP'}
                      </p>
                    </div>

                    <div className={`p-6 rounded-lg border ${getRiskScoreColor(complianceData.amlRiskScore).includes('red')
                      ? 'bg-red-50 border-red-200'
                      : getRiskScoreColor(complianceData.amlRiskScore).includes('yellow')
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">AML Risk Score</h4>
                        <span className="text-2xl">
                          {complianceData.amlRiskScore <= 30 ? '🟢' : complianceData.amlRiskScore <= 70 ? '🟡' : '🔴'}
                        </span>
                      </div>
                      <p className={`text-sm ${getRiskScoreColor(complianceData.amlRiskScore)}`}>
                        {complianceData.amlRiskScore}/100 - {getRiskScoreLabel(complianceData.amlRiskScore)}
                      </p>
                    </div>
                  </div>

                  {/* Compliance Details */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-medium mb-4">Compliance Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Country</p>
                        <p className="font-medium">{getCountryName(complianceData.countryCode)} ({complianceData.countryCode})</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Compliance Check</p>
                        <p>{complianceData.lastComplianceCheck ? new Date(complianceData.lastComplianceCheck * 1000).toLocaleString() : 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Compliance Expiry</p>
                        <p className={new Date(complianceData.complianceExpiry * 1000) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {new Date(complianceData.complianceExpiry * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Risk Assessment</p>
                        <p className={getRiskScoreColor(complianceData.amlRiskScore)}>
                          {getRiskScoreLabel(complianceData.amlRiskScore)} Risk
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Limits */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-medium mb-4">Current Transaction Limits</h4>
                    <div className="space-y-4">
                      {kycProfile && [
                        {
                          level: 'Basic KYC',
                          dailyLimit: '$10,000',
                          monthlyLimit: '$100,000',
                          features: ['Basic trading', 'Standard withdrawals'],
                          available: kycProfile.kycLevel >= KYC_LEVELS.BASIC
                        },
                        {
                          level: 'Enhanced KYC',
                          dailyLimit: '$50,000',
                          monthlyLimit: '$500,000',
                          features: ['Advanced trading', 'Higher limits', 'Priority support'],
                          available: kycProfile.kycLevel >= KYC_LEVELS.ENHANCED
                        },
                        {
                          level: 'Institutional KYC',
                          dailyLimit: 'Unlimited',
                          monthlyLimit: 'Unlimited',
                          features: ['Institutional trading', 'API access', 'Custom solutions'],
                          available: kycProfile.kycLevel >= KYC_LEVELS.INSTITUTIONAL
                        }
                      ].map((limit, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${limit.available
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{limit.level}</h5>
                            <span className="text-xl">{limit.available ? '✅' : '🔒'}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Daily Limit</p>
                              <p className="font-medium">{limit.dailyLimit}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Monthly Limit</p>
                              <p className="font-medium">{limit.monthlyLimit}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-gray-600 text-sm">Features</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {limit.features.map((feature, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white border rounded text-xs">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compliance Actions */}
                  {(complianceData.sanctionsCheck || complianceData.pepCheck || complianceData.amlRiskScore > 70) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h4 className="font-medium text-yellow-900 mb-4">⚠️ Compliance Actions Required</h4>
                      <div className="space-y-2 text-sm text-yellow-800">
                        {complianceData.sanctionsCheck && (
                          <p>• Sanctions screening failed - Contact compliance team for review</p>
                        )}
                        {complianceData.pepCheck && (
                          <p>• PEP status identified - Enhanced monitoring and documentation required</p>
                        )}
                        {complianceData.amlRiskScore > 70 && (
                          <p>• High AML risk score - Additional verification may be required</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛡️</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Compliance Data</h4>
                  <p className="text-gray-600 mb-6">
                    Complete your KYC profile to view compliance information and transaction limits.
                  </p>
                  <button
                    onClick={() => setActiveTab('kyc')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Start KYC Process
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enhanced-kyc' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Enhanced KYC Verification</h3>
                <div className="flex items-center space-x-2">
                  {enhancedKycLoading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                  <span className="text-sm text-gray-500">
                    {getKYCCompletionStatus().completionPercentage.toFixed(0)}% Complete
                  </span>
                </div>
              </div>

              {enhancedKycError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">❌</span>
                      <p className="text-red-800">{enhancedKycError}</p>
                    </div>
                    <button
                      onClick={clearEnhancedKycError}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* KYC Progress Overview */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium mb-4">Verification Progress</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600">
                      {getKYCCompletionStatus().completedSteps} of {getKYCCompletionStatus().totalSteps} steps
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getKYCCompletionStatus().completionPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Next: {getNextRecommendedAction()}
                  </p>
                </div>
              </div>

              {/* Biometric Verification */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium mb-4">🔐 Biometric Verification</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: 'fingerprint' as const, label: 'Fingerprint', icon: '👆', supported: biometricCapabilities.fingerprint },
                    { type: 'face_recognition' as const, label: 'Face Recognition', icon: '👤', supported: biometricCapabilities.faceRecognition },
                    { type: 'voice_print' as const, label: 'Voice Print', icon: '🎤', supported: biometricCapabilities.voicePrint }
                  ].map(biometric => (
                    <div key={biometric.type} className={`p-4 border rounded-lg ${enhancedKycStatus.biometricVerification[biometric.type] ? 'bg-green-50 border-green-200' :
                        biometric.supported ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'
                      }`}>
                      <div className="text-center">
                        <div className="text-2xl mb-2">{biometric.icon}</div>
                        <p className="font-medium text-sm">{biometric.label}</p>
                        <p className="text-xs text-gray-600 mb-3">
                          {enhancedKycStatus.biometricVerification[biometric.type] ? 'Verified' :
                            biometric.supported ? 'Available' : 'Not Supported'}
                        </p>
                        {biometric.supported && !enhancedKycStatus.biometricVerification[biometric.type] && (
                          <button
                            onClick={async () => {
                              const phrase = biometric.type === 'voice_print' ? 'AptoFi voice verification' : undefined;
                              await captureBiometric(biometric.type, phrase);
                            }}
                            disabled={enhancedKycLoading}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Capture
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!biometricCapabilities.fingerprint && !biometricCapabilities.faceRecognition && !biometricCapabilities.voicePrint && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ No biometric capabilities detected. Please use a device with biometric support for enhanced security.
                    </p>
                  </div>
                )}
              </div>

              {/* Document Validation */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium mb-4">📄 Document Validation</h4>

                {enhancedKycStatus.documentValidation.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {enhancedKycStatus.documentValidation.map(doc => (
                      <div key={doc.documentId} className={`p-3 border rounded-lg ${doc.status === 'verified' ? 'bg-green-50 border-green-200' :
                          doc.status === 'rejected' ? 'bg-red-50 border-red-200' :
                            'bg-yellow-50 border-yellow-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {doc.documentType.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-600">
                              Score: {doc.validationScore}% | Status: {doc.status}
                            </p>
                          </div>
                          <div className="text-lg">
                            {doc.status === 'verified' ? '✅' :
                              doc.status === 'rejected' ? '❌' : '⏳'}
                          </div>
                        </div>
                        {doc.rejectionReasons && (
                          <div className="mt-2 text-xs text-red-600">
                            Issues: {doc.rejectionReasons.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Document
                    </label>
                    <div className="flex items-center space-x-4">
                      <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="passport">Passport</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="national_id">National ID</option>
                        <option value="utility_bill">Utility Bill</option>
                        <option value="bank_statement">Bank Statement</option>
                      </select>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await validateEnhancedDocument(file, 'passport');
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Screening Results */}
              {enhancedKycStatus.complianceScreening.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium mb-4">🔍 Compliance Screening</h4>
                  <div className="space-y-3">
                    {enhancedKycStatus.complianceScreening.map(screening => (
                      <div key={screening.screeningId} className={`p-3 border rounded-lg ${screening.status === 'clear' ? 'bg-green-50 border-green-200' :
                          screening.status === 'hit' ? 'bg-red-50 border-red-200' :
                            'bg-yellow-50 border-yellow-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {screening.screeningType.replace('_', ' ')} Screening
                            </p>
                            <p className="text-xs text-gray-600">
                              Status: {screening.status} | Risk: {screening.riskLevel}
                            </p>
                          </div>
                          <div className="text-lg">
                            {screening.status === 'clear' ? '✅' :
                              screening.status === 'hit' ? '❌' : '⏳'}
                          </div>
                        </div>
                        {screening.matches.length > 0 && (
                          <div className="mt-2 text-xs text-red-600">
                            {screening.matches.length} match(es) found - Manual review required
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Assessment */}
              {enhancedKycStatus.riskAssessment && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium mb-4">⚖️ Risk Assessment</h4>
                  <div className={`p-4 border rounded-lg ${enhancedKycStatus.riskAssessment.riskLevel === 'low' ? 'bg-green-50 border-green-200' :
                      enhancedKycStatus.riskAssessment.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        enhancedKycStatus.riskAssessment.riskLevel === 'high' ? 'bg-orange-50 border-orange-200' :
                          'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">Risk Level: {enhancedKycStatus.riskAssessment.riskLevel.toUpperCase()}</p>
                        <p className="text-sm text-gray-600">
                          Score: {enhancedKycStatus.riskAssessment.overallRiskScore}/100
                        </p>
                      </div>
                      <div className="text-2xl">
                        {enhancedKycStatus.riskAssessment.riskLevel === 'low' ? '🟢' :
                          enhancedKycStatus.riskAssessment.riskLevel === 'medium' ? '🟡' :
                            enhancedKycStatus.riskAssessment.riskLevel === 'high' ? '🟠' : '🔴'}
                      </div>
                    </div>

                    {enhancedKycStatus.riskAssessment.recommendedActions.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">Recommended Actions:</p>
                        <ul className="text-sm space-y-1">
                          {enhancedKycStatus.riskAssessment.recommendedActions.map((action, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span>•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={async () => {
                    await checkBiometricSupport();
                  }}
                  disabled={enhancedKycLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Check Biometric Support
                </button>

                {kycProfile && (
                  <button
                    onClick={async () => {
                      await performComplianceScreening({
                        fullName: kycForm.fullName || 'Test User',
                        dateOfBirth: kycForm.dateOfBirth,
                        nationality: kycForm.nationality,
                        address: kycForm.address
                      });
                    }}
                    disabled={enhancedKycLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Run Compliance Screening
                  </button>
                )}

                {enhancedKycStatus.documentValidation.length > 0 && (
                  <button
                    onClick={async () => {
                      await performRiskAssessment({
                        countryCode: kycForm.countryCode,
                        documents: enhancedKycStatus.documentValidation
                      });
                    }}
                    disabled={enhancedKycLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    Perform Risk Assessment
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Security & Fraud Protection</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${securityStatus.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                      securityStatus.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        securityStatus.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                    }`}>
                    {securityStatus.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              {/* Security Status Overview */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium mb-4">🛡️ Security Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl mb-2 ${securityStatus.deviceTrusted ? 'text-green-600' : 'text-red-600'}`}>
                      {securityStatus.deviceTrusted ? '✅' : '❌'}
                    </div>
                    <p className="font-medium text-sm">Device Trust</p>
                    <p className="text-xs text-gray-600">
                      {securityStatus.deviceTrusted ? 'Trusted' : 'Unverified'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl mb-2 ${securityStatus.behaviorNormal ? 'text-green-600' : 'text-orange-600'}`}>
                      {securityStatus.behaviorNormal ? '👤' : '⚠️'}
                    </div>
                    <p className="font-medium text-sm">Behavior</p>
                    <p className="text-xs text-gray-600">
                      {securityStatus.behaviorNormal ? 'Normal' : 'Anomalous'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl mb-2 ${hasActiveAlerts ? 'text-red-600' : 'text-green-600'}`}>
                      {hasActiveAlerts ? '🚨' : '✅'}
                    </div>
                    <p className="font-medium text-sm">Alerts</p>
                    <p className="text-xs text-gray-600">
                      {securityStatus.activeAlerts.length} Active
                    </p>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-2">🕒</div>
                    <p className="font-medium text-sm">Last Check</p>
                    <p className="text-xs text-gray-600">
                      {securityStatus.lastSecurityCheck ?
                        new Date(securityStatus.lastSecurityCheck).toLocaleTimeString() :
                        'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Security Alerts */}
              {hasActiveAlerts && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h4 className="font-medium text-red-900 mb-4">🚨 Active Security Alerts</h4>
                  <div className="space-y-3">
                    {securityStatus.activeAlerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="bg-white border border-red-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm text-red-800">{alert.title}</p>
                            <p className="text-xs text-red-600">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${alert.severity === 'critical' ? 'bg-red-600 text-white' :
                              alert.severity === 'high' ? 'bg-orange-600 text-white' :
                                'bg-yellow-600 text-white'
                            }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {securityStatus.activeAlerts.length > 3 && (
                      <p className="text-sm text-red-600">
                        And {securityStatus.activeAlerts.length - 3} more alerts...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Device Information */}
              {securityStatus.deviceFingerprint && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium mb-4">📱 Device Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Device ID</p>
                      <p className="text-gray-600 font-mono text-xs break-all">
                        {securityStatus.deviceFingerprint.id}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Platform</p>
                      <p className="text-gray-600">{securityStatus.deviceFingerprint.platform}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Screen Resolution</p>
                      <p className="text-gray-600">
                        {securityStatus.deviceFingerprint.screen.width} × {securityStatus.deviceFingerprint.screen.height}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Timezone</p>
                      <p className="text-gray-600">{securityStatus.deviceFingerprint.timezone}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Language</p>
                      <p className="text-gray-600">{securityStatus.deviceFingerprint.language}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Registered</p>
                      <p className="text-gray-600">
                        {new Date(securityStatus.deviceFingerprint.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium mb-4">🔧 Security Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={async () => {
                      const result = await performSecurityCheck('profile_access', 0);
                      if (result) {
                        alert(`Security check completed. Risk level: ${result.riskAssessment.level}`);
                      }
                    }}
                    className="p-4 text-left border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-600 text-xl">🔍</span>
                      <div>
                        <p className="font-medium text-blue-800">Run Security Check</p>
                        <p className="text-sm text-blue-600">Analyze current security status</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      // This would open a more detailed security dashboard
                      alert('Opening detailed security dashboard...');
                    }}
                    className="p-4 text-left border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600 text-xl">📊</span>
                      <div>
                        <p className="font-medium text-green-800">Security Dashboard</p>
                        <p className="text-sm text-green-600">View detailed security metrics</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      alert('Enhanced security features enabled');
                    }}
                    className="p-4 text-left border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-purple-600 text-xl">🛡️</span>
                      <div>
                        <p className="font-medium text-purple-800">Enhanced Security</p>
                        <p className="text-sm text-purple-600">Enable additional protection</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      alert('Emergency security protocols activated');
                    }}
                    className="p-4 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-red-600 text-xl">🚨</span>
                      <div>
                        <p className="font-medium text-red-800">Emergency Actions</p>
                        <p className="text-sm text-red-600">Freeze account or reset security</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Recommendations */}
              {securityRequiresAttention && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h4 className="font-medium text-yellow-900 mb-4">⚠️ Security Recommendations</h4>
                  <div className="space-y-2 text-sm text-yellow-800">
                    <p>• Your account has been flagged for security review</p>
                    <p>• Consider enabling enhanced security features</p>
                    <p>• Review recent account activity for any suspicious behavior</p>
                    <p>• Contact support if you notice any unauthorized activity</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}