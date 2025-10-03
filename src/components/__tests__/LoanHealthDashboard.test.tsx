import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoanHealthDashboard } from '../LoanHealthDashboard';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import * as lendingData from '@/view-functions/getLendingData';
import * as oracleData from '@/view-functions/getOracleData';

// Mock the hooks and functions
jest.mock('@aptos-labs/wallet-adapter-react');
jest.mock('@/view-functions/getLendingData');
jest.mock('@/view-functions/getOracleData');
jest.mock('@/hooks/useTransactionManager', () => ({
  useTransactionManager: () => ({
    submitTransaction: jest.fn(),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockGetLoanHealth = lendingData.getLoanHealth as jest.MockedFunction<typeof lendingData.getLoanHealth>;
const mockGetLatestPrice = oracleData.getLatestPrice as jest.MockedFunction<typeof oracleData.getLatestPrice>;

const mockLoan = {
  loanId: 'test-loan-1',
  borrower: '0x123',
  tokenSymbol: 'APT',
  amount: 100000000000, // 1000 APT in octas
  collateralAmount: 200000000000, // 2000 APT in octas
  interestRate: 500, // 5%
  startTime: Date.now() / 1000,
  duration: 365 * 24 * 60 * 60, // 1 year
  isActive: true,
  totalRepaid: 0,
  healthFactor: 1.6,
  nextPaymentDate: Date.now() / 1000 + 30 * 24 * 60 * 60,
  paymentAmount: 10000000000, // 100 APT
  paymentFrequency: 'monthly',
};

const mockHealthData = {
  healthFactor: 1.6,
  liquidationThreshold: 0.8,
  collateralValue: 200000000000,
  borrowedValue: 100000000000,
  availableToBorrow: 50000000000,
  liquidationPrice: 62500000000,
};

describe('LoanHealthDashboard', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      account: { address: { toString: () => '0x123' } },
      connected: true,
    } as any);

    mockGetLoanHealth.mockResolvedValue(mockHealthData);
    mockGetLatestPrice.mockResolvedValue([10000000000, 500]); // $100, +5%

    // Mock browser APIs
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    } as any;

    global.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loan health dashboard with loan data', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    await waitFor(() => {
      expect(screen.getByText('APT Loan')).toBeInTheDocument();
      expect(screen.getByText('1.60')).toBeInTheDocument(); // Health factor
      expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    });
  });

  it('shows real-time monitoring status', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    await waitFor(() => {
      expect(screen.getByText('Real-time Monitoring Active')).toBeInTheDocument();
      expect(screen.getByText(/Updating every \d+ seconds/)).toBeInTheDocument();
    });
  });

  it('displays alert settings when expanded', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    const showSettingsButton = screen.getByText('Show Settings');
    fireEvent.click(showSettingsButton);

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Enable browser notifications')).toBeInTheDocument();
      expect(screen.getByText('Enable sound alerts for critical risks')).toBeInTheDocument();
    });
  });

  it('shows collateral manager when manage collateral is clicked', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    await waitFor(() => {
      const manageCollateralButton = screen.getByText('Manage Collateral');
      fireEvent.click(manageCollateralButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Collateral Management')).toBeInTheDocument();
      expect(screen.getByText('Add Collateral')).toBeInTheDocument();
      expect(screen.getByText('Remove Collateral')).toBeInTheDocument();
    });
  });

  it('generates critical alert for low health factor', async () => {
    const criticalLoan = {
      ...mockLoan,
      healthFactor: 1.1,
    };

    const criticalHealthData = {
      ...mockHealthData,
      healthFactor: 1.1,
    };

    mockGetLoanHealth.mockResolvedValue(criticalHealthData);

    render(<LoanHealthDashboard loans={[criticalLoan]} />);

    await waitFor(() => {
      expect(screen.getByText('Critical Risk')).toBeInTheDocument();
      expect(screen.getByText('1.10')).toBeInTheDocument();
    });
  });

  it('updates alert thresholds', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    const showSettingsButton = screen.getByText('Show Settings');
    fireEvent.click(showSettingsButton);

    await waitFor(() => {
      const criticalThresholdInput = screen.getByDisplayValue('1.2');
      fireEvent.change(criticalThresholdInput, { target: { value: '1.3' } });
      expect(criticalThresholdInput).toHaveValue(1.3);
    });
  });

  it('shows no loans message when no loans provided', () => {
    render(<LoanHealthDashboard loans={[]} />);

    expect(screen.getByText('No active loans to monitor')).toBeInTheDocument();
    expect(screen.getByText('Your loan health metrics will appear here')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockGetLoanHealth.mockImplementation(() => new Promise(() => { })); // Never resolves

    render(<LoanHealthDashboard loans={[mockLoan]} />);

    expect(screen.getByText('Loading health data...')).toBeInTheDocument();
  });

  it('toggles monitoring interval settings', async () => {
    render(<LoanHealthDashboard loans={[mockLoan]} />);

    const showSettingsButton = screen.getByText('Show Settings');
    fireEvent.click(showSettingsButton);

    await waitFor(() => {
      const intervalSelect = screen.getByDisplayValue('30 seconds');
      fireEvent.change(intervalSelect, { target: { value: '60' } });
      expect(intervalSelect).toHaveValue('60');
    });
  });
});