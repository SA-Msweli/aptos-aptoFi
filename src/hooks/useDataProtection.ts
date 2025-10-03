"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  dataProtectionService,
  type DataSubject,
  type ConsentRecord,
  type ConsentPurpose,
  type LawfulBasis,
  type PrivacySettings,
  type DataRequest,
  type DataRequestType,
  type DataBreachIncident,
  type BreachType,
  type BreachSeverity,
  type DataCategoryType
} from "@/lib/dataProtection";

export interface DataProtectionState {
  dataSubject: DataSubject | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export function useDataProtection() {
  const { connected, account } = useWallet();
  const [state, setState] = useState<DataProtectionState>({
    dataSubject: null,
    loading: false,
    error: null,
    initialized: false
  });

  // Initialize data subject when wallet connects
  useEffect(() => {
    if (connected && account?.address && !state.initialized) {
      initializeDataSubject();
    } else if (!connected) {
      setState(prev => ({
        ...prev,
        dataSubject: null,
        initialized: false,
        error: null
      }));
    }
  }, [connected, account, state.initialized]);

  const initializeDataSubject = useCallback(async () => {
    if (!account?.address) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let dataSubject = await dataProtectionService.getDataSubject(account.address.toString());

      if (!dataSubject) {
        dataSubject = await dataProtectionService.createDataSubject(account.address.toString());
      }

      setState(prev => ({
        ...prev,
        dataSubject,
        loading: false,
        initialized: true
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize data protection';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  }, [account]);

  // Consent Management
  const grantConsent = useCallback(async (
    purpose: ConsentPurpose,
    lawfulBasis: LawfulBasis = 'consent',
    version: string = '1.0',
    expiresAt?: number
  ): Promise<ConsentRecord | null> => {
    if (!account?.address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const consent = await dataProtectionService.grantConsent(
        account.address.toString(),
        purpose,
        lawfulBasis,
        version,
        expiresAt
      );

      // Refresh data subject
      const updatedDataSubject = await dataProtectionService.getDataSubject(account.address.toString());
      setState(prev => ({
        ...prev,
        dataSubject: updatedDataSubject,
        loading: false
      }));

      return consent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to grant consent';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, [account]);

  const revokeConsent = useCallback(async (purpose: ConsentPurpose): Promise<boolean> => {
    if (!account?.address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const success = await dataProtectionService.revokeConsent(
        account.address.toString(),
        purpose
      );

      if (success) {
        // Refresh data subject
        const updatedDataSubject = await dataProtectionService.getDataSubject(account.address.toString());
        setState(prev => ({
          ...prev,
          dataSubject: updatedDataSubject,
          loading: false
        }));
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke consent';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return false;
    }
  }, [account]);

  const checkConsent = useCallback(async (purpose: ConsentPurpose): Promise<boolean> => {
    if (!account?.address) return false;

    try {
      return await dataProtectionService.checkConsent(account.address.toString(), purpose);
    } catch (error) {
      console.error('Failed to check consent:', error);
      return false;
    }
  }, [account]);

  // Privacy Settings Management
  const updatePrivacySettings = useCallback(async (
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings | null> => {
    if (!account?.address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const updatedSettings = await dataProtectionService.updatePrivacySettings(
        account.address.toString(),
        settings
      );

      if (updatedSettings) {
        // Refresh data subject
        const updatedDataSubject = await dataProtectionService.getDataSubject(account.address.toString());
        setState(prev => ({
          ...prev,
          dataSubject: updatedDataSubject,
          loading: false
        }));
      }

      return updatedSettings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update privacy settings';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, [account]);

  // Data Subject Rights Requests
  const submitDataRequest = useCallback(async (
    type: DataRequestType,
    description: string
  ): Promise<DataRequest | null> => {
    if (!account?.address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request = await dataProtectionService.submitDataRequest(
        account.address.toString(),
        type,
        description
      );

      // Refresh data subject
      const updatedDataSubject = await dataProtectionService.getDataSubject(account.address.toString());
      setState(prev => ({
        ...prev,
        dataSubject: updatedDataSubject,
        loading: false
      }));

      return request;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit data request';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, [account]);

  // Convenience methods for common data requests
  const requestDataAccess = useCallback(async (): Promise<DataRequest | null> => {
    return submitDataRequest('access', 'Request access to all personal data');
  }, [submitDataRequest]);

  const requestDataDeletion = useCallback(async (): Promise<DataRequest | null> => {
    return submitDataRequest('erasure', 'Request deletion of all personal data');
  }, [submitDataRequest]);

  const requestDataPortability = useCallback(async (): Promise<DataRequest | null> => {
    return submitDataRequest('portability', 'Request data in portable format');
  }, [submitDataRequest]);

  const requestDataRectification = useCallback(async (details: string): Promise<DataRequest | null> => {
    return submitDataRequest('rectification', `Request data correction: ${details}`);
  }, [submitDataRequest]);

  // Data anonymization and pseudonymization
  const anonymizeData = useCallback(async (data: any, fields: string[]): Promise<any> => {
    try {
      return await dataProtectionService.anonymizeData(data, fields);
    } catch (error) {
      console.error('Failed to anonymize data:', error);
      return data;
    }
  }, []);

  const pseudonymizeData = useCallback(async (data: any, fields: string[], key: string): Promise<any> => {
    try {
      return await dataProtectionService.pseudonymizeData(data, fields, key);
    } catch (error) {
      console.error('Failed to pseudonymize data:', error);
      return data;
    }
  }, []);

  // Data breach reporting
  const reportDataBreach = useCallback(async (
    type: BreachType,
    severity: BreachSeverity,
    affectedDataTypes: DataCategoryType[],
    affectedUsers: number,
    description: string,
    cause: string
  ): Promise<DataBreachIncident | null> => {
    try {
      const incident = await dataProtectionService.reportDataBreach(
        type,
        severity,
        affectedDataTypes,
        affectedUsers,
        description,
        cause
      );
      return incident;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to report data breach';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // GDPR compliance reporting
  const generateGDPRReport = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      return await dataProtectionService.generateGDPRReport(
        startDate.getTime(),
        endDate.getTime()
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate GDPR report';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get consent status for all purposes
  const getConsentStatus = useCallback(() => {
    if (!state.dataSubject) return {};

    const consentStatus: Record<ConsentPurpose, boolean> = {} as any;

    const purposes: ConsentPurpose[] = [
      'transaction_processing',
      'kyc_verification',
      'fraud_prevention',
      'marketing',
      'analytics',
      'customer_support',
      'legal_compliance',
      'service_improvement',
      'security_monitoring'
    ];

    purposes.forEach(purpose => {
      const consent = state.dataSubject!.consentRecords.find(c => c.purpose === purpose);
      consentStatus[purpose] = consent?.granted || false;
    });

    return consentStatus;
  }, [state.dataSubject]);

  // Get pending data requests
  const getPendingRequests = useCallback(() => {
    if (!state.dataSubject) return [];
    return state.dataSubject.dataRequests.filter(r =>
      r.status === 'pending' || r.status === 'under_review' || r.status === 'verification_required'
    );
  }, [state.dataSubject]);

  // Get completed data requests
  const getCompletedRequests = useCallback(() => {
    if (!state.dataSubject) return [];
    return state.dataSubject.dataRequests.filter(r => r.status === 'completed');
  }, [state.dataSubject]);

  // Check if user has granted essential consents
  const hasEssentialConsents = useCallback(() => {
    const consentStatus = getConsentStatus();
    return consentStatus.transaction_processing && consentStatus.legal_compliance;
  }, [getConsentStatus]);

  // Get privacy compliance score
  const getPrivacyComplianceScore = useCallback(() => {
    if (!state.dataSubject) return 0;

    let score = 100;
    const consentStatus = getConsentStatus();
    const pendingRequests = getPendingRequests();

    // Deduct points for missing essential consents
    if (!consentStatus.transaction_processing) score -= 20;
    if (!consentStatus.legal_compliance) score -= 20;

    // Deduct points for overdue requests
    const overdueRequests = pendingRequests.filter(r =>
      Date.now() - r.requestedAt > (30 * 24 * 60 * 60 * 1000) // 30 days
    );
    score -= overdueRequests.length * 10;

    // Add points for good privacy practices
    if (state.dataSubject.privacySettings.dataMinimization) score += 5;
    if (state.dataSubject.privacySettings.encryption) score += 5;
    if (!state.dataSubject.privacySettings.shareWithPartners) score += 5;

    return Math.max(0, Math.min(100, score));
  }, [state.dataSubject, getConsentStatus, getPendingRequests]);

  return {
    // State
    ...state,

    // Actions
    initializeDataSubject,
    grantConsent,
    revokeConsent,
    checkConsent,
    updatePrivacySettings,
    submitDataRequest,
    requestDataAccess,
    requestDataDeletion,
    requestDataPortability,
    requestDataRectification,
    anonymizeData,
    pseudonymizeData,
    reportDataBreach,
    generateGDPRReport,
    clearError,

    // Computed values
    isConnected: connected && !!account,
    hasDataSubject: !!state.dataSubject,
    consentStatus: getConsentStatus(),
    pendingRequests: getPendingRequests(),
    completedRequests: getCompletedRequests(),
    hasEssentialConsents: hasEssentialConsents(),
    privacyComplianceScore: getPrivacyComplianceScore(),

    // Privacy settings shortcuts
    privacySettings: state.dataSubject?.privacySettings,
    cookiePreferences: state.dataSubject?.privacySettings.cookiePreferences,
    communicationPreferences: state.dataSubject?.privacySettings.communicationPreferences,

    // Data categories and retention info
    dataCategories: state.dataSubject?.dataCategories || [],
    totalDataRequests: state.dataSubject?.dataRequests.length || 0,
    totalConsents: state.dataSubject?.consentRecords.length || 0
  };
}