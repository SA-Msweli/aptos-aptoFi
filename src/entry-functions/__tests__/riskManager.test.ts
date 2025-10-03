import {
  updatePositionRisk,
  checkLiquidationEligibility,
  updateRiskParameters,
  setRiskLimits,
  triggerEmergencyLiquidation,
  updateGlobalRiskSettings,
  calculateHealthFactor,
  calculateSafeBorrowAmount,
  assessLiquidationRisk,
  estimateRiskManagementGas,
  validatePositionRiskUpdate,
  validateRiskParameters,
  validateRiskLimits,
  getRecommendedRiskParameters,
  type UpdatePositionRiskArguments,
  type CheckLiquidationEligibilityArguments,
  type UpdateRiskParametersArguments,
  type SetRiskLimitsArguments,
} from '../riskManager';

describe('Risk Manager Entry Functions', () => {
  describe('updatePositionRisk', () => {
    it('should create correct transaction payload for position risk update', () => {
      const args: UpdatePositionRiskArguments = {
        userAddress: '0x123456789abcdef',
        tokenSymbol: 'APT',
        positionValue: 10000000000, // 100 APT
        collateralValue: 15000000000, // 150 APT worth of collateral
        borrowedValue: 5000000000, // 50 APT worth borrowed
      };

      const result = updatePositionRisk(args);

      expect(result.data.function).toContain('update_position_risk');
      expect(result.data.typeArguments).toEqual([]);
      expect(result.data.functionArguments).toEqual([
        '0x123456789abcdef',
        'APT',
        '10000000000',
        '15000000000',
        '5000000000',
      ]);
    });

    it('should handle zero values', () => {
      const args: UpdatePositionRiskArguments = {
        userAddress: '0x123456789abcdef',
        tokenSymbol: 'USDC',
        positionValue: 0,
        collateralValue: 1000000000,
        borrowedValue: 0,
      };

      const result = updatePositionRisk(args);

      expect(result.data.functionArguments[2]).toBe('0');
      expect(result.data.functionArguments[4]).toBe('0');
    });

    it('should handle large values', () => {
      const args: UpdatePositionRiskArguments = {
        userAddress: '0x123456789abcdef',
        tokenSymbol: 'BTC',
        positionValue: Number.MAX_SAFE_INTEGER,
        collateralValue: Number.MAX_SAFE_INTEGER,
        borrowedValue: Number.MAX_SAFE_INTEGER,
      };

      const result = updatePositionRisk(args);

      expect(result.data.functionArguments[2]).toBe(Number.MAX_SAFE_INTEGER.toString());
      expect(result.data.functionArguments[3]).toBe(Number.MAX_SAFE_INTEGER.toString());
      expect(result.data.functionArguments[4]).toBe(Number.MAX_SAFE_INTEGER.toString());
    });
  });

  describe('checkLiquidationEligibility', () => {
    it('should create correct transaction payload for liquidation check', () => {
      const args: CheckLiquidationEligibilityArguments = {
        userAddress: '0xabcdef123456789',
        tokenSymbol: 'ETH',
      };

      const result = checkLiquidationEligibility(args);

      expect(result.data.function).toContain('check_liquidation_eligibility');
      expect(result.data.functionArguments).toEqual([
        '0xabcdef123456789',
        'ETH',
      ]);
    });

    it('should handle different token symbols', () => {
      const tokens = ['APT', 'USDC', 'BTC', 'ETH', 'USDT'];

      tokens.forEach(token => {
        const args: CheckLiquidationEligibilityArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: token,
        };

        const result = checkLiquidationEligibility(args);

        expect(result.data.functionArguments[1]).toBe(token);
      });
    });
  });

  describe('updateRiskParameters', () => {
    it('should create correct transaction payload for risk parameter update', () => {
      const args: UpdateRiskParametersArguments = {
        tokenSymbol: 'APT',
        liquidationThreshold: 8500, // 85%
        liquidationBonus: 500, // 5%
        maxLTV: 7500, // 75%
      };

      const result = updateRiskParameters(args);

      expect(result.data.function).toContain('update_risk_parameters');
      expect(result.data.functionArguments).toEqual([
        'APT',
        '8500',
        '500',
        '7500',
      ]);
    });

    it('should handle conservative risk parameters', () => {
      const args: UpdateRiskParametersArguments = {
        tokenSymbol: 'VOLATILE_TOKEN',
        liquidationThreshold: 6000, // 60%
        liquidationBonus: 1000, // 10%
        maxLTV: 5000, // 50%
      };

      const result = updateRiskParameters(args);

      expect(result.data.functionArguments[1]).toBe('6000');
      expect(result.data.functionArguments[2]).toBe('1000');
      expect(result.data.functionArguments[3]).toBe('5000');
    });

    it('should handle maximum risk parameters', () => {
      const args: UpdateRiskParametersArguments = {
        tokenSymbol: 'STABLE_TOKEN',
        liquidationThreshold: 9500, // 95%
        liquidationBonus: 200, // 2%
        maxLTV: 9000, // 90%
      };

      const result = updateRiskParameters(args);

      expect(result.data.functionArguments[1]).toBe('9500');
      expect(result.data.functionArguments[2]).toBe('200');
      expect(result.data.functionArguments[3]).toBe('9000');
    });
  });

  describe('setRiskLimits', () => {
    it('should create correct transaction payload for risk limits', () => {
      const args: SetRiskLimitsArguments = {
        userAddress: '0x987654321fedcba',
        maxBorrowLimit: 100000000000, // 1000 APT
        maxPositionSize: 500000000000, // 5000 APT
        riskTolerance: 3, // Medium risk
      };

      const result = setRiskLimits(args);

      expect(result.data.function).toContain('set_risk_limits');
      expect(result.data.functionArguments).toEqual([
        '0x987654321fedcba',
        '100000000000',
        '500000000000',
        '3',
      ]);
    });

    it('should handle different risk tolerance levels', () => {
      const riskLevels = [1, 2, 3, 4, 5];

      riskLevels.forEach(level => {
        const args: SetRiskLimitsArguments = {
          userAddress: '0x123456789abcdef',
          maxBorrowLimit: 50000000000,
          maxPositionSize: 200000000000,
          riskTolerance: level,
        };

        const result = setRiskLimits(args);

        expect(result.data.functionArguments[3]).toBe(level.toString());
      });
    });

    it('should handle zero limits', () => {
      const args: SetRiskLimitsArguments = {
        userAddress: '0x123456789abcdef',
        maxBorrowLimit: 0,
        maxPositionSize: 0,
        riskTolerance: 1,
      };

      const result = setRiskLimits(args);

      expect(result.data.functionArguments[1]).toBe('0');
      expect(result.data.functionArguments[2]).toBe('0');
    });
  });

  describe('triggerEmergencyLiquidation', () => {
    it('should create correct transaction payload for emergency liquidation', () => {
      const result = triggerEmergencyLiquidation('0x123456789abcdef', 'APT');

      expect(result.data.function).toContain('trigger_emergency_liquidation');
      expect(result.data.functionArguments).toEqual([
        '0x123456789abcdef',
        'APT',
      ]);
    });

    it('should handle different user addresses and tokens', () => {
      const users = ['0x111', '0x222', '0x333'];
      const tokens = ['APT', 'USDC', 'ETH'];

      users.forEach((user, index) => {
        const result = triggerEmergencyLiquidation(user, tokens[index]);

        expect(result.data.functionArguments[0]).toBe(user);
        expect(result.data.functionArguments[1]).toBe(tokens[index]);
      });
    });
  });

  describe('updateGlobalRiskSettings', () => {
    it('should create correct transaction payload for global risk settings', () => {
      const result = updateGlobalRiskSettings(500, true); // 5x max leverage, emergency pause enabled

      expect(result.data.function).toContain('update_global_risk_settings');
      expect(result.data.functionArguments).toEqual([
        '500',
        'true',
      ]);
    });

    it('should handle disabled emergency pause', () => {
      const result = updateGlobalRiskSettings(300, false); // 3x max leverage, emergency pause disabled

      expect(result.data.functionArguments[1]).toBe('false');
    });

    it('should handle very conservative leverage', () => {
      const result = updateGlobalRiskSettings(100, true); // 1x max leverage (no leverage)

      expect(result.data.functionArguments[0]).toBe('100');
    });
  });

  describe('Risk Calculation Utilities', () => {
    describe('calculateHealthFactor', () => {
      it('should calculate health factor correctly', () => {
        const healthFactor = calculateHealthFactor(
          10000, // $10,000 collateral
          5000,  // $5,000 borrowed
          8000   // 80% liquidation threshold
        );

        expect(healthFactor).toBe(1.6); // (10000 * 0.8) / 5000 = 1.6
      });

      it('should return infinity for zero borrowed amount', () => {
        const healthFactor = calculateHealthFactor(10000, 0, 8000);

        expect(healthFactor).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle zero collateral', () => {
        const healthFactor = calculateHealthFactor(0, 5000, 8000);

        expect(healthFactor).toBe(0);
      });

      it('should handle edge case with very small borrowed amount', () => {
        const healthFactor = calculateHealthFactor(10000, 0.01, 8000);

        expect(healthFactor).toBe(800000); // (10000 * 0.8) / 0.01
      });
    });

    describe('calculateSafeBorrowAmount', () => {
      it('should calculate safe borrow amount correctly', () => {
        const safeBorrowAmount = calculateSafeBorrowAmount(
          10000, // $10,000 collateral
          7500,  // 75% max LTV
          2000   // $2,000 already borrowed
        );

        expect(safeBorrowAmount).toBe(5500); // (10000 * 0.75) - 2000 = 5500
      });

      it('should return zero when already at max borrowing capacity', () => {
        const safeBorrowAmount = calculateSafeBorrowAmount(10000, 7500, 7500);

        expect(safeBorrowAmount).toBe(0);
      });

      it('should return zero when over-borrowed', () => {
        const safeBorrowAmount = calculateSafeBorrowAmount(10000, 7500, 8000);

        expect(safeBorrowAmount).toBe(0);
      });

      it('should handle zero current borrowed amount', () => {
        const safeBorrowAmount = calculateSafeBorrowAmount(10000, 7500);

        expect(safeBorrowAmount).toBe(7500); // 10000 * 0.75
      });
    });

    describe('assessLiquidationRisk', () => {
      it('should assess safe positions correctly', () => {
        const assessment = assessLiquidationRisk(2.5);

        expect(assessment.level).toBe('safe');
        expect(assessment.description).toContain('well-collateralized');
        expect(assessment.recommendedAction).toContain('No action required');
      });

      it('should assess moderate risk positions', () => {
        const assessment = assessLiquidationRisk(1.7);

        expect(assessment.level).toBe('moderate');
        expect(assessment.description).toContain('moderate risk');
        expect(assessment.recommendedAction).toContain('Consider adding collateral');
      });

      it('should assess high risk positions', () => {
        const assessment = assessLiquidationRisk(1.2);

        expect(assessment.level).toBe('high');
        expect(assessment.description).toContain('high risk');
        expect(assessment.recommendedAction).toContain('immediately');
      });

      it('should assess critical risk positions', () => {
        const assessment = assessLiquidationRisk(0.9);

        expect(assessment.level).toBe('critical');
        expect(assessment.description).toContain('eligible for liquidation');
        expect(assessment.recommendedAction).toContain('Urgent action required');
      });

      it('should handle edge case at liquidation threshold', () => {
        const assessment = assessLiquidationRisk(1.0);

        expect(assessment.level).toBe('critical');
      });
    });
  });

  describe('Gas Estimation', () => {
    describe('estimateRiskManagementGas', () => {
      it('should return appropriate gas estimates for different operations', () => {
        const updatePositionGas = estimateRiskManagementGas('update_position');
        const checkLiquidationGas = estimateRiskManagementGas('check_liquidation');
        const updateParametersGas = estimateRiskManagementGas('update_parameters');
        const setLimitsGas = estimateRiskManagementGas('set_limits');
        const emergencyLiquidationGas = estimateRiskManagementGas('emergency_liquidation');

        expect(updatePositionGas).toBeGreaterThan(0);
        expect(checkLiquidationGas).toBeGreaterThan(0);
        expect(updateParametersGas).toBeGreaterThan(0);
        expect(setLimitsGas).toBeGreaterThan(0);
        expect(emergencyLiquidationGas).toBeGreaterThan(0);

        // Emergency liquidation should require the most gas
        expect(emergencyLiquidationGas).toBeGreaterThan(updatePositionGas);
        expect(emergencyLiquidationGas).toBeGreaterThan(checkLiquidationGas);
      });

      it('should return consistent gas estimates', () => {
        const gas1 = estimateRiskManagementGas('update_position');
        const gas2 = estimateRiskManagementGas('update_position');

        expect(gas1).toBe(gas2);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validatePositionRiskUpdate', () => {
      it('should validate correct position risk update parameters', () => {
        const args: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: 'APT',
          positionValue: 10000000000,
          collateralValue: 15000000000,
          borrowedValue: 5000000000,
        };

        const result = validatePositionRiskUpdate(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty user address', () => {
        const args: UpdatePositionRiskArguments = {
          userAddress: '',
          tokenSymbol: 'APT',
          positionValue: 10000000000,
          collateralValue: 15000000000,
          borrowedValue: 5000000000,
        };

        const result = validatePositionRiskUpdate(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('User address is required');
      });

      it('should reject empty token symbol', () => {
        const args: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: '',
          positionValue: 10000000000,
          collateralValue: 15000000000,
          borrowedValue: 5000000000,
        };

        const result = validatePositionRiskUpdate(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Token symbol is required');
      });

      it('should reject negative values', () => {
        const negativePosition: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: 'APT',
          positionValue: -1000,
          collateralValue: 15000000000,
          borrowedValue: 5000000000,
        };

        const negativeCollateral: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: 'APT',
          positionValue: 10000000000,
          collateralValue: -1000,
          borrowedValue: 5000000000,
        };

        const negativeBorrowed: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: 'APT',
          positionValue: 10000000000,
          collateralValue: 15000000000,
          borrowedValue: -1000,
        };

        expect(validatePositionRiskUpdate(negativePosition).valid).toBe(false);
        expect(validatePositionRiskUpdate(negativeCollateral).valid).toBe(false);
        expect(validatePositionRiskUpdate(negativeBorrowed).valid).toBe(false);
      });

      it('should accept zero values', () => {
        const args: UpdatePositionRiskArguments = {
          userAddress: '0x123456789abcdef',
          tokenSymbol: 'APT',
          positionValue: 0,
          collateralValue: 0,
          borrowedValue: 0,
        };

        const result = validatePositionRiskUpdate(args);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateRiskParameters', () => {
      it('should validate correct risk parameters', () => {
        const args: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 8500,
          liquidationBonus: 500,
          maxLTV: 7500,
        };

        const result = validateRiskParameters(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty token symbol', () => {
        const args: UpdateRiskParametersArguments = {
          tokenSymbol: '',
          liquidationThreshold: 8500,
          liquidationBonus: 500,
          maxLTV: 7500,
        };

        const result = validateRiskParameters(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Token symbol is required');
      });

      it('should reject parameters outside valid ranges', () => {
        const invalidThreshold: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 15000, // > 100%
          liquidationBonus: 500,
          maxLTV: 7500,
        };

        const invalidBonus: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 8500,
          liquidationBonus: 3000, // > 20%
          maxLTV: 7500,
        };

        const invalidLTV: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 8500,
          liquidationBonus: 500,
          maxLTV: -1000, // < 0%
        };

        expect(validateRiskParameters(invalidThreshold).valid).toBe(false);
        expect(validateRiskParameters(invalidBonus).valid).toBe(false);
        expect(validateRiskParameters(invalidLTV).valid).toBe(false);
      });

      it('should reject max LTV >= liquidation threshold', () => {
        const args: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 8000,
          liquidationBonus: 500,
          maxLTV: 8500, // Higher than liquidation threshold
        };

        const result = validateRiskParameters(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Max LTV must be less than liquidation threshold');
      });

      it('should accept max LTV equal to liquidation threshold minus 1', () => {
        const args: UpdateRiskParametersArguments = {
          tokenSymbol: 'APT',
          liquidationThreshold: 8000,
          liquidationBonus: 500,
          maxLTV: 7999,
        };

        const result = validateRiskParameters(args);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateRiskLimits', () => {
      it('should validate correct risk limits', () => {
        const args: SetRiskLimitsArguments = {
          userAddress: '0x123456789abcdef',
          maxBorrowLimit: 100000000000,
          maxPositionSize: 500000000000,
          riskTolerance: 3,
        };

        const result = validateRiskLimits(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty user address', () => {
        const args: SetRiskLimitsArguments = {
          userAddress: '',
          maxBorrowLimit: 100000000000,
          maxPositionSize: 500000000000,
          riskTolerance: 3,
        };

        const result = validateRiskLimits(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('User address is required');
      });

      it('should reject negative limits', () => {
        const negativeBorrow: SetRiskLimitsArguments = {
          userAddress: '0x123456789abcdef',
          maxBorrowLimit: -1000,
          maxPositionSize: 500000000000,
          riskTolerance: 3,
        };

        const negativePosition: SetRiskLimitsArguments = {
          userAddress: '0x123456789abcdef',
          maxBorrowLimit: 100000000000,
          maxPositionSize: -1000,
          riskTolerance: 3,
        };

        expect(validateRiskLimits(negativeBorrow).valid).toBe(false);
        expect(validateRiskLimits(negativePosition).valid).toBe(false);
      });

      it('should reject invalid risk tolerance levels', () => {
        const invalidRiskLevels = [0, 6, -1, 10];

        invalidRiskLevels.forEach(level => {
          const args: SetRiskLimitsArguments = {
            userAddress: '0x123456789abcdef',
            maxBorrowLimit: 100000000000,
            maxPositionSize: 500000000000,
            riskTolerance: level,
          };

          const result = validateRiskLimits(args);

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Risk tolerance must be between 1 and 5');
        });
      });

      it('should accept zero limits', () => {
        const args: SetRiskLimitsArguments = {
          userAddress: '0x123456789abcdef',
          maxBorrowLimit: 0,
          maxPositionSize: 0,
          riskTolerance: 1,
        };

        const result = validateRiskLimits(args);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Risk Parameter Recommendations', () => {
    describe('getRecommendedRiskParameters', () => {
      it('should return conservative parameters for high volatility tokens', () => {
        const params = getRecommendedRiskParameters('VOLATILE_TOKEN', 9);

        expect(params.liquidationThreshold).toBeLessThan(8500);
        expect(params.liquidationBonus).toBeGreaterThan(500);
        expect(params.maxLTV).toBeLessThan(7500);
      });

      it('should return standard parameters for medium volatility tokens', () => {
        const params = getRecommendedRiskParameters('MEDIUM_TOKEN', 5);

        expect(params.liquidationThreshold).toBe(8500);
        expect(params.liquidationBonus).toBe(500);
        expect(params.maxLTV).toBe(7500);
      });

      it('should return less conservative parameters for low volatility tokens', () => {
        const params = getRecommendedRiskParameters('STABLE_TOKEN', 2);

        expect(params.liquidationThreshold).toBe(8500);
        expect(params.liquidationBonus).toBe(500);
        expect(params.maxLTV).toBe(7500);
      });

      it('should enforce minimum thresholds', () => {
        const params = getRecommendedRiskParameters('EXTREMELY_VOLATILE', 10);

        expect(params.liquidationThreshold).toBeGreaterThanOrEqual(5000); // 50% minimum
        expect(params.liquidationBonus).toBeLessThanOrEqual(2000); // 20% maximum
        expect(params.maxLTV).toBeGreaterThanOrEqual(3000); // 30% minimum
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large position values', () => {
      const args: UpdatePositionRiskArguments = {
        userAddress: '0x123456789abcdef',
        tokenSymbol: 'APT',
        positionValue: Number.MAX_SAFE_INTEGER,
        collateralValue: Number.MAX_SAFE_INTEGER,
        borrowedValue: Number.MAX_SAFE_INTEGER,
      };

      const result = updatePositionRisk(args);

      expect(result.data.functionArguments[2]).toBe(Number.MAX_SAFE_INTEGER.toString());
    });

    it('should handle whitespace in addresses and symbols', () => {
      const args: UpdatePositionRiskArguments = {
        userAddress: '  0x123456789abcdef  ',
        tokenSymbol: '  APT  ',
        positionValue: 10000000000,
        collateralValue: 15000000000,
        borrowedValue: 5000000000,
      };

      const result = validatePositionRiskUpdate(args);

      expect(result.valid).toBe(true);
    });

    it('should handle extreme health factor calculations', () => {
      const veryHighHealthFactor = calculateHealthFactor(1000000, 1, 8000);
      const veryLowHealthFactor = calculateHealthFactor(1, 1000000, 8000);

      expect(veryHighHealthFactor).toBeGreaterThan(100);
      expect(veryLowHealthFactor).toBeLessThan(0.01);
    });

    it('should handle multiple validation errors', () => {
      const args: UpdateRiskParametersArguments = {
        tokenSymbol: '',
        liquidationThreshold: -1000,
        liquidationBonus: 5000,
        maxLTV: 15000,
      };

      const result = validateRiskParameters(args);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});