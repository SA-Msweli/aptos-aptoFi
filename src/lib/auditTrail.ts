"use client";

// Comprehensive Audit Trail System
// Implements detailed transaction logging, compliance monitoring, and regulatory reporting

export interface AuditEvent {
  id: string;
  timestamp: number;
  userAddress: string;
  eventType: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  details: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
    location?: {
      country: string;
      city?: string;
      coordinates?: [number, number];
    };
  };
  complianceFlags: ComplianceFlag[];
  regulatoryRelevance: RegulatoryRelevance[];
  dataRetentionPolicy: DataRetentionPolicy;
  encrypted: boolean;
  hash: string;
  previousEventHash?: string;
}

export type AuditEventType =
  | 'user_registration'
  | 'user_login'
  | 'user_logout'
  | 'profile_creation'
  | 'profile_update'
  | 'kyc_submission'
  | 'kyc_verification'
  | 'kyc_rejection'
  | 'document_upload'
  | 'document_verification'
  | 'biometric_capture'
  | 'biometric_verification'
  | 'transaction_initiated'
  | 'transaction_completed'
  | 'transaction_failed'
  | 'transaction_cancelled'
  | 'compliance_screening'
  | 'risk_assessment'
  | 'security_alert'
  | 'account_freeze'
  | 'account_unfreeze'
  | 'suspicious_activity'
  | 'regulatory_report'
  | 'data_export'
  | 'data_deletion'
  | 'system_access'
  | 'configuration_change'
  | 'error_occurred';

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'user_management'
  | 'transaction'
  | 'compliance'
  | 'security'
  | 'data_privacy'
  | 'system'
  | 'regulatory';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceFlag {
  type: 'aml' | 'kyc' | 'sanctions' | 'pep' | 'data_privacy' | 'transaction_limit' | 'suspicious_activity';
  triggered: boolean;
  details: string;
  requiresReview: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  resolution?: string;
}

export interface RegulatoryRelevance {
  jurisdiction: string;
  regulation: string; // e.g., 'GDPR', 'BSA', 'AMLD5', 'MiCA'
  reportingRequired: boolean;
  retentionPeriod: number; // in milliseconds
  reportingDeadline?: number;
}

export interface DataRetentionPolicy {
  retentionPeriod: number; // in milliseconds
  autoDelete: boolean;
  archiveAfter?: number;
  encryptionRequired: boolean;
  accessRestrictions: string[];
}

export interface AuditQuery {
  userAddress?: string;
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  dateRange?: {
    start: number;
    end: number;
  };
  complianceFlags?: string[];
  regulatoryRelevance?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  reportId: string;
  reportType: 'compliance' | 'security' | 'transaction' | 'user_activity' | 'regulatory';
  title: string;
  description: string;
  generatedAt: number;
  generatedBy: string;
  timeRange: {
    start: number;
    end: number;
  };
  filters: AuditQuery;
  events: AuditEvent[];
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    complianceIssues: number;
    securityIncidents: number;
    regulatoryEvents: number;
  };
  insights: AuditInsight[];
  recommendations: string[];
  exportFormats: ('json' | 'csv' | 'pdf' | 'xml')[];
}

export interface AuditInsight {
  type: 'trend' | 'anomaly' | 'pattern' | 'risk' | 'compliance';
  title: string;
  description: string;
  severity: AuditSeverity;
  confidence: number; // 0-1
  evidence: AuditEvent[];
  recommendations: string[];
}

export interface ComplianceMonitor {
  monitorId: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: ComplianceRule[];
  alertThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
    webhook?: string;
  };
  reportingSchedule: {
    frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

export interface ComplianceRule {
  ruleId: string;
  name: string;
  description: string;
  condition: string; // JSON logic expression
  action: 'log' | 'alert' | 'block' | 'review' | 'report';
  severity: AuditSeverity;
  enabled: boolean;
}

class AuditTrailService {
  private static instance: AuditTrailService;
  private events: AuditEvent[] = [];
  private complianceMonitors: ComplianceMonitor[] = [];
  private lastEventHash: string = '';

  static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  constructor() {
    this.initializeDefaultMonitors();
  }

  async logEvent(eventData: Omit<AuditEvent, 'id' | 'timestamp' | 'hash' | 'previousEventHash'>): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...eventData,
      id: this.generateEventId(),
      timestamp: Date.now(),
      hash: '',
      previousEventHash: this.lastEventHash || undefined
    };

    // Generate event hash for integrity
    event.hash = await this.generateEventHash(event);
    this.lastEventHash = event.hash;

    // Encrypt sensitive data if required
    if (event.dataRetentionPolicy.encryptionRequired) {
      event.details = await this.encryptSensitiveData(event.details);
      event.encrypted = true;
    }

    // Store event
    this.events.push(event);

    // Process compliance monitoring
    await this.processComplianceMonitoring(event);

    // Trigger real-time notifications if needed
    await this.triggerNotifications(event);

    // Store in persistent storage (in production, this would be a database)
    await this.persistEvent(event);

    return event;
  }

  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    let filteredEvents = [...this.events];

    // Apply filters
    if (query.userAddress) {
      filteredEvents = filteredEvents.filter(event =>
        event.userAddress === query.userAddress
      );
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        query.eventTypes!.includes(event.eventType)
      );
    }

    if (query.categories && query.categories.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        query.categories!.includes(event.category)
      );
    }

    if (query.severities && query.severities.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        query.severities!.includes(event.severity)
      );
    }

    if (query.dateRange) {
      filteredEvents = filteredEvents.filter(event =>
        event.timestamp >= query.dateRange!.start &&
        event.timestamp <= query.dateRange!.end
      );
    }

    if (query.complianceFlags && query.complianceFlags.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        event.complianceFlags.some(flag =>
          query.complianceFlags!.includes(flag.type)
        )
      );
    }

    // Sort results
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    filteredEvents.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'severity':
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return filteredEvents.slice(offset, offset + limit);
  }

  async generateReport(
    reportType: AuditReport['reportType'],
    title: string,
    description: string,
    filters: AuditQuery,
    generatedBy: string
  ): Promise<AuditReport> {
    const reportId = this.generateReportId();
    const events = await this.queryEvents(filters);

    // Generate summary statistics
    const summary = this.generateSummary(events);

    // Generate insights
    const insights = await this.generateInsights(events, reportType);

    // Generate recommendations
    const recommendations = this.generateRecommendations(events, insights);

    const report: AuditReport = {
      reportId,
      reportType,
      title,
      description,
      generatedAt: Date.now(),
      generatedBy,
      timeRange: {
        start: filters.dateRange?.start || 0,
        end: filters.dateRange?.end || Date.now()
      },
      filters,
      events,
      summary,
      insights,
      recommendations,
      exportFormats: ['json', 'csv', 'pdf']
    };

    return report;
  }

  async exportReport(report: AuditReport, format: 'json' | 'csv' | 'pdf' | 'xml'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        return this.exportToCSV(report);

      case 'pdf':
        return this.exportToPDF(report);

      case 'xml':
        return this.exportToXML(report);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async verifyEventIntegrity(eventId: string): Promise<{
    valid: boolean;
    details: string;
  }> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) {
      return { valid: false, details: 'Event not found' };
    }

    // Verify hash
    const expectedHash = await this.generateEventHash({
      ...event,
      hash: '',
      previousEventHash: event.previousEventHash
    });

    if (event.hash !== expectedHash) {
      return { valid: false, details: 'Event hash mismatch - possible tampering' };
    }

    // Verify chain integrity
    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex > 0) {
      const previousEvent = this.events[eventIndex - 1];
      if (event.previousEventHash !== previousEvent.hash) {
        return { valid: false, details: 'Chain integrity broken - previous event hash mismatch' };
      }
    }

    return { valid: true, details: 'Event integrity verified' };
  }

  async createComplianceMonitor(monitor: Omit<ComplianceMonitor, 'monitorId'>): Promise<ComplianceMonitor> {
    const complianceMonitor: ComplianceMonitor = {
      ...monitor,
      monitorId: this.generateMonitorId()
    };

    this.complianceMonitors.push(complianceMonitor);
    return complianceMonitor;
  }

  async updateComplianceMonitor(monitorId: string, updates: Partial<ComplianceMonitor>): Promise<ComplianceMonitor | null> {
    const index = this.complianceMonitors.findIndex(m => m.monitorId === monitorId);
    if (index === -1) return null;

    this.complianceMonitors[index] = { ...this.complianceMonitors[index], ...updates };
    return this.complianceMonitors[index];
  }

  getComplianceMonitors(): ComplianceMonitor[] {
    return [...this.complianceMonitors];
  }

  async processDataRetention(): Promise<{
    eventsArchived: number;
    eventsDeleted: number;
  }> {
    const now = Date.now();
    let eventsArchived = 0;
    let eventsDeleted = 0;

    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      const eventAge = now - event.timestamp;

      // Check if event should be deleted
      if (event.dataRetentionPolicy.autoDelete &&
        eventAge > event.dataRetentionPolicy.retentionPeriod) {
        this.events.splice(i, 1);
        eventsDeleted++;
      }
      // Check if event should be archived
      else if (event.dataRetentionPolicy.archiveAfter &&
        eventAge > event.dataRetentionPolicy.archiveAfter) {
        // In production, move to archive storage
        eventsArchived++;
      }
    }

    return { eventsArchived, eventsDeleted };
  }

  private async processComplianceMonitoring(event: AuditEvent): Promise<void> {
    for (const monitor of this.complianceMonitors) {
      if (!monitor.enabled) continue;

      for (const rule of monitor.rules) {
        if (!rule.enabled) continue;

        const ruleMatches = await this.evaluateComplianceRule(rule, event);
        if (ruleMatches) {
          await this.executeComplianceAction(rule, event, monitor);
        }
      }
    }
  }

  private async evaluateComplianceRule(rule: ComplianceRule, event: AuditEvent): Promise<boolean> {
    try {
      // Simplified rule evaluation (in production, use a proper rule engine)
      const condition = JSON.parse(rule.condition);
      return this.evaluateCondition(condition, event);
    } catch (error) {
      console.error('Failed to evaluate compliance rule:', error);
      return false;
    }
  }

  private evaluateCondition(condition: any, event: AuditEvent): boolean {
    // Simplified condition evaluation
    if (condition.eventType && condition.eventType !== event.eventType) return false;
    if (condition.category && condition.category !== event.category) return false;
    if (condition.severity && condition.severity !== event.severity) return false;
    if (condition.minAmount && (!event.details.amount || event.details.amount < condition.minAmount)) return false;

    return true;
  }

  private async executeComplianceAction(
    rule: ComplianceRule,
    event: AuditEvent,
    monitor: ComplianceMonitor
  ): Promise<void> {
    switch (rule.action) {
      case 'log':
        console.log(`Compliance rule triggered: ${rule.name}`, { event, rule });
        break;

      case 'alert':
        await this.sendComplianceAlert(rule, event, monitor);
        break;

      case 'block':
        // In production, this would block the transaction or action
        console.warn(`Action blocked by compliance rule: ${rule.name}`);
        break;

      case 'review':
        await this.flagForManualReview(rule, event);
        break;

      case 'report':
        await this.generateRegulatoryReport(rule, event);
        break;
    }
  }

  private async sendComplianceAlert(
    rule: ComplianceRule,
    event: AuditEvent,
    monitor: ComplianceMonitor
  ): Promise<void> {
    // In production, send actual alerts via email, SMS, webhook, etc.
    console.log('Compliance alert:', {
      rule: rule.name,
      event: event.id,
      severity: rule.severity,
      monitor: monitor.name
    });
  }

  private async flagForManualReview(rule: ComplianceRule, event: AuditEvent): Promise<void> {
    // Add compliance flag to event
    event.complianceFlags.push({
      type: 'suspicious_activity',
      triggered: true,
      details: `Flagged by rule: ${rule.name}`,
      requiresReview: true
    });
  }

  private async generateRegulatoryReport(rule: ComplianceRule, event: AuditEvent): Promise<void> {
    // In production, generate and submit regulatory reports
    console.log('Regulatory report generated:', {
      rule: rule.name,
      event: event.id,
      timestamp: Date.now()
    });
  }

  private async triggerNotifications(event: AuditEvent): Promise<void> {
    // Trigger notifications for high-severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      console.log('High-severity event notification:', event);
    }
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    // In production, persist to database
    try {
      localStorage.setItem(`audit_event_${event.id}`, JSON.stringify(event));
    } catch (error) {
      console.warn('Failed to persist audit event:', error);
    }
  }

  private generateSummary(events: AuditEvent[]): AuditReport['summary'] {
    const summary = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsByCategory: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      complianceIssues: 0,
      securityIncidents: 0,
      regulatoryEvents: 0
    };

    events.forEach(event => {
      // Count by type
      summary.eventsByType[event.eventType] = (summary.eventsByType[event.eventType] || 0) + 1;

      // Count by category
      summary.eventsByCategory[event.category] = (summary.eventsByCategory[event.category] || 0) + 1;

      // Count by severity
      summary.eventsBySeverity[event.severity] = (summary.eventsBySeverity[event.severity] || 0) + 1;

      // Count special categories
      if (event.complianceFlags.length > 0) summary.complianceIssues++;
      if (event.category === 'security') summary.securityIncidents++;
      if (event.regulatoryRelevance.length > 0) summary.regulatoryEvents++;
    });

    return summary;
  }

  private async generateInsights(events: AuditEvent[], reportType: string): Promise<AuditInsight[]> {
    const insights: AuditInsight[] = [];

    // Detect unusual activity patterns
    const activityInsight = this.detectActivityPatterns(events);
    if (activityInsight) insights.push(activityInsight);

    // Detect security anomalies
    const securityInsight = this.detectSecurityAnomalies(events);
    if (securityInsight) insights.push(securityInsight);

    // Detect compliance trends
    const complianceInsight = this.detectComplianceTrends(events);
    if (complianceInsight) insights.push(complianceInsight);

    return insights;
  }

  private detectActivityPatterns(events: AuditEvent[]): AuditInsight | null {
    // Simplified pattern detection
    const recentEvents = events.filter(e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000);

    if (recentEvents.length > 100) {
      return {
        type: 'anomaly',
        title: 'High Activity Volume',
        description: `Detected ${recentEvents.length} events in the last 24 hours, which is above normal levels`,
        severity: 'medium',
        confidence: 0.8,
        evidence: recentEvents.slice(0, 10),
        recommendations: [
          'Review recent activity for suspicious patterns',
          'Consider implementing rate limiting',
          'Monitor for potential automated attacks'
        ]
      };
    }

    return null;
  }

  private detectSecurityAnomalies(events: AuditEvent[]): AuditInsight | null {
    const securityEvents = events.filter(e => e.category === 'security');
    const criticalEvents = securityEvents.filter(e => e.severity === 'critical');

    if (criticalEvents.length > 0) {
      return {
        type: 'risk',
        title: 'Critical Security Events',
        description: `Found ${criticalEvents.length} critical security events requiring immediate attention`,
        severity: 'critical',
        confidence: 1.0,
        evidence: criticalEvents,
        recommendations: [
          'Investigate critical security events immediately',
          'Review and update security policies',
          'Consider implementing additional security measures'
        ]
      };
    }

    return null;
  }

  private detectComplianceTrends(events: AuditEvent[]): AuditInsight | null {
    const complianceEvents = events.filter(e => e.complianceFlags.length > 0);

    if (complianceEvents.length > events.length * 0.1) { // More than 10% have compliance flags
      return {
        type: 'compliance',
        title: 'High Compliance Flag Rate',
        description: `${((complianceEvents.length / events.length) * 100).toFixed(1)}% of events have compliance flags`,
        severity: 'high',
        confidence: 0.9,
        evidence: complianceEvents.slice(0, 10),
        recommendations: [
          'Review compliance monitoring rules',
          'Investigate root causes of compliance issues',
          'Consider additional user education or system improvements'
        ]
      };
    }

    return null;
  }

  private generateRecommendations(events: AuditEvent[], insights: AuditInsight[]): string[] {
    const recommendations: string[] = [];

    // Add insight-based recommendations
    insights.forEach(insight => {
      recommendations.push(...insight.recommendations);
    });

    // Add general recommendations based on event patterns
    const highSeverityEvents = events.filter(e => e.severity === 'high' || e.severity === 'critical');
    if (highSeverityEvents.length > 0) {
      recommendations.push('Review and address all high and critical severity events');
    }

    const complianceEvents = events.filter(e => e.complianceFlags.length > 0);
    if (complianceEvents.length > 0) {
      recommendations.push('Conduct compliance review and implement corrective measures');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private exportToCSV(report: AuditReport): string {
    const headers = [
      'ID', 'Timestamp', 'User Address', 'Event Type', 'Category', 'Severity',
      'Description', 'Compliance Flags', 'Regulatory Relevance'
    ];

    const rows = report.events.map(event => [
      event.id,
      new Date(event.timestamp).toISOString(),
      event.userAddress,
      event.eventType,
      event.category,
      event.severity,
      event.description,
      event.complianceFlags.map(f => f.type).join(';'),
      event.regulatoryRelevance.map(r => r.regulation).join(';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToPDF(report: AuditReport): string {
    // In production, use a proper PDF library
    return `PDF Export of ${report.title} - ${report.events.length} events`;
  }

  private exportToXML(report: AuditReport): string {
    // In production, use a proper XML library
    return `<audit-report><title>${report.title}</title><events>${report.events.length}</events></audit-report>`;
  }

  private async generateEventHash(event: Omit<AuditEvent, 'hash'>): Promise<string> {
    const eventString = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      userAddress: event.userAddress,
      eventType: event.eventType,
      category: event.category,
      severity: event.severity,
      description: event.description,
      previousEventHash: event.previousEventHash
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(eventString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async encryptSensitiveData(data: Record<string, any>): Promise<Record<string, any>> {
    // In production, use proper encryption
    const sensitiveFields = ['ssn', 'passport', 'address', 'phone', 'email'];
    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = btoa(encrypted[field]); // Simple base64 encoding for demo
      }
    }

    return encrypted;
  }

  private initializeDefaultMonitors(): void {
    // Initialize default compliance monitors
    this.complianceMonitors = [
      {
        monitorId: 'default-aml',
        name: 'AML Transaction Monitor',
        description: 'Monitors for suspicious transaction patterns',
        enabled: true,
        rules: [
          {
            ruleId: 'large-transaction',
            name: 'Large Transaction Alert',
            description: 'Alert on transactions over $10,000',
            condition: JSON.stringify({ minAmount: 10000 }),
            action: 'alert',
            severity: 'medium',
            enabled: true
          }
        ],
        alertThresholds: { low: 1, medium: 5, high: 10, critical: 20 },
        notifications: { email: true, sms: false, dashboard: true },
        reportingSchedule: { frequency: 'daily', recipients: ['compliance@aptofi.com'] }
      }
    ];
  }

  private generateEventId(): string {
    return 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateReportId(): string {
    return 'rpt_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateMonitorId(): string {
    return 'mon_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const auditTrailService = AuditTrailService.getInstance();