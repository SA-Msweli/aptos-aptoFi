@echo off
setlocal enabledelayedexpansion

REM AptoFi Contract Initialization Script for Windows
REM This script initializes contracts that are already deployed

echo 🔧 AptoFi Contract Initialization
echo =================================

REM Check if Aptos CLI is installed
aptos --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Aptos CLI not found. Please install it first.
    exit /b 1
)

REM Check if deployment.json exists
if not exist "deployment.json" (
    echo ❌ deployment.json not found. Please deploy contracts first.
    exit /b 1
)

REM Read account address from deployment.json (simplified)
for /f "tokens=2 delims=:" %%i in ('findstr "deployerAddress" deployment.json') do (
    set ACCOUNT_ADDRESS=%%i
)
REM Clean up the address (remove quotes, spaces, and comma)
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS:"=%
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS: =%
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS:,=%

echo 📍 Using account: %ACCOUNT_ADDRESS%

echo.
echo ⚙️  Initializing contracts...

echo 🔧 Initializing did_registry...
aptos move run --function-id "%ACCOUNT_ADDRESS%::did_registry::initialize" 2>nul && (
    echo ✅ did_registry initialized successfully
) || (
    echo ℹ️  did_registry already initialized or initialization not needed
)

echo 🔧 Initializing chainlink_oracle...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::initialize" 2>nul && (
    echo ✅ chainlink_oracle initialized successfully
) || (
    echo ℹ️  chainlink_oracle already initialized or initialization not needed
)

echo 🔧 Initializing reputation_system...
aptos move run --function-id "%ACCOUNT_ADDRESS%::reputation_system::initialize" 2>nul && (
    echo ✅ reputation_system initialized successfully
) || (
    echo ℹ️  reputation_system already initialized or initialization not needed
)

echo 🔧 Initializing risk_manager...
aptos move run --function-id "%ACCOUNT_ADDRESS%::risk_manager::initialize" 2>nul && (
    echo ✅ risk_manager initialized successfully
) || (
    echo ℹ️  risk_manager already initialized or initialization not needed
)

echo 🔧 Initializing amm...
aptos move run --function-id "%ACCOUNT_ADDRESS%::amm::initialize" 2>nul && (
    echo ✅ amm initialized successfully
) || (
    echo ℹ️  amm already initialized or initialization not needed
)

echo 🔧 Initializing yield_vault...
aptos move run --function-id "%ACCOUNT_ADDRESS%::yield_vault::initialize" 2>nul && (
    echo ✅ yield_vault initialized successfully
) || (
    echo ℹ️  yield_vault already initialized or initialization not needed
)

echo 🔧 Initializing lending_protocol...
aptos move run --function-id "%ACCOUNT_ADDRESS%::lending_protocol::initialize" 2>nul && (
    echo ✅ lending_protocol initialized successfully
) || (
    echo ℹ️  lending_protocol already initialized or initialization not needed
)

echo 🔧 Initializing ccip_bridge...
aptos move run --function-id "%ACCOUNT_ADDRESS%::ccip_bridge::initialize" 2>nul && (
    echo ✅ ccip_bridge initialized successfully
) || (
    echo ℹ️  ccip_bridge already initialized or initialization not needed
)

echo.
echo 🔧 Setting up oracle price feeds...
echo 📊 Adding APT price feed ($10.00)...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::register_price_feed" --args string:APT u64:1000000000 u8:8 2>nul && (
    echo ✅ APT price feed registered successfully
) || (
    echo ℹ️  APT price feed already exists
)

echo 📊 Adding USDC price feed ($1.00)...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::register_price_feed" --args string:USDC u64:100000000 u8:8 2>nul && (
    echo ✅ USDC price feed registered successfully
) || (
    echo ℹ️  USDC price feed already exists
)

echo.
echo 🧪 Testing contract functionality...
echo 📋 DID Registry - Total users:
aptos move view --function-id "%ACCOUNT_ADDRESS%::did_registry::get_total_users" 2>nul || echo "❌ Failed to query"

echo 📋 Oracle - Total feeds:
aptos move view --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::get_total_feeds" 2>nul || echo "❌ Failed to query"

echo 📋 AMM - Total pools:
aptos move view --function-id "%ACCOUNT_ADDRESS%::amm::get_total_pools" 2>nul || echo "❌ Failed to query"

echo 📋 CCIP Bridge - Supported chains:
aptos move view --function-id "%ACCOUNT_ADDRESS%::ccip_bridge::get_supported_chains" 2>nul || echo "❌ Failed to query"

echo.
echo 🎊 Initialization completed!
echo.
echo 📝 Next steps:
echo 1. Update mobile app with contract addresses
echo 2. Test contract interactions
echo 3. Set up additional oracle feeds if needed
echo 4. Configure mobile app for production

pause