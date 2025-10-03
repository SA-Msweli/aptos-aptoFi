'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  DollarSign,
  Percent,
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Clock,
  Award
} from 'lucide-react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useRiskMonitoring } from '@/hooks/useRiskMonitoring';
import { useMarketOpportunities } from '@/hooks/useMarketOpportunities';

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  calmarRatio: number;
  sortinoRatio: number;
}

interface AssetAllocation {
  tokenSymbol: string;
  value: number;
  percentage: number;
  pnl: number;
  pnlPercentage: number;
  allocation: 'underweight' | 'optimal' | 'overweight';
}

interface RiskAdjustedMetrics {
  portfolioRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  healthFactor: number;
  valueAtRisk: number;
  expectedShortfall: number;
}

interface YieldAnalytics {
  totalYieldEarned: number;
  averageAPY: number;
  yieldByStrategy: Array<{
    strategy: string;
    totalYield: number;
    apy: number;
    allocation: number;
    riskAdjustedReturn: number;
  }>;
  compoundingEffect: number;
  yieldEfficiency: number;
}

interface PortfolioOptimization {
  currentAllocation: AssetAllocation[];
  recommendedAllocation: AssetAllocation[];
  rebalancingActions: Array<{
    action: 'buy' | 'sell' | 'hold';
    tokenSymbol: string;
    currentWeight: number;
    targetWeight: number;
    amount: number;
    reason: string;
  }>;
  expectedImprovement: {
    returnIncrease: number;
    riskReduction: number;
    sharpeImprovement: number;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

// Simple UI components to replace the missing ones
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = 'default', className = '' }: {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const Tabs = ({ defaultValue, children, className = '' }: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  return (
    <div className={`${className}`} data-active-tab={activeTab}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { activeTab, setActiveTab } as any) : child
      )}
    </div>
  );
};

const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex border-b border-gray-200 ${className}`}>{children}</div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab }: {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}) => (
  <button
    onClick={() => setActiveTab?.(value)}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === value
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab, className = '' }: {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  className?: string;
}) => (
  activeTab === value ? <div className={`mt-4 ${className}`}>{children}</div> : null
);

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const { connected, account } = useWallet();
  const { marketData, isConnected: dataConnected } = useRealTimeData({ autoStart: true });
  const { portfolioSummary, isActive: riskMonitoringActive } = useRiskMonitoring({
    userAddress: account?.address?.toString(),
    autoStart: true
  });
  const { stats: opportunityStats, yieldOpportunities } = useMarketOpportunities({ autoStart: true });

  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '7D' | '30D' | '90D' | '1Y'>('30D');
  const [isLoading, setIsLoading] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskAdjustedMetrics | null>(null);
  const [yieldAnalytics, setYieldAnalytics] = useState<YieldAnalytics | null>(null);
  const [portfolioOptimization, setPortfolioOptimization] = useState<PortfolioOptimization | null>(null);

  // Simulate analytics data (in production, this would come from smart contracts and historical data)
  useEffect(() => {
    const generateAnalytics = async () => {
      if (!connected || !account?.address) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock performance metrics
        const mockPerformanceMetrics: PerformanceMetrics = {
          totalReturn: 15.7,
          annualizedReturn: 23.4,
          volatility: 18.2,
          sharpeRatio: 1.28,
          maxDrawdown: -8.3,
          winRate: 67.5,
          profitFactor: 2.1,
          calmarRatio: 2.82,
          sortinoRatio: 1.65
        };

        // Generate mock asset allocation
        const mockAssetAllocation: AssetAllocation[] = [
          {
            tokenSymbol: 'APT',
            value: 12500,
            percentage: 45.2,
            pnl: 1850,
            pnlPercentage: 17.4,
            allocation: 'optimal'
          },
          {
            tokenSymbol: 'USDC',
            value: 8200,
            percentage: 29.6,
            pnl: 320,
            pnlPercentage: 4.1,
            allocation: 'overweight'
          },
          {
            tokenSymbol: 'ETH',
            value: 4800,
            percentage: 17.3,
            pnl: 680,
            pnlPercentage: 16.5,
            allocation: 'underweight'
          },
          {
            tokenSymbol: 'BTC',
            value: 2200,
            percentage: 7.9,
            pnl: 290,
            pnlPercentage: 15.2,
            allocation: 'optimal'
          }
        ];

        // Generate mock risk metrics
        const mockRiskMetrics: RiskAdjustedMetrics = {
          portfolioRisk: 32,
          concentrationRisk: 28,
          liquidityRisk: 15,
          correlationRisk: 42,
          healthFactor: portfolioSummary?.overallHealthFactor || 2.1,
          valueAtRisk: -1250,
          expectedShortfall: -1890
        };

        // Generate mock yield analytics
        const mockYieldAnalytics: YieldAnalytics = {
          totalYieldEarned: 2340,
          averageAPY: 12.8,
          yieldByStrategy: [
            {
              strategy: 'Lending Pools',
              totalYield: 1200,
              apy: 15.2,
              allocation: 35,
              riskAdjustedReturn: 11.8
            },
            {
              strategy: 'Yield Vaults',
              totalYield: 890,
              apy: 18.7,
              allocation: 25,
              riskAdjustedReturn: 14.2
            },
            {
              strategy: 'LP Rewards',
              totalYield: 250,
              apy: 8.3,
              allocation: 40,
              riskAdjustedReturn: 6.9
            }
          ],
          compoundingEffect: 18.5,
          yieldEfficiency: 0.71
        };

        // Generate mock portfolio optimization
        const mockPortfolioOptimization: PortfolioOptimization = {
          currentAllocation: mockAssetAllocation,
          recommendedAllocation: mockAssetAllocation.map(asset => ({
            ...asset,
            percentage: asset.tokenSymbol === 'APT' ? 40.0 :
              asset.tokenSymbol === 'USDC' ? 25.0 :
                asset.tokenSymbol === 'ETH' ? 25.0 : 10.0
          })),
          rebalancingActions: [
            {
              action: 'sell',
              tokenSymbol: 'APT',
              currentWeight: 45.2,
              targetWeight: 40.0,
              amount: 1440,
              reason: 'Reduce concentration risk'
            },
            {
              action: 'sell',
              tokenSymbol: 'USDC',
              currentWeight: 29.6,
              targetWeight: 25.0,
              amount: 1270,
              reason: 'Reduce cash allocation'
            },
            {
              action: 'buy',
              tokenSymbol: 'ETH',
              currentWeight: 17.3,
              targetWeight: 25.0,
              amount: 2130,
              reason: 'Increase growth allocation'
            },
            {
              action: 'buy',
              tokenSymbol: 'BTC',
              currentWeight: 7.9,
              targetWeight: 10.0,
              amount: 580,
              reason: 'Improve diversification'
            }
          ],
          expectedImprovement: {
            returnIncrease: 2.3,
            riskReduction: 4.1,
            sharpeImprovement: 0.15
          }
        };

        setPerformanceMetrics(mockPerformanceMetrics);
        setAssetAllocation(mockAssetAllocation);
        setRiskMetrics(mockRiskMetrics);
        setYieldAnalytics(mockYieldAnalytics);
        setPortfolioOptimization(mockPortfolioOptimization);

      } catch (error) {
        console.error('Failed to generate analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateAnalytics();
  }, [connected, account, selectedTimeframe, portfolioSummary]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Trigger data refresh
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleExportReport = () => {
    // In production, this would generate and download a comprehensive report
    console.log('Exporting analytics report...');
  };

  if (!connected) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet for Analytics</h3>
        <p className="text-gray-600">Connect your wallet to view comprehensive portfolio analytics and performance metrics.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = assetAllocation.reduce((sum, asset) => sum + asset.value, 0);
  const totalPnL = assetAllocation.reduce((sum, asset) => sum + asset.pnl, 0);
  const totalPnLPercentage = totalPortfolioValue > 0 ? (totalPnL / (totalPortfolioValue - totalPnL)) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span>Portfolio Analytics</span>
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive performance analysis and optimization insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['1D', '7D', '30D', '90D', '1Y'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 text-sm rounded ${selectedTimeframe === timeframe
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Portfolio Value</p>
                <p className="text-2xl font-bold">${totalPortfolioValue.toLocaleString()}</p>
                <div className={`flex items-center text-sm ${totalPnLPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnLPercentage >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {totalPnLPercentage >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}% (${totalPnL.toLocaleString()})
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annualized Return</p>
                <p className="text-2xl font-bold">{performanceMetrics?.annualizedReturn.toFixed(1)}%</p>
                <div className="flex items-center text-sm text-blue-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Sharpe: {performanceMetrics?.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portfolio Risk</p>
                <p className="text-2xl font-bold">{riskMetrics?.portfolioRisk}/100</p>
                <div className="flex items-center text-sm text-orange-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Health: {riskMetrics?.healthFactor.toFixed(2)}
                </div>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yield Earned</p>
                <p className="text-2xl font-bold">${yieldAnalytics?.totalYieldEarned.toLocaleString()}</p>
                <div className="flex items-center text-sm text-purple-600">
                  <Zap className="h-3 w-3 mr-1" />
                  APY: {yieldAnalytics?.averageAPY.toFixed(1)}%
                </div>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="yield">Yield Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Performance Analysis Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Return</span>
                    <span className="font-semibold text-green-600">+{performanceMetrics?.totalReturn.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Volatility</span>
                    <span className="font-semibold">{performanceMetrics?.volatility.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Drawdown</span>
                    <span className="font-semibold text-red-600">{performanceMetrics?.maxDrawdown.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Win Rate</span>
                    <span className="font-semibold">{performanceMetrics?.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit Factor</span>
                    <span className="font-semibold">{performanceMetrics?.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Calmar Ratio</span>
                    <span className="font-semibold">{performanceMetrics?.calmarRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sortino Ratio</span>
                    <span className="font-semibold">{performanceMetrics?.sortinoRatio.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk-Adjusted Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Sharpe Ratio</span>
                      <span className="font-semibold">{performanceMetrics?.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <Progress value={(performanceMetrics?.sharpeRatio || 0) * 25} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {(performanceMetrics?.sharpeRatio || 0) > 1 ? 'Excellent' :
                        (performanceMetrics?.sharpeRatio || 0) > 0.5 ? 'Good' : 'Needs Improvement'}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Risk Score</span>
                      <span className="font-semibold">{riskMetrics?.portfolioRisk}/100</span>
                    </div>
                    <Progress value={riskMetrics?.portfolioRisk || 0} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {(riskMetrics?.portfolioRisk || 0) < 30 ? 'Conservative' :
                        (riskMetrics?.portfolioRisk || 0) < 60 ? 'Moderate' : 'Aggressive'}
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Benchmark Comparison</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>vs. APT Hold</span>
                        <span className="text-green-600">+8.3%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>vs. 60/40 Portfolio</span>
                        <span className="text-green-600">+12.1%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>vs. DeFi Index</span>
                        <span className="text-green-600">+4.7%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Allocation Tab */}
        <TabsContent value="allocation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assetAllocation.map((asset) => (
                    <div key={asset.tokenSymbol} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{asset.tokenSymbol}</span>
                          <Badge variant={
                            asset.allocation === 'optimal' ? 'default' :
                              asset.allocation === 'overweight' ? 'destructive' : 'secondary'
                          }>
                            {asset.allocation}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{asset.percentage.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">${asset.value.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Progress value={asset.percentage} className="flex-1 mr-4 h-2" />
                        <div className={`text-sm ${asset.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {asset.pnlPercentage >= 0 ? '+' : ''}{asset.pnlPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Diversification Score</h4>
                    <div className="flex items-center space-x-2">
                      <Progress value={75} className="flex-1 h-2" />
                      <span className="text-sm font-semibold">75/100</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Good diversification across assets</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Concentration Risk</h4>
                    <div className="flex items-center space-x-2">
                      <Progress value={riskMetrics?.concentrationRisk || 0} className="flex-1 h-2" />
                      <span className="text-sm font-semibold">{riskMetrics?.concentrationRisk}/100</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(riskMetrics?.concentrationRisk || 0) < 30 ? 'Low concentration risk' :
                        (riskMetrics?.concentrationRisk || 0) < 60 ? 'Moderate concentration risk' : 'High concentration risk'}
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Asset Performance</h4>
                    <div className="space-y-2">
                      {assetAllocation
                        .sort((a, b) => b.pnlPercentage - a.pnlPercentage)
                        .map((asset) => (
                          <div key={asset.tokenSymbol} className="flex justify-between items-center">
                            <span className="text-sm">{asset.tokenSymbol}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${asset.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {asset.pnlPercentage >= 0 ? '+' : ''}{asset.pnlPercentage.toFixed(1)}%
                              </span>
                              {asset.pnlPercentage >= 0 ?
                                <TrendingUp className="h-3 w-3 text-green-600" /> :
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              }
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Portfolio Risk</span>
                      <span className="font-semibold">{riskMetrics?.portfolioRisk}/100</span>
                    </div>
                    <Progress value={riskMetrics?.portfolioRisk || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Concentration Risk</span>
                      <span className="font-semibold">{riskMetrics?.concentrationRisk}/100</span>
                    </div>
                    <Progress value={riskMetrics?.concentrationRisk || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Liquidity Risk</span>
                      <span className="font-semibold">{riskMetrics?.liquidityRisk}/100</span>
                    </div>
                    <Progress value={riskMetrics?.liquidityRisk || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Correlation Risk</span>
                      <span className="font-semibold">{riskMetrics?.correlationRisk}/100</span>
                    </div>
                    <Progress value={riskMetrics?.correlationRisk || 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value at Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      ${Math.abs(riskMetrics?.valueAtRisk || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-red-700">95% Value at Risk (1 day)</div>
                    <p className="text-xs text-gray-600 mt-1">
                      Maximum expected loss with 95% confidence
                    </p>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      ${Math.abs(riskMetrics?.expectedShortfall || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-orange-700">Expected Shortfall</div>
                    <p className="text-xs text-gray-600 mt-1">
                      Average loss beyond VaR threshold
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Risk Recommendations</h4>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Reduce APT concentration</div>
                          <div className="text-gray-600">Consider rebalancing to reduce single-asset risk</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Add hedging positions</div>
                          <div className="text-gray-600">Consider adding uncorrelated assets</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Yield Analysis Tab */}
        <TabsContent value="yield" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${yieldAnalytics?.totalYieldEarned.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Total Yield Earned</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Average APY: {yieldAnalytics?.averageAPY.toFixed(1)}%
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Compounding Effect</span>
                      <span className="font-semibold text-purple-600">+{yieldAnalytics?.compoundingEffect.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-gray-500">Additional returns from compound interest</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Yield Efficiency</span>
                      <span className="font-semibold">{yieldAnalytics?.yieldEfficiency.toFixed(2)}</span>
                    </div>
                    <Progress value={(yieldAnalytics?.yieldEfficiency || 0) * 100} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Yield per unit of risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yield by Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {yieldAnalytics?.yieldByStrategy.map((strategy) => (
                    <div key={strategy.strategy} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{strategy.strategy}</span>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{strategy.apy.toFixed(1)}% APY</div>
                          <div className="text-sm text-gray-600">${strategy.totalYield.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Progress value={strategy.allocation} className="flex-1 mr-4 h-2" />
                        <div className="text-sm text-gray-600">{strategy.allocation}% allocation</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Risk-adjusted return: {strategy.riskAdjustedReturn.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Yield Opportunities</h4>
                  <div className="space-y-2">
                    {yieldOpportunities.slice(0, 3).map((opportunity) => (
                      <div key={opportunity.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{opportunity.tokenSymbol}</div>
                          <div className="text-xs text-gray-600">{opportunity.platform}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-sm">{opportunity.apy.toFixed(1)}%</div>
                          <div className="text-xs text-gray-500">{opportunity.riskLevel} risk</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Portfolio Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rebalancing Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Expected Improvements</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          +{portfolioOptimization?.expectedImprovement.returnIncrease.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Return Increase</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          -{portfolioOptimization?.expectedImprovement.riskReduction.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Risk Reduction</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          +{portfolioOptimization?.expectedImprovement.sharpeImprovement.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">Sharpe Improvement</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {portfolioOptimization?.rebalancingActions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={action.action === 'buy' ? 'default' : action.action === 'sell' ? 'destructive' : 'secondary'}>
                            {action.action.toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{action.tokenSymbol}</div>
                            <div className="text-sm text-gray-600">{action.reason}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${action.amount.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">
                            {action.currentWeight.toFixed(1)}% → {action.targetWeight.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Current vs Recommended Allocation</h4>
                    <div className="space-y-3">
                      {portfolioOptimization?.currentAllocation.map((asset) => {
                        const recommended = portfolioOptimization.recommendedAllocation.find(
                          r => r.tokenSymbol === asset.tokenSymbol
                        );
                        return (
                          <div key={asset.tokenSymbol} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{asset.tokenSymbol}</span>
                              <span>{asset.percentage.toFixed(1)}% → {recommended?.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="flex space-x-2">
                              <Progress value={asset.percentage} className="flex-1 h-2" />
                              <Progress value={recommended?.percentage || 0} className="flex-1 h-2 opacity-50" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Optimization Goals</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Maximize risk-adjusted returns</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Reduce concentration risk</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Improve diversification</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Optimize yield generation</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Execute Rebalancing
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      This will create transactions to rebalance your portfolio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;