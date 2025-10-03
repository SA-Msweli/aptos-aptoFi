"use client";

import { WalletDebug } from "./WalletDebug";

export function DebugProvider() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <WalletDebug />;
}