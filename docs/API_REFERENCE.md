# API Reference

## Overview

AptoFi provides a comprehensive API for interacting with the DeFi banking platform through smart contracts on Aptos blockchain. This reference covers all available functions, their parameters, and usage examples.

## Smart Contract APIs

### DID Registry Contract

#### Entry Functions

##### `create_profile`
Creates a new DID profile for a user.

```typescript
// Frontend usage
import { createProfile } from "@/entry-functions/didRegistry";

const result = await createDIDProfile({
  profileHash: "unique-profile-identifier",
  metadataKeys: ["name", "bio", "website"],
  metadataValues: ["John Doe", "DeFi enthusiast", "https://johndoe.com"]
});
```

**Parameters**:
- `profile_hash: vector<u8>` - Unique profile identifier
- `metadata_keys: vector<String>` - Metadata field names
- `metadata_values: vector<String>` - Metadata field values

**Errors**:
- `E_PROFILE_EXISTS` - Profile already exists for this address
- `E_INVALID_METADATA` - Metadata keys/values length mismatch

##### `update_profile`
Updates an existing DID profile.

```typescript
const result = await updateDIDProfile({
  profileHash: "updated-profile-identifier",
  metadataKeys: ["name", "bio", "website", "twitter"],
  metadataValues: ["John Doe", "Updated bio", "https://johndoe.com", "@johndoe"]
});
```

**Parameters**:
- `new_profile_hash: vector<u8>` - New profile identifier
- `metadata_keys: vector<String>` - Updated metadata keys
- `metadata_values: vector<String>` - Updated metadata values

**Errors**:
- `E_PROFILE_NOT_FOUND` - Profile doesn't exist
- `E_PROFILE_INACTIVE` - Profile is deactivated

##### `deactivate_profile`
Deactivates a user's DID profile.

```typescript
const result = await deactivateDIDProfile({});
```

**Parameters**: None

**Errors**:
- `E_PROFILE_NOT_FOUND` - Profile doesn't exist

#### View Functions

##### `get_profile`
Retrieves user profile information.

```typescript
const profile = await getUserProfile(accountAddress);
```

**Parameters**:
- `user_address: address` - User's wallet address

**Returns**:
- `(address, u64, u64, vector<u8>, bool)` - (wallet_address, created_at, updated_at, profile_hash, is_active)

##### `profile_exists`
Checks if a profile exists for an address.

```typescript
const exists = await profileExists(accountAddress);
```

**Parameters**:
- `user_address: address` - User's wallet address

**Returns**:
- `bool` - True if profile exists

##### `is_profile_active`
Checks if a profile is active.

```typescript
const isActive = await isProfileActive(accountAddress);
```

**Parameters**:
- `user_address: address` - User's wallet address

**Returns**:
- `bool` - True if profile is active

### KYC Registry Contract

#### Entry Functions

##### `create_kyc_profile`
Creates a KYC-compliant profile with encrypted personal information.

```typescript
const result = await createKYCProfile({
  profileHash: "kyc-profile-hash",
  fullNameHash: "encrypted-full-name",
  dateOfBirthHash: "encrypted-dob",
  nationalityHash: "encrypted-nationality",
  addressHash: "encrypted-address",
  countryCode: "US",
  metadataKeys: ["email", "phone"],
  metadataValues: ["user@example.com", "+1234567890"]
});
```

**Parameters**:
- `profile_hash: vector<u8>` - Unique profile identifier
- `full_name_hash: vector<u8>` - Encrypted full name
- `date_of_birth_hash: vector<u8>` - Encrypted date of birth
- `nationality_hash: vector<u8>` - Encrypted nationality
- `address_hash: vector<u8>` - Encrypted address
- `country_code: String` - ISO country code
- `metadata_keys: vector<String>` - Additional metadata keys
- `metadata_values: vector<String>` - Additional metadata values

##### `submit_kyc_document`
Submits a KYC document for verification.

```typescript
const result = await submitKYCDocument({
  documentType: DOCUMENT_TYPES.PASSPORT,
  documentHash: "sha256-document-hash",
  ipfsHash: "QmDocumentIPFSHash",
  issuedDate: 1640995200, // Unix timestamp
  expiryDate: 1956528000, // Unix timestamp
  issuingAuthority: "US Department of State"
});
```

**Parameters**:
- `document_type: u8` - Document type (1=Passport, 2=License, etc.)
- `document_hash: vector<u8>` - SHA-256 hash of document
- `ipfs_hash: String` - IPFS storage hash
- `issued_date: u64` - Document issue date (Unix timestamp)
- `expiry_date: u64` - Document expiry date (Unix timestamp)
- `issuing_authority: String` - Authority that issued document

#### View Functions

##### `get_kyc_profile`
Retrieves KYC profile information.

```typescript
const kycProfile = await getKYCProfile(accountAddress);
```

**Parameters**:
- `user_address: address` - User's wallet address

**Returns**:
- `(u8, u8, u8, u64, u64, bool, bool)` - (kyc_level, verification_status, compliance_status, verified_at, expires_at, is_active, is_suspended)

##### `is_kyc_compliant`
Checks if user meets KYC requirements for specific operation.

```typescript
const isCompliant = await isKYCCompliant(accountAddress, KYC_LEVELS.BASIC);
```

**Parameters**:
- `user_address: address` - User's wallet address
- `required_level: u8` - Required KYC level

**Returns**:
- `bool` - True if compliant

### AMM Protocol Contract

#### Entry Functions

##### `create_pool`
Creates a new liquidity pool.

```typescript
const result = await executeTransaction({
  function: `${CONTRACT_ADDRESSES.AMM}::create_pool`,
  functionArguments: [
    "APT", // token_a_symbol
    "USDC", // token_b_symbol
    "1000000000", // initial_a (10 APT in octas)
    "10000000" // initial_b (10 USDC in micro-units)
  ]
});
```

##### `swap_exact_input`
Executes a token swap with exact input amount.

```typescript
const result = await performSwap({
  coinTypeA: "0x1::aptos_coin::AptosCoin",
  coinTypeB: "0x1::coin::USDC",
  amountIn: 1000000000, // 10 APT in octas
  minAmountOut: 9500000 // Minimum 9.5 USDC with slippage
});
```

##### `add_liquidity`
Adds liquidity to an existing pool.

```typescript
const result = await addLiquidityToPool({
  coinTypeA: "0x1::aptos_coin::AptosCoin",
  coinTypeB: "0x1::coin::USDC",
  amountA: 1000000000, // 10 APT
  amountB: 10000000, // 10 USDC
  minAmountA: 950000000, // 5% slippage
  minAmountB: 9500000
});
```

#### View Functions

##### `get_pool_info`
Retrieves pool information and statistics.

```typescript
const poolInfo = await getPoolInfo(poolAddress);
```

**Returns**:
- `(u64, u64, u64, u64, String, String)` - (token_a_reserve, token_b_reserve, lp_supply, fee_rate, token_a_symbol, token_b_symbol)

##### `get_swap_quote`
Calculates expected output for a swap.

```typescript
const quote = await getSwapQuote(poolAddress, "APT", 1000000000);
```

**Parameters**:
- `pool_address: address` - Pool contract address
- `token_in_symbol: String` - Input token symbol
- `amount_in: u64` - Input amount

**Returns**:
- `u64` - Expected output amount

### Lending Protocol Contract

#### Entry Functions

##### `request_loan`
Requests a collateralized loan.

```typescript
const result = await executeTransaction({
  function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::request_loan`,
  functionArguments: [
    poolAddress,
    "USDC", // token_symbol
    "5000000", // amount (5 USDC)
    "10000000000", // collateral_amount (100 APT)
    "2592000" // duration (30 days)
  ]
});
```

##### `repay_loan`
Repays a loan with interest.

```typescript
const result = await executeTransaction({
  function: `${CONTRACT_ADDRESSES.LENDING_PROTOCOL}::repay_loan`,
  functionArguments: [
    poolAddress,
    "USDC",
    "5250000" // amount + interest
  ]
});
```

#### View Functions

##### `get_user_loan`
Retrieves user's loan information.

```typescript
const loan = await getUserLoan(userAddress, "USDC");
```

**Returns**:
- `(u64, u64, u64, u64, bool)` - (amount, collateral_amount, interest_rate, start_time, is_active)

##### `calculate_loan_health`
Calculates loan health factor.

```typescript
const healthFactor = await calculateLoanHealth(userAddress, "USDC");
```

**Returns**:
- `u64` - Health factor in basis points (10000 = 100%)

### Reputation System Contract

#### Entry Functions

##### `initialize_reputation`
Initializes reputation system for a user.

```typescript
const result = await initializeUserReputation({});
```

##### `update_transaction_score`
Updates user's transaction-based reputation score.

```typescript
const result = await updateUserTransactionScore({
  userAddress: accountAddress,
  amount: 1000000000, // Transaction amount
  frequency: 5 // Number of transactions
});
```

#### View Functions

##### `get_reputation_score`
Retrieves complete reputation data.

```typescript
const reputation = await getReputationData(accountAddress);
```

**Returns**:
- `(u64, u8, u64, u64, u64, u64)` - (total_score, tier, transaction_score, lending_score, governance_score, last_updated)

## Error Handling

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `E_NOT_AUTHORIZED` | User not authorized for operation | Complete required verification |
| `E_PROFILE_NOT_FOUND` | DID profile doesn't exist | Create DID profile first |
| `E_KYC_NOT_VERIFIED` | KYC verification required | Complete KYC process |
| `E_INSUFFICIENT_BALANCE` | Insufficient token balance | Add funds to wallet |
| `E_SLIPPAGE_EXCEEDED` | Transaction slippage too high | Adjust slippage tolerance |
| `E_POOL_NOT_FOUND` | Liquidity pool doesn't exist | Use existing pool or create new |

### Error Handling Best Practices

```typescript
// Proper error handling example
try {
  const result = await createDIDProfile(profileData);
  
  if (result.success) {
    // Handle success
    console.log("Profile created:", result.hash);
  } else {
    // Handle transaction failure
    console.error("Transaction failed:", result.errorMessage);
    showUserError(result.errorMessage);
  }
} catch (error) {
  // Handle network or unexpected errors
  console.error("Unexpected error:", error);
  showUserError("An unexpected error occurred. Please try again.");
}
```

## Rate Limits and Quotas

### API Rate Limits

| Endpoint Type | Rate Limit | Quota |
|---------------|------------|-------|
| View Functions | 100 req/min | 10,000 req/day |
| Entry Functions | 10 req/min | 1,000 req/day |
| Document Upload | 5 req/min | 100 req/day |

### Transaction Limits

| KYC Level | Daily Limit | Monthly Limit | Gas Limit |
|-----------|-------------|---------------|-----------|
| None | $1,000 | $5,000 | 1,000 units |
| Basic | $10,000 | $50,000 | 5,000 units |
| Enhanced | $100,000 | $500,000 | 10,000 units |
| Institutional | Unlimited | Unlimited | 50,000 units |

## SDK Integration Examples

### Complete User Onboarding

```typescript
// Complete user onboarding flow
async function completeUserOnboarding(userData: UserData) {
  try {
    // Step 1: Create DID profile
    const didResult = await createDIDProfile({
      profileHash: userData.profileHash,
      metadataKeys: ["name", "email"],
      metadataValues: [userData.name, userData.email]
    });
    
    if (!didResult.success) {
      throw new Error("Failed to create DID profile");
    }
    
    // Step 2: Initialize reputation
    const repResult = await initializeUserReputation({});
    
    // Step 3: Create KYC profile (optional)
    if (userData.kycData) {
      const kycResult = await createKYCProfile(userData.kycData);
      
      if (kycResult.success) {
        // Step 4: Submit documents
        for (const document of userData.documents) {
          await submitKYCDocument(document);
        }
      }
    }
    
    return { success: true, message: "Onboarding complete" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### DeFi Operation with Compliance Check

```typescript
// Execute DeFi operation with compliance validation
async function executeDeFiOperation(operation: DeFiOperation) {
  try {
    // Step 1: Check KYC compliance
    const isCompliant = await isKYCCompliant(
      operation.userAddress,
      operation.requiredKYCLevel
    );
    
    if (!isCompliant) {
      throw new Error("KYC verification required");
    }
    
    // Step 2: Check transaction limits
    const canExecute = await checkTransactionLimits(
      operation.userAddress,
      operation.amount
    );
    
    if (!canExecute) {
      throw new Error("Transaction exceeds daily limit");
    }
    
    // Step 3: Execute operation
    const result = await executeTransaction(operation.transactionData);
    
    // Step 4: Update reputation (if successful)
    if (result.success) {
      await updateUserTransactionScore({
        userAddress: operation.userAddress,
        amount: operation.amount,
        frequency: 1
      });
    }
    
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## WebSocket Events (Future)

### Real-Time Updates

```typescript
// Subscribe to real-time updates
const eventSubscription = aptosClient.subscribeToEvents({
  filter: {
    account_address: CONTRACT_ADDRESSES.DID_REGISTRY,
    event_type: "ProfileCreated"
  },
  callback: (event) => {
    console.log("New profile created:", event);
    // Update UI in real-time
  }
});
```

### Event Types

| Event | Description | Data |
|-------|-------------|------|
| `ProfileCreated` | New DID profile created | user_address, profile_hash, timestamp |
| `ProfileUpdated` | Profile updated | user_address, old_hash, new_hash, timestamp |
| `KYCVerificationCompleted` | KYC verification completed | user_address, verifier, old_level, new_level |
| `SwapEvent` | Token swap executed | user, pool_key, amount_in, amount_out, fee |
| `LiquidityEvent` | Liquidity added/removed | user, pool_key, action, amounts, lp_tokens |

## Testing APIs

### Testnet Utilities

```typescript
// Fund account from faucet (testnet only)
const funded = await fundFromFaucet();

// Get testnet tokens
const result = await executeTransaction({
  function: "0x1::aptos_account::transfer",
  functionArguments: [recipientAddress, "1000000000"] // 10 APT
});
```

### Mock Data for Development

```typescript
// Mock KYC data for testing
const mockKYCData = {
  profileHash: "test-profile-" + Date.now(),
  fullNameHash: btoa("Test User"),
  dateOfBirthHash: btoa("1990-01-01"),
  nationalityHash: btoa("US"),
  addressHash: btoa("123 Test St, Test City, TS 12345"),
  countryCode: "US",
  metadataKeys: ["email", "phone"],
  metadataValues: ["test@example.com", "+1234567890"]
};
```

## Performance Optimization

### Caching Strategy

```typescript
// React Query configuration for optimal caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// Cached profile data
const { data: profile, isLoading } = useQuery({
  queryKey: ['profile', accountAddress],
  queryFn: () => getUserProfile(accountAddress),
  enabled: !!accountAddress,
});
```

### Batch Operations

```typescript
// Batch multiple view function calls
const batchResults = await Promise.all([
  getUserProfile(accountAddress),
  getReputationData(accountAddress),
  getKYCProfile(accountAddress),
  getAccountBalance(accountAddress)
]);
```

## Security Best Practices

### Input Validation

```typescript
// Validate addresses before API calls
function validateAddress(address: string): boolean {
  try {
    AccountAddress.from(address);
    return true;
  } catch {
    return false;
  }
}

// Validate amounts
function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER;
}
```

### Transaction Security

```typescript
// Secure transaction execution
async function secureTransactionExecution(transactionData: any) {
  // Validate transaction data
  if (!validateTransactionData(transactionData)) {
    throw new Error("Invalid transaction data");
  }
  
  // Estimate gas
  const gasEstimate = await estimateGas(transactionData);
  
  // Execute with gas limit
  const result = await executeTransaction(transactionData, {
    maxGasAmount: gasEstimate * 1.2 // 20% buffer
  });
  
  return result;
}
```

This API reference provides comprehensive documentation for integrating with AptoFi's smart contracts and building applications on top of the platform.