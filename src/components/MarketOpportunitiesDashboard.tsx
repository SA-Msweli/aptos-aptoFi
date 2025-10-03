'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Lightbulb,
  BarChart3,
  ArrowUpDown,
  Eye,
  Star
} from 'lucide-react';
import { useMarketOpportunities } from '@/hooks/useMarketOpportunities';
import type { YieldOpportunity, ArbitrageOpportunity, MarketTiming, InvestmentRecommendation } from '@/lib/marketOpportunityService';

interface MarketOpportunitiesDashboardProps {
  autoStart?: boolean;
  showNotifications?: boolean;
  className?: string;
}

interface OpportunityCardProps {
  opportunity: YieldOpportunity;
  onSelect?: (opportunity: YieldOpportunity) => void;
}

const YieldOpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onSelect }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(opportunity)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{opportunity.tokenSymbol}</CardTitle>
          <Badge className={getRiskColor(opportunity.riskLevel)}>
            {opportunity.riskLevel} risk
          </Badge>
        </div>
        <div className="text-sm text-gray-600">{opportunity.platform}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {opportunity.apy.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">APY</span>
          </div>

          <div className="text-sm text-gray-600">
            {opportunity.description}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>TVL: ${opportunity.tvl.toLocaleString()}</span>
            <span>Confidence: {opportunity.confidence}%</span>
          </div>

          {opportunity.lockupPeriod > 0 && (
            <div className="flex items-center text-sm text-orange-600">
              <Clock className="h-4 w-4 mr-1" />
              {opportunity.lockupPeriod} days lockup
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ArbitrageCardProps {
  opportunity: ArbitrageOpportunity;
  onSelect?: (opportunity: ArbitrageOpportunity) => void;
}

const ArbitrageOpportunityCard: React.FC<ArbitrageCardProps> = ({ opportunity, onSelect }) => {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(opportunity)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{opportunity.tokenSymbol}</CardTitle>
          <Badge className={getComplexityColor(opportunity.executionComplexity)}>
            {opportunity.executionComplexity}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          {opportunity.buyPlatform} → {opportunity.sellPlatform}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              {opportunity.profitPercentage.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500">Profit</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Buy Price</div>
              <div className="font-medium">${opportunity.buyPrice.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500">Sell Price</div>
              <div className="font-medium">${opportunity.sellPrice.toFixed(4)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Est. Profit: ${opportunity.estimatedProfit.toFixed(2)}</span>
            <span className="flex items-center text-orange-600">
              <Clock className="h-3 w-3 mr-1" />
              {Math.round(opportunity.timeWindow / 60)}m
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TimingCardProps {
  timing: MarketTiming;
}

const MarketTimingCard: React.FC<TimingCardProps> = ({ timing }) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-600 bg-green-50';
      case 'sell': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      default: return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{timing.tokenSymbol}</CardTitle>
          <Badge className={getActionColor(timing.action)}>
            {getActionIcon(timing.action)}
            {timing.action.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {timing.confidence}% Confidence
            </span>
            <Badge variant="outline">{timing.timeHorizon}</Badge>
          </div>

          <div className="space-y-1">
            {timing.reasoning.slice(0, 2).map((reason, index) => (
              <div key={index} className="text-sm text-gray-600 flex items-start">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                {reason}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Target</div>
              <div className="font-medium">${timing.priceTarget.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500">Stop Loss</div>
              <div className="font-medium">${timing.stopLoss.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface RecommendationCardProps {
  recommendation: InvestmentRecommendation;
  onSelect?: (recommendation: InvestmentRecommendation) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onSelect }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'yield_farming': return <Target className="h-4 w-4" />;
      case 'arbitrage': return <Zap className="h-4 w-4" />;
      case 'trading': return <BarChart3 className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(recommendation)}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          {getTypeIcon(recommendation.type)}
          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {recommendation.description}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {recommendation.expectedReturn.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Expected Return</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getRiskColor(recommendation.riskLevel)}`}>
                {recommendation.riskLevel.toUpperCase()} RISK
              </div>
              <div className="text-xs text-gray-500">{recommendation.timeHorizon} term</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Min. Capital: ${recommendation.requiredCapital.toLocaleString()}</span>
            <span>Confidence: {recommendation.confidence}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const MarketOpportunitiesDashboard: React.FC<MarketOpportunitiesDashboardProps> = ({
  autoStart = false,
  showNotifications = true,
  className = ''
}) => {
  const {
    isScanning,
    isLoading,
    error,
    yieldOpportunities,
    arbitrageOpportunities,
    marketTimings,
    recommendations,
    stats,
    lastScan,
    startScanning,
    stopScanning,
    refreshOpportunities,
    getBestYieldOpportunity,
    getBestArbitrageOpportunity
  } = useMarketOpportunities({ autoStart });

  const [selectedTab, setSelectedTab] = useState('overview');

  const handleToggleScanning = async () => {
    try {
      if (isScanning) {
        stopScanning();
      } else {
        await startScanning();
      }
    } catch (error) {
      console.error('Failed to toggle scanning:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshOpportunities();
    } catch (error) {
      console.error('Failed to refresh opportunities:', error);
    }
  };

  const bestYield = getBestYieldOpportunity();
  const bestArbitrage = getBestArbitrageOpportunity();
  const highConfidenceTimings = marketTimings.filter(t => t.confidence > 80);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Eye className="h-6 w-6 text-blue-600" />
          <span>Market Opportunities</span>
        </h2>
        <div className="flex items-center space-x-2">
          <Badge variant={isScanning ? 'default' : 'secondary'}>
            {isScanning ? 'Scanning' : 'Stopped'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleScanning}
            disabled={isLoading}
          >
            {isScanning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && showNotifications && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.yieldOpportunities}</div>
                <div className="text-sm text-gray-600">Yield Opportunities</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.arbitrageOpportunities}</div>
                <div className="text-sm text-gray-600">Arbitrage Opportunities</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.averageYield.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Average Yield</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {lastScan > 0 ? Math.round((Date.now() - lastScan) / 60000) : 0}m
                </div>
                <div className="text-sm text-gray-600">Last Scan</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Opportunities Highlight */}
      {(bestYield || bestArbitrage) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestYield && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <Star className="h-5 w-5" />
                  <span>Best Yield Opportunity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bestYield.tokenSymbol}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {bestYield.apy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{bestYield.description}</div>
                  <div className="text-sm">
                    Platform: {bestYield.platform} • Risk: {bestYield.riskLevel}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {bestArbitrage && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Star className="h-5 w-5" />
                  <span>Best Arbitrage Opportunity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bestArbitrage.tokenSymbol}</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {bestArbitrage.profitPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {bestArbitrage.buyPlatform} → {bestArbitrage.sellPlatform}
                  </div>
                  <div className="text-sm">
                    Est. Profit: ${bestArbitrage.estimatedProfit.toFixed(2)} •
                    Window: {Math.round(bestArbitrage.timeWindow / 60)}m
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Opportunities Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="yield">Yield ({yieldOpportunities.length})</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage ({arbitrageOpportunities.length})</TabsTrigger>
          <TabsTrigger value="timing">Timing ({highConfidenceTimings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Yield Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Top Yield Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {yieldOpportunities.slice(0, 3).map((opportunity) => (
                    <div key={opportunity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{opportunity.tokenSymbol}</div>
                        <div className="text-sm text-gray-600">{opportunity.platform}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{opportunity.apy.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{opportunity.riskLevel} risk</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Investment Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-gray-600">{rec.type.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{rec.expectedReturn.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{rec.confidence}% confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yield" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yieldOpportunities.map((opportunity) => (
              <YieldOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onSelect={(opp) => console.log('Selected yield opportunity:', opp)}
              />
            ))}
          </div>
          {yieldOpportunities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No yield opportunities found. Try adjusting your filters or start scanning.
            </div>
          )}
        </TabsContent>

        <TabsContent value="arbitrage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arbitrageOpportunities.map((opportunity) => (
              <ArbitrageOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onSelect={(opp) => console.log('Selected arbitrage opportunity:', opp)}
              />
            ))}
          </div>
          {arbitrageOpportunities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No arbitrage opportunities found. Try adjusting your filters or start scanning.
            </div>
          )}
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {highConfidenceTimings.map((timing) => (
              <MarketTimingCard
                key={`${timing.tokenSymbol}_${timing.timestamp}`}
                timing={timing}
              />
            ))}
          </div>
          {highConfidenceTimings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No high-confidence timing signals found. Market conditions may be neutral.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <div className="text-sm text-gray-500 text-center">
        {lastScan > 0 && (
          <div>Last scan: {new Date(lastScan).toLocaleString()}</div>
        )}
        <div className="mt-1">
          {stats.totalOpportunities} total opportunities •
          Scanning {isScanning ? 'active' : 'inactive'} •
          Average scan duration: {stats.scanDuration}ms
        </div>
      </div>
    </div>
  );
};

export default MarketOpportunitiesDashboard;