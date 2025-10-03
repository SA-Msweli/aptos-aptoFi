#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

/**
 * Prepare build script - runs before Next.js build
 * This script prepares deployment configuration and validates environment
 */

console.log('🔧 Preparing build environment...');

// Ensure public directories exist
const publicDirs = [
  'public/deployment',
  'public/config',
  'public/assets'
];

publicDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Validate required files exist
const requiredFiles = [
  'deployment.json',
  '.env.local'
];

let hasErrors = false;

requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Required file missing: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found required file: ${file}`);
  }
});

// Validate deployment.json structure
try {
  const deploymentContent = fs.readFileSync('deployment.json', 'utf8');
  // Remove BOM and other potential encoding issues
  const cleanContent = deploymentContent.replace(/^\uFEFF/, '').trim();
  const deploymentConfig = JSON.parse(cleanContent);

  const requiredFields = ['network', 'nodeUrl', 'deployerAddress', 'contracts'];
  const missingFields = requiredFields.filter(field => !deploymentConfig[field]);

  if (missingFields.length > 0) {
    console.error(`❌ deployment.json missing required fields: ${missingFields.join(', ')}`);
    hasErrors = true;
  } else {
    console.log('✅ deployment.json structure validated');
  }

  // Validate contract addresses
  const contracts = deploymentConfig.contracts;
  const contractCount = Object.keys(contracts).length;

  if (contractCount === 0) {
    console.error('❌ No contracts found in deployment.json');
    hasErrors = true;
  } else {
    console.log(`✅ Found ${contractCount} contract(s) in deployment configuration`);
  }

} catch (error) {
  console.error('❌ Error parsing deployment.json:', error.message);
  console.error('   Please ensure the deployment.json file contains valid JSON');
  hasErrors = true;
}

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APTOS_NETWORK',
  'NEXT_PUBLIC_APTOS_NODE_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Environment variable not set: ${envVar}`);
  } else {
    console.log(`✅ Environment variable set: ${envVar}`);
  }
});

if (hasErrors) {
  console.error('❌ Build preparation failed due to validation errors');
  process.exit(1);
}

console.log('✅ Build environment prepared successfully');