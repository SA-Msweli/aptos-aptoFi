import { render, screen, waitFor } from '@testing-library/react';
import { ReputationRateDisplay } from '../ReputationRateDisplay';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getReputationData } from '@/view-functions/getProfile';
import { getKYCProfile } from '@/view-functions/getKYCProfile';
import { calculatePersonalizedRate } from '@/view-functions/getReputationRates';

// Mock the dependencies
jest.mock('@aptos-labs/wallet-adapter-react');
jest.mock('@/view-functions/getProfile');
jest.mock('@/view-functions/getKYCProfile');
jest.mock('@/view-functions/getReputationRates');

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockGetReputationData = getReputationData as jest.MockedFunction<typeof getReputationData>;
const mockGetKYCProfile = getKYCProfile as jest.MockedFunction<typeof getKYCProfile>;
const mockCalculatePersonalizedRate = calculatePersonalizedRate as jest.MockedFunction<typeof calculatePersonalizedRate>;

describe('ReputationRateDisplay', () => {
  const mockAccount = {
    address: { toString: () => '0x123' }
  };

  const mockReputationData = {
    totalScore: 1500,
    baseScore: 1000,
    transactionScore: 300,
    lendingScore: 200,
    governanceScore: 0,
    referralScore: 0
  };

  const mockKYCProfile = {
    kycLevel: 2, // Enhanced
    profileHash: 'hash',
    fullNameHash: 'name_hash',
    countryCode: 'US',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const mockPersonalizedRate = {
    baseRate: 500, // 5%
    personalizedRate: 450, // 4.5%
    totalDiscount: 50,
    reputationDiscount: 30,
    kycDiscount: 15,
    volumeDiscount: 5,
    tier: {
      name: 'Gold',
      minScore: 1000,
      maxScore: 1999,
      discountPercentage: 10,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      benefits: ['10% rate discount', 'Unsecured loans up to $5K', 'Premium support'],
      unsecuredLimit: 5000
    },
    annualSavings: 500
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWallet.mockReturnValue({
      connected: true,
      account: mockAccount,
      signAndSubmitTransaction: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
      wallet: null,
      wallets: [],
      connecting: false,
      disconnecting: false
    });

    mockGetReputationData.mockResolvedValue(mockReputationData);
    mockGetKYCProfile.mockResolvedValue(mockKYCProfile);
    mockCalculatePersonalizedRate.mockResolvedValue(mockPersonalizedRate);
  });

  it('should display personalized rate for connected user', async () => {
    render(
      <ReputationRateDisplay
        baseRate={500}
        tokenSymbol="USDC"
        loanAmount={10000}
        showDetails={true}
      />
    );

    // Should show loading initially
    expect(screen.getByText('Loading personalized rates...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Your Personalized Rate')).toBeInTheDocument();
    });

    // Should display the personalized rate
    await waitFor(() => {
      expect(screen.getByText('4.50%')).toBeInTheDocument();
    });

    // Should display tier information
    expect(screen.getByText('Gold Tier')).toBeInTheDocument();
    expect(screen.getByText('10% Discount')).toBeInTheDocument();

    // Should display savings
    expect(screen.getByText('Save 0.50% vs base rate')).toBeInTheDocument();
  });

  it('should display connect wallet message when not connected', () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      account: null,
      signAndSubmitTransaction: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
      wallet: null,
      wallets: [],
      connecting: false,
      disconnecting: false
    });

    render(
      <ReputationRateDisplay
        baseRate={500}
        tokenSymbol="USDC"
        showDetails={false}
      />
    );

    expect(screen.getByText('Connect wallet to see personalized rates')).toBeInTheDocument();
    expect(screen.getByText('Base rate: 5.00%')).toBeInTheDocument();
  });

  it('should calculate rate breakdown correctly', async () => {
    render(
      <ReputationRateDisplay
        baseRate={500}
        tokenSymbol="USDC"
        loanAmount={10000}
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rate Breakdown')).toBeInTheDocument();
    });

    // Should show breakdown components
    expect(screen.getByText('Base Rate (USDC)')).toBeInTheDocument();
    expect(screen.getByText('5.00%')).toBeInTheDocument();

    expect(screen.getByText('Reputation Discount (Gold)')).toBeInTheDocument();
    expect(screen.getByText('-0.30%')).toBeInTheDocument();

    expect(screen.getByText('KYC Level Discount')).toBeInTheDocument();
    expect(screen.getByText('-0.15%')).toBeInTheDocument();
  });

  it('should show improvement suggestions for next tier', async () => {
    // Mock a user close to next tier
    const mockLowerTierRate = {
      ...mockPersonalizedRate,
      tier: {
        name: 'Silver',
        minScore: 500,
        maxScore: 999,
        discountPercentage: 5,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 border-gray-300',
        benefits: ['5% rate discount', 'Flexible payment schedules'],
        unsecuredLimit: 2500
      }
    };

    mockCalculatePersonalizedRate.mockResolvedValue(mockLowerTierRate);

    render(
      <ReputationRateDisplay
        baseRate={500}
        tokenSymbol="USDC"
        loanAmount={10000}
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Improve Your Rate')).toBeInTheDocument();
    });

    // Should show ways to improve
    expect(screen.getByText(/Make on-time loan payments/)).toBeInTheDocument();
    expect(screen.getByText(/Complete additional KYC verification/)).toBeInTheDocument();
  });

  it('should call onRateCalculated callback when rate is calculated', async () => {
    const mockCallback = jest.fn();

    render(
      <ReputationRateDisplay
        baseRate={500}
        tokenSymbol="USDC"
        loanAmount={10000}
        onRateCalculated={mockCallback}
      />
    );

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(450, 50);
    });
  });
});