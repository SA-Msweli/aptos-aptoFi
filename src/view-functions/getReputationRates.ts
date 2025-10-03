import { aptosClient } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getReputationData } from "./getProfile";
import { getKYCProfile, KYC_LEVELS } from "./getKYCProfile";

export interface ReputationTier {
  name: string;
  minScore: number;
  maxScore: number;
  discountPercentage: number;
  color: string;
  bgColor: string;
  benefits: string[];
  unsecuredLimit: number;
}

export interface PersonalizedRate {
  baseRate: number;
  personalizedRate: number;
  totalDiscount: number;
  reputationDiscount: number;
  kycDiscount: number;
  volumeDiscount: number;
  tier: ReputationTier;
  annualSavings: number;
}

export interface RateHistory {
  date: string;
  rate: number;
  tier: string;
  reputationScore: number;
}

export interface RateImprovement {
  nextTier: ReputationTier | null;
  pointsNeeded: number;
  potentialSavings: number;
  suggestions: string[];
}

export const REPUTATION_TIERS: ReputationTier[] = [
  {
    name: "New User",
    minScore: 0,
    maxScore: 199,
    discountPercentage: 0,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    benefits: ["Standard rates", "Basic support", "Secured loans only"],
    unsecuredLimit: 0
  },
  {
    name: "Bronze",
    minScore: 200,
    maxScore: 499,
    discountPercentage: 2,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    benefits: ["2% rate discount", "Priority support", "Extended payment terms"],
    unsecuredLimit: 1000
  },
  {
    name: "Silver",
    minScore: 500,
    maxScore: 999,
    discountPercentage: 5,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-300",
    benefits: ["5% rate discount", "Flexible payment schedules", "Lower collateral requirements"],
    unsecuredLimit: 2500
  },
  {
    name: "Gold",
    minScore: 1000,
    maxScore: 1999,
    discountPercentage: 10,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    benefits: ["10% rate discount", "Unsecured loans up to $5K", "Premium support"],
    unsecuredLimit: 5000
  },
  {
    name: "Platinum",
    minScore: 2000,
    maxScore: 4999,
    discountPercentage: 15,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    benefits: ["15% rate discount", "Unsecured loans up to $25K", "Dedicated account manager"],
    unsecuredLimit: 25000
  },
  {
    name: "Diamond",
    minScore: 5000,
    maxScore: Infinity,
    discountPercentage: 20,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    benefits: ["20% rate discount", "Unlimited unsecured loans", "Institutional rates"],
    unsecuredLimit: 100000
  }
];

/**
 * Get reputation tier based on score
 */
export const getReputationTier = (score: number): ReputationTier => {
  return REPUTATION_TIERS.find(tier =>
    score >= tier.minScore && score <= tier.maxScore
  ) || REPUTATION_TIERS[0];
};

/**
 * Calculate personalized interest rate based on reputation and KYC
 */
export const calculatePersonalizedRate = async (
  userAddress: string,
  baseRate: number,
  tokenSymbol: string,
  loanAmount: number = 0
): Promise<PersonalizedRate | null> => {
  try {
    // Get user reputation and KYC data
    const [reputationData, kycProfile] = await Promise.all([
      getReputationData(userAddress),
      getKYCProfile(userAddress)
    ]);

    if (!reputationData) {
      return null;
    }

    const tier = getReputationTier(reputationData.totalScore);
    const kycLevel = kycProfile?.kycLevel || KYC_LEVELS.NONE;

    // Calculate reputation discount
    const reputationDiscount = (baseRate * tier.discountPercentage) / 100;

    // Calculate KYC level discount
    const kycDiscounts = {
      [KYC_LEVELS.NONE]: 0,
      [KYC_LEVELS.BASIC]: baseRate * 0.01, // 1% discount
      [KYC_LEVELS.ENHANCED]: baseRate * 0.03, // 3% discount
      [KYC_LEVELS.INSTITUTIONAL]: baseRate * 0.05, // 5% discount
    };
    const kycDiscount = kycDiscounts[kycLevel as keyof typeof kycDiscounts] || 0;

    // Calculate volume discount (larger loans get better rates)
    let volumeDiscount = 0;
    if (loanAmount > 100000) volumeDiscount = baseRate * 0.02; // 2% for loans > $100K
    else if (loanAmount > 50000) volumeDiscount = baseRate * 0.01; // 1% for loans > $50K

    const totalDiscount = reputationDiscount + kycDiscount + volumeDiscount;
    const personalizedRate = Math.max(baseRate * 0.5, baseRate - totalDiscount); // Minimum 50% of base rate
    const annualSavings = loanAmount > 0 ? (loanAmount * totalDiscount) / 10000 : 0;

    return {
      baseRate,
      personalizedRate,
      totalDiscount,
      reputationDiscount,
      kycDiscount,
      volumeDiscount,
      tier,
      annualSavings
    };
  } catch (error) {
    console.error("Error calculating personalized rate:", error);
    return null;
  }
};

/**
 * Get historical rate data for a user
 */
export const getUserRateHistory = async (
  userAddress: string,
  tokenSymbol: string,
  months: number = 6
): Promise<RateHistory[]> => {
  try {
    // In a real implementation, this would fetch from contract events or stored data
    // For now, we'll simulate historical data based on current reputation
    const reputationData = await getReputationData(userAddress);
    if (!reputationData) return [];

    const history: RateHistory[] = [];
    const now = new Date();
    const currentScore = reputationData.totalScore;

    // Get base rate for the token (simplified - would come from lending pool)
    const baseRate = 500; // 5% in basis points

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);

      // Simulate score progression (assuming gradual improvement)
      const historicalScore = Math.max(0, currentScore - (i * 50));
      const tier = getReputationTier(historicalScore);

      // Calculate historical rate
      const reputationDiscount = (baseRate * tier.discountPercentage) / 100;
      const historicalRate = baseRate - reputationDiscount;

      history.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        rate: historicalRate,
        tier: tier.name,
        reputationScore: historicalScore
      });
    }

    return history;
  } catch (error) {
    console.error("Error fetching rate history:", error);
    return [];
  }
};

/**
 * Get rate improvement suggestions for a user
 */
export const getRateImprovementSuggestions = async (
  userAddress: string,
  loanAmount: number = 10000
): Promise<RateImprovement | null> => {
  try {
    const reputationData = await getReputationData(userAddress);
    if (!reputationData) return null;

    const currentTier = getReputationTier(reputationData.totalScore);
    const nextTier = REPUTATION_TIERS.find(tier => tier.minScore > reputationData.totalScore);

    if (!nextTier) {
      return {
        nextTier: null,
        pointsNeeded: 0,
        potentialSavings: 0,
        suggestions: ["You've reached the highest tier! Maintain your excellent reputation."]
      };
    }

    const pointsNeeded = nextTier.minScore - reputationData.totalScore;
    const currentDiscount = currentTier.discountPercentage;
    const nextDiscount = nextTier.discountPercentage;
    const additionalDiscount = nextDiscount - currentDiscount;
    const potentialSavings = (loanAmount * additionalDiscount) / 100; // Annual savings

    const suggestions = [
      "Make on-time loan payments (+10-50 points per payment)",
      "Complete additional KYC verification (+25-100 points)",
      "Maintain healthy loan positions (+5-20 points per month)",
      "Participate in governance voting (+5-15 points per vote)",
      "Refer new verified users (+20-50 points per referral)",
      "Supply liquidity to lending pools (+10-30 points per month)",
      "Use cross-chain features (+5-15 points per transaction)"
    ];

    return {
      nextTier,
      pointsNeeded,
      potentialSavings,
      suggestions
    };
  } catch (error) {
    console.error("Error getting improvement suggestions:", error);
    return null;
  }
};

/**
 * Get all available rates for different reputation tiers (for comparison)
 */
export const getAllTierRates = (baseRate: number, loanAmount: number = 0): Array<{
  tier: ReputationTier;
  rate: number;
  annualSavings: number;
}> => {
  return REPUTATION_TIERS.map(tier => {
    const discount = (baseRate * tier.discountPercentage) / 100;
    const rate = baseRate - discount;
    const annualSavings = loanAmount > 0 ? (loanAmount * discount) / 10000 : 0;

    return {
      tier,
      rate,
      annualSavings
    };
  });
};

/**
 * Check if user qualifies for unsecured lending based on reputation
 */
export const getUnsecuredLendingLimit = async (userAddress: string): Promise<{
  qualified: boolean;
  limit: number;
  tier: ReputationTier;
  requirements?: string[];
}> => {
  try {
    const reputationData = await getReputationData(userAddress);
    if (!reputationData) {
      return {
        qualified: false,
        limit: 0,
        tier: REPUTATION_TIERS[0],
        requirements: ["Complete profile setup", "Build reputation through secured loans"]
      };
    }

    const tier = getReputationTier(reputationData.totalScore);
    const qualified = tier.unsecuredLimit > 0;

    if (!qualified) {
      const nextTier = REPUTATION_TIERS.find(t => t.unsecuredLimit > 0);
      const pointsNeeded = nextTier ? nextTier.minScore - reputationData.totalScore : 0;

      return {
        qualified: false,
        limit: 0,
        tier,
        requirements: [
          `Reach ${nextTier?.name || 'Bronze'} tier (${pointsNeeded} more points)`,
          "Complete KYC verification",
          "Maintain good payment history"
        ]
      };
    }

    return {
      qualified: true,
      limit: tier.unsecuredLimit,
      tier
    };
  } catch (error) {
    console.error("Error checking unsecured lending qualification:", error);
    return {
      qualified: false,
      limit: 0,
      tier: REPUTATION_TIERS[0],
      requirements: ["Error checking qualification"]
    };
  }
};

/**
 * Get performance metrics for reputation-based lending
 */
export const getReputationPerformanceMetrics = async (userAddress: string): Promise<{
  totalLoans: number;
  onTimePayments: number;
  paymentSuccessRate: number;
  averageHealthFactor: number;
  totalInterestSaved: number;
  reputationGrowth: number;
} | null> => {
  try {
    // This would typically fetch from contract events and stored data
    // For now, we'll return simulated metrics based on reputation
    const reputationData = await getReputationData(userAddress);
    if (!reputationData) return null;

    // Simulate metrics based on reputation score
    const score = reputationData.totalScore;
    const totalLoans = Math.floor(score / 100);
    const onTimePayments = Math.floor(totalLoans * 0.95); // 95% success rate
    const paymentSuccessRate = totalLoans > 0 ? (onTimePayments / totalLoans) * 100 : 0;
    const averageHealthFactor = 2.5 + (score / 1000); // Higher score = better health
    const totalInterestSaved = score * 10; // $10 saved per reputation point
    const reputationGrowth = Math.min(50, score / 10); // Points gained in last 30 days

    return {
      totalLoans,
      onTimePayments,
      paymentSuccessRate,
      averageHealthFactor,
      totalInterestSaved,
      reputationGrowth
    };
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return null;
  }
};