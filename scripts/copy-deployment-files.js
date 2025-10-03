#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Copy deployment files script - runs after Next.js build
 * This script copies deployment configuration files to public directory
 * so they can be served statically and accessed by the frontend
 */

console.log('📦 Copying deployment files to public directory...');

// Files to copy to public directory
const filesToCopy = [
  {
    source: 'deployment.json',
    destination: 'public/deployment/deployment.json',
    required: true
  },
  {
    source: 'deployment-template.json',
    destination: 'public/deployment/deployment-template.json',
    required: false
  },
  {
    source: 'firebase.json',
    destination: 'public/config/firebase.json',
    required: false
  },
  {
    source: '.firebaserc',
    destination: 'public/config/.firebaserc',
    required: false
  }
];

// Contract ABI files (if they exist)
const contractDir = 'contract/build';
if (fs.existsSync(contractDir)) {
  const abiFiles = fs.readdirSync(contractDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      source: path.join(contractDir, file),
      destination: path.join('public/deployment/abi', file),
      required: false
    }));

  filesToCopy.push(...abiFiles);

  // Ensure ABI directory exists
  if (!fs.existsSync('public/deployment/abi')) {
    fs.mkdirSync('public/deployment/abi', { recursive: true });
  }
}

let copiedFiles = 0;
let errors = 0;

filesToCopy.forEach(({ source, destination, required }) => {
  try {
    if (fs.existsSync(source)) {
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(source, destination);
      console.log(`✅ Copied: ${source} → ${destination}`);
      copiedFiles++;
    } else if (required) {
      console.error(`❌ Required file not found: ${source}`);
      errors++;
    } else {
      console.log(`⚠️  Optional file not found: ${source}`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${source}:`, error.message);
    errors++;
  }
});

// Generate deployment manifest
const manifest = {
  timestamp: new Date().toISOString(),
  buildId: process.env.BUILD_ID || 'local',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  files: filesToCopy
    .filter(({ source }) => fs.existsSync(source))
    .map(({ source, destination }) => ({
      source,
      destination,
      size: fs.statSync(source).size,
      modified: fs.statSync(source).mtime.toISOString()
    }))
};

try {
  fs.writeFileSync(
    'public/deployment/manifest.json',
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ Generated deployment manifest');
} catch (error) {
  console.error('❌ Error generating manifest:', error.message);
  errors++;
}

// Create deployment info endpoint
const deploymentInfo = {
  network: process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet',
  nodeUrl: process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '1.0.0',
  buildId: process.env.BUILD_ID || 'local'
};

try {
  // Ensure api directory exists
  if (!fs.existsSync('public/api')) {
    fs.mkdirSync('public/api', { recursive: true });
  }

  fs.writeFileSync(
    'public/api/deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log('✅ Generated deployment info API endpoint');
} catch (error) {
  console.error('❌ Error generating deployment info:', error.message);
  errors++;
}

// Summary
console.log(`\n📊 Deployment files copy summary:`);
console.log(`   ✅ Files copied: ${copiedFiles}`);
console.log(`   ❌ Errors: ${errors}`);

if (errors > 0) {
  console.error('\n❌ Deployment file copy completed with errors');
  process.exit(1);
} else {
  console.log('\n✅ All deployment files copied successfully');
}