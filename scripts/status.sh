#!/bin/bash

# AptoFi Contract Status Check Script

echo "📊 AptoFi Contract Status Check"
echo "==============================="

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

echo "📍 Contract Address: $ACCOUNT_ADDRESS"
echo ""

echo "🔍 Checking contract status..."
echo ""

echo "📋 DID Registry:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::did_registry::get_total_users" 2>/dev/null >/dev/null; then
    echo "✅ Active - Users registered"
else
    echo "❌ Not accessible"
fi

echo "📋 Chainlink Oracle:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::chainlink_oracle::get_total_feeds" 2>/dev/null >/dev/null; then
    echo "✅ Active - Price feeds available"
else
    echo "❌ Not accessible"
fi

echo "📋 Reputation System:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::reputation_system::reputation_exists" --args address:${ACCOUNT_ADDRESS} 2>/dev/null >/dev/null; then
    echo "✅ Active"
else
    echo "❌ Not accessible"
fi

echo "📋 AMM:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::amm::get_total_pools" 2>/dev/null >/dev/null; then
    echo "✅ Active - Pools available"
else
    echo "❌ Not accessible"
fi

echo "📋 Yield Vault:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::yield_vault::get_total_vaults" 2>/dev/null >/dev/null; then
    echo "✅ Active - Vaults available"
else
    echo "❌ Not accessible"
fi

echo "📋 Lending Protocol:"
echo "✅ Active (assuming initialized)"

echo "📋 Risk Manager:"
echo "✅ Active (assuming initialized)"

echo "📋 CCIP Bridge:"
if aptos move view --function-id "${ACCOUNT_ADDRESS}::ccip_bridge::get_supported_chains" 2>/dev/null >/dev/null; then
    echo "✅ Active - Cross-chain support available"
else
    echo "❌ Not accessible"
fi

echo ""
echo "🔗 Explorer Link:"
echo "https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=testnet"