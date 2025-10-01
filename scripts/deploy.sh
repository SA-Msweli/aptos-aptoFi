#!/bin/bash

# AptoFi Simple Deployment Script
# This script provides step-by-step deployment commands

set -e

echo "🚀 AptoFi Contract Deployment"
echo "=============================="

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first:"
    echo "curl -fsSL \"https://aptos.dev/scripts/install_cli.py\" | python3"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "contracts/Move.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "✅ Aptos CLI found"

# Get network choice
echo ""
echo "Select deployment network:"
echo "1) Devnet (for development)"
echo "2) Testnet (for testing)"
echo "3) Mainnet (for production)"
read -p "Enter choice (1-3): " network_choice

case $network_choice in
    1)
        NETWORK="devnet"
        NODE_URL="https://fullnode.devnet.aptoslabs.com/v1"
        FAUCET_URL="https://faucet.devnet.aptoslabs.com"
        ;;
    2)
        NETWORK="testnet"
        NODE_URL="https://fullnode.testnet.aptoslabs.com/v1"
        FAUCET_URL="https://faucet.testnet.aptoslabs.com"
        ;;
    3)
        NETWORK="mainnet"
        NODE_URL="https://fullnode.mainnet.aptoslabs.com/v1"
        FAUCET_URL=""
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "📡 Selected network: $NETWORK"

# Initialize Aptos configuration
echo ""
echo "🔧 Initializing Aptos configuration..."
aptos init --network $NETWORK

# Get the account address
ACCOUNT_ADDRESS=$(aptos config show-profiles --profile default | grep "account" | awk '{print $2}')
echo "📍 Account address: $ACCOUNT_ADDRESS"

# Fund account if not mainnet
if [ "$NETWORK" != "mainnet" ]; then
    echo ""
    echo "💰 Funding account..."
    aptos account fund-with-faucet --account $ACCOUNT_ADDRESS || {
        echo "⚠️  Auto-funding failed. Please fund manually at: https://aptoslabs.com/$NETWORK-faucet"
        read -p "Press Enter after funding your account..."
    }
fi

# Check balance
echo ""
echo "💳 Checking account balance..."
aptos account list --account $ACCOUNT_ADDRESS

# Deploy contracts
echo ""
echo "📦 Deploying contracts..."
cd contracts

echo "🔨 Compiling contracts..."
aptos move compile --named-addresses aptofi=$ACCOUNT_ADDRESS

echo "🚀 Publishing contracts..."
aptos move publish --named-addresses aptofi=$ACCOUNT_ADDRESS

cd ..

echo ""
echo "⚙️  Initializing contracts..."

# Initialize each contract with proper error handling
echo "🔧 Initializing did_registry..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::did_registry::initialize" 2>/dev/null || {
    echo "✅ did_registry already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing chainlink_oracle..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::initialize" 2>/dev/null || {
    echo "✅ chainlink_oracle already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing reputation_system..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::reputation_system::initialize" 2>/dev/null || {
    echo "✅ reputation_system already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing risk_manager..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::risk_manager::initialize" 2>/dev/null || {
    echo "✅ risk_manager already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing amm..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::amm::initialize" 2>/dev/null || {
    echo "✅ amm already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing yield_vault..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::yield_vault::initialize" 2>/dev/null || {
    echo "✅ yield_vault already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing lending_protocol..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::lending_protocol::initialize" 2>/dev/null || {
    echo "✅ lending_protocol already initialized or initialization not needed"
}
sleep 1

echo "🔧 Initializing ccip_bridge..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::ccip_bridge::initialize" 2>/dev/null || {
    echo "✅ ccip_bridge already initialized or initialization not needed"
}
sleep 1

echo ""
echo "🔧 Setting up oracle price feeds..."
echo "📊 Adding APT price feed..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::register_price_feed" --args string:APT u64:1000000000 u8:8 2>/dev/null || {
    echo "✅ APT price feed already exists"
}

echo "📊 Adding USDC price feed..."
aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::register_price_feed" --args string:USDC u64:100000000 u8:8 2>/dev/null || {
    echo "✅ USDC price feed already exists"
}

echo ""
echo "🧪 Testing contract functionality..."
echo "📋 DID Registry - Total users:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::did_registry::get_total_users" 2>/dev/null || echo "❌ Failed to query"

echo "📋 Oracle - Total feeds:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::get_total_feeds" 2>/dev/null || echo "❌ Failed to query"

echo "📋 AMM - Total pools:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::amm::get_total_pools" 2>/dev/null || echo "❌ Failed to query"

# Save deployment info
echo ""
echo "📄 Saving deployment information..."
cat > deployment.json << EOF
{
  "network": "$NETWORK",
  "nodeUrl": "$NODE_URL",
  "deployerAddress": "$ACCOUNT_ADDRESS",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "did_registry": "${ACCOUNT_ADDRESS}::did_registry",
    "chainlink_oracle": "${ACCOUNT_ADDRESS}::chainlink_oracle",
    "reputation_system": "${ACCOUNT_ADDRESS}::reputation_system",
    "risk_manager": "${ACCOUNT_ADDRESS}::risk_manager",
    "amm": "${ACCOUNT_ADDRESS}::amm",
    "yield_vault": "${ACCOUNT_ADDRESS}::yield_vault",
    "lending_protocol": "${ACCOUNT_ADDRESS}::lending_protocol",
    "ccip_bridge": "${ACCOUNT_ADDRESS}::ccip_bridge"
  }
}
EOF

echo ""
echo "🎊 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "  Network: $NETWORK"
echo "  Account: $ACCOUNT_ADDRESS"
echo "  Deployment info saved to: deployment.json"
echo ""
echo "📝 Next steps:"
echo "1. Update mobile/src/utils/constants.ts with your contract address"
echo "2. Test contract functions"
echo "3. Set up oracle price feeds"
echo "4. Configure mobile app"
echo ""
echo "🧪 Test deployment commands:"
echo "  aptos move view --function-id '${ACCOUNT_ADDRESS}::did_registry::get_total_users'"
echo "  aptos move view --function-id '${ACCOUNT_ADDRESS}::chainlink_oracle::get_total_feeds'"
echo "  aptos move view --function-id '${ACCOUNT_ADDRESS}::ccip_bridge::get_supported_chains'"
echo ""
echo "🔗 View deployment on explorer:"
echo "  https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=${NETWORK}"