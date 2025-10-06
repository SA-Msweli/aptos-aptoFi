import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { ArrowUpDown, Settings, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

import { hyperionService } from '@/services/hyperionService';
import { noditService } from '@/services/noditService';
import type { LiquidityPool, SwapParams } from '@/services/hyperionService';
import TokenSelector from '@/components/TokenSelector';

interface SwapToken {
  coinType: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  formattedBalance: string;
}

export function SwapInterface() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();

  // Token state
  const [tokenIn, setTokenIn] = useState<SwapToken | null>(null);
  const [tokenOut, setTokenOut] = useState<SwapToken | null>(null);
  const [availableTokens, setAvailableTokens] = useState<SwapToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Swap state
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState('0.5'); // 0.5%

  // Pool state
  const [availablePools, setAvailablePools] = useState<LiquidityPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [loadingPools, setLoadingPools] = useState(false);

  // Price state
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);

  // Load available tokens and pools
  useEffect(() => {
    const loadData = async () => {
      setLoadingTokens(true);
      setLoadingPools(true);

      try {
        // Mock tokens for demo (always available)
        const mockTokens: SwapToken[] = [
          {
            coinType: "0x1::aptos_coin::AptosCoin",
            name: "Aptos Coin",
            symbol: "APT",
            decimals: 8,
            balance: connected ? 1000000000 : 0, // 10 APT if connected, 0 if not
            formattedBalance: connected ? "10.0000" : "0.0000",
          },
          {
            coinType: "0x1::test_coin::TestCoin",
            name: "Test Coin",
            symbol: "TEST",
            decimals: 6,
            balance: connected ? 5000000000 : 0, // 5000 TEST if connected, 0 if not
            formattedBalance: connected ? "5000.0000" : "0.0000",
          },
          {
            coinType: "0x1::usdc_coin::USDCoin",
            name: "USD Coin",
            symbol: "USDC",
            decimals: 6,
            balance: connected ? 1000000000 : 0, // 1000 USDC if connected, 0 if not
            formattedBalance: connected ? "1000.0000" : "0.0000",
          },
        ];

        let allTokens = mockTokens;

        // If connected, try to load real token balances
        if (connected && account?.address) {
          try {
            const balances = await noditService.getAccountBalances(account.address.toStringLong());
            const realTokens: SwapToken[] = balances.map(balance => ({
              coinType: balance.coin_type,
              name: balance.coin_type.includes('aptos_coin') ? 'Aptos Coin' : 'Token',
              symbol: balance.coin_type.includes('aptos_coin') ? 'APT' : 'TOKEN',
              decimals: balance.decimals,
              balance: parseInt(balance.amount),
              formattedBalance: (parseInt(balance.amount) / Math.pow(10, balance.decimals)).toFixed(4),
            }));

            // Use real tokens if available, otherwise use mock tokens with balances
            if (realTokens.length > 0) {
              allTokens = realTokens;
            }
          } catch (error) {
            console.warn('Failed to load real token balances, using mock tokens:', error);
          }
        }

        setAvailableTokens(allTokens);
        console.log('SwapInterface: Loaded tokens:', allTokens);

        // Set default tokens
        if (allTokens.length >= 2) {
          setTokenIn(allTokens[0]);
          setTokenOut(allTokens[1]);
          console.log('SwapInterface: Set default tokens:', allTokens[0], allTokens[1]);
        }

        // Load liquidity pools
        try {
          const pools = await hyperionService.getLiquidityPools();
          setAvailablePools(pools);
        } catch (error) {
          console.warn('Failed to load pools, using empty array:', error);
          setAvailablePools([]);
        }

      } catch (error) {
        console.error('Failed to load swap data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not load tokens and pools. Please try again.',
        });
      } finally {
        setLoadingTokens(false);
        setLoadingPools(false);
      }
    };

    loadData();
  }, [connected, account?.address, toast]);

  // Get quote when amounts or tokens change
  useEffect(() => {
    const getQuote = async () => {
      if (!amountIn || !tokenIn || !tokenOut || !selectedPool || parseFloat(amountIn) <= 0) {
        setAmountOut('');
        setExchangeRate(null);
        setPriceImpact(null);
        return;
      }

      setIsLoadingQuote(true);
      try {
        const amountInWei = (parseFloat(amountIn) * Math.pow(10, tokenIn.decimals)).toString();
        const isAtoB = selectedPool.tokenA === tokenIn.coinType;

        const quote = await hyperionService.getSwapQuote(selectedPool.address, amountInWei, isAtoB);
        const amountOutFormatted = (parseInt(quote) / Math.pow(10, tokenOut.decimals)).toFixed(6);

        setAmountOut(amountOutFormatted);

        // Calculate exchange rate
        const rate = parseFloat(amountOutFormatted) / parseFloat(amountIn);
        setExchangeRate(`1 ${tokenIn.symbol} = ${rate.toFixed(6)} ${tokenOut.symbol}`);

        // Calculate price impact (simplified)
        const impact = Math.abs((rate - 1) * 100);
        setPriceImpact(impact > 0.01 ? `${impact.toFixed(2)}%` : '<0.01%');

      } catch (error) {
        console.error('Failed to get quote:', error);
        setAmountOut('');
        setExchangeRate(null);
        setPriceImpact(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(getQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [amountIn, tokenIn, tokenOut, selectedPool]);

  // Find best pool for selected tokens
  useEffect(() => {
    if (!tokenIn || !tokenOut || availablePools.length === 0) {
      setSelectedPool(null);
      return;
    }

    const pool = availablePools.find(p =>
      (p.tokenA === tokenIn.coinType && p.tokenB === tokenOut.coinType) ||
      (p.tokenA === tokenOut.coinType && p.tokenB === tokenIn.coinType)
    );

    setSelectedPool(pool || null);
  }, [tokenIn, tokenOut, availablePools]);

  const handleSwapTokens = () => {
    const tempToken = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);

    // Swap amounts
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  const handleMaxAmount = () => {
    if (tokenIn) {
      setAmountIn(tokenIn.formattedBalance);
    }
  };

  const handleSwap = async () => {
    if (!connected || !account || !tokenIn || !tokenOut || !selectedPool) {
      toast({
        variant: 'destructive',
        title: 'Cannot execute swap',
        description: 'Please ensure wallet is connected and tokens are selected.',
      });
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount to swap.',
      });
      return;
    }

    setIsSwapping(true);
    try {
      const amountInWei = (parseFloat(amountIn) * Math.pow(10, tokenIn.decimals)).toString();
      const amountOutWei = (parseFloat(amountOut) * Math.pow(10, tokenOut.decimals)).toString();

      // Calculate minimum amount out with slippage
      const slippageMultiplier = (100 - parseFloat(slippage)) / 100;
      const amountOutMinimum = (parseInt(amountOutWei) * slippageMultiplier).toString();

      const swapParams: SwapParams = {
        tokenIn: tokenIn.coinType,
        tokenOut: tokenOut.coinType,
        amountIn: amountInWei,
        amountOutMinimum,
        recipient: account.address.toStringLong(),
      };

      const txHash = await hyperionService.executeSwap(swapParams);

      toast({
        title: 'Swap successful',
        description: `Swapped ${amountIn} ${tokenIn.symbol} for ${amountOut} ${tokenOut.symbol}`,
      });

      // Reset form
      setAmountIn('');
      setAmountOut('');

    } catch (error) {
      console.error('Swap failed:', error);
      toast({
        variant: 'destructive',
        title: 'Swap failed',
        description: 'Transaction was rejected or failed to process.',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const isSwapDisabled = !connected || !tokenIn || !tokenOut || !amountIn ||
    parseFloat(amountIn) <= 0 || !selectedPool || isSwapping || isLoadingQuote;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5" />
          Swap Tokens
        </CardTitle>
        <CardDescription>
          Trade tokens with optimal liquidity using Hyperion CLMM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token In */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>From</Label>
            {tokenIn && (
              <button
                onClick={handleMaxAmount}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Max: {tokenIn.formattedBalance} {tokenIn.symbol}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="0.00"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                disabled={loadingTokens}
              />
            </div>
            <div className="w-32">
              {loadingTokens ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : availableTokens.length > 0 && tokenIn ? (
                <TokenSelector
                  selectedToken={tokenIn}
                  availableTokens={availableTokens}
                  onTokenSelect={setTokenIn}
                  showBalance={false}
                />
              ) : availableTokens.length > 0 ? (
                <div className="h-10 border rounded-md flex items-center justify-center text-xs text-gray-500">
                  Select token
                </div>
              ) : (
                <div className="h-10 border rounded-md flex items-center justify-center text-xs text-gray-500">
                  No tokens
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapTokens}
            disabled={!tokenIn || !tokenOut}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Token Out */}
        <div className="space-y-2">
          <Label>To</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountOut}
                  readOnly
                  disabled={loadingTokens}
                />
                {isLoadingQuote && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <div className="w-32">
              {loadingTokens ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : availableTokens.length > 0 && tokenOut ? (
                <TokenSelector
                  selectedToken={tokenOut}
                  availableTokens={availableTokens.filter(t => t.coinType !== tokenIn?.coinType)}
                  onTokenSelect={setTokenOut}
                  showBalance={false}
                />
              ) : availableTokens.length > 0 ? (
                <div className="h-10 border rounded-md flex items-center justify-center text-xs text-gray-500">
                  Select token
                </div>
              ) : (
                <div className="h-10 border rounded-md flex items-center justify-center text-xs text-gray-500">
                  No tokens
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pool Info */}
        {selectedPool && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Pool Information
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Pool Address:</span>
                <span className="font-mono">{selectedPool.address.slice(0, 8)}...{selectedPool.address.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee Tier:</span>
                <span>{(selectedPool.fee / 10000).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidity:</span>
                <span>{parseInt(selectedPool.liquidity).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Swap Details */}
        {exchangeRate && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Exchange Rate:</span>
              <span>{exchangeRate}</span>
            </div>
            {priceImpact && (
              <div className="flex justify-between">
                <span className="text-gray-500">Price Impact:</span>
                <span className={parseFloat(priceImpact) > 5 ? 'text-red-500' : 'text-green-500'}>
                  {priceImpact}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Slippage Tolerance:</span>
              <span>{slippage}%</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {!selectedPool && tokenIn && tokenOut && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No liquidity pool found for this token pair.
            </AlertDescription>
          </Alert>
        )}

        {priceImpact && parseFloat(priceImpact) > 5 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              High price impact ({priceImpact}). Consider reducing your trade size.
            </AlertDescription>
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={isSwapDisabled}
          className="w-full"
          size="lg"
        >
          {isSwapping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Swapping...
            </>
          ) : !connected ? (
            'Connect Wallet'
          ) : !selectedPool ? (
            'No Pool Available'
          ) : (
            `Swap ${tokenIn?.symbol || ''} for ${tokenOut?.symbol || ''}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default SwapInterface;