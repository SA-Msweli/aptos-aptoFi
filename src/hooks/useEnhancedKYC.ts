"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  enhancedKYCService,
  type BiometricData,
  type DocumentValidation,
  type ComplianceScreening,
  type KYCRiskAssessment,
  type RegulatoryReport
} from "@/lib/kycEnhanced";

export interface EnhancedKYCStatus {
  biometricVerification: {
    fingerprint?: BiometricData;
    faceRecognition?: BiometricData;
    voicePrint?: BiometricData;
  };
  documentValidation: DocumentValidation[];
  complianceScreening: ComplianceScreening[];
  riskAssessment?: KYCRiskAssessment;
  regulatoryReports: RegulatoryReport[];
  overallStatus: 'not_started' | 'in_progress' | 'completed' | 'requires_review' | 'rejected';
  lastUpdated: number;
}

export interface BiometricCapabilities {
  fingerprint: boolean;
  faceRecognition: boolean;
  voicePrint: boolean;
}

export function useEnhancedKYC() {
  const { connected, account } = useWallet();
  const [kycStatus, setKycStatus] = useState<EnhancedKYCStatus>({
    biometricVerification: {},
    documentValidation: [],
    complianceScreening: [],
    regulatoryReports: [],
    overallStatus: 'not_started',
    lastUpdated: 0
  });
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities>({
    fingerprint: false,
    faceRecognition: false,
    voicePrint: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check biometric capabilities
  const checkBiometricSupport = useCallback(async () => {
    try {
      const capabilities = await enhancedKYCService.checkBiometricSupport();
      setBiometricCapabilities(capabilities);
      return capabilities;
    } catch (err) {
      console.error('Failed to check biometric support:', err);
      return { fingerprint: false, faceRecognition: false, voicePrint: false };
    }
  }, []);

  // Capture biometric data
  const captureBiometric = useCallback(async (
    type: BiometricData['type'],
    phrase?: string
  ): Promise<BiometricData | null> => {
    if (!account?.address) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const biometricData = await enhancedKYCService.captureBiometric(
        type,
        account.address.toString(),
        phrase
      );

      // Update KYC status
      setKycStatus(prev => ({
        ...prev,
        biometricVerification: {
          ...prev.biometricVerification,
          [type]: biometricData
        },
        lastUpdated: Date.now()
      }));

      return biometricData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Biometric capture failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Verify biometric data
  const verifyBiometric = useCallback(async (
    type: BiometricData['type'],
    phrase?: string
  ): Promise<{ match: boolean; confidence: number; details: string } | null> => {
    if (!account?.address) {
      setError('Wallet not connected');
      return null;
    }

    const storedBiometric = kycStatus.biometricVerification[type];
    if (!storedBiometric) {
      setError('No stored biometric data found');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const capturedBiometric = await enhancedKYCService.captureBiometric(
        type,
        account.address.toString(),
        phrase
      );

      const verificationResult = await enhancedKYCService.verifyBiometric(
        storedBiometric,
        capturedBiometric
      );

      return verificationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Biometric verification failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [account, kycStatus.biometricVerification]);

  // Validate document
  const validateDocument = useCallback(async (
    file: File,
    documentType: DocumentValidation['documentType']
  ): Promise<DocumentValidation | null> => {
    setLoading(true);
    setError(null);

    try {
      const validation = await enhancedKYCService.validateDocument(file, documentType);

      // Update KYC status
      setKycStatus(prev => ({
        ...prev,
        documentValidation: [...prev.documentValidation, validation],
        lastUpdated: Date.now()
      }));

      return validation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document validation failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Perform face match between document and selfie
  const performFaceMatch = useCallback(async (
    documentImage: string,
    selfieImage: string
  ): Promise<{ match: boolean; confidence: number; details: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await enhancedKYCService.performFaceMatch(documentImage, selfieImage);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Face matching failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Perform compliance screening
  const performComplianceScreening = useCallback(async (personalData: {
    fullName: string;
    dateOfBirth?: string;
    nationality?: string;
    address?: string;
  }): Promise<ComplianceScreening[] | null> => {
    if (!account?.address) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const screenings = await enhancedKYCService.performComplianceScreening(
        account.address.toString(),
        personalData
      );

      // Update KYC status
      setKycStatus(prev => ({
        ...prev,
        complianceScreening: screenings,
        lastUpdated: Date.now()
      }));

      return screenings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compliance screening failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Perform risk assessment
  const performRiskAssessment = useCallback(async (userData: any): Promise<KYCRiskAssessment | null> => {
    if (!account?.address) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const assessment = await enhancedKYCService.performRiskAssessment(
        account.address.toString(),
        userData
      );

      // Update KYC status
      setKycStatus(prev => ({
        ...prev,
        riskAssessment: assessment,
        overallStatus: assessment.requiresReview ? 'requires_review' : 'completed',
        lastUpdated: Date.now()
      }));

      return assessment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Risk assessment failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Generate regulatory report
  const generateRegulatoryReport = useCallback(async (
    type: RegulatoryReport['reportType'],
    details: RegulatoryReport['details']
  ): Promise<RegulatoryReport | null> => {
    if (!account?.address) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const report = await enhancedKYCService.generateRegulatoryReport(
        type,
        account.address.toString(),
        details
      );

      // Update KYC status
      setKycStatus(prev => ({
        ...prev,
        regulatoryReports: [...prev.regulatoryReports, report],
        lastUpdated: Date.now()
      }));

      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report generation failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Get overall KYC completion status
  const getKYCCompletionStatus = useCallback(() => {
    const hasBiometrics = Object.keys(kycStatus.biometricVerification).length > 0;
    const hasValidDocuments = kycStatus.documentValidation.some(doc => doc.status === 'verified');
    const hasComplianceScreening = kycStatus.complianceScreening.length > 0;
    const hasRiskAssessment = !!kycStatus.riskAssessment;

    const completedSteps = [
      hasBiometrics,
      hasValidDocuments,
      hasComplianceScreening,
      hasRiskAssessment
    ].filter(Boolean).length;

    const totalSteps = 4;
    const completionPercentage = (completedSteps / totalSteps) * 100;

    // Check for any critical issues
    const hasRejectedDocuments = kycStatus.documentValidation.some(doc => doc.status === 'rejected');
    const hasComplianceHits = kycStatus.complianceScreening.some(screening => screening.status === 'hit');
    const hasHighRisk = kycStatus.riskAssessment?.riskLevel === 'high' || kycStatus.riskAssessment?.riskLevel === 'critical';

    let overallStatus: EnhancedKYCStatus['overallStatus'] = 'not_started';

    if (completedSteps === 0) {
      overallStatus = 'not_started';
    } else if (hasRejectedDocuments || hasComplianceHits || hasHighRisk) {
      overallStatus = 'requires_review';
    } else if (completedSteps === totalSteps) {
      overallStatus = 'completed';
    } else {
      overallStatus = 'in_progress';
    }

    return {
      completionPercentage,
      completedSteps,
      totalSteps,
      overallStatus,
      issues: {
        hasRejectedDocuments,
        hasComplianceHits,
        hasHighRisk
      }
    };
  }, [kycStatus]);

  // Get next recommended action
  const getNextRecommendedAction = useCallback(() => {
    const status = getKYCCompletionStatus();

    if (status.overallStatus === 'completed') {
      return 'KYC process completed successfully';
    }

    if (status.overallStatus === 'requires_review') {
      return 'Manual review required - contact support';
    }

    // Determine next step
    const hasBiometrics = Object.keys(kycStatus.biometricVerification).length > 0;
    const hasValidDocuments = kycStatus.documentValidation.some(doc => doc.status === 'verified');
    const hasComplianceScreening = kycStatus.complianceScreening.length > 0;
    const hasRiskAssessment = !!kycStatus.riskAssessment;

    if (!hasBiometrics) {
      return 'Complete biometric verification';
    }
    if (!hasValidDocuments) {
      return 'Upload and validate identity documents';
    }
    if (!hasComplianceScreening) {
      return 'Complete compliance screening';
    }
    if (!hasRiskAssessment) {
      return 'Complete risk assessment';
    }

    return 'Continue KYC process';
  }, [kycStatus, getKYCCompletionStatus]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset KYC status
  const resetKYCStatus = useCallback(() => {
    setKycStatus({
      biometricVerification: {},
      documentValidation: [],
      complianceScreening: [],
      regulatoryReports: [],
      overallStatus: 'not_started',
      lastUpdated: 0
    });
    setError(null);
  }, []);

  return {
    // State
    kycStatus,
    biometricCapabilities,
    loading,
    error,

    // Actions
    checkBiometricSupport,
    captureBiometric,
    verifyBiometric,
    validateDocument,
    performFaceMatch,
    performComplianceScreening,
    performRiskAssessment,
    generateRegulatoryReport,
    clearError,
    resetKYCStatus,

    // Computed values
    getKYCCompletionStatus,
    getNextRecommendedAction,

    // Convenience flags
    isConnected: connected && !!account,
    hasAnyBiometrics: Object.keys(kycStatus.biometricVerification).length > 0,
    hasValidDocuments: kycStatus.documentValidation.some(doc => doc.status === 'verified'),
    hasComplianceIssues: kycStatus.complianceScreening.some(screening => screening.status === 'hit'),
    requiresManualReview: kycStatus.riskAssessment?.requiresReview || false
  };
}