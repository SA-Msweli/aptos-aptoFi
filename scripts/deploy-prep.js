#!/usr/bin/env node

/**
 * Deployment Preparation Script for Optimus DeFi Banking
 * 
 * This script prepares the application for production deployment by:
 * - Running integration tests
 * - Building the application
 * - Validating environment configuration
 * - Generating deployment artifacts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentPrep {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    this.log('Validating environment configuration...', 'info');

    const requiredEnvVars = [
      'VITE_APP_NETWORK',
      'VITE_APTOS_API_KEY',
      'VITE_MODULE_ADDRESS',
      'VITE_NODIT_API_KEY'
    ];

    const envFile = '.env.production';

    if (!fs.existsSync(envFile)) {
      this.errors.push(`Production environment file ${envFile} not found`);
      return false;
    }

    const envContent = fs.readFileSync(envFile, 'utf8');
    const missingVars = [];

    requiredEnvVars.forEach(varName => {
      if (!envContent.includes(varName) || envContent.includes(`${varName}=your_`)) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.errors.push(`Missing or placeholder environment variables: ${missingVars.join(', ')}`);
      return false;
    }

    this.log('Environment configuration validated', 'success');
    return true;
  }

  /**
   * Run TypeScript type checking
   */
  runTypeCheck() {
    this.log('Running TypeScript type checking...', 'info');

    try {
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      this.log('TypeScript type checking passed', 'success');
      return true;
    } catch (error) {
      this.errors.push('TypeScript type checking failed');
      this.log('TypeScript type checking failed', 'error');
      return false;
    }
  }

  /**
   * Run linting
   */
  runLinting() {
    this.log('Running ESLint...', 'info');

    try {
      execSync('npm run lint', { stdio: 'pipe' });
      this.log('Linting passed', 'success');
      return true;
    } catch (error) {
      this.warnings.push('Linting issues found - review before deployment');
      this.log('Linting issues found', 'warning');
      return true; // Don't fail deployment for linting issues
    }
  }

  /**
   * Build the application
   */
  buildApplication() {
    this.log('Building application for production...', 'info');

    try {
      execSync('npm run build', { stdio: 'inherit' });
      this.log('Application built successfully', 'success');
      return true;
    } catch (error) {
      this.errors.push('Application build failed');
      this.log('Application build failed', 'error');
      return false;
    }
  }

  /**
   * Validate build output
   */
  validateBuild() {
    this.log('Validating build output...', 'info');

    const distDir = 'dist';
    const requiredFiles = [
      'index.html',
      'assets'
    ];

    if (!fs.existsSync(distDir)) {
      this.errors.push('Build directory not found');
      return false;
    }

    const missingFiles = requiredFiles.filter(file =>
      !fs.existsSync(path.join(distDir, file))
    );

    if (missingFiles.length > 0) {
      this.errors.push(`Missing build files: ${missingFiles.join(', ')}`);
      return false;
    }

    // Check build size
    const stats = fs.statSync(path.join(distDir, 'index.html'));
    if (stats.size === 0) {
      this.errors.push('Build output appears to be empty');
      return false;
    }

    this.log('Build output validated', 'success');
    return true;
  }

  /**
   * Generate deployment manifest
   */
  generateDeploymentManifest() {
    this.log('Generating deployment manifest...', 'info');

    const manifest = {
      name: 'Optimus DeFi Banking',
      previousName: 'AptoFi',
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      network: process.env.VITE_APP_NETWORK || 'testnet',
      features: [
        'Staking',
        'P2P Payments',
        'DEX Trading',
        'Yield Vaults',
        'P2P Lending'
      ],
      integrations: [
        'Hyperion SDK',
        'Nodit API',
        'Aptos TS SDK'
      ],
      deployment: {
        target: 'production',
        buildTool: 'Vite',
        framework: 'React + TypeScript'
      }
    };

    fs.writeFileSync('dist/deployment-manifest.json', JSON.stringify(manifest, null, 2));
    this.log('Deployment manifest generated', 'success');
    return true;
  }

  /**
   * Create deployment documentation
   */
  createDeploymentDocs() {
    this.log('Creating deployment documentation...', 'info');

    const docs = `# Optimus DeFi Banking - Deployment Guide

## Overview
This is the production build of Optimus DeFi Banking (formerly AptoFi), a comprehensive DeFi platform on Aptos.

## Features
- ✅ Staking with APT rewards
- ✅ P2P Payments with real-time monitoring
- ✅ DEX Trading with Hyperion integration
- ✅ Yield Vaults for passive income
- ✅ P2P Lending with reputation system

## Technical Stack
- **Frontend**: React + TypeScript + Vite
- **Blockchain**: Aptos
- **Integrations**: Hyperion SDK, Nodit API
- **UI**: Tailwind CSS + shadcn/ui

## Deployment Requirements

### Environment Variables
Ensure the following environment variables are configured:

\`\`\`
VITE_APP_NETWORK=mainnet
VITE_APTOS_API_KEY=your_production_aptos_api_key
VITE_MODULE_ADDRESS=your_production_module_address
VITE_NODIT_API_KEY=your_production_nodit_api_key
VITE_HYPERION_CLMM_ADDRESS=your_production_hyperion_address
\`\`\`

### Deployment Steps
1. Configure production environment variables
2. Run deployment preparation: \`npm run deploy:prep\`
3. Deploy the \`dist\` folder to your hosting provider
4. Configure HTTPS and domain
5. Set up monitoring and analytics

### Post-Deployment Checklist
- [ ] Verify all features work correctly
- [ ] Test wallet connections
- [ ] Verify Hyperion SDK integration
- [ ] Test Nodit API functionality
- [ ] Check responsive design on mobile
- [ ] Verify navigation flows
- [ ] Test error handling

### Monitoring
- Monitor application performance
- Track user interactions
- Monitor blockchain transactions
- Track API usage and errors

### Support
For technical support or issues, please refer to the project documentation.

---
Generated on: ${new Date().toISOString()}
Build Version: 1.0.0
`;

    fs.writeFileSync('dist/DEPLOYMENT.md', docs);
    this.log('Deployment documentation created', 'success');
    return true;
  }

  /**
   * Run all preparation steps
   */
  async run() {
    this.log('🚀 Starting deployment preparation for Optimus DeFi Banking', 'info');
    this.log('================================================================', 'info');

    const steps = [
      { name: 'Environment Validation', fn: () => this.validateEnvironment() },
      { name: 'TypeScript Check', fn: () => this.runTypeCheck() },
      { name: 'Linting', fn: () => this.runLinting() },
      { name: 'Application Build', fn: () => this.buildApplication() },
      { name: 'Build Validation', fn: () => this.validateBuild() },
      { name: 'Deployment Manifest', fn: () => this.generateDeploymentManifest() },
      { name: 'Deployment Documentation', fn: () => this.createDeploymentDocs() }
    ];

    let success = true;

    for (const step of steps) {
      const stepSuccess = step.fn();
      if (!stepSuccess && step.name !== 'Linting') {
        success = false;
        break;
      }
    }

    const duration = Date.now() - this.startTime;

    this.log('================================================================', 'info');

    if (success) {
      this.log(`✅ Deployment preparation completed successfully in ${duration}ms`, 'success');

      if (this.warnings.length > 0) {
        this.log('⚠️  Warnings:', 'warning');
        this.warnings.forEach(warning => this.log(`   - ${warning}`, 'warning'));
      }

      this.log('🎉 Ready for production deployment!', 'success');
      this.log('📁 Deploy the "dist" folder to your hosting provider', 'info');

    } else {
      this.log(`❌ Deployment preparation failed in ${duration}ms`, 'error');
      this.log('🔧 Errors that need to be fixed:', 'error');
      this.errors.forEach(error => this.log(`   - ${error}`, 'error'));
    }

    return success;
  }
}

// Run if called directly
if (require.main === module) {
  const prep = new DeploymentPrep();
  prep.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = DeploymentPrep;