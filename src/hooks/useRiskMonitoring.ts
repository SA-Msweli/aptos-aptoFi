import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRiskMonitoringService,
  type RiskMonitoringService,
  type RiskMonitoringConfig,
  type RiskEvent,
  type PortfolioHealthSummary,
  type ProtectionAction,
  type RiskMonitoringState
} from '@/lib/riskMonitoringService';
import { type RiskAlert } from '@/view-functions/getRiskData';

export interface UseRiskMonitoringOptions {
  userAddress?: string;
  autoStart?: boolean;
  config?: Partial<RiskMonitoringConfig>;
}

export interface RiskMonitoringHookState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  monitoredUsers: string[];
  activeAlerts: RiskAlert[];
  riskEvents: RiskEvent[];
  protectionActions: ProtectionAction[];
  portfolioSummary: PortfolioHealthSummary | null;
  lastUpdate: number;
}

export interface UseRiskMonitoringReturn extends RiskMonitoringHookState {
  // Service control
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  addUserToMonitoring: (userAddress: string) => void;
  removeUserFromMonitoring: (userAddress: string) => void;

  // Alert management
  acknowledgeRiskEvent: (eventId: string) => boolean;
  getActiveAlerts: (userAddress?: string) => RiskAlert[];

  // Data access
  getUserRiskSummary: (userAddress: string) => PortfolioHealthSummary | null;
  getProtectionActions: (userAddress?: string) => ProtectionAction[];
  getRiskEvents: (limit?: number) => RiskEvent[];

  // Configuration
  updateConfig: (config: Partial<RiskMonitoringConfig>) => void;
  getMonitoringState: () => RiskMonitoringState;
}

export const useRiskMonitoring = (options: UseRiskMonitoringOptions = {}): UseRiskMonitoringReturn => {
  const { userAddress, autoStart = false, config } = options;

  const [state, setState] = useState<RiskMonitoringHookState>({
    isActive: false,
    isLoading: false,
    error: null,
    monitoredUsers: [],
    activeAlerts: [],
    riskEvents: [],
    protectionActions: [],
    portfolioSummary: null,
    lastUpdate: 0
  });

  const serviceRef = useRef<RiskMonitoringService | null>(null);
  const eventListenersSetup = useRef(false);

  // Initialize service
  useEffect(() => {
    try {
      serviceRef.current = getRiskMonitoringService(config);

      if (!eventListenersSetup.current) {
        setupEventListeners();
        eventListenersSetup.current = true;
      }

      // Add user to monitoring if provided
      if (userAddress) {
        serviceRef.current.addUserToMonitoring(userAddress);
      }

      // Auto-start if requested
      if (autoStart) {
        serviceRef.current.startMonitoring().catch(error => {
          console.error('Failed to auto-start risk monitoring:', error);
          setState(prev => ({
            ...prev,
            error: error.message,
            isLoading: false
          }));
        });
      }

      // Initial state update
      updateState();

    } catch (error) {
      console.error('Failed to initialize risk monitoring service:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize service',
        isLoading: false
      }));
    }
  }, [userAddress, autoStart, config]);

  const setupEventListeners = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    const handleMonitoringStarted = () => {
      console.log('🚀 Risk monitoring started');
      setState(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
        error: null
      }));
    };

    const handleMonitoringStopped = () => {
      console.log('🛑 Risk monitoring stopped');
      setState(prev => ({
        ...prev,
        isActive: false
      }));
    };

    const handleRiskAssessmentCompleted = (data: any) => {
      console.log('✅ Risk assessment completed:', data);
      updateState();
    };

    const handleRiskAlert = (event: RiskEvent) => {
      console.log('🚨 Risk alert:', event);
      setState(prev => ({
        ...prev,
        riskEvents: [event, ...prev.riskEvents.slice(0, 99)], // Keep last 100 events
        activeAlerts: service.getActiveAlerts(userAddress)
      }));

      // Emit browser notification for critical alerts
      if (event.severity === 'critical' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Critical Risk Alert', {
            body: event.message,
            icon: '/favicon.ico',
            tag: event.id
          });
        }
      }
    };

    const handleHealthFactorWarning = (event: RiskEvent) => {
      console.log('⚠️ Health factor warning:', event);
      updateState();
    };

    const handleCriticalHealthFactor = (event: RiskEvent) => {
      console.log('🚨 Critical health factor:', event);
      updateState();

      // Show urgent browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('URGENT: Critical Health Factor', {
          body: event.message,
          icon: '/favicon.ico',
          tag: 'critical-health',
          requireInteraction: true
        });
      }
    };

    const handleLiquidationRisk = (event: RiskEvent) => {
      console.log('💀 Liquidation risk:', event);
      updateState();

      // Show urgent browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('LIQUIDATION RISK', {
          body: event.message,
          icon: '/favicon.ico',
          tag: 'liquidation-risk',
          requireInteraction: true
        });
      }
    };

    const handleProtectionTriggered = (event: RiskEvent) => {
      console.log('🛡️ Protection triggered:', event);
      updateState();
    };

    const handleVolatilityAlert = (event: RiskEvent) => {
      console.log('📈 Volatility alert:', event);
      setState(prev => ({
        ...prev,
        riskEvents: [event, ...prev.riskEvents.slice(0, 99)]
      }));
    };

    const handleUserAdded = (data: any) => {
      console.log('👤 User added to monitoring:', data);
      updateState();
    };

    const handleUserRemoved = (data: any) => {
      console.log('👤 User removed from monitoring:', data);
      updateState();
    };

    const handleAssessmentError = (data: any) => {
      console.error('❌ Risk assessment error:', data);
      setState(prev => ({
        ...prev,
        error: data.error?.message || 'Risk assessment failed'
      }));
    };

    // Attach event listeners
    service.on('monitoringStarted', handleMonitoringStarted);
    service.on('monitoringStopped', handleMonitoringStopped);
    service.on('riskAssessmentCompleted', handleRiskAssessmentCompleted);
    service.on('riskAlert', handleRiskAlert);
    service.on('healthFactorWarning', handleHealthFactorWarning);
    service.on('criticalHealthFactor', handleCriticalHealthFactor);
    service.on('liquidationRisk', handleLiquidationRisk);
    service.on('protectionTriggered', handleProtectionTriggered);
    service.on('volatilityAlert', handleVolatilityAlert);
    service.on('userAdded', handleUserAdded);
    service.on('userRemoved', handleUserRemoved);
    service.on('assessmentError', handleAssessmentError);

    // Cleanup function
    return () => {
      service.off('monitoringStarted', handleMonitoringStarted);
      service.off('monitoringStopped', handleMonitoringStopped);
      service.off('riskAssessmentCompleted', handleRiskAssessmentCompleted);
      service.off('riskAlert', handleRiskAlert);
      service.off('healthFactorWarning', handleHealthFactorWarning);
      service.off('criticalHealthFactor', handleCriticalHealthFactor);
      service.off('liquidationRisk', handleLiquidationRisk);
      service.off('protectionTriggered', handleProtectionTriggered);
      service.off('volatilityAlert', handleVolatilityAlert);
      service.off('userAdded', handleUserAdded);
      service.off('userRemoved', handleUserRemoved);
      service.off('assessmentError', handleAssessmentError);
    };
  }, [userAddress]);

  const updateState = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;
    const monitoringState = service.getMonitoringState();

    setState(prev => ({
      ...prev,
      isActive: monitoringState.isActive,
      monitoredUsers: service.getMonitoredUsers(),
      activeAlerts: service.getActiveAlerts(userAddress),
      riskEvents: service.getRiskEvents(100),
      protectionActions: service.getProtectionActions(userAddress),
      portfolioSummary: userAddress ? service.getUserRiskSummary(userAddress) : null,
      lastUpdate: monitoringState.lastUpdate
    }));
  }, [userAddress]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Service control methods
  const startMonitoring = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await serviceRef.current.startMonitoring();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start monitoring',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const stopMonitoring = useCallback((): void => {
    if (serviceRef.current) {
      serviceRef.current.stopMonitoring();
    }
  }, []);

  const addUserToMonitoring = useCallback((userAddress: string): void => {
    if (serviceRef.current) {
      serviceRef.current.addUserToMonitoring(userAddress);
    }
  }, []);

  const removeUserFromMonitoring = useCallback((userAddress: string): void => {
    if (serviceRef.current) {
      serviceRef.current.removeUserFromMonitoring(userAddress);
    }
  }, []);

  // Alert management methods
  const acknowledgeRiskEvent = useCallback((eventId: string): boolean => {
    if (!serviceRef.current) {
      return false;
    }

    const result = serviceRef.current.acknowledgeRiskEvent(eventId);
    if (result) {
      updateState();
    }
    return result;
  }, [updateState]);

  const getActiveAlerts = useCallback((userAddress?: string): RiskAlert[] => {
    return serviceRef.current?.getActiveAlerts(userAddress) || [];
  }, []);

  // Data access methods
  const getUserRiskSummary = useCallback((userAddress: string): PortfolioHealthSummary | null => {
    return serviceRef.current?.getUserRiskSummary(userAddress) || null;
  }, []);

  const getProtectionActions = useCallback((userAddress?: string): ProtectionAction[] => {
    return serviceRef.current?.getProtectionActions(userAddress) || [];
  }, []);

  const getRiskEvents = useCallback((limit?: number): RiskEvent[] => {
    return serviceRef.current?.getRiskEvents(limit) || [];
  }, []);

  // Configuration methods
  const updateConfig = useCallback((config: Partial<RiskMonitoringConfig>): void => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  }, []);

  const getMonitoringState = useCallback((): RiskMonitoringState => {
    return serviceRef.current?.getMonitoringState() || {
      isActive: false,
      monitoredUsers: new Set(),
      activeAlerts: new Map(),
      riskProfiles: new Map(),
      healthFactors: new Map(),
      lastUpdate: 0,
      alertCount: 0,
      protectionActionsCount: 0
    };
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    addUserToMonitoring,
    removeUserFromMonitoring,
    acknowledgeRiskEvent,
    getActiveAlerts,
    getUserRiskSummary,
    getProtectionActions,
    getRiskEvents,
    updateConfig,
    getMonitoringState
  };
};

// Hook for specific user risk monitoring
export const useUserRiskMonitoring = (userAddress: string, options: Omit<UseRiskMonitoringOptions, 'userAddress'> = {}) => {
  const riskMonitoring = useRiskMonitoring({ ...options, userAddress });

  return {
    ...riskMonitoring,
    userAddress,
    isUserMonitored: riskMonitoring.monitoredUsers.includes(userAddress),
    userAlerts: riskMonitoring.activeAlerts,
    userProtectionActions: riskMonitoring.protectionActions,
    userRiskSummary: riskMonitoring.portfolioSummary
  };
};

// Hook for global risk monitoring (admin/system view)
export const useGlobalRiskMonitoring = (options: UseRiskMonitoringOptions = {}) => {
  const riskMonitoring = useRiskMonitoring(options);

  const criticalAlerts = riskMonitoring.activeAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = riskMonitoring.activeAlerts.filter(alert => alert.severity === 'high');
  const recentEvents = riskMonitoring.riskEvents.slice(0, 20);

  return {
    ...riskMonitoring,
    criticalAlerts,
    highAlerts,
    recentEvents,
    totalMonitoredUsers: riskMonitoring.monitoredUsers.length,
    totalActiveAlerts: riskMonitoring.activeAlerts.length,
    totalProtectionActions: riskMonitoring.protectionActions.length
  };
};