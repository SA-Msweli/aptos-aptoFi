#!/bin/bash

# AptoFi Setup Script
# This script sets up the development environment for the AptoFi project

echo "🚀 Setting up AptoFi Development Environment..."

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the AptoFi project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

# Check Aptos CLI
if ! command_exists aptos; then
    echo "⚠️  Aptos CLI is not installed. Installing..."
    curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
fi

# Check React Native CLI
if ! command_exists react-native; then
    echo "⚠️  React Native CLI is not installed. Installing..."
    npm install -g @react-native-community/cli
fi

echo "✅ Prerequisites check complete"

# Install mobile dependencies
echo "📱 Installing mobile app dependencies..."
cd mobile
npm install
cd ..

# Setup smart contracts
echo "🔗 Setting up smart contracts..."
cd contracts
aptos move compile
cd ..

# Create environment files
echo "🔧 Setting up environment files..."

# Mobile environment
if [ ! -f "mobile/.env" ]; then
    cp mobile/.env.example mobile/.env
    echo "📝 Created mobile/.env - please update with your configuration"
fi

# Setup iOS dependencies (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Setting up iOS dependencies..."
    cd mobile/ios
    if command_exists pod; then
        pod install
    else
        echo "⚠️  CocoaPods not found. Please install CocoaPods for iOS development"
    fi
    cd ../..
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your configuration"
echo "2. For mobile development:"
echo "   - iOS: cd mobile && npx react-native run-ios"
echo "   - Android: cd mobile && npx react-native run-android"
echo "3. For smart contracts:"
echo "   - cd contracts && aptos move test"
echo ""
echo "📚 Check README.md for detailed setup instructions"
echo "🐛 Report issues at: https://github.com/your-org/aptos-aptofi/issues"