"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getReputationData, type ReputationData } from "@/view-functions/getProfile";
import { getKYCProfile, type KYCProfile, KYC_LEVELS } from "@/view-functions/getKYCProfile";
import {
  calculatePersonalizedRate,
  getUserRateHistory,
  getRateImprovementSuggestions,
  getAllTierRates,
  getUnsecuredLendingLimit,
  getReputationPerformanceMetrics,
  REPUTATION_TIERS,
  type PersonalizedRate,
  type RateHistory,
  type RateImprovement,
  type ReputationTier
} from "@/view-functions/getReputationRates";

interface ReputationRateDisplayProps {
  baseRate: number; // Base interest rate in basis points
  tokenSymbol: string;
  loanAmount?: number;
  showDetails?: boolean;
  onRateCalculated?: (personalizedRate: number, discount: number) => void;
}

interface PerformanceMetrics {
  totalLoans: number;
  onTimePayments: number;
  paymentSuccessRate: number;
  averageHealthFactor: number;
  totalInterestSaved: number;
  reputationGrowth: number;
}

export function ReputationRateDisplay({
  baseRate,
  tokenSymbol,
  loanAmount = 0,
  showDetails = true,
  onRateCalculated
}: ReputationRateDisplayProps) {
  const { account } = useWallet();
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [personalizedRate, setPersonalizedRate] = useState<PersonalizedRate | null>(null);
  const [historicalRates, setHistoricalRates] = useState<RateHistory[]>([]);
  const [rateImprovement, setRateImprovement] = useState<RateImprovement | null>(null);
  const [unsecuredLimit, setUnsecuredLimit] = useState<{ qualified: boolean; limit: number; tier: ReputationTier; requirements?: string[] } | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      loadPersonalizedData();
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      loadPersonalizedData();
    }
  }, [account, baseRate, loanAmount, tokenSymbol]);

  const loadPersonalizedData = async () => {
    if (!account) return;

    setLoading(true);
    try {
      const userAddress = account.address.toString();

      // Load all data in parallel
      const [
        reputation,
        kyc,
        personalizedRateData,
        historicalData,
        improvementData,
        unsecuredData,
        performanceData
      ] = await Promise.all([
        getReputationData(userAddress),
        getKYCProfile(userAddress),
        calculatePersonalizedRate(userAddress, baseRate, tokenSymbol, loanAmount),
        getUserRateHistory(userAddress, tokenSymbol, 6),
        getRateImprovementSuggestions(userAddress, loanAmount),
        getUnsecuredLendingLimit(userAddress),
        getReputationPerformanceMetrics(userAddress)
      ]);

      setReputationData(reputation);
      setKycProfile(kyc);
      setPersonalizedRate(personalizedRateData);
      setHistoricalRates(historicalData);
      setRateImprovement(improvementData);
      setUnsecuredLimit(unsecuredData);
      setPerformanceMetrics(performanceData);

      // Notify parent component of calculated rate
      if (personalizedRateData && onRateCalculated) {
        onRateCalculated(personalizedRateData.personalizedRate, personalizedRateData.totalDiscount);
      }
    } catch (error) {
      console.error("Failed to load personalized data:", error);
    } finally {
      setLoading(false);
    }
  };



  const getNextTierProgress = (): { nextTier: ReputationTier | null; progress: number; pointsNeeded: number } => {
    if (!personalizedRate || !reputationData) return { nextTier: null, progress: 0, pointsNeeded: 0 };

    const currentScore = reputationData.totalScore;
    const currentTier = personalizedRate.tier;
    const nextTier = REPUTATION_TIERS.find(tier => tier.minScore > currentScore);

    if (!nextTier) return { nextTier: null, progress: 100, pointsNeeded: 0 };

    const currentTierMax = currentTier.maxScore === Infinity ? currentScore : currentTier.maxScore;
    const progress = ((currentScore - currentTier.minScore) / (currentTierMax - currentTier.minScore)) * 100;
    const pointsNeeded = nextTier.minScore - currentScore;

    return { nextTier, progress: Math.min(100, progress), pointsNeeded };
  };

  const formatRate = (rate: number): string => {
    return `${(rate / 100).toFixed(2)}%`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading personalized rates...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-gray-50 rounded-lg border p-6 text-center">
        <p className="text-gray-600">Connect wallet to see personalized rates</p>
        <p className="text-gray-500 text-sm mt-1">Base rate: {formatRate(baseRate)}</p>
      </div>
    );
  }

  const nextTierInfo = getNextTierProgress();
  const currentTier = personalizedRate?.tier || REPUTATION_TIERS[0];

  return (
    <div className="space-y-6">
      {/* Current Rate Display */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Personalized Rate</h3>
              <p className="text-gray-600 text-sm">Based on your reputation and KYC level</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">
                {personalizedRate ? formatRate(personalizedRate.personalizedRate) : formatRate(baseRate)}
              </p>
              {personalizedRate && personalizedRate.totalDiscount > 0 && (
                <p className="text-green-600 text-sm">
                  Save {formatRate(personalizedRate.totalDiscount)} vs base rate
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Tier Status */}
        <div className="p-6">
          <div className={`rounded-lg border-2 p-4 ${currentTier.bgColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${currentTier.color.replace('text-', 'bg-')}`}></div>
                <div>
                  <h4 className={`font-semibold ${currentTier.color}`}>{currentTier.name} Tier</h4>
                  <p className="text-gray-600 text-sm">
                    Score: {reputationData?.totalScore || 0}
                    {currentTier.maxScore !== Infinity && ` / ${currentTier.maxScore}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${currentTier.color}`}>
                  {currentTier.discountPercentage}% Discount
                </p>
                {unsecuredLimit?.qualified && (
                  <p className="text-gray-600 text-xs">
                    Unsecured: {formatCurrency(unsecuredLimit.limit)}
                  </p>
                )}
              </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTierInfo.nextTier && (
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress to {nextTierInfo.nextTier.name}</span>
                  <span>{nextTierInfo.pointsNeeded} points needed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${currentTier.color.replace('text-', 'bg-')}`}
                    style={{ width: `${nextTierInfo.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Tier Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentTier.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rate Breakdown */}
      {showDetails && personalizedRate && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rate Breakdown</h3>
            <p className="text-gray-600 text-sm">How your personalized rate is calculated</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Rate ({tokenSymbol})</span>
              <span className="font-medium">{formatRate(personalizedRate.baseRate)}</span>
            </div>

            {personalizedRate.reputationDiscount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Reputation Discount ({currentTier.name})</span>
                <span>-{formatRate(personalizedRate.reputationDiscount)}</span>
              </div>
            )}

            {personalizedRate.kycDiscount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>KYC Level Discount</span>
                <span>-{formatRate(personalizedRate.kycDiscount)}</span>
              </div>
            )}

            {personalizedRate.volumeDiscount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Volume Discount</span>
                <span>-{formatRate(personalizedRate.volumeDiscount)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Your Final Rate</span>
                <span className="text-green-600">{formatRate(personalizedRate.personalizedRate)}</span>
              </div>
            </div>

            {personalizedRate.annualSavings > 0 && (
              <div className="bg-green-50 rounded-lg p-4 mt-4">
                <div className="text-center">
                  <p className="text-green-800 font-medium">Annual Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(personalizedRate.annualSavings)}
                  </p>
                  <p className="text-green-700 text-sm">
                    vs base rate on {formatCurrency(loanAmount)} loan
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {showDetails && performanceMetrics && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <p className="text-gray-600 text-sm">Your lending track record</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{performanceMetrics.totalLoans}</p>
                <p className="text-gray-600 text-sm">Total Loans</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{performanceMetrics.paymentSuccessRate.toFixed(1)}%</p>
                <p className="text-gray-600 text-sm">Payment Success</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{performanceMetrics.averageHealthFactor.toFixed(2)}</p>
                <p className="text-gray-600 text-sm">Avg Health Factor</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(performanceMetrics.totalInterestSaved)}</p>
                <p className="text-gray-600 text-sm">Interest Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">+{performanceMetrics.reputationGrowth}</p>
                <p className="text-gray-600 text-sm">Points (30d)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{performanceMetrics.onTimePayments}</p>
                <p className="text-gray-600 text-sm">On-Time Payments</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Rate Tracking */}
      {showDetails && historicalRates.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rate History</h3>
            <p className="text-gray-600 text-sm">Your rate improvements over time</p>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {historicalRates.map((entry, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-600 text-sm">{entry.date}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {entry.tier}
                    </span>
                    <span className="text-xs text-gray-500">
                      Score: {entry.reputationScore}
                    </span>
                  </div>
                  <span className="font-medium">{formatRate(entry.rate)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      {rateImprovement && rateImprovement.nextTier && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 text-xl">💡</span>
            <div className="flex-1">
              <h4 className="text-blue-800 font-medium mb-2">Improve Your Rate</h4>
              <p className="text-blue-700 text-sm mb-3">
                Reach {rateImprovement.nextTier.name} tier to unlock {rateImprovement.nextTier.discountPercentage}% discount.
                You need {rateImprovement.pointsNeeded} more reputation points.
              </p>

              {rateImprovement.potentialSavings > 0 && (
                <div className="bg-white rounded-lg p-3 mb-3">
                  <p className="text-center">
                    <span className="text-green-600 font-bold text-lg">
                      {formatCurrency(rateImprovement.potentialSavings)}
                    </span>
                    <span className="text-gray-600 text-sm ml-2">additional annual savings</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-blue-800 font-medium text-sm">Ways to improve your reputation:</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  {rateImprovement.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsecured Lending Qualification */}
      {unsecuredLimit && !unsecuredLimit.qualified && unsecuredLimit.requirements && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-600 text-xl">🔓</span>
            <div className="flex-1">
              <h4 className="text-yellow-800 font-medium mb-2">Unlock Unsecured Lending</h4>
              <p className="text-yellow-700 text-sm mb-3">
                Qualify for loans without collateral by meeting these requirements:
              </p>

              <ul className="text-yellow-700 text-sm space-y-1">
                {unsecuredLimit.requirements.map((requirement, index) => (
                  <li key={index}>• {requirement}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* All Tiers Overview */}
      {showDetails && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Reputation Tiers</h3>
            <p className="text-gray-600 text-sm">See what you can unlock</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getAllTierRates(baseRate, loanAmount).map(({ tier, rate, annualSavings }, index) => (
                <div
                  key={index}
                  className={`rounded-lg border-2 p-4 ${tier.name === currentTier.name
                    ? `${tier.bgColor} border-current`
                    : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${tier.name === currentTier.name ? tier.color : 'text-gray-600'}`}>
                      {tier.name}
                    </h4>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${tier.name === currentTier.name ? tier.color : 'text-gray-600'}`}>
                        {formatRate(rate)}
                      </span>
                      {tier.name === currentTier.name && (
                        <p className="text-xs text-green-600">Current</p>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs mb-2">
                    {tier.minScore} - {tier.maxScore === Infinity ? '∞' : tier.maxScore} points
                  </p>

                  {tier.unsecuredLimit > 0 && (
                    <p className="text-blue-600 text-xs mb-2">
                      Unsecured: {formatCurrency(tier.unsecuredLimit)}
                    </p>
                  )}

                  {annualSavings > 0 && (
                    <p className="text-green-600 text-xs mb-2">
                      Save: {formatCurrency(annualSavings)}/year
                    </p>
                  )}

                  <div className="space-y-1">
                    {tier.benefits.slice(0, 2).map((benefit, benefitIndex) => (
                      <p key={benefitIndex} className="text-xs text-gray-600">
                        • {benefit}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}