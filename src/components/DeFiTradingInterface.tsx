"use client";

import { useState, useEffect } from "react";
import { useTransactions, TransactionResult, formatTxHash } from "@/lib/transactions";
import { useWalletOperations, formatAPT } from "@/lib/wallet";

export function DeFiTradingInterface() {
  const {
    performSwap,
    addLiquidityToPool,
    estimateGas,
    getTransactionStatus,
    connected
  } = useTransactions();

  const { getBalance } = useWalletOperations();

  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity'>('swap');
  const [balance, setBalance] = useState({ apt: 0, usd: 0 });

  // Swap state
  const [swapFrom, setSwapFrom] = useState('APT');
  const [swapTo, setSwapTo] = useState('USDC');
  const [swapAmount, setSwapAmount] = useState('');
  const [minReceived, setMinReceived] = useState('');
  const [swapGasEstimate, setSwapGasEstimate] = useState(0);

  // Liquidity state
  const [liquidityTokenA, setLiquidityTokenA] = useState('APT');
  const [liquidityTokenB, setLiquidityTokenB] = useState('USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [liquidityGasEstimate, setLiquidityGasEstimate] = useState(0);

  // Transaction state
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null);

  const tokens = ['APT', 'USDC', 'USDT', 'BTC', 'ETH'];

  useEffect(() => {
    if (connected) {
      loadBalance();
    }
  }, [connected]);

  const loadBalance = async () => {
    try {
      const walletBalance = await getBalance();
      setBalance(walletBalance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const estimateSwapGas = async () => {
    if (!swapAmount || !minReceived) return;

    try {
      const gasEstimate = await estimateGas({
        function: `0x1::amm::swap`,
        typeArguments: [
          swapFrom === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${swapFrom}`,
          swapTo === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${swapTo}`
        ],
        functionArguments: [
          (parseFloat(swapAmount) * 100000000).toString(),
          (parseFloat(minReceived) * 100000000).toString()
        ],
      });
      setSwapGasEstimate(gasEstimate);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
    }
  };

  const handleSwap = async () => {
    if (!swapAmount || !minReceived) return;

    setIsExecuting(true);
    try {
      const result = await performSwap({
        coinTypeA: swapFrom === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${swapFrom}`,
        coinTypeB: swapTo === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${swapTo}`,
        amountIn: parseFloat(swapAmount) * 100000000, // Convert to octas
        minAmountOut: parseFloat(minReceived) * 100000000,
      });

      setLastTransaction(result);

      if (result.success) {
        setSwapAmount('');
        setMinReceived('');
        loadBalance(); // Refresh balance
      }
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!amountA || !amountB) return;

    setIsExecuting(true);
    try {
      const result = await addLiquidityToPool({
        coinTypeA: liquidityTokenA === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${liquidityTokenA}`,
        coinTypeB: liquidityTokenB === 'APT' ? '0x1::aptos_coin::AptosCoin' : `0x1::coin::${liquidityTokenB}`,
        amountADesired: parseFloat(amountA) * 100000000,
        amountBDesired: parseFloat(amountB) * 100000000,
        amountAMin: parseFloat(amountA) * 0.95 * 100000000, // 5% slippage
        amountBMin: parseFloat(amountB) * 0.95 * 100000000,
      });

      setLastTransaction(result);

      if (result.success) {
        setAmountA('');
        setAmountB('');
        loadBalance();
      }
    } catch (error) {
      console.error('Add liquidity failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">DeFi Trading</h3>
        <p className="text-gray-500">Connect your wallet to start trading</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('swap')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'swap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Swap
        </button>
        <button
          onClick={() => setActiveTab('liquidity')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'liquidity'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Liquidity
        </button>
      </div>

      {activeTab === 'swap' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Token Swap</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="flex space-x-2">
              <select
                value={swapFrom}
                onChange={(e) => setSwapFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {tokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                onBlur={estimateSwapGas}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="flex space-x-2">
              <select
                value={swapTo}
                onChange={(e) => setSwapTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {tokens.filter(token => token !== swapFrom).map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input
                type="number"
                value={minReceived}
                onChange={(e) => setMinReceived(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {swapGasEstimate > 0 && (
            <p className="text-xs text-gray-500">
              Estimated gas: {swapGasEstimate} units
            </p>
          )}

          <button
            onClick={handleSwap}
            disabled={isExecuting || !swapAmount || !minReceived}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isExecuting ? 'Swapping...' : 'Swap Tokens'}
          </button>
        </div>
      )}

      {activeTab === 'liquidity' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add Liquidity</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token A</label>
            <div className="flex space-x-2">
              <select
                value={liquidityTokenA}
                onChange={(e) => setLiquidityTokenA(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {tokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token B</label>
            <div className="flex space-x-2">
              <select
                value={liquidityTokenB}
                onChange={(e) => setLiquidityTokenB(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {tokens.filter(token => token !== liquidityTokenA).map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={isExecuting || !amountA || !amountB}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isExecuting ? 'Adding Liquidity...' : 'Add Liquidity'}
          </button>
        </div>
      )}

      {lastTransaction && (
        <div className={`mt-4 p-3 rounded-lg border ${lastTransaction.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
          }`}>
          <p className={`text-sm font-medium ${lastTransaction.success ? 'text-green-800' : 'text-red-800'
            }`}>
            {lastTransaction.success ? 'Transaction Successful!' : 'Transaction Failed'}
          </p>
          {lastTransaction.hash && (
            <p className="text-xs text-gray-600 mt-1">
              Hash: {formatTxHash(lastTransaction.hash)}
            </p>
          )}
          {lastTransaction.gasUsed && (
            <p className="text-xs text-gray-600">
              Gas used: {lastTransaction.gasUsed}
            </p>
          )}
          {lastTransaction.errorMessage && (
            <p className="text-xs text-red-600 mt-1">
              Error: {lastTransaction.errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}