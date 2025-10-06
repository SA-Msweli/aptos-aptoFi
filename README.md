# Optimus - DeFi Banking Application

> **🚀 A comprehensive DeFi banking platform built on Aptos blockchain**  
> **🌐 [Try the Live Demo](https://aptofi-ce351.web.app/)**

Optimus (formerly AptoFi) is a production-ready DeFi banking application that integrates Hyperion's CLMM technology and Nodit's blockchain infrastructure to deliver institutional-grade financial services on the Aptos ecosystem.

**Evolution**: This project started as AptoFi and has evolved into Optimus with enhanced features, better architecture, and comprehensive DeFi banking capabilities.

## 🌟 Features

### Core DeFi Services
- **🔐 Decentralized Identity (DID)** - On-chain identity management with metadata support
- **💸 P2P Payments** - Instant token transfers with real-time address validation
- **🏦 Lending Protocol** - P2P lending with automated scheduled payments and collateral management
- **🌾 Yield Vaults** - Automated yield generation with strategy optimization
- **💱 Hyperion-Powered DEX** - Concentrated liquidity trading with optimal capital efficiency

### Advanced Integrations
- **📊 Real-time Analytics** - Powered by Nodit's blockchain data infrastructure
- **🔄 Automated Strategies** - Smart contract automation for yield optimization
- **📱 Mobile-First Design** - Responsive interface optimized for mobile DeFi

## 🏗️ Architecture

### Smart Contracts (Move)
- **DID Registry** (`did.move`) - Identity management and metadata storage
- **Lending Protocol** (`lending.move`) - P2P lending with automated payments
- **Yield Vaults** (`vault.move`) - Automated yield farming strategies
- **Stake Pool** (`stake_pool.move`) - Staking and rewards distribution

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS + shadcn/ui** for modern, responsive design
- **React Query** for efficient state management and caching

### Blockchain Integration
- **Aptos TS SDK v5.0** for blockchain interactions
- **Wallet Adapter** supporting Petra, Martian, and Pontem wallets
- **Hyperion SDK v0.0.21** for CLMM functionality
- **Nodit APIs** for real-time blockchain data and analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Aptos CLI (installed via npm)
- Supported wallet (Petra, Martian, or Pontem)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd optimus
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Compile and deploy contracts:**
   ```bash
   npm run move:compile
   npm run move:publish
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🌐 Live Demo

**Try Optimus now**: [https://aptofi-ce351.web.app/](https://aptofi-ce351.web.app/)

Experience the full DeFi banking platform with:
- Wallet connection (Petra, Martian, Pontem)
- Real-time blockchain data via Nodit
- Hyperion-powered concentrated liquidity
- Complete DeFi services (lending, yield farming, P2P payments)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Project Configuration
PROJECT_NAME=optimus
VITE_APP_NETWORK=testnet

# Aptos Configuration
VITE_APTOS_API_KEY=your_aptos_api_key_here
VITE_MODULE_ADDRESS=your_deployed_module_address_here

# Hyperion Integration
VITE_HYPERION_API_URL=https://api.hyperion.xyz
VITE_HYPERION_CLMM_ADDRESS=0x48271d39d0b05bd6efca2278f22277d6fcc375504f9839fd73f74ace240861af

# Nodit Integration
VITE_NODIT_API_KEY=your_nodit_api_key_here
VITE_NODIT_WEB3_DATA_API_URL=https://aptos-testnet.nodit.io
```

## 📜 Available Scripts

### Move Contract Commands
- `npm run move:compile` - Compile Move contracts
- `npm run move:test` - Run Move unit tests
- `npm run move:publish` - Deploy contracts to blockchain
- `npm run move:upgrade` - Upgrade existing contracts

### Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:check` - Type-check and build
- `npm run preview` - Preview production build

### Deployment Commands
- `npm run deploy` - Deploy to Vercel
- `npm run deploy:contracts` - Deploy contracts with validation
- `npm run deploy:status` - Check deployment status

### Testing & Quality
- `npm run test:integration` - Run integration tests
- `npm run lint` - Run ESLint
- `npm run fmt` - Format code with Prettier

## 🎯 Usage

### For Users
1. **Connect Wallet** - Use Petra, Martian, or Pontem wallet
2. **Create DID Profile** - Set up your on-chain identity
3. **Explore DeFi Features**:
   - Send P2P payments with address validation
   - Lend or borrow tokens with automated payments
   - Deposit to yield vaults for automated returns
   - Trade with concentrated liquidity via Hyperion

### For Developers
1. **Smart Contract Development** - Extend Move contracts in `contract/sources/`
2. **Frontend Development** - Build React components in `frontend/`
3. **Integration** - Add new DeFi protocols or external APIs
4. **Testing** - Write tests and use the integration test suite

## 🏆 Hackathon Integration

This project targets multiple bounties in the Aptos Ctrl+MOVE Hackathon:

- **🥇 Main Track** - Complete DeFi ecosystem with institutional features
- **🔥 Hyperion Challenge** - Capital efficiency through CLMM integration
- **📊 Nodit Challenge** - Real-time blockchain analytics and monitoring

See `hackathon/` folder for detailed submission documentation.

## 🛠️ Technical Details

### Contract Addresses (Testnet)
- **Module Address**: `0xc367c4aefe1bc6028e0a5981c63c85347fcde2547f487904addc6762f8b130de`
- **Network**: Aptos Testnet
- **Deployment Status**: ✅ Live and operational

### Key Dependencies
- `@aptos-labs/ts-sdk`: Aptos blockchain integration
- `@hyperionxyz/sdk`: CLMM and capital efficiency features
- `@radix-ui/*`: Accessible UI components
- `@tanstack/react-query`: Efficient data fetching and caching

## 📚 Documentation

- **Main README** - This file (project overview and setup)
- **Hackathon Docs** - See `hackathon/` folder for submission materials
- **Contract Docs** - Inline documentation in Move files
- **API Integration** - Service layer documentation in `frontend/services/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **🌐 Live Demo**: [https://aptofi-ce351.web.app/](https://aptofi-ce351.web.app/)
- **💻 Local Development**: Run `npm run dev` for local setup
- **🔍 Aptos Network**: [Aptos Testnet Explorer](https://explorer.aptoslabs.com/?network=testnet)
- **⚡ Hyperion**: [Hyperion Documentation](https://docs.hyperion.xyz/)
- **📊 Nodit**: [Nodit Developer Portal](https://developer.nodit.io/)

---

**Built with ❤️ for the Aptos ecosystem**
