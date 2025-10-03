"use client";

import { WalletProvider } from "../components/WalletProvider";
import { AuthenticatedLayout } from "../components/AuthenticatedLayout";

export default function Home() {
  return (
    // <WalletProvider>
      <AuthenticatedLayout />
    // </WalletProvider>
  );
}
