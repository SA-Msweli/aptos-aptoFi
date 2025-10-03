import {
  getLatestPrice,
  isPriceFresh,
  calculateUSDValue,
  getHistoricalPrice,
  getSupportedTokens,
  getMultipleTokenPrices,
  getTokenPriceInfo,
  getLatestRoundData,
  isOracleActive,
  getPriceStalenessThreshold,
  formatPrice,
  formatPriceChange,
  type PriceData,
  type TokenPriceInfo,
} from '../getOracleData';

// Mock the aptos client
const mockAptosClient = {
  view: jest.fn(),
};

jest.mock('@/lib/aptos', () => ({
  aptosClient: () => mockAptosClient,
}));

jest.mock('@/lib/constants', () => ({
  CONTRACT_ADDRESSES: {
    CHAINLINK_ORACLE: '0x123456789abcdef',
  },
}));

describe('Oracle Data View Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestPrice', () => {
    it('should fetch latest price data correctly', async () => {
      mockAptosClient.view.mockResolvedValue(['4500000000000', '250']); // $45,000 with 8 decimals, 2.5% change

      const result = await getLatestPrice('BTC');

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_latest_price',
          functionArguments: ['BTC'],
        },
      });

      expect(result).toEqual([4500000000000, 250]);
    });

    it('should return [0, 0] on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Token not found'));

      const result = await getLatestPrice('UNKNOWN_TOKEN');

      expect(result).toEqual([0, 0]);
    });

    it('should handle empty response', async () => {
      mockAptosClient.view.mockResolvedValue([]);

      const result = await getLatestPrice('BTC');

      expect(result).toEqual([0, 0]);
    });
  });

  describe('isPriceFresh', () => {
    it('should check if price is fresh', async () => {
      mockAptosClient.view.mockResolvedValue([true]);

      const result = await isPriceFresh('APT');

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::is_price_fresh',
          functionArguments: ['APT'],
        },
      });

      expect(result).toBe(true);
    });

    it('should return false for stale prices', async () => {
      mockAptosClient.view.mockResolvedValue([false]);

      const result = await isPriceFresh('ETH');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Price check failed'));

      const result = await isPriceFresh('APT');

      expect(result).toBe(false);
    });
  });

  describe('calculateUSDValue', () => {
    it('should calculate USD value correctly', async () => {
      mockAptosClient.view.mockResolvedValue(['100050000000']); // $1000.50 with 8 decimals

      const result = await calculateUSDValue('USDC', 1000500000); // 1000.5 USDC

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::calculate_usd_value',
          functionArguments: ['USDC', '1000500000'],
        },
      });

      expect(result).toBe(100050000000);
    });

    it('should return 0 on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Calculation failed'));

      const result = await calculateUSDValue('APT', 1000000000);

      expect(result).toBe(0);
    });
  });

  describe('getHistoricalPrice', () => {
    it('should fetch historical price data for specific round', async () => {
      mockAptosClient.view.mockResolvedValue(['4500000000000', '1640995200', '12345', true]);

      const result = await getHistoricalPrice('BTC', 12345);

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_historical_price',
          functionArguments: ['BTC', '12345'],
        },
      });

      expect(result).toEqual({
        price: 4500000000000,
        timestamp: 1640995200,
        roundId: 12345,
        isFresh: true,
      });
    });

    it('should return null for invalid round', async () => {
      mockAptosClient.view.mockResolvedValue([]);

      const result = await getHistoricalPrice('BTC', 99999);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('History not available'));

      const result = await getHistoricalPrice('BTC', 12340);

      expect(result).toBeNull();
    });
  });

  describe('isOracleActive', () => {
    it('should check if oracle is active', async () => {
      mockAptosClient.view.mockResolvedValue([true]);

      const result = await isOracleActive('APT');

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::is_oracle_active',
          functionArguments: ['APT'],
        },
      });

      expect(result).toBe(true);
    });

    it('should return false for inactive oracle', async () => {
      mockAptosClient.view.mockResolvedValue([false]);

      const result = await isOracleActive('INACTIVE_TOKEN');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Oracle not found'));

      const result = await isOracleActive('UNKNOWN_TOKEN');

      expect(result).toBe(false);
    });
  });

  describe('getSupportedTokens', () => {
    it('should fetch list of supported tokens', async () => {
      const mockTokens = ['BTC', 'ETH', 'APT', 'USDC', 'USDT'];

      mockAptosClient.view.mockResolvedValue([mockTokens]);

      const result = await getSupportedTokens();

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_supported_tokens',
          functionArguments: [],
        },
      });

      expect(result).toEqual(mockTokens);
    });

    it('should return empty array on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Tokens not available'));

      const result = await getSupportedTokens();

      expect(result).toEqual([]);
    });

    it('should handle null response', async () => {
      mockAptosClient.view.mockResolvedValue([null]);

      const result = await getSupportedTokens();

      expect(result).toEqual([]);
    });
  });

  describe('getMultipleTokenPrices', () => {
    it('should fetch multiple token prices', async () => {
      // Mock individual price calls
      mockAptosClient.view
        .mockResolvedValueOnce(['4500000000000', '250']) // BTC price call
        .mockResolvedValueOnce([true]) // BTC freshness call
        .mockResolvedValueOnce(['300000000000', '150']) // ETH price call
        .mockResolvedValueOnce([true]); // ETH freshness call

      const result = await getMultipleTokenPrices(['BTC', 'ETH']);

      expect(result).toHaveLength(2);
      expect(result[0].tokenSymbol).toBe('BTC');
      expect(result[1].tokenSymbol).toBe('ETH');
      expect(result[0].priceUSD).toBe(45000); // 4500000000000 / 100000000
      expect(result[1].priceUSD).toBe(3000); // 300000000000 / 100000000
      expect(result[0].priceChange24h).toBe(2.5); // 250 / 100
      expect(result[1].priceChange24h).toBe(1.5); // 150 / 100
    });

    it('should handle errors for individual tokens', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Price not available'));

      const result = await getMultipleTokenPrices(['BTC', 'ETH']);

      expect(result).toHaveLength(2);
      expect(result[0].tokenSymbol).toBe('BTC');
      expect(result[1].tokenSymbol).toBe('ETH');
      expect(result[0].priceUSD).toBe(0);
      expect(result[1].priceUSD).toBe(0);
      expect(result[0].isStale).toBe(true);
      expect(result[1].isStale).toBe(true);
    });
  });

  describe('getTokenPriceInfo', () => {
    it('should get comprehensive token price information', async () => {
      mockAptosClient.view
        .mockResolvedValueOnce(['4500000000000', '250']) // Price call
        .mockResolvedValueOnce([true]); // Freshness call

      const result = await getTokenPriceInfo('BTC');

      expect(result).toEqual({
        tokenSymbol: 'BTC',
        priceUSD: 45000, // 4500000000000 / 100000000
        priceChange24h: 2.5, // 250 / 100
        lastUpdated: expect.any(Number),
        isStale: false,
      });
    });

    it('should handle stale prices', async () => {
      mockAptosClient.view
        .mockResolvedValueOnce(['4500000000000', '250'])
        .mockResolvedValueOnce([false]); // Stale price

      const result = await getTokenPriceInfo('BTC');

      expect(result.isStale).toBe(true);
    });

    it('should return default values on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Token not found'));

      const result = await getTokenPriceInfo('UNKNOWN_TOKEN');

      expect(result).toEqual({
        tokenSymbol: 'UNKNOWN_TOKEN',
        priceUSD: 0,
        priceChange24h: 0,
        lastUpdated: 0,
        isStale: true,
      });
    });
  });

  describe('getLatestRoundData', () => {
    it('should get latest round data', async () => {
      mockAptosClient.view.mockResolvedValue(['100000000', '1640995200', '12345', true]);

      const result = await getLatestRoundData('USDC');

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_latest_round_data',
          functionArguments: ['USDC'],
        },
      });

      expect(result).toEqual({
        price: 100000000,
        timestamp: 1640995200,
        roundId: 12345,
        isFresh: true,
      });
    });

    it('should return null for invalid response', async () => {
      mockAptosClient.view.mockResolvedValue([]);

      const result = await getLatestRoundData('USDC');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Round data not available'));

      const result = await getLatestRoundData('USDC');

      expect(result).toBeNull();
    });
  });

  describe('getPriceStalenessThreshold', () => {
    it('should get staleness threshold for token', async () => {
      mockAptosClient.view.mockResolvedValue(['1800']); // 30 minutes

      const result = await getPriceStalenessThreshold('BTC');

      expect(mockAptosClient.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_staleness_threshold',
          functionArguments: ['BTC'],
        },
      });

      expect(result).toBe(1800);
    });

    it('should return default threshold on error', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Threshold not available'));

      const result = await getPriceStalenessThreshold('BTC');

      expect(result).toBe(3600); // Default 1 hour
    });
  });



  describe('Utility Functions', () => {
    describe('formatPrice', () => {
      it('should format prices correctly with default decimals', () => {
        expect(formatPrice(4500000000000)).toBe('$45,000.00'); // $45,000 with 8 decimals
        expect(formatPrice(100000000)).toBe('$1.00'); // $1 with 8 decimals
        expect(formatPrice(150000000)).toBe('$1.50'); // $1.50 with 8 decimals
        expect(formatPrice(0)).toBe('$0.00');
      });

      it('should format prices with custom decimals', () => {
        expect(formatPrice(4500000000000, 0)).toBe('$45,000'); // No decimal places
        expect(formatPrice(100000000, 4)).toBe('$1.0000'); // 4 decimal places
      });

      it('should handle very large numbers', () => {
        expect(formatPrice(100000000000000)).toBe('$1,000,000.00'); // $1M
      });

      it('should handle very small numbers', () => {
        expect(formatPrice(1)).toBe('$0.00'); // Less than 1 cent
        expect(formatPrice(1000000, 8)).toBe('$0.01000000'); // 1 cent with 8 decimals
      });
    });

    describe('formatPriceChange', () => {
      it('should format positive price changes', () => {
        const result = formatPriceChange(250); // 2.5% in basis points

        expect(result.formatted).toBe('+2.50%');
        expect(result.color).toBe('text-green-600');
        expect(result.isPositive).toBe(true);
      });

      it('should format negative price changes', () => {
        const result = formatPriceChange(-150); // -1.5% in basis points

        expect(result.formatted).toBe('-1.50%');
        expect(result.color).toBe('text-red-600');
        expect(result.isPositive).toBe(false);
      });

      it('should format zero price change', () => {
        const result = formatPriceChange(0);

        expect(result.formatted).toBe('+0.00%');
        expect(result.color).toBe('text-green-600');
        expect(result.isPositive).toBe(true);
      });

      it('should handle large price changes', () => {
        const result = formatPriceChange(1000); // 10% in basis points

        expect(result.formatted).toBe('+10.00%');
        expect(result.isPositive).toBe(true);
      });

      it('should handle very small price changes', () => {
        const result = formatPriceChange(1); // 0.01% in basis points

        expect(result.formatted).toBe('+0.01%');
        expect(result.isPositive).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed response data for getLatestPrice', async () => {
      mockAptosClient.view.mockResolvedValue([null]);

      const result = await getLatestPrice('BTC');

      expect(result).toEqual([0, 0]);
    });

    it('should handle empty response arrays for getSupportedTokens', async () => {
      mockAptosClient.view.mockResolvedValue([[]]);

      const result = await getSupportedTokens();

      expect(result).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Request timeout'));

      const result = await isPriceFresh('APT');

      expect(result).toBe(false);
    });

    it('should handle invalid token symbols', async () => {
      mockAptosClient.view.mockRejectedValue(new Error('Token not supported'));

      const result = await getLatestPrice('INVALID_TOKEN');

      expect(result).toEqual([0, 0]);
    });

    it('should handle very large price values', async () => {
      mockAptosClient.view.mockResolvedValue([Number.MAX_SAFE_INTEGER.toString(), '0']);

      const result = await getLatestPrice('BTC');

      expect(result[0]).toBe(Number.MAX_SAFE_INTEGER);
      expect(result[1]).toBe(0);
    });

    it('should handle missing data in historical price', async () => {
      mockAptosClient.view.mockResolvedValue(['100000000']); // Missing timestamp, roundId, isFresh

      const result = await getHistoricalPrice('USDC', 12345);

      expect(result).toBeNull();
    });

    it('should handle partial data in round data', async () => {
      mockAptosClient.view.mockResolvedValue(['100000000', '1640995200']); // Missing roundId and isFresh

      const result = await getLatestRoundData('USDC');

      expect(result).toBeNull();
    });

    it('should handle string numbers correctly', async () => {
      mockAptosClient.view.mockResolvedValue(['100000000', '250']);

      const result = await getLatestPrice('USDC');

      expect(result).toEqual([100000000, 250]);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
    });

    it('should handle calculateUSDValue with zero amount', async () => {
      mockAptosClient.view.mockResolvedValue(['0']);

      const result = await calculateUSDValue('USDC', 0);

      expect(result).toBe(0);
    });

    it('should handle empty token array for multiple prices', async () => {
      const result = await getMultipleTokenPrices([]);

      expect(result).toEqual([]);
    });
  });
});