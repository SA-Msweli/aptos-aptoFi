import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { vaultService, VaultPerformance } from '@/services/vaultService';

interface VaultPerformanceChartProps {
  vaultId: number;
}

interface PerformanceData {
  timestamp: number;
  totalAssets: number;
  apy: number;
  yield: number;
}

export function VaultPerformanceChart({ vaultId }: VaultPerformanceChartProps) {
  const [performance, setPerformance] = useState<VaultPerformance | null>(null);
  const [historicalData, setHistoricalData] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');

  useEffect(() => {
    loadPerformanceData();
  }, [vaultId, timeframe]);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      // Load current performance metrics
      const performanceData = await vaultService.getVaultPerformance(vaultId);
      setPerformance(performanceData);

      // Load historical data
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const historical = await vaultService.getVaultPerformanceHistory(vaultId, days);
      setHistoricalData(historical);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100000000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTrend = () => {
    if (historicalData.length < 2) return { direction: 'neutral', percentage: 0 };

    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    const change = ((latest.totalAssets - previous.totalAssets) / previous.totalAssets) * 100;

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change),
    };
  };

  const trend = calculateTrend();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!performance) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500">
            Performance data not available for this vault
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current APY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {vaultService.formatApy(performance.currentApy)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : null}
              {trend.percentage > 0 && (
                <span className={trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {trend.percentage.toFixed(2)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(performance.totalYieldGenerated)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Generated to date
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Fees Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(performance.feesCollected)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Management & performance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>
                Vault performance over time powered by Nodit APIs
              </CardDescription>
            </div>
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs">90D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {historicalData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <div>No historical data available</div>
              <div className="text-sm">Data will appear as the vault operates</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple data visualization - in production would use a proper chart library */}
              <div className="grid grid-cols-1 gap-2">
                {historicalData.slice(-10).map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 min-w-[60px]">
                        {formatDate(data.timestamp)}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(data.totalAssets)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {vaultService.formatApy(data.apy)}
                      </Badge>
                      <span className="text-green-600 min-w-[80px] text-right">
                        +{formatCurrency(data.yield)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Avg APY</div>
                  <div className="font-medium">
                    {historicalData.length > 0
                      ? vaultService.formatApy(
                        historicalData.reduce((sum, d) => sum + d.apy, 0) / historicalData.length
                      )
                      : '0.00%'
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Yield</div>
                  <div className="font-medium text-green-600">
                    +{formatCurrency(
                      historicalData.reduce((sum, d) => sum + d.yield, 0)
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Best Day</div>
                  <div className="font-medium">
                    {historicalData.length > 0
                      ? formatCurrency(Math.max(...historicalData.map(d => d.yield)))
                      : '$0.00'
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Growth</div>
                  <div className={`font-medium ${trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                    {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                    {trend.percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vault Operations History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
          <CardDescription>
            Latest vault management activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">Last Compound</div>
                <div className="text-xs text-gray-600">
                  {new Date(performance.lastCompound * 1000).toLocaleString()}
                </div>
              </div>
              <Badge variant="outline">Automated</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">Last Rebalance</div>
                <div className="text-xs text-gray-600">
                  {new Date(performance.lastRebalance * 1000).toLocaleString()}
                </div>
              </div>
              <Badge variant="outline">Strategy</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VaultPerformanceChart;