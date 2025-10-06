/**
 * Simple Credit Service
 * 
 * Simplified version for testing credit score functionality
 */

import { noditService } from './noditService';
import type { TransactionInfo } from '../utils/noditTypes';

/**
 * Simplified credit score metrics
 */
export interface SimpleCreditMetrics {
  address: string;
  credit_score: number; // 300-850 range
  credit_grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  risk_tier: 'Prime' | 'Near Prime' | 'Subprime' | 'Deep Subprime';

  // Payment factors
  payment_score: number; // 0-100
  utilization_score: number; // 0-100
  history_score: number; // 0-100

  // Risk assessment
  probability_of_default: number; // 0-100%
  max_recommended_loan: string;
  recommended_interest_rate: number; // APR %
  collateral_requirement: number; // % of loan value

  // Traditional metrics for compatibility
  transaction_count: number;
  total_volume: string;
  unique_counterparties: number;
  governance_participation: number;
  // reputation_score removed
  risk_level: 'low' | 'medium' | 'high';
  last_updated: number;
}

/**
 * Simple Credit Service class
 */
export class SimpleCreditService {
  /**
   * Calculate credit score for an address
   */
  async calculateCreditScore(address: string): Promise<SimpleCreditMetrics> {
    try {
      // Get basic analysis data from Nodit
      const basicReputation = await noditService.getAddressReputation(address);

      // Get transaction history
      const transactionHistory = await noditService.getAccountTransactionHistory(address, { limit: 100 });

      // Calculate credit score components
      const paymentScore = this.calculatePaymentScore(transactionHistory.transactions);
      const utilizationScore = this.calculateUtilizationScore(transactionHistory.transactions);
      const historyScore = this.calculateHistoryScore(transactionHistory.transactions);

      // Calculate final credit score (300-850 range)
      const creditScore = this.calculateFinalCreditScore(paymentScore, utilizationScore, historyScore);

      // Determine credit grade and risk tier
      const creditGrade = this.getCreditGrade(creditScore);
      const riskTier = this.getRiskTier(creditScore);

      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(creditScore, paymentScore);

      return {
        address,
        credit_score: creditScore,
        credit_grade: creditGrade,
        risk_tier: riskTier,

        payment_score: paymentScore,
        utilization_score: utilizationScore,
        history_score: historyScore,

        probability_of_default: riskAssessment.probability_of_default,
        max_recommended_loan: riskAssessment.max_recommended_loan,
        recommended_interest_rate: riskAssessment.recommended_interest_rate,
        collateral_requirement: riskAssessment.collateral_requirement,

        // Traditional metrics
        transaction_count: basicReputation.transaction_count,
        total_volume: basicReputation.total_volume,
        unique_counterparties: basicReputation.unique_counterparties,
        governance_participation: this.calculateGovernanceParticipation(transactionHistory.transactions),
        // reputation_score removed
        risk_level: this.mapToRiskLevel(creditScore),
        last_updated: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to calculate credit score for ${address}:`, error);
      return this.getDefaultCreditScore(address);
    }
  }

  /**
   * Calculate payment history score (0-100)
   */
  private calculatePaymentScore(transactions: TransactionInfo[]): number {
    if (transactions.length === 0) return 50; // Neutral for no history

    const failedTxs = transactions.filter(tx => !tx.success).length;
    const successRate = (transactions.length - failedTxs) / transactions.length;

    // Base score on success rate
    let score = successRate * 100;

    // Bonus for high transaction count (shows activity)
    if (transactions.length > 50) score += 10;
    else if (transactions.length > 20) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate credit utilization score (0-100)
   */
  private calculateUtilizationScore(transactions: TransactionInfo[]): number {
    // Simplified: assume good utilization if user has regular activity
    if (transactions.length === 0) return 100; // No debt is good

    // Check for consistent activity (good utilization pattern)
    const recentTxs = transactions.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return txTime > thirtyDaysAgo;
    });

    // Score based on recent activity consistency
    if (recentTxs.length > 10) return 90;
    if (recentTxs.length > 5) return 80;
    if (recentTxs.length > 0) return 70;
    return 60; // No recent activity
  }

  /**
   * Calculate credit history length score (0-100)
   */
  private calculateHistoryScore(transactions: TransactionInfo[]): number {
    if (transactions.length === 0) return 0;

    const firstTx = transactions[transactions.length - 1];
    const accountAgeMs = Date.now() - new Date(firstTx.timestamp).getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Score based on account age
    if (accountAgeDays > 730) return 100; // 2+ years
    if (accountAgeDays > 365) return 80;  // 1+ years
    if (accountAgeDays > 180) return 60;  // 6+ months
    if (accountAgeDays > 90) return 40;   // 3+ months
    if (accountAgeDays > 30) return 20;   // 1+ months
    return 10; // Less than 1 month
  }

  /**
   * Calculate final credit score (300-850 range)
   */
  private calculateFinalCreditScore(paymentScore: number, utilizationScore: number, historyScore: number): number {
    // Weighted average (FICO-style weights)
    const weightedScore = (
      paymentScore * 0.35 +      // Payment history: 35%
      utilizationScore * 0.30 +  // Credit utilization: 30%
      historyScore * 0.15 +      // Credit history: 15%
      75 * 0.20                  // Credit mix + new credit: 20% (default to 75)
    );

    // Map 0-100 to 300-850 range
    const creditScore = 300 + (weightedScore / 100) * 550;

    return Math.round(Math.max(300, Math.min(850, creditScore)));
  }

  /**
   * Get credit grade based on score
   */
  private getCreditGrade(score: number): SimpleCreditMetrics['credit_grade'] {
    if (score >= 800) return 'A+';
    if (score >= 740) return 'A';
    if (score >= 670) return 'B+';
    if (score >= 580) return 'B';
    if (score >= 500) return 'C+';
    if (score >= 400) return 'C';
    if (score >= 350) return 'D';
    return 'F';
  }

  /**
   * Get risk tier based on score
   */
  private getRiskTier(score: number): SimpleCreditMetrics['risk_tier'] {
    if (score >= 660) return 'Prime';
    if (score >= 580) return 'Near Prime';
    if (score >= 500) return 'Subprime';
    return 'Deep Subprime';
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment(creditScore: number, paymentScore: number) {
    // Probability of default
    let probabilityOfDefault = 0;
    if (creditScore >= 750) probabilityOfDefault = 2;
    else if (creditScore >= 700) probabilityOfDefault = 5;
    else if (creditScore >= 650) probabilityOfDefault = 10;
    else if (creditScore >= 600) probabilityOfDefault = 20;
    else if (creditScore >= 550) probabilityOfDefault = 35;
    else probabilityOfDefault = 50;

    // Adjust based on payment score
    if (paymentScore < 50) probabilityOfDefault += 15;

    // Max recommended loan
    const baseAmount = Math.max(0, (creditScore - 300) * 100);
    const maxLoan = Math.round(baseAmount);

    // Interest rate
    let interestRate = 25; // Base rate
    if (creditScore >= 750) interestRate = 5;
    else if (creditScore >= 700) interestRate = 8;
    else if (creditScore >= 650) interestRate = 12;
    else if (creditScore >= 600) interestRate = 16;
    else if (creditScore >= 550) interestRate = 20;

    // Collateral requirement
    let collateralRequirement = 200; // 200% for lowest scores
    if (creditScore >= 750) collateralRequirement = 110;
    else if (creditScore >= 700) collateralRequirement = 125;
    else if (creditScore >= 650) collateralRequirement = 140;
    else if (creditScore >= 600) collateralRequirement = 160;
    else if (creditScore >= 550) collateralRequirement = 180;

    return {
      probability_of_default: Math.min(100, probabilityOfDefault),
      max_recommended_loan: maxLoan.toString(),
      recommended_interest_rate: interestRate,
      collateral_requirement: collateralRequirement,
    };
  }

  /**
   * Calculate governance participation
   */
  private calculateGovernanceParticipation(transactions: TransactionInfo[]): number {
    return transactions.filter(tx =>
      tx.events?.some(event =>
        event.type.toLowerCase().includes('vote') ||
        event.type.toLowerCase().includes('governance') ||
        event.type.toLowerCase().includes('proposal')
      )
    ).length;
  }

  /**
   * Map credit score to traditional risk level
   */
  private mapToRiskLevel(creditScore: number): 'low' | 'medium' | 'high' {
    if (creditScore >= 670) return 'low';
    if (creditScore >= 580) return 'medium';
    return 'high';
  }

  /**
   * Get default credit score for new addresses
   */
  private getDefaultCreditScore(address: string): SimpleCreditMetrics {
    return {
      address,
      credit_score: 580, // Fair credit score
      credit_grade: 'B',
      risk_tier: 'Near Prime',

      payment_score: 50,
      utilization_score: 100,
      history_score: 0,

      probability_of_default: 20,
      max_recommended_loan: '5000',
      recommended_interest_rate: 16,
      collateral_requirement: 160,

      transaction_count: 0,
      total_volume: '0',
      unique_counterparties: 0,
      governance_participation: 0,
      // reputation_score removed
      risk_level: 'medium',
      last_updated: Date.now(),
    };
  }
}

// Export singleton instance
export const simpleCreditService = new SimpleCreditService();

export default simpleCreditService;