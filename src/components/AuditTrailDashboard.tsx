"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import {
  FileText,
  Shield,
  AlertTriangle,
  Download,
  Search,
  Filter,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from "lucide-react";
import type { AuditQuery, AuditEventType, AuditCategory, AuditSeverity } from "@/lib/auditTrail";

interface AuditTrailDashboardProps {
  className?: string;
}

export function AuditTrailDashboard({ className = "" }: AuditTrailDashboardProps) {
  const { connected, account } = useWallet();
  const {
    events,
    totalEvents,
    loading,
    error,
    queryEvents,
    getUserEvents,
    generateReport,
    exportReport,
    verifyEventIntegrity,
    getComplianceMonitors,
    logUserLogin,
    logTransaction,
    logSecurityEvent,
    clearError,
    hasEvents,
    recentEvents,
    criticalEvents,
    complianceEvents
  } = useAuditTrail();

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'reports' | 'compliance' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    eventTypes: AuditEventType[];
    categories: AuditCategory[];
    severities: AuditSeverity[];
    dateRange: { start: string; end: string };
  }>({
    eventTypes: [],
    categories: [],
    severities: [],
    dateRange: { start: '', end: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Load initial data
  useEffect(() => {
    if (connected && account?.address) {
      getUserEvents(50);
    }
  }, [connected, account, getUserEvents]);

  const handleSearch = async () => {
    if (!account?.address) return;

    const query: AuditQuery = {
      userAddress: account.address.toString(),
      eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
      categories: filters.categories.length > 0 ? filters.categories : undefined,
      severities: filters.severities.length > 0 ? filters.severities : undefined,
      dateRange: filters.dateRange.start && filters.dateRange.end ? {
        start: new Date(filters.dateRange.start).getTime(),
        end: new Date(filters.dateRange.end).getTime()
      } : undefined,
      limit: 100,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    await queryEvents(query);
  };

  const handleGenerateReport = async (reportType: 'compliance' | 'security' | 'transaction' | 'user_activity') => {
    if (!account?.address) return;

    setReportGenerating(true);
    try {
      const query: AuditQuery = {
        userAddress: account.address.toString(),
        dateRange: {
          start: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: Date.now()
        }
      };

      const report = await generateReport(
        reportType,
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        `Comprehensive ${reportType} report for the last 30 days`,
        query
      );

      if (report) {
        // Download as JSON
        const exportData = await exportReport(report, 'json');
        if (exportData) {
          const blob = new Blob([exportData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setReportGenerating(false);
    }
  };

  const handleVerifyEvent = async (eventId: string) => {
    const result = await verifyEventIntegrity(eventId);
    if (result) {
      alert(`Event Verification: ${result.valid ? 'VALID' : 'INVALID'}\n${result.details}`);
    }
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (!connected || !account) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Audit Trail Dashboard</h3>
          <p className="text-gray-600">Connect your wallet to view audit logs and compliance reports</p>
        </div>
      </div>
    );
  }

  const AuditOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Events</p>
              <p className="text-2xl font-bold text-red-600">{criticalEvents.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance Events</p>
              <p className="text-2xl font-bold text-orange-600">{complianceEvents.length}</p>
            </div>
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monitors Active</p>
              <p className="text-2xl font-bold text-green-600">{getComplianceMonitors().length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
        {recentEvents.length > 0 ? (
          <div className="space-y-3">
            {recentEvents.map(event => (
              <div key={event.id} className={`p-3 border rounded-lg ${getSeverityColor(event.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(event.severity)}
                    <div>
                      <p className="font-medium text-sm">{event.description}</p>
                      <p className="text-xs opacity-75">
                        {event.eventType} • {event.category} • {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVerifyEvent(event.id)}
                    className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent events</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleGenerateReport('compliance')}
            disabled={reportGenerating}
            className="p-4 text-left border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Shield className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-blue-800">Compliance Report</p>
            <p className="text-sm text-blue-600">Generate compliance audit</p>
          </button>

          <button
            onClick={() => handleGenerateReport('security')}
            disabled={reportGenerating}
            className="p-4 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
            <p className="font-medium text-red-800">Security Report</p>
            <p className="text-sm text-red-600">Analyze security events</p>
          </button>

          <button
            onClick={() => handleGenerateReport('transaction')}
            disabled={reportGenerating}
            className="p-4 text-left border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <FileText className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-green-800">Transaction Report</p>
            <p className="text-sm text-green-600">Review transaction logs</p>
          </button>

          <button
            onClick={() => handleGenerateReport('user_activity')}
            disabled={reportGenerating}
            className="p-4 text-left border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            <Eye className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-purple-800">Activity Report</p>
            <p className="text-sm text-purple-600">User activity summary</p>
          </button>
        </div>
      </div>
    </div>
  );

  const AuditEvents = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Types</label>
                <select
                  multiple
                  value={filters.eventTypes}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    eventTypes: Array.from(e.target.selectedOptions, option => option.value as AuditEventType)
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user_login">User Login</option>
                  <option value="transaction_completed">Transaction Completed</option>
                  <option value="kyc_verification">KYC Verification</option>
                  <option value="security_alert">Security Alert</option>
                  <option value="compliance_screening">Compliance Screening</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <select
                  multiple
                  value={filters.categories}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    categories: Array.from(e.target.selectedOptions, option => option.value as AuditCategory)
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="authentication">Authentication</option>
                  <option value="transaction">Transaction</option>
                  <option value="compliance">Compliance</option>
                  <option value="security">Security</option>
                  <option value="user_management">User Management</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  multiple
                  value={filters.severities}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    severities: Array.from(e.target.selectedOptions, option => option.value as AuditSeverity)
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Audit Events ({events.length})</h3>
            {selectedEvents.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedEvents.length} selected</span>
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  Export Selected
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading events...</p>
            </div>
          ) : events.length > 0 ? (
            events.map(event => (
              <div key={event.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEvents(prev => [...prev, event.id]);
                        } else {
                          setSelectedEvents(prev => prev.filter(id => id !== event.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                      {getSeverityIcon(event.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm">{event.description}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span>{event.eventType}</span>
                        <span>{event.category}</span>
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                        {event.complianceFlags.length > 0 && (
                          <span className="text-orange-600">
                            {event.complianceFlags.length} compliance flag(s)
                          </span>
                        )}
                      </div>
                      {Object.keys(event.details).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVerifyEvent(event.id)}
                      className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      Verify
                    </button>
                    <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events found</p>
            </div>
          )}
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
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Audit Trail Dashboard</h2>
              <p className="text-gray-600">Monitor and analyze system activity and compliance</p>
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
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'events', label: 'Events', icon: FileText },
            { id: 'reports', label: 'Reports', icon: Download },
            { id: 'compliance', label: 'Compliance', icon: Shield },
            { id: 'settings', label: 'Settings', icon: Filter }
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
        {activeTab === 'overview' && <AuditOverview />}
        {activeTab === 'events' && <AuditEvents />}
        {activeTab === 'reports' && (
          <div className="text-center py-12">
            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Reports</h3>
            <p className="text-gray-600">Advanced reporting features coming soon</p>
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Compliance Monitoring</h3>
            <p className="text-gray-600">Compliance monitoring dashboard coming soon</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Settings</h3>
            <p className="text-gray-600">Audit trail settings coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}