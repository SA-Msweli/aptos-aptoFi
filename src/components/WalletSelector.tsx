"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function WalletSelector() {
  const { account, connected, disconnect, connect, wallets } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleConnect = async (walletName?: string) => {
    try {
      setIsConnecting(true);
      console.log("🔗 Attempting to connect wallet...");
      console.log("📱 Available wallets:", wallets?.map(w => w.name) || []);
      console.log("🎯 Target wallet:", walletName || "auto-select");

      if (walletName) {
        // Connect to specific wallet
        console.log(`🔌 Connecting to ${walletName}...`);
        await connect(walletName);
        setShowWalletList(false);
        console.log(`✅ Successfully connected to ${walletName}`);
      } else if (wallets && wallets.length > 0) {
        // Show wallet selection if multiple wallets available
        if (wallets.length === 1) {
          console.log(`🔌 Auto-connecting to ${wallets[0].name}...`);
          await connect(wallets[0].name);
          console.log(`✅ Successfully connected to ${wallets[0].name}`);
        } else {
          console.log("📋 Multiple wallets available, showing selection...");
          setShowWalletList(true);
          setIsConnecting(false);
          return;
        }
      } else {
        console.error("❌ No wallets available");
        console.log("🔍 Checking for wallet extensions...");

        const walletChecks = [
          { name: "Petra", check: () => !!(window as any).aptos },
          { name: "Martian", check: () => !!(window as any).martian },
          { name: "Pontem", check: () => !!(window as any).pontem },
          { name: "Fewcha", check: () => !!(window as any).fewcha },
        ];

        const availableWallets = walletChecks.filter(wallet => wallet.check());
        console.log("🦊 Detected wallet extensions:", availableWallets.map(w => w.name));

        if (availableWallets.length === 0) {
          alert("No Aptos wallets found. Please install Petra, Martian, or another Aptos wallet extension and refresh the page.");
        } else {
          alert(`Wallet extensions detected (${availableWallets.map(w => w.name).join(', ')}) but not properly initialized. Please refresh the page or check your wallet extension.`);
        }
      }
    } catch (error) {
      console.error("❌ Failed to connect wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Increment retry count
      setRetryCount(prev => prev + 1);

      if (retryCount < 2) {
        console.log(`🔄 Retrying connection (attempt ${retryCount + 1}/3)...`);
        // Wait a bit and retry
        setTimeout(() => {
          if (walletName) {
            handleConnect(walletName);
          } else {
            handleConnect();
          }
        }, 1000);
      } else {
        alert(`Failed to connect wallet after ${retryCount + 1} attempts: ${errorMessage}\n\nPlease:\n1. Make sure your wallet extension is installed and unlocked\n2. Refresh the page\n3. Try again`);
        setRetryCount(0); // Reset retry count
      }
    } finally {
      if (retryCount >= 2) {
        setIsConnecting(false);
      }
    }
  };

  if (connected && account) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">
          {account.address.toString().slice(0, 6)}...{account.address.toString().slice(-4)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  if (showWalletList) {
    return (
      <div className="relative">
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Choose Wallet</h3>
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={isConnecting}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                >
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="w-6 h-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium">{wallet.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletList(false)}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => handleConnect()}
      disabled={isConnecting}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}