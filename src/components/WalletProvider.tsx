"use client";

import { APTOS_API_KEY, NETWORK } from "@/lib/constants";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";

export function WalletProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    console.log("🔧 WalletProvider Configuration:");
    console.log(`📡 Network: ${NETWORK}`);
    console.log(`🔑 API Key: ${APTOS_API_KEY ? '✅ Set' : '❌ Not Set'}`);
    console.log(`🌐 Window object available: ${typeof window !== 'undefined'}`);

    if (typeof window !== 'undefined') {
      console.log(`🦊 Petra available: ${!!(window as any).aptos}`);
      console.log(`🚀 Martian available: ${!!(window as any).martian}`);
      console.log(`💫 Pontem available: ${!!(window as any).pontem}`);
    }
  }, []);

  return (
    <AptosWalletAdapterProvider
      autoConnect={false} // Changed to false to prevent auto-connect issues
      dappConfig={{
        network: NETWORK,
        aptosApiKeys: APTOS_API_KEY ? { [NETWORK]: APTOS_API_KEY } : undefined,
      }}
      onError={(error) => {
        console.error("❌ Wallet error:", error);
        // Don't show alert for every error, just log it
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}