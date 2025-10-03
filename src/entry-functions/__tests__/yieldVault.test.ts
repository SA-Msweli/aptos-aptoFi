import {
  createVault,
  depositToVault,
  withdrawFromVault,
  harvestVaultRewards,
  estimateVaultGas,
  validateVaultCreation,
  validateVaultDeposit,
  validateVaultWithdrawal,
  type CreateVaultArguments,
  type DepositToVaultArguments,
  type WithdrawFromVaultArguments,
  type HarvestVaultRewardsArguments,
} from '../yieldVault';

describe('Yield Vault Entry Functions', () => {
  describe('createVault', () => {
    it('should create correct transaction payload for vault creation', () => {
      const args: CreateVaultArguments = {
        name: 'High Yield USDC Vault',
        tokenSymbol: 'USDC',
        strategyType: 1, // Lending
        performanceFee: 500, // 5%
        managementFee: 200, // 2%
      };

      const result = createVault(args);

      expect(result.data.function).toContain('create_vault');
      expect(result.data.typeArguments).toEqual([]);
      expect(result.data.functionArguments).toEqual([
        'High Yield USDC Vault',
        'USDC',
        '1',
        '500',
        '200',
      ]);
    });

    it('should handle different strategy types', () => {
      const lendingVault: CreateVaultArguments = {
        name: 'Lending Vault',
        tokenSymbol: 'APT',
        strategyType: 1,
        performanceFee: 300,
        managementFee: 100,
      };

      const lpVault: CreateVaultArguments = {
        name: 'LP Vault',
        tokenSymbol: 'ETH',
        strategyType: 2,
        performanceFee: 400,
        managementFee: 150,
      };

      const stakingVault: CreateVaultArguments = {
        name: 'Staking Vault',
        tokenSymbol: 'BTC',
        strategyType: 3,
        performanceFee: 600,
        managementFee: 250,
      };

      expect(createVault(lendingVault).data.functionArguments[2]).toBe('1');
      expect(createVault(lpVault).data.functionArguments[2]).toBe('2');
      expect(createVault(stakingVault).data.functionArguments[2]).toBe('3');
    });

    it('should handle zero fees', () => {
      const args: CreateVaultArguments = {
        name: 'Zero Fee Vault',
        tokenSymbol: 'USDT',
        strategyType: 1,
        performanceFee: 0,
        managementFee: 0,
      };

      const result = createVault(args);

      expect(result.data.functionArguments[3]).toBe('0');
      expect(result.data.functionArguments[4]).toBe('0');
    });
  });

  describe('depositToVault', () => {
    it('should create correct transaction payload for vault deposit', () => {
      const args: DepositToVaultArguments = {
        vaultId: 1,
        coinType: '0x1::aptos_coin::AptosCoin',
        amount: 1000000000, // 10 APT with 8 decimals
      };

      const result = depositToVault(args);

      expect(result.data.function).toContain('deposit');
      expect(result.data.typeArguments).toEqual(['0x1::aptos_coin::AptosCoin']);
      expect(result.data.functionArguments).toEqual([
        '1',
        '1000000000',
      ]);
    });

    it('should handle different coin types', () => {
      const aptDeposit: DepositToVaultArguments = {
        vaultId: 1,
        coinType: '0x1::aptos_coin::AptosCoin',
        amount: 500000000,
      };

      const usdcDeposit: DepositToVaultArguments = {
        vaultId: 2,
        coinType: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T',
        amount: 1000000, // 1 USDC with 6 decimals
      };

      expect(depositToVault(aptDeposit).data.typeArguments[0]).toBe('0x1::aptos_coin::AptosCoin');
      expect(depositToVault(usdcDeposit).data.typeArguments[0]).toBe('0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T');
    });

    it('should handle large deposit amounts', () => {
      const args: DepositToVaultArguments = {
        vaultId: 5,
        coinType: '0x1::aptos_coin::AptosCoin',
        amount: Number.MAX_SAFE_INTEGER,
      };

      const result = depositToVault(args);

      expect(result.data.functionArguments[1]).toBe(Number.MAX_SAFE_INTEGER.toString());
    });
  });

  describe('withdrawFromVault', () => {
    it('should create correct transaction payload for vault withdrawal', () => {
      const args: WithdrawFromVaultArguments = {
        vaultId: 3,
        coinType: '0x1::aptos_coin::AptosCoin',
        shares: 50000000, // 0.5 shares with 8 decimals
      };

      const result = withdrawFromVault(args);

      expect(result.data.function).toContain('withdraw');
      expect(result.data.typeArguments).toEqual(['0x1::aptos_coin::AptosCoin']);
      expect(result.data.functionArguments).toEqual([
        '3',
        '50000000',
      ]);
    });

    it('should handle partial withdrawals', () => {
      const args: WithdrawFromVaultArguments = {
        vaultId: 1,
        coinType: '0x1::aptos_coin::AptosCoin',
        shares: 1, // Minimum withdrawal
      };

      const result = withdrawFromVault(args);

      expect(result.data.functionArguments[1]).toBe('1');
    });

    it('should handle full withdrawals', () => {
      const args: WithdrawFromVaultArguments = {
        vaultId: 2,
        coinType: '0x1::aptos_coin::AptosCoin',
        shares: 1000000000000, // Large amount for full withdrawal
      };

      const result = withdrawFromVault(args);

      expect(result.data.functionArguments[1]).toBe('1000000000000');
    });
  });

  describe('harvestVaultRewards', () => {
    it('should create correct transaction payload for harvesting rewards', () => {
      const args: HarvestVaultRewardsArguments = {
        vaultId: 4,
        coinType: '0x1::aptos_coin::AptosCoin',
      };

      const result = harvestVaultRewards(args);

      expect(result.data.function).toContain('harvest');
      expect(result.data.typeArguments).toEqual(['0x1::aptos_coin::AptosCoin']);
      expect(result.data.functionArguments).toEqual(['4']);
    });

    it('should handle different vault IDs', () => {
      const vault1: HarvestVaultRewardsArguments = {
        vaultId: 1,
        coinType: '0x1::aptos_coin::AptosCoin',
      };

      const vault100: HarvestVaultRewardsArguments = {
        vaultId: 100,
        coinType: '0x1::aptos_coin::AptosCoin',
      };

      expect(harvestVaultRewards(vault1).data.functionArguments[0]).toBe('1');
      expect(harvestVaultRewards(vault100).data.functionArguments[0]).toBe('100');
    });
  });

  describe('Gas Estimation', () => {
    describe('estimateVaultGas', () => {
      it('should return appropriate gas estimates for different operations', () => {
        const createGas = estimateVaultGas('create');
        const depositGas = estimateVaultGas('deposit');
        const withdrawGas = estimateVaultGas('withdraw');
        const harvestGas = estimateVaultGas('harvest');

        expect(createGas).toBeGreaterThan(0);
        expect(depositGas).toBeGreaterThan(0);
        expect(withdrawGas).toBeGreaterThan(0);
        expect(harvestGas).toBeGreaterThan(0);

        // Create should require more gas than other operations
        expect(createGas).toBeGreaterThan(depositGas);
        expect(createGas).toBeGreaterThan(withdrawGas);
      });

      it('should return consistent gas estimates', () => {
        const gas1 = estimateVaultGas('deposit');
        const gas2 = estimateVaultGas('deposit');

        expect(gas1).toBe(gas2);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateVaultCreation', () => {
      it('should validate correct vault creation parameters', () => {
        const args: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 500,
          managementFee: 200,
        };

        const result = validateVaultCreation(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty vault name', () => {
        const args: CreateVaultArguments = {
          name: '',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 500,
          managementFee: 200,
        };

        const result = validateVaultCreation(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Vault name is required');
      });

      it('should reject whitespace-only vault name', () => {
        const args: CreateVaultArguments = {
          name: '   ',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 500,
          managementFee: 200,
        };

        const result = validateVaultCreation(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Vault name is required');
      });

      it('should reject empty token symbol', () => {
        const args: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: '',
          strategyType: 1,
          performanceFee: 500,
          managementFee: 200,
        };

        const result = validateVaultCreation(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Token symbol is required');
      });

      it('should reject invalid strategy types', () => {
        const invalidStrategies = [0, 4, -1, 10];

        invalidStrategies.forEach(strategyType => {
          const args: CreateVaultArguments = {
            name: 'Test Vault',
            tokenSymbol: 'APT',
            strategyType,
            performanceFee: 500,
            managementFee: 200,
          };

          const result = validateVaultCreation(args);

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Strategy type must be 1 (Lending), 2 (LP), or 3 (Staking)');
        });
      });

      it('should reject negative fees', () => {
        const negativePerformanceFee: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: -100,
          managementFee: 200,
        };

        const negativeManagementFee: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 500,
          managementFee: -50,
        };

        expect(validateVaultCreation(negativePerformanceFee).valid).toBe(false);
        expect(validateVaultCreation(negativeManagementFee).valid).toBe(false);
      });

      it('should reject fees above 100%', () => {
        const highPerformanceFee: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 15000, // 150%
          managementFee: 200,
        };

        const highManagementFee: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 500,
          managementFee: 12000, // 120%
        };

        expect(validateVaultCreation(highPerformanceFee).valid).toBe(false);
        expect(validateVaultCreation(highManagementFee).valid).toBe(false);
      });

      it('should accept maximum valid fees (100%)', () => {
        const args: CreateVaultArguments = {
          name: 'Test Vault',
          tokenSymbol: 'APT',
          strategyType: 1,
          performanceFee: 10000, // 100%
          managementFee: 10000, // 100%
        };

        const result = validateVaultCreation(args);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateVaultDeposit', () => {
      it('should validate correct deposit parameters', () => {
        const args: DepositToVaultArguments = {
          vaultId: 1,
          coinType: '0x1::aptos_coin::AptosCoin',
          amount: 1000000000,
        };

        const result = validateVaultDeposit(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject negative vault ID', () => {
        const args: DepositToVaultArguments = {
          vaultId: -1,
          coinType: '0x1::aptos_coin::AptosCoin',
          amount: 1000000000,
        };

        const result = validateVaultDeposit(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Vault ID must be a positive number');
      });

      it('should reject empty coin type', () => {
        const args: DepositToVaultArguments = {
          vaultId: 1,
          coinType: '',
          amount: 1000000000,
        };

        const result = validateVaultDeposit(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Coin type is required');
      });

      it('should reject zero or negative amounts', () => {
        const zeroAmount: DepositToVaultArguments = {
          vaultId: 1,
          coinType: '0x1::aptos_coin::AptosCoin',
          amount: 0,
        };

        const negativeAmount: DepositToVaultArguments = {
          vaultId: 1,
          coinType: '0x1::aptos_coin::AptosCoin',
          amount: -1000,
        };

        expect(validateVaultDeposit(zeroAmount).valid).toBe(false);
        expect(validateVaultDeposit(negativeAmount).valid).toBe(false);
      });

      it('should accept vault ID of 0', () => {
        const args: DepositToVaultArguments = {
          vaultId: 0,
          coinType: '0x1::aptos_coin::AptosCoin',
          amount: 1000000000,
        };

        const result = validateVaultDeposit(args);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateVaultWithdrawal', () => {
      it('should validate correct withdrawal parameters', () => {
        const args: WithdrawFromVaultArguments = {
          vaultId: 2,
          coinType: '0x1::aptos_coin::AptosCoin',
          shares: 50000000,
        };

        const result = validateVaultWithdrawal(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject negative vault ID', () => {
        const args: WithdrawFromVaultArguments = {
          vaultId: -5,
          coinType: '0x1::aptos_coin::AptosCoin',
          shares: 50000000,
        };

        const result = validateVaultWithdrawal(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Vault ID must be a positive number');
      });

      it('should reject empty coin type', () => {
        const args: WithdrawFromVaultArguments = {
          vaultId: 2,
          coinType: '   ',
          shares: 50000000,
        };

        const result = validateVaultWithdrawal(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Coin type is required');
      });

      it('should reject zero or negative shares', () => {
        const zeroShares: WithdrawFromVaultArguments = {
          vaultId: 2,
          coinType: '0x1::aptos_coin::AptosCoin',
          shares: 0,
        };

        const negativeShares: WithdrawFromVaultArguments = {
          vaultId: 2,
          coinType: '0x1::aptos_coin::AptosCoin',
          shares: -1000,
        };

        expect(validateVaultWithdrawal(zeroShares).valid).toBe(false);
        expect(validateVaultWithdrawal(negativeShares).valid).toBe(false);
      });

      it('should handle very large share amounts', () => {
        const args: WithdrawFromVaultArguments = {
          vaultId: 1,
          coinType: '0x1::aptos_coin::AptosCoin',
          shares: Number.MAX_SAFE_INTEGER,
        };

        const result = validateVaultWithdrawal(args);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle vault names with special characters', () => {
      const args: CreateVaultArguments = {
        name: 'High-Yield APT/USDC LP Vault (v2.0)',
        tokenSymbol: 'APT-USDC-LP',
        strategyType: 2,
        performanceFee: 750,
        managementFee: 300,
      };

      const result = createVault(args);

      expect(result.data.functionArguments[0]).toBe('High-Yield APT/USDC LP Vault (v2.0)');
    });

    it('should handle long coin type addresses', () => {
      const longCoinType = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef::very_long_module_name::VeryLongCoinTypeName';
      const args: DepositToVaultArguments = {
        vaultId: 1,
        coinType: longCoinType,
        amount: 1000000,
      };

      const result = depositToVault(args);

      expect(result.data.typeArguments[0]).toBe(longCoinType);
    });

    it('should handle maximum vault ID', () => {
      const args: WithdrawFromVaultArguments = {
        vaultId: Number.MAX_SAFE_INTEGER,
        coinType: '0x1::aptos_coin::AptosCoin',
        shares: 1000000,
      };

      const result = withdrawFromVault(args);

      expect(result.data.functionArguments[0]).toBe(Number.MAX_SAFE_INTEGER.toString());
    });

    it('should trim whitespace from vault names and token symbols', () => {
      const args: CreateVaultArguments = {
        name: '  Test Vault  ',
        tokenSymbol: '  APT  ',
        strategyType: 1,
        performanceFee: 500,
        managementFee: 200,
      };

      const result = validateVaultCreation(args);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple validation errors', () => {
      const args: CreateVaultArguments = {
        name: '',
        tokenSymbol: '',
        strategyType: 0,
        performanceFee: -100,
        managementFee: 15000,
      };

      const result = validateVaultCreation(args);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Vault name is required');
      expect(result.errors).toContain('Token symbol is required');
      expect(result.errors).toContain('Strategy type must be 1 (Lending), 2 (LP), or 3 (Staking)');
    });
  });
});