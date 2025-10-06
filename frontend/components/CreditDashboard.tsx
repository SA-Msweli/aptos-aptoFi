/**
 * CreditDashboard Component
 * 
 * Comprehensive credit score dashboard - functionality removed
 */

// useState import removed - not used
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditDashboardProps {
  address: string;
  className?: string;
}

export function CreditDashboard({ address, className }: CreditDashboardProps) {
  // Loading state removed - not used

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit Score Dashboard</h1>
          <p className="text-muted-foreground">
            Credit scoring functionality has been removed
          </p>
        </div>
        <Button variant="outline" disabled>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Removed Functionality Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            Functionality Removed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              The credit scoring and reputation system has been completely removed from this application.
              This dashboard previously showed:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>FICO-style credit scores (300-850 range)</li>
                <li>Payment history analysis</li>
                <li>Credit utilization tracking</li>
                <li>DeFi activity scoring</li>
                <li>Loan eligibility calculations</li>
                <li>Risk assessment metrics</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Address Info */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <strong>Address:</strong> {address}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditDashboard;