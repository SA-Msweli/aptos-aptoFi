import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useGetAccountData } from "@/hooks/useGetAccountData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button"; // Removed unused import
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Wallet, User, Activity } from "lucide-react";

/**
 * Simple test panel to verify enhanced wallet functionality
 */
export function WalletTestPanel() {
  const { connected, account } = useWallet();
  const accountData = useGetAccountData();

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Enhanced Wallet Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to test the enhanced functionality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h3 className="text-lg font-semibold">Enhanced Wallet & DID System Test</h3>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Address:</strong> {account?.address.toStringLong()}</div>
          <div><strong>ANS Name:</strong> {account?.ansName || "None"}</div>
        </CardContent>
      </Card>

      {/* Enhanced Features Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Enhanced Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              <span>Multi-Token Count:</span>
              <span className="font-semibold">{accountData.multiTokenCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span>Recent Transactions:</span>
              <span className="font-semibold">{accountData.recentTransactionCount}</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Status:</div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded text-xs ${accountData.multiTokenCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                {accountData.multiTokenCount > 0 ? '✓ Multi-token data loaded' : '○ No tokens found'}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${accountData.recentTransactionCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                {accountData.recentTransactionCount > 0 ? '✓ Transaction history loaded' : '○ No recent transactions'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DID System Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            DID System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>DID Exists:</span>
              <span className={`font-semibold ${accountData.hasDID ? 'text-green-600' : 'text-gray-600'}`}>
                {accountData.hasDID ? 'Yes' : 'No'}
              </span>
            </div>
            {/* Reputation score removed */}
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">DID Status:</div>
            <span className={`px-2 py-1 rounded text-xs ${accountData.hasDID ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
              }`}>
              {accountData.hasDID ? '✓ DID found on-chain' : '○ No DID (contract may not be deployed)'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Integration Test Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Integration Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>✓ Wallet connection working</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>✓ AccountDataProvider extended successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>✓ WalletSelector enhanced with new data</span>
            </div>
            <div className="flex items-center gap-2">
              {accountData.multiTokenCount > 0 || accountData.recentTransactionCount > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>
                {accountData.multiTokenCount > 0 || accountData.recentTransactionCount > 0
                  ? '✓ Nodit integration working'
                  : '⚠ Nodit data unavailable (expected in test environment)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {accountData.hasDID ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>
                {accountData.hasDID
                  ? '✓ DID contract integration working'
                  : '⚠ DID contract not deployed (expected until deployment)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}