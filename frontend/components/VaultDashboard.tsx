import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import {
  TrendingUp,
  Wallet,
  PlusCircle,
  BarChart3,
  DollarSign,
  Target,
  Users,
  Vault as VaultIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import { vaultService, VaultInfo, VaultPosition, VaultStats } from '@/services/vaultService';
import { VaultDepositForm } from './VaultDepositForm';
import { VaultWithdrawForm } from './VaultWithdrawForm';
import { VaultCreateForm } from './VaultCreateForm';
import { VaultPerformanceChart } from './VaultPerformanceChart';

interface VaultDashboardProps {
  className?: string;
}

export function VaultDashboard({ className }: VaultDashboardProps) {
  const { account, connected } = useWallet();

  const [activeTab, setActiveTab] = useState('overview');
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [userPositions, setUserPositions] = useState<Map<number, VaultPosition>>(new Map());
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Load vault data
  useEffect(() => {
    if (connected) {
      loadVaultData();
    }
  }, [connected]);

  const loadVaultData = async () => {
    setIsLoading(true);
    try {
      // Load vault statistics
      const stats = await vaultService.getVaultStats();
      setVaultStats(stats);

      // Load all vaults
      const totalVaults = await vaultService.getTotalVaults();
      const vaultPromises = [];

      for (let i = 1; i <= totalVaults; i++) {
        vaultPromises.push(vaultService.getVaultInfo(i));
      }

      const vaultResults = await Promise.all(vaultPromises);
      const validVaults = vaultResults.filter(v => v !== null) as VaultInfo[];
      setVaults(validVaults);

      // Load user positions if connected
      if (account?.address) {
        const positionPromises = validVaults.map(vault =>
          vaultService.getUserPosition(account.address.toStringLong(), vault.id)
        );

        const positions = await Promise.all(positionPromises);
        const positionMap = new Map<number, VaultPosition>();

        positions.forEach((position, index) => {
          if (position && position.shares > 0) {
            positionMap.set(validVaults[index].id, position);
          }
        });

        setUserPositions(positionMap);
      }
    } catch (error) {
      console.error('Failed to load vault data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultAction = async () => {
    // Refresh data after vault actions
    await loadVaultData();
    setShowCreateForm(false);
    setShowDepositForm(false);
    setShowWithdrawForm(false);
    setSelectedVault(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100000000); // Assuming 8 decimal places
  };

  const getStrategyColor = (strategyType: number) => {
    switch (strategyType) {
      case 0: return 'bg-green-100 text-green-800';
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!connected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VaultIcon className="h-5 w-5" />
            Yield Vaults
          </CardTitle>
          <CardDescription>
            Connect your wallet to access automated yield generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Please connect your wallet to access vault features
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Yield Vaults</h1>
            <p className="text-muted-foreground">
              Automated yield generation powered by Hyperion and optimized strategies
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadVaultData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Vault
            </Button>
          </div>
        </div>

        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="vaults" className="flex items-center gap-2">
            <VaultIcon className="h-4 w-4" />
            All Vaults
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            My Positions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {vaultStats ? formatCurrency(vaultStats.totalValueLocked) : '$0.00'}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Across all vaults
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average APY</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {vaultStats ? vaultService.formatApy(vaultStats.averageApy) : '0.00%'}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Target yield rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Vaults</CardTitle>
                <VaultIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <div className="text-2xl font-bold">
                    {vaultStats?.totalVaults || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Available strategies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <div className="text-2xl font-bold">
                    {vaultStats?.totalUsers || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Active depositors
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Vaults */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vaults</CardTitle>
              <CardDescription>
                Highest yielding vaults by strategy type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : vaults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <VaultIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <div className="font-medium">No vaults available</div>
                  <div className="text-sm">Create the first vault to get started</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {vaults.slice(0, 3).map((vault) => (
                    <div key={vault.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <VaultIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Vault #{vault.id}</div>
                          <div className="text-sm text-gray-500">
                            {vaultService.getStrategyName(vault.strategyType)} Strategy
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {vaultService.formatApy(vault.targetApy)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(vault.totalAssets)} TVL
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaults" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : vaults.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <VaultIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vaults available</h3>
                <p className="text-gray-500 mb-4">Create the first vault to start earning yield</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Vault
                </Button>
              </div>
            ) : (
              vaults.map((vault) => (
                <Card key={vault.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Vault #{vault.id}</CardTitle>
                      <Badge className={getStrategyColor(vault.strategyType)}>
                        {vaultService.getStrategyName(vault.strategyType)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {vaultService.getStrategyDescription(vault.strategyType)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Target APY</div>
                        <div className="font-medium text-green-600">
                          {vaultService.formatApy(vault.targetApy)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">TVL</div>
                        <div className="font-medium">
                          {formatCurrency(vault.totalAssets)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Total Shares</div>
                        <div className="font-medium">
                          {vaultService.formatAmount(vault.totalShares)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div className={`font-medium ${vault.isPaused ? 'text-red-600' : 'text-green-600'}`}>
                          {vault.isPaused ? 'Paused' : 'Active'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedVault(vault);
                          setShowDepositForm(true);
                        }}
                        disabled={vault.isPaused}
                        className="flex-1"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Deposit
                      </Button>
                      {userPositions.has(vault.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVault(vault);
                            setShowWithdrawForm(true);
                          }}
                          className="flex-1"
                        >
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Vault Positions</CardTitle>
              <CardDescription>
                Your active positions across all vaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userPositions.size === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No positions yet</h3>
                  <p className="text-gray-500 mb-4">Deposit into a vault to start earning yield</p>
                  <Button onClick={() => setActiveTab('vaults')}>
                    Browse Vaults
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(userPositions.entries()).map(([vaultId, position]) => {
                    const vault = vaults.find(v => v.id === vaultId);
                    if (!vault) return null;

                    const yieldPercentage = vaultService.calculateYieldPercentage(
                      position.initialDeposit,
                      position.currentValue
                    );

                    return (
                      <div key={vaultId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">Vault #{vault.id}</h4>
                            <p className="text-sm text-gray-500">
                              {vaultService.getStrategyName(vault.strategyType)} Strategy
                            </p>
                          </div>
                          <Badge className={getStrategyColor(vault.strategyType)}>
                            {vaultService.formatApy(vault.targetApy)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Shares Owned</div>
                            <div className="font-medium">
                              {vaultService.formatAmount(position.shares)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Initial Deposit</div>
                            <div className="font-medium">
                              {formatCurrency(position.initialDeposit)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Current Value</div>
                            <div className="font-medium">
                              {formatCurrency(position.currentValue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Yield</div>
                            <div className={`font-medium ${yieldPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {yieldPercentage >= 0 ? '+' : ''}{yieldPercentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedVault(vault);
                              setShowDepositForm(true);
                            }}
                            disabled={vault.isPaused}
                          >
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Add More
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVault(vault);
                              setShowWithdrawForm(true);
                            }}
                          >
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vault Performance Analytics</CardTitle>
                <CardDescription>
                  Historical performance and yield tracking powered by Nodit APIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedVault ? (
                  <VaultPerformanceChart vaultId={selectedVault.id} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select a vault from the Vaults tab to view detailed analytics
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCreateForm && (
        <VaultCreateForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleVaultAction}
        />
      )}

      {showDepositForm && selectedVault && (
        <VaultDepositForm
          vault={selectedVault}
          onClose={() => setShowDepositForm(false)}
          onSuccess={handleVaultAction}
        />
      )}

      {showWithdrawForm && selectedVault && (
        <VaultWithdrawForm
          vault={selectedVault}
          position={userPositions.get(selectedVault.id) || null}
          onClose={() => setShowWithdrawForm(false)}
          onSuccess={handleVaultAction}
        />
      )}
    </div>
  );
}

export default VaultDashboard;