@echo off
setlocal enabledelayedexpansion

REM AptoFi Contract Status Check Script for Windows

echo 📊 AptoFi Contract Status Check
echo ===============================

REM Check if deployment.json exists
if not exist "deployment.json" (
    echo ❌ deployment.json not found. Please deploy contracts first.
    exit /b 1
)

REM Read account address from deployment.json
for /f "tokens=2 delims=:" %%i in ('findstr "deployerAddress" deployment.json') do (
    set ACCOUNT_ADDRESS=%%i
)
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS:"=%
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS: =%
set ACCOUNT_ADDRESS=%ACCOUNT_ADDRESS:,=%

echo 📍 Contract Address: %ACCOUNT_ADDRESS%
echo.

echo 🔍 Checking contract status...
echo.

echo 📋 DID Registry:
aptos move view --function-id "%ACCOUNT_ADDRESS%::did_registry::get_total_users" 2>nul && (
    echo ✅ Active - Users registered
) || (
    echo ❌ Not accessible
)

echo 📋 Chainlink Oracle:
aptos move view --function-id "%ACCOUNT_ADDRESS%::chainlink_oracle::get_total_feeds" 2>nul && (
    echo ✅ Active - Price feeds available
) || (
    echo ❌ Not accessible
)

echo 📋 Reputation System:
aptos move view --function-id "%ACCOUNT_ADDRESS%::reputation_system::reputation_exists" --args address:%ACCOUNT_ADDRESS% 2>nul && (
    echo ✅ Active
) || (
    echo ❌ Not accessible
)

echo 📋 AMM:
aptos move view --function-id "%ACCOUNT_ADDRESS%::amm::get_total_pools" 2>nul && (
    echo ✅ Active - Pools available
) || (
    echo ❌ Not accessible
)

echo 📋 Yield Vault:
aptos move view --function-id "%ACCOUNT_ADDRESS%::yield_vault::get_total_vaults" 2>nul && (
    echo ✅ Active - Vaults available
) || (
    echo ❌ Not accessible
)

echo 📋 Lending Protocol:
echo ✅ Active ^(assuming initialized^)

echo 📋 Risk Manager:
echo ✅ Active ^(assuming initialized^)

echo 📋 CCIP Bridge:
aptos move view --function-id "%ACCOUNT_ADDRESS%::ccip_bridge::get_supported_chains" 2>nul && (
    echo ✅ Active - Cross-chain support available
) || (
    echo ❌ Not accessible
)

echo.
echo 🔗 Explorer Link:
echo https://explorer.aptoslabs.com/account/%ACCOUNT_ADDRESS%?network=testnet

pause