import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from "react";
import './globals.css';

import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DebugProvider } from "@/components/DebugProvider";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AptoFi - DeFi Banking Platform',
  description: 'Multi-platform decentralized finance application built on Aptos blockchain',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <WalletProvider>
            <ReactQueryProvider>
              <div id="root">{children}</div>
              <DebugProvider />
            </ReactQueryProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}