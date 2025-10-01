# AptoFi Deployment Scripts

This directory contains scripts for deploying and managing AptoFi smart contracts on the Aptos blockchain.

## Scripts Overview

### 🚀 Deployment Scripts

#### `deploy.bat` / `deploy.sh`
Complete deployment script that:
- Compiles all contracts
- Publishes contracts to the blockchain
- Initializes all contracts properly
- Sets up oracle price feeds
- Tests contract functionality
- Saves deployment information

**Usage:**
```bash
# Windows
scripts\deploy.bat

# Linux/Mac
./scripts/deploy.sh
```

### 🔧 Initialization Scripts

#### `initialize.bat` / `initialize.sh`
Initializes already deployed contracts:
- Initializes all contract modules
- Sets up oracle price feeds (APT, USDC)
- Tests contract functionality
- Handles already-initialized contracts gracefully

**Usage:**
```bash
# Windows
scripts\initialize.bat

# Linux/Mac
./scripts/initialize.sh
```

### 📊 Status Check Scripts

#### `status.bat` / `status.sh`
Checks the status of deployed contracts:
- Verifies contract accessibility
- Shows current contract state
- Provides explorer links

**Usage:**
```bash
# Windows
scripts\status.bat

# Linux/Mac
./scripts/status.sh
```

## Prerequisites

1. **Aptos CLI** installed and configured
2. **Funded account** on the target network
3. **Project structure** with contracts in `contracts/` directory

## Deployment Process

### First Time Deployment

1. Run the deployment script:
   ```bash
   scripts\deploy.bat  # Windows
   ./scripts/deploy.sh # Linux/Mac
   ```

2. Select your target network (devnet/testnet/mainnet)

3. The script will:
   - Initialize Aptos configuration
   - Fund your account (if not mainnet)
   - Compile and publish contracts
   - Initialize all contracts
   - Set up price feeds
   - Test functionality

### Re-deployment or Updates

If you've updated contracts and need to redeploy:

1. Run the deployment script again
2. It will update existing contracts
3. Run initialization script if needed:
   ```bash
   scripts\initialize.bat  # Windows
   ./scripts/initialize.sh # Linux/Mac
   ```

### Status Monitoring

Check contract status anytime:
```bash
scripts\status.bat  # Windows
./scripts/status.sh # Linux/Mac
```

## Contract Initialization Details

The scripts initialize the following contracts in order:

1. **DID Registry** - Identity management system
2. **Chainlink Oracle** - Price feed system
3. **Reputation System** - User reputation tracking
4. **Risk Manager** - Risk assessment and management
5. **AMM** - Automated Market Maker
6. **Yield Vault** - Yield farming system
7. **Lending Protocol** - Lending and borrowing
8. **CCIP Bridge** - Cross-chain functionality

## Oracle Price Feeds

The scripts automatically set up these price feeds:
- **APT**: $10.00 (1000000000 with 8 decimals)
- **USDC**: $1.00 (100000000 with 8 decimals)

## Error Handling

The scripts handle common scenarios:
- ✅ **Already initialized contracts** - Gracefully skips
- ✅ **Existing price feeds** - Doesn't overwrite
- ✅ **Network connectivity issues** - Shows clear error messages
- ✅ **Insufficient funds** - Provides funding instructions

## Output Files

### `deployment.json`
Contains deployment information:
```json
{
  "network": "testnet",
  "nodeUrl": "https://fullnode.testnet.aptoslabs.com/v1",
  "deployerAddress": "0x...",
  "timestamp": "2025-01-02T00:36:55Z",
  "contracts": {
    "did_registry": "0x...::did_registry",
    "chainlink_oracle": "0x...::chainlink_oracle",
    // ... other contracts
  }
}
```

## Troubleshooting

### Common Issues

1. **"Aptos CLI not found"**
   - Install Aptos CLI: `curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3`

2. **"Insufficient funds"**
   - Visit the faucet: https://aptos.dev/network/faucet
   - Or fund manually for mainnet

3. **"Already initialized" errors**
   - This is normal for re-runs
   - Contracts are already set up correctly

4. **"Failed to query" in status check**
   - Contract might not be initialized
   - Run initialization script

### Getting Help

1. Check contract status: `scripts\status.bat`
2. View on explorer: Use the provided explorer links
3. Test individual functions using Aptos CLI
4. Check deployment.json for contract addresses

## Network Configuration

### Testnet (Recommended for development)
- Node: https://fullnode.testnet.aptoslabs.com/v1
- Faucet: https://aptos.dev/network/faucet
- Explorer: https://explorer.aptoslabs.com/?network=testnet

### Mainnet (Production)
- Node: https://fullnode.mainnet.aptoslabs.com/v1
- No faucet (real APT required)
- Explorer: https://explorer.aptoslabs.com/?network=mainnet

## Security Notes

- 🔒 **Private keys** are managed by Aptos CLI
- 🔒 **Admin functions** are restricted to deployer address
- 🔒 **Test thoroughly** on testnet before mainnet deployment
- 🔒 **Backup** your deployment.json file

## Next Steps After Deployment

1. **Update mobile app** with contract addresses from deployment.json
2. **Test contract interactions** using the mobile app
3. **Set up monitoring** for contract health
4. **Configure additional** oracle feeds if needed
5. **Deploy to mainnet** when ready for production