"use client";

export function PoolsContent() {
  const mockPools = [
    {
      pair: 'APT/USDC',
      liquidity: '$2.4M',
      volume24h: '$890K',
      fees24h: '$2,670',
      apr: '12.5%',
      myShare: '0.15%',
      myValue: '$3,600'
    },
    {
      pair: 'APT/USDT', 
      liquidity: '$1.8M',
      volume24h: '$650K',
      fees24h: '$1,950',
      apr: '10.8%',
      myShare: '0%',
      myValue: '$0'
    },
    {
      pair: 'APT/BTC',
      liquidity: '$1.2M',
      volume24h: '$420K',
      fees24h: '$1,260',
      apr: '15.2%',
      myShare: '0%',
      myValue: '$0'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liquidity Pools</h1>
        <p className="text-gray-600">Provide liquidity and earn fees from trading pairs</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Liquidity</p>
              <p className="text-2xl font-bold text-gray-900">$5.4M</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">🏊</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">24h Volume</p>
              <p className="text-2xl font-bold text-gray-900">$1.96M</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">📈</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">24h Fees</p>
              <p className="text-2xl font-bold text-gray-900">$5.88K</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-xl">💰</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">My Positions</p>
              <p className="text-2xl font-bold text-gray-900">$3.6K</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Liquidity Interface */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Liquidity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token 1 Amount
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token 2 Amount
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.0"
              />
            </div>
            
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Add Liquidity
            </button>
          </div>
        </div>

        {/* Pools Overview */}
        <div className="space-y-6">
          {/* Available Pools */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Available Pools</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {mockPools.map((pool, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{pool.pair}</h4>
                      <span className="text-sm font-medium text-green-600">{pool.apr} APR</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Liquidity</p>
                        <p className="font-medium">{pool.liquidity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">24h Volume</p>
                        <p className="font-medium">{pool.volume24h}</p>
                      </div>
                    </div>
                    
                    {pool.myShare !== '0%' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">My Share: {pool.myShare}</span>
                          <span className="font-medium text-blue-600">{pool.myValue}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liquidity Benefits */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Benefits</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-green-600 text-lg flex-shrink-0">💰</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Earn Trading Fees</h4>
                  <p className="text-sm text-gray-600">
                    Receive a share of all trading fees based on your contribution.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 text-lg flex-shrink-0">🔄</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Automated Market Making</h4>
                  <p className="text-sm text-gray-600">
                    Your liquidity helps facilitate trades and improves market efficiency.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="text-amber-600 text-lg flex-shrink-0">⚠️</span>
                <div>
                  <h4 className="text-sm font-medium text-amber-900">Impermanent Loss Risk</h4>
                  <p className="text-sm text-amber-700">
                    Consider impermanent loss risk when token prices diverge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}