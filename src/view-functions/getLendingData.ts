import { aptosClient } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export interface LendingPool {
  tokenSymbol: string;
  totalLiquidity: number;
  totalBorrowed: number;
  baseRate: number;
  utilizationRate: number;
  supplyAPY: number;
  borrowAPY: number;
  reserveFactor: number;
  isActive: boolean;
}

export interface UserLoan {
  loanId: string;
  borrower: string;
  tokenSymbol: string;
  amount: number;
  collateralAmount: number;
  interestRate: number;
  startTime: number;
  duration: number;
  isActive: boolean;
  totalRepaid: number;
  healthFactor: number;
  nextPaymentDate: number;
  paymentAmount: number;
  paymentFrequency: string; // 'weekly', 'monthly', 'custom'
}

export interface LendingPosition {
  tokenSymbol: string;
  suppliedAmount: number;
  earnedInterest: number;
  currentAPY: number;
  shares: number;
}

export interface LoanHealthData {
  healthFactor: number;
  liquidationThreshold: number;
  collateralValue: number;
  borrowedValue: number;
  availableToBorrow: number;
  liquidationPrice: number;
}

export interface AutoPaymentSchedule {
  loanId: string;
  enabled: boolean;
  frequency: string;
  amount: number;
  nextPaymentDate: number;
  sourceAccount: string;
  failureCount: number;
  lastPaymentDate?: number;
}

/**
 * Get all available lending pools
 */
export const getLendingPools = async (): Promise<LendingPool[]> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::get_all_pools`,
        functionArguments: [],
      },
    });

    if (result && Array.isArray(result[0])) {
      return (result[0] as any[]).map((pool: any) => ({
        tokenSymbol: pool.token_symbol,
        totalLiquidity: parseInt(pool.total_liquidity),
        totalBorrowed: parseInt(pool.total_borrowed),
        baseRate: parseInt(pool.base_rate),
        utilizationRate: parseInt(pool.utilization_rate),
        supplyAPY: calculateSupplyAPY(parseInt(pool.utilization_rate), parseInt(pool.base_rate)),
        borrowAPY: calculateBorrowAPY(parseInt(pool.utilization_rate), parseInt(pool.base_rate)),
        reserveFactor: parseInt(pool.reserve_factor || 1000), // 10% default
        isActive: pool.is_active,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching lending pools:", error);
    return [];
  }
};

/**
 * Get user's lending positions (supplied liquidity)
 */
export const getUserLendingPositions = async (userAddress: string): Promise<LendingPosition[]> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::get_user_supply_positions`,
        functionArguments: [userAddress],
      },
    });

    if (result && Array.isArray(result[0])) {
      return (result[0] as any[]).map((position: any) => ({
        tokenSymbol: position.token_symbol,
        suppliedAmount: parseInt(position.supplied_amount),
        earnedInterest: parseInt(position.earned_interest),
        currentAPY: parseInt(position.current_apy),
        shares: parseInt(position.shares),
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching user lending positions:", error);
    return [];
  }
};

/**
 * Get user's active loans
 */
export const getUserLoans = async (userAddress: string): Promise<UserLoan[]> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::get_user_loans`,
        functionArguments: [userAddress],
      },
    });

    if (result && Array.isArray(result[0])) {
      return (result[0] as any[]).map((loan: any) => {
        const healthFactor = calculateHealthFactor(
          parseInt(loan.collateral_amount),
          parseInt(loan.amount),
          loan.token_symbol
        );

        return {
          loanId: loan.loan_id,
          borrower: loan.borrower,
          tokenSymbol: loan.token_symbol,
          amount: parseInt(loan.amount),
          collateralAmount: parseInt(loan.collateral_amount),
          interestRate: parseInt(loan.interest_rate),
          startTime: parseInt(loan.start_time),
          duration: parseInt(loan.duration),
          isActive: loan.is_active,
          totalRepaid: parseInt(loan.total_repaid),
          healthFactor,
          nextPaymentDate: calculateNextPaymentDate(
            parseInt(loan.start_time),
            parseInt(loan.duration),
            parseInt(loan.total_repaid),
            parseInt(loan.amount)
          ),
          paymentAmount: calculatePaymentAmount(
            parseInt(loan.amount),
            parseInt(loan.interest_rate),
            parseInt(loan.duration)
          ),
          paymentFrequency: 'monthly', // Default to monthly
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching user loans:", error);
    return [];
  }
};

/**
 * Get loan health data for a specific user and token
 */
export const getLoanHealth = async (
  userAddress: string,
  tokenSymbol: string
): Promise<LoanHealthData | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::calculate_loan_health`,
        functionArguments: [userAddress, tokenSymbol],
      },
    });

    if (result && result.length >= 6) {
      return {
        healthFactor: parseInt(result[0] as string) / 10000, // Convert from basis points
        liquidationThreshold: parseInt(result[1] as string) / 10000,
        collateralValue: parseInt(result[2] as string),
        borrowedValue: parseInt(result[3] as string),
        availableToBorrow: parseInt(result[4] as string),
        liquidationPrice: parseInt(result[5] as string),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching loan health:", error);
    return null;
  }
};

/**
 * Get auto payment schedule for a loan
 */
export const getAutoPaymentSchedule = async (loanId: string): Promise<AutoPaymentSchedule | null> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::get_auto_payment_schedule`,
        functionArguments: [loanId],
      },
    });

    if (result && result.length >= 7) {
      return {
        loanId,
        enabled: result[0] as boolean,
        frequency: result[1] as string,
        amount: parseInt(result[2] as string),
        nextPaymentDate: parseInt(result[3] as string),
        sourceAccount: result[4] as string,
        failureCount: parseInt(result[5] as string),
        lastPaymentDate: result[6] ? parseInt(result[6] as string) : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching auto payment schedule:", error);
    return null;
  }
};

/**
 * Check if user can borrow based on KYC level and limits
 */
export const canUserBorrow = async (
  userAddress: string,
  amount: number,
  tokenSymbol: string
): Promise<{ canBorrow: boolean; reason?: string; maxAmount?: number }> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::check_borrow_eligibility`,
        functionArguments: [userAddress, amount.toString(), tokenSymbol],
      },
    });

    if (result && result.length >= 1) {
      const canBorrow = result[0] as boolean;
      const reason = result[1] as string || undefined;
      const maxAmount = result[2] ? parseInt(result[2] as string) : undefined;

      return { canBorrow, reason, maxAmount };
    }
    return { canBorrow: false, reason: "Unable to check eligibility" };
  } catch (error) {
    console.error("Error checking borrow eligibility:", error);
    return { canBorrow: false, reason: "Error checking eligibility" };
  }
};

// Helper functions for calculations
function calculateSupplyAPY(utilizationRate: number, baseRate: number): number {
  // Simple APY calculation: baseRate * utilizationRate * (1 - reserveFactor)
  const reserveFactor = 0.1; // 10%
  return (baseRate * utilizationRate * (1 - reserveFactor)) / 10000;
}

function calculateBorrowAPY(utilizationRate: number, baseRate: number): number {
  // Borrow APY increases with utilization
  const slope1 = 0.04; // 4% slope before kink
  const slope2 = 0.6;  // 60% slope after kink
  const kink = 0.8;    // 80% utilization kink

  const utilization = utilizationRate / 10000;

  if (utilization <= kink) {
    return baseRate + (slope1 * utilization * 10000);
  } else {
    return baseRate + (slope1 * kink * 10000) + (slope2 * (utilization - kink) * 10000);
  }
}

function calculateHealthFactor(
  collateralAmount: number,
  borrowedAmount: number,
  tokenSymbol: string
): number {
  // Simplified health factor calculation
  // In production, this would use real-time oracle prices
  const liquidationThreshold = 0.8; // 80%
  const collateralValue = collateralAmount; // Assume 1:1 for now
  const borrowedValue = borrowedAmount;

  if (borrowedValue === 0) return 999; // No debt = very healthy

  return (collateralValue * liquidationThreshold) / borrowedValue;
}

function calculateNextPaymentDate(
  startTime: number,
  duration: number,
  totalRepaid: number,
  totalAmount: number
): number {
  // Calculate next payment date based on monthly payments
  const monthlyPayments = Math.ceil(duration / (30 * 24 * 60 * 60)); // Convert duration to months
  const paymentsMade = Math.floor((totalRepaid / totalAmount) * monthlyPayments);
  const nextPaymentNumber = paymentsMade + 1;

  return startTime + (nextPaymentNumber * 30 * 24 * 60 * 60); // Add months in seconds
}

function calculatePaymentAmount(
  principal: number,
  interestRate: number,
  duration: number
): number {
  // Calculate monthly payment using standard loan formula
  const monthlyRate = (interestRate / 10000) / 12; // Convert from basis points to monthly rate
  const numPayments = Math.ceil(duration / (30 * 24 * 60 * 60)); // Duration in months

  if (monthlyRate === 0) return principal / numPayments;

  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}