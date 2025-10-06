/**
 * Components Index
 * 
 * Central export point for all components
 */

// Existing components
export { Header } from './Header';
export { WalletProvider } from './WalletProvider';
export { WalletSelector } from './WalletSelector';
export { TopBanner } from './TopBanner';
export { WrongNetworkAlert } from './WrongNetworkAlert';

// Test components
export { HyperionTestPanel } from './HyperionTestPanel';
export { NoditTest } from './NoditTest';
// export { ReputationTest } from './ReputationTest'; // Removed incorrect implementation
// export { SimpleWalletTest } from './SimpleWalletTest'; // File is empty
export { WalletTestPanel } from './WalletTestPanel';

// Reputation components - removed

// Credit Score components
export { CreditScore, CreditScoreBadge } from './CreditScore';
export { CreditDashboard } from './CreditDashboard';
export { CreditScoreDemo, CreditScoreWidget } from './CreditScoreDemo';
export { CreditScoreTest } from './CreditScoreTest';

// Payment components
export { default as PaymentForm } from './PaymentForm';
export { default as PaymentDashboard } from './PaymentDashboard';
export { default as TokenSelector } from './TokenSelector';

// Vault components
export { default as VaultDashboard } from './VaultDashboard';
export { default as VaultDepositForm } from './VaultDepositForm';
export { default as VaultWithdrawForm } from './VaultWithdrawForm';
export { default as VaultCreateForm } from './VaultCreateForm';
export { default as VaultPerformanceChart } from './VaultPerformanceChart';

// UI components
export * from './ui/accordion';
export * from './ui/alert';
export * from './ui/badge';
export * from './ui/button';
export * from './ui/card';
export * from './ui/collapsible';
export * from './ui/dialog';
export * from './ui/dropdown-menu';
export * from './ui/image';
export * from './ui/info';
export * from './ui/input';
export * from './ui/label';
export * from './ui/progress';
export * from './ui/separator';
export * from './ui/tabs';
export * from './ui/toast';
export * from './ui/toaster';
export * from './ui/tooltip';
export * from './ui/use-toast';
export * from './ui/warning-alert';
export * from './ui/select';
export * from './ui/skeleton';
export * from './ui/slider';
export * from './ui/textarea';