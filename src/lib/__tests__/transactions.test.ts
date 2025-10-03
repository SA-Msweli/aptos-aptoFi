import { renderHook, act } from '@testing-library/react';
import { useTransactions, TransactionResult } from '../transactions';

// Mock the wallet adapter
const mockSignAndSubmitTransaction = jest.fn();
const mockAccount = { address: '0x123456789abcdef' };

jest.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: () => ({
    signAndSubmitTransaction: mockSignAndSubmitTransaction,
    account: mockAccount,
    connected: true,
  }),
}));

// Mock the aptos client
const mockAptos = {
  view: jest.fn(),
  getTransactionByHash: jest.fn(),
  getAccountTransactions: jest.fn(),
  waitForTransaction: jest.fn(),
};

jest.mock('@/lib/aptos', () => ({
  aptos: mockAptos,
}));

describe('Enhanced Transaction Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTransactions hook', () => {
    describe('executeTransaction', () => {
      it('should execute transaction successfully', async () => {
        const mockTransactionData = {
          data: {
            function: 'test_function',
            typeArguments: [],
            functionArguments: ['arg1', 'arg2'],
          },
        };

        const mockTransactionResponse = {
          hash: '0xabcdef123456789',
          success: true,
          gas_used: '1500',
          timestamp: '1640995200000000',
        };

        mockSignAndSubmitTransaction.mockResolvedValue(mockTransactionResponse);
        mockAptos.getTransactionByHash.mockResolvedValue({
          type: 'user_transaction',
          success: true,
          hash: '0xabcdef123456789',
          gas_used: '1500',
          timestamp: '1640995200000000',
          version: '12345',
        });

        const { result } = renderHook(() => useTransactions());

        let transactionResult: TransactionResult;
        await act(async () => {
          transactionResult = await result.current.executeTransaction(mockTransactionData);
        });

        expect(transactionResult!.hash).toBe('0xabcdef123456789');
        expect(transactionResult!.success).toBe(true);
        expect(transactionResult!.gasUsed).toBe(1500);
      });

      it('should handle transaction failure with user-friendly error', async () => {
        const mockTransactionData = {
          data: {
            function: 'test_function',
            typeArguments: [],
            functionArguments: ['arg1', 'arg2'],
          },
        };

        const mockError = new Error('E_INSUFFICIENT_BALANCE');
        mockSignAndSubmitTransaction.mockRejectedValue(mockError);

        const { result } = renderHook(() => useTransactions());

        let transactionResult: TransactionResult;
        await act(async () => {
          transactionResult = await result.current.executeTransaction(mockTransactionData);
        });

        expect(transactionResult!.success).toBe(false);
        expect(transactionResult!.errorMessage).toContain('E_INSUFFICIENT_BALANCE');
        expect(transactionResult!.userFriendlyError).toBeDefined();
        expect(transactionResult!.retryable).toBe(true);
      });

      it('should handle wallet not connected', async () => {
        // Mock disconnected wallet
        jest.doMock('@aptos-labs/wallet-adapter-react', () => ({
          useWallet: () => ({
            signAndSubmitTransaction: mockSignAndSubmitTransaction,
            account: null,
            connected: false,
          }),
        }));

        const { result } = renderHook(() => useTransactions());

        const mockTransactionData = {
          data: {
            function: 'test_function',
            typeArguments: [],
            functionArguments: [],
          },
        };

        let transactionResult: TransactionResult;
        await act(async () => {
          transactionResult = await result.current.executeTransaction(mockTransactionData);
        });

        expect(transactionResult!.success).toBe(false);
        expect(transactionResult!.errorMessage).toContain('Wallet not connected');
      });
    });

    describe('getTransactionStatus', () => {
      it('should get transaction status correctly', async () => {
        mockAptos.getTransactionByHash.mockResolvedValue({
          type: 'user_transaction',
          success: true,
          hash: '0xabcdef123456789',
          gas_used: '1500',
          timestamp: '1640995200000000',
          version: '12345',
        });

        const { result } = renderHook(() => useTransactions());

        let status: any;
        await act(async () => {
          status = await result.current.getTransactionStatus('0xabcdef123456789');
        });

        expect(status.success).toBe(true);
        expect(status.hash).toBe('0xabcdef123456789');
      });

      it('should handle pending transactions', async () => {
        mockAptos.getTransactionByHash.mockResolvedValue({
          type: 'pending_transaction',
          hash: '0xabcdef123456789',
        });

        const { result } = renderHook(() => useTransactions());

        let status: any;
        await act(async () => {
          status = await result.current.getTransactionStatus('0xabcdef123456789');
        });

        expect(status.pending).toBe(true);
        expect(status.hash).toBe('0xabcdef123456789');
      });
    });

    describe('isTransactionPending', () => {
      it('should check if transaction is pending', async () => {
        mockAptos.getTransactionByHash.mockResolvedValue({
          type: 'pending_transaction',
          hash: '0xabcdef123456789',
        });

        const { result } = renderHook(() => useTransactions());

        let isPending: boolean = false;
        await act(async () => {
          isPending = await result.current.isTransactionPending('0xabcdef123456789');
        });

        expect(isPending).toBe(true);
      });

      it('should return false for completed transactions', async () => {
        mockAptos.getTransactionByHash.mockResolvedValue({
          type: 'user_transaction',
          success: true,
          hash: '0xabcdef123456789',
        });

        const { result } = renderHook(() => useTransactions());

        let isPending: boolean = true;
        await act(async () => {
          isPending = await result.current.isTransactionPending('0xabcdef123456789');
        });

        expect(isPending).toBe(false);
      });
    });

    describe('getAccountTransactions', () => {
      it('should fetch account transactions', async () => {
        const mockTransactions = [
          {
            type: 'user_transaction',
            success: true,
            hash: '0xabcdef123456789',
            version: '12345',
            timestamp: '1640995200000000',
          },
        ];

        mockAptos.getAccountTransactions.mockResolvedValue(mockTransactions);

        const { result } = renderHook(() => useTransactions());

        let transactions: any[];
        await act(async () => {
          transactions = await result.current.getAccountTransactions();
        });

        expect(transactions!).toEqual(mockTransactions);
        expect(mockAptos.getAccountTransactions).toHaveBeenCalled();
      });

      it('should return empty array on error', async () => {
        mockAptos.getAccountTransactions.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useTransactions());

        let transactions: any[];
        await act(async () => {
          transactions = await result.current.getAccountTransactions();
        });

        expect(transactions!).toEqual([]);
      });
    });

    describe('Specific Transaction Types', () => {
      it('should have methods for specific transaction types', () => {
        const { result } = renderHook(() => useTransactions());

        // Check that specific transaction methods exist
        expect(typeof result.current.transferAPTTokens).toBe('function');
        expect(typeof result.current.createDIDProfile).toBe('function');
        expect(typeof result.current.createYieldVault).toBe('function');
        expect(typeof result.current.executeCrossChainTransfer).toBe('function');
        expect(typeof result.current.updateUserPositionRisk).toBe('function');
      });
    });

    describe('State Properties', () => {
      it('should expose wallet connection state', () => {
        const { result } = renderHook(() => useTransactions());

        expect(result.current.connected).toBe(true);
        expect(result.current.account).toEqual(mockAccount);
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors gracefully', async () => {
        const mockTransactionData = {
          data: {
            function: 'test_function',
            typeArguments: [],
            functionArguments: [],
          },
        };

        mockSignAndSubmitTransaction.mockRejectedValue(new Error('Network timeout'));

        const { result } = renderHook(() => useTransactions());

        let transactionResult: TransactionResult;
        await act(async () => {
          transactionResult = await result.current.executeTransaction(mockTransactionData);
        });

        expect(transactionResult!.success).toBe(false);
        expect(transactionResult!.errorMessage).toContain('Network timeout');
      });

      it('should handle malformed transaction responses', async () => {
        const mockTransactionData = {
          data: {
            function: 'test_function',
            typeArguments: [],
            functionArguments: [],
          },
        };

        // Return malformed response
        mockSignAndSubmitTransaction.mockResolvedValue({
          // Missing required fields
          success: true,
        });

        const { result } = renderHook(() => useTransactions());

        let transactionResult: TransactionResult;
        await act(async () => {
          transactionResult = await result.current.executeTransaction(mockTransactionData);
        });

        expect(transactionResult!.success).toBe(false);
      });
    });
  });
});