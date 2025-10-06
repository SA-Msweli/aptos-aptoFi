import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Droplets, ExternalLink, Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import { hyperionService } from '@/services/hyperionService';
import { noditService } from '@/services/noditService';
import type { LiquidityPool } from '@/services/hyperionService';

interface PoolWithStats extends LiquidityPool {
  volume24h: string;
  fees24h: string;
  apr: string;
  priceChange24h: number;
  tvl: string;
}

export function PoolsOverview() {
  const { toast } = useToast();

  const [pools, setPools] = useState<PoolWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apr'>('tvl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load pools data
  useEffect(() => {
    const loadPools = async () => {
      setLoading(true);
      try {
        const poolsData = await hyperionService.getLiquidityPools();

        // Enhance pools with mock statistics for demo
        const enhancedPools: PoolWithStats[] = poolsData.map((pool, index) => ({
          ...pool,
          volume24h: (Math.random() * 5000000 + 100000).toFixed(0), // $100K - $5M
          fees24h: (Math.random() * 15000 + 500).toFixed(0), // $500 - $15K
          apr: (Math.random() * 50 + 5).toFixed(2), // 5% - 55%
          priceChange24h: (Math.random() - 0.5) * 20, // -10% to +10%
          tvl: (Math.random() * 20000000 + 1000000).toFixed(0), // $1M - $20M
        }));

        // Add some mock pools if no real pools are available
        if (enhancedPools.length === 0) {
          const mockPools: PoolWithStats[] = [
            {
              address: "0x1234567890abcdef1234567890abcdef12345678",
              tokenA: "0x1::aptos_coin::AptosCoin",
              tokenB: "0x1::usdc_coin::USDCoin",
              fee: 500, // 0.05%
              liquidity: "12500000000000000000",
              sqrtPriceX96: "79228162514264337593543950336",
              tick: 0,
              tickSpacing: 10,
              volume24h: "2450000",
              fees24h: "7350",
              apr: "24.50",
              priceChange24h: 2.3,
              tvl: "15600000",
            },
            {
              address: "0xabcdef1234567890abcdef1234567890abcdef12",
              tokenA: "0x1::aptos_coin::AptosCoin",
              tokenB: "0x1::test_coin::TestCoin",
              fee: 3000, // 0.3%
              liquidity: "8750000000000000000",
              sqrtPriceX96: "79228162514264337593543950336",
              tick: 100,
              tickSpacing: 60,
              volume24h: "1200000",
              fees24h: "3600",
              apr: "18.75",
              priceChange24h: -1.2,
              tvl: "8900000",
            },
            {
              address: "0x9876543210fedcba9876543210fedcba98765432",
              tokenA: "0x1::usdc_coin::USDCoin",
              tokenB: "0x1::test_coin::TestCoin",
              fee: 500, // 0.05%
              liquidity: "6250000000000000000",
              sqrtPriceX96: "79228162514264337593543950336",
              tick: -50,
              tickSpacing: 10,
              volume24h: "890000",
              fees24h: "2670",
              apr: "32.10",
              priceChange24h: 5.7,
              tvl: "6400000",
            },
          ];
          setPools(mockPools);
        } else {
          setPools(enhancedPools);
        }

      } catch (error) {
        console.error('Failed to load pools:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load pools',
          description: 'Could not load liquidity pools. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, [toast]);

  // Filter and sort pools
  const filteredAndSortedPools = useMemo(() => {
    let filtered = pools.filter(pool => {
      const searchLower = searchTerm.toLowerCase();
      return (
        pool.tokenA.toLowerCase().includes(searchLower) ||
        pool.tokenB.toLowerCase().includes(searchLower) ||
        pool.address.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case 'tvl':
          aValue = parseFloat(a.tvl);
          bValue = parseFloat(b.tvl);
          break;
        case 'volume':
          aValue = parseFloat(a.volume24h);
          bValue = parseFloat(b.volume24h);
          break;
        case 'apr':
          aValue = parseFloat(a.apr);
          bValue = parseFloat(b.apr);
          break;
        default:
          return 0;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [pools, searchTerm, sortBy, sortOrder]);

  const handleSort = (newSortBy: 'tvl' | 'volume' | 'apr') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    } else {
      return `$${num.toFixed(0)}`;
    }
  };

  const getTokenSymbol = (coinType: string) => {
    if (coinType.includes('aptos_coin')) return 'APT';
    if (coinType.includes('usdc_coin')) return 'USDC';
    if (coinType.includes('test_coin')) return 'TEST';
    return 'TOKEN';
  };

  const getPairName = (pool: LiquidityPool) => {
    const symbolA = getTokenSymbol(pool.tokenA);
    const symbolB = getTokenSymbol(pool.tokenB);
    return `${symbolA}/${symbolB}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Liquidity Pools
          </CardTitle>
          <CardDescription>
            Explore all available liquidity pools on Hyperion DEX
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search pools by token or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'tvl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('tvl')}
              >
                TVL {sortBy === 'tvl' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
              <Button
                variant={sortBy === 'volume' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('volume')}
              >
                Volume {sortBy === 'volume' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
              <Button
                variant={sortBy === 'apr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('apr')}
              >
                APR {sortBy === 'apr' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
            </div>
          </div>

          {/* Pools Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading pools...</span>
            </div>
          ) : filteredAndSortedPools.length > 0 ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-7 gap-4 px-4 py-2 text-sm font-medium text-gray-500 border-b">
                <div>Pool</div>
                <div>Fee Tier</div>
                <div>TVL</div>
                <div>24h Volume</div>
                <div>24h Fees</div>
                <div>APR</div>
                <div>Actions</div>
              </div>

              {/* Pool Rows */}
              {filteredAndSortedPools.map((pool) => (
                <div
                  key={pool.address}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                    {/* Pool Info */}
                    <div className="space-y-1">
                      <div className="font-medium text-lg">
                        {getPairName(pool)}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {pool.address.slice(0, 8)}...{pool.address.slice(-6)}
                      </div>
                    </div>

                    {/* Fee Tier */}
                    <div>
                      <Badge variant="secondary">
                        {(pool.fee / 10000).toFixed(2)}%
                      </Badge>
                    </div>

                    {/* TVL */}
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(pool.tvl)}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">TVL</div>
                    </div>

                    {/* 24h Volume */}
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(pool.volume24h)}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">24h Volume</div>
                    </div>

                    {/* 24h Fees */}
                    <div className="space-y-1">
                      <div className="font-medium text-green-600">
                        {formatCurrency(pool.fees24h)}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">24h Fees</div>
                    </div>

                    {/* APR */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-green-600">
                          {pool.apr}%
                        </span>
                        {pool.priceChange24h > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">APR</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Droplets className="h-3 w-3 mr-1" />
                        Add Liquidity
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Additional Info */}
                  <div className="md:hidden mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Price Change:</span>
                      <span className={`ml-1 ${pool.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pool.priceChange24h >= 0 ? '+' : ''}{pool.priceChange24h.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Liquidity:</span>
                      <span className="ml-1">{parseInt(pool.liquidity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">
                {searchTerm ? 'No pools found' : 'No pools available'}
              </div>
              <div className="text-sm">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Liquidity pools will appear here when available'
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div className="text-sm text-gray-500">Total Pools</div>
            </div>
            <div className="text-2xl font-bold mt-1">
              {pools.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-sm text-gray-500">Total TVL</div>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(
                pools.reduce((sum, pool) => sum + parseFloat(pool.tvl || '0'), 0).toString()
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div className="text-sm text-gray-500">24h Volume</div>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(
                pools.reduce((sum, pool) => sum + parseFloat(pool.volume24h || '0'), 0).toString()
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              <div className="text-sm text-gray-500">24h Fees</div>
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {formatCurrency(
                pools.reduce((sum, pool) => sum + parseFloat(pool.fees24h || '0'), 0).toString()
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PoolsOverview;