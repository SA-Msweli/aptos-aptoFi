/**
 * CreditScore Component
 * 
 * Displays a user's credit score with FICO-like presentation and breakdown
 */

// React import removed - not needed with new JSX transform
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, CreditCard, DollarSign, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
// Define ReputationMetrics type locally since service was removed
type ReputationMetrics = {
  address: string;
  credit_score: number;
  credit_grade: string;
  payment_history?: any;
  credit_utilization?: any;
  credit_history?: any;
  credit_mix?: any;
  new_credit?: any;
  defi_factors?: any;
  risk_assessment?: any;
  transaction_count: number;
  total_volume: string;
  unique_counterparties: number;
  governance_participation: number;
  reputation_score: number;
  risk_level: string;
  last_updated: number;
};

interface CreditScoreProps {
  metrics: ReputationMetrics;
  showDetails?: boolean;
  onViewHistory?: () => void;
  className?: string;
}

export function CreditScore({
  metrics,
  showDetails = false,
  onViewHistory,
  className
}: CreditScoreProps) {
  const creditScore = metrics.credit_score || metrics.reputation_score * 5.5 + 300;

  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600';
    if (score >= 670) return 'text-blue-600';
    if (score >= 580) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 740) return 'bg-green-100 border-green-300';
    if (score >= 670) return 'bg-blue-100 border-blue-300';
    if (score >= 580) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getCreditDescription = (score: number) => {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    if (score >= 500) return 'Poor';
    return 'Very Poor';
  };

  const getRiskTierColor = (tier: string) => {
    switch (tier) {
      case 'Prime': return 'text-green-700 bg-green-100';
      case 'Near Prime': return 'text-blue-700 bg-blue-100';
      case 'Subprime': return 'text-yellow-700 bg-yellow-100';
      case 'Deep Subprime': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Credit Score</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>FICO-style credit score based on DeFi lending history and financial behavior</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Credit Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "w-24 h-24 rounded-full flex flex-col items-center justify-center text-2xl font-bold border-4",
              getScoreBgColor(creditScore)
            )}>
              <span className={getScoreColor(creditScore)}>
                {Math.round(creditScore)}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                FICO
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {metrics.credit_grade || 'B'}
              </div>
              <div className="text-lg text-muted-foreground">
                {getCreditDescription(creditScore)}
              </div>
              <div className={cn(
                "text-sm px-3 py-1 rounded-full inline-block mt-2",
                getRiskTierColor(metrics.risk_assessment?.risk_tier || 'Near Prime')
              )}>
                {metrics.risk_assessment?.risk_tier || 'Near Prime'}
              </div>
            </div>
          </div>

          {onViewHistory && (
            <Button variant="outline" size="sm" onClick={onViewHistory}>
              View History
            </Button>
          )}
        </div>

        {/* Credit Score Range Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>300</span>
            <span>Credit Score Range</span>
            <span>850</span>
          </div>
          <div className="relative h-3 bg-gradient-to-r from-red-200 via-yellow-200 via-blue-200 to-green-200 rounded-full">
            <div
              className="absolute top-0 w-3 h-3 bg-white border-2 border-gray-800 rounded-full transform -translate-x-1/2"
              style={{ left: `${((creditScore - 300) / 550) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Max Loan Amount</div>
            <div className="font-semibold text-lg">
              {formatCurrency(metrics.risk_assessment?.max_recommended_loan || '0')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Interest Rate</div>
            <div className="font-semibold text-lg">
              {metrics.risk_assessment?.recommended_interest_rate || 16}% APR
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Default Risk</div>
            <div className="font-semibold text-lg">
              {metrics.risk_assessment?.probability_of_default || 20}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Collateral Required</div>
            <div className="font-semibold text-lg">
              {metrics.risk_assessment?.collateral_requirement || 160}%
            </div>
          </div>
        </div>

        {/* Credit Factors Breakdown */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-lg flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Credit Factors
            </h4>

            {/* Payment History */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium">Payment History</span>
                  <span className="text-xs text-muted-foreground">(35%)</span>
                </div>
                <span className="text-sm font-semibold">
                  {metrics.payment_history?.payment_history_score || 50}/100
                </span>
              </div>
              <div className="text-xs text-muted-foreground ml-5">
                {metrics.payment_history?.on_time_payments || 0} on-time payments,
                {metrics.payment_history?.defaults || 0} defaults
              </div>
            </div>

            {/* Credit Utilization */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium">Credit Utilization</span>
                  <span className="text-xs text-muted-foreground">(30%)</span>
                </div>
                <span className="text-sm font-semibold">
                  {metrics.credit_utilization?.utilization_ratio?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground ml-5">
                {formatCurrency(metrics.credit_utilization?.current_debt || '0')} of{' '}
                {formatCurrency(metrics.credit_utilization?.total_credit_limit || '0')} used
              </div>
            </div>

            {/* Credit History Length */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm font-medium">Credit History</span>
                  <span className="text-xs text-muted-foreground">(15%)</span>
                </div>
                <span className="text-sm font-semibold">
                  {metrics.credit_history?.account_age_days || 0} days
                </span>
              </div>
            </div>

            {/* Credit Mix */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-sm font-medium">Credit Mix</span>
                  <span className="text-xs text-muted-foreground">(10%)</span>
                </div>
                <span className="text-sm font-semibold">
                  {metrics.credit_mix?.defi_protocols_used?.length || 0} protocols
                </span>
              </div>
            </div>

            {/* New Credit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium">New Credit</span>
                  <span className="text-xs text-muted-foreground">(10%)</span>
                </div>
                <span className="text-sm font-semibold">
                  {metrics.new_credit?.recent_loan_applications || 0} recent
                </span>
              </div>
            </div>
          </div>
        )}

        {/* DeFi Activity Summary */}
        {showDetails && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-lg flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              DeFi Activity
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-medium">
                  {formatCurrency(metrics.defi_factors?.total_volume_transacted || '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Governance Votes</span>
                <span className="font-medium">
                  {metrics.defi_factors?.governance_participation || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yield Farming</span>
                <span className="font-medium">
                  {metrics.defi_factors?.yield_farming_experience || 0} positions
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidations</span>
                <span className={cn(
                  "font-medium",
                  (metrics.defi_factors?.liquidation_events || 0) > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {metrics.defi_factors?.liquidation_events || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
          <span>Last updated: {new Date(metrics.last_updated).toLocaleString()}</span>
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Next update in 24h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Credit Score Badge Component
 */
interface CreditScoreBadgeProps {
  score: number;
  grade?: string;
  size?: 'sm' | 'md' | 'lg';
  showGrade?: boolean;
  className?: string;
}

export function CreditScoreBadge({
  score,
  grade,
  size = 'md',
  showGrade = true,
  className
}: CreditScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600 bg-green-100 border-green-300';
    if (score >= 670) return 'text-blue-600 bg-blue-100 border-blue-300';
    if (score >= 580) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn(
        "rounded-full flex items-center justify-center font-bold border-2",
        getScoreColor(score),
        sizeClasses[size]
      )}>
        {Math.round(score)}
      </div>
      {showGrade && grade && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{grade}</span>
          <span className="text-xs text-muted-foreground">Grade</span>
        </div>
      )}
    </div>
  );
}

export default CreditScore;