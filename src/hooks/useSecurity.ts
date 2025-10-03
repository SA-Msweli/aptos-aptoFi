"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  securityService,
  type FraudRisk,
  type SecurityEvent,
  type SecurityAlert,
  type DeviceFingerprint
} from "@/lib/security";

export interface SecurityStatus {
  deviceTrusted: boolean;
  behaviorNormal: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastSecurityCheck: number;
  activeAlerts: SecurityAlert[];
  deviceFingerprint: DeviceFingerprint | null;
}

export interface SecurityCheckResult {
  approved: boolean;
  riskAssessment: FraudRisk;
  requiredActions: string[];
  canProceed: boolean;
}

export function useSecurity() {
  const { connected, account } = useWallet();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    deviceTrusted: false,
    behaviorNormal: true,
    riskLevel: 'low',
    lastSecurityCheck: 0,
    activeAlerts: [],
    deviceFingerprint: null
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize security tracking when wallet connects
  useEffect(() => {
    if (connected && account?.address && !initialized) {
      initializeSecurity();
      setInitialized(true);
    } else if (!connected) {
      setInitialized(false);
      setSecurityStatus({
        deviceTrusted: false,
        behaviorNormal: true,
        riskLevel: 'low',
        lastSecurityCheck: 0,
        activeAlerts: [],
        deviceFingerprint: null
      });
    }
  }, [connected, account, initialized]);

  // Periodic security status updates
  useEffect(() => {
    if (!connected || !account?.address) return;

    const interval = setInterval(() => {
      updateSecurityStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [connected, account]);

  const initializeSecurity = useCallback(async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      // Generate device fingerprint
      const deviceFingerprint = await securityService.deviceService.generateFingerprint();

      // Get existing security alerts
      const alerts = securityService.getSecurityAlerts(account.address.toString());

      // Check device trust status
      const storedFingerprint = securityService.deviceService.getStoredFingerprint();
      const deviceTrusted = storedFingerprint ?
        securityService.deviceService.compareFingerprints(deviceFingerprint, storedFingerprint) > 70 :
        false;

      // Log security event
      securityService.logSecurityEvent({
        type: 'login',
        severity: deviceTrusted ? 'low' : 'medium',
        userAddress: account.address.toString(),
        deviceFingerprint: deviceFingerprint.id,
        details: {
          deviceTrusted,
          loginTime: Date.now(),
          userAgent: navigator.userAgent
        },
        riskScore: deviceTrusted ? 10 : 30,
        resolved: true,
        actions: []
      });

      setSecurityStatus({
        deviceTrusted,
        behaviorNormal: true,
        riskLevel: alerts.some(a => a.severity === 'critical') ? 'critical' :
          alerts.some(a => a.severity === 'high') ? 'high' : 'low',
        lastSecurityCheck: Date.now(),
        activeAlerts: alerts,
        deviceFingerprint
      });

    } catch (error) {
      console.error('Failed to initialize security:', error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const updateSecurityStatus = useCallback(async () => {
    if (!account?.address) return;

    try {
      const alerts = securityService.getSecurityAlerts(account.address.toString());
      const highestSeverity = alerts.reduce((highest, alert) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const currentLevel = severityLevels[alert.severity];
        const highestLevel = severityLevels[highest];
        return currentLevel > highestLevel ? alert.severity : highest;
      }, 'low' as 'low' | 'medium' | 'high' | 'critical');

      setSecurityStatus(prev => ({
        ...prev,
        riskLevel: highestSeverity,
        activeAlerts: alerts,
        lastSecurityCheck: Date.now()
      }));
    } catch (error) {
      console.error('Failed to update security status:', error);
    }
  }, [account]);

  const performSecurityCheck = useCallback(async (
    transactionType: string,
    amount: number,
    recipient?: string
  ): Promise<SecurityCheckResult> => {
    if (!account?.address) {
      return {
        approved: false,
        riskAssessment: {
          level: 'critical',
          score: 100,
          factors: [],
          recommendedActions: [],
          confidence: 1
        },
        requiredActions: ['Connect wallet'],
        canProceed: false
      };
    }

    setLoading(true);
    try {
      const riskAssessment = await securityService.analyzeTransactionRisk(
        account.address.toString(),
        amount,
        recipient || '',
        transactionType
      );

      const approved = riskAssessment.level === 'low' || riskAssessment.level === 'medium';
      const canProceed = riskAssessment.level !== 'critical';

      const requiredActions: string[] = [];

      // Determine required actions based on risk level
      if (riskAssessment.level === 'critical') {
        requiredActions.push('Account verification required');
        requiredActions.push('Contact support');
      } else if (riskAssessment.level === 'high') {
        requiredActions.push('Additional authentication required');
        requiredActions.push('Transaction review needed');
      } else if (riskAssessment.level === 'medium') {
        requiredActions.push('Enhanced monitoring applied');
      }

      // Check for specific risk factors
      riskAssessment.factors.forEach(factor => {
        if (factor.type === 'device_mismatch' && factor.severity === 'high') {
          requiredActions.push('Verify device ownership');
        }
        if (factor.type === 'behavioral_anomaly' && factor.severity === 'high') {
          requiredActions.push('Confirm transaction intent');
        }
      });

      // Log security check
      securityService.logSecurityEvent({
        type: 'transaction',
        severity: riskAssessment.level === 'critical' ? 'critical' :
          riskAssessment.level === 'high' ? 'high' : 'low',
        userAddress: account.address.toString(),
        deviceFingerprint: securityStatus.deviceFingerprint?.id || '',
        details: {
          transactionType,
          amount,
          recipient,
          riskScore: riskAssessment.score,
          approved
        },
        riskScore: riskAssessment.score,
        resolved: approved,
        actions: riskAssessment.recommendedActions
      });

      // Create alert for high-risk transactions
      if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
        securityService.createSecurityAlert({
          type: 'suspicious_transaction',
          severity: riskAssessment.level,
          title: `${riskAssessment.level.charAt(0).toUpperCase() + riskAssessment.level.slice(1)} Risk Transaction`,
          message: `Transaction flagged with ${riskAssessment.level} risk (score: ${riskAssessment.score.toFixed(1)})`,
          userAddress: account.address.toString(),
          actions: [
            {
              label: 'Review Details',
              action: () => console.log('Review transaction details'),
              type: 'primary'
            },
            {
              label: 'Cancel Transaction',
              action: () => console.log('Cancel transaction'),
              type: 'danger'
            }
          ]
        });
      }

      return {
        approved,
        riskAssessment,
        requiredActions,
        canProceed
      };

    } catch (error) {
      console.error('Security check failed:', error);
      return {
        approved: false,
        riskAssessment: {
          level: 'critical',
          score: 100,
          factors: [{
            type: 'behavioral_anomaly',
            severity: 'critical',
            description: 'Security check failed',
            score: 100,
            evidence: { error: error?.toString() }
          }],
          recommendedActions: [],
          confidence: 1
        },
        requiredActions: ['Security check failed - contact support'],
        canProceed: false
      };
    } finally {
      setLoading(false);
    }
  }, [account, securityStatus.deviceFingerprint]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    securityService.acknowledgeAlert(alertId);
    setSecurityStatus(prev => ({
      ...prev,
      activeAlerts: prev.activeAlerts.filter(alert => alert.id !== alertId)
    }));
  }, []);

  const reportSuspiciousActivity = useCallback((
    activityType: string,
    description: string,
    evidence?: Record<string, any>
  ) => {
    if (!account?.address) return;

    securityService.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      userAddress: account.address.toString(),
      deviceFingerprint: securityStatus.deviceFingerprint?.id || '',
      details: {
        activityType,
        description,
        evidence,
        reportedBy: 'user'
      },
      riskScore: 50,
      resolved: false,
      actions: []
    });

    securityService.createSecurityAlert({
      type: 'suspicious_transaction',
      severity: 'medium',
      title: 'Suspicious Activity Reported',
      message: `User reported suspicious activity: ${activityType}`,
      userAddress: account.address.toString(),
      actions: [
        {
          label: 'Review Report',
          action: () => console.log('Review suspicious activity report'),
          type: 'primary'
        }
      ]
    });
  }, [account, securityStatus.deviceFingerprint]);

  const getSecurityHistory = useCallback(() => {
    if (!account?.address) return [];
    return securityService.getSecurityEvents(account.address.toString());
  }, [account]);

  const trustCurrentDevice = useCallback(async () => {
    if (!account?.address || !securityStatus.deviceFingerprint) return;

    try {
      // In a real implementation, this would require additional verification
      // For now, we'll just update the local status
      setSecurityStatus(prev => ({
        ...prev,
        deviceTrusted: true
      }));

      securityService.logSecurityEvent({
        type: 'device_change',
        severity: 'low',
        userAddress: account.address.toString(),
        deviceFingerprint: securityStatus.deviceFingerprint.id,
        details: {
          action: 'device_trusted',
          timestamp: Date.now()
        },
        riskScore: 5,
        resolved: true,
        actions: []
      });

    } catch (error) {
      console.error('Failed to trust device:', error);
    }
  }, [account, securityStatus.deviceFingerprint]);

  const enableEnhancedSecurity = useCallback(() => {
    // This would enable additional security features like:
    // - More frequent behavioral analysis
    // - Stricter transaction limits
    // - Additional verification steps
    console.log('Enhanced security mode enabled');
  }, []);

  return {
    // State
    securityStatus,
    loading,
    initialized,

    // Actions
    performSecurityCheck,
    acknowledgeAlert,
    reportSuspiciousActivity,
    trustCurrentDevice,
    enableEnhancedSecurity,
    updateSecurityStatus,

    // Data
    getSecurityHistory,

    // Computed values
    isSecure: securityStatus.riskLevel === 'low' && securityStatus.deviceTrusted,
    hasActiveAlerts: securityStatus.activeAlerts.length > 0,
    requiresAttention: securityStatus.riskLevel === 'high' || securityStatus.riskLevel === 'critical'
  };
}