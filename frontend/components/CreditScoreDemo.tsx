/**
 * CreditScoreDemo Component
 * 
 * Demo page showcasing the credit score functionality
 */

// React import removed - not needed with new JSX transform
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CreditCard, Wallet, Info } from 'lucide-react';
import { CreditDashboard } from './CreditDashboard';
// CreditScore import removed - not used in this component
// import { ReputationProvider } from '../providers/reputationProvider'; // Removed

export function CreditScoreDemo() {
  const { account, connected } = useWallet();

  if (!connected || !account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <CreditCard className="h-16 w-16 mx-auto text-blue-600" />
            <h1 className="text-3xl font-bold">DeFi Credit Score</h1>
            <p className="text-lg text-muted-foreground">
              Check your creditworthiness for DeFi lending and borrowing
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-muted-foreground">
                    Connect your wallet to view your DeFi credit score and lending eligibility
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your credit score is calculated based on your on-chain transaction history,
              DeFi activity, lending behavior, and governance participation.
              No personal information is required.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CreditDashboard address={account.address.toString()} />
    </div>
  );
}

/**
 * Compact Credit Score Widget for integration into other components
 */
export function CreditScoreWidget() {
  const { account, connected } = useWallet();

  if (!connected || !account) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">Credit Score</div>
              <div className="text-sm text-muted-foreground">Connect wallet to view</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* This would use the useReputation hook to get metrics */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                <span className="text-blue-600 font-bold">720</span>
              </div>
              <div>
                <div className="font-semibold">Good Credit</div>
                <div className="text-sm text-muted-foreground">Prime Tier</div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditScoreDemo;