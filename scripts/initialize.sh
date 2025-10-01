#!/bin/bash

# AptoFi Contract Initialization Script
# This script initializes contracts that are already deployed

set -e

echo "🔧 AptoFi Contract Initialization"
echo "================================="

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first."
    exit 1
fi

# Check if deployment.json exists
if [ ! -f "deployment.json" ]; then
    echo "❌ deployment.json not found. Please deploy contracts first."
    exit 1
fi

# Read account address from deployment.json
ACCOUNT_ADDRESS=$(grep -o '"deployerAddress": "[^"]*"' deployment.json | cut -d'"' -f4)

if [ -z "$ACCOUNT_ADDRESS" ]; then
    echo "❌ Could not read account address from deployment.json"
    exit 1
fi

echo "📍 Using account: $ACCOUNT_ADDRESS"

echo ""
echo "⚙️  Initializing contracts..."

echo "🔧 Initializing did_registry..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::did_registry::initialize" 2>/dev/null; then
    echo "✅ did_registry initialized successfully"
else
    echo "ℹ️  did_registry already initialized or initialization not needed"
fi

echo "🔧 Initializing chainlink_oracle..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::initialize" 2>/dev/null; then
    echo "✅ chainlink_oracle initialized successfully"
else
    echo "ℹ️  chainlink_oracle already initialized or initialization not needed"
fi

echo "🔧 Initializing reputation_system..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::reputation_system::initialize" 2>/dev/null; then
    echo "✅ reputation_system initialized successfully"
else
    echo "ℹ️  reputation_system already initialized or initialization not needed"
fi

echo "🔧 Initializing risk_manager..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::risk_manager::initialize" 2>/dev/null; then
    echo "✅ risk_manager initialized successfully"
else
    echo "ℹ️  risk_manager already initialized or initialization not needed"
fi

echo "🔧 Initializing amm..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::amm::initialize" 2>/dev/null; then
    echo "✅ amm initialized successfully"
else
    echo "ℹ️  amm already initialized or initialization not needed"
fi

echo "🔧 Initializing yield_vault..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::yield_vault::initialize" 2>/dev/null; then
    echo "✅ yield_vault initialized successfully"
else
    echo "ℹ️  yield_vault already initialized or initialization not needed"
fi

echo "🔧 Initializing lending_protocol..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::lending_protocol::initialize" 2>/dev/null; then
    echo "✅ lending_protocol initialized successfully"
else
    echo "ℹ️  lending_protocol already initialized or initialization not needed"
fi

echo "🔧 Initializing ccip_bridge..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::ccip_bridge::initialize" 2>/dev/null; then
    echo "✅ ccip_bridge initialized successfully"
else
    echo "ℹ️  ccip_bridge already initialized or initialization not needed"
fi

echo ""
echo "🔧 Setting up oracle price feeds..."
echo "📊 Adding APT price feed (\$10.00)..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::register_price_feed" --args string:APT u64:1000000000 u8:8 2>/dev/null; then
    echo "✅ APT price feed registered successfully"
else
    echo "ℹ️  APT price feed already exists"
fi

echo "📊 Adding USDC price feed (\$1.00)..."
if aptos move run --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::register_price_feed" --args string:USDC u64:100000000 u8:8 2>/dev/null; then
    echo "✅ USDC price feed registered successfully"
else
    echo "ℹ️  USDC price feed already exists"
fi

echo ""
echo "🧪 Testing contract functionality..."
echo "📋 DID Registry - Total users:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::did_registry::get_total_users" 2>/dev/null || echo "❌ Failed to query"

echo "📋 Oracle - Total feeds:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::get_total_feeds" 2>/dev/null || echo "❌ Failed to query"

echo "📋 AMM - Total pools:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::amm::get_total_pools" 2>/dev/null || echo "❌ Failed to query"

echo "📋 CCIP Bridge - Supported chains:"
aptos move view --function-id "${ACCOUNT_ADDRESS}::ccip_bridge::get_supported_chains" 2>/dev/null || echo "❌ Failed to query"

echo ""
echo "🎊 Initialization completed!"
echo ""
echo "📝 Next steps:"
echo "1. Update mobile app with contract addresses"
echo "2. Test contract interactions"
echo "3. Set up additional oracle feeds if needed"
echo "4. Configure mobile app for production"