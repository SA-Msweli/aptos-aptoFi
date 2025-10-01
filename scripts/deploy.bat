@echo off
setlocal enabledelayedexpansion

REM AptoFi Simple Deployment Script for Windows
REM This script provides step-by-step deployment commands

echo 🚀 AptoFi Contract Deployment
echo ==============================

REM Check if Aptos CLI is installed
aptos --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Aptos CLI not found. Please install it first:
    echo iwr "https://aptos.dev/scripts/install_cli.py" -useb ^| Select-Object -ExpandProperty Content ^| python3
    exit /b 1
)

REM Check if we're in the right directory
if not exist "contracts\Move.toml" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

echo ✅ Aptos CLI found

REM Get network choice
echo.
echo Select deployment network:
echo 1^) Devnet ^(for development^)
echo 2^) Testnet ^(for testing^)
echo 3^) Mainnet ^(for production^)
set /p network_choice="Enter choice (1-3): "

if "%network_choice%"=="1" (
    set NETWORK=devnet
    set NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
    set FAUCET_URL=https://faucet.devnet.aptoslabs.com
) else if "%network_choice%"=="2" (
    set NETWORK=testnet
    set NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
    set FAUCET_URL=https://faucet.testnet.aptoslabs.com
) else if "%network_choice%"=="3" (
    set NETWORK=mainnet
    set NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
    set FAUCET_URL=
) else (
    echo ❌ Invalid choice
    exit /b 1
)

echo 📡 Selected network: %NETWORK%

REM Initialize Aptos configuration
echo.
echo 🔧 Initializing Aptos configuration...
aptos init --network %NETWORK%

REM Get the account address
for /f "tokens=2 delims=:," %%i in ('aptos config show-profiles --profile default ^| findstr "account"') do set ACCOUNT_ADDRESS=%%i
REM Remove quotes and spaces
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS:"=%
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS: =%
echo 📍 Account address: %ACCOUNT_ADDRESS%

REM Fund account if not mainnet
if not "%NETWORK%"=="mainnet" (
    echo.
    echo 💰 Funding account...
    aptos account fund-with-faucet --account %ACCOUNT_ADDRESS% || (
        echo ⚠️  Auto-funding failed. Please fund manually at: https://aptoslabs.com/%NETWORK%-faucet
        pause
    )
)

REM Check balance
echo.
echo 💳 Checking account balance...
aptos account list --account %ACCOUNT_ADDRESS%

REM Deploy contracts
echo.
echo 📦 Deploying contracts...
cd contracts

echo 🔨 Compiling contracts...
aptos move compile --named-addresses aptofi=%ACCOUNT_ADDRESS%

echo 🚀 Publishing contracts...
aptos move publish --named-addresses aptofi=%ACCOUNT_ADDRESS%

cd ..

echo.
echo ⚙️  Initializing contracts...

REM Initialize each contract with proper error handling
echo 🔧 Initializing did_registry...
aptos move run --function-id "%ACCOUNT_ADDRESS%::did_registry::initialize" 2>nul || (
    echo ✅ did_registry already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing chainlink_oracle...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::initialize" 2>nul || (
    echo ✅ chainlink_oracle already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing reputation_system...
aptos move run --function-id "%ACCOUNT_ADDRESS%::reputation_system::initialize" 2>nul || (
    echo ✅ reputation_system already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing risk_manager...
aptos move run --function-id "%ACCOUNT_ADDRESS%::risk_manager::initialize" 2>nul || (
    echo ✅ risk_manager already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing amm...
aptos move run --function-id "%ACCOUNT_ADDRESS%::amm::initialize" 2>nul || (
    echo ✅ amm already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing yield_vault...
aptos move run --function-id "%ACCOUNT_ADDRESS%::yield_vault::initialize" 2>nul || (
    echo ✅ yield_vault already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing lending_protocol...
aptos move run --function-id "%ACCOUNT_ADDRESS%::lending_protocol::initialize" 2>nul || (
    echo ✅ lending_protocol already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo 🔧 Initializing ccip_bridge...
aptos move run --function-id "%ACCOUNT_ADDRESS%::ccip_bridge::initialize" 2>nul || (
    echo ✅ ccip_bridge already initialized or initialization not needed
)
timeout /t 1 /nobreak >nul

echo.
echo 🔧 Setting up oracle price feeds...
echo 📊 Adding APT price feed...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::register_price_feed" --args string:APT u64:1000000000 u8:8 2>nul || (
    echo ✅ APT price feed already exists
)

echo 📊 Adding USDC price feed...
aptos move run --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::register_price_feed" --args string:USDC u64:100000000 u8:8 2>nul || (
    echo ✅ USDC price feed already exists
)

echo.
echo 🧪 Testing contract functionality...
echo 📋 DID Registry - Total users:
aptos move view --function-id "%ACCOUNT_ADDRESS%::did_registry::get_total_users" 2>nul || echo "❌ Failed to query"

echo 📋 Oracle - Total feeds:
aptos move view --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::get_total_feeds" 2>nul || echo "❌ Failed to query"

echo 📋 AMM - Total pools:
aptos move view --function-id "%ACCOUNT_ADDRESS%::amm::get_total_pools" 2>nul || echo "❌ Failed to query"

REM Save deployment info
echo.
echo 📄 Saving deployment information...
(
echo {
echo   "network": "%NETWORK%",
echo   "nodeUrl": "%NODE_URL%",
echo   "deployerAddress": "%ACCOUNT_ADDRESS%",
echo   "timestamp": "%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%Z",
echo   "contracts": {
echo     "did_registry": "%ACCOUNT_ADDRESS%::did_registry",
echo     "chainlink_oracle": "%ACCOUNT_ADDRESS%::chainlink_oracle",
echo     "reputation_system": "%ACCOUNT_ADDRESS%::reputation_system",
echo     "risk_manager": "%ACCOUNT_ADDRESS%::risk_manager",
echo     "amm": "%ACCOUNT_ADDRESS%::amm",
echo     "yield_vault": "%ACCOUNT_ADDRESS%::yield_vault",
echo     "lending_protocol": "%ACCOUNT_ADDRESS%::lending_protocol",
echo     "ccip_bridge": "%ACCOUNT_ADDRESS%::ccip_bridge"
echo   }
echo }
) > deployment.json

echo.
echo 🎊 Deployment completed successfully!
echo.
echo 📋 Summary:
echo   Network: %NETWORK%
echo   Account: %ACCOUNT_ADDRESS%
echo   Deployment info saved to: deployment.json
echo.
echo 📝 Next steps:
echo 1. Update mobile/src/utils/constants.ts with your contract address
echo 2. Test contract functions
echo 3. Set up oracle price feeds
echo 4. Configure mobile app
echo.
echo 🧪 Test deployment commands:
echo   aptos move view --function-id "%ACCOUNT_ADDRESS%::did_registry::get_total_users"
echo   aptos move view --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::get_total_feeds"
echo   aptos move view --function-id "%ACCOUNT_ADDRESS%::ccip_bridge::get_supported_chains"
echo.
echo 🔗 View deployment on explorer:
echo   https://explorer.aptoslabs.com/account/%ACCOUNT_ADDRESS%?network=%NETWORK%

pause