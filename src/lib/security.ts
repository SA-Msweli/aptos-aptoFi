"use client";

// Enhanced Security and Fraud Detection System
// Implements device fingerprinting, behavioral analysis, and fraud detection

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  canvas: string;
  webgl: string;
  fonts: string[];
  plugins: string[];
  touchSupport: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  createdAt: number;
}

export interface BehavioralMetrics {
  sessionDuration: number;
  clickPatterns: {
    averageInterval: number;
    variance: number;
    totalClicks: number;
  };
  typingPatterns: {
    averageSpeed: number;
    pausePatterns: number[];
    totalKeystrokes: number;
  };
  mouseMovements: {
    averageSpeed: number;
    totalDistance: number;
    patterns: string[];
  };
  navigationPatterns: {
    pagesVisited: string[];
    timePerPage: Record<string, number>;
    backButtonUsage: number;
  };
  transactionPatterns: {
    averageAmount: number;
    frequentRecipients: string[];
    timeOfDayPreferences: number[];
    dayOfWeekPreferences: number[];
  };
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'transaction' | 'profile_change' | 'suspicious_activity' | 'device_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  userAddress: string;
  deviceFingerprint: string;
  ipAddress?: string;
  location?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
  details: Record<string, any>;
  riskScore: number;
  resolved: boolean;
  actions: SecurityAction[];
}

export interface SecurityAction {
  type: 'alert' | 'freeze_account' | 'require_2fa' | 'block_transaction' | 'log_event';
  timestamp: number;
  automated: boolean;
  details: string;
}

export interface FraudRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  recommendedActions: SecurityAction[];
  confidence: number; // 0-1
}

export interface RiskFactor {
  type: 'device_mismatch' | 'location_anomaly' | 'velocity_anomaly' | 'behavioral_anomaly' | 'transaction_pattern' | 'time_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
  evidence: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  type: 'fraud_detected' | 'device_change' | 'location_change' | 'suspicious_transaction' | 'account_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  userAddress: string;
  acknowledged: boolean;
  actions: {
    label: string;
    action: () => void;
    type: 'primary' | 'secondary' | 'danger';
  }[];
}

class DeviceFingerprintingService {
  private static instance: DeviceFingerprintingService;
  private fingerprint: DeviceFingerprint | null = null;

  static getInstance(): DeviceFingerprintingService {
    if (!DeviceFingerprintingService.instance) {
      DeviceFingerprintingService.instance = new DeviceFingerprintingService();
    }
    return DeviceFingerprintingService.instance;
  }

  async generateFingerprint(): Promise<DeviceFingerprint> {
    if (typeof window === 'undefined') {
      throw new Error('Device fingerprinting only available in browser');
    }

    const canvas = this.getCanvasFingerprint();
    const webgl = this.getWebGLFingerprint();
    const fonts = await this.getAvailableFonts();
    const plugins = this.getPlugins();

    const fingerprint: DeviceFingerprint = {
      id: this.generateFingerprintId(),
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      canvas,
      webgl,
      fonts,
      plugins,
      touchSupport: 'ontouchstart' in window,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
      connection: this.getConnectionInfo(),
      createdAt: Date.now(),
    };

    this.fingerprint = fingerprint;
    this.storeFingerprint(fingerprint);
    return fingerprint;
  }

  private generateFingerprintId(): string {
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      navigator.language,
      navigator.platform,
      new Date().getTimezoneOffset(),
    ];

    const combined = components.join('|');
    return this.simpleHash(combined);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('AptoFi Security Canvas Test 🔒', 2, 2);

      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillRect(100, 5, 80, 20);

      return canvas.toDataURL();
    } catch (e) {
      return '';
    }
  }

  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return '';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return '';

      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      return `${vendor}~${renderer}`;
    } catch (e) {
      return '';
    }
  }

  private async getAvailableFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode',
      'Tahoma', 'Lucida Console', 'Monaco', 'Courier', 'Bradley Hand',
      'Brush Script MT', 'Luminari', 'Chalkduster'
    ];

    const availableFonts: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const baseFonts = ['monospace', 'sans-serif', 'serif'];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    // Get baseline measurements
    const baseWidths: Record<string, number> = {};
    for (const baseFont of baseFonts) {
      context.font = `${testSize} ${baseFont}`;
      baseWidths[baseFont] = context.measureText(testString).width;
    }

    // Test each font
    for (const font of testFonts) {
      let detected = false;
      for (const baseFont of baseFonts) {
        context.font = `${testSize} ${font}, ${baseFont}`;
        const width = context.measureText(testString).width;
        if (width !== baseWidths[baseFont]) {
          detected = true;
          break;
        }
      }
      if (detected) {
        availableFonts.push(font);
      }
    }

    return availableFonts;
  }

  private getPlugins(): string[] {
    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return undefined;

    return {
      effectiveType: connection.effectiveType || '',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
    };
  }

  private storeFingerprint(fingerprint: DeviceFingerprint): void {
    try {
      localStorage.setItem('aptofi_device_fingerprint', JSON.stringify(fingerprint));
    } catch (e) {
      console.warn('Could not store device fingerprint:', e);
    }
  }

  getStoredFingerprint(): DeviceFingerprint | null {
    try {
      const stored = localStorage.getItem('aptofi_device_fingerprint');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let score = 0;
    let totalChecks = 0;

    // Screen comparison
    if (fp1.screen.width === fp2.screen.width && fp1.screen.height === fp2.screen.height) score += 20;
    if (fp1.screen.colorDepth === fp2.screen.colorDepth) score += 10;
    if (Math.abs(fp1.screen.pixelRatio - fp2.screen.pixelRatio) < 0.1) score += 10;
    totalChecks += 40;

    // Basic info comparison
    if (fp1.userAgent === fp2.userAgent) score += 15;
    if (fp1.timezone === fp2.timezone) score += 10;
    if (fp1.language === fp2.language) score += 10;
    if (fp1.platform === fp2.platform) score += 10;
    totalChecks += 45;

    // Canvas comparison
    if (fp1.canvas === fp2.canvas) score += 10;
    totalChecks += 10;

    // WebGL comparison
    if (fp1.webgl === fp2.webgl) score += 5;
    totalChecks += 5;

    return (score / totalChecks) * 100;
  }
}

class BehavioralAnalysisService {
  private static instance: BehavioralAnalysisService;
  private metrics: BehavioralMetrics | null = null;
  private sessionStart: number = Date.now();
  private clickTimes: number[] = [];
  private keyTimes: number[] = [];
  private mousePositions: Array<{ x: number, y: number, timestamp: number }> = [];

  static getInstance(): BehavioralAnalysisService {
    if (!BehavioralAnalysisService.instance) {
      BehavioralAnalysisService.instance = new BehavioralAnalysisService();
    }
    return BehavioralAnalysisService.instance;
  }

  startTracking(): void {
    if (typeof window === 'undefined') return;

    this.sessionStart = Date.now();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Click tracking
    document.addEventListener('click', (e) => {
      this.clickTimes.push(Date.now());
      // Keep only last 100 clicks
      if (this.clickTimes.length > 100) {
        this.clickTimes = this.clickTimes.slice(-100);
      }
    });

    // Keystroke tracking
    document.addEventListener('keydown', (e) => {
      this.keyTimes.push(Date.now());
      // Keep only last 200 keystrokes
      if (this.keyTimes.length > 200) {
        this.keyTimes = this.keyTimes.slice(-200);
      }
    });

    // Mouse movement tracking (sampled)
    let lastMouseSample = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseSample > 100) { // Sample every 100ms
        this.mousePositions.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: now
        });
        lastMouseSample = now;

        // Keep only last 500 positions
        if (this.mousePositions.length > 500) {
          this.mousePositions = this.mousePositions.slice(-500);
        }
      }
    });
  }

  generateMetrics(): BehavioralMetrics {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;

    // Click pattern analysis
    const clickIntervals = this.clickTimes.slice(1).map((time, i) => time - this.clickTimes[i]);
    const avgClickInterval = clickIntervals.length > 0 ?
      clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length : 0;
    const clickVariance = this.calculateVariance(clickIntervals);

    // Typing pattern analysis
    const keyIntervals = this.keyTimes.slice(1).map((time, i) => time - this.keyTimes[i]);
    const avgTypingSpeed = keyIntervals.length > 0 ?
      1000 / (keyIntervals.reduce((a, b) => a + b, 0) / keyIntervals.length) : 0;
    const pausePatterns = keyIntervals.filter(interval => interval > 1000); // Pauses > 1s

    // Mouse movement analysis
    let totalDistance = 0;
    let totalSpeed = 0;
    const speeds: number[] = [];

    for (let i = 1; i < this.mousePositions.length; i++) {
      const prev = this.mousePositions[i - 1];
      const curr = this.mousePositions[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDiff = curr.timestamp - prev.timestamp;
      const speed = timeDiff > 0 ? distance / timeDiff : 0;

      totalDistance += distance;
      speeds.push(speed);
    }

    const avgMouseSpeed = speeds.length > 0 ?
      speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    this.metrics = {
      sessionDuration,
      clickPatterns: {
        averageInterval: avgClickInterval,
        variance: clickVariance,
        totalClicks: this.clickTimes.length,
      },
      typingPatterns: {
        averageSpeed: avgTypingSpeed,
        pausePatterns,
        totalKeystrokes: this.keyTimes.length,
      },
      mouseMovements: {
        averageSpeed: avgMouseSpeed,
        totalDistance,
        patterns: this.analyzeMousePatterns(),
      },
      navigationPatterns: {
        pagesVisited: this.getVisitedPages(),
        timePerPage: this.getTimePerPage(),
        backButtonUsage: this.getBackButtonUsage(),
      },
      transactionPatterns: {
        averageAmount: 0, // Would be populated from transaction history
        frequentRecipients: [],
        timeOfDayPreferences: [],
        dayOfWeekPreferences: [],
      },
    };

    return this.metrics;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private analyzeMousePatterns(): string[] {
    // Simplified pattern analysis
    const patterns: string[] = [];

    if (this.mousePositions.length < 10) return patterns;

    // Check for straight lines
    let straightLineCount = 0;
    for (let i = 2; i < this.mousePositions.length; i++) {
      const p1 = this.mousePositions[i - 2];
      const p2 = this.mousePositions[i - 1];
      const p3 = this.mousePositions[i];

      // Calculate if points are roughly in a straight line
      const slope1 = (p2.y - p1.y) / (p2.x - p1.x);
      const slope2 = (p3.y - p2.y) / (p3.x - p2.x);

      if (Math.abs(slope1 - slope2) < 0.1) {
        straightLineCount++;
      }
    }

    if (straightLineCount > this.mousePositions.length * 0.3) {
      patterns.push('frequent_straight_lines');
    }

    // Check for circular movements
    // Simplified: look for direction changes
    let directionChanges = 0;
    for (let i = 2; i < this.mousePositions.length; i++) {
      const p1 = this.mousePositions[i - 2];
      const p2 = this.mousePositions[i - 1];
      const p3 = this.mousePositions[i];

      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

      if (Math.abs(angle1 - angle2) > Math.PI / 4) {
        directionChanges++;
      }
    }

    if (directionChanges > this.mousePositions.length * 0.5) {
      patterns.push('erratic_movement');
    }

    return patterns;
  }

  private getVisitedPages(): string[] {
    // In a real implementation, this would track page navigation
    return [window.location.pathname];
  }

  private getTimePerPage(): Record<string, number> {
    // In a real implementation, this would track time spent on each page
    return {
      [window.location.pathname]: Date.now() - this.sessionStart
    };
  }

  private getBackButtonUsage(): number {
    // In a real implementation, this would track back button usage
    return 0;
  }

  compareWithBaseline(current: BehavioralMetrics, baseline: BehavioralMetrics): number {
    let anomalyScore = 0;
    let totalChecks = 0;

    // Click pattern comparison
    const clickIntervalDiff = Math.abs(current.clickPatterns.averageInterval - baseline.clickPatterns.averageInterval);
    const clickIntervalThreshold = baseline.clickPatterns.averageInterval * 0.5;
    if (clickIntervalDiff > clickIntervalThreshold) anomalyScore += 20;
    totalChecks += 20;

    // Typing pattern comparison
    const typingSpeedDiff = Math.abs(current.typingPatterns.averageSpeed - baseline.typingPatterns.averageSpeed);
    const typingSpeedThreshold = baseline.typingPatterns.averageSpeed * 0.3;
    if (typingSpeedDiff > typingSpeedThreshold) anomalyScore += 25;
    totalChecks += 25;

    // Mouse movement comparison
    const mouseSpeedDiff = Math.abs(current.mouseMovements.averageSpeed - baseline.mouseMovements.averageSpeed);
    const mouseSpeedThreshold = baseline.mouseMovements.averageSpeed * 0.4;
    if (mouseSpeedDiff > mouseSpeedThreshold) anomalyScore += 15;
    totalChecks += 15;

    // Pattern comparison
    const currentPatterns = new Set(current.mouseMovements.patterns);
    const baselinePatterns = new Set(baseline.mouseMovements.patterns);
    const patternOverlap = [...currentPatterns].filter(p => baselinePatterns.has(p)).length;
    const totalPatterns = Math.max(currentPatterns.size, baselinePatterns.size);
    if (totalPatterns > 0 && patternOverlap / totalPatterns < 0.5) anomalyScore += 10;
    totalChecks += 10;

    return totalChecks > 0 ? (anomalyScore / totalChecks) * 100 : 0;
  }
}

export class SecurityService {
  private static instance: SecurityService;
  private deviceService: DeviceFingerprintingService;
  private behavioralService: BehavioralAnalysisService;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  constructor() {
    this.deviceService = DeviceFingerprintingService.getInstance();
    this.behavioralService = BehavioralAnalysisService.getInstance();
    this.initializeTracking();
  }

  private initializeTracking(): void {
    if (typeof window !== 'undefined') {
      this.behavioralService.startTracking();
    }
  }

  async analyzeTransactionRisk(
    userAddress: string,
    amount: number,
    recipient: string,
    transactionType: string
  ): Promise<FraudRisk> {
    const riskFactors: RiskFactor[] = [];
    let totalScore = 0;

    // Device fingerprint analysis
    const currentFingerprint = await this.deviceService.generateFingerprint();
    const storedFingerprint = this.deviceService.getStoredFingerprint();

    if (storedFingerprint) {
      const similarity = this.deviceService.compareFingerprints(currentFingerprint, storedFingerprint);
      if (similarity < 70) {
        const factor: RiskFactor = {
          type: 'device_mismatch',
          severity: similarity < 30 ? 'critical' : similarity < 50 ? 'high' : 'medium',
          description: `Device fingerprint similarity: ${similarity.toFixed(1)}%`,
          score: Math.max(0, 100 - similarity),
          evidence: {
            currentDevice: currentFingerprint.id,
            storedDevice: storedFingerprint.id,
            similarity
          }
        };
        riskFactors.push(factor);
        totalScore += factor.score * 0.3;
      }
    }

    // Behavioral analysis
    const currentBehavior = this.behavioralService.generateMetrics();
    const storedBehavior = this.getStoredBehavioralBaseline(userAddress);

    if (storedBehavior) {
      const behavioralAnomaly = this.behavioralService.compareWithBaseline(currentBehavior, storedBehavior);
      if (behavioralAnomaly > 30) {
        const factor: RiskFactor = {
          type: 'behavioral_anomaly',
          severity: behavioralAnomaly > 70 ? 'critical' : behavioralAnomaly > 50 ? 'high' : 'medium',
          description: `Behavioral pattern anomaly: ${behavioralAnomaly.toFixed(1)}%`,
          score: behavioralAnomaly,
          evidence: {
            currentBehavior,
            baselineBehavior: storedBehavior,
            anomalyScore: behavioralAnomaly
          }
        };
        riskFactors.push(factor);
        totalScore += behavioralAnomaly * 0.25;
      }
    }

    // Transaction pattern analysis
    const transactionRisk = await this.analyzeTransactionPatterns(userAddress, amount, recipient, transactionType);
    if (transactionRisk.score > 20) {
      riskFactors.push(transactionRisk);
      totalScore += transactionRisk.score * 0.2;
    }

    // Time-based analysis
    const timeRisk = this.analyzeTransactionTiming(userAddress);
    if (timeRisk.score > 15) {
      riskFactors.push(timeRisk);
      totalScore += timeRisk.score * 0.15;
    }

    // Velocity analysis
    const velocityRisk = await this.analyzeTransactionVelocity(userAddress, amount);
    if (velocityRisk.score > 25) {
      riskFactors.push(velocityRisk);
      totalScore += velocityRisk.score * 0.1;
    }

    // Calculate final risk level and score
    const finalScore = Math.min(100, totalScore);
    const riskLevel = this.calculateRiskLevel(finalScore);
    const recommendedActions = this.generateRecommendedActions(riskLevel, riskFactors);
    const confidence = this.calculateConfidence(riskFactors);

    return {
      level: riskLevel,
      score: finalScore,
      factors: riskFactors,
      recommendedActions,
      confidence
    };
  }

  private async analyzeTransactionPatterns(
    userAddress: string,
    amount: number,
    recipient: string,
    transactionType: string
  ): Promise<RiskFactor> {
    // Mock transaction history analysis
    const userHistory = await this.getUserTransactionHistory(userAddress);

    let score = 0;
    const evidence: Record<string, any> = {};

    // Amount analysis
    if (userHistory.averageAmount > 0) {
      const amountRatio = amount / userHistory.averageAmount;
      if (amountRatio > 10) {
        score += 30;
        evidence.unusualAmount = { ratio: amountRatio, threshold: 10 };
      } else if (amountRatio > 5) {
        score += 15;
        evidence.highAmount = { ratio: amountRatio, threshold: 5 };
      }
    }

    // Recipient analysis
    if (!userHistory.frequentRecipients.includes(recipient)) {
      score += 20;
      evidence.newRecipient = true;
    }

    // Transaction type analysis
    const typeFrequency = userHistory.transactionTypes[transactionType] || 0;
    if (typeFrequency < 0.1) { // Less than 10% of transactions
      score += 15;
      evidence.unusualTransactionType = { frequency: typeFrequency };
    }

    return {
      type: 'transaction_pattern',
      severity: score > 50 ? 'high' : score > 30 ? 'medium' : 'low',
      description: `Transaction pattern analysis score: ${score}`,
      score,
      evidence
    };
  }

  private analyzeTransactionTiming(userAddress: string): RiskFactor {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    let score = 0;
    const evidence: Record<string, any> = {};

    // Unusual hours (late night/early morning)
    if (hour < 6 || hour > 23) {
      score += 25;
      evidence.unusualHour = hour;
    }

    // Weekend transactions (if user typically transacts on weekdays)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 10;
      evidence.weekendTransaction = true;
    }

    return {
      type: 'time_anomaly',
      severity: score > 30 ? 'medium' : 'low',
      description: `Transaction timing analysis score: ${score}`,
      score,
      evidence
    };
  }

  private async analyzeTransactionVelocity(userAddress: string, amount: number): Promise<RiskFactor> {
    const recentTransactions = await this.getRecentTransactions(userAddress, 24 * 60 * 60 * 1000); // Last 24 hours

    let score = 0;
    const evidence: Record<string, any> = {};

    // High frequency
    if (recentTransactions.length > 20) {
      score += 30;
      evidence.highFrequency = recentTransactions.length;
    } else if (recentTransactions.length > 10) {
      score += 15;
      evidence.moderateFrequency = recentTransactions.length;
    }

    // High volume
    const totalVolume = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const averageTransaction = totalVolume / Math.max(1, recentTransactions.length);

    if (amount > averageTransaction * 5) {
      score += 25;
      evidence.highVolumeTransaction = { amount, average: averageTransaction };
    }

    return {
      type: 'velocity_anomaly',
      severity: score > 40 ? 'high' : score > 20 ? 'medium' : 'low',
      description: `Transaction velocity analysis score: ${score}`,
      score,
      evidence
    };
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private generateRecommendedActions(riskLevel: string, factors: RiskFactor[]): SecurityAction[] {
    const actions: SecurityAction[] = [];
    const timestamp = Date.now();

    switch (riskLevel) {
      case 'critical':
        actions.push({
          type: 'freeze_account',
          timestamp,
          automated: true,
          details: 'Account temporarily frozen due to critical risk factors'
        });
        actions.push({
          type: 'require_2fa',
          timestamp,
          automated: true,
          details: 'Additional authentication required'
        });
        break;

      case 'high':
        actions.push({
          type: 'require_2fa',
          timestamp,
          automated: true,
          details: 'Two-factor authentication required for this transaction'
        });
        actions.push({
          type: 'alert',
          timestamp,
          automated: true,
          details: 'High-risk transaction detected - manual review required'
        });
        break;

      case 'medium':
        actions.push({
          type: 'alert',
          timestamp,
          automated: true,
          details: 'Medium-risk transaction - additional monitoring applied'
        });
        break;

      default:
        actions.push({
          type: 'log_event',
          timestamp,
          automated: true,
          details: 'Transaction logged for routine monitoring'
        });
    }

    // Factor-specific actions
    factors.forEach(factor => {
      if (factor.type === 'device_mismatch' && factor.severity === 'critical') {
        actions.push({
          type: 'alert',
          timestamp,
          automated: true,
          details: 'New device detected - verify device ownership'
        });
      }
    });

    return actions;
  }

  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0.5;

    const totalEvidence = factors.reduce((sum, factor) => {
      const evidenceCount = Object.keys(factor.evidence).length;
      return sum + evidenceCount;
    }, 0);

    // More evidence = higher confidence
    return Math.min(1, 0.3 + (totalEvidence * 0.1));
  }

  // Mock data methods (would be replaced with real data sources)
  private async getUserTransactionHistory(userAddress: string) {
    return {
      averageAmount: 1000,
      frequentRecipients: ['0xabc123...', '0xdef456...'],
      transactionTypes: {
        'cross_chain_transfer': 0.6,
        'lending': 0.2,
        'swap': 0.2
      }
    };
  }

  private async getRecentTransactions(userAddress: string, timeWindow: number) {
    return [
      { amount: 500, timestamp: Date.now() - 1000000, type: 'transfer' },
      { amount: 1200, timestamp: Date.now() - 2000000, type: 'swap' }
    ];
  }

  private getStoredBehavioralBaseline(userAddress: string): BehavioralMetrics | null {
    try {
      const stored = localStorage.getItem(`aptofi_behavioral_baseline_${userAddress}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  // Public methods for security event management
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    this.events.push(securityEvent);
    this.processSecurityEvent(securityEvent);
  }

  createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: this.generateEventId(),
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(securityAlert);
    this.notifyUser(securityAlert);
  }

  getSecurityEvents(userAddress: string): SecurityEvent[] {
    return this.events.filter(event => event.userAddress === userAddress);
  }

  getSecurityAlerts(userAddress: string): SecurityAlert[] {
    return this.alerts.filter(alert => alert.userAddress === userAddress && !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private processSecurityEvent(event: SecurityEvent): void {
    // Process high-severity events
    if (event.severity === 'critical' || event.severity === 'high') {
      this.createSecurityAlert({
        type: 'fraud_detected',
        severity: event.severity,
        title: 'Security Alert',
        message: `${event.type} detected with ${event.severity} severity`,
        userAddress: event.userAddress,
        actions: [
          {
            label: 'Review Activity',
            action: () => console.log('Review activity'),
            type: 'primary'
          },
          {
            label: 'Contact Support',
            action: () => console.log('Contact support'),
            type: 'secondary'
          }
        ]
      });
    }
  }

  private notifyUser(alert: SecurityAlert): void {
    // In a real implementation, this would send push notifications, emails, etc.
    console.warn('Security Alert:', alert);
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();