# AptoFi - Multi-Platform DeFi Banking

A comprehensive decentralized finance (DeFi) banking platform built on the Aptos blockchain with KYC compliance, featuring web applications and smart contract integration for institutional-grade DeFi services.

## 🏗️ Project Structure

```
aptofi/
├── src/                          # Next.js web application
│   ├── app/                     # App router pages & layouts
│   ├── components/              # React components
│   │   ├── ui/                 # Base UI components
│   │   ├── AuthGuard.tsx       # Profile-based access control
│   │   ├── KYCGuard.tsx        # KYC compliance protection
│   │   ├── DIDProfileManager.tsx # DID profile management
│   │   └── KYCComplianceManager.tsx # KYC verification interface
│   ├── entry-functions/         # Smart contract interaction functions
│   ├── view-functions/          # Blockchain data fetching
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities and configurations
│   └── deployment.json          # Contract deployment addresses
├── contract/                     # Move smart contracts
│   ├── sources/                 # Move source files
│   │   ├── did_registry.move    # Basic DID profiles
│   │   ├── kyc_did_registry.move # KYC-compliant identity
│   │   ├── reputation_system.move # User reputation scoring
│   │   ├── amm.move             # Automated market maker
│   │   ├── lending_protocol.move # Collateralized lending
│   │   ├── yield_vault.move     # Multi-strategy yield farming
│   │   ├── risk_manager.move    # Risk assessment & liquidation
│   │   ├── chainlink_oracle.move # Price feeds & data
│   │   └── ccip_bridge.move     # Cross-chain infrastructure
│   └── Move.toml                # Move project configuration
└── .env.example                 # Environment variables template
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Aptos CLI** (for contract development)
- **Git**
- **Aptos Wallet** (Petra, Martian, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aptofi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add:
   ```env
   NEXT_PUBLIC_APP_NETWORK=testnet
   NEXT_PUBLIC_APTOS_API_KEY=your_aptos_api_key_here
   NEXT_PUBLIC_MODULE_ADDRESS=0x927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

### Web Application
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code analysis
- `npm run type-check` - Run TypeScript type checking

### Smart Contracts
- `npm run move:compile` - Compile Move contracts
- `npm run move:test` - Run Move contract tests
- `npm run move:publish` - Deploy contracts to blockchain

### Mobile (Future)
- `npm run mobile:dev` - Start React Native development
- `npm run mobile:web` - Start mobile web version
- `npm run mobile:android` - Start Android development
- `npm run mobile:ios` - Start iOS development

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS-in-JS
- **UI Components**: Radix UI primitives
- **State Management**: React hooks + Context
- **Blockchain**: Aptos TypeScript SDK v5.1.0
- **Wallet Integration**: Aptos Wallet Adapter

### Smart Contracts
- **Language**: Move
- **Blockchain**: Aptos
- **Network**: Testnet (production ready)
- **Features**: 9 comprehensive contracts

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint + TypeScript
- **Formatting**: Prettier (auto-format on save)
- **Testing**: Move unit tests
- **Deployment**: Vercel/Netlify ready

## 🌐 Core Features

### Identity & Compliance
- ✅ **DID Registry** - Decentralized identity profiles
- ✅ **KYC Compliance** - Multi-level identity verification (Basic, Enhanced, Institutional)
- ✅ **Reputation System** - Dynamic scoring based on on-chain activity
- ✅ **Regulatory Compliance** - AML, sanctions screening, PEP checks
- ✅ **Document Verification** - IPFS + blockchain document storage

### DeFi Protocols
- ✅ **AMM Trading** - Automated market maker with liquidity pools
- ✅ **Lending & Borrowing** - Collateralized lending with reputation-based rates
- ✅ **Yield Farming** - Multi-strategy yield optimization vaults
- ✅ **Risk Management** - Real-time health monitoring and liquidation
- ✅ **Cross-Chain Bridge** - Chainlink CCIP integration

### User Experience
- ✅ **Multi-Wallet Support** - Petra, Martian, and other Aptos wallets
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Real-time Updates** - Live balance and transaction updates
- ✅ **Progressive Access** - Features unlock with verification level
- ✅ **Error Boundaries** - Graceful error handling and recovery

## 🛡️ KYC Compliance System

### Verification Levels
- **Level 0 - None**: $1K daily limit, basic wallet functions
- **Level 1 - Basic**: $10K limit, requires government ID + proof of address
- **Level 2 - Enhanced**: $100K limit, requires enhanced due diligence
- **Level 3 - Institutional**: Unlimited, requires full business verification

### Compliance Features
- **AML Risk Scoring**: 0-100 risk assessment
- **Sanctions Screening**: OFAC and global sanctions checking
- **PEP Detection**: Politically Exposed Person identification
- **Document Verification**: Encrypted on-chain storage with IPFS
- **Audit Trail**: Complete verification history

### Regulatory Standards
- **FATF Recommendations** - Anti-money laundering
- **US FinCEN** - Financial crimes enforcement
- **EU AML5** - Fifth Anti-Money Laundering Directive
- **UK FCA** - Financial Conduct Authority guidelines

## 🔐 Smart Contract Architecture

### Core Contracts
1. **did_registry.move** - Basic DID profile management
2. **kyc_did_registry.move** - KYC-compliant identity system
3. **reputation_system.move** - Multi-factor reputation scoring
4. **amm.move** - Automated market maker for trading
5. **lending_protocol.move** - Collateralized lending and borrowing
6. **yield_vault.move** - Multi-strategy yield farming
7. **risk_manager.move** - Risk assessment and liquidation
8. **chainlink_oracle.move** - Price feeds and external data
9. **ccip_bridge.move** - Cross-chain interoperability

### Security Features
- **Access Control** - Role-based permissions
- **Risk Management** - Health factor monitoring
- **Compliance Checks** - Real-time KYC verification
- **Audit Trail** - Complete transaction history
- **Emergency Controls** - Admin pause mechanisms

## 🌍 Network Configuration

### Aptos Testnet (Current)
- **Network**: testnet
- **Node URL**: https://fullnode.testnet.aptoslabs.com/v1
- **Module Address**: `0x927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c`
- **Explorer**: https://explorer.aptoslabs.com/?network=testnet

### Mainnet (Production Ready)
- All contracts tested and ready for mainnet deployment
- Environment variables configured for easy network switching
- Production-grade security and compliance features

## 🛠️ Development Guide

### Environment Setup

1. **Install Aptos CLI**
   ```bash
   # macOS
   brew install aptos
   
   # Linux/Windows
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   ```

2. **Get Aptos API Key** (Optional but recommended)
   - Visit [Aptos Labs](https://aptos.dev)
   - Sign up for API access
   - Add key to `.env.local`

3. **Install Aptos Wallet**
   - [Petra Wallet](https://petra.app/) (Recommended)
   - [Martian Wallet](https://martianwallet.xyz/)
   - Switch to Testnet in wallet settings

### Local Development

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Connect wallet**
   - Open http://localhost:3000
   - Click "Connect Wallet"
   - Select your Aptos wallet
   - Switch to Testnet if needed

3. **Create DID Profile**
   - Navigate to Profile section
   - Create basic DID profile
   - Optionally complete KYC verification

4. **Test DeFi Features**
   - Trading requires Basic KYC
   - Liquidity pools require Enhanced KYC
   - All features have appropriate guards

### Smart Contract Development

1. **Navigate to contract directory**
   ```bash
   cd contract
   ```

2. **Compile contracts**
   ```bash
   aptos move compile
   ```

3. **Run tests**
   ```bash
   aptos move test
   ```

4. **Deploy to testnet** (requires funded account)
   ```bash
   aptos move publish --named-addresses aptofi=<your-address>
   ```

### Adding New Features

1. **Frontend Components**
   ```bash
   # Create new component
   touch src/components/NewFeature.tsx
   
   # Add to appropriate page
   # Import and use in src/app/ or existing components
   ```

2. **Smart Contract Integration**
   ```bash
   # Add entry function
   touch src/entry-functions/newFeature.ts
   
   # Add view function
   touch src/view-functions/getNewFeature.ts
   
   # Update transaction library
   # Add to src/lib/transactions.ts
   ```

3. **Testing**
   ```bash
   # Type check
   npm run type-check
   
   # Lint code
   npm run lint
   
   # Test contracts
   npm run move:test
   ```

## 🚀 Deployment

### Frontend Deployment

1. **Build production bundle**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel** (Recommended)
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Environment Variables**
   - Set `NEXT_PUBLIC_APP_NETWORK=mainnet` for production
   - Add `NEXT_PUBLIC_APTOS_API_KEY` for better performance
   - Configure `NEXT_PUBLIC_MODULE_ADDRESS` with mainnet address

### Smart Contract Deployment

1. **Prepare mainnet account**
   ```bash
   # Create new account
   aptos init --network mainnet
   
   # Fund account (minimum 1 APT for deployment)
   ```

2. **Deploy contracts**
   ```bash
   cd contract
   aptos move publish --named-addresses aptofi=<your-mainnet-address> --network mainnet
   ```

3. **Update frontend configuration**
   - Update `src/deployment.json` with new addresses
   - Update environment variables
   - Test all integrations

## 🤝 Contributing

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/aptofi.git
   cd aptofi
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**
   - Follow existing code patterns
   - Add TypeScript types for new features
   - Include error handling
   - Test thoroughly

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create pull request**
   - Describe your changes
   - Include screenshots if UI changes
   - Reference any related issues

### Code Standards

- **TypeScript**: All new code must be TypeScript
- **Components**: Use functional components with hooks
- **Styling**: Use Tailwind CSS classes
- **Naming**: Use descriptive, camelCase names
- **Comments**: Document complex logic
- **Testing**: Add tests for smart contracts

### Areas for Contribution

- **Frontend Features**: New DeFi protocols, UI improvements
- **Smart Contracts**: Additional Move contracts, optimizations
- **Mobile App**: React Native implementation
- **Documentation**: Code comments, user guides
- **Testing**: Unit tests, integration tests
- **Security**: Security audits, vulnerability fixes

## 📞 Support & Community

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Discord**: Join our community (link in repo)
- **Documentation**: Check inline code comments

### Reporting Issues

1. **Search existing issues** first
2. **Use issue templates** when available
3. **Include reproduction steps**
4. **Add relevant labels**
5. **Be respectful and constructive**

### Security

- **Security issues**: Email security@aptofi.com
- **Bug bounty**: Available for critical vulnerabilities
- **Responsible disclosure**: 90-day disclosure policy

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**AptoFi** - Building the future of compliant, institutional-grade decentralized finance on Aptos blockchain.

**Live Demo**: [https://aptofi.vercel.app](https://aptofi.vercel.app) (Testnet)
**Contracts**: [Aptos Explorer](https://explorer.aptoslabs.com/account/0x927e781adeb2252f56f4b7f9de423bda7402954ee7adb3baa1d766509d494f3c?network=testnet)