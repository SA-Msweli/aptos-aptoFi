"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "./WalletSelector";
import { NetworkIndicator } from "./NetworkIndicator";
import { AuthGuard } from "./AuthGuard";
import { KYCGuard } from "./KYCGuard";
import { ReputationBadge } from "./ReputationBadge";
import { KYC_LEVELS } from "@/view-functions/getKYCProfile";

// Import content components
import { DashboardContent } from "./DashboardContent";
import { WalletContent } from "./WalletContent";
import { TradingContent } from "./TradingContent";
import { PoolsContent } from "./PoolsContent";
import { IntegratedProfileManager } from "./IntegratedProfileManager";

type ActiveSection = 'dashboard' | 'wallet' | 'trading' | 'pools' | 'profile';

export function AuthenticatedLayout() {
  const { connected } = useWallet();
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  const navigationItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '🏠', description: 'Overview' },
    { id: 'wallet' as const, label: 'Wallet', icon: '💰', description: 'Send & Receive' },
    { id: 'trading' as const, label: 'Trading', icon: '💱', description: 'Swap Tokens' },
    { id: 'pools' as const, label: 'Pools', icon: '🏊', description: 'Liquidity' },
    { id: 'profile' as const, label: 'Profile', icon: '👤', description: 'DID & Settings' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent onNavigate={setActiveSection} />;
      case 'wallet':
        return <WalletContent />;
      case 'trading':
        return (
          <AuthGuard requireProfile={true}>
            <KYCGuard requiredLevel={KYC_LEVELS.BASIC} operationType="trading">
              <TradingContent />
            </KYCGuard>
          </AuthGuard>
        );
      case 'pools':
        return (
          <AuthGuard requireProfile={true}>
            <KYCGuard requiredLevel={KYC_LEVELS.ENHANCED} operationType="liquidity provision">
              <PoolsContent />
            </KYCGuard>
          </AuthGuard>
        );
      case 'profile':
        return <IntegratedProfileManager />;
      default:
        return <DashboardContent onNavigate={setActiveSection} />;
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AptoFi</h1>
            <p className="text-gray-600">Complete DeFi Banking on Aptos</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-blue-600 text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-500 mb-6">
              Connect your Aptos wallet to access DeFi banking features
            </p>

            <div className="mb-6">
              <WalletSelector />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="block text-blue-600 text-lg mb-1">💱</span>
                <span className="text-blue-900 font-medium">Trading</span>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="block text-green-600 text-lg mb-1">🏊</span>
                <span className="text-green-900 font-medium">Liquidity</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <span className="block text-purple-600 text-lg mb-1">💰</span>
                <span className="text-purple-900 font-medium">Wallet</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <span className="block text-orange-600 text-lg mb-1">👤</span>
                <span className="text-orange-900 font-medium">Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">AptoFi</h1>
              <span className="ml-2 text-sm text-gray-500 hidden sm:inline">DeFi Banking</span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <ReputationBadge />
              <NetworkIndicator />
              <WalletSelector />
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation - Desktop */}
        <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-gray-200 lg:bg-white">
          <div className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeSection === item.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="grid grid-cols-5">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${activeSection === item.id
                  ? 'text-blue-600'
                  : 'text-gray-500'
                  }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile spacing for bottom nav */}
      <div className="h-16 lg:hidden"></div>
    </div>
  );
}