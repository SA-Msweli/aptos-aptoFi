import {
  getSupportedChains,
  getTransferStatus,
  getTransferDetails,
  getUserCCIPStats,
  getUserTransferHistory,
  estimateCrossChainFee,
  getPendingTransfers,
  getUserMessages,
  getGlobalCCIPStats,
  isChainSupported,
  getRecommendedGasLimit,
  formatTransferAmount,
  getStatusColor,
  getEstimatedCompletionTime,
  type SupportedChain,
  type CrossChainTransfer,
  type TransferStatus,
  type CCIPStats,
} from '../getCCIPData';

import { SUPPORTED_CHAINS } from '../../entry-functions/ccipBridge';

// Mock the aptos client
const mockAptos = {
  view: jest.fn(),
};

jest.mock('@/lib/aptos', () => ({
  aptos: mockAptos,
}));

jest.mock('@/lib/constants', () => ({
  CONTRACT_ADDRESSES: {
    CCIP_BRIDGE: '0x123456789abcdef',
  },
}));

describe('CCIP Data View Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupportedChains', () => {
    it('should fetch and transform supported chains data', async () => {
      const mockChainsData = [
        {
          selector: SUPPORTED_CHAINS.ETHEREUM.toString(),
          is_active: true,
          min_gas_limit: '100000',
          max_gas_limit: '2000000',
          base_fee: '0.01',
        },
        {
          selector: SUPPORTED_CHAINS.POLYGON.toString(),
          is_active: true,
          min_gas_limit: '80000',
          max_gas_limit: '1500000',
          base_fee: '0.005',
        },
      ];

      mockAptos.view.mockResolvedValue([mockChainsData]);

      const result = await getSupportedChains();

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_supported_chains',
          typeArguments: [],
          functionArguments: [],
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'ETHEREUM',
        selector: SUPPORTED_CHAINS.ETHEREUM,
        isActive: true,
        minGasLimit: 100000,
        maxGasLimit: 2000000,
        baseFee: 0.01,
      });
    });

    it('should return default chains on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Network error'));

      const result = await getSupportedChains();

      expect(result).toHaveLength(6); // All supported chains
      expect(result[0].name).toBe('ETHEREUM');
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('getTransferStatus', () => {
    it('should fetch transfer status correctly', async () => {
      const mockStatusData = {
        status: '2', // Confirmed
        timestamp: '1640995200',
        block_number: '12345678',
        transaction_hash: '0xabcdef123456789',
        error_message: null,
      };

      mockAptos.view.mockResolvedValue([mockStatusData]);

      const result = await getTransferStatus(123);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_transfer_status',
          typeArguments: [],
          functionArguments: ['123'],
        },
      });

      expect(result).toEqual({
        status: 'confirmed',
        timestamp: 1640995200,
        blockNumber: 12345678,
        transactionHash: '0xabcdef123456789',
        errorMessage: undefined,
      });
    });

    it('should handle different status codes', async () => {
      const statusCodes = [
        { code: '0', expected: 'pending' },
        { code: '1', expected: 'sent' },
        { code: '2', expected: 'confirmed' },
        { code: '3', expected: 'failed' },
        { code: '999', expected: 'pending' }, // Unknown status defaults to pending
      ];

      for (const { code, expected } of statusCodes) {
        mockAptos.view.mockResolvedValue([{
          status: code,
          timestamp: '1640995200',
        }]);

        const result = await getTransferStatus(123);
        expect(result?.status).toBe(expected);
      }
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Transfer not found'));

      const result = await getTransferStatus(999);

      expect(result).toBeNull();
    });
  });

  describe('getTransferDetails', () => {
    it('should fetch complete transfer details', async () => {
      const mockTransferData = {
        id: '123',
        sender: '0x123456789abcdef',
        recipient: '0xfedcba987654321',
        token: 'USDC',
        amount: '1000000000',
        destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
        fee: '10000000',
        created_at: '1640995100',
        executed_at: '1640995200',
        ccip_message_id: [1, 2, 3, 4, 5],
      };

      const mockStatusData = {
        status: '2',
        timestamp: '1640995200',
      };

      mockAptos.view
        .mockResolvedValueOnce([mockTransferData])
        .mockResolvedValueOnce([mockStatusData]);

      const result = await getTransferDetails(123);

      expect(result).toEqual({
        id: 123,
        sender: '0x123456789abcdef',
        recipient: '0xfedcba987654321',
        token: 'USDC',
        amount: 1000000000,
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        fee: 10000000,
        status: {
          status: 'confirmed',
          timestamp: 1640995200,
        },
        createdAt: 1640995100,
        executedAt: 1640995200,
        ccipMessageId: [1, 2, 3, 4, 5],
      });
    });

    it('should return null on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Transfer not found'));

      const result = await getTransferDetails(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserCCIPStats', () => {
    it('should fetch user CCIP statistics', async () => {
      const mockStatsData = {
        total_transfers: '25',
        total_messages: '10',
        total_sent: '15000000000',
        total_received: '12000000000',
        total_volume: '27000000000',
        success_rate: '0.96',
      };

      mockAptos.view.mockResolvedValue([mockStatsData]);

      const result = await getUserCCIPStats('0x123456789abcdef');

      expect(result).toEqual({
        totalTransfers: 25,
        totalMessages: 10,
        totalSent: 15000000000,
        totalReceived: 12000000000,
        totalVolume: 27000000000,
        successRate: 0.96,
      });
    });

    it('should return zero stats on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getUserCCIPStats('0x123456789abcdef');

      expect(result).toEqual({
        totalTransfers: 0,
        totalMessages: 0,
        totalSent: 0,
        totalReceived: 0,
        totalVolume: 0,
        successRate: 0,
      });
    });
  });

  describe('getUserTransferHistory', () => {
    it('should fetch user transfer history with status', async () => {
      const mockTransfersData = [
        {
          id: '1',
          sender: '0x123456789abcdef',
          recipient: '0xfedcba987654321',
          token: 'USDC',
          amount: '1000000000',
          destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
          fee: '10000000',
          created_at: '1640995100',
          executed_at: '1640995200',
          ccip_message_id: [1, 2, 3],
        },
        {
          id: '2',
          sender: '0x123456789abcdef',
          recipient: '0xabcdef123456789',
          token: 'APT',
          amount: '500000000',
          destination_chain: SUPPORTED_CHAINS.POLYGON.toString(),
          fee: '5000000',
          created_at: '1640995000',
          executed_at: '1640995100',
          ccip_message_id: [4, 5, 6],
        },
      ];

      const mockStatus1 = { status: '2', timestamp: '1640995200' };
      const mockStatus2 = { status: '1', timestamp: '1640995100' };

      mockAptos.view
        .mockResolvedValueOnce([mockTransfersData])
        .mockResolvedValueOnce([mockStatus1])
        .mockResolvedValueOnce([mockStatus2]);

      const result = await getUserTransferHistory('0x123456789abcdef', 10, 0);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].status.status).toBe('confirmed');
      expect(result[1].id).toBe(2);
      expect(result[1].status.status).toBe('sent');
    });

    it('should handle pagination parameters', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      await getUserTransferHistory('0x123456789abcdef', 25, 50);

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_user_transfer_history',
          typeArguments: [],
          functionArguments: ['0x123456789abcdef', '25', '50'],
        },
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getUserTransferHistory('0x123456789abcdef');

      expect(result).toEqual([]);
    });
  });

  describe('estimateCrossChainFee', () => {
    it('should estimate cross-chain fees correctly', async () => {
      const mockFeeData = {
        base_fee: '0.01',
        gas_price: '0.001',
        total_fee: '0.015',
        estimated_time: '600',
      };

      mockAptos.view.mockResolvedValue([mockFeeData]);

      const result = await estimateCrossChainFee(SUPPORTED_CHAINS.ETHEREUM, 200000, 1000000000);

      expect(result).toEqual({
        baseFee: 0.01,
        gasPrice: 0.001,
        totalFee: 0.015,
        estimatedTime: 600,
      });
    });

    it('should return fallback estimate on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Fee estimation failed'));

      const result = await estimateCrossChainFee(SUPPORTED_CHAINS.ETHEREUM, 200000, 1000000000);

      expect(result.baseFee).toBe(0.01);
      expect(result.gasPrice).toBe(0.001);
      expect(result.estimatedTime).toBe(600);
      expect(result.totalFee).toBeGreaterThan(0);
    });
  });

  describe('getPendingTransfers', () => {
    it('should fetch only pending and sent transfers', async () => {
      const mockTransfersData = [
        {
          id: '1',
          sender: '0x123456789abcdef',
          recipient: '0xfedcba987654321',
          token: 'USDC',
          amount: '1000000000',
          destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
          fee: '10000000',
          created_at: '1640995100',
          executed_at: '0',
          ccip_message_id: [1, 2, 3],
        },
        {
          id: '2',
          sender: '0x123456789abcdef',
          recipient: '0xabcdef123456789',
          token: 'APT',
          amount: '500000000',
          destination_chain: SUPPORTED_CHAINS.POLYGON.toString(),
          fee: '5000000',
          created_at: '1640995000',
          executed_at: '0',
          ccip_message_id: [4, 5, 6],
        },
      ];

      const mockStatus1 = { status: '0', timestamp: '1640995100' }; // Pending
      const mockStatus2 = { status: '2', timestamp: '1640995100' }; // Confirmed (should be filtered out)

      mockAptos.view
        .mockResolvedValueOnce([mockTransfersData])
        .mockResolvedValueOnce([mockStatus1])
        .mockResolvedValueOnce([mockStatus2]);

      const result = await getPendingTransfers('0x123456789abcdef');

      expect(result).toHaveLength(1); // Only pending transfer
      expect(result[0].id).toBe(1);
      expect(result[0].status.status).toBe('pending');
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('User not found'));

      const result = await getPendingTransfers('0x123456789abcdef');

      expect(result).toEqual([]);
    });
  });

  describe('getUserMessages', () => {
    it('should fetch user cross-chain messages', async () => {
      const mockMessagesData = [
        {
          id: '1',
          sender: '0x123456789abcdef',
          recipient: '0xfedcba987654321',
          message: 'Hello cross-chain!',
          destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
          fee: '5000000',
          created_at: '1640995100',
          ccip_message_id: [1, 2, 3],
        },
      ];

      const mockStatus = { status: '2', timestamp: '1640995200' };

      mockAptos.view
        .mockResolvedValueOnce([mockMessagesData])
        .mockResolvedValueOnce([mockStatus]);

      const result = await getUserMessages('0x123456789abcdef', 50);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        sender: '0x123456789abcdef',
        recipient: '0xfedcba987654321',
        message: 'Hello cross-chain!',
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        fee: 5000000,
        status: {
          status: 'confirmed',
          timestamp: 1640995200,
        },
        createdAt: 1640995100,
        ccipMessageId: [1, 2, 3],
      });
    });

    it('should return empty array on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Messages not found'));

      const result = await getUserMessages('0x123456789abcdef');

      expect(result).toEqual([]);
    });
  });

  describe('getGlobalCCIPStats', () => {
    it('should fetch global CCIP statistics', async () => {
      const mockGlobalStats = {
        total_transfers: '1000',
        total_messages: '500',
        total_sent: '1000000000000',
        total_received: '950000000000',
        total_volume: '1950000000000',
        success_rate: '0.98',
      };

      mockAptos.view.mockResolvedValue([mockGlobalStats]);

      const result = await getGlobalCCIPStats();

      expect(result).toEqual({
        totalTransfers: 1000,
        totalMessages: 500,
        totalSent: 1000000000000,
        totalReceived: 950000000000,
        totalVolume: 1950000000000,
        successRate: 0.98,
      });
    });

    it('should return zero stats on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Stats not available'));

      const result = await getGlobalCCIPStats();

      expect(result).toEqual({
        totalTransfers: 0,
        totalMessages: 0,
        totalSent: 0,
        totalReceived: 0,
        totalVolume: 0,
        successRate: 0,
      });
    });
  });

  describe('isChainSupported', () => {
    it('should check if chain is supported and active', async () => {
      const mockChainsData = [
        {
          selector: SUPPORTED_CHAINS.ETHEREUM.toString(),
          is_active: true,
          min_gas_limit: '100000',
          max_gas_limit: '2000000',
          base_fee: '0.01',
        },
        {
          selector: SUPPORTED_CHAINS.POLYGON.toString(),
          is_active: false,
          min_gas_limit: '80000',
          max_gas_limit: '1500000',
          base_fee: '0.005',
        },
      ];

      mockAptos.view.mockResolvedValue([mockChainsData]);

      const ethereumSupported = await isChainSupported(SUPPORTED_CHAINS.ETHEREUM);
      const polygonSupported = await isChainSupported(SUPPORTED_CHAINS.POLYGON);
      const unknownSupported = await isChainSupported(999999999);

      expect(ethereumSupported).toBe(true);
      expect(polygonSupported).toBe(false); // Inactive
      expect(unknownSupported).toBe(false);
    });

    it('should fallback to hardcoded chains on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Network error'));

      const result = await isChainSupported(SUPPORTED_CHAINS.ETHEREUM);

      expect(result).toBe(true);
    });
  });

  describe('getRecommendedGasLimit', () => {
    it('should fetch recommended gas limits', async () => {
      mockAptos.view.mockResolvedValue(['250000']);

      const result = await getRecommendedGasLimit(SUPPORTED_CHAINS.ETHEREUM, 'transfer');

      expect(mockAptos.view).toHaveBeenCalledWith({
        payload: {
          function: '0x123456789abcdef::get_recommended_gas_limit',
          typeArguments: [],
          functionArguments: [SUPPORTED_CHAINS.ETHEREUM.toString(), 'transfer'],
        },
      });

      expect(result).toBe(250000);
    });

    it('should return fallback gas limits on error', async () => {
      mockAptos.view.mockRejectedValue(new Error('Gas limit not available'));

      const transferGas = await getRecommendedGasLimit(SUPPORTED_CHAINS.ETHEREUM, 'transfer');
      const messageGas = await getRecommendedGasLimit(SUPPORTED_CHAINS.ETHEREUM, 'message');
      const swapGas = await getRecommendedGasLimit(SUPPORTED_CHAINS.ETHEREUM, 'swap');

      expect(transferGas).toBe(200000);
      expect(messageGas).toBe(150000);
      expect(swapGas).toBe(300000);
    });
  });

  describe('Utility Functions', () => {
    describe('formatTransferAmount', () => {
      it('should format transfer amounts correctly', () => {
        expect(formatTransferAmount(100000000, 8)).toBe('1');
        expect(formatTransferAmount(150000000, 8)).toBe('1.5');
        expect(formatTransferAmount(1000000, 6)).toBe('1');
        expect(formatTransferAmount(1500000, 6)).toBe('1.5');
        expect(formatTransferAmount(0, 8)).toBe('0');
      });

      it('should handle default decimals', () => {
        expect(formatTransferAmount(100000000)).toBe('1');
      });

      it('should remove trailing zeros', () => {
        expect(formatTransferAmount(100000000, 8)).toBe('1');
        expect(formatTransferAmount(100000001, 8)).toBe('1.00000001');
      });
    });

    describe('getStatusColor', () => {
      it('should return correct colors for different statuses', () => {
        expect(getStatusColor('pending')).toBe('#f59e0b');
        expect(getStatusColor('sent')).toBe('#3b82f6');
        expect(getStatusColor('confirmed')).toBe('#10b981');
        expect(getStatusColor('failed')).toBe('#ef4444');
        expect(getStatusColor('unknown')).toBe('#6b7280');
      });
    });

    describe('getEstimatedCompletionTime', () => {
      it('should calculate estimated completion time correctly', () => {
        const now = Date.now() / 1000;
        const createdAt = now - 60; // 1 minute ago

        const pendingTime = getEstimatedCompletionTime('pending', createdAt);
        const sentTime = getEstimatedCompletionTime('sent', createdAt);
        const confirmedTime = getEstimatedCompletionTime('confirmed', createdAt);
        const failedTime = getEstimatedCompletionTime('failed', createdAt);

        expect(pendingTime).toBe(240); // 300 - 60 = 240 seconds remaining
        expect(sentTime).toBe(540); // 600 - 60 = 540 seconds remaining
        expect(confirmedTime).toBe(0);
        expect(failedTime).toBe(0);
      });

      it('should return 0 for overdue transactions', () => {
        const now = Date.now() / 1000;
        const createdAt = now - 400; // 400 seconds ago (overdue for pending)

        const result = getEstimatedCompletionTime('pending', createdAt);

        expect(result).toBe(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed response data', async () => {
      mockAptos.view.mockResolvedValue([null]);

      const result = await getSupportedChains();

      expect(result).toHaveLength(6); // Falls back to default chains
    });

    it('should handle empty response arrays', async () => {
      mockAptos.view.mockResolvedValue([[]]);

      const result = await getUserTransferHistory('0x123456789abcdef');

      expect(result).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      mockAptos.view.mockRejectedValue(new Error('Request timeout'));

      const result = await getUserCCIPStats('0x123456789abcdef');

      expect(result.totalTransfers).toBe(0);
    });

    it('should handle invalid transfer IDs', async () => {
      mockAptos.view.mockRejectedValue(new Error('Transfer does not exist'));

      const result = await getTransferDetails(-1);

      expect(result).toBeNull();
    });

    it('should handle very large numbers', async () => {
      const mockTransferData = {
        id: '1',
        sender: '0x123456789abcdef',
        recipient: '0xfedcba987654321',
        token: 'USDC',
        amount: Number.MAX_SAFE_INTEGER.toString(),
        destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
        fee: Number.MAX_SAFE_INTEGER.toString(),
        created_at: '1640995100',
        executed_at: '1640995200',
        ccip_message_id: [1, 2, 3],
      };

      const mockStatus = { status: '2', timestamp: '1640995200' };

      mockAptos.view
        .mockResolvedValueOnce([mockTransferData])
        .mockResolvedValueOnce([mockStatus]);

      const result = await getTransferDetails(1);

      expect(result?.amount).toBe(Number.MAX_SAFE_INTEGER);
      expect(result?.fee).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle missing optional fields', async () => {
      const mockStatusData = {
        status: '1',
        timestamp: '1640995200',
        // Missing optional fields
      };

      mockAptos.view.mockResolvedValue([mockStatusData]);

      const result = await getTransferStatus(123);

      expect(result).toEqual({
        status: 'sent',
        timestamp: 1640995200,
        blockNumber: undefined,
        transactionHash: undefined,
        errorMessage: undefined,
      });
    });

    it('should handle empty CCIP message IDs', async () => {
      const mockTransferData = {
        id: '1',
        sender: '0x123456789abcdef',
        recipient: '0xfedcba987654321',
        token: 'USDC',
        amount: '1000000000',
        destination_chain: SUPPORTED_CHAINS.ETHEREUM.toString(),
        fee: '10000000',
        created_at: '1640995100',
        executed_at: '1640995200',
        ccip_message_id: null,
      };

      const mockStatus = { status: '2', timestamp: '1640995200' };

      mockAptos.view
        .mockResolvedValueOnce([mockTransferData])
        .mockResolvedValueOnce([mockStatus]);

      const result = await getTransferDetails(1);

      expect(result?.ccipMessageId).toEqual([]);
    });
  });
});