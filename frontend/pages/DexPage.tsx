import React, { useState } from 'react';
import { ArrowLeftRight, TrendingUp, Droplets } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { SwapInterface } from '@/components/dex/SwapInterface';
import { LiquidityInterface } from '@/components/dex/LiquidityInterface';
import { PoolsOverview } from '@/components/dex/PoolsOverview';

export function DexPage() {
  const [activeTab, setActiveTab] = useState('swap');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hyperion DEX</h1>
        <p className="text-muted-foreground">
          Trade tokens with optimal liquidity and capital efficiency powered by Hyperion's CLMM
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="swap" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Swap
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Liquidity
          </TabsTrigger>
          <TabsTrigger value="pools" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swap" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SwapInterface />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">24h Volume</span>
                      <span className="text-sm font-medium">$2.4M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Liquidity</span>
                      <span className="text-sm font-medium">$12.8M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Pools</span>
                      <span className="text-sm font-medium">24</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-6">
          <LiquidityInterface />
        </TabsContent>

        <TabsContent value="pools" className="space-y-6">
          <PoolsOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DexPage;