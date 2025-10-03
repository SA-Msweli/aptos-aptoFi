/**
 * Verification script for enhanced transaction management system
 * This demonstrates the new features added in task 1.8
 */

import {
  getUserFriendlyErrorMessage,
  getErrorSuggestedActions,
  isErrorRetryable,
  getErrorSeverity,
  getErrorDetails,
  formatTransactionResult,
  calculateTransactionFee,
  estimateTransactionTime,
  DEFAULT_RETRY_POLICY,
  TransactionResult
} from './transactions';

/**
 * Demonstrate error translation capabilities
 */
export function demonstrateErrorTranslation() {
  console.log('=== Enhanced Error Translation Demo ===');

  const testErrors = [
    'E_INSUFFICIENT_BALANCE',
    'E_KYC_NOT_VERIFIED',
    'E_VAULT_NOT_FOUND',
    'E_LIQUIDATION_THRESHOLD_EXCEEDED',
    'E_CHAIN_NOT_SUPPORTED',
    'E_PRICE_STALE',
    'SEQUENCE_NUMBER_TOO_OLD',
    'ABORT_1'
  ];

  testErrors.forEach(error => {
    console.log(`\nError: ${error}`);
    console.log(`User Message: ${getUserFriendlyErrorMessage(error)}`);
    console.log(`Retryable: ${isErrorRetryable(error)}`);
    console.log(`Severity: ${getErrorSeverity(error)}`);
    console.log(`Suggested Actions: ${getErrorSuggestedActions(error).join(', ')}`);

    const details = getErrorDetails(error);
    console.log(`Wait Time: ${details.suggestedWaitTime}ms`);
  });
}

/**
 * Demonstrate transaction result formatting
 */
export function demonstrateTransactionFormatting() {
  console.log('\n=== Transaction Result Formatting Demo ===');

  const successResult: TransactionResult = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    success: true,
    gasUsed: 1500,
    timestamp: Date.now()
  };

  const failureResult: TransactionResult = {
    hash: '',
    success: false,
    errorMessage: 'E_INSUFFICIENT_BALANCE',
    userFriendlyError: 'You don\'t have enough balance to complete this transaction.',
    retryable: true,
    timestamp: Date.now()
  };

  console.log('Success Result:', formatTransactionResult(successResult));
  console.log('Failure Result:', formatTransactionResult(failureResult));
}

/**
 * Demonstrate utility functions
 */
export function demonstrateUtilities() {
  console.log('\n=== Utility Functions Demo ===');

  // Gas fee calculation
  const gasUsed = 2500;
  const gasPrice = 100;
  const fee = calculateTransactionFee(gasUsed, gasPrice);
  console.log(`Transaction Fee: ${fee} APT (${gasUsed} gas at ${gasPrice} price)`);

  // Time estimation
  const estimatedTime = estimateTransactionTime(gasUsed);
  console.log(`Estimated Completion Time: ${estimatedTime} seconds`);

  // Retry policy
  console.log('Default Retry Policy:', DEFAULT_RETRY_POLICY);
}

/**
 * Demonstrate comprehensive error handling
 */
export function demonstrateComprehensiveErrorHandling() {
  console.log('\n=== Comprehensive Error Handling Demo ===');

  // Test different error formats
  const errorFormats = [
    'E_VAULT_INACTIVE',
    { message: 'Transaction failed with E_CCIP_FEE_INSUFFICIENT' },
    { vm_status: 'ABORTED with code 2' },
    { move_abort_code: 123 },
    'SEQUENCE_NUMBER_TOO_NEW',
    'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE'
  ];

  errorFormats.forEach((error, index) => {
    console.log(`\nError Format ${index + 1}:`, error);
    const details = getErrorDetails(error);
    console.log(`Category: ${details.userFriendlyError.category}`);
    console.log(`User Message: ${details.userFriendlyError.userMessage}`);
    console.log(`Can Retry: ${details.canRetry}`);
    console.log(`Suggested Wait: ${details.suggestedWaitTime}ms`);
  });
}

/**
 * Demonstrate banking-specific error scenarios
 */
export function demonstrateBankingErrorScenarios() {
  console.log('\n=== Banking-Specific Error Scenarios Demo ===');

  const bankingErrors = [
    // Lending errors
    'E_INSUFFICIENT_COLLATERAL',
    'E_LIQUIDATION_THRESHOLD_EXCEEDED',
    'E_POSITION_UNHEALTHY',

    // Vault errors
    'E_VAULT_NOT_FOUND',
    'E_VAULT_INACTIVE',
    'E_INSUFFICIENT_SHARES',

    // Cross-chain errors
    'E_CHAIN_NOT_SUPPORTED',
    'E_CCIP_FEE_INSUFFICIENT',
    'E_TRANSFER_FAILED',

    // Compliance errors
    'E_KYC_NOT_VERIFIED',
    'E_KYC_LEVEL_INSUFFICIENT',
    'E_TRANSACTION_LIMIT_EXCEEDED',

    // Oracle errors
    'E_PRICE_STALE',
    'E_ORACLE_NOT_FOUND',
    'E_PRICE_DEVIATION_TOO_HIGH'
  ];

  bankingErrors.forEach(error => {
    const details = getErrorDetails(error);
    console.log(`\n${error}:`);
    console.log(`  Category: ${details.userFriendlyError.category}`);
    console.log(`  Severity: ${details.userFriendlyError.severity}`);
    console.log(`  Retryable: ${details.canRetry}`);
    console.log(`  User Message: ${details.userFriendlyError.userMessage}`);
    console.log(`  Actions: ${details.userFriendlyError.suggestedActions.slice(0, 2).join(', ')}`);
  });
}

/**
 * Run all demonstrations
 */
export function runAllDemonstrations() {
  console.log('🚀 Enhanced Transaction Management System Verification');
  console.log('====================================================');

  demonstrateErrorTranslation();
  demonstrateTransactionFormatting();
  demonstrateUtilities();
  demonstrateComprehensiveErrorHandling();
  demonstrateBankingErrorScenarios();

  console.log('\n✅ All demonstrations completed successfully!');
  console.log('\nKey Enhancements Added:');
  console.log('- Comprehensive error translation with 25+ error types');
  console.log('- Enhanced event listening with real-time polling');
  console.log('- Advanced retry mechanisms with exponential backoff');
  console.log('- Transaction status tracking with caching');
  console.log('- Batch transaction processing');
  console.log('- Banking-specific error handling');
  console.log('- Retry queue management');
  console.log('- Comprehensive utility functions');
}

// Export for use in other parts of the application
export const TransactionVerification = {
  demonstrateErrorTranslation,
  demonstrateTransactionFormatting,
  demonstrateUtilities,
  demonstrateComprehensiveErrorHandling,
  demonstrateBankingErrorScenarios,
  runAllDemonstrations
};