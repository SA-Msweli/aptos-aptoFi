import {
  getHealthFactor,
  getSafeBorrowAmount,
  getLiquidationQueue,
  getPositionAssessment,
  getMarketRiskData,
  getUserRiskProfile,
  getGlobalRiskMetrics,
  getUserRiskAlerts,
  isEligibleForLiquidation,
  getRiskParameters,
  calculateLiquidationPrice,
  formatHealthFactor,
  getRiskLevelColor,
  getRecommendedActions,
  estimateTimeToLiquidation,
  type HealthFactor,
  type PositionAssessment,
  type MarketRiskData,
  type UserRiskProfile,
} from '../getRiskData';

// Mock the aptos client
const mockAptos = {
  view: jest.fn(),
};

jest.mock('@/lib/aptos', () => ({
  aptos: mockAptos,
}));

jest.mock('@/lib/constants', () => ({
  CONTRACT_ADDRESSES: {
    RISK_MANAGER: '0x123456789abcdef',
  },
}));

describe('Risk Data View Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealthFactor', () => {
    it('should fetch health factor for specific token', async () => {
      const mockHealthData = {
        health_factor: '15000', // 1.5 in basis points
        liquidation_threshold: '8000',
        collateral_value: '10000000000',
        borrowed_value: '5000000000',
      };

      mockAptos.view.mockResolvedValue([mockHealthData]);

      const result = await getHealthFactor('0x123456789abcdef', 'APT');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_health_factor',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'APT'],
        },
      });

      expect(result).toEqual({
        value: 1.5,
        status: 'moderate',
        liquidationThreshold: 8000,
        collateralValue: 10000000000,
        borrowedValue: 5000000000,
      });
    });

    it('should fetch overall health factor without token', async () => {
      const mockHealthData = {
        health_factor: '25000', // 2.5 in basis points
        liquidation_threshold: '8500',
        collateral_value: '20000000000',
        borrowed_value: '6000000000',
      };

      mockAptos.view.mockResolvedValue([mockHealthData]);

      const result = await getHealthFactor('0x123456789abcdef');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_health_factor',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef'],
        },
      });

      expect(result?.value).toBe(2.5);
      expect(result?.status).toBe('safe');
    });

    it('should classify health factor status correctly', async () => {
      const testCases = [
        { healthFactor: '30000', expectedStatus: 'safe' }, // 3.0
        { healthFactor: '17000', expectedStatus: 'moderate' }, // 1.7
        { healthFactor: '12000', expectedStatus: 'high' }, // 1.2
        { healthFactor: '9000', expectedStatus: 'critical' }, // 0.9
      ];

      for (const { healthFactor, expectedStatus } of testCases) {
        mockAptos.view.mockResolvedValue([{
          health_factor: healthFactor,
          liquidation_threshold: '8000',
          collateral_value: '10000000000',
          borrowed_value: '5000000000',
        }]);

        const result = await getHealthFactor('0x123456789abcdef', 'APT');
        expect(result?.status).toBe(expectedStatus);
      }
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getHealthFactor('0x123456789abcdef', 'APT');

      expect(result).toBeNull();
    });
  });

  describe('getSafeBorrowAmount', () => {
    it('should calculate safe borrow amount', async () => {
      mockAptos.view.mockResolvedValue(['5000000000']); // 50 APT

      const result = await getSafeBorrowAmount('0x123456789abcdef', 'APT', 1000000000);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::calculate_safe_borrow_amount',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'APT', '1000000000'],
        },
      });

      expect(result).toBe(5000000000);
    });

    it('should handle zero additional collateral', async () => {
      mockAptos.view.mockResolvedValue(['3000000000']);

      const result = await getSafeBorrowAmount('0x123456789abcdef', 'APT');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::calculate_safe_borrow_amount',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'APT', '0'],
        },
      });

      expect(result).toBe(3000000000);
    });

    it('should return 0 on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Calculation failed'));

      const result = await getSafeBorrowAmount('0x123456789abcdef', 'APT');

      expect(result).toBe(0);
    });
  });

  describe('getLiquidationQueue', () => {
    it('should fetch liquidation queue', async () => {
      const mockQueue = ['0x111111111', '0x222222222', '0x333333333'];

      mockAptos.view.mockResolvedValue([mockQueue]);

      const result = await getLiquidationQueue(50);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_liquidation_queue',
          typeArguments: [],
          functionArguments: ['50'],
        },
      });

      expect(result).toEqual(mockQueue);
    });

    it('should use default limit', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      await getLiquidationQueue();

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_liquidation_queue',
          typeArguments: [],
          functionArguments: ['50'],
        },
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Queue not available'));

      const result = await getLiquidationQueue();

      expect(result).toEqual([]);
    });
  });

  describe('getPositionAssessment', () => {
    it('should fetch complete position assessment', async () => {
      const mockAssessmentData = {
        position_value: '10000000000',
        collateral_value: '15000000000',
        borrowed_value: '6000000000',
        health_factor: '20000', // 2.0
        risk_score: '25',
        max_borrow_amount: '5000000000',
        liquidation_price: '8500000000',
        time_to_liquidation: '86400',
        recommended_actions: ['Monitor position', 'Consider adding collateral'],
        last_updated: '1640995200',
      };

      mockAptos.view.mockResolvedValue([mockAssessmentData]);

      const result = await getPositionAssessment('0x123456789abcdef', 'APT');

      expect(result).toEqual({
        userAddress: '0x123456789abcdef',
        tokenSymbol: 'APT',
        positionValue: 10000000000,
        collateralValue: 15000000000,
        borrowedValue: 6000000000,
        healthFactor: 2.0,
        riskScore: 25,
        maxBorrowAmount: 5000000000,
        liquidationRisk: {
          riskLevel: 'low',
          healthFactor: 2.0,
          liquidationPrice: 8500000000,
          timeToLiquidation: 86400,
          recommendedActions: ['Monitor position', 'Consider adding collateral'],
        },
        lastUpdated: 1640995200,
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Position not found'));

      const result = await getPositionAssessment('0x123456789abcdef', 'APT');

      expect(result).toBeNull();
    });
  });

  describe('getMarketRiskData', () => {
    it('should fetch market risk data', async () => {
      const mockMarketData = {
        volatility: '0.25', // 25%
        liquidity_risk: '15',
        concentration_risk: '30',
        correlation_risk: '0.65',
        risk_parameters: {
          liquidation_threshold: '8000',
          liquidation_bonus: '500',
          max_ltv: '7500',
          reserve_factor: '1000',
          borrow_cap: '1000000000000',
          supply_cap: '5000000000000',
        },
      };

      mockAptos.view.mockResolvedValue([mockMarketData]);

      const result = await getMarketRiskData('APT');

      expect(result).toEqual({
        tokenSymbol: 'APT',
        volatility: 0.25,
        liquidityRisk: 15,
        concentrationRisk: 30,
        correlationRisk: 0.65,
        riskParameters: {
          liquidationThreshold: 8000,
          liquidationBonus: 500,
          maxLTV: 7500,
          reserveFactor: 1000,
          borrowCap: 1000000000000,
          supplyCap: 5000000000000,
        },
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Market data not available'));

      const result = await getMarketRiskData('UNKNOWN_TOKEN');

      expect(result).toBeNull();
    });
  });

  describe('getUserRiskProfile', () => {
    it('should fetch complete user risk profile', async () => {
      const mockProfileData = {
        overall_risk_score: '45',
        risk_tolerance: '3',
        max_borrow_limit: '100000000000',
        max_position_size: '500000000000',
        total_collateral: '200000000000',
        total_borrowed: '80000000000',
        portfolio_health_factor: '25000', // 2.5
        active_positions: '5',
        risk_alerts: [
          {
            id: 'alert1',
            type: 'liquidation_warning',
            severity: 'medium',
            message: 'Health factor approaching threshold',
            token_symbol: 'APT',
            threshold: '1.2',
            current_value: '1.3',
            created_at: '1640995200',
            acknowledged: false,
          },
        ],
      };

      mockAptos.view.mockResolvedValue([mockProfileData]);

      const result = await getUserRiskProfile('0x123456789abcdef');

      expect(result).toEqual({
        userAddress: '0x123456789abcdef',
        overallRiskScore: 45,
        riskTolerance: 3,
        maxBorrowLimit: 100000000000,
        maxPositionSize: 500000000000,
        totalCollateral: 200000000000,
        totalBorrowed: 80000000000,
        portfolioHealthFactor: 2.5,
        activePositions: 5,
        riskAlerts: [
          {
            id: 'alert1',
            type: 'liquidation_warning',
            severity: 'medium',
            message: 'Health factor approaching threshold',
            tokenSymbol: 'APT',
            threshold: 1.2,
            currentValue: 1.3,
            createdAt: 1640995200,
            acknowledged: false,
          },
        ],
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User profile not found'));

      const result = await getUserRiskProfile('0x123456789abcdef');

      expect(result).toBeNull();
    });
  });

  describe('getGlobalRiskMetrics', () => {
    it('should fetch global risk metrics', async () => {
      const mockGlobalData = {
        total_value_locked: '10000000000000',
        total_borrowed: '6000000000000',
        global_utilization_rate: '0.6',
        average_health_factor: '18000', // 1.8
        positions_at_risk: '25',
        liquidation_queue: ['0x111', '0x222'],
        system_risk_score: '35',
      };

      mockAptos.view.mockResolvedValue([mockGlobalData]);

      const result = await getGlobalRiskMetrics();

      expect(result).toEqual({
        totalValueLocked: 10000000000000,
        totalBorrowed: 6000000000000,
        globalUtilizationRate: 0.6,
        averageHealthFactor: 1.8,
        positionsAtRisk: 25,
        liquidationQueue: ['0x111', '0x222'],
        systemRiskScore: 35,
      });
    });

    it('should return zero metrics on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Global metrics not available'));

      const result = await getGlobalRiskMetrics();

      expect(result).toEqual({
        totalValueLocked: 0,
        totalBorrowed: 0,
        globalUtilizationRate: 0,
        averageHealthFactor: 0,
        positionsAtRisk: 0,
        liquidationQueue: [],
        systemRiskScore: 0,
      });
    });
  });

  describe('getUserRiskAlerts', () => {
    it('should fetch user risk alerts', async () => {
      const mockAlertsData = [
        {
          id: 'alert1',
          type: 'liquidation_warning',
          severity: 'high',
          message: 'Position at risk of liquidation',
          token_symbol: 'APT',
          threshold: '1.1',
          current_value: '1.05',
          created_at: '1640995200',
          acknowledged: false,
        },
        {
          id: 'alert2',
          type: 'high_volatility',
          severity: 'medium',
          message: 'High volatility detected',
          token_symbol: 'BTC',
          threshold: '0.3',
          current_value: '0.35',
          created_at: '1640995100',
          acknowledged: true,
        },
      ];

      mockAptos.view.mockResolvedValue([mockAlertsData]);

      const result = await getUserRiskAlerts('0x123456789abcdef', true);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_user_risk_alerts',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'true'],
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0].acknowledged).toBe(false);
      expect(result[1].acknowledged).toBe(true);
    });

    it('should exclude acknowledged alerts by default', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      await getUserRiskAlerts('0x123456789abcdef');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_user_risk_alerts',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'false'],
        },
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Alerts not found'));

      const result = await getUserRiskAlerts('0x123456789abcdef');

      expect(result).toEqual([]);
    });
  });

  describe('isEligibleForLiquidation', () => {
    it('should check liquidation eligibility', async () => {
      mockAptos.view.mockResolvedValue([true]);

      const result = await isEligibleForLiquidation('0x123456789abcdef', 'APT');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::is_eligible_for_liquidation',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', 'APT'],
        },
      });

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Check failed'));

      const result = await isEligibleForLiquidation('0x123456789abcdef', 'APT');

      expect(result).toBe(false);
    });
  });

  describe('getRiskParameters', () => {
    it('should fetch risk parameters for token', async () => {
      const mockParamsData = {
        liquidation_threshold: '8500',
        liquidation_bonus: '500',
        max_ltv: '8000',
        reserve_factor: '1000',
        borrow_cap: '1000000000000',
        supply_cap: '5000000000000',
      };

      mockAptos.view.mockResolvedValue([mockParamsData]);

      const result = await getRiskParameters('APT');

      expect(result).toEqual({
        liquidationThreshold: 8500,
        liquidationBonus: 500,
        maxLTV: 8000,
        reserveFactor: 1000,
        borrowCap: 1000000000000,
        supplyCap: 5000000000000,
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Parameters not found'));

      const result = await getRiskParameters('UNKNOWN_TOKEN');

      expect(result).toBeNull();
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation price', async () => {
      mockAptos.view.mockResolvedValue(['8500.50']);

      const result = await calculateLiquidationPrice('0x123456789abcdef', 'APT');

      expect(result).toBe(8500.50);
    });

    it('should return 0 on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Calculation failed'));

      const result = await calculateLiquidationPrice('0x123456789abcdef', 'APT');

      expect(result).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    describe('formatHealthFactor', () => {
      it('should format health factor correctly', () => {
        expect(formatHealthFactor(1.5)).toBe('1.50');
        expect(formatHealthFactor(2.0)).toBe('2.00');
        expect(formatHealthFactor(0.95)).toBe('0.95');
        expect(formatHealthFactor(Number.MAX_SAFE_INTEGER)).toBe('∞');
      });
    });

    describe('getRiskLevelColor', () => {
      it('should return correct colors for risk levels', () => {
        expect(getRiskLevelColor('safe')).toBe('#10b981');
        expect(getRiskLevelColor('low')).toBe('#10b981');
        expect(getRiskLevelColor('moderate')).toBe('#f59e0b');
        expect(getRiskLevelColor('medium')).toBe('#f59e0b');
        expect(getRiskLevelColor('high')).toBe('#f97316');
        expect(getRiskLevelColor('critical')).toBe('#ef4444');
        expect(getRiskLevelColor('unknown')).toBe('#6b7280');
      });
    });

    describe('getRecommendedActions', () => {
      it('should return appropriate actions for different health factors', () => {
        const safeActions = getRecommendedActions(2.5);
        const moderateActions = getRecommendedActions(1.7);
        const highActions = getRecommendedActions(1.2);
        const criticalActions = getRecommendedActions(0.9);

        expect(safeActions).toContain('Position is healthy');
        expect(moderateActions).toContain('Monitor position closely');
        expect(highActions).toContain('Add collateral immediately');
        expect(criticalActions).toContain('URGENT: Add collateral now');
      });
    });

    describe('estimateTimeToLiquidation', () => {
      it('should estimate time to liquidation correctly', () => {
        const time1 = estimateTimeToLiquidation(1.5, 0.2); // 50% buffer, 20% volatility
        const time2 = estimateTimeToLiquidation(1.2, 0.4); // 20% buffer, 40% volatility
        const time3 = estimateTimeToLiquidation(0.9, 0.1); // Already at liquidation

        expect(time1).toBeGreaterThan(0);
        expect(time2).toBeGreaterThan(0);
        expect(time2).toBeLessThan(time1); // Higher volatility = less time
        expect(time3).toBe(0);
      });

      it('should handle edge cases', () => {
        const zeroVolatility = estimateTimeToLiquidation(1.5, 0);
        const veryHighHealthFactor = estimateTimeToLiquidation(10.0, 0.1);

        expect(zeroVolatility).toBe(Infinity);
        expect(veryHighHealthFactor).toBeGreaterThan(86400 * 365); // More than a year
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed response data', async () => {
      mockAptos.view.mockResolvedValue([null]);

      const result = await getHealthFactor('0x123456789abcdef', 'APT');

      expect(result).toBeNull();
    });

    it('should handle empty response arrays', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      const result = await getLiquidationQueue();

      expect(result).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      mockAptos.view.mockRejectedValue(new Error('Request timeout'));

      const result = await getSafeBorrowAmount('0x123456789abcdef', 'APT');

      expect(result).toBe(0);
    });

    it('should handle invalid user addresses', async () => {
      mockAptos.view.mockRejectedValue(new Error('Invalid address'));

      const result = await getUserRiskProfile('invalid_address');

      expect(result).toBeNull();
    });

    it('should handle very large numbers', async () => {
      const mockAssessmentData = {
        position_value: Number.MAX_SAFE_INTEGER.toString(),
        collateral_value: Number.MAX_SAFE_INTEGER.toString(),
        borrowed_value: Number.MAX_SAFE_INTEGER.toString(),
        health_factor: '10000', // 1.0
        risk_score: '100',
        max_borrow_amount: Number.MAX_SAFE_INTEGER.toString(),
        liquidation_price: Number.MAX_SAFE_INTEGER.toString(),
        time_to_liquidation: '0',
        recommended_actions: [],
        last_updated: '1640995200',
      };

      mockAptos.view.mockResolvedValue([mockAssessmentData]);

      const result = await getPositionAssessment('0x123456789abcdef', 'APT');

      expect(result?.positionValue).toBe(Number.MAX_SAFE_INTEGER);
      expect(result?.collateralValue).toBe(Number.MAX_SAFE_INTEGER);
      expect(result?.borrowedValue).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle missing optional fields in risk alerts', async () => {
      const mockAlertsData = [
        {
          id: 'alert1',
          type: 'liquidation_warning',
          severity: 'high',
          message: 'Position at risk',
          // Missing optional fields
          created_at: '1640995200',
          acknowledged: false,
        },
      ];

      mockAptos.view.mockResolvedValue([mockAlertsData]);

      const result = await getUserRiskAlerts('0x123456789abcdef');

      expect(result).toHaveLength(1);
      expect(result[0].tokenSymbol).toBeUndefined();
      expect(result[0].threshold).toBeNaN();
      expect(result[0].currentValue).toBeNaN();
    });

    it('should handle zero health factor edge case', async () => {
      const mockHealthData = {
        health_factor: '0',
        liquidation_threshold: '8000',
        collateral_value: '0',
        borrowed_value: '5000000000',
      };

      mockAptos.view.mockResolvedValue([mockHealthData]);

      const result = await getHealthFactor('0x123456789abcdef', 'APT');

      expect(result?.value).toBe(0);
      expect(result?.status).toBe('critical');
    });
  });
});