"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { getKYCProfile as getUserKYCProfile, type KYCProfile } from "@/view-functions/getKYCProfile";
import { getChainName, type SupportedChainName } from "@/entry-functions/ccipBridge";

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

interface ComplianceVerificationProps {
  amount: number;
  token: string;
  destinationChain: number;
  recipient: string;
  onComplianceResult: (result: ComplianceResult) => void;
  showDetails?: boolean;
}

// Mock sanctions list (in production, this would be from a real sanctions API)
const MOCK_SANCTIONS_LIST = [
  '0x1234567890abcdef1234567890abcdef12345678',
  '0xabcdef1234567890abcdef1234567890abcdef12',
  // Add more mock sanctioned addresses
];

// Transaction limits by KYC level (in USD equivalent)
const TRANSACTION_LIMITS = {
  none: { daily: 100, monthly: 500, single: 50 },
  basic: { daily: 1000, monthly: 5000, single: 500 },
  enhanced: { daily: 10000, monthly: 50000, single: 5000 },
  institutional: { daily: 100000, monthly: 1000000, single: 50000 }
};

// High-risk chains that require enhanced KYC
const HIGH_RISK_CHAINS: number[] = [
  // Add chain selectors that require enhanced compliance
];

// Velocity check thresholds (number of transactions in time period)
const VELOCITY_LIMITS = {
  hourly: 10,
  daily: 50,
  weekly: 200
};

export function ComplianceVerification({
  amount,
  token,
  destinationChain,
  recipient,
  onComplianceResult,
  showDetails = true
}: ComplianceVerificationProps) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();

  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Mock user transaction history (in production, this would come from backend)
  const [userTransactionHistory] = useState({
    today: { count: 5, volume: 2500 },
    thisMonth: { count: 45, volume: 15000 },
    thisHour: { count: 2, volume: 500 },
    thisWeek: { count: 20, volume: 8000 }
  });

  // Load KYC profile
  useEffect(() => {
    const loadKYCProfile = async () => {
      if (!connected || !account?.address || !hasProfile || !isActive) {
        setKycProfile(null);
        return;
      }

      try {
        const profile = await getUserKYCProfile(account.address.toString());
        setKycProfile(profile);
      } catch (err) {
        console.error('Error loading KYC profile:', err);
        setKycProfile(null);
      }
    };

    loadKYCProfile();
  }, [connected, account, hasProfile, isActive]);

  // Run compliance checks when inputs change
  useEffect(() => {
    if (!connected || !account?.address || amount <= 0) {
      setComplianceResult(null);
      return;
    }

    runComplianceChecks();
  }, [connected, account, amount, token, destinationChain, recipient, kycProfile]);

  // Notify parent of compliance result changes
  useEffect(() => {
    if (complianceResult) {
      onComplianceResult(complianceResult);
    }
  }, [complianceResult, onComplianceResult]);

  const runComplianceChecks = async () => {
    setLoading(true);

    try {
      const checks: ComplianceCheck[] = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const recommendedActions: string[] = [];

      // 1. KYC Level Check
      const kycCheck = checkKYCLevel();
      checks.push(kycCheck);
      if (kycCheck.status === 'failed') {
        riskLevel = 'critical';
        if (kycCheck.requiredAction) {
          recommendedActions.push(kycCheck.requiredAction);
        }
      }

      // 2. Transaction Limit Check
      const limitCheck = checkTransactionLimits();
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
      const sanctionsCheck = await checkSanctionsScreening();
      checks.push(sanctionsCheck);
      if (sanctionsCheck.status === 'failed') {
        riskLevel = 'critical';
        if (sanctionsCheck.requiredAction) {
          recommendedActions.push(sanctionsCheck.requiredAction);
        }
      }

      // 4. Chain Restriction Check
      const chainCheck = checkChainRestrictions();
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
      const velocityCheck = checkVelocityLimits();
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

      const result: ComplianceResult = {
        approved,
        checks,
        riskLevel,
        recommendedActions
      };

      setComplianceResult(result);
    } catch (err) {
      console.error('Error running compliance checks:', err);

      // Create a failed result
      const result: ComplianceResult = {
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

      setComplianceResult(result);
    } finally {
      setLoading(false);
    }
  };

  const checkKYCLevel = (): ComplianceCheck => {
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
    const kycLevel = kycProfile.kycLevel;

    // Check if KYC level is sufficient for transaction amount
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
  };

  const checkTransactionLimits = (): ComplianceCheck => {
    const kycLevel = kycProfile?.verificationLevel || 'none';
    const limits = TRANSACTION_LIMITS[kycLevel];
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
    const dailyUsed = userTransactionHistory.today.volume;
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
    const monthlyUsed = userTransactionHistory.thisMonth.volume;
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
  };

  const checkSanctionsScreening = async (): Promise<ComplianceCheck> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check recipient against sanctions list
    const isSanctioned = MOCK_SANCTIONS_LIST.includes(recipient.toLowerCase());

    if (isSanctioned) {
      return {
        type: 'sanctions_screening',
        status: 'failed',
        message: 'Recipient on sanctions list',
        details: 'The recipient address appears on a sanctions screening list',
        requiredAction: 'Transaction blocked - contact compliance team'
      };
    }

    // Check user's own address (shouldn't happen, but good practice)
    const userSanctioned = account?.address && MOCK_SANCTIONS_LIST.includes(account.address.toString().toLowerCase());

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
  };

  const checkChainRestrictions = (): ComplianceCheck => {
    const chainName = getChainName(destinationChain);
    const isHighRisk = HIGH_RISK_CHAINS.includes(destinationChain);
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

    // Check for jurisdiction restrictions (mock logic)
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
  };

  const checkVelocityLimits = (): ComplianceCheck => {
    const hourlyCount = userTransactionHistory.thisHour.count;
    const dailyCount = userTransactionHistory.today.count;
    const weeklyCount = userTransactionHistory.thisWeek.count;

    if (hourlyCount >= VELOCITY_LIMITS.hourly) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Hourly transaction limit exceeded',
        details: `You have made ${hourlyCount} transactions in the past hour (limit: ${VELOCITY_LIMITS.hourly})`,
        requiredAction: 'Wait before making another transaction'
      };
    }

    if (dailyCount >= VELOCITY_LIMITS.daily) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Daily transaction count limit exceeded',
        details: `You have made ${dailyCount} transactions today (limit: ${VELOCITY_LIMITS.daily})`,
        requiredAction: 'Wait until tomorrow to make more transactions'
      };
    }

    if (weeklyCount >= VELOCITY_LIMITS.weekly) {
      return {
        type: 'velocity_check',
        status: 'failed',
        message: 'Weekly transaction count limit exceeded',
        details: `You have made ${weeklyCount} transactions this week (limit: ${VELOCITY_LIMITS.weekly})`,
        requiredAction: 'Wait until next week to make more transactions'
      };
    }

    // Warning if approaching limits
    if (hourlyCount >= VELOCITY_LIMITS.hourly * 0.8) {
      return {
        type: 'velocity_check',
        status: 'warning',
        message: 'Approaching hourly transaction limit',
        details: `${hourlyCount}/${VELOCITY_LIMITS.hourly} hourly transactions used`,
      };
    }

    return {
      type: 'velocity_check',
      status: 'passed',
      message: 'Velocity checks passed',
      details: `Hourly: ${hourlyCount}/${VELOCITY_LIMITS.hourly}, Daily: ${dailyCount}/${VELOCITY_LIMITS.daily}, Weekly: ${weeklyCount}/${VELOCITY_LIMITS.weekly}`
    };
  };

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed': return 'text-green-700 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-700 bg-red-50 border-red-200';
      case 'pending': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'critical': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (!connected || !account?.address) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h3 className="text-blue-800 font-medium">Running Compliance Checks</h3>
            <p className="text-blue-700 text-sm">Verifying transaction compliance...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!complianceResult) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Compliance Summary */}
      <div className={`border rounded-lg p-4 ${complianceResult.approved
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {complianceResult.approved ? '✅' : '❌'}
            </span>
            <div>
              <h3 className={`font-medium ${complianceResult.approved ? 'text-green-800' : 'text-red-800'
                }`}>
                {complianceResult.approved ? 'Compliance Approved' : 'Compliance Failed'}
              </h3>
              <p className={`text-sm ${complianceResult.approved ? 'text-green-700' : 'text-red-700'
                }`}>
                {complianceResult.approved
                  ? 'Transaction meets all compliance requirements'
                  : 'Transaction does not meet compliance requirements'
                }
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(complianceResult.riskLevel)}`}>
              Risk: {complianceResult.riskLevel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Recommended Actions */}
        {complianceResult.recommendedActions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {complianceResult.recommendedActions.map((action, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Checks */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Compliance Check Details:</h4>

          {complianceResult.checks.map((check, index) => (
            <div key={index} className={`border rounded-lg p-3 ${getStatusColor(check.status)}`}>
              <div className="flex items-start space-x-3">
                <span className="text-lg flex-shrink-0">
                  {getStatusIcon(check.status)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium capitalize">
                      {check.type.replace('_', ' ')}
                    </h5>
                    <span className="text-xs font-medium capitalize">
                      {check.status}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{check.message}</p>
                  {check.details && (
                    <p className="text-xs mt-1 opacity-75">{check.details}</p>
                  )}
                  {check.requiredAction && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                      <strong>Action Required:</strong> {check.requiredAction}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}