"use client";

// Enhanced KYC Compliance System
// Implements biometric verification, document validation, and advanced compliance screening

export interface BiometricData {
  type: 'fingerprint' | 'face_recognition' | 'voice_print' | 'iris_scan';
  data: string; // Base64 encoded biometric template
  confidence: number; // 0-1 confidence score
  timestamp: number;
  deviceId: string;
  verified: boolean;
}

export interface DocumentValidation {
  documentId: string;
  documentType: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  status: 'pending' | 'processing' | 'verified' | 'rejected' | 'expired';
  validationScore: number; // 0-100
  extractedData: {
    fullName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    address?: string;
  };
  validationChecks: {
    documentAuthenticity: boolean;
    faceMatch: boolean;
    dataConsistency: boolean;
    tamperingDetection: boolean;
    qualityCheck: boolean;
  };
  rejectionReasons?: string[];
  verifiedAt?: number;
  expiresAt?: number;
}

export interface ComplianceScreening {
  screeningId: string;
  userAddress: string;
  screeningType: 'sanctions' | 'pep' | 'adverse_media' | 'watchlist' | 'enhanced_due_diligence';
  status: 'pending' | 'clear' | 'hit' | 'review_required';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  matches: ComplianceMatch[];
  screenedAt: number;
  nextScreeningDue: number;
  manualReviewRequired: boolean;
}

export interface ComplianceMatch {
  matchId: string;
  listName: string;
  matchType: 'exact' | 'fuzzy' | 'phonetic';
  confidence: number;
  matchedFields: string[];
  details: {
    name?: string;
    aliases?: string[];
    dateOfBirth?: string;
    nationality?: string;
    reason?: string;
    listingDate?: string;
    source?: string;
  };
}

export interface KYCRiskAssessment {
  assessmentId: string;
  userAddress: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigatingFactors: MitigatingFactor[];
  recommendedActions: string[];
  assessedAt: number;
  validUntil: number;
  requiresReview: boolean;
}

export interface RiskFactor {
  type: 'geographic' | 'transaction_pattern' | 'document_quality' | 'compliance_history' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
  evidence: Record<string, any>;
}

export interface MitigatingFactor {
  type: 'long_history' | 'verified_documents' | 'low_risk_jurisdiction' | 'institutional_backing';
  description: string;
  scoreReduction: number;
}

export interface RegulatoryReport {
  reportId: string;
  reportType: 'sar' | 'ctr' | 'suspicious_activity' | 'large_transaction' | 'compliance_breach';
  userAddress: string;
  status: 'draft' | 'submitted' | 'acknowledged' | 'under_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  details: {
    transactionIds?: string[];
    suspiciousActivity?: string;
    amountInvolved?: number;
    timeframe?: { start: number; end: number };
    jurisdiction?: string;
    regulatoryBody?: string;
  };
  createdAt: number;
  submittedAt?: number;
  dueDate?: number;
}

class BiometricVerificationService {
  private static instance: BiometricVerificationService;

  static getInstance(): BiometricVerificationService {
    if (!BiometricVerificationService.instance) {
      BiometricVerificationService.instance = new BiometricVerificationService();
    }
    return BiometricVerificationService.instance;
  }

  async checkBiometricSupport(): Promise<{
    fingerprint: boolean;
    faceRecognition: boolean;
    voicePrint: boolean;
  }> {
    const support = {
      fingerprint: false,
      faceRecognition: false,
      voicePrint: false
    };

    // Check for WebAuthn support (fingerprint/face)
    if (window.PublicKeyCredential) {
      support.fingerprint = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      support.faceRecognition = support.fingerprint; // Usually same capability
    }

    // Check for MediaDevices API (voice/camera)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        support.voicePrint = devices.some(device => device.kind === 'audioinput');
      } catch (e) {
        console.warn('Could not enumerate media devices:', e);
      }
    }

    return support;
  }

  async captureFingerprintBiometric(userAddress: string): Promise<BiometricData> {
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication not supported');
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new TextEncoder().encode(`aptofi-biometric-${userAddress}-${Date.now()}`),
          rp: {
            name: "AptoFi",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userAddress),
            name: userAddress,
            displayName: "AptoFi User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Extract biometric template (simplified for demo)
      const response = credential.response as AuthenticatorAttestationResponse;
      const biometricTemplate = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)));

      return {
        type: 'fingerprint',
        data: biometricTemplate,
        confidence: 0.95, // High confidence for platform authenticator
        timestamp: Date.now(),
        deviceId: await this.getDeviceId(),
        verified: true
      };
    } catch (error) {
      console.error('Fingerprint capture failed:', error);
      throw new Error('Biometric capture failed');
    }
  }

  async captureFaceBiometric(userAddress: string): Promise<BiometricData> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Capture frame after 2 seconds
          setTimeout(async () => {
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const imageData = canvas.toDataURL('image/jpeg', 0.8);

              // Stop the stream
              stream.getTracks().forEach(track => track.stop());

              // In production, this would be processed by a face recognition service
              const faceTemplate = this.extractFaceTemplate(imageData);

              resolve({
                type: 'face_recognition',
                data: faceTemplate,
                confidence: 0.85, // Simulated confidence
                timestamp: Date.now(),
                deviceId: await this.getDeviceId(),
                verified: true
              });
            } else {
              reject(new Error('Canvas context not available'));
            }
          }, 2000);
        };

        video.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Video capture failed'));
        };
      });
    } catch (error) {
      console.error('Face capture failed:', error);
      throw new Error('Face biometric capture failed');
    }
  }

  async captureVoiceBiometric(userAddress: string, phrase: string): Promise<BiometricData> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      return new Promise((resolve, reject) => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioData = await this.blobToBase64(audioBlob);

          // Stop the stream
          stream.getTracks().forEach(track => track.stop());

          // In production, this would be processed by a voice recognition service
          const voiceTemplate = this.extractVoiceTemplate(audioData, phrase);

          resolve({
            type: 'voice_print',
            data: voiceTemplate,
            confidence: 0.80, // Simulated confidence
            timestamp: Date.now(),
            deviceId: await this.getDeviceId(),
            verified: true
          });
        };

        mediaRecorder.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Voice recording failed'));
        };

        // Record for 5 seconds
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Voice capture failed:', error);
      throw new Error('Voice biometric capture failed');
    }
  }

  async verifyBiometric(storedBiometric: BiometricData, capturedBiometric: BiometricData): Promise<{
    match: boolean;
    confidence: number;
    details: string;
  }> {
    if (storedBiometric.type !== capturedBiometric.type) {
      return {
        match: false,
        confidence: 0,
        details: 'Biometric type mismatch'
      };
    }

    // Simplified matching algorithm (in production, use proper biometric matching)
    const similarity = this.calculateBiometricSimilarity(storedBiometric.data, capturedBiometric.data);
    const threshold = 0.75; // 75% similarity threshold

    return {
      match: similarity >= threshold,
      confidence: similarity,
      details: `Biometric similarity: ${(similarity * 100).toFixed(1)}%`
    };
  }

  private async getDeviceId(): Promise<string> {
    // Generate a consistent device ID based on device characteristics
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

  private extractFaceTemplate(imageData: string): string {
    // Simplified face template extraction (in production, use proper face recognition)
    return btoa(imageData.substring(0, 1000)); // Truncated for demo
  }

  private extractVoiceTemplate(audioData: string, phrase: string): string {
    // Simplified voice template extraction (in production, use proper voice recognition)
    return btoa(audioData.substring(0, 1000) + phrase);
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private calculateBiometricSimilarity(template1: string, template2: string): number {
    // Simplified similarity calculation (in production, use proper biometric algorithms)
    if (template1 === template2) return 1.0;

    const minLength = Math.min(template1.length, template2.length);
    let matches = 0;

    for (let i = 0; i < minLength; i++) {
      if (template1[i] === template2[i]) matches++;
    }

    return matches / Math.max(template1.length, template2.length);
  }
}

class DocumentValidationService {
  private static instance: DocumentValidationService;

  static getInstance(): DocumentValidationService {
    if (!DocumentValidationService.instance) {
      DocumentValidationService.instance = new DocumentValidationService();
    }
    return DocumentValidationService.instance;
  }

  async validateDocument(file: File, documentType: DocumentValidation['documentType']): Promise<DocumentValidation> {
    const documentId = this.generateDocumentId();

    try {
      // Extract image data
      const imageData = await this.fileToBase64(file);

      // Perform document validation checks
      const validationChecks = await this.performValidationChecks(imageData, documentType);
      const extractedData = await this.extractDocumentData(imageData, documentType);
      const validationScore = this.calculateValidationScore(validationChecks);

      // Determine status based on validation results
      let status: DocumentValidation['status'] = 'verified';
      const rejectionReasons: string[] = [];

      if (validationScore < 60) {
        status = 'rejected';
        rejectionReasons.push('Low validation score');
      }

      if (!validationChecks.documentAuthenticity) {
        status = 'rejected';
        rejectionReasons.push('Document authenticity check failed');
      }

      if (!validationChecks.qualityCheck) {
        status = 'rejected';
        rejectionReasons.push('Document quality insufficient');
      }

      if (validationChecks.tamperingDetection) {
        status = 'rejected';
        rejectionReasons.push('Document tampering detected');
      }

      return {
        documentId,
        documentType,
        status,
        validationScore,
        extractedData,
        validationChecks,
        rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined,
        verifiedAt: status === 'verified' ? Date.now() : undefined,
        expiresAt: status === 'verified' ? Date.now() + (365 * 24 * 60 * 60 * 1000) : undefined // 1 year
      };
    } catch (error) {
      console.error('Document validation failed:', error);
      return {
        documentId,
        documentType,
        status: 'rejected',
        validationScore: 0,
        extractedData: {},
        validationChecks: {
          documentAuthenticity: false,
          faceMatch: false,
          dataConsistency: false,
          tamperingDetection: true,
          qualityCheck: false
        },
        rejectionReasons: ['Validation process failed']
      };
    }
  }

  async performFaceMatch(documentImage: string, selfieImage: string): Promise<{
    match: boolean;
    confidence: number;
    details: string;
  }> {
    // Simplified face matching (in production, use proper face recognition service)
    try {
      const docFaceFeatures = await this.extractFaceFeatures(documentImage);
      const selfieFaceFeatures = await this.extractFaceFeatures(selfieImage);

      const similarity = this.calculateFaceSimilarity(docFaceFeatures, selfieFaceFeatures);
      const threshold = 0.80; // 80% similarity threshold

      return {
        match: similarity >= threshold,
        confidence: similarity,
        details: `Face similarity: ${(similarity * 100).toFixed(1)}%`
      };
    } catch (error) {
      return {
        match: false,
        confidence: 0,
        details: 'Face matching failed'
      };
    }
  }

  private async performValidationChecks(imageData: string, documentType: string): Promise<DocumentValidation['validationChecks']> {
    // Simulate document validation checks
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    return {
      documentAuthenticity: Math.random() > 0.1, // 90% pass rate
      faceMatch: Math.random() > 0.15, // 85% pass rate
      dataConsistency: Math.random() > 0.05, // 95% pass rate
      tamperingDetection: Math.random() < 0.05, // 5% tampering detection rate
      qualityCheck: Math.random() > 0.1 // 90% quality pass rate
    };
  }

  private async extractDocumentData(imageData: string, documentType: string): Promise<DocumentValidation['extractedData']> {
    // Simulate OCR data extraction
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock extracted data based on document type
    switch (documentType) {
      case 'passport':
        return {
          fullName: 'John Doe',
          dateOfBirth: '1990-01-01',
          documentNumber: 'P123456789',
          expiryDate: '2030-01-01',
          issuingAuthority: 'US Department of State'
        };
      case 'drivers_license':
        return {
          fullName: 'John Doe',
          dateOfBirth: '1990-01-01',
          documentNumber: 'DL123456789',
          expiryDate: '2028-01-01',
          issuingAuthority: 'State DMV',
          address: '123 Main St, City, State 12345'
        };
      case 'national_id':
        return {
          fullName: 'John Doe',
          dateOfBirth: '1990-01-01',
          documentNumber: 'ID123456789',
          issuingAuthority: 'National ID Authority'
        };
      default:
        return {};
    }
  }

  private calculateValidationScore(checks: DocumentValidation['validationChecks']): number {
    const weights = {
      documentAuthenticity: 30,
      faceMatch: 25,
      dataConsistency: 20,
      tamperingDetection: 15, // Inverted - tampering reduces score
      qualityCheck: 10
    };

    let score = 0;
    if (checks.documentAuthenticity) score += weights.documentAuthenticity;
    if (checks.faceMatch) score += weights.faceMatch;
    if (checks.dataConsistency) score += weights.dataConsistency;
    if (!checks.tamperingDetection) score += weights.tamperingDetection; // No tampering is good
    if (checks.qualityCheck) score += weights.qualityCheck;

    return score;
  }

  private async extractFaceFeatures(imageData: string): Promise<number[]> {
    // Simplified face feature extraction
    const hash = await this.hashString(imageData);
    return Array.from(hash.substring(0, 32)).map(char => char.charCodeAt(0));
  }

  private calculateFaceSimilarity(features1: number[], features2: number[]): number {
    if (features1.length !== features2.length) return 0;

    let similarity = 0;
    for (let i = 0; i < features1.length; i++) {
      similarity += 1 - Math.abs(features1[i] - features2[i]) / 255;
    }

    return similarity / features1.length;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateDocumentId(): string {
    return 'doc_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

class ComplianceScreeningService {
  private static instance: ComplianceScreeningService;

  static getInstance(): ComplianceScreeningService {
    if (!ComplianceScreeningService.instance) {
      ComplianceScreeningService.instance = new ComplianceScreeningService();
    }
    return ComplianceScreeningService.instance;
  }

  async performComplianceScreening(
    userAddress: string,
    personalData: {
      fullName: string;
      dateOfBirth?: string;
      nationality?: string;
      address?: string;
    }
  ): Promise<ComplianceScreening[]> {
    const screenings: ComplianceScreening[] = [];

    // Perform different types of screening
    const screeningTypes: ComplianceScreening['screeningType'][] = [
      'sanctions',
      'pep',
      'adverse_media',
      'watchlist'
    ];

    for (const screeningType of screeningTypes) {
      const screening = await this.performSingleScreening(userAddress, personalData, screeningType);
      screenings.push(screening);
    }

    return screenings;
  }

  private async performSingleScreening(
    userAddress: string,
    personalData: any,
    screeningType: ComplianceScreening['screeningType']
  ): Promise<ComplianceScreening> {
    const screeningId = this.generateScreeningId();

    // Simulate screening process
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock screening results
    const matches = await this.generateMockMatches(personalData, screeningType);
    const status = matches.length > 0 ? 'hit' : 'clear';
    const riskLevel = this.calculateRiskLevel(matches);
    const manualReviewRequired = matches.some(match => match.confidence > 0.8) || riskLevel === 'high' || riskLevel === 'critical';

    return {
      screeningId,
      userAddress,
      screeningType,
      status,
      riskLevel,
      matches,
      screenedAt: Date.now(),
      nextScreeningDue: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      manualReviewRequired
    };
  }

  private async generateMockMatches(personalData: any, screeningType: string): Promise<ComplianceMatch[]> {
    // Generate mock matches based on screening type
    const matches: ComplianceMatch[] = [];

    // Low probability of matches for demo purposes
    if (Math.random() < 0.05) { // 5% chance of match
      matches.push({
        matchId: this.generateMatchId(),
        listName: this.getListName(screeningType),
        matchType: Math.random() > 0.7 ? 'exact' : 'fuzzy',
        confidence: 0.3 + Math.random() * 0.6, // 30-90% confidence
        matchedFields: ['name'],
        details: {
          name: personalData.fullName,
          reason: this.getMatchReason(screeningType),
          source: 'Mock Compliance Database',
          listingDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    return matches;
  }

  private calculateRiskLevel(matches: ComplianceMatch[]): ComplianceScreening['riskLevel'] {
    if (matches.length === 0) return 'low';

    const maxConfidence = Math.max(...matches.map(m => m.confidence));

    if (maxConfidence >= 0.9) return 'critical';
    if (maxConfidence >= 0.7) return 'high';
    if (maxConfidence >= 0.5) return 'medium';
    return 'low';
  }

  private getListName(screeningType: string): string {
    const listNames = {
      sanctions: 'OFAC Sanctions List',
      pep: 'Politically Exposed Persons List',
      adverse_media: 'Adverse Media Database',
      watchlist: 'Financial Crimes Watchlist'
    };
    return listNames[screeningType as keyof typeof listNames] || 'Compliance Database';
  }

  private getMatchReason(screeningType: string): string {
    const reasons = {
      sanctions: 'Economic sanctions violation',
      pep: 'Politically exposed person',
      adverse_media: 'Negative media coverage',
      watchlist: 'Financial crimes investigation'
    };
    return reasons[screeningType as keyof typeof reasons] || 'Compliance concern';
  }

  private generateScreeningId(): string {
    return 'scr_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateMatchId(): string {
    return 'match_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export class EnhancedKYCService {
  private static instance: EnhancedKYCService;
  private biometricService: BiometricVerificationService;
  private documentService: DocumentValidationService;
  private complianceService: ComplianceScreeningService;

  static getInstance(): EnhancedKYCService {
    if (!EnhancedKYCService.instance) {
      EnhancedKYCService.instance = new EnhancedKYCService();
    }
    return EnhancedKYCService.instance;
  }

  constructor() {
    this.biometricService = BiometricVerificationService.getInstance();
    this.documentService = DocumentValidationService.getInstance();
    this.complianceService = ComplianceScreeningService.getInstance();
  }

  // Biometric methods
  async checkBiometricSupport() {
    return this.biometricService.checkBiometricSupport();
  }

  async captureBiometric(type: BiometricData['type'], userAddress: string, phrase?: string): Promise<BiometricData> {
    switch (type) {
      case 'fingerprint':
        return this.biometricService.captureFingerprintBiometric(userAddress);
      case 'face_recognition':
        return this.biometricService.captureFaceBiometric(userAddress);
      case 'voice_print':
        if (!phrase) throw new Error('Voice phrase required');
        return this.biometricService.captureVoiceBiometric(userAddress, phrase);
      default:
        throw new Error('Unsupported biometric type');
    }
  }

  async verifyBiometric(stored: BiometricData, captured: BiometricData) {
    return this.biometricService.verifyBiometric(stored, captured);
  }

  // Document validation methods
  async validateDocument(file: File, documentType: DocumentValidation['documentType']): Promise<DocumentValidation> {
    return this.documentService.validateDocument(file, documentType);
  }

  async performFaceMatch(documentImage: string, selfieImage: string) {
    return this.documentService.performFaceMatch(documentImage, selfieImage);
  }

  // Compliance screening methods
  async performComplianceScreening(userAddress: string, personalData: any): Promise<ComplianceScreening[]> {
    return this.complianceService.performComplianceScreening(userAddress, personalData);
  }

  // Risk assessment
  async performRiskAssessment(userAddress: string, userData: any): Promise<KYCRiskAssessment> {
    const assessmentId = this.generateAssessmentId();
    const riskFactors: RiskFactor[] = [];
    const mitigatingFactors: MitigatingFactor[] = [];

    // Analyze various risk factors
    const geographicRisk = this.assessGeographicRisk(userData.countryCode);
    if (geographicRisk.score > 0) riskFactors.push(geographicRisk);

    const documentRisk = this.assessDocumentRisk(userData.documents || []);
    if (documentRisk.score > 0) riskFactors.push(documentRisk);

    // Calculate overall risk score
    const totalRiskScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
    const totalMitigation = mitigatingFactors.reduce((sum, factor) => sum + factor.scoreReduction, 0);
    const overallRiskScore = Math.max(0, Math.min(100, totalRiskScore - totalMitigation));

    const riskLevel = this.calculateOverallRiskLevel(overallRiskScore);
    const recommendedActions = this.generateRiskRecommendations(riskLevel, riskFactors);

    return {
      assessmentId,
      userAddress,
      overallRiskScore,
      riskLevel,
      riskFactors,
      mitigatingFactors,
      recommendedActions,
      assessedAt: Date.now(),
      validUntil: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      requiresReview: riskLevel === 'high' || riskLevel === 'critical'
    };
  }

  // Regulatory reporting
  async generateRegulatoryReport(
    type: RegulatoryReport['reportType'],
    userAddress: string,
    details: RegulatoryReport['details']
  ): Promise<RegulatoryReport> {
    const reportId = this.generateReportId();

    return {
      reportId,
      reportType: type,
      userAddress,
      status: 'draft',
      priority: this.calculateReportPriority(type, details),
      details,
      createdAt: Date.now(),
      dueDate: this.calculateReportDueDate(type)
    };
  }

  private assessGeographicRisk(countryCode: string): RiskFactor {
    // High-risk countries (simplified list)
    const highRiskCountries = ['AF', 'IR', 'KP', 'SY'];
    const mediumRiskCountries = ['PK', 'BD', 'MM'];

    let score = 0;
    let severity: RiskFactor['severity'] = 'low';

    if (highRiskCountries.includes(countryCode)) {
      score = 40;
      severity = 'high';
    } else if (mediumRiskCountries.includes(countryCode)) {
      score = 20;
      severity = 'medium';
    }

    return {
      type: 'geographic',
      severity,
      description: `Geographic risk assessment for country: ${countryCode}`,
      score,
      evidence: { countryCode, riskCategory: severity }
    };
  }

  private assessDocumentRisk(documents: DocumentValidation[]): RiskFactor {
    if (documents.length === 0) {
      return {
        type: 'document_quality',
        severity: 'high',
        description: 'No documents provided',
        score: 30,
        evidence: { documentCount: 0 }
      };
    }

    const avgScore = documents.reduce((sum, doc) => sum + doc.validationScore, 0) / documents.length;
    let score = 0;
    let severity: RiskFactor['severity'] = 'low';

    if (avgScore < 60) {
      score = 25;
      severity = 'high';
    } else if (avgScore < 80) {
      score = 10;
      severity = 'medium';
    }

    return {
      type: 'document_quality',
      severity,
      description: `Document quality assessment: ${avgScore.toFixed(1)}% average score`,
      score,
      evidence: { averageScore: avgScore, documentCount: documents.length }
    };
  }

  private calculateOverallRiskLevel(score: number): KYCRiskAssessment['riskLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(riskLevel: string, riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Immediate manual review required');
        recommendations.push('Enhanced due diligence procedures');
        recommendations.push('Senior management approval needed');
        break;
      case 'high':
        recommendations.push('Manual review required');
        recommendations.push('Additional documentation needed');
        recommendations.push('Enhanced monitoring');
        break;
      case 'medium':
        recommendations.push('Periodic review recommended');
        recommendations.push('Standard monitoring procedures');
        break;
      default:
        recommendations.push('Standard processing approved');
    }

    // Add specific recommendations based on risk factors
    riskFactors.forEach(factor => {
      if (factor.type === 'geographic' && factor.severity === 'high') {
        recommendations.push('Enhanced geographic risk monitoring');
      }
      if (factor.type === 'document_quality' && factor.severity === 'high') {
        recommendations.push('Request additional documentation');
      }
    });

    return recommendations;
  }

  private calculateReportPriority(type: RegulatoryReport['reportType'], details: any): RegulatoryReport['priority'] {
    switch (type) {
      case 'sar':
      case 'suspicious_activity':
        return 'high';
      case 'compliance_breach':
        return 'urgent';
      case 'large_transaction':
        return details.amountInvolved > 100000 ? 'high' : 'medium';
      default:
        return 'medium';
    }
  }

  private calculateReportDueDate(type: RegulatoryReport['reportType']): number {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    switch (type) {
      case 'sar':
        return now + (30 * day); // 30 days
      case 'ctr':
        return now + (15 * day); // 15 days
      case 'suspicious_activity':
        return now + (14 * day); // 14 days
      case 'compliance_breach':
        return now + (7 * day); // 7 days
      default:
        return now + (30 * day);
    }
  }

  private generateAssessmentId(): string {
    return 'assess_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateReportId(): string {
    return 'report_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Export singleton instance
export const enhancedKYCService = EnhancedKYCService.getInstance();