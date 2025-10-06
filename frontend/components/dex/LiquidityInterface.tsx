import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Plus, Minus, Droplets, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

import { hyperionService } from '@/services/hyperionService';
import { noditService } from '@/services/noditService';
import type { LiquidityPool, LiquidityPosition, AddLiquidityParams } from '@/services/hyperionService';
import TokenSelector from '@/components/TokenSelector';

interface LiquidityToken {
  coinType: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  formattedBalance: string;
}

export function LiquidityInterface() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();

  // Token state
  const [tokenA, setTokenA] = useState<LiquidityToken | null>(null);
  const [tokenB, setTokenB] = useState<LiquidityToken | null>(null);
  const [availableTokens, setAvailableTokens] = useState<LiquidityToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Liquidity state
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [tickLower, setTickLower] = useState('-887220');
  const [tickUpper, setTickUpper] = useState('887220');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);

  // Pool and position state
  const [availablePools, setAvailablePools] = useState<LiquidityPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [userPositions, setUserPositions] = useState<LiquidityPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<LiquidityPosition | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoadingTokens(true);
      setLoadingPositions(true);

      try {
        // Mock tokens for demo (always available)
        const mockTokens: LiquidityToken[] = [
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
            const realTokens: LiquidityToken[] = balances.map(balance => ({
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

        // Set default tokens
        if (allTokens.length >= 2) {
          setTokenA(allTokens[0]);
          setTokenB(allTokens[1]);
        }

        // Load pools and positions
        try {
          const pools = await hyperionService.getLiquidityPools();
          setAvailablePools(pools);
        } catch (error) {
          console.warn('Failed to load pools:', error);
          setAvailablePools([]);
        }

        // Load user positions if connected
        if (connected && account?.address) {
          try {
            const positions = await hyperionService.getUserPositions(account.address.toStringLong());
            setUserPositions(positions);
          } catch (error) {
            console.warn('Failed to load user positions:', error);
            setUserPositions([]);
          }
        } else {
          setUserPositions([]);
        }

      } catch (error) {
        console.error('Failed to load liquidity data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not load tokens and positions. Please try again.',
        });
      } finally {
        setLoadingTokens(false);
        setLoadingPositions(false);
      }
    };

    loadData();
  }, [connected, account?.address, toast]);

  // Find pool for selected tokens
  useEffect(() => {
    if (!tokenA || !tokenB || availablePools.length === 0) {
      setSelectedPool(null);
      return;
    }

    const pool = availablePools.find(p =>
      (p.tokenA === tokenA.coinType && p.tokenB === tokenB.coinType) ||
      (p.tokenA === tokenB.coinType && p.tokenB === tokenA.coinType)
    );

    setSelectedPool(pool || null);
  }, [tokenA, tokenB, availablePools]);

  const handleAddLiquidity = async () => {
    if (!connected || !account || !tokenA || !tokenB || !selectedPool) {
      toast({
        variant: 'destructive',
        title: 'Cannot add liquidity',
        description: 'Please ensure wallet is connected and tokens are selected.',
      });
      return;
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amounts',
        description: 'Please enter valid amounts for both tokens.',
      });
      return;
    }

    setIsAddingLiquidity(true);
    try {
      const amountAWei = (parseFloat(amountA) * Math.pow(10, tokenA.decimals)).toString();
      const amountBWei = (parseFloat(amountB) * Math.pow(10, tokenB.decimals)).toString();

      const params: AddLiquidityParams = {
        poolAddress: selectedPool.address,
        tokenA: tokenA.coinType,
        tokenB: tokenB.coinType,
        amountADesired: amountAWei,
        amountBDesired: amountBWei,
        amountAMin: (parseInt(amountAWei) * 0.95).toString(), // 5% slippage
        amountBMin: (parseInt(amountBWei) * 0.95).toString(), // 5% slippage
        tickLower: parseInt(tickLower),
        tickUpper: parseInt(tickUpper),
        recipient: account.address.toStringLong(),
      };

      const txHash = await hyperionService.addLiquidity(params);

      toast({
        title: 'Liquidity added successfully',
        description: `Added ${amountA} ${tokenA.symbol} and ${amountB} ${tokenB.symbol} to the pool`,
      });

      // Reset form
      setAmountA('');
      setAmountB('');

      // Reload positions
      const positions = await hyperionService.getUserPositions(account.address.toStringLong());
      setUserPositions(positions);

    } catch (error) {
      console.error('Add liquidity failed:', error);
      toast({
        variant: 'destructive',
        title: 'Add liquidity failed',
        description: 'Transaction was rejected or failed to process.',
      });
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  const handleRemoveLiquidity = async (position: LiquidityPosition, percentage: number) => {
    if (!connected || !account) {
      toast({
        variant: 'destructive',
        title: 'Cannot remove liquidity',
        description: 'Please ensure wallet is connected.',
      });
      return;
    }

    setIsRemovingLiquidity(true);
    try {
      const liquidityToRemove = (parseInt(position.liquidity) * percentage / 100).toString();

      const txHash = await hyperionService.removeLiquidity(
        position.positionId,
        liquidityToRemove,
        '0', // amountAMin - simplified for demo
        '0'  // amountBMin - simplified for demo
      );

      toast({
        title: 'Liquidity removed successfully',
        description: `Removed ${percentage}% of liquidity from position`,
      });

      // Reload positions
      const positions = await hyperionService.getUserPositions(account.address.toStringLong());
      setUserPositions(positions);

    } catch (error) {
      console.error('Remove liquidity failed:', error);
      toast({
        variant: 'destructive',
        title: 'Remove liquidity failed',
        description: 'Transaction was rejected or failed to process.',
      });
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  const handleCollectFees = async (position: LiquidityPosition) => {
    if (!connected || !account) return;

    try {
      const txHash = await hyperionService.collectFees(position.positionId);

      toast({
        title: 'Fees collected successfully',
        description: 'Your earned fees have been collected',
      });

      // Reload positions
      const positions = await hyperionService.getUserPositions(account.address.toStringLong());
      setUserPositions(positions);

    } catch (error) {
      console.error('Collect fees failed:', error);
      toast({
        variant: 'destructive',
        title: 'Collect fees failed',
        description: 'Transaction was rejected or failed to process.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Add Liquidity</TabsTrigger>
          <TabsTrigger value="manage">Manage Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Liquidity Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Liquidity
                </CardTitle>
                <CardDescription>
                  Provide liquidity to earn fees from trades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token A */}
                <div className="space-y-2">
                  <Label>Token A</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amountA}
                        onChange={(e) => setAmountA(e.target.value)}
                        disabled={loadingTokens}
                      />
                    </div>
                    <div className="w-32">
                      {loadingTokens ? (
                        <div className="flex items-center justify-center h-10 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : availableTokens.length > 0 && tokenA ? (
                        <TokenSelector
                          selectedToken={tokenA}
                          availableTokens={availableTokens}
                          onTokenSelect={setTokenA}
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
                  {tokenA && (
                    <div className="text-sm text-gray-500">
                      Available: {tokenA.formattedBalance} {tokenA.symbol}
                    </div>
                  )}
                </div>

                {/* Token B */}
                <div className="space-y-2">
                  <Label>Token B</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amountB}
                        onChange={(e) => setAmountB(e.target.value)}
                        disabled={loadingTokens}
                      />
                    </div>
                    <div className="w-32">
                      {loadingTokens ? (
                        <div className="flex items-center justify-center h-10 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : availableTokens.length > 0 && tokenB ? (
                        <TokenSelector
                          selectedToken={tokenB}
                          availableTokens={availableTokens.filter(t => t.coinType !== tokenA?.coinType)}
                          onTokenSelect={setTokenB}
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
                  {tokenB && (
                    <div className="text-sm text-gray-500">
                      Available: {tokenB.formattedBalance} {tokenB.symbol}
                    </div>
                  )}
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label>Price Range (Ticks)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Lower Tick</Label>
                      <Input
                        type="number"
                        value={tickLower}
                        onChange={(e) => setTickLower(e.target.value)}
                        placeholder="-887220"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Upper Tick</Label>
                      <Input
                        type="number"
                        value={tickUpper}
                        onChange={(e) => setTickUpper(e.target.value)}
                        placeholder="887220"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Full range: -887220 to 887220
                  </div>
                </div>

                {/* Pool Info */}
                {selectedPool && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Droplets className="h-4 w-4" />
                      Pool Information
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Fee Tier:</span>
                        <span>{(selectedPool.fee / 10000).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Tick:</span>
                        <span>{selectedPool.tick}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Liquidity:</span>
                        <span>{parseInt(selectedPool.liquidity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!selectedPool && tokenA && tokenB && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No liquidity pool found for this token pair.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Add Liquidity Button */}
                <Button
                  onClick={handleAddLiquidity}
                  disabled={
                    !connected || !tokenA || !tokenB || !selectedPool ||
                    !amountA || !amountB || parseFloat(amountA) <= 0 ||
                    parseFloat(amountB) <= 0 || isAddingLiquidity
                  }
                  className="w-full"
                  size="lg"
                >
                  {isAddingLiquidity ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding Liquidity...
                    </>
                  ) : !connected ? (
                    'Connect Wallet'
                  ) : !selectedPool ? (
                    'No Pool Available'
                  ) : (
                    'Add Liquidity'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Pool Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Pool Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPool ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Liquidity</span>
                        <span className="text-sm font-medium">
                          {parseInt(selectedPool.liquidity).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Fee Tier</span>
                        <span className="text-sm font-medium">
                          {(selectedPool.fee / 10000).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Price</span>
                        <span className="text-sm font-medium">
                          {(parseInt(selectedPool.sqrtPriceX96) / Math.pow(2, 96)).toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Volume</span>
                        <span className="text-sm font-medium">$1.2M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Fees</span>
                        <span className="text-sm font-medium text-green-600">$3,600</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select tokens to view pool statistics
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* User Positions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Your Liquidity Positions
              </CardTitle>
              <CardDescription>
                Manage your existing liquidity positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPositions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading positions...</span>
                </div>
              ) : userPositions.length > 0 ? (
                <div className="space-y-4">
                  {userPositions.map((position) => (
                    <div key={position.positionId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            Position #{position.positionId.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500">
                            {position.tokenA} / {position.tokenB}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Liquidity: {parseInt(position.liquidity).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Range: {position.tickLower} to {position.tickUpper}
                          </div>
                        </div>
                      </div>

                      {/* Fees Earned */}
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-green-800 mb-1">
                          Fees Earned
                        </div>
                        <div className="text-xs text-green-600 space-y-1">
                          <div>Token A: {position.feesEarned.tokenA}</div>
                          <div>Token B: {position.feesEarned.tokenB}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCollectFees(position)}
                          disabled={isRemovingLiquidity}
                        >
                          Collect Fees
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLiquidity(position, 25)}
                          disabled={isRemovingLiquidity}
                        >
                          Remove 25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLiquidity(position, 50)}
                          disabled={isRemovingLiquidity}
                        >
                          Remove 50%
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveLiquidity(position, 100)}
                          disabled={isRemovingLiquidity}
                        >
                          {isRemovingLiquidity ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Remove All'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">No liquidity positions</div>
                  <div className="text-sm">
                    Add liquidity to a pool to start earning fees
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LiquidityInterface;