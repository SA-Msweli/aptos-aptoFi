"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getAccountAPTBalance } from "../view-functions/getAccountBalance";
import { TransferAPT } from "./TransferAPT";

export function WalletContent() {
  const { connected, account } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive'>('overview');

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connected || !account?.address) return;
      
      setLoading(true);
      try {
        const accountBalance = await getAccountAPTBalance(account.address.toString());
        setBalance(accountBalance.toString());
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [connected, account]);

  const formatBalance = (balance: string) => {
    const numBalance = parseFloat(balance) / 100000000;
    return numBalance.toFixed(4);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👁️' },
    { id: 'send', label: 'Send', icon: '📤' },
    { id: 'receive', label: 'Receive', icon: '📥' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-600">Manage your APT tokens and transactions</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Balance</p>
            <p className="text-3xl font-bold">
              {loading ? '...' : formatBalance(balance)} APT
            </p>
            <p className="text-blue-100 text-sm mt-1">
              ≈ ${loading ? '...' : (parseFloat(formatBalance(balance)) * 8.45).toFixed(2)} USD
            </p>
          </div>
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between text-sm">
          <div>
            <p className="text-blue-100">Wallet Address</p>
            <p className="font-mono">
              {account?.address ? 
                `${account.address.toString().slice(0, 8)}...${account.address.toString().slice(-6)}` 
                : '...'
              }
            </p>
          </div>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg transition-colors">
            Copy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-green-600 text-xl">📈</span>
                  </div>
                  <p className="text-sm text-gray-600">24h Change</p>
                  <p className="text-lg font-semibold text-green-600">+2.34%</p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-blue-600 text-xl">💸</span>
                  </div>
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">24</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-purple-600 text-xl">🎁</span>
                  </div>
                  <p className="text-sm text-gray-600">Rewards</p>
                  <p className="text-lg font-semibold text-purple-600">1.24 APT</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📋</span>
                  </div>
                  <p className="text-gray-500">No transactions yet</p>
                  <p className="text-gray-400 text-sm mt-1">Your transaction history will appear here</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'send' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Send APT</h3>
              <TransferAPT />
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="text-center py-8">
              <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📱</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Receive APT</h3>
              <p className="text-gray-600 mb-4">Share your wallet address to receive APT tokens</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Your Address</p>
                <p className="font-mono text-sm break-all">
                  {account?.address?.toString() || 'Not connected'}
                </p>
              </div>
              
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Copy Address
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}