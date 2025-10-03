import { EventEmitter } from 'events';
import {
  getHealthFactor,
  getUserRiskProfile,
  getPositionAssessment,
  getGlobalRiskMetrics,
  getUserRiskAlerts,
  isEligibleForLiquidation,
  calculateLiquidationPrice,
  type HealthFactor,
  type UserRiskProfile,
  type PositionAssessment,
  type RiskAlert,
  type GlobalRiskMetrics
} from '@/view-functions/getRiskData';
import { getRealTimeDataService, type PriceUpdate } from '@/lib/realTimeDataService';

export interface RiskMonitoringConfig {
  monitoringInterval: number; // milliseconds
  alertThresholds: {
    healthFactorWarning: number; // Health factor threshold for warnings
    healthFactorCritical: number; // Health factor threshold for critical alerts
    volatilityThreshold: number; // Volatility percentage threshold
    liquidationTimeThreshold: number; // Time to liquidation threshold (seconds)
  };
  enableAutomaticProtection: boolean;
  protectionMeasures: {
    autoAddCollateral: boolean;
    autoReducePosition: boolean;
    emergencyExit: boolean;
  };
  notificationChannels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    webhook?: string;
  };
}

export interface RiskMonitoringState {
  isActive: boolean;
  monitoredUsers: Set<string>;
  activeAlerts: Map<string, RiskAlert[]>;
  riskProfiles: Map<string, UserRiskProfile>;
  healthFactors: Map<string, HealthFactor>;
  lastUpdate: number;
  alertCount: number;
  protectionActionsCount: number;
}

export interface ProtectionAction {
  id: string;
  userAddress: string;
  tokenSymbol: string;
  actionType: 'add_collateral' | 'reduce_position' | 'emergency_exit' | 'liquidation_warning';
  amount: number;
  reason: string;
  timestamp: number;
  status: 'pending' | 'executed' | 'failed';
  transactionHash?: string;
}

export interface RiskEvent {
  id: string;
  type: 'health_factor_warning' | 'liquidation_risk' | 'high_volatility' | 'position_at_risk' | 'protection_triggered';
  userAddress: string;
  tokenSymbol?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: number;
  acknowledged: boolean;
}

export interface PortfolioHealthSummary {
  userAddress: string;
  overallHealthFactor: number;
  totalCollateralValue: number;
  totalBorrowedValue: number;
  utilizationRate: number;
  riskScore: number;
  activePositions: number;
  positionsAtRisk: number;
  recommendedActions: string[];
  lastUpdated: number;
}

export class RiskMonitoringService extends EventEmitter {
  private config: RiskMonitoringConfig;
  private state: RiskMonitoringState;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private protectionActions: Map<string, ProtectionAction[]> = new Map();
  private riskEvents: RiskEvent[] = [];
  private isDestroyed = false;

  constructor(config: Partial<RiskMonitoringConfig> = {}) {
    super();

    this.config = {
      monitoringInterval: 30000, // 30 seconds
      alertThresholds: {
        healthFactorWarning: 1.5,
        healthFactorCritical: 1.1,
        volatilityThreshold: 10, // 10%
        liquidationTimeThreshold: 3600 // 1 hour
      },
      enableAutomaticProtection: false, // Disabled by default for safety
      protectionMeasures: {
        autoAddCollateral: false,
        autoReducePosition: false,
        emergencyExit: false
      },
      notificationChannels: {
        email: true,
        push: true,
        sms: false
      },
      ...config
    };

    this.state = {
      isActive: false,
      monitoredUsers: new Set(),
      activeAlerts: new Map(),
      riskProfiles: new Map(),
      healthFactors: new Map(),
      lastUpdate: 0,
      alertCount: 0,
      protectionActionsCount: 0
    };

    this.initializeService();
  }

  private initializeService(): void {
    // Listen to price updates for volatility monitoring
    const realTimeService = getRealTimeDataService();
    realTimeService.on('marketDataUpdated', (data) => {
      this.handlePriceUpdates(data);
    });

    console.log('🛡️ Risk monitoring service initialized');
    this.emit('initialized', { config: this.config });
  }

  private handlePriceUpdates(data: any): void {
    const { updates } = data;

    updates.forEach((update: PriceUpdate) => {
      // Check for high volatility
      if (update.volatility && update.volatility >= this.config.alertThresholds.volatilityThreshold) {
        this.triggerVolatilityAlert(update);
      }
    });
  }

  private triggerVolatilityAlert(priceUpdate: PriceUpdate): void {
    const event: RiskEvent = {
      id: `volatility_${priceUpdate.tokenSymbol}_${Date.now()}`,
      type: 'high_volatility',
      userAddress: 'system', // System-wide alert
      tokenSymbol: priceUpdate.tokenSymbol,
      severity: priceUpdate.volatility! > 20 ? 'critical' : 'high',
      message: `High volatility detected for ${priceUpdate.tokenSymbol}: ${priceUpdate.volatility?.toFixed(2)}%`,
      data: priceUpdate,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.addRiskEvent(event);
    this.emit('volatilityAlert', event);
  }

  public async startMonitoring(): Promise<void> {
    if (this.state.isActive) {
      console.warn('⚠️ Risk monitoring is already active');
      return;
    }

    if (this.isDestroyed) {
      throw new Error('Service has been destroyed');
    }

    this.state.isActive = true;
    console.log('🚀 Starting risk monitoring...');

    // Start monitoring loop
    this.monitoringTimer = setInterval(async () => {
      await this.performRiskAssessment();
    }, this.config.monitoringInterval);

    // Initial assessment
    await this.performRiskAssessment();

    this.emit('monitoringStarted', { timestamp: Date.now() });
  }

  public stopMonitoring(): void {
    if (!this.state.isActive) {
      return;
    }

    this.state.isActive = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    console.log('🛑 Risk monitoring stopped');
    this.emit('monitoringStopped', { timestamp: Date.now() });
  }

  private async performRiskAssessment(): Promise<void> {
    if (!this.state.isActive || this.isDestroyed) {
      return;
    }

    try {
      console.log('🔍 Performing risk assessment...');

      // Monitor all registered users
      const assessmentPromises = Array.from(this.state.monitoredUsers).map(async (userAddress) => {
        try {
          await this.assessUserRisk(userAddress);
        } catch (error) {
          console.error(`❌ Failed to assess risk for user ${userAddress}:`, error);
        }
      });

      await Promise.all(assessmentPromises);

      // Update global metrics
      await this.updateGlobalRiskMetrics();

      this.state.lastUpdate = Date.now();

      this.emit('riskAssessmentCompleted', {
        monitoredUsers: this.state.monitoredUsers.size,
        activeAlerts: this.getTotalActiveAlerts(),
        timestamp: this.state.lastUpdate
      });

    } catch (error) {
      console.error('❌ Risk assessment failed:', error);
      this.emit('assessmentError', { error, timestamp: Date.now() });
    }
  }

  private async assessUserRisk(userAddress: string): Promise<void> {
    try {
      // Get user's risk profile
      const riskProfile = await getUserRiskProfile(userAddress);
      if (!riskProfile) {
        console.warn(`⚠️ Could not fetch risk profile for ${userAddress}`);
        return;
      }

      this.state.riskProfiles.set(userAddress, riskProfile);

      // Check health factor for each position
      const healthFactor = await getHealthFactor(userAddress);
      if (healthFactor) {
        this.state.healthFactors.set(userAddress, healthFactor);
        await this.checkHealthFactorAlerts(userAddress, healthFactor);
      }

      // Check for liquidation risk
      await this.checkLiquidationRisk(userAddress, riskProfile);

      // Get and process risk alerts
      const alerts = await getUserRiskAlerts(userAddress, false);
      this.state.activeAlerts.set(userAddress, alerts);

      // Process new alerts
      alerts.forEach(alert => {
        if (!alert.acknowledged) {
          this.processRiskAlert(userAddress, alert);
        }
      });

    } catch (error) {
      console.error(`❌ Failed to assess risk for user ${userAddress}:`, error);
    }
  }

  private async checkHealthFactorAlerts(userAddress: string, healthFactor: HealthFactor): Promise<void> {
    const { value, status } = healthFactor;

    // Critical health factor alert
    if (value <= this.config.alertThresholds.healthFactorCritical) {
      const event: RiskEvent = {
        id: `health_critical_${userAddress}_${Date.now()}`,
        type: 'liquidation_risk',
        userAddress,
        severity: 'critical',
        message: `CRITICAL: Health factor is ${value.toFixed(3)}. Immediate action required to avoid liquidation.`,
        data: healthFactor,
        timestamp: Date.now(),
        acknowledged: false
      };

      this.addRiskEvent(event);
      this.emit('criticalHealthFactor', event);

      // Trigger automatic protection if enabled
      if (this.config.enableAutomaticProtection) {
        await this.triggerAutomaticProtection(userAddress, 'critical_health_factor', healthFactor);
      }
    }
    // Warning health factor alert
    else if (value <= this.config.alertThresholds.healthFactorWarning) {
      const event: RiskEvent = {
        id: `health_warning_${userAddress}_${Date.now()}`,
        type: 'health_factor_warning',
        userAddress,
        severity: 'high',
        message: `WARNING: Health factor is ${value.toFixed(3)}. Consider adding collateral or reducing position.`,
        data: healthFactor,
        timestamp: Date.now(),
        acknowledged: false
      };

      this.addRiskEvent(event);
      this.emit('healthFactorWarning', event);
    }
  }

  private async checkLiquidationRisk(userAddress: string, riskProfile: UserRiskProfile): Promise<void> {
    // Check if any positions are eligible for liquidation
    // This would typically check each token position, but for simplicity we'll check the overall profile

    if (riskProfile.portfolioHealthFactor <= 1.0) {
      const event: RiskEvent = {
        id: `liquidation_risk_${userAddress}_${Date.now()}`,
        type: 'position_at_risk',
        userAddress,
        severity: 'critical',
        message: `LIQUIDATION RISK: Portfolio health factor is ${riskProfile.portfolioHealthFactor.toFixed(3)}`,
        data: riskProfile,
        timestamp: Date.now(),
        acknowledged: false
      };

      this.addRiskEvent(event);
      this.emit('liquidationRisk', event);

      // Send immediate notification
      await this.sendNotification(event);
    }
  }

  private async triggerAutomaticProtection(
    userAddress: string,
    reason: string,
    data: any
  ): Promise<void> {
    if (!this.config.enableAutomaticProtection) {
      return;
    }

    const actionId = `protection_${userAddress}_${Date.now()}`;

    const action: ProtectionAction = {
      id: actionId,
      userAddress,
      tokenSymbol: 'SYSTEM', // System-wide protection
      actionType: 'liquidation_warning', // Start with warning
      amount: 0,
      reason,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Add to protection actions
    if (!this.protectionActions.has(userAddress)) {
      this.protectionActions.set(userAddress, []);
    }
    this.protectionActions.get(userAddress)!.push(action);

    this.state.protectionActionsCount++;

    // Emit protection event
    const protectionEvent: RiskEvent = {
      id: `protection_${actionId}`,
      type: 'protection_triggered',
      userAddress,
      severity: 'high',
      message: `Automatic protection triggered for ${reason}`,
      data: { action, originalData: data },
      timestamp: Date.now(),
      acknowledged: false
    };

    this.addRiskEvent(protectionEvent);
    this.emit('protectionTriggered', protectionEvent);

    // For now, we'll just log the protection action
    // In a real implementation, this would execute actual protection measures
    console.log(`🛡️ Protection action triggered for ${userAddress}: ${reason}`);
  }

  private processRiskAlert(userAddress: string, alert: RiskAlert): void {
    this.state.alertCount++;

    const event: RiskEvent = {
      id: `alert_${alert.id}`,
      type: alert.type as any,
      userAddress,
      tokenSymbol: alert.tokenSymbol,
      severity: alert.severity,
      message: alert.message,
      data: alert,
      timestamp: alert.createdAt,
      acknowledged: false
    };

    this.addRiskEvent(event);
    this.emit('riskAlert', event);

    // Send notification for high severity alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      this.sendNotification(event);
    }
  }

  private addRiskEvent(event: RiskEvent): void {
    this.riskEvents.push(event);

    // Keep only last 1000 events
    if (this.riskEvents.length > 1000) {
      this.riskEvents.splice(0, this.riskEvents.length - 1000);
    }
  }

  private async sendNotification(event: RiskEvent): Promise<void> {
    try {
      // Email notification
      if (this.config.notificationChannels.email) {
        console.log(`📧 Email notification: ${event.message}`);
        // Implement email sending logic
      }

      // Push notification
      if (this.config.notificationChannels.push) {
        console.log(`📱 Push notification: ${event.message}`);
        // Implement push notification logic
      }

      // SMS notification
      if (this.config.notificationChannels.sms) {
        console.log(`📱 SMS notification: ${event.message}`);
        // Implement SMS sending logic
      }

      // Webhook notification
      if (this.config.notificationChannels.webhook) {
        console.log(`🔗 Webhook notification: ${event.message}`);
        // Implement webhook call
      }

      this.emit('notificationSent', { event, timestamp: Date.now() });

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      this.emit('notificationError', { event, error, timestamp: Date.now() });
    }
  }

  private async updateGlobalRiskMetrics(): Promise<void> {
    try {
      const globalMetrics = await getGlobalRiskMetrics();
      this.emit('globalRiskMetricsUpdated', {
        metrics: globalMetrics,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Failed to update global risk metrics:', error);
    }
  }

  // Public API methods
  public addUserToMonitoring(userAddress: string): void {
    this.state.monitoredUsers.add(userAddress);
    console.log(`👤 Added user ${userAddress} to risk monitoring`);
    this.emit('userAdded', { userAddress, timestamp: Date.now() });
  }

  public removeUserFromMonitoring(userAddress: string): void {
    this.state.monitoredUsers.delete(userAddress);
    this.state.activeAlerts.delete(userAddress);
    this.state.riskProfiles.delete(userAddress);
    this.state.healthFactors.delete(userAddress);
    this.protectionActions.delete(userAddress);

    console.log(`👤 Removed user ${userAddress} from risk monitoring`);
    this.emit('userRemoved', { userAddress, timestamp: Date.now() });
  }

  public getMonitoredUsers(): string[] {
    return Array.from(this.state.monitoredUsers);
  }

  public getUserRiskSummary(userAddress: string): PortfolioHealthSummary | null {
    const riskProfile = this.state.riskProfiles.get(userAddress);
    const healthFactor = this.state.healthFactors.get(userAddress);

    if (!riskProfile || !healthFactor) {
      return null;
    }

    const alerts = this.state.activeAlerts.get(userAddress) || [];
    const positionsAtRisk = alerts.filter(alert =>
      alert.severity === 'high' || alert.severity === 'critical'
    ).length;

    return {
      userAddress,
      overallHealthFactor: riskProfile.portfolioHealthFactor,
      totalCollateralValue: riskProfile.totalCollateral,
      totalBorrowedValue: riskProfile.totalBorrowed,
      utilizationRate: riskProfile.totalBorrowed / riskProfile.totalCollateral,
      riskScore: riskProfile.overallRiskScore,
      activePositions: riskProfile.activePositions,
      positionsAtRisk,
      recommendedActions: this.generateRecommendedActions(riskProfile, healthFactor),
      lastUpdated: this.state.lastUpdate
    };
  }

  private generateRecommendedActions(riskProfile: UserRiskProfile, healthFactor: HealthFactor): string[] {
    const actions: string[] = [];

    if (healthFactor.value <= 1.1) {
      actions.push('🚨 URGENT: Add collateral immediately');
      actions.push('💰 Consider partial debt repayment');
    } else if (healthFactor.value <= 1.5) {
      actions.push('⚠️ Add collateral to improve health factor');
      actions.push('📊 Monitor position closely');
    }

    if (riskProfile.overallRiskScore > 80) {
      actions.push('📉 Consider reducing position sizes');
      actions.push('🔄 Diversify collateral assets');
    }

    if (actions.length === 0) {
      actions.push('✅ Portfolio is healthy');
      actions.push('📈 Consider optimizing yield opportunities');
    }

    return actions;
  }

  public getActiveAlerts(userAddress?: string): RiskAlert[] {
    if (userAddress) {
      return this.state.activeAlerts.get(userAddress) || [];
    }

    const allAlerts: RiskAlert[] = [];
    for (const alerts of this.state.activeAlerts.values()) {
      allAlerts.push(...alerts);
    }
    return allAlerts;
  }

  public getRiskEvents(limit: number = 100): RiskEvent[] {
    return this.riskEvents.slice(-limit);
  }

  public getProtectionActions(userAddress?: string): ProtectionAction[] {
    if (userAddress) {
      return this.protectionActions.get(userAddress) || [];
    }

    const allActions: ProtectionAction[] = [];
    for (const actions of this.protectionActions.values()) {
      allActions.push(...actions);
    }
    return allActions;
  }

  public acknowledgeRiskEvent(eventId: string): boolean {
    const event = this.riskEvents.find(e => e.id === eventId);
    if (event) {
      event.acknowledged = true;
      this.emit('eventAcknowledged', { eventId, timestamp: Date.now() });
      return true;
    }
    return false;
  }

  public updateConfig(newConfig: Partial<RiskMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated risk monitoring configuration');
    this.emit('configUpdated', this.config);
  }

  public getMonitoringState(): RiskMonitoringState {
    return { ...this.state };
  }

  private getTotalActiveAlerts(): number {
    let total = 0;
    for (const alerts of this.state.activeAlerts.values()) {
      total += alerts.length;
    }
    return total;
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('🧹 Destroying risk monitoring service...');

    this.isDestroyed = true;
    this.stopMonitoring();
    this.removeAllListeners();

    // Clear all data
    this.state.monitoredUsers.clear();
    this.state.activeAlerts.clear();
    this.state.riskProfiles.clear();
    this.state.healthFactors.clear();
    this.protectionActions.clear();
    this.riskEvents.length = 0;

    console.log('✅ Risk monitoring service destroyed');
  }
}

// Singleton instance
let riskMonitoringInstance: RiskMonitoringService | null = null;

export const getRiskMonitoringService = (config?: Partial<RiskMonitoringConfig>): RiskMonitoringService => {
  if (!riskMonitoringInstance) {
    riskMonitoringInstance = new RiskMonitoringService(config);
  }
  return riskMonitoringInstance;
};

export const destroyRiskMonitoringService = (): void => {
  if (riskMonitoringInstance) {
    riskMonitoringInstance.destroy();
    riskMonitoringInstance = null;
  }
};