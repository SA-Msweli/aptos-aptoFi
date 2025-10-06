// React import removed - not needed with new JSX transform
import { PaymentDashboard } from '@/components';

export function PaymentPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">P2P Payments</h1>
        <p className="text-gray-600">
          Send multiple token types instantly to other Aptos addresses with real-time validation and risk assessment.
        </p>
      </div>

      <PaymentDashboard />
    </div>
  );
}

export default PaymentPage;