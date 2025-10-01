@echo off
setlocal

REM AptoFi Setup Script for Windows
REM This script sets up the development environment for the AptoFi project

echo 🚀 Setting up AptoFi Development Environment...

REM Check if we're in the right directory
if not exist "README.md" (
    echo ❌ Please run this script from the AptoFi project root directory
    exit /b 1
)

echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm
    exit /b 1
)

REM Check Aptos CLI
aptos --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Aptos CLI is not installed. Please install from https://aptos.dev/tools/aptos-cli/install-cli/
    echo You can also use: winget install --id Aptos.CLI
)

REM Check React Native CLI
react-native --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  React Native CLI is not installed. Installing...
    npm install -g @react-native-community/cli
)

echo ✅ Prerequisites check complete

REM Install mobile dependencies
echo 📱 Installing mobile app dependencies...
cd mobile
npm install
cd ..

REM Setup smart contracts
echo 🔗 Setting up smart contracts...
cd contracts
aptos move compile
cd ..

REM Create environment files
echo 🔧 Setting up environment files...

REM Mobile environment
if not exist "mobile\.env" (
    copy "mobile\.env.example" "mobile\.env"
    echo 📝 Created mobile/.env - please update with your configuration
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Update the .env file with your configuration
echo 2. For mobile development:
echo    - Android: cd mobile ^&^& npx react-native run-android
echo 3. For smart contracts:
echo    - cd contracts ^&^& aptos move test
echo.
echo 📚 Check README.md for detailed setup instructions
echo 🐛 Report issues at: https://github.com/your-org/aptos-aptofi/issues

pause