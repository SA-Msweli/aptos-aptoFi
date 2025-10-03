"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  auditTrailService,
  type AuditEvent,
  type AuditQuery,
  type AuditReport,
  type ComplianceMonitor,
  type AuditEventType,
  type AuditCategory,
  type AuditSeverity
} from "@/lib/auditTrail";

export interface AuditTrailState {
  events: AuditEvent[];
  totalEvents: number;
  loading: boolean;
  error: string | null;
  lastQuery: AuditQuery | null;
}

export function useAuditTrail() {
  const { connected, account } = useWallet();
  const [auditState, setAuditState] = useState<AuditTrailState>({
    events: [],
    totalEvents: 0,
    loading: false,
    error: null,
    lastQuery: null
  });

  // Log an audit event
  const logEvent = useCallback(async (
    eventType: AuditEventType,
    category: AuditCategory,
    severity: AuditSeverity,
    description: string,
    details: Record<string, any> = {},
    complianceFlags: any[] = [],
    regulatoryRelevance: any[] = []
  ): Promise<AuditEvent | null> => {
    if (!account?.address) {
      setAuditState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    try {
      const event = await auditTrailService.logEvent({
        userAddress: account.address.toString(),
        eventType,
        category,
        severity,
        description,
        details,
        metadata: {
          userAgent: navigator.userAgent,
          deviceId: await generateDeviceId(),
          sessionId: getSessionId(),
          ipAddress: await getClientIP()
        },
        complianceFlags,
        regulatoryRelevance,
        dataRetentionPolicy: {
          retentionPeriod: getRetentionPeriod(category),
          autoDelete: true,
          archiveAfter: getArchivePeriod(category),
          encryptionRequired: isEncryptionRequired(category),
          accessRestrictions: getAccessRestrictions(category)
        },
        encrypted: false
      });

      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log audit event';
      setAuditState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [account]);

  // Query audit events
  const queryEvents = useCallback(async (query: AuditQuery): Promise<AuditEvent[]> => {
    setAuditState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const events = await auditTrailService.queryEvents(query);

      setAuditState(prev => ({
        ...prev,
        events,
        totalEvents: events.length,
        lastQuery: query,
        loading: false
      }));

      return events;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to query audit events';
      setAuditState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return [];
    }
  }, []);

  // Get user's audit events
  const getUserEvents = useCallback(async (
    limit: number = 50,
    eventTypes?: AuditEventType[],
    dateRange?: { start: number; end: number }
  ): Promise<AuditEvent[]> => {
    if (!account?.address) return [];

    const query: AuditQuery = {
      userAddress: account.address.toString(),
      limit,
      eventTypes,
      dateRange,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    return queryEvents(query);
  }, [account, queryEvents]);

  // Generate audit report
  const generateReport = useCallback(async (
    reportType: AuditReport['reportType'],
    title: string,
    description: string,
    filters: AuditQuery
  ): Promise<AuditReport | null> => {
    if (!account?.address) {
      setAuditState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setAuditState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await auditTrailService.generateReport(
        reportType,
        title,
        description,
        filters,
        account.address.toString()
      );

      setAuditState(prev => ({ ...prev, loading: false }));
      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setAuditState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return null;
    }
  }, [account]);

  // Export report
  const exportReport = useCallback(async (
    report: AuditReport,
    format: 'json' | 'csv' | 'pdf' | 'xml'
  ): Promise<string | null> => {
    try {
      const exportedData = await auditTrailService.exportReport(report, format);
      return exportedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export report';
      setAuditState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Verify event integrity
  const verifyEventIntegrity = useCallback(async (eventId: string): Promise<{
    valid: boolean;
    details: string;
  } | null> => {
    try {
      const result = await auditTrailService.verifyEventIntegrity(eventId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify event integrity';
      setAuditState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Get compliance monitors
  const getComplianceMonitors = useCallback((): ComplianceMonitor[] => {
    return auditTrailService.getComplianceMonitors();
  }, []);

  // Create compliance monitor
  const createComplianceMonitor = useCallback(async (
    monitor: Omit<ComplianceMonitor, 'monitorId'>
  ): Promise<ComplianceMonitor | null> => {
    try {
      const newMonitor = await auditTrailService.createComplianceMonitor(monitor);
      return newMonitor;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create compliance monitor';
      setAuditState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Process data retention
  const processDataRetention = useCallback(async (): Promise<{
    eventsArchived: number;
    eventsDeleted: number;
  } | null> => {
    try {
      const result = await auditTrailService.processDataRetention();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process data retention';
      setAuditState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Convenience methods for common audit events
  const logUserLogin = useCallback(async (loginMethod: string, success: boolean) => {
    return logEvent(
      'user_login',
      'authentication',
      success ? 'low' : 'medium',
      `User ${success ? 'successfully logged in' : 'failed to log in'} using ${loginMethod}`,
      { loginMethod, success, timestamp: Date.now() }
    );
  }, [logEvent]);

  const logTransaction = useCallback(async (
    transactionType: string,
    amount: number,
    recipient?: string,
    success: boolean = true
  ) => {
    return logEvent(
      success ? 'transaction_completed' : 'transaction_failed',
      'transaction',
      amount > 10000 ? 'high' : 'low',
      `${transactionType} transaction ${success ? 'completed' : 'failed'}`,
      {
        transactionType,
        amount,
        recipient,
        success,
        timestamp: Date.now()
      },
      amount > 10000 ? [{
        type: 'aml' as const,
        triggered: true,
        details: 'Large transaction detected',
        requiresReview: true
      }] : []
    );
  }, [logEvent]);

  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: AuditSeverity,
    details: Record<string, any>
  ) => {
    return logEvent(
      'security_alert',
      'security',
      severity,
      `Security event: ${eventType}`,
      { eventType, ...details, timestamp: Date.now() }
    );
  }, [logEvent]);

  const logComplianceEvent = useCallback(async (
    complianceType: string,
    status: 'passed' | 'failed' | 'review_required',
    details: Record<string, any>
  ) => {
    return logEvent(
      'compliance_screening',
      'compliance',
      status === 'failed' ? 'high' : status === 'review_required' ? 'medium' : 'low',
      `Compliance screening: ${complianceType} - ${status}`,
      { complianceType, status, ...details, timestamp: Date.now() },
      status !== 'passed' ? [{
        type: 'aml' as const,
        triggered: true,
        details: `Compliance ${complianceType} ${status}`,
        requiresReview: status === 'review_required'
      }] : []
    );
  }, [logEvent]);

  const logKYCEvent = useCallback(async (
    kycAction: string,
    level: string,
    success: boolean,
    details: Record<string, any> = {}
  ) => {
    return logEvent(
      success ? 'kyc_verification' : 'kyc_rejection',
      'compliance',
      success ? 'low' : 'medium',
      `KYC ${kycAction} for level ${level} ${success ? 'successful' : 'failed'}`,
      { kycAction, level, success, ...details, timestamp: Date.now() }
    );
  }, [logEvent]);

  // Clear error
  const clearError = useCallback(() => {
    setAuditState(prev => ({ ...prev, error: null }));
  }, []);

  // Load initial user events on connection
  useEffect(() => {
    if (connected && account?.address) {
      getUserEvents(20);
    }
  }, [connected, account, getUserEvents]);

  return {
    // State
    ...auditState,

    // Actions
    logEvent,
    queryEvents,
    getUserEvents,
    generateReport,
    exportReport,
    verifyEventIntegrity,
    getComplianceMonitors,
    createComplianceMonitor,
    processDataRetention,
    clearError,

    // Convenience methods
    logUserLogin,
    logTransaction,
    logSecurityEvent,
    logComplianceEvent,
    logKYCEvent,

    // Computed values
    isConnected: connected && !!account,
    hasEvents: auditState.events.length > 0,
    hasErrors: !!auditState.error,
    recentEvents: auditState.events.slice(0, 10),
    criticalEvents: auditState.events.filter(e => e.severity === 'critical'),
    complianceEvents: auditState.events.filter(e => e.complianceFlags.length > 0)
  };
}

// Helper functions
async function generateDeviceId(): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }

  const deviceInfo = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.language,
    canvas.toDataURL()
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(deviceInfo);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('aptofi_session_id');
  if (!sessionId) {
    sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    sessionStorage.setItem('aptofi_session_id', sessionId);
  }
  return sessionId;
}

async function getClientIP(): Promise<string> {
  try {
    // In production, use a proper IP detection service
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getRetentionPeriod(category: AuditCategory): number {
  // Return retention period in milliseconds
  const periods = {
    authentication: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    transaction: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    compliance: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    security: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
    regulatory: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    data_privacy: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
    user_management: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
    system: 1 * 365 * 24 * 60 * 60 * 1000 // 1 year
  };
  return periods[category] || periods.system;
}

function getArchivePeriod(category: AuditCategory): number {
  // Return archive period in milliseconds (typically 1 year for most categories)
  return 365 * 24 * 60 * 60 * 1000;
}

function isEncryptionRequired(category: AuditCategory): boolean {
  const encryptionRequired = ['compliance', 'data_privacy', 'user_management'];
  return encryptionRequired.includes(category);
}

function getAccessRestrictions(category: AuditCategory): string[] {
  const restrictions = {
    authentication: ['admin', 'security_officer'],
    transaction: ['admin', 'compliance_officer', 'auditor'],
    compliance: ['admin', 'compliance_officer', 'legal'],
    security: ['admin', 'security_officer', 'incident_response'],
    regulatory: ['admin', 'compliance_officer', 'legal', 'auditor'],
    data_privacy: ['admin', 'privacy_officer', 'legal'],
    user_management: ['admin', 'user_manager'],
    system: ['admin', 'system_administrator']
  };
  return restrictions[category] || ['admin'];
}