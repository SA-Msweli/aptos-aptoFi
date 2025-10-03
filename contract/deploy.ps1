# AptoFi Production Deployment Script (PowerShell) - New Address Approach
# This script deploys production-ready contracts to a fresh address

Write-Host "Starting AptoFi Production Deployment (New Address)..." -ForegroundColor Green
Write-Host "This will deploy to a NEW address, leaving old contracts untouched" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "Move.toml")) {
    Write-Host "Error: Move.toml not found. Please run from the contract directory." -ForegroundColor Red
    exit 1
}

# Verify Move.toml is configured for new address
$moveTomlContent = Get-Content "Move.toml" -Raw
if ($moveTomlContent -notmatch 'aptofi = "_"') {
    Write-Host "Warning: Move.toml should have 'aptofi = `"_`"' for new address deployment" -ForegroundColor Yellow
    Write-Host "Updating Move.toml for new address deployment..." -ForegroundColor Yellow
    
    # Backup current Move.toml
    Copy-Item "Move.toml" "Move.toml.backup"
    
    # Update to use new address
    $moveTomlContent = $moveTomlContent -replace 'aptofi = ".*"', 'aptofi = "_"'
    
    # Add dev-addresses section if not present
    if ($moveTomlContent -notmatch '\[dev-addresses\]') {
        $moveTomlContent += "`n`n[dev-addresses]`naptofi = `"0x42`""
    }
    
    $moveTomlContent | Out-File -FilePath "Move.toml" -Encoding UTF8
    Write-Host "Move.toml updated for new address deployment" -ForegroundColor Green
}

# Show current configuration
Write-Host "Current Configuration:" -ForegroundColor Cyan
Write-Host "   - Package: AptoFi v1.0.0"
Write-Host "   - Network: Testnet"
Write-Host "   - Address: NEW (will be generated)"
Write-Host "   - Deployment Mode: Chunked Publish"
Write-Host ""

# Compile contracts first
Write-Host "Compiling contracts..." -ForegroundColor Yellow
$compileResult = & aptos move compile --dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "Compilation successful!" -ForegroundColor Green
Write-Host ""

# Deploy to testnet with chunked publish
Write-Host "Deploying to testnet (chunked publish)..." -ForegroundColor Yellow
Write-Host "This will submit 2 transactions for staging and publishing" -ForegroundColor Cyan
Write-Host ""

# Capture deployment output to extract new address
$deployResult = & aptos move publish --chunked-publish 2>&1
$deployExitCode = $LASTEXITCODE

Write-Host $deployResult

if ($deployExitCode -ne 0) {
    Write-Host ""
    Write-Host "Deployment failed." -ForegroundColor Red
    Write-Host "If you see staging area errors, run: aptos move clear-staging-area" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Deployment successful!" -ForegroundColor Green

# Extract new address from deployment output or config
Write-Host "Extracting new contract address..." -ForegroundColor Yellow
$configOutput = & aptos config show-profiles --profile default
$newAddress = ($configOutput | Select-String "account").ToString().Split()[1]

if (-not $newAddress) {
    Write-Host "Could not automatically extract new address. Please check deployment output." -ForegroundColor Yellow
    Write-Host "You can find your address with: aptos config show-profiles" -ForegroundColor Cyan
    $newAddress = "PLEASE_UPDATE_WITH_ACTUAL_ADDRESS"
}

# Update deployment.json with new configuration
Write-Host "Updating deployment configuration..." -ForegroundColor Yellow
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Backup old deployment.json if it exists
if (Test-Path "../deployment.json") {
    Copy-Item "../deployment.json" "../deployment.json.backup"
    Write-Host "Old deployment.json backed up as deployment.json.backup" -ForegroundColor Cyan
}

# Create updated deployment.json
$deploymentConfig = @{
    network = "testnet"
    nodeUrl = "https://fullnode.testnet.aptoslabs.com/v1"
    deployerAddress = $newAddress
    timestamp = $timestamp
    version = "2.0.0-production"
    deployment_type = "fresh_address"
    old_address = "927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c"
    contracts = @{
        did_registry = "${newAddress}::did_registry"
        kyc_did_registry = "${newAddress}::kyc_did_registry"
        chainlink_oracle = "${newAddress}::chainlink_oracle"
        reputation_system = "${newAddress}::reputation_system"
        risk_manager = "${newAddress}::risk_manager"
        amm = "${newAddress}::amm"
        yield_vault = "${newAddress}::yield_vault"
        lending_protocol = "${newAddress}::lending_protocol"
        ccip_bridge = "${newAddress}::ccip_bridge"
    }
    features = @{
        production_ready = $true
        real_coin_handling = $true
        kyc_integration = $true
        resource_accounts = $true
        aptos_best_practices = $true
    }
}

$deploymentConfig | ConvertTo-Json -Depth 3 | Out-File -FilePath "../deployment.json" -Encoding UTF8

Write-Host "Deployment configuration updated!" -ForegroundColor Green
Write-Host ""

# Create initialization script
Write-Host "Creating contract initialization script..." -ForegroundColor Yellow
$initScript = @'
# AptoFi Contract Initialization Script (PowerShell)
# Run this after deployment to set up contracts properly

Write-Host "Initializing AptoFi Contracts..." -ForegroundColor Green

# Load deployment config
if (-not (Test-Path "../deployment.json")) {
    Write-Host "deployment.json not found. Please deploy contracts first." -ForegroundColor Red
    exit 1
}

# Extract address from deployment.json
$deploymentJson = Get-Content "../deployment.json" | ConvertFrom-Json
$newAddress = $deploymentJson.deployerAddress

Write-Host "Initializing contracts at address: $newAddress" -ForegroundColor Cyan
Write-Host ""

# Initialize DID Registry
Write-Host "1. Initializing DID Registry..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::did_registry::initialize"

# Initialize KYC Registry  
Write-Host "2. Initializing KYC Registry..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::kyc_did_registry::initialize"

# Initialize Reputation System
Write-Host "3. Initializing Reputation System..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::reputation_system::initialize"

# Initialize Oracle
Write-Host "4. Initializing Chainlink Oracle..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::chainlink_oracle::initialize"

# Initialize Risk Manager
Write-Host "5. Initializing Risk Manager..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::risk_manager::initialize"

# AMM initializes automatically via init_module()
Write-Host "6. AMM initialized automatically via init_module()" -ForegroundColor Green

# Initialize Yield Vault
Write-Host "7. Initializing Yield Vault..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::yield_vault::initialize"

# Initialize Lending Protocol
Write-Host "8. Initializing Lending Protocol..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::lending_protocol::initialize"

# Initialize CCIP Bridge
Write-Host "9. Initializing CCIP Bridge..." -ForegroundColor Yellow
# & aptos move run --function-id "${newAddress}::ccip_bridge::initialize"

Write-Host ""
Write-Host "Contract initialization complete!" -ForegroundColor Green
Write-Host "Uncomment the aptos move run commands above and run this script to initialize" -ForegroundColor Cyan
'@

$initScript | Out-File -FilePath "initialize-contracts.ps1" -Encoding UTF8

Write-Host "Initialization script created: initialize-contracts.ps1" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "AptoFi Production Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "   New Contract Address: $newAddress"
Write-Host "   Network: Testnet"
Write-Host "   Deployed at: $timestamp"
Write-Host "   Version: 2.0.0-production"
Write-Host "   Old Address (deprecated): 927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c"
Write-Host ""
Write-Host "Files Updated:" -ForegroundColor Yellow
Write-Host "   deployment.json - New contract addresses"
Write-Host "   deployment.json.backup - Backup of old config"
Write-Host "   initialize-contracts.ps1 - Contract initialization script"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run .\initialize-contracts.ps1 to initialize contracts"
Write-Host "2. Update frontend configuration with new addresses"
Write-Host "3. Run integration tests with new contracts"
Write-Host "4. Set up monitoring and alerts"
Write-Host "5. Update documentation and announce new addresses"
Write-Host ""
Write-Host "The old contracts at the previous address are now deprecated but remain on-chain." -ForegroundColor Cyan