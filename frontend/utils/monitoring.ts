/**
 * Monitoring and Error Tracking Utilities
 * 
 * This module provides utilities for monitoring application performance,
 * tracking errors, and collecting analytics data.
 */

interface ErrorInfo {
  message: string;
  stack?: string;
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class MonitoringService {
  private isEnabled: boolean;
  private errorQueue: ErrorInfo[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private analyticsQueue: AnalyticsEvent[] = [];

  constructor() {
    this.isEnabled = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true';
    this.setupErrorHandlers();
    this.setupPerformanceMonitoring();
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    if (!this.isEnabled) return;

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        component: 'Global',
        action: 'Unhandled Error',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        component: 'Global',
        action: 'Unhandled Promise Rejection',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!this.isEnabled) return;

    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          this.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
          this.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
          this.trackPerformance('first_paint', navigation.responseEnd - navigation.fetchStart);
        }
      }, 0);
    });

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.trackPerformance(`resource_load_${resourceEntry.name.split('/').pop()}`, resourceEntry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Track an error
   */
  trackError(error: Partial<ErrorInfo>): void {
    if (!this.isEnabled) {
      console.error('Error tracked:', error);
      return;
    }

    const errorInfo: ErrorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      component: error.component || 'Unknown',
      action: error.action || 'Unknown',
      userId: error.userId,
      timestamp: error.timestamp || new Date().toISOString(),
      url: error.url || window.location.href,
      userAgent: error.userAgent || navigator.userAgent
    };

    this.errorQueue.push(errorInfo);
    console.error('Error tracked:', errorInfo);

    // In production, you would send this to your error tracking service
    this.flushErrors();
  }

  /**
   * Track a performance metric
   */
  trackPerformance(name: string, value: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.performanceQueue.push(metric);
    console.log('Performance metric tracked:', metric);

    // In production, you would send this to your analytics service
    this.flushPerformanceMetrics();
  }

  /**
   * Track an analytics event
   */
  trackEvent(event: string, properties: Record<string, any> = {}, userId?: string): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId
    };

    this.analyticsQueue.push(analyticsEvent);
    console.log('Analytics event tracked:', analyticsEvent);

    // In production, you would send this to your analytics service
    this.flushAnalytics();
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(action: string, component: string, metadata?: Record<string, any>): void {
    this.trackEvent('user_interaction', {
      action,
      component,
      ...metadata
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...metadata
    });
  }

  /**
   * Track transaction events
   */
  trackTransaction(type: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>): void {
    this.trackEvent('transaction', {
      type,
      status,
      ...metadata
    });
  }

  /**
   * Flush errors to external service
   */
  private flushErrors(): void {
    if (this.errorQueue.length === 0) return;

    // In production, implement actual error reporting service integration
    // For now, just log to console
    console.group('Error Queue Flush');
    this.errorQueue.forEach(error => console.error(error));
    console.groupEnd();

    this.errorQueue = [];
  }

  /**
   * Flush performance metrics to external service
   */
  private flushPerformanceMetrics(): void {
    if (this.performanceQueue.length === 0) return;

    // In production, implement actual performance monitoring service integration
    console.group('Performance Metrics Flush');
    this.performanceQueue.forEach(metric => console.log(metric));
    console.groupEnd();

    this.performanceQueue = [];
  }

  /**
   * Flush analytics events to external service
   */
  private flushAnalytics(): void {
    if (this.analyticsQueue.length === 0) return;

    // In production, implement actual analytics service integration
    console.group('Analytics Events Flush');
    this.analyticsQueue.forEach(event => console.log(event));
    console.groupEnd();

    this.analyticsQueue = [];
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    enabled: boolean;
    errorCount: number;
    performanceMetricCount: number;
    analyticsEventCount: number;
  } {
    return {
      enabled: this.isEnabled,
      errorCount: this.errorQueue.length,
      performanceMetricCount: this.performanceQueue.length,
      analyticsEventCount: this.analyticsQueue.length
    };
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Export utility functions
export const trackError = (error: Partial<ErrorInfo>) => monitoring.trackError(error);
export const trackPerformance = (name: string, value: number, metadata?: Record<string, any>) =>
  monitoring.trackPerformance(name, value, metadata);
export const trackEvent = (event: string, properties?: Record<string, any>, userId?: string) =>
  monitoring.trackEvent(event, properties, userId);
export const trackUserInteraction = (action: string, component: string, metadata?: Record<string, any>) =>
  monitoring.trackUserInteraction(action, component, metadata);
export const trackFeatureUsage = (feature: string, action: string, metadata?: Record<string, any>) =>
  monitoring.trackFeatureUsage(feature, action, metadata);
export const trackTransaction = (type: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>) =>
  monitoring.trackTransaction(type, status, metadata);

export default monitoring;