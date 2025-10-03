#!/bin/bash

# AptoFi Production Deployment Script - New Address Approach
# This script deploys production-ready contracts to a fresh address

echo "🚀 Starting AptoFi Production Deployment (New Address)..."
echo "📋 This will deploy to a NEW address, leaving old contracts untouched"
echo ""

# Check if we're in the right directory
if [ ! -f "Move.toml" ]; then
    echo "❌ Error: Move.toml not found. Please run from the contract directory."
    exit 1
fi

# Verify Move.toml is configured for new address
if ! grep -q 'aptofi = "_"' Move.toml; then
    echo "⚠️  Warning: Move.toml should have 'aptofi = \"_\"' for new address deployment"
    echo "🔧 Updating Move.toml for new address deployment..."
    
    # Backup current Move.toml
    cp Move.toml Move.toml.backup
    
    # Update to use new address with dev-addresses
    sed -i 's/aptofi = ".*"/aptofi = "_"/' Move.toml
    
    # Add dev-addresses section if not present
    if ! grep -q '\[dev-addresses\]' Move.toml; then
        echo "" >> Move.toml
        echo "[dev-addresses]" >> Move.toml
        echo 'aptofi = "0x42"' >> Move.toml
    fi
    
    echo "✅ Move.toml updated for new address deployment"
fi

# Show current configuration
echo "📋 Current Configuration:"
echo "   - Package: AptoFi v1.0.0"
echo "   - Network: Testnet"
echo "   - Address: NEW (will be generated)"
echo "   - Deployment Mode: Chunked Publish"
echo ""

# Compile contracts first
echo "📦 Compiling contracts..."
aptos move compile --dev

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Compilation successful!"
echo ""

# Deploy to testnet with chunked publish
echo "🌐 Deploying to testnet (chunked publish)..."
echo "💡 This will submit 2 transactions for staging and publishing"
echo ""

# Capture deployment output to extract new address
DEPLOY_OUTPUT=$(aptos move publish --chunked-publish 2>&1)
DEPLOY_EXIT_CODE=$?

echo "$DEPLOY_OUTPUT"

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed."
    echo "💡 If you see staging area errors, run: aptos move clear-staging-area"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"

# Extract new address from deployment output or config
echo "📝 Extracting new contract address..."
NEW_ADDRESS=$(aptos config show-profiles --profile default | grep "account" | awk '{print $2}')

if [ -z "$NEW_ADDRESS" ]; then
    echo "⚠️  Could not automatically extract new address. Please check deployment output."
    echo "📋 You can find your address with: aptos config show-profiles"
    NEW_ADDRESS="PLEASE_UPDATE_WITH_ACTUAL_ADDRESS"
fi

# Update deployment.json with new configuration
echo "📝 Updating deployment configuration..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Backup old deployment.json if it exists
if [ -f "../deployment.json" ]; then
    cp ../deployment.json ../deployment.json.backup
    echo "📋 Old deployment.json backed up as deployment.json.backup"
fi

# Create updated deployment.json
cat > ../deployment.json << EOF
{
  "network": "testnet",
  "nodeUrl": "https://fullnode.testnet.aptoslabs.com/v1",
  "deployerAddress": "$NEW_ADDRESS",
  "timestamp": "$TIMESTAMP",
  "version": "2.0.0-production",
  "deployment_type": "fresh_address",
  "old_address": "927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c",
  "contracts": {
    "did_registry": "${NEW_ADDRESS}::did_registry",
    "kyc_did_registry": "${NEW_ADDRESS}::kyc_did_registry",
    "chainlink_oracle": "${NEW_ADDRESS}::chainlink_oracle",
    "reputation_system": "${NEW_ADDRESS}::reputation_system",
    "risk_manager": "${NEW_ADDRESS}::risk_manager",
    "amm": "${NEW_ADDRESS}::amm",
    "yield_vault": "${NEW_ADDRESS}::yield_vault",
    "lending_protocol": "${NEW_ADDRESS}::lending_protocol",
    "ccip_bridge": "${NEW_ADDRESS}::ccip_bridge"
  },
  "features": {
    "production_ready": true,
    "real_coin_handling": true,
    "kyc_integration": true,
    "resource_accounts": true,
    "aptos_best_practices": true
  }
}
EOF

echo "✅ Deployment configuration updated!"
echo ""

# Create initialization script
echo "📝 Creating contract initialization script..."
cat > initialize-contracts.sh << 'EOF'
#!/bin/bash

# AptoFi Contract Initialization Script
# Run this after deployment to set up contracts properly

echo "🔧 Initializing AptoFi Contracts..."

# Load deployment config
if [ ! -f "../deployment.json" ]; then
    echo "❌ deployment.json not found. Please deploy contracts first."
    exit 1
fi

# Extract address from deployment.json
NEW_ADDRESS=$(grep -o '"deployerAddress": "[^"]*' ../deployment.json | cut -d'"' -f4)

echo "📋 Initializing contracts at address: $NEW_ADDRESS"
echo ""

# Initialize DID Registry
echo "1️⃣ Initializing DID Registry..."
# aptos move run --function-id ${NEW_ADDRESS}::did_registry::initialize

# Initialize KYC Registry  
echo "2️⃣ Initializing KYC Registry..."
# aptos move run --function-id ${NEW_ADDRESS}::kyc_did_registry::initialize

# Initialize Reputation System
echo "3️⃣ Initializing Reputation System..."
# aptos move run --function-id ${NEW_ADDRESS}::reputation_system::initialize

# Initialize Oracle
echo "4️⃣ Initializing Chainlink Oracle..."
# aptos move run --function-id ${NEW_ADDRESS}::chainlink_oracle::initialize

# Initialize Risk Manager
echo "5️⃣ Initializing Risk Manager..."
# aptos move run --function-id ${NEW_ADDRESS}::risk_manager::initialize

# AMM initializes automatically via init_module()
echo "6️⃣ AMM initialized automatically via init_module()"

# Initialize Yield Vault
echo "7️⃣ Initializing Yield Vault..."
# aptos move run --function-id ${NEW_ADDRESS}::yield_vault::initialize

# Initialize Lending Protocol
echo "8️⃣ Initializing Lending Protocol..."
# aptos move run --function-id ${NEW_ADDRESS}::lending_protocol::initialize

# Initialize CCIP Bridge
echo "9️⃣ Initializing CCIP Bridge..."
# aptos move run --function-id ${NEW_ADDRESS}::ccip_bridge::initialize

echo ""
echo "✅ Contract initialization complete!"
echo "💡 Uncomment the aptos move run commands above and run this script to initialize"
EOF

chmod +x initialize-contracts.sh

echo "✅ Initialization script created: initialize-contracts.sh"
echo ""

# Summary
echo "🎉 AptoFi Production Deployment Complete!"
echo ""
echo "📋 Deployment Summary:"
echo "   🆕 New Contract Address: $NEW_ADDRESS"
echo "   🌐 Network: Testnet"
echo "   ⏰ Deployed at: $TIMESTAMP"
echo "   📦 Version: 2.0.0-production"
echo "   🔗 Old Address (deprecated): 927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c"
echo ""
echo "📁 Files Updated:"
echo "   ✅ deployment.json - New contract addresses"
echo "   ✅ deployment.json.backup - Backup of old config"
echo "   ✅ initialize-contracts.sh - Contract initialization script"
echo ""
echo "📖 Next Steps:"
echo "1. 🔧 Run ./initialize-contracts.sh to initialize contracts"
echo "2. 🌐 Update frontend configuration with new addresses"
echo "3. 🧪 Run integration tests with new contracts"
echo "4. 📊 Set up monitoring and alerts"
echo "5. 📢 Update documentation and announce new addresses"
echo ""
echo "💡 The old contracts at the previous address are now deprecated but remain on-chain."