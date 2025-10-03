"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "./useProfileStatus";
import { getUserKYCProfile, type KYCProfile } from "@/view-functions/getKYCProfile";
import { getChainName } from "@/entry-functions/ccipBridge";

export interface ComplianceCheck {
  type: 'kyc_level' | 'transaction_limit' | 'sanctions_screening' | 'chain_restriction' | 'velocity_check';
  status: 'passed' | 'failed' | 'warning' | 'pending';
  message: string;
  details?: string;
  requiredAction?: string;
}

export interface ComplianceResult {
  approved: boolean;
  checks: ComplianceCheck[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
}

export interface TransactionLimits {
  daily: number;
  monthly: number;
  single: number;
}

export interface ComplianceConfig {
  transactionLimits: Record<string, TransactionLimits>;
  highRiskChains: number[];
  velocityLimits: {
    hourly: number;
    daily: number;
    weekly: number;
  };
  sanctionsList: string[];
}

// Default compliance configuration
const DEFAULT_CONFIG: ComplianceConfig = {
  transactionLimits: {
    none: { daily: 100, monthly: 500, single: 50 },
    basic: { daily: 1000, monthly: 5000, single: 500 },
    enhanced: { daily: 10000, monthly: 50000, single: 5000 },
    institutional: { daily: 100000, monthly: 1000000, single: 50000 }
  },
  highRiskChains: [],
  velocityLimits: {
    hourly: 10,
    daily: 50,
    weekly: 200
  },
  sanctionsList: [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0xabcdef1234567890abcdef1234567890abcdef12'
  ]
};

export function useCompliance(config: Partial<ComplianceConfig> = {}) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();

  const [loading, setLoading] = useState(false);
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);

  const complianceConfig = { ...DEFAULT_CONFIG, ...config };

  // Load KYC profile
  const loadKYCProfile = useCallback(async () => {
    if (!connected || !account?.address || !hasProfile || !isActive) {
      setKycProfile(null);
      return null;
    }

    try {
      const profile = await getUserKYCProfile(account.address.toString());
      setKycProfile(profile);
      return profile;
    } catch (err) {
      console.error('Error loading KYC profile:', err);
      setKycProfile(null);
      return null;
    }
  }, [connected, account, hasProfile, isActive]);

  // Get user transaction history (mock implementation)
  const getUserTransactionHistory = useCallback(async () => {
    // In a real implementation, this would fetch from backend
    return {
      today: { count: 5, volume: 2500 },
      thisMonth: { count: 45, volume: 15000 },
      thisHour: { count: 2, volume: 500 },
      thisWeek: { count: 20, volume: 8000 }
    };
  }, []);

  // Check KYC level compliance
  const checkKYCLevel = useCallback((
    amount: number,
    kycProfile: KYCProfile | null
  ): ComplianceCheck => {
    if (!hasProfile || !isActive) {
      return {
        type: 'kyc_level',
        status: 'failed',
        message: 'DID profile required',
        details: 'A verified DID profile is required for cross-chain transactions',
        requiredAction: 'Create and activate your DID profile'
      };
    }

    if (!kycProfile) {
      return {
        type: 'kyc_level',
        status: 'failed',
        message: 'KYC verification required',
        details: 'KYC verification is required for cross-chain transactions',
        requiredAction: 'Complete KYC verification process'
      };
    }

    const usdAmount = amount * 8.45; // Mock APT to USD conversion
    const kycLevel = kycProfile.verificationLevel;

    if (usdAmount > 5000 && kycLevel === 'basic') {
      return {
        type: 'kyc_level',
        status: 'failed',
        message: 'Enhanced KYC required',
        details: `Transactions over $5,000 require Enhanced KYC verification. Current level: ${kycLevel}`,
        requiredAction: 'Upgrade to Enhanced KYC verification'
      };
    }

    if (usdAmount > 50000 && kycLevel !== 'institutional') {
      return {
        type: 'kyc_level',
        status: 'failed',
        message: 'Institutional KYC required',
        details: `Transactions over $50,000 require Institutional KYC verification. Current level: ${kycLevel}`,
        requiredAction: 'Upgrade to Institutional KYC verification'
      };
    }

    return {
      type: 'kyc_level',
      status: 'passed',
      message: `KYC verification sufficient (${kycLevel})`,
      details: `Your ${kycLevel} KYC level supports this transaction amount`
    };
  }, [hasProfile, isActive]);

  // Check transaction limits
  const checkTransactionLimits = useCallback((
    amount: number,
    kycLevel: string,
    transactionHistory: any
  ): ComplianceCheck => {
    const limits = complianceConfig.transactionLimits[kycLevel] || complianceConfig.transactionLimits.none;
    const usdAmount = amount * 8.45; // Mock conversion

    // Check single transaction limit
    if (usdAmount > limits.single) {
      return {
        type: 'transaction_limit',
        status: 'failed',
        message: 'Single transaction limit exceeded',
        details: `Transaction amount ($${usdAmount.toFixed(2)}) exceeds single transaction limit ($${limits.single})`,
        requiredAction: 'Reduce transaction amount or upgrade KYC level'
      };
    }

    // Check daily limit
    const dailyUsed = transactionHistory.today.volume;
    const dailyRemaining = limits.daily - dailyUsed;

    if (usdAmount > dailyRemaining) {
      return {
        type: 'transaction_limit',
        status: 'failed',
        message: 'Daily transaction limit exceeded',
        details: `Transaction would exceed daily limit. Used: $${dailyUsed}, Limit: $${limits.daily}, Remaining: $${dailyRemaining.toFixed(2)}`,
        requiredAction: 'Wait until tomorrow or upgrade KYC level'
      };
    }

    // Check monthly limit
    const monthlyUsed = transactionHistory.thisMonth.volume;
    const monthlyRemaining = limits.monthly - monthlyUsed;

    if (usdAmount > monthlyRemaining) {
      return {
        type: 'transaction_limit',
        status: 'failed',
        message: 'Monthly transaction limit exceeded',
        details: `Transaction would exceed monthly limit. Used: $${monthlyUsed}, Limit: $${limits.monthly}, Remaining: $${monthlyRemaining.toFixed(2)}`,
        requiredAction: 'Wait until next month or upgrade KYC level'
      };
    }

    // Warning if approaching limits
    if (usdAmount > dailyRemaining * 0.8) {
      return {
        type: 'transaction_limit',
        status: 'warning',
        message: 'Approaching daily limit',
        details: `Transaction will use ${((usdAmount / dailyRemaining) * 100).toFixed(1)}% of remaining daily limit`,
      };
    }

    return {
      type: 'transaction_limit',
      status: 'passed',
      message: 'Transaction limits satisfied',
      details: `Daily remaining: $${dailyRemaining.toFixed(2)}, Monthly remaining: $${monthlyRemaining.toFixed(2)}`
    };
  }, [complianceConfig.transactionLimits]);

  // Check sanctions screening
  const checkSanctionsScreening = useCallback(async (
    recipient: string,
    userAddress?: string
  ): Promise<ComplianceCheck> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check recipient against sanctions list
    const isSanctioned = complianceConfig.sanctionsList.includes(recipient.toLowerCase());

    if (isSanctioned) {
      return {
        type: 'sanctions_screening',
        status: 'failed',
        message: 'Recipient on sanctions list',
        details: 'The recipient address appears on a sanctions screening list',
        requiredAction: 'Transaction blocked - contact compliance team'
      };
    }

    // Check user's own address
    const userSanctioned = userAddress && complianceConfig.sanctionsList.includes(userAddress.toLowerCase());

    if (userSanctioned) {
      return {
        type: 'sanctions_screening',
        status: 'failed',
        message: 'Account restricted',
        details: 'Your account has compliance restrictions',
        requiredAction: 'Contact compliance team for assistance'
      };
    }

    return {
      type: 'sanctions_screening',
      status: 'passed',
      message: 'Sanctions screening passed',
      details: 'No sanctions matches found for sender or recipient'
    };
  }, [complianceConfig.sanctionsList]);

  // Check chain restrictions
  const checkChainRestrictions = useCallback((
    destinationChain: number,
    amount: number,
    kycProfile: KYCProfile | null
  ): ComplianceCheck => {
    const chainName = getChainName(destinationChain);
    const isHighRisk = complianceConfig.highRiskChains.includes(destinationChain);
    const kycLevel = kycProfile?.verificationLevel || 'none';

    if (isHighRisk && kycLevel !== 'enhanced' && kycLevel !== 'institutional') {
      return {
        type: 'chain_restriction',
        status: 'failed',
        message: 'Enhanced KYC required for destination chain',
        details: `${chainName} requires Enhanced or Institutional KYC verification`,
        requiredAction: 'Upgrade to Enhanced KYC verification'
      };
    }

    // Check for jurisdiction restrictions
    const userCountry = kycProfile?.countryCode;
    const restrictedCountries = ['XX', 'YY']; // Mock restricted countries

    if (userCountry && restrictedCountries.includes(userCountry)) {
      return {
        type: 'chain_restriction',
        status: 'failed',
        message: 'Geographic restriction',
        details: `Transactions to ${chainName} are not available in your jurisdiction`,
        requiredAction: 'Choose a different destination chain'
      };
    }

    // Warning for high-value transactions to certain chains
    const usdAmount = amount * 8.45;
    if (usdAmount > 10000 && chainName === 'ETHEREUM') {
      return {
        type: 'chain_restriction',
        status: 'warning',
        message: 'High-value transaction to Ethereum',
        details: 'Large transactions to Ethereum may have additional monitoring',
      };
    }

    return {
      type: 'chain_restriction',
      status: 'passed',
      message: 'Chain restrictions satisfied',
      details: `No restrictions found for transactions to ${chainName}`
    };
  }, [complianceConfig.highRiskChains]);

  // Check velocity limits
  const checkVelocityLimits = useCallback((
    transactionHistory: any
  ): ComplianceCheck => {
    const { hourly, daily, weekly } = complianceConfig.velocityLimits;
    const hourlyCount = transactionHistory.thisHour.count;
    const dailyCount = transactionHistory.today.count;
    const weeklyCount = transactionHistory.thisWeek.count;

    if (hourlyCount >= hourly) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Hourly transaction limit exceeded',
        details: `You have made ${hourlyCount} transactions in the past hour (limit: ${hourly})`,
        requiredAction: 'Wait before making another transaction'
      };
    }

    if (dailyCount >= daily) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Daily transaction count limit exceeded',
        details: `You have made ${dailyCount} transactions today (limit: ${daily})`,
        requiredAction: 'Wait until tomorrow to make more transactions'
      };
    }

    if (weeklyCount >= weekly) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Weekly transaction count limit exceeded',
        details: `You have made ${weeklyCount} transactions this week (limit: ${weekly})`,
        requiredAction: 'Wait until next week to make more transactions'
      };
    }

    // Warning if approaching limits
    if (hourlyCount >= hourly * 0.8) {
      return {
        type: 'velocity_check',
        status: 'warning',
        message: 'Approaching hourly transaction limit',
        details: `${hourlyCount}/${hourly} hourly transactions used`,
      };
    }

    return {
      type: 'velocity_check',
      status: 'passed',
      message: 'Velocity checks passed',
      details: `Hourly: ${hourlyCount}/${hourly}, Daily: ${dailyCount}/${daily}, Weekly: ${weeklyCount}/${weekly}`
    };
  }, [complianceConfig.velocityLimits]);

  // Run comprehensive compliance check
  const runComplianceCheck = useCallback(async (
    amount: number,
    token: string,
    destinationChain: number,
    recipient: string
  ): Promise<ComplianceResult> => {
    setLoading(true);

    try {
      const checks: ComplianceCheck[] = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const recommendedActions: string[] = [];

      // Load required data
      const [kycProfile, transactionHistory] = await Promise.all([
        loadKYCProfile(),
        getUserTransactionHistory()
      ]);

      // 1. KYC Level Check
      const kycCheck = checkKYCLevel(amount, kycProfile);
      checks.push(kycCheck);
      if (kycCheck.status === 'failed') {
        riskLevel = 'critical';
        if (kycCheck.requiredAction) {
          recommendedActions.push(kycCheck.requiredAction);
        }
      }

      // 2. Transaction Limit Check
      const limitCheck = checkTransactionLimits(
        amount,
        kycProfile?.verificationLevel || 'none',
        transactionHistory
      );
      checks.push(limitCheck);
      if (limitCheck.status === 'failed') {
        riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
        if (limitCheck.requiredAction) {
          recommendedActions.push(limitCheck.requiredAction);
        }
      } else if (limitCheck.status === 'warning') {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // 3. Sanctions Screening
      const sanctionsCheck = await checkSanctionsScreening(recipient, account?.address?.toString());
      checks.push(sanctionsCheck);
      if (sanctionsCheck.status === 'failed') {
        riskLevel = 'critical';
        if (sanctionsCheck.requiredAction) {
          recommendedActions.push(sanctionsCheck.requiredAction);
        }
      }

      // 4. Chain Restriction Check
      const chainCheck = checkChainRestrictions(destinationChain, amount, kycProfile);
      checks.push(chainCheck);
      if (chainCheck.status === 'failed') {
        riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
        if (chainCheck.requiredAction) {
          recommendedActions.push(chainCheck.requiredAction);
        }
      } else if (chainCheck.status === 'warning') {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // 5. Velocity Check
      const velocityCheck = checkVelocityLimits(transactionHistory);
      checks.push(velocityCheck);
      if (velocityCheck.status === 'failed') {
        riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
        if (velocityCheck.requiredAction) {
          recommendedActions.push(velocityCheck.requiredAction);
        }
      } else if (velocityCheck.status === 'warning') {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      const approved = checks.every(check => check.status === 'passed' || check.status === 'warning');

      return {
        approved,
        checks,
        riskLevel,
        recommendedActions
      };
    } catch (err) {
      console.error('Error running compliance checks:', err);

      return {
        approved: false,
        checks: [{
          type: 'kyc_level',
          status: 'failed',
          message: 'Compliance check failed',
          details: 'Unable to verify compliance requirements',
          requiredAction: 'Please try again or contact support'
        }],
        riskLevel: 'critical',
        recommendedActions: ['Contact support for assistance']
      };
    } finally {
      setLoading(false);
    }
  }, [
    loadKYCProfile,
    getUserTransactionHistory,
    checkKYCLevel,
    checkTransactionLimits,
    checkSanctionsScreening,
    checkChainRestrictions,
    checkVelocityLimits,
    account
  ]);

  // Get current compliance status for user
  const getComplianceStatus = useCallback(async () => {
    const kycProfile = await loadKYCProfile();
    const transactionHistory = await getUserTransactionHistory();

    return {
      kycProfile,
      transactionHistory,
      hasProfile,
      isActive,
      connected
    };
  }, [loadKYCProfile, getUserTransactionHistory, hasProfile, isActive, connected]);

  return {
    // State
    loading,
    kycProfile,

    // Actions
    runComplianceCheck,
    getComplianceStatus,
    loadKYCProfile,

    // Individual checks (for custom usage)
    checkKYCLevel,
    checkTransactionLimits,
    checkSanctionsScreening,
    checkChainRestrictions,
    checkVelocityLimits,

    // Configuration
    complianceConfig
  };
}