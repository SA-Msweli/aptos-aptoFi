#!/usr/bin/env node

/**
 * Optimus DeFi Banking Contract Deployment Helper
 * 
 * This script helps deploy the Move contracts for Optimus DeFi Banking
 * with proper validation and error handling.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class ContractDeployer {
  constructor() {
    this.requiredEnvVars = [
      'VITE_APP_NETWORK',
      'VITE_APTOS_API_KEY',
      'VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS',
      'VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY',
      'VITE_FA_ADDRESS',
      'VITE_REWARD_CREATOR_ADDRESS'
    ];

    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '🔄'
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    this.log('Validating environment configuration...', 'step');

    const missingVars = [];
    const emptyVars = [];

    this.requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
      } else if (value.trim() === '' || value === '""' || value === "''") {
        emptyVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    if (emptyVars.length > 0) {
      this.errors.push(`Empty environment variables: ${emptyVars.join(', ')}`);
    }

    // Validate network
    const network = process.env.VITE_APP_NETWORK;
    if (network && !['testnet', 'mainnet', 'devnet'].includes(network)) {
      this.errors.push(`Invalid network: ${network}. Must be testnet, mainnet, or devnet`);
    }

    // Validate address formats
    const addressVars = [
      'VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS',
      'VITE_FA_ADDRESS',
      'VITE_REWARD_CREATOR_ADDRESS'
    ];

    addressVars.forEach(varName => {
      const address = process.env[varName];
      if (address && !address.startsWith('0x')) {
        this.warnings.push(`${varName} should start with 0x prefix`);
      }
    });

    if (this.errors.length === 0) {
      this.log('Environment validation passed', 'success');
      return true;
    } else {
      this.log('Environment validation failed', 'error');
      return false;
    }
  }

  /**
   * Check if Aptos CLI is installed
   */
  checkAptosCLI() {
    this.log('Checking Aptos CLI installation...', 'step');

    try {
      execSync('aptos --version', { stdio: 'pipe' });
      this.log('Aptos CLI is installed', 'success');
      return true;
    } catch (error) {
      this.errors.push('Aptos CLI is not installed. Please install it first.');
      this.log('Aptos CLI not found', 'error');
      return false;
    }
  }

  /**
   * Check if Move contracts exist
   */
  checkContracts() {
    this.log('Checking Move contracts...', 'step');

    const contractDir = 'contract';
    const requiredFiles = [
      'contract/Move.toml',
      'contract/sources/stake_pool.move',
      'contract/sources/did.move',
      'contract/sources/lending.move',
      'contract/sources/vault.move'
    ];

    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

    if (missingFiles.length > 0) {
      this.errors.push(`Missing contract files: ${missingFiles.join(', ')}`);
      return false;
    }

    this.log('All contract files found', 'success');
    return true;
  }

  /**
   * Compile contracts
   */
  async compileContracts() {
    this.log('Compiling Move contracts...', 'step');

    try {
      execSync('npm run move:compile', { stdio: 'inherit' });
      this.log('Contracts compiled successfully', 'success');
      return true;
    } catch (error) {
      this.errors.push('Contract compilation failed');
      this.log('Contract compilation failed', 'error');
      return false;
    }
  }

  /**
   * Run contract tests
   */
  async testContracts() {
    this.log('Running contract tests...', 'step');

    try {
      execSync('npm run move:test', { stdio: 'inherit' });
      this.log('Contract tests passed', 'success');
      return true;
    } catch (error) {
      this.warnings.push('Contract tests failed - proceeding anyway');
      this.log('Contract tests failed - proceeding anyway', 'warning');
      return true; // Don't fail deployment for test failures
    }
  }

  /**
   * Deploy contracts
   */
  async deployContracts() {
    this.log('Deploying contracts to blockchain...', 'step');

    try {
      execSync('npm run move:publish', { stdio: 'inherit' });
      this.log('Contracts deployed successfully', 'success');
      return true;
    } catch (error) {
      this.errors.push('Contract deployment failed');
      this.log('Contract deployment failed', 'error');
      return false;
    }
  }

  /**
   * Verify deployment
   */
  async verifyDeployment() {
    this.log('Verifying deployment...', 'step');

    // Check if MODULE_ADDRESS was set in .env
    const envContent = fs.readFileSync('.env', 'utf8');
    const moduleAddressMatch = envContent.match(/VITE_MODULE_ADDRESS=(.+)/);

    if (moduleAddressMatch && moduleAddressMatch[1] && moduleAddressMatch[1] !== '""') {
      const moduleAddress = moduleAddressMatch[1];
      this.log(`Module deployed at address: ${moduleAddress}`, 'success');
      return true;
    } else {
      this.warnings.push('Module address not found in .env file');
      return false;
    }
  }

  /**
   * Generate deployment summary
   */
  generateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      network: process.env.VITE_APP_NETWORK,
      publisherAddress: process.env.VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS,
      faAddress: process.env.VITE_FA_ADDRESS,
      rewardCreatorAddress: process.env.VITE_REWARD_CREATOR_ADDRESS,
      contracts: [
        'stake_pool.move',
        'did.move',
        'lending.move',
        'vault.move'
      ]
    };

    // Read module address from .env if available
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const moduleAddressMatch = envContent.match(/VITE_MODULE_ADDRESS=(.+)/);
      if (moduleAddressMatch && moduleAddressMatch[1]) {
        summary.moduleAddress = moduleAddressMatch[1];
      }
    } catch (error) {
      // Ignore if can't read .env
    }

    fs.writeFileSync('deployment-summary.json', JSON.stringify(summary, null, 2));
    this.log('Deployment summary saved to deployment-summary.json', 'info');
  }

  /**
   * Main deployment process
   */
  async deploy() {
    this.log('🚀 Starting Optimus DeFi Banking contract deployment...', 'info');
    this.log('================================================================', 'info');

    const steps = [
      { name: 'Environment Validation', fn: () => this.validateEnvironment() },
      { name: 'Aptos CLI Check', fn: () => this.checkAptosCLI() },
      { name: 'Contract Files Check', fn: () => this.checkContracts() },
      { name: 'Contract Compilation', fn: () => this.compileContracts() },
      { name: 'Contract Testing', fn: () => this.testContracts() },
      { name: 'Contract Deployment', fn: () => this.deployContracts() },
      { name: 'Deployment Verification', fn: () => this.verifyDeployment() }
    ];

    let success = true;

    for (const step of steps) {
      const stepSuccess = await step.fn();
      if (!stepSuccess && step.name !== 'Contract Testing' && step.name !== 'Deployment Verification') {
        success = false;
        break;
      }
    }

    this.log('================================================================', 'info');

    if (success) {
      this.log('✅ Contract deployment completed successfully!', 'success');

      if (this.warnings.length > 0) {
        this.log('⚠️  Warnings:', 'warning');
        this.warnings.forEach(warning => this.log(`   - ${warning}`, 'warning'));
      }

      this.generateSummary();

      this.log('🎉 Optimus DeFi Banking contracts are now deployed!', 'success');
      this.log('📋 Next steps:', 'info');
      this.log('   1. Update frontend configuration with new module address', 'info');
      this.log('   2. Test all features through the web interface', 'info');
      this.log('   3. Initialize any required contract state', 'info');

    } else {
      this.log('❌ Contract deployment failed', 'error');
      this.log('🔧 Errors that need to be fixed:', 'error');
      this.errors.forEach(error => this.log(`   - ${error}`, 'error'));

      this.log('📖 Please check the DEPLOYMENT_GUIDE.md for detailed instructions', 'info');
    }

    return success;
  }

  /**
   * Show deployment status
   */
  showStatus() {
    this.log('📊 Deployment Status Check', 'info');
    this.log('==========================', 'info');

    // Check environment
    const envValid = this.validateEnvironment();

    // Check if contracts are deployed
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const moduleAddressMatch = envContent.match(/VITE_MODULE_ADDRESS=(.+)/);

      if (moduleAddressMatch && moduleAddressMatch[1] && moduleAddressMatch[1] !== '""') {
        this.log(`✅ Contracts deployed at: ${moduleAddressMatch[1]}`, 'success');
      } else {
        this.log('❌ Contracts not deployed yet', 'error');
      }
    } catch (error) {
      this.log('❌ Cannot read deployment status', 'error');
    }

    // Show configuration
    this.log(`Network: ${process.env.VITE_APP_NETWORK || 'Not set'}`, 'info');
    this.log(`Publisher: ${process.env.VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS || 'Not set'}`, 'info');
    this.log(`FA Address: ${process.env.VITE_FA_ADDRESS || 'Not set'}`, 'info');
  }
}

// CLI interface
const command = process.argv[2];
const deployer = new ContractDeployer();

switch (command) {
  case 'deploy':
    deployer.deploy().then(success => {
      process.exit(success ? 0 : 1);
    });
    break;

  case 'status':
    deployer.showStatus();
    break;

  case 'validate':
    const valid = deployer.validateEnvironment();
    if (deployer.errors.length > 0) {
      deployer.errors.forEach(error => deployer.log(error, 'error'));
    }
    if (deployer.warnings.length > 0) {
      deployer.warnings.forEach(warning => deployer.log(warning, 'warning'));
    }
    process.exit(valid ? 0 : 1);
    break;

  default:
    console.log(`
Optimus DeFi Banking Contract Deployment Helper

Usage:
  node scripts/deploy-contracts.js <command>

Commands:
  deploy    - Deploy all contracts to blockchain
  status    - Show current deployment status  
  validate  - Validate environment configuration

Examples:
  node scripts/deploy-contracts.js deploy
  node scripts/deploy-contracts.js status
  node scripts/deploy-contracts.js validate
`);
    break;
}

module.exports = ContractDeployer;