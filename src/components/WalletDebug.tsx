"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";

export function WalletDebug() {
  const { wallets, connected, account, connect } = useWallet();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = {
        windowAptos: !!(window as any).aptos,
        windowMartian: !!(window as any).martian,
        windowPontem: !!(window as any).pontem,
        windowFewcha: !!(window as any).fewcha,
        walletsLength: wallets?.length || 0,
        walletNames: wallets?.map(w => w.name) || [],
        connected,
        accountAddress: account?.address?.toString() || null,
        userAgent: navigator.userAgent,
      };
      setDebugInfo(info);
      console.log("🔍 Wallet Debug Info:", info);
    }
  }, [wallets, connected, account]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🔍 Wallet Debug</h4>
      <div className="space-y-1">
        <div>Connected: {connected ? '✅' : '❌'}</div>
        <div>Wallets Found: {debugInfo.walletsLength}</div>
        <div>Wallet Names: {debugInfo.walletNames?.join(', ') || 'None'}</div>
        <div>Window.aptos: {debugInfo.windowAptos ? '✅' : '❌'}</div>
        <div>Window.martian: {debugInfo.windowMartian ? '✅' : '❌'}</div>
        <div>Window.pontem: {debugInfo.windowPontem ? '✅' : '❌'}</div>
        <div>Account: {debugInfo.accountAddress ? `${debugInfo.accountAddress.slice(0, 8)}...` : 'None'}</div>
      </div>

      {!connected && debugInfo.walletsLength > 0 && (
        <button
          onClick={() => connect(debugInfo.walletNames[0])}
          className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
        >
          Force Connect {debugInfo.walletNames[0]}
        </button>
      )}
    </div>
  );
}