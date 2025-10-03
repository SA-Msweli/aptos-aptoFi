"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useSecurity } from "@/hooks/useSecurity";
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Smartphone, Eye, Settings } from "lucide-react";

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard({ className = "" }: SecurityDashboardProps) {
  const { connected, account } = useWallet();
  const {
    securityStatus,
    loading,
    acknowledgeAlert,
    trustCurrentDevice,
    reportSuspiciousActivity,
    getSecurityHistory,
    enableEnhancedSecurity,
    isSecure,
    hasActiveAlerts,
    requiresAttention
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'history' | 'settings'>('overview');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ type: '', description: '' });

  if (!connected || !account) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Security Dashboard</h3>
          <p className="text-gray-600">Connect your wallet to view security status</p>
        </div>
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const handleReportSuspiciousActivity = () => {
    if (reportData.type && reportData.description) {
      reportSuspiciousActivity(reportData.type, reportData.description);
      setReportData({ type: '', description: '' });
      setShowReportForm(false);
    }
  };

  const SecurityOverview = () => (
    <div className="space-y-6">
      {/* Security Status Card */}
      <div className={`p-6 rounded-lg border ${getRiskLevelColor(securityStatus.riskLevel)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getRiskLevelIcon(securityStatus.riskLevel)}
            <div>
              <h3 className="text-lg font-semibold">Security Status</h3>
              <p className="text-sm opacity-75">
                Risk Level: {securityStatus.riskLevel.charAt(0).toUpperCase() + securityStatus.riskLevel.slice(1)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Last Check</p>
            <p className="text-sm font-medium">
              {securityStatus.lastSecurityCheck ?
                new Date(securityStatus.lastSecurityCheck).toLocaleString() :
                'Never'
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${securityStatus.deviceTrusted ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Device</p>
            <p className="text-xs opacity-75">
              {securityStatus.deviceTrusted ? 'Trusted' : 'Unverified'}
            </p>
          </div>

          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${securityStatus.behaviorNormal ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
              <Eye className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Behavior</p>
            <p className="text-xs opacity-75">
              {securityStatus.behaviorNormal ? 'Normal' : 'Anomalous'}
            </p>
          </div>

          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${hasActiveAlerts ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Alerts</p>
            <p className="text-xs opacity-75">
              {securityStatus.activeAlerts.length} Active
            </p>
          </div>

          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${isSecure ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
              <Shield className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Overall</p>
            <p className="text-xs opacity-75">
              {isSecure ? 'Secure' : 'At Risk'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!securityStatus.deviceTrusted && (
            <button
              onClick={trustCurrentDevice}
              className="p-4 text-left border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Trust This Device</p>
                  <p className="text-sm text-blue-600">Mark this device as trusted</p>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() => setShowReportForm(true)}
            className="p-4 text-left border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Report Suspicious Activity</p>
                <p className="text-sm text-orange-600">Report unusual account activity</p>
              </div>
            </div>
          </button>

          <button
            onClick={enableEnhancedSecurity}
            className="p-4 text-left border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Enable Enhanced Security</p>
                <p className="text-sm text-green-600">Additional protection measures</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-800">Security Settings</p>
                <p className="text-sm text-gray-600">Manage security preferences</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Device Information */}
      {securityStatus.deviceFingerprint && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Device Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Device ID</p>
              <p className="text-gray-600 font-mono">{securityStatus.deviceFingerprint.id}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Platform</p>
              <p className="text-gray-600">{securityStatus.deviceFingerprint.platform}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Screen Resolution</p>
              <p className="text-gray-600">
                {securityStatus.deviceFingerprint.screen.width} × {securityStatus.deviceFingerprint.screen.height}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Timezone</p>
              <p className="text-gray-600">{securityStatus.deviceFingerprint.timezone}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Language</p>
              <p className="text-gray-600">{securityStatus.deviceFingerprint.language}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Registered</p>
              <p className="text-gray-600">
                {new Date(securityStatus.deviceFingerprint.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SecurityAlerts = () => (
    <div className="space-y-4">
      {securityStatus.activeAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Alerts</h3>
          <p className="text-gray-600">Your account security is up to date</p>
        </div>
      ) : (
        securityStatus.activeAlerts.map(alert => (
          <div key={alert.id} className={`p-6 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
              alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
            }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                  }`}>
                  {getRiskLevelIcon(alert.severity)}
                </div>
                <div>
                  <h4 className={`font-semibold ${alert.severity === 'critical' ? 'text-red-800' :
                      alert.severity === 'high' ? 'text-orange-800' :
                        alert.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                    }`}>
                    {alert.title}
                  </h4>
                  <p className={`text-sm ${alert.severity === 'critical' ? 'text-red-700' :
                      alert.severity === 'high' ? 'text-orange-700' :
                        alert.severity === 'medium' ? 'text-yellow-700' :
                          'text-blue-700'
                    }`}>
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${alert.severity === 'critical' ? 'bg-red-600 text-white hover:bg-red-700' :
                    alert.severity === 'high' ? 'bg-orange-600 text-white hover:bg-orange-700' :
                      alert.severity === 'medium' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                        'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                Acknowledge
              </button>
            </div>

            {alert.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alert.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`px-3 py-1 rounded text-sm ${action.type === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        action.type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                          'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const SecurityHistory = () => {
    const history = getSecurityHistory();

    return (
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Security Events</h3>
            <p className="text-gray-600">Security events will appear here</p>
          </div>
        ) : (
          history.slice(0, 20).map(event => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${event.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      event.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                    }`}>
                    {getRiskLevelIcon(event.severity)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {event.type.replace('_', ' ').toUpperCase()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Risk Score: {event.riskScore} |
                      Status: {event.resolved ? 'Resolved' : 'Pending'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${event.resolved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                    {event.resolved ? 'Resolved' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const SecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Security Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Enhanced Monitoring</p>
              <p className="text-sm text-gray-600">Enable additional behavioral analysis</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Transaction Alerts</p>
              <p className="text-sm text-gray-600">Get notified of suspicious transactions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Device Notifications</p>
              <p className="text-sm text-gray-600">Alert when new devices access your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Emergency Actions</h3>
        <div className="space-y-3">
          <button className="w-full p-3 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <p className="font-medium text-red-800">Freeze Account</p>
            <p className="text-sm text-red-600">Temporarily disable all account activity</p>
          </button>

          <button className="w-full p-3 text-left border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
            <p className="font-medium text-orange-800">Reset Security Settings</p>
            <p className="text-sm text-orange-600">Reset all security preferences to defaults</p>
          </button>

          <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium text-gray-800">Export Security Data</p>
            <p className="text-sm text-gray-600">Download your security event history</p>
          </button>
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
              <h2 className="text-2xl font-bold text-gray-800">Security Dashboard</h2>
              <p className="text-gray-600">Monitor and manage your account security</p>
            </div>
          </div>
          {loading && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: securityStatus.activeAlerts.length },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings }
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && <SecurityOverview />}
        {activeTab === 'alerts' && <SecurityAlerts />}
        {activeTab === 'history' && <SecurityHistory />}
        {activeTab === 'settings' && <SecuritySettings />}
      </div>

      {/* Report Suspicious Activity Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Report Suspicious Activity</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type
                </label>
                <select
                  value={reportData.type}
                  onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="unauthorized_access">Unauthorized Access</option>
                  <option value="suspicious_transaction">Suspicious Transaction</option>
                  <option value="phishing_attempt">Phishing Attempt</option>
                  <option value="account_compromise">Account Compromise</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the suspicious activity..."
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReportForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSuspiciousActivity}
                disabled={!reportData.type || !reportData.description}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}