"use client";

// Comprehensive Data Protection and Privacy System
// Implements GDPR compliance, data anonymization, and privacy controls

export interface DataSubject {
  id: string;
  userAddress: string;
  email?: string;
  createdAt: number;
  lastUpdated: number;
  consentRecords: ConsentRecord[];
  dataCategories: DataCategory[];
  privacySettings: PrivacySettings;
  dataRequests: DataRequest[];
}

export interface ConsentRecord {
  id: string;
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt?: number;
  revokedAt?: number;
  version: string;
  lawfulBasis: LawfulBasis;
  expiresAt?: number;
  source: 'explicit' | 'implicit' | 'legitimate_interest';
}

export type ConsentPurpose =
  | 'transaction_processing'
  | 'kyc_verification'
  | 'fraud_prevention'
  | 'marketing'
  | 'analytics'
  | 'customer_support'
  | 'legal_compliance'
  | 'service_improvement'
  | 'security_monitoring';

export type LawfulBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export interface DataCategory {
  category: DataCategoryType;
  description: string;
  retention: RetentionPolicy;
  sensitivity: DataSensitivity;
  sources: string[];
  processors: string[];
  transfers: DataTransfer[];
}

export type DataCategoryType =
  | 'identity'
  | 'financial'
  | 'transaction'
  | 'behavioral'
  | 'technical'
  | 'communication'
  | 'biometric'
  | 'location'
  | 'preferences';

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface RetentionPolicy {
  period: number; // in milliseconds
  reason: string;
  autoDelete: boolean;
  reviewDate?: number;
  legalBasis: string;
}

export interface DataTransfer {
  recipient: string;
  country: string;
  purpose: string;
  safeguards: string[];
  date: number;
}

export interface PrivacySettings {
  dataMinimization: boolean;
  anonymization: boolean;
  pseudonymization: boolean;
  encryption: boolean;
  accessLogging: boolean;
  shareWithPartners: boolean;
  marketingCommunications: boolean;
  analyticsTracking: boolean;
  cookiePreferences: CookiePreferences;
  communicationPreferences: CommunicationPreferences;
}

export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CommunicationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

export interface DataRequest {
  id: string;
  type: DataRequestType;
  status: DataRequestStatus;
  requestedAt: number;
  completedAt?: number;
  description: string;
  response?: DataRequestResponse;
  verificationRequired: boolean;
  verifiedAt?: number;
}

export type DataRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection'
  | 'automated_decision_opt_out';

export type DataRequestStatus =
  | 'pending'
  | 'under_review'
  | 'verification_required'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface DataRequestResponse {
  data?: any;
  format?: 'json' | 'csv' | 'xml' | 'pdf';
  downloadUrl?: string;
  expiresAt?: number;
  actions: string[];
  notes?: string;
}

export interface DataBreachIncident {
  id: string;
  detectedAt: number;
  reportedAt?: number;
  type: BreachType;
  severity: BreachSeverity;
  affectedDataTypes: DataCategoryType[];
  affectedUsers: number;
  description: string;
  cause: string;
  containmentActions: string[];
  notificationRequired: boolean;
  regulatoryReported: boolean;
  status: 'detected' | 'contained' | 'investigated' | 'resolved';
  impact: BreachImpact;
}

export type BreachType =
  | 'unauthorized_access'
  | 'data_theft'
  | 'accidental_disclosure'
  | 'system_compromise'
  | 'insider_threat'
  | 'third_party_breach';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BreachImpact {
  confidentiality: boolean;
  integrity: boolean;
  availability: boolean;
  financialLoss?: number;
  reputationalDamage: boolean;
  regulatoryConsequences: boolean;
}

export interface PrivacyImpactAssessment {
  id: string;
  projectName: string;
  description: string;
  dataTypes: DataCategoryType[];
  processingPurposes: ConsentPurpose[];
  riskLevel: 'low' | 'medium' | 'high';
  risks: PrivacyRisk[];
  mitigations: PrivacyMitigation[];
  assessedBy: string;
  assessedAt: number;
  reviewDate: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: number;
}

export interface PrivacyRisk {
  id: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedRights: DataSubjectRight[];
}

export interface PrivacyMitigation {
  id: string;
  riskId: string;
  description: string;
  implementation: string;
  effectiveness: 'low' | 'medium' | 'high';
  responsible: string;
  deadline: number;
  status: 'planned' | 'in_progress' | 'completed' | 'verified';
}

export type DataSubjectRight =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restrict_processing'
  | 'data_portability'
  | 'object'
  | 'not_subject_to_automated_decision_making';

class DataProtectionService {
  private static instance: DataProtectionService;
  private dataSubjects: Map<string, DataSubject> = new Map();
  private breachIncidents: DataBreachIncident[] = [];
  private privacyAssessments: PrivacyImpactAssessment[] = [];

  static getInstance(): DataProtectionService {
    if (!DataProtectionService.instance) {
      DataProtectionService.instance = new DataProtectionService();
    }
    return DataProtectionService.instance;
  }

  // Data Subject Management
  async createDataSubject(userAddress: string, email?: string): Promise<DataSubject> {
    const dataSubject: DataSubject = {
      id: this.generateId('ds'),
      userAddress,
      email,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      consentRecords: this.getDefaultConsents(),
      dataCategories: this.getDefaultDataCategories(),
      privacySettings: this.getDefaultPrivacySettings(),
      dataRequests: []
    };

    this.dataSubjects.set(userAddress, dataSubject);
    return dataSubject;
  }

  async getDataSubject(userAddress: string): Promise<DataSubject | null> {
    return this.dataSubjects.get(userAddress) || null;
  }

  async updateDataSubject(userAddress: string, updates: Partial<DataSubject>): Promise<DataSubject | null> {
    const dataSubject = this.dataSubjects.get(userAddress);
    if (!dataSubject) return null;

    const updated = {
      ...dataSubject,
      ...updates,
      lastUpdated: Date.now()
    };

    this.dataSubjects.set(userAddress, updated);
    return updated;
  }

  // Consent Management
  async grantConsent(
    userAddress: string,
    purpose: ConsentPurpose,
    lawfulBasis: LawfulBasis,
    version: string = '1.0',
    expiresAt?: number
  ): Promise<ConsentRecord> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) {
      throw new Error('Data subject not found');
    }

    const consent: ConsentRecord = {
      id: this.generateId('consent'),
      purpose,
      granted: true,
      grantedAt: Date.now(),
      version,
      lawfulBasis,
      expiresAt,
      source: 'explicit'
    };

    // Remove any existing consent for the same purpose
    dataSubject.consentRecords = dataSubject.consentRecords.filter(c => c.purpose !== purpose);
    dataSubject.consentRecords.push(consent);

    await this.updateDataSubject(userAddress, { consentRecords: dataSubject.consentRecords });
    return consent;
  }

  async revokeConsent(userAddress: string, purpose: ConsentPurpose): Promise<boolean> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return false;

    const consent = dataSubject.consentRecords.find(c => c.purpose === purpose && c.granted);
    if (!consent) return false;

    consent.granted = false;
    consent.revokedAt = Date.now();

    await this.updateDataSubject(userAddress, { consentRecords: dataSubject.consentRecords });
    return true;
  }

  async checkConsent(userAddress: string, purpose: ConsentPurpose): Promise<boolean> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return false;

    const consent = dataSubject.consentRecords.find(c => c.purpose === purpose);
    if (!consent || !consent.granted) return false;

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < Date.now()) {
      await this.revokeConsent(userAddress, purpose);
      return false;
    }

    return true;
  }

  // Privacy Settings Management
  async updatePrivacySettings(
    userAddress: string,
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings | null> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return null;

    const updatedSettings = {
      ...dataSubject.privacySettings,
      ...settings
    };

    await this.updateDataSubject(userAddress, { privacySettings: updatedSettings });
    return updatedSettings;
  }

  // Data Subject Rights Requests
  async submitDataRequest(
    userAddress: string,
    type: DataRequestType,
    description: string
  ): Promise<DataRequest> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) {
      throw new Error('Data subject not found');
    }

    const request: DataRequest = {
      id: this.generateId('req'),
      type,
      status: 'pending',
      requestedAt: Date.now(),
      description,
      verificationRequired: this.requiresVerification(type)
    };

    dataSubject.dataRequests.push(request);
    await this.updateDataSubject(userAddress, { dataRequests: dataSubject.dataRequests });

    // Auto-process certain types of requests
    if (type === 'access') {
      await this.processAccessRequest(userAddress, request.id);
    }

    return request;
  }

  async processAccessRequest(userAddress: string, requestId: string): Promise<void> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return;

    const request = dataSubject.dataRequests.find(r => r.id === requestId);
    if (!request || request.type !== 'access') return;

    // Compile all data for the user
    const userData = await this.compileUserData(userAddress);

    request.status = 'completed';
    request.completedAt = Date.now();
    request.response = {
      data: userData,
      format: 'json',
      downloadUrl: await this.generateSecureDownloadUrl(userData),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      actions: ['Data compiled and made available for download'],
      notes: 'Data will be available for 7 days'
    };

    await this.updateDataSubject(userAddress, { dataRequests: dataSubject.dataRequests });
  }

  async processErasureRequest(userAddress: string, requestId: string): Promise<void> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return;

    const request = dataSubject.dataRequests.find(r => r.id === requestId);
    if (!request || request.type !== 'erasure') return;

    // Check if erasure is legally permissible
    const canErase = await this.checkErasurePermissibility(userAddress);
    if (!canErase.allowed) {
      request.status = 'rejected';
      request.response = {
        actions: ['Request rejected'],
        notes: canErase.reason
      };
      return;
    }

    // Perform data erasure
    await this.performDataErasure(userAddress);

    request.status = 'completed';
    request.completedAt = Date.now();
    request.response = {
      actions: ['Personal data erased from all systems'],
      notes: 'Data erasure completed successfully'
    };

    await this.updateDataSubject(userAddress, { dataRequests: dataSubject.dataRequests });
  }

  async processPortabilityRequest(userAddress: string, requestId: string, format: 'json' | 'csv' | 'xml'): Promise<void> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return;

    const request = dataSubject.dataRequests.find(r => r.id === requestId);
    if (!request || request.type !== 'portability') return;

    // Compile portable data (structured, commonly used formats)
    const portableData = await this.compilePortableData(userAddress);
    const formattedData = await this.formatDataForPortability(portableData, format);

    request.status = 'completed';
    request.completedAt = Date.now();
    request.response = {
      data: formattedData,
      format,
      downloadUrl: await this.generateSecureDownloadUrl(formattedData),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      actions: ['Portable data compiled in requested format'],
      notes: 'Data is provided in a structured, commonly used format'
    };

    await this.updateDataSubject(userAddress, { dataRequests: dataSubject.dataRequests });
  }

  // Data Anonymization and Pseudonymization
  async anonymizeData(data: any, fields: string[]): Promise<any> {
    const anonymized = { ...data };

    for (const field of fields) {
      if (anonymized[field]) {
        anonymized[field] = this.anonymizeField(anonymized[field], field);
      }
    }

    return anonymized;
  }

  async pseudonymizeData(data: any, fields: string[], key: string): Promise<any> {
    const pseudonymized = { ...data };

    for (const field of fields) {
      if (pseudonymized[field]) {
        pseudonymized[field] = await this.pseudonymizeField(pseudonymized[field], key);
      }
    }

    return pseudonymized;
  }

  // Data Breach Management
  async reportDataBreach(
    type: BreachType,
    severity: BreachSeverity,
    affectedDataTypes: DataCategoryType[],
    affectedUsers: number,
    description: string,
    cause: string
  ): Promise<DataBreachIncident> {
    const incident: DataBreachIncident = {
      id: this.generateId('breach'),
      detectedAt: Date.now(),
      type,
      severity,
      affectedDataTypes,
      affectedUsers,
      description,
      cause,
      containmentActions: [],
      notificationRequired: this.requiresNotification(severity, affectedUsers),
      regulatoryReported: false,
      status: 'detected',
      impact: {
        confidentiality: true,
        integrity: false,
        availability: false,
        reputationalDamage: severity === 'high' || severity === 'critical',
        regulatoryConsequences: this.requiresRegulatoryReporting(severity, affectedUsers)
      }
    };

    this.breachIncidents.push(incident);

    // Auto-trigger notifications if required
    if (incident.notificationRequired) {
      await this.triggerBreachNotifications(incident);
    }

    return incident;
  }

  // Privacy Impact Assessment
  async conductPrivacyImpactAssessment(
    projectName: string,
    description: string,
    dataTypes: DataCategoryType[],
    processingPurposes: ConsentPurpose[],
    assessedBy: string
  ): Promise<PrivacyImpactAssessment> {
    const risks = await this.identifyPrivacyRisks(dataTypes, processingPurposes);
    const mitigations = await this.generateMitigations(risks);
    const riskLevel = this.calculateOverallRiskLevel(risks);

    const assessment: PrivacyImpactAssessment = {
      id: this.generateId('pia'),
      projectName,
      description,
      dataTypes,
      processingPurposes,
      riskLevel,
      risks,
      mitigations,
      assessedBy,
      assessedAt: Date.now(),
      reviewDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      approved: riskLevel !== 'high'
    };

    this.privacyAssessments.push(assessment);
    return assessment;
  }

  // Data Encryption and Security
  async encryptSensitiveData(data: any, fields: string[]): Promise<any> {
    const encrypted = { ...data };

    for (const field of fields) {
      if (encrypted[field]) {
        encrypted[field] = await this.encryptField(encrypted[field]);
      }
    }

    return encrypted;
  }

  async decryptSensitiveData(data: any, fields: string[]): Promise<any> {
    const decrypted = { ...data };

    for (const field of fields) {
      if (decrypted[field]) {
        decrypted[field] = await this.decryptField(decrypted[field]);
      }
    }

    return decrypted;
  }

  // Compliance Reporting
  async generateGDPRReport(startDate: number, endDate: number): Promise<{
    dataSubjects: number;
    consentRecords: number;
    dataRequests: number;
    breachIncidents: number;
    privacyAssessments: number;
    complianceScore: number;
  }> {
    const subjects = Array.from(this.dataSubjects.values());
    const subjectsInPeriod = subjects.filter(s =>
      s.createdAt >= startDate && s.createdAt <= endDate
    );

    const allRequests = subjects.flatMap(s => s.dataRequests);
    const requestsInPeriod = allRequests.filter(r =>
      r.requestedAt >= startDate && r.requestedAt <= endDate
    );

    const breachesInPeriod = this.breachIncidents.filter(b =>
      b.detectedAt >= startDate && b.detectedAt <= endDate
    );

    const assessmentsInPeriod = this.privacyAssessments.filter(a =>
      a.assessedAt >= startDate && a.assessedAt <= endDate
    );

    const complianceScore = this.calculateComplianceScore();

    return {
      dataSubjects: subjectsInPeriod.length,
      consentRecords: subjectsInPeriod.reduce((sum, s) => sum + s.consentRecords.length, 0),
      dataRequests: requestsInPeriod.length,
      breachIncidents: breachesInPeriod.length,
      privacyAssessments: assessmentsInPeriod.length,
      complianceScore
    };
  }

  // Private helper methods
  private getDefaultConsents(): ConsentRecord[] {
    return [
      {
        id: this.generateId('consent'),
        purpose: 'transaction_processing',
        granted: true,
        grantedAt: Date.now(),
        version: '1.0',
        lawfulBasis: 'contract',
        source: 'implicit'
      },
      {
        id: this.generateId('consent'),
        purpose: 'fraud_prevention',
        granted: true,
        grantedAt: Date.now(),
        version: '1.0',
        lawfulBasis: 'legitimate_interests',
        source: 'implicit'
      }
    ];
  }

  private getDefaultDataCategories(): DataCategory[] {
    return [
      {
        category: 'identity',
        description: 'Basic identity information',
        retention: {
          period: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
          reason: 'Legal compliance requirements',
          autoDelete: true,
          legalBasis: 'Legal obligation'
        },
        sensitivity: 'confidential',
        sources: ['user_input', 'kyc_verification'],
        processors: ['aptofi_platform'],
        transfers: []
      },
      {
        category: 'financial',
        description: 'Financial transaction data',
        retention: {
          period: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
          reason: 'Financial regulations compliance',
          autoDelete: true,
          legalBasis: 'Legal obligation'
        },
        sensitivity: 'restricted',
        sources: ['blockchain', 'user_transactions'],
        processors: ['aptofi_platform', 'blockchain_network'],
        transfers: []
      }
    ];
  }

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      dataMinimization: true,
      anonymization: false,
      pseudonymization: true,
      encryption: true,
      accessLogging: true,
      shareWithPartners: false,
      marketingCommunications: false,
      analyticsTracking: false,
      cookiePreferences: {
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
        preferences: true
      },
      communicationPreferences: {
        email: true,
        sms: false,
        push: true,
        inApp: true,
        frequency: 'immediate'
      }
    };
  }

  private requiresVerification(type: DataRequestType): boolean {
    return ['erasure', 'portability'].includes(type);
  }

  private async compileUserData(userAddress: string): Promise<any> {
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return null;

    // In production, this would compile data from all systems
    return {
      profile: dataSubject,
      transactions: [], // Would fetch from blockchain/database
      documents: [], // Would fetch from document storage
      communications: [], // Would fetch from communication logs
      compiledAt: Date.now()
    };
  }

  private async compilePortableData(userAddress: string): Promise<any> {
    // Similar to compileUserData but only includes portable data
    const userData = await this.compileUserData(userAddress);

    // Remove system-specific fields and include only portable data
    return {
      personalInfo: userData.profile,
      transactionHistory: userData.transactions,
      preferences: userData.profile?.privacySettings
    };
  }

  private async formatDataForPortability(data: any, format: string): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data);
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    return 'CSV format not implemented in demo';
  }

  private convertToXML(data: any): string {
    // Simplified XML conversion
    return '<data>XML format not implemented in demo</data>';
  }

  private async generateSecureDownloadUrl(data: any): Promise<string> {
    // In production, generate a secure, time-limited download URL
    const token = btoa(JSON.stringify({ data, expires: Date.now() + 86400000 }));
    return `https://api.aptofi.com/download/${token}`;
  }

  private async checkErasurePermissibility(userAddress: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // Check if erasure is legally permissible
    const dataSubject = await this.getDataSubject(userAddress);
    if (!dataSubject) return { allowed: false, reason: 'Data subject not found' };

    // Check for legal obligations that prevent erasure
    const hasLegalObligations = dataSubject.consentRecords.some(c =>
      c.lawfulBasis === 'legal_obligation' && c.granted
    );

    if (hasLegalObligations) {
      return {
        allowed: false,
        reason: 'Data retention required for legal compliance'
      };
    }

    return { allowed: true };
  }

  private async performDataErasure(userAddress: string): Promise<void> {
    // In production, this would erase data from all systems
    this.dataSubjects.delete(userAddress);
    console.log(`Data erasure completed for user: ${userAddress}`);
  }

  private anonymizeField(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'email':
        return 'user@example.com';
      case 'name':
        return 'Anonymous User';
      case 'address':
        return 'Redacted Address';
      case 'phone':
        return '+1-XXX-XXX-XXXX';
      default:
        return '[REDACTED]';
    }
  }

  private async pseudonymizeField(value: any, key: string): Promise<string> {
    // Simple pseudonymization using hash
    const encoder = new TextEncoder();
    const data = encoder.encode(value + key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  private async encryptField(value: any): Promise<string> {
    // Simplified encryption (in production, use proper encryption)
    return btoa(JSON.stringify(value));
  }

  private async decryptField(value: string): Promise<any> {
    // Simplified decryption (in production, use proper decryption)
    try {
      return JSON.parse(atob(value));
    } catch {
      return value;
    }
  }

  private requiresNotification(severity: BreachSeverity, affectedUsers: number): boolean {
    return severity === 'high' || severity === 'critical' || affectedUsers > 100;
  }

  private requiresRegulatoryReporting(severity: BreachSeverity, affectedUsers: number): boolean {
    return severity === 'critical' || affectedUsers > 500;
  }

  private async triggerBreachNotifications(incident: DataBreachIncident): Promise<void> {
    // In production, send notifications to affected users and authorities
    console.log('Breach notifications triggered for incident:', incident.id);
  }

  private async identifyPrivacyRisks(
    dataTypes: DataCategoryType[],
    purposes: ConsentPurpose[]
  ): Promise<PrivacyRisk[]> {
    const risks: PrivacyRisk[] = [];

    // Example risk identification logic
    if (dataTypes.includes('biometric')) {
      risks.push({
        id: this.generateId('risk'),
        description: 'Processing of biometric data poses high privacy risks',
        likelihood: 'medium',
        impact: 'high',
        riskLevel: 'high',
        affectedRights: ['access', 'erasure', 'restrict_processing']
      });
    }

    if (purposes.includes('marketing')) {
      risks.push({
        id: this.generateId('risk'),
        description: 'Marketing processing may affect user privacy expectations',
        likelihood: 'high',
        impact: 'medium',
        riskLevel: 'medium',
        affectedRights: ['object', 'restrict_processing']
      });
    }

    return risks;
  }

  private async generateMitigations(risks: PrivacyRisk[]): Promise<PrivacyMitigation[]> {
    return risks.map(risk => ({
      id: this.generateId('mitigation'),
      riskId: risk.id,
      description: `Mitigation for ${risk.description}`,
      implementation: 'Technical and organizational measures',
      effectiveness: 'high',
      responsible: 'Data Protection Officer',
      deadline: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      status: 'planned'
    }));
  }

  private calculateOverallRiskLevel(risks: PrivacyRisk[]): 'low' | 'medium' | 'high' {
    if (risks.some(r => r.riskLevel === 'critical' || r.riskLevel === 'high')) return 'high';
    if (risks.some(r => r.riskLevel === 'medium')) return 'medium';
    return 'low';
  }

  private calculateComplianceScore(): number {
    // Simplified compliance score calculation
    let score = 100;

    // Deduct points for unresolved breaches
    const unresolvedBreaches = this.breachIncidents.filter(b => b.status !== 'resolved');
    score -= unresolvedBreaches.length * 10;

    // Deduct points for overdue data requests
    const allRequests = Array.from(this.dataSubjects.values()).flatMap(s => s.dataRequests);
    const overdueRequests = allRequests.filter(r =>
      r.status === 'pending' && Date.now() - r.requestedAt > (30 * 24 * 60 * 60 * 1000)
    );
    score -= overdueRequests.length * 5;

    return Math.max(0, score);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2)}`;
  }
}

export const dataProtectionService = DataProtectionService.getInstance();