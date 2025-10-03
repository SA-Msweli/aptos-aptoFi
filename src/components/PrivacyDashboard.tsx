"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useDataProtection } from "@/hooks/useDataProtection";
import {
  Shield,
  Eye,
  Download,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  UserCheck,
  Database,
  Cookie
} from "lucide-react";
import type { ConsentPurpose, DataRequestType } from "@/lib/dataProtection";

interface PrivacyDashboardProps {
  className?: string;
}

export function PrivacyDashboard({ className = "" }: PrivacyDashboardProps) {
  const { connected, account } = useWallet();
  const {
    dataSubject,
    loading,
    error,
    consentStatus,
    pendingRequests,
    completedRequests,
    hasEssentialConsents,
    privacyComplianceScore,
    privacySettings,
    cookiePreferences,
    communicationPreferences,
    dataCategories,
    grantConsent,
    revokeConsent,
    updatePrivacySettings,
    requestDataAccess,
    requestDataDeletion,
    requestDataPortability,
    requestDataRectification,
    clearError
  } = useDataProtection();

  const [activeTab, setActiveTab] = useState<'overview' | 'consents' | 'privacy' | 'requests' | 'data'>('overview');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [rectificationDetails, setRectificationDetails] = useState('');
  const [showRectificationForm, setShowRectificationForm] = useState(false);

  if (!connected || !account) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Privacy Dashboard</h3>
          <p className="text-gray-600">Connect your wallet to manage your privacy settings and data</p>
        </div>
      </div>
    );
  }

  const getConsentPurposeLabel = (purpose: ConsentPurpose): string => {
    const labels: Record<ConsentPurpose, string> = {
      transaction_processing: 'Transaction Processing',
      kyc_verification: 'KYC Verification',
      fraud_prevention: 'Fraud Prevention',
      marketing: 'Marketing Communications',
      analytics: 'Analytics & Insights',
      customer_support: 'Customer Support',
      legal_compliance: 'Legal Compliance',
      service_improvement: 'Service Improvement',
      security_monitoring: 'Security Monitoring'
    };
    return labels[purpose] || purpose;
  };

  const getConsentPurposeDescription = (purpose: ConsentPurpose): string => {
    const descriptions: Record<ConsentPurpose, string> = {
      transaction_processing: 'Process your transactions and maintain account records',
      kyc_verification: 'Verify your identity and comply with regulations',
      fraud_prevention: 'Detect and prevent fraudulent activities',
      marketing: 'Send you promotional materials and product updates',
      analytics: 'Analyze usage patterns to improve our services',
      customer_support: 'Provide customer service and technical support',
      legal_compliance: 'Meet legal and regulatory requirements',
      service_improvement: 'Enhance and develop new features',
      security_monitoring: 'Monitor for security threats and breaches'
    };
    return descriptions[purpose] || 'Process your data for this purpose';
  };

  const isEssentialConsent = (purpose: ConsentPurpose): boolean => {
    return ['transaction_processing', 'legal_compliance', 'fraud_prevention'].includes(purpose);
  };

  const getComplianceScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const handleConsentToggle = async (purpose: ConsentPurpose, granted: boolean) => {
    if (granted) {
      await grantConsent(purpose);
    } else {
      if (isEssentialConsent(purpose)) {
        alert('This consent is essential for the service and cannot be revoked.');
        return;
      }
      await revokeConsent(purpose);
    }
  };

  const handleDataDeletion = async () => {
    if (!hasEssentialConsents) {
      alert('Cannot delete data while essential consents are missing.');
      return;
    }

    const result = await requestDataDeletion();
    if (result) {
      setShowDeleteConfirmation(false);
      alert('Data deletion request submitted successfully. You will receive confirmation within 30 days.');
    }
  };

  const handleRectificationRequest = async () => {
    if (!rectificationDetails.trim()) {
      alert('Please provide details about what data needs to be corrected.');
      return;
    }

    const result = await requestDataRectification(rectificationDetails);
    if (result) {
      setShowRectificationForm(false);
      setRectificationDetails('');
      alert('Data rectification request submitted successfully.');
    }
  };

  const PrivacyOverview = () => (
    <div className="space-y-6">
      {/* Privacy Score Card */}
      <div className={`p-6 rounded-lg border ${getComplianceScoreColor(privacyComplianceScore)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-semibold">Privacy Compliance Score</h3>
              <p className="text-sm opacity-75">Your overall privacy and data protection status</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{privacyComplianceScore}</div>
            <div className="text-sm opacity-75">out of 100</div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${privacyComplianceScore}%`,
              backgroundColor: privacyComplianceScore >= 90 ? '#10b981' :
                privacyComplianceScore >= 70 ? '#f59e0b' :
                  privacyComplianceScore >= 50 ? '#f97316' : '#ef4444'
            }}
          ></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Consents</p>
              <p className="text-2xl font-bold text-green-600">
                {Object.values(consentStatus).filter(Boolean).length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-orange-600">{pendingRequests.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Categories</p>
              <p className="text-2xl font-bold text-blue-600">{dataCategories.length}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Requests</p>
              <p className="text-2xl font-bold text-gray-600">{completedRequests.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={requestDataAccess}
            disabled={loading}
            className="p-4 text-left border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-blue-800">Access My Data</p>
            <p className="text-sm text-blue-600">Download all your data</p>
          </button>

          <button
            onClick={requestDataPortability}
            disabled={loading}
            className="p-4 text-left border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-green-800">Export Data</p>
            <p className="text-sm text-green-600">Get portable data format</p>
          </button>

          <button
            onClick={() => setShowRectificationForm(true)}
            disabled={loading}
            className="p-4 text-left border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors disabled:opacity-50"
          >
            <Settings className="w-6 h-6 text-yellow-600 mb-2" />
            <p className="font-medium text-yellow-800">Correct Data</p>
            <p className="text-sm text-yellow-600">Request data correction</p>
          </button>

          <button
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={loading}
            className="p-4 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-6 h-6 text-red-600 mb-2" />
            <p className="font-medium text-red-800">Delete Data</p>
            <p className="text-sm text-red-600">Request data deletion</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      {(pendingRequests.length > 0 || completedRequests.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Privacy Activity</h3>
          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800 capitalize">
                      {request.type.replace('_', ' ')} Request
                    </p>
                    <p className="text-sm text-orange-600">
                      Submitted {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {request.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            ))}

            {completedRequests.slice(0, 2).map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 capitalize">
                      {request.type.replace('_', ' ')} Request
                    </p>
                    <p className="text-sm text-green-600">
                      Completed {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  COMPLETED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const ConsentManagement = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Consent Management</h3>
        <p className="text-gray-600 mb-6">
          Manage your consent for different data processing purposes. Essential consents cannot be revoked.
        </p>

        <div className="space-y-4">
          {(Object.keys(consentStatus) as ConsentPurpose[]).map(purpose => (
            <div key={purpose} className={`p-4 border rounded-lg ${isEssentialConsent(purpose) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {getConsentPurposeLabel(purpose)}
                    </h4>
                    {isEssentialConsent(purpose) && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Essential
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {getConsentPurposeDescription(purpose)}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Lawful Basis: Contract</span>
                    <span>Last Updated: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentStatus[purpose]}
                      onChange={(e) => handleConsentToggle(purpose, e.target.checked)}
                      disabled={isEssentialConsent(purpose) || loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                  </label>
                  <div className="text-sm">
                    {consentStatus[purpose] ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Granted
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <XCircle className="w-4 h-4 mr-1" />
                        Revoked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PrivacySettings = () => (
    <div className="space-y-6">
      {/* General Privacy Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">General Privacy Settings</h3>
        <div className="space-y-4">
          {[
            { key: 'dataMinimization', label: 'Data Minimization', description: 'Only collect necessary data' },
            { key: 'anonymization', label: 'Data Anonymization', description: 'Remove identifying information when possible' },
            { key: 'pseudonymization', label: 'Data Pseudonymization', description: 'Replace identifying data with pseudonyms' },
            { key: 'encryption', label: 'Data Encryption', description: 'Encrypt sensitive data at rest and in transit' },
            { key: 'accessLogging', label: 'Access Logging', description: 'Log all access to your personal data' },
            { key: 'shareWithPartners', label: 'Share with Partners', description: 'Allow sharing data with trusted partners' },
            { key: 'marketingCommunications', label: 'Marketing Communications', description: 'Receive marketing emails and notifications' },
            { key: 'analyticsTracking', label: 'Analytics Tracking', description: 'Allow usage analytics and tracking' }
          ].map(setting => (
            <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacySettings?.[setting.key as keyof typeof privacySettings] || false}
                  onChange={async (e) => {
                    await updatePrivacySettings({
                      [setting.key]: e.target.checked
                    });
                  }}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Cookie Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Cookie Preferences</h3>
        <div className="space-y-4">
          {[
            { key: 'necessary', label: 'Necessary Cookies', description: 'Required for basic site functionality', disabled: true },
            { key: 'functional', label: 'Functional Cookies', description: 'Enable enhanced features and personalization' },
            { key: 'analytics', label: 'Analytics Cookies', description: 'Help us understand how you use our site' },
            { key: 'marketing', label: 'Marketing Cookies', description: 'Used to deliver relevant advertisements' },
            { key: 'preferences', label: 'Preference Cookies', description: 'Remember your settings and preferences' }
          ].map(cookie => (
            <div key={cookie.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Cookie className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{cookie.label}</h4>
                  <p className="text-sm text-gray-600">{cookie.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cookiePreferences?.[cookie.key as keyof typeof cookiePreferences] || false}
                  onChange={async (e) => {
                    if (!cookie.disabled) {
                      await updatePrivacySettings({
                        cookiePreferences: {
                          ...cookiePreferences,
                          [cookie.key]: e.target.checked
                        }
                      });
                    }
                  }}
                  disabled={cookie.disabled || loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Communication Preferences</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'email', label: 'Email Notifications', icon: '📧' },
              { key: 'sms', label: 'SMS Notifications', icon: '📱' },
              { key: 'push', label: 'Push Notifications', icon: '🔔' },
              { key: 'inApp', label: 'In-App Notifications', icon: '💬' }
            ].map(comm => (
              <div key={comm.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{comm.icon}</span>
                  <span className="font-medium text-gray-900">{comm.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={communicationPreferences?.[comm.key as keyof typeof communicationPreferences] || false}
                    onChange={async (e) => {
                      await updatePrivacySettings({
                        communicationPreferences: {
                          ...communicationPreferences,
                          [comm.key]: e.target.checked
                        }
                      });
                    }}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Frequency
            </label>
            <select
              value={communicationPreferences?.frequency || 'immediate'}
              onChange={async (e) => {
                await updatePrivacySettings({
                  communicationPreferences: {
                    ...communicationPreferences,
                    frequency: e.target.value as any
                  }
                });
              }}
              disabled={loading}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Privacy Dashboard</h2>
              <p className="text-gray-600">Manage your privacy settings and data protection preferences</p>
            </div>
          </div>
          {loading && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'consents', label: 'Consents', icon: UserCheck },
            { id: 'privacy', label: 'Privacy Settings', icon: Settings },
            { id: 'requests', label: 'Data Requests', icon: FileText },
            { id: 'data', label: 'My Data', icon: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && <PrivacyOverview />}
        {activeTab === 'consents' && <ConsentManagement />}
        {activeTab === 'privacy' && <PrivacySettings />}
        {activeTab === 'requests' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Data Requests</h3>
            <p className="text-gray-600">Detailed data request management coming soon</p>
          </div>
        )}
        {activeTab === 'data' && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">My Data</h3>
            <p className="text-gray-600">Data visualization and management coming soon</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-800">Confirm Data Deletion</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete all your personal data. This action cannot be undone.
              You will lose access to all services that require this data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDataDeletion}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete My Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rectification Form Modal */}
      {showRectificationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Data Correction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What data needs to be corrected?
                </label>
                <textarea
                  value={rectificationDetails}
                  onChange={(e) => setRectificationDetails(e.target.value)}
                  placeholder="Please describe what information is incorrect and what it should be..."
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRectificationForm(false);
                  setRectificationDetails('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRectificationRequest}
                disabled={!rectificationDetails.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}