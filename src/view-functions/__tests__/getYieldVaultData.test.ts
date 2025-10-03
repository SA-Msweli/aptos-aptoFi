import {
  getAvailableVaults,
  getVaultInfo,
  getUserVaultPosition,
  getUserVaultPositions,
  getVaultAPY,
  getVaultStrategy,
  calculateWithdrawalAmount,
  getVaultPerformanceMetrics,
  getUserVaultSummary,
  getVaultsByStrategy,
  getTopPerformingVaults,
  checkDepositEligibility,
  getVaultHistoricalPerformance,
  formatAPY,
  getStrategyTypeName,
  getRiskLevelDescription,
  type VaultInfo,
  type VaultPosition,
  type VaultStrategy,
} from '../getYieldVaultData';

// Mock the aptos client
const mockAptos = {
  view: jest.fn(),
};

jest.mock('@/lib/aptos', () => ({
  aptos: mockAptos,
}));

jest.mock('@/lib/constants', () => ({
  CONTRACT_ADDRESSES: {
    YIELD_VAULT: '0x123456789abcdef',
  },
}));

describe('Yield Vault View Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableVaults', () => {
    it('should fetch and transform vault data correctly', async () => {
      const mockVaultData = [
        {
          id: '1',
          name: 'High Yield USDC Vault',
          token_symbol: 'USDC',
          total_deposits: '1000000000000',
          total_shares: '900000000000',
          strategy_type: '1',
          performance_fee: '500',
          management_fee: '200',
          last_harvest: '1640995200',
          total_rewards: '50000000000',
          is_active: true,
          created_at: '1640908800',
        },
      ];

      mockAptos.view.mockResolvedValue([mockVaultData]);

      const result = await getAvailableVaults();

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_all_vaults',
          typeArguments: [],
          functionArguments: [],
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'High Yield USDC Vault',
        tokenSymbol: 'USDC',
        totalDeposits: 1000000000000,
        totalShares: 900000000000,
        strategyType: 1,
        performanceFee: 500,
        managementFee: 200,
        lastHarvest: 1640995200,
        totalRewards: 50000000000,
        isActive: true,
        createdAt: 1640908800,
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Network error'));

      const result = await getAvailableVaults();

      expect(result).toEqual([]);
    });

    it('should handle multiple vaults', async () => {
      const mockVaultData = [
        {
          id: '1',
          name: 'Vault 1',
          token_symbol: 'APT',
          total_deposits: '1000000000',
          total_shares: '1000000000',
          strategy_type: '1',
          performance_fee: '500',
          management_fee: '200',
          last_harvest: '1640995200',
          total_rewards: '10000000',
          is_active: true,
          created_at: '1640908800',
        },
        {
          id: '2',
          name: 'Vault 2',
          token_symbol: 'USDC',
          total_deposits: '2000000000',
          total_shares: '1800000000',
          strategy_type: '2',
          performance_fee: '300',
          management_fee: '100',
          last_harvest: '1640995300',
          total_rewards: '20000000',
          is_active: false,
          created_at: '1640908900',
        },
      ];

      mockAptos.view.mockResolvedValue([mockVaultData]);

      const result = await getAvailableVaults();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[1].isActive).toBe(false);
    });
  });

  describe('getVaultInfo', () => {
    it('should fetch specific vault info correctly', async () => {
      const mockVaultData = {
        id: '5',
        name: 'Specific Vault',
        token_symbol: 'ETH',
        total_deposits: '500000000000',
        total_shares: '450000000000',
        strategy_type: '3',
        performance_fee: '750',
        management_fee: '300',
        last_harvest: '1640995400',
        total_rewards: '25000000000',
        is_active: true,
        created_at: '1640909000',
      };

      mockAptos.view.mockResolvedValue([mockVaultData]);

      const result = await getVaultInfo(5);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_vault_info',
          typeArguments: [],
          functionArguments: ['5'],
        },
      });

      expect(result).toEqual({
        id: 5,
        name: 'Specific Vault',
        tokenSymbol: 'ETH',
        totalDeposits: 500000000000,
        totalShares: 450000000000,
        strategyType: 3,
        performanceFee: 750,
        managementFee: 300,
        lastHarvest: 1640995400,
        totalRewards: 25000000000,
        isActive: true,
        createdAt: 1640909000,
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Vault not found'));

      const result = await getVaultInfo(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserVaultPosition', () => {
    it('should fetch user position correctly', async () => {
      const mockPositionData = {
        shares: '100000000000',
        deposit_time: '1640995500',
        total_deposited: '1000000000000',
        total_withdrawn: '200000000000',
      };

      mockAptos.view.mockResolvedValue([mockPositionData]);

      const result = await getUserVaultPosition('0x123456789abcdef', 1);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_user_position',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', '1'],
        },
      });

      expect(result).toEqual({
        shares: 100000000000,
        depositTime: 1640995500,
        totalDeposited: 1000000000000,
        totalWithdrawn: 200000000000,
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Position not found'));

      const result = await getUserVaultPosition('0x123456789abcdef', 1);

      expect(result).toBeNull();
    });
  });

  describe('getUserVaultPositions', () => {
    it('should fetch all user positions with vault info', async () => {
      const mockPositionsData = [
        {
          vault_id: '1',
          shares: '100000000000',
          deposit_time: '1640995500',
          total_deposited: '1000000000000',
          total_withdrawn: '0',
        },
        {
          vault_id: '2',
          shares: '200000000000',
          deposit_time: '1640995600',
          total_deposited: '2000000000000',
          total_withdrawn: '500000000000',
        },
      ];

      const mockVaultInfo1 = {
        id: '1',
        name: 'Vault 1',
        token_symbol: 'APT',
        total_deposits: '1000000000',
        total_shares: '1000000000',
        strategy_type: '1',
        performance_fee: '500',
        management_fee: '200',
        last_harvest: '1640995200',
        total_rewards: '10000000',
        is_active: true,
        created_at: '1640908800',
      };

      const mockVaultInfo2 = {
        id: '2',
        name: 'Vault 2',
        token_symbol: 'USDC',
        total_deposits: '2000000000',
        total_shares: '1800000000',
        strategy_type: '2',
        performance_fee: '300',
        management_fee: '100',
        last_harvest: '1640995300',
        total_rewards: '20000000',
        is_active: true,
        created_at: '1640908900',
      };

      mockAptos.view
        .mockResolvedValueOnce([mockPositionsData])
        .mockResolvedValueOnce([mockVaultInfo1])
        .mockResolvedValueOnce([mockVaultInfo2]);

      const result = await getUserVaultPositions('0x123456789abcdef');

      expect(result).toHaveLength(2);
      expect(result[0].shares).toBe(100000000000);
      expect(result[0].vaultInfo.name).toBe('Vault 1');
      expect(result[1].shares).toBe(200000000000);
      expect(result[1].vaultInfo.name).toBe('Vault 2');
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getUserVaultPositions('0x123456789abcdef');

      expect(result).toEqual([]);
    });
  });

  describe('getVaultAPY', () => {
    it('should fetch vault APY correctly', async () => {
      mockAptos.view.mockResolvedValue(['1250']); // 12.5% APY

      const result = await getVaultAPY(1);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::calculate_vault_apy_view',
          typeArguments: [],
          functionArguments: ['1'],
        },
      });

      expect(result).toBe(1250);
    });

    it('should return 0 on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('APY calculation failed'));

      const result = await getVaultAPY(1);

      expect(result).toBe(0);
    });
  });

  describe('getVaultStrategy', () => {
    it('should fetch vault strategy correctly', async () => {
      const mockStrategyData = {
        strategy_type: '2',
        target_token: 'APT-USDC-LP',
        expected_apy: '1500',
        risk_level: '3',
      };

      mockAptos.view.mockResolvedValue([mockStrategyData]);

      const result = await getVaultStrategy(1);

      expect(result).toEqual({
        strategyType: 2,
        targetToken: 'APT-USDC-LP',
        expectedApy: 1500,
        riskLevel: 3,
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Strategy not found'));

      const result = await getVaultStrategy(1);

      expect(result).toBeNull();
    });
  });

  describe('calculateWithdrawalAmount', () => {
    it('should calculate withdrawal amount correctly', async () => {
      mockAptos.view.mockResolvedValue(['950000000000']); // Amount for given shares

      const result = await calculateWithdrawalAmount(1, 100000000000);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::calculate_withdrawal_amount',
          typeArguments: [],
          functionArguments: ['1', '100000000000'],
        },
      });

      expect(result).toBe(950000000000);
    });

    it('should return 0 on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Calculation failed'));

      const result = await calculateWithdrawalAmount(1, 100000000000);

      expect(result).toBe(0);
    });
  });

  describe('getVaultPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockVaultInfo = {
        id: '1',
        name: 'Test Vault',
        token_symbol: 'APT',
        total_deposits: '1000000000000',
        total_shares: '900000000000',
        strategy_type: '1',
        performance_fee: '500',
        management_fee: '200',
        last_harvest: '1640995200',
        total_rewards: '50000000000',
        is_active: true,
        created_at: '1640908800',
      };

      mockAptos.view
        .mockResolvedValueOnce([mockVaultInfo])
        .mockResolvedValueOnce(['1200']); // 12% APY

      const result = await getVaultPerformanceMetrics(1);

      expect(result).toEqual({
        currentApy: 1200,
        totalValueLocked: 1000000000000,
        sharePrice: 1000000000000 / 900000000000,
        dailyYield: 1200 / 365 / 10000,
        weeklyYield: 1200 / 52 / 10000,
        monthlyYield: 1200 / 12 / 10000,
        yearlyYield: 1200 / 10000,
      });
    });

    it('should return null when vault info is not available', async () => {
      mockAptos.view.mockResolvedValue([null]);

      const result = await getVaultPerformanceMetrics(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserVaultSummary', () => {
    it('should calculate user vault summary correctly', async () => {
      const mockPositionsData = [
        {
          vault_id: '1',
          shares: '100000000000',
          deposit_time: '1640995500',
          total_deposited: '1000000000000',
          total_withdrawn: '0',
        },
      ];

      const mockVaultInfo = {
        id: '1',
        name: 'Test Vault',
        token_symbol: 'APT',
        total_deposits: '1000000000000',
        total_shares: '900000000000',
        strategy_type: '1',
        performance_fee: '500',
        management_fee: '200',
        last_harvest: '1640995200',
        total_rewards: '50000000000',
        is_active: true,
        created_at: '1640908800',
      };

      mockAptos.view
        .mockResolvedValueOnce([mockPositionsData])
        .mockResolvedValueOnce([mockVaultInfo])
        .mockResolvedValueOnce(['1100000000000']); // Withdrawal amount

      const result = await getUserVaultSummary('0x123456789abcdef');

      expect(result.totalDeposited).toBe(1000000000000);
      expect(result.totalShares).toBe(100000000000);
      expect(result.currentValue).toBe(1100000000000);
      expect(result.totalEarnings).toBe(100000000000); // 1100 - 1000 + 0
      expect(result.activeVaults).toBe(1);
    });

    it('should return zero summary on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getUserVaultSummary('0x123456789abcdef');

      expect(result).toEqual({
        totalDeposited: 0,
        totalShares: 0,
        currentValue: 0,
        totalEarnings: 0,
        activeVaults: 0,
      });
    });
  });

  describe('getVaultsByStrategy', () => {
    it('should filter vaults by strategy type', async () => {
      const mockVaultData = [
        {
          id: '1',
          name: 'Lending Vault',
          token_symbol: 'APT',
          total_deposits: '1000000000',
          total_shares: '1000000000',
          strategy_type: '1',
          performance_fee: '500',
          management_fee: '200',
          last_harvest: '1640995200',
          total_rewards: '10000000',
          is_active: true,
          created_at: '1640908800',
        },
        {
          id: '2',
          name: 'LP Vault',
          token_symbol: 'USDC',
          total_deposits: '2000000000',
          total_shares: '1800000000',
          strategy_type: '2',
          performance_fee: '300',
          management_fee: '100',
          last_harvest: '1640995300',
          total_rewards: '20000000',
          is_active: true,
          created_at: '1640908900',
        },
        {
          id: '3',
          name: 'Inactive Lending Vault',
          token_symbol: 'ETH',
          total_deposits: '500000000',
          total_shares: '500000000',
          strategy_type: '1',
          performance_fee: '400',
          management_fee: '150',
          last_harvest: '1640995100',
          total_rewards: '5000000',
          is_active: false,
          created_at: '1640908700',
        },
      ];

      mockAptos.view.mockResolvedValue([mockVaultData]);

      const result = await getVaultsByStrategy(1); // Lending strategy

      expect(result).toHaveLength(1); // Only active lending vault
      expect(result[0].strategyType).toBe(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Network error'));

      const result = await getVaultsByStrategy(1);

      expect(result).toEqual([]);
    });
  });

  describe('getTopPerformingVaults', () => {
    it('should return vaults sorted by APY', async () => {
      const mockVaultData = [
        {
          id: '1',
          name: 'Low APY Vault',
          token_symbol: 'APT',
          total_deposits: '1000000000',
          total_shares: '1000000000',
          strategy_type: '1',
          performance_fee: '500',
          management_fee: '200',
          last_harvest: '1640995200',
          total_rewards: '10000000',
          is_active: true,
          created_at: '1640908800',
        },
        {
          id: '2',
          name: 'High APY Vault',
          token_symbol: 'USDC',
          total_deposits: '2000000000',
          total_shares: '1800000000',
          strategy_type: '2',
          performance_fee: '300',
          management_fee: '100',
          last_harvest: '1640995300',
          total_rewards: '20000000',
          is_active: true,
          created_at: '1640908900',
        },
      ];

      mockAptos.view
        .mockResolvedValueOnce([mockVaultData])
        .mockResolvedValueOnce(['800']) // Low APY
        .mockResolvedValueOnce(['1500']); // High APY

      const result = await getTopPerformingVaults(10);

      expect(result).toHaveLength(2);
      expect(result[0].apy).toBe(1500); // Highest APY first
      expect(result[1].apy).toBe(800);
      expect(result[0].name).toBe('High APY Vault');
    });

    it('should limit results correctly', async () => {
      const mockVaultData = Array.from({ length: 15 }, (_, i) => ({
        id: (i + 1).toString(),
        name: `Vault ${i + 1}`,
        token_symbol: 'APT',
        total_deposits: '1000000000',
        total_shares: '1000000000',
        strategy_type: '1',
        performance_fee: '500',
        management_fee: '200',
        last_harvest: '1640995200',
        total_rewards: '10000000',
        is_active: true,
        created_at: '1640908800',
      }));

      mockAptos.view.mockResolvedValue([mockVaultData]);

      // Mock APY calls
      for (let i = 0; i < 15; i++) {
        mockAptos.view.mockResolvedValueOnce([((i + 1) * 100).toString()]);
      }

      const result = await getTopPerformingVaults(5);

      expect(result).toHaveLength(5);
    });
  });

  describe('checkDepositEligibility', () => {
    it('should check deposit eligibility correctly', async () => {
      const mockEligibilityData = {
        eligible: true,
        reason: null,
        max_amount: null,
      };

      mockAptos.view.mockResolvedValue([mockEligibilityData]);

      const result = await checkDepositEligibility('0x123456789abcdef', 1, 1000000000);

      expect(result).toEqual({
        eligible: true,
        reason: undefined,
        maxAmount: undefined,
      });
    });

    it('should handle ineligible deposits', async () => {
      const mockEligibilityData = {
        eligible: false,
        reason: 'Insufficient KYC level',
        max_amount: '500000000',
      };

      mockAptos.view.mockResolvedValue([mockEligibilityData]);

      const result = await checkDepositEligibility('0x123456789abcdef', 1, 1000000000);

      expect(result).toEqual({
        eligible: false,
        reason: 'Insufficient KYC level',
        maxAmount: 500000000,
      });
    });

    it('should return ineligible on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Network error'));

      const result = await checkDepositEligibility('0x123456789abcdef', 1, 1000000000);

      expect(result).toEqual({
        eligible: false,
        reason: 'Unable to verify eligibility',
      });
    });
  });

  describe('getVaultHistoricalPerformance', () => {
    it('should fetch historical performance data', async () => {
      const mockHistoryData = [
        {
          timestamp: '1640995200',
          apy: '1200',
          tvl: '1000000000000',
          share_price: '1.05',
        },
        {
          timestamp: '1640995300',
          apy: '1250',
          tvl: '1100000000000',
          share_price: '1.06',
        },
      ];

      mockAptos.view.mockResolvedValue([mockHistoryData]);

      const result = await getVaultHistoricalPerformance(1, 7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: 1640995200,
        apy: 1200,
        tvl: 1000000000000,
        sharePrice: 1.05,
      });
      expect(result[1]).toEqual({
        date: 1640995300,
        apy: 1250,
        tvl: 1100000000000,
        sharePrice: 1.06,
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('History not available'));

      const result = await getVaultHistoricalPerformance(1, 30);

      expect(result).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    describe('formatAPY', () => {
      it('should format APY correctly', () => {
        expect(formatAPY(1250)).toBe('12.50%');
        expect(formatAPY(500)).toBe('5.00%');
        expect(formatAPY(0)).toBe('0.00%');
        expect(formatAPY(10000)).toBe('100.00%');
      });
    });

    describe('getStrategyTypeName', () => {
      it('should return correct strategy names', () => {
        expect(getStrategyTypeName(1)).toBe('Lending');
        expect(getStrategyTypeName(2)).toBe('Liquidity Provision');
        expect(getStrategyTypeName(3)).toBe('Staking');
        expect(getStrategyTypeName(999)).toBe('Unknown');
      });
    });

    describe('getRiskLevelDescription', () => {
      it('should return correct risk descriptions', () => {
        expect(getRiskLevelDescription(1)).toBe('Very Low Risk');
        expect(getRiskLevelDescription(2)).toBe('Low Risk');
        expect(getRiskLevelDescription(3)).toBe('Medium Risk');
        expect(getRiskLevelDescription(4)).toBe('High Risk');
        expect(getRiskLevelDescription(5)).toBe('Very High Risk');
        expect(getRiskLevelDescription(999)).toBe('Unknown Risk');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed response data', async () => {
      mockAptos.view.mockResolvedValue([null]);

      const result = await getAvailableVaults();

      expect(result).toEqual([]);
    });

    it('should handle empty response arrays', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      const result = await getAvailableVaults();

      expect(result).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      mockAptos.view.mockRejectedValue(new Error('Request timeout'));

      const result = await getVaultAPY(1);

      expect(result).toBe(0);
    });

    it('should handle invalid vault IDs', async () => {
      mockAptos.view.mockRejectedValue(new Error('Vault does not exist'));

      const result = await getVaultInfo(-1);

      expect(result).toBeNull();
    });

    it('should handle very large numbers', async () => {
      const mockVaultData = {
        id: '1',
        name: 'Large Vault',
        token_symbol: 'APT',
        total_deposits: Number.MAX_SAFE_INTEGER.toString(),
        total_shares: Number.MAX_SAFE_INTEGER.toString(),
        strategy_type: '1',
        performance_fee: '500',
        management_fee: '200',
        last_harvest: '1640995200',
        total_rewards: Number.MAX_SAFE_INTEGER.toString(),
        is_active: true,
        created_at: '1640908800',
      };

      mockAptos.view.mockResolvedValue([mockVaultData]);

      const result = await getVaultInfo(1);

      expect(result?.totalDeposits).toBe(Number.MAX_SAFE_INTEGER);
      expect(result?.totalShares).toBe(Number.MAX_SAFE_INTEGER);
      expect(result?.totalRewards).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});