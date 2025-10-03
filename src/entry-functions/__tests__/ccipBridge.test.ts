import {
  initiateCrossChainTransfer,
  sendCrossChainMessage,
  initiateCrossChainSwap,
  getChainSelector,
  getChainName,
  getSupportedChains,
  estimateCrossChainGas,
  validateCrossChainTransfer,
  validateCrossChainMessage,
  validateCrossChainSwap,
  requiresKYCCompliance,
  estimateCrossChainFee,
  SUPPORTED_CHAINS,
  type CrossChainTransferArguments,
  type CrossChainMessageArguments,
  type CrossChainSwapArguments,
} from '../ccipBridge';

describe('CCIP Bridge Entry Functions', () => {
  describe('initiateCrossChainTransfer', () => {
    it('should create correct transaction payload for cross-chain transfer', () => {
      const args: CrossChainTransferArguments = {
        recipient: '0x123456789abcdef',
        token: 'USDC',
        amount: 1000000, // 1 USDC with 6 decimals
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        gasLimit: 200000,
      };

      const result = initiateCrossChainTransfer(args);

      expect(result.data.function).toContain('send_cross_chain_transfer');
      expect(result.data.typeArguments).toEqual([]);
      expect(result.data.functionArguments).toEqual([
        '0x123456789abcdef',
        'USDC',
        '1000000',
        SUPPORTED_CHAINS.ETHEREUM.toString(),
        '200000',
      ]);
    });

    it('should handle large amounts correctly', () => {
      const args: CrossChainTransferArguments = {
        recipient: '0x123456789abcdef',
        token: 'BTC',
        amount: 100000000, // 1 BTC with 8 decimals
        destinationChain: SUPPORTED_CHAINS.POLYGON,
        gasLimit: 300000,
      };

      const result = initiateCrossChainTransfer(args);

      expect(result.data.functionArguments[2]).toBe('100000000');
      expect(result.data.functionArguments[3]).toBe(SUPPORTED_CHAINS.POLYGON.toString());
    });
  });

  describe('sendCrossChainMessage', () => {
    it('should create correct transaction payload for cross-chain message', () => {
      const args: CrossChainMessageArguments = {
        recipient: '0xabcdef123456789',
        message: 'Hello cross-chain world!',
        destinationChain: SUPPORTED_CHAINS.AVALANCHE,
        gasLimit: 150000,
      };

      const result = sendCrossChainMessage(args);

      expect(result.data.function).toContain('send_cross_chain_message');
      expect(result.data.functionArguments).toEqual([
        '0xabcdef123456789',
        'Hello cross-chain world!',
        SUPPORTED_CHAINS.AVALANCHE.toString(),
        '150000',
      ]);
    });

    it('should handle empty message', () => {
      const args: CrossChainMessageArguments = {
        recipient: '0xabcdef123456789',
        message: '',
        destinationChain: SUPPORTED_CHAINS.BASE,
        gasLimit: 100000,
      };

      const result = sendCrossChainMessage(args);

      expect(result.data.functionArguments[1]).toBe('');
    });
  });

  describe('initiateCrossChainSwap', () => {
    it('should create correct transaction payload for cross-chain swap', () => {
      const args: CrossChainSwapArguments = {
        recipient: '0x987654321fedcba',
        tokenIn: 'USDC',
        tokenOut: 'ETH',
        amountIn: 1000000000, // 1000 USDC
        minAmountOut: 500000000000000000, // 0.5 ETH
        destinationChain: SUPPORTED_CHAINS.ARBITRUM,
        gasLimit: 400000,
      };

      const result = initiateCrossChainSwap(args);

      expect(result.data.function).toContain('send_cross_chain_swap');
      expect(result.data.functionArguments).toEqual([
        '0x987654321fedcba',
        'USDC',
        'ETH',
        '1000000000',
        '500000000000000000',
        SUPPORTED_CHAINS.ARBITRUM.toString(),
        '400000',
      ]);
    });

    it('should handle zero minimum amount out', () => {
      const args: CrossChainSwapArguments = {
        recipient: '0x987654321fedcba',
        tokenIn: 'APT',
        tokenOut: 'USDT',
        amountIn: 100000000, // 100 APT
        minAmountOut: 0,
        destinationChain: SUPPORTED_CHAINS.OPTIMISM,
        gasLimit: 350000,
      };

      const result = initiateCrossChainSwap(args);

      expect(result.data.functionArguments[4]).toBe('0');
    });
  });

  describe('Chain Management Utilities', () => {
    describe('getChainSelector', () => {
      it('should return correct chain selector for valid chain names', () => {
        expect(getChainSelector('ETHEREUM')).toBe(SUPPORTED_CHAINS.ETHEREUM);
        expect(getChainSelector('POLYGON')).toBe(SUPPORTED_CHAINS.POLYGON);
        expect(getChainSelector('AVALANCHE')).toBe(SUPPORTED_CHAINS.AVALANCHE);
        expect(getChainSelector('ARBITRUM')).toBe(SUPPORTED_CHAINS.ARBITRUM);
        expect(getChainSelector('OPTIMISM')).toBe(SUPPORTED_CHAINS.OPTIMISM);
        expect(getChainSelector('BASE')).toBe(SUPPORTED_CHAINS.BASE);
      });
    });

    describe('getChainName', () => {
      it('should return correct chain name for valid selectors', () => {
        expect(getChainName(SUPPORTED_CHAINS.ETHEREUM)).toBe('ETHEREUM');
        expect(getChainName(SUPPORTED_CHAINS.POLYGON)).toBe('POLYGON');
        expect(getChainName(SUPPORTED_CHAINS.AVALANCHE)).toBe('AVALANCHE');
        expect(getChainName(SUPPORTED_CHAINS.ARBITRUM)).toBe('ARBITRUM');
        expect(getChainName(SUPPORTED_CHAINS.OPTIMISM)).toBe('OPTIMISM');
        expect(getChainName(SUPPORTED_CHAINS.BASE)).toBe('BASE');
      });

      it('should return undefined for invalid selectors', () => {
        expect(getChainName(999999999)).toBeUndefined();
        expect(getChainName(0)).toBeUndefined();
      });
    });

    describe('getSupportedChains', () => {
      it('should return all supported chains with correct structure', () => {
        const chains = getSupportedChains();

        expect(chains).toHaveLength(6);
        expect(chains[0]).toHaveProperty('name');
        expect(chains[0]).toHaveProperty('selector');

        const chainNames = chains.map(c => c.name);
        expect(chainNames).toContain('ETHEREUM');
        expect(chainNames).toContain('POLYGON');
        expect(chainNames).toContain('AVALANCHE');
        expect(chainNames).toContain('ARBITRUM');
        expect(chainNames).toContain('OPTIMISM');
        expect(chainNames).toContain('BASE');
      });
    });
  });

  describe('Gas Estimation', () => {
    describe('estimateCrossChainGas', () => {
      it('should return higher gas estimates for transfers than messages', () => {
        const transferGas = estimateCrossChainGas('transfer', SUPPORTED_CHAINS.ETHEREUM);
        const messageGas = estimateCrossChainGas('message', SUPPORTED_CHAINS.ETHEREUM);

        expect(transferGas).toBeGreaterThan(messageGas);
      });

      it('should return highest gas estimates for swaps', () => {
        const swapGas = estimateCrossChainGas('swap', SUPPORTED_CHAINS.ETHEREUM);
        const transferGas = estimateCrossChainGas('transfer', SUPPORTED_CHAINS.ETHEREUM);
        const messageGas = estimateCrossChainGas('message', SUPPORTED_CHAINS.ETHEREUM);

        expect(swapGas).toBeGreaterThan(transferGas);
        expect(swapGas).toBeGreaterThan(messageGas);
      });

      it('should apply chain multipliers correctly', () => {
        const ethereumGas = estimateCrossChainGas('transfer', SUPPORTED_CHAINS.ETHEREUM);
        const polygonGas = estimateCrossChainGas('transfer', SUPPORTED_CHAINS.POLYGON);

        // Ethereum should have higher gas due to multiplier
        expect(ethereumGas).toBeGreaterThan(polygonGas);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateCrossChainTransfer', () => {
      it('should validate correct transfer parameters', () => {
        const args: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: 1000000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 200000,
        };

        const result = validateCrossChainTransfer(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty recipient', () => {
        const args: CrossChainTransferArguments = {
          recipient: '',
          token: 'USDC',
          amount: 1000000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 200000,
        };

        const result = validateCrossChainTransfer(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Recipient address is required');
      });

      it('should reject empty token', () => {
        const args: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: '',
          amount: 1000000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 200000,
        };

        const result = validateCrossChainTransfer(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Token address is required');
      });

      it('should reject zero or negative amounts', () => {
        const zeroAmountArgs: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: 0,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 200000,
        };

        const negativeAmountArgs: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: -1000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 200000,
        };

        expect(validateCrossChainTransfer(zeroAmountArgs).valid).toBe(false);
        expect(validateCrossChainTransfer(negativeAmountArgs).valid).toBe(false);
      });

      it('should reject unsupported destination chains', () => {
        const args: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: 1000000,
          destinationChain: 999999999, // Invalid chain
          gasLimit: 200000,
        };

        const result = validateCrossChainTransfer(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Unsupported destination chain');
      });

      it('should reject zero or negative gas limits', () => {
        const zeroGasArgs: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: 1000000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: 0,
        };

        const negativeGasArgs: CrossChainTransferArguments = {
          recipient: '0x123456789abcdef',
          token: 'USDC',
          amount: 1000000,
          destinationChain: SUPPORTED_CHAINS.ETHEREUM,
          gasLimit: -1000,
        };

        expect(validateCrossChainTransfer(zeroGasArgs).valid).toBe(false);
        expect(validateCrossChainTransfer(negativeGasArgs).valid).toBe(false);
      });
    });

    describe('validateCrossChainMessage', () => {
      it('should validate correct message parameters', () => {
        const args: CrossChainMessageArguments = {
          recipient: '0x123456789abcdef',
          message: 'Hello world',
          destinationChain: SUPPORTED_CHAINS.POLYGON,
          gasLimit: 150000,
        };

        const result = validateCrossChainMessage(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty message', () => {
        const args: CrossChainMessageArguments = {
          recipient: '0x123456789abcdef',
          message: '',
          destinationChain: SUPPORTED_CHAINS.POLYGON,
          gasLimit: 150000,
        };

        const result = validateCrossChainMessage(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Message content is required');
      });

      it('should reject messages that are too long', () => {
        const longMessage = 'a'.repeat(1001); // 1001 characters
        const args: CrossChainMessageArguments = {
          recipient: '0x123456789abcdef',
          message: longMessage,
          destinationChain: SUPPORTED_CHAINS.POLYGON,
          gasLimit: 150000,
        };

        const result = validateCrossChainMessage(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Message content must be less than 1000 characters');
      });
    });

    describe('validateCrossChainSwap', () => {
      it('should validate correct swap parameters', () => {
        const args: CrossChainSwapArguments = {
          recipient: '0x123456789abcdef',
          tokenIn: 'USDC',
          tokenOut: 'ETH',
          amountIn: 1000000,
          minAmountOut: 500000000000000000,
          destinationChain: SUPPORTED_CHAINS.ARBITRUM,
          gasLimit: 400000,
        };

        const result = validateCrossChainSwap(args);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject same input and output tokens', () => {
        const args: CrossChainSwapArguments = {
          recipient: '0x123456789abcdef',
          tokenIn: 'USDC',
          tokenOut: 'USDC',
          amountIn: 1000000,
          minAmountOut: 1000000,
          destinationChain: SUPPORTED_CHAINS.ARBITRUM,
          gasLimit: 400000,
        };

        const result = validateCrossChainSwap(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Input and output tokens must be different');
      });

      it('should reject negative minimum amount out', () => {
        const args: CrossChainSwapArguments = {
          recipient: '0x123456789abcdef',
          tokenIn: 'USDC',
          tokenOut: 'ETH',
          amountIn: 1000000,
          minAmountOut: -1,
          destinationChain: SUPPORTED_CHAINS.ARBITRUM,
          gasLimit: 400000,
        };

        const result = validateCrossChainSwap(args);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Minimum output amount cannot be negative');
      });
    });
  });

  describe('Compliance and Fee Functions', () => {
    describe('requiresKYCCompliance', () => {
      it('should require KYC for high-value transactions', () => {
        const highValueAmount = 15000; // Above $10,000 threshold
        const result = requiresKYCCompliance(highValueAmount, SUPPORTED_CHAINS.POLYGON);

        expect(result).toBe(true);
      });

      it('should not require KYC for low-value transactions to non-restricted chains', () => {
        const lowValueAmount = 5000; // Below $10,000 threshold
        const result = requiresKYCCompliance(lowValueAmount, SUPPORTED_CHAINS.POLYGON);

        expect(result).toBe(false);
      });

      it('should require KYC for restricted chains regardless of amount', () => {
        const lowValueAmount = 1000;
        const result = requiresKYCCompliance(lowValueAmount, SUPPORTED_CHAINS.ETHEREUM);

        expect(result).toBe(true);
      });
    });

    describe('estimateCrossChainFee', () => {
      it('should calculate fees correctly for transfers', () => {
        const fee = estimateCrossChainFee('transfer', 1000, SUPPORTED_CHAINS.POLYGON);

        expect(fee).toBeGreaterThan(0);
        expect(typeof fee).toBe('number');
      });

      it('should calculate higher fees for Ethereum', () => {
        const ethereumFee = estimateCrossChainFee('transfer', 1000, SUPPORTED_CHAINS.ETHEREUM);
        const polygonFee = estimateCrossChainFee('transfer', 1000, SUPPORTED_CHAINS.POLYGON);

        expect(ethereumFee).toBeGreaterThan(polygonFee);
      });

      it('should include percentage fees for transfers and swaps', () => {
        const transferFeeWithAmount = estimateCrossChainFee('transfer', 10000, SUPPORTED_CHAINS.POLYGON);
        const transferFeeWithoutAmount = estimateCrossChainFee('transfer', 0, SUPPORTED_CHAINS.POLYGON);

        expect(transferFeeWithAmount).toBeGreaterThan(transferFeeWithoutAmount);
      });

      it('should not include percentage fees for messages', () => {
        const messageFeeWithAmount = estimateCrossChainFee('message', 10000, SUPPORTED_CHAINS.POLYGON);
        const messageFeeWithoutAmount = estimateCrossChainFee('message', 0, SUPPORTED_CHAINS.POLYGON);

        expect(messageFeeWithAmount).toBe(messageFeeWithoutAmount);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle whitespace in recipient addresses', () => {
      const args: CrossChainTransferArguments = {
        recipient: '  0x123456789abcdef  ',
        token: 'USDC',
        amount: 1000000,
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        gasLimit: 200000,
      };

      const result = validateCrossChainTransfer(args);

      expect(result.valid).toBe(true);
    });

    it('should handle whitespace in token addresses', () => {
      const args: CrossChainTransferArguments = {
        recipient: '0x123456789abcdef',
        token: '  USDC  ',
        amount: 1000000,
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        gasLimit: 200000,
      };

      const result = validateCrossChainTransfer(args);

      expect(result.valid).toBe(true);
    });

    it('should handle very large amounts', () => {
      const args: CrossChainTransferArguments = {
        recipient: '0x123456789abcdef',
        token: 'USDC',
        amount: Number.MAX_SAFE_INTEGER,
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        gasLimit: 200000,
      };

      const result = initiateCrossChainTransfer(args);

      expect(result.data.functionArguments[2]).toBe(Number.MAX_SAFE_INTEGER.toString());
    });

    it('should handle maximum message length', () => {
      const maxMessage = 'a'.repeat(1000); // Exactly 1000 characters
      const args: CrossChainMessageArguments = {
        recipient: '0x123456789abcdef',
        message: maxMessage,
        destinationChain: SUPPORTED_CHAINS.POLYGON,
        gasLimit: 150000,
      };

      const result = validateCrossChainMessage(args);

      expect(result.valid).toBe(true);
    });
  });
});