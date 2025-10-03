'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Bell,
  BellOff,
  RefreshCw,
  Eye,
  EyeOff,
  Heart,
  Zap,
  Target
} from 'lucide-react';
import { useUserRiskMonitoring } from '@/hooks/useRiskMonitoring';
import { formatHealthFactor, getRiskLevelColor } from '@/view-functions/getRiskData';

interface PortfolioHealthMonitorProps {
  userAddress: string;
  autoStart?: boolean;
  showAlerts?: boolean;
  showProtectionActions?: boolean;
  className?: string;
}

interface HealthFactorDisplayProps {
  healthFactor: number;
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const HealthFactorDisplay: React.FC<HealthFactorDisplayProps> = ({
  healthFactor,
  status,
  size = 'md'
}) => {
  const getHealthFactorProgress = (hf: number): number => {
    // Convert health factor to progress percentage
    // 1.0 = 0%, 2.0 = 50%, 3.0+ = 100%
    if (hf <= 1.0) return 0;
    if (hf >= 3.0) return 100;
    return ((hf - 1.0) / 2.0) * 100;
  };

  const getProgressColor = (hf: number): string => {
    if (hf <= 1.1) return 'bg-red-500';
    if (hf <= 1.5) return 'bg-orange-500';
    if (hf <= 2.0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className="space-y-2">
      <div className={`font-bold ${sizeClasses[size]}`} style={{ color: getRiskLevelColor(status) }}>
        {formatHealthFactor(healthFactor)}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Health Factor</span>
          <span className="capitalize">{status}</span>
        </div>
        <Progress
          value={getHealthFactorProgress(healthFactor)}
          className="h-2"
        />
      </div>
    </div>
  );
};

interface RiskAlertCardProps {
  alert: any;
  onAcknowledge: (alertId: string) => void;
}

const RiskAlertCard: React.FC<RiskAlertCardProps> = ({ alert, onAcknowledge }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Alert className={getSeverityColor(alert.severity)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          {getSeverityIcon(alert.severity)}
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <div className="font-medium mb-1">{alert.type.replace('_', ' ').toUpperCase()}</div>
              <div>{alert.message}</div>
              {alert.tokenSymbol && (
                <div className="text-xs text-gray-600 mt-1">Token: {alert.tokenSymbol}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {new Date(alert.createdAt).toLocaleString()}
              </div>
            </AlertDescription>
          </div>
        </div>
        {!alert.acknowledged && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAcknowledge(alert.id)}
            className="ml-2"
          >
            Acknowledge
          </Button>
        )}
      </div>
    </Alert>
  );
};

export const PortfolioHealthMonitor: React.FC<PortfolioHealthMonitorProps> = ({
  userAddress,
  autoStart = true,
  showAlerts = true,
  showProtectionActions = true,
  className = ''
}) => {
  const {
    isActive,
    isLoading,
    error,
    userRiskSummary,
    userAlerts,
    userProtectionActions,
    riskEvents,
    startMonitoring,
    stopMonitoring,
    acknowledgeRiskEvent,
    lastUpdate
  } = useUserRiskMonitoring(userAddress, { autoStart });

  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(autoStart);

  const handleToggleMonitoring = async () => {
    try {
      if (isActive) {
        stopMonitoring();
        setMonitoringEnabled(false);
      } else {
        await startMonitoring();
        setMonitoringEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeRiskEvent(alertId);
  };

  const criticalAlerts = userAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = userAlerts.filter(alert => alert.severity === 'high');
  const recentEvents = riskEvents.slice(0, 5);

  if (isLoading && !userRiskSummary) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span>Portfolio Health Monitor</span>
        </h2>
        <div className="flex items-center space-x-2">
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleMonitoring}
            disabled={isLoading}
          >
            {isActive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && showAlerts && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-600 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Critical Alerts ({criticalAlerts.length})</span>
          </h3>
          {criticalAlerts.map((alert) => (
            <RiskAlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledgeAlert}
            />
          ))}
        </div>
      )}

      {/* Portfolio Health Summary */}
      {userRiskSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Health Factor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span>Health Factor</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HealthFactorDisplay
                healthFactor={userRiskSummary.overallHealthFactor}
                status={userRiskSummary.overallHealthFactor >= 2.0 ? 'safe' :
                  userRiskSummary.overallHealthFactor >= 1.5 ? 'moderate' :
                    userRiskSummary.overallHealthFactor >= 1.1 ? 'high' : 'critical'}
                size="lg"
              />
            </CardContent>
          </Card>

          {/* Risk Score Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-500" />
                <span>Risk Score</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold" style={{
                  color: userRiskSummary.riskScore > 80 ? '#ef4444' :
                    userRiskSummary.riskScore > 60 ? '#f97316' :
                      userRiskSummary.riskScore > 40 ? '#f59e0b' : '#10b981'
                }}>
                  {userRiskSummary.riskScore}/100
                </div>
                <Progress
                  value={userRiskSummary.riskScore}
                  className="h-2"
                />
                <div className="text-sm text-gray-600">
                  {userRiskSummary.riskScore > 80 ? 'High Risk' :
                    userRiskSummary.riskScore > 60 ? 'Medium Risk' :
                      userRiskSummary.riskScore > 40 ? 'Low Risk' : 'Very Low Risk'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Utilization Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span>Utilization Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {(userRiskSummary.utilizationRate * 100).toFixed(1)}%
                </div>
                <Progress
                  value={userRiskSummary.utilizationRate * 100}
                  className="h-2"
                />
                <div className="text-sm text-gray-600">
                  ${userRiskSummary.totalBorrowedValue.toLocaleString()} / ${userRiskSummary.totalCollateralValue.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Portfolio Overview */}
      {userRiskSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${userRiskSummary.totalCollateralValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Collateral</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  ${userRiskSummary.totalBorrowedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Borrowed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userRiskSummary.activePositions}
                </div>
                <div className="text-sm text-gray-600">Active Positions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {userRiskSummary.positionsAtRisk}
                </div>
                <div className="text-sm text-gray-600">Positions at Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {userRiskSummary && userRiskSummary.recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Recommended Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userRiskSummary.recommendedActions.map((action, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Alerts */}
      {highAlerts.length > 0 && showAlerts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <span>High Priority Alerts ({highAlerts.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllAlerts(!showAllAlerts)}
              >
                {showAllAlerts ? 'Show Less' : 'Show All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(showAllAlerts ? highAlerts : highAlerts.slice(0, 3)).map((alert) => (
                <RiskAlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledgeAlert}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protection Actions */}
      {userProtectionActions.length > 0 && showProtectionActions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span>Protection Actions ({userProtectionActions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userProtectionActions.slice(0, 5).map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div>
                    <div className="font-medium text-green-800">
                      {action.actionType.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-green-600">{action.reason}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(action.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={
                    action.status === 'executed' ? 'default' :
                      action.status === 'failed' ? 'destructive' : 'secondary'
                  }>
                    {action.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Footer */}
      <div className="text-sm text-gray-500 text-center">
        {lastUpdate > 0 && (
          <div>Last updated: {new Date(lastUpdate).toLocaleString()}</div>
        )}
        <div className="mt-1">
          Monitoring {isActive ? 'active' : 'inactive'} •
          {userAlerts.length} active alerts •
          {userProtectionActions.length} protection actions
        </div>
      </div>
    </div>
  );
};

export default PortfolioHealthMonitor;