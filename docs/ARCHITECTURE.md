# AptoFi System Architecture

## Overview

AptoFi is a comprehensive DeFi banking platform built on Aptos blockchain with institutional-grade KYC compliance. The system consists of multiple layers working together to provide secure, compliant, and scalable DeFi services.

## System Components

### Frontend Layer
- **Next.js 15 Application** - Modern React-based web interface
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Aptos Wallet Integration** - Multi-wallet support

### Smart Contract Layer
- **9 Move Contracts** - Comprehensive DeFi protocol suite
- **Aptos Blockchain** - High-performance L1 blockchain
- **Event-Driven Architecture** - Real-time updates and monitoring

### Integration Layer
- **Aptos TypeScript SDK** - Blockchain interaction
- **IPFS** - Decentralized document storage
- **Chainlink Oracles** - External data feeds

## Architecture Diagrams

### System Overview (Mermaid)

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Next.js Web Application]
        Mobile[Mobile App - Future]
        API[REST API Gateway]
    end
    
    subgraph "Authentication & Identity"
        Auth[Authentication Service]
        DID[DID Registry Contract]
        KYC[KYC Registry Contract]
        Rep[Reputation System]
    end
    
    subgraph "DeFi Core Services"
        AMM[Automated Market Maker]
        Lending[Lending Protocol]
        Yield[Yield Farming Vaults]
        Bridge[Cross-Chain Bridge]
    end
    
    subgraph "Risk & Compliance"
        Risk[Risk Management Engine]
        Oracle[Price Oracle System]
        Monitor[Compliance Monitor]
    end
    
    subgraph "External Integrations"
        IPFS[IPFS Storage Network]
        Chainlink[Chainlink Oracles]
        KYCProvider[KYC Service Providers]
        Banks[Traditional Banking APIs]
    end
    
    subgraph "Aptos Blockchain Infrastructure"
        Validators[Aptos Validators]
        Storage[Blockchain Storage]
        Events[Event System]
    end
    
    UI --> Auth
    UI --> API
    Auth --> DID
    Auth --> KYC
    DID --> Rep
    
    API --> AMM
    API --> Lending
    API --> Yield
    API --> Bridge
    
    AMM --> Risk
    Lending --> Risk
    Yield --> Risk
    Risk --> Oracle
    
    Oracle --> Chainlink
    KYC --> KYCProvider
    DID --> IPFS
    
    AMM --> Validators
    Lending --> Validators
    Yield --> Validators
    Bridge --> Validators
    
    Validators --> Storage
    Validators --> Events
    Events --> UI
```

### Data Flow Architecture (Mermaid)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant W as Wallet
    participant DID as DID Registry
    participant KYC as KYC Registry
    participant AMM as AMM Protocol
    participant O as Oracle
    participant R as Risk Manager
    
    U->>FE: Connect & Authenticate
    FE->>W: Request Wallet Connection
    W-->>FE: Wallet Connected
    
    U->>FE: Create Profile
    FE->>DID: Create DID Profile
    DID-->>FE: Profile Created
    
    U->>FE: Submit KYC Documents
    FE->>KYC: Upload Documents to IPFS
    KYC->>KYC: Verify Documents
    KYC-->>FE: KYC Status Updated
    
    U->>FE: Execute Trade
    FE->>AMM: Initiate Swap
    AMM->>O: Get Current Prices
    O-->>AMM: Price Data
    AMM->>R: Check Risk Parameters
    R-->>AMM: Risk Assessment
    AMM->>W: Request Transaction Signature
    W-->>AMM: Signed Transaction
    AMM-->>FE: Transaction Complete
    FE-->>U: Trade Confirmed
```

### High-Level System Architecture

```plantuml
@startuml AptoFi_System_Architecture
!theme plain
skinparam backgroundColor #FFFFFF
skinparam componentStyle rectangle

package "Frontend Layer" {
  [Next.js Web App] as WebApp
  [React Components] as Components
  [Wallet Integration] as Wallet
  [State Management] as State
}

package "Integration Layer" {
  [Aptos SDK] as SDK
  [IPFS Client] as IPFS
  [Chainlink Oracles] as Oracles
}

package "Aptos Blockchain" {
  package "Smart Contracts" {
    [DID Registry] as DID
    [KYC Registry] as KYC
    [Reputation System] as Rep
    [AMM Protocol] as AMM
    [Lending Protocol] as Lending
    [Yield Vaults] as Yield
    [Risk Manager] as Risk
    [CCIP Bridge] as Bridge
    [Oracle Contract] as OracleContract
  }
}

package "External Services" {
  [IPFS Network] as IPFSNet
  [Chainlink Network] as ChainlinkNet
  [KYC Providers] as KYCProviders
}

WebApp --> Components
Components --> Wallet
Components --> State
WebApp --> SDK
SDK --> DID
SDK --> KYC
SDK --> Rep
SDK --> AMM
SDK --> Lending
SDK --> Yield
SDK --> Risk
SDK --> Bridge
SDK --> OracleContract

IPFS --> IPFSNet
Oracles --> ChainlinkNet
KYC --> KYCProviders
OracleContract --> ChainlinkNet

@enduml
```

### Smart Contract Architecture

```plantuml
@startuml Smart_Contract_Architecture
!theme plain
skinparam backgroundColor #FFFFFF

package "Identity & Compliance Layer" {
  [DID Registry] as DID
  [KYC Registry] as KYC
  [Reputation System] as Rep
}

package "DeFi Protocol Layer" {
  [AMM Protocol] as AMM
  [Lending Protocol] as Lending
  [Yield Vaults] as Yield
}

package "Infrastructure Layer" {
  [Risk Manager] as Risk
  [Chainlink Oracle] as Oracle
  [CCIP Bridge] as Bridge
}

DID --> Rep : "Updates reputation score"
KYC --> DID : "Extends basic profile"
Rep --> Lending : "Affects interest rates"
Rep --> AMM : "Influences fees"

AMM --> Oracle : "Gets price feeds"
Lending --> Oracle : "Gets asset prices"
Lending --> Risk : "Health monitoring"
Yield --> Risk : "Strategy risk assessment"

Risk --> Oracle : "Price validation"
Bridge --> KYC : "Cross-chain compliance"

@enduml
```

### User Journey Flow

```plantuml
@startuml User_Journey_Flow
!theme plain
skinparam backgroundColor #FFFFFF

actor User
participant "Web App" as App
participant "Wallet" as Wallet
participant "DID Registry" as DID
participant "KYC Registry" as KYC
participant "DeFi Protocols" as DeFi

User -> App: Connect Wallet
App -> Wallet: Request Connection
Wallet -> App: Wallet Connected

User -> App: Create Profile
App -> DID: Create DID Profile
DID -> App: Profile Created

User -> App: Start KYC
App -> KYC: Submit Documents
KYC -> App: KYC Pending

note over KYC: KYC Provider\nVerification Process

KYC -> App: KYC Approved
App -> User: Access Granted

User -> App: Use DeFi Features
App -> DeFi: Execute Transactions
DeFi -> App: Transaction Complete

@enduml
```

## Data Flow Architecture

### Authentication & Authorization Flow

```plantuml
@startuml Auth_Flow
!theme plain
skinparam backgroundColor #FFFFFF

participant "User" as User
participant "Frontend" as FE
participant "AuthGuard" as Auth
participant "KYCGuard" as KYC
participant "DID Contract" as DID
participant "KYC Contract" as KYCContract

User -> FE: Access DeFi Feature
FE -> Auth: Check Profile
Auth -> DID: Profile Exists?
DID -> Auth: Profile Status
Auth -> KYC: Check KYC Level
KYC -> KYCContract: Get KYC Status
KYCContract -> KYC: KYC Level & Compliance
KYC -> FE: Access Decision
FE -> User: Grant/Deny Access

@enduml
```

### Transaction Processing Flow

```plantuml
@startuml Transaction_Flow
!theme plain
skinparam backgroundColor #FFFFFF

participant "User" as User
participant "Frontend" as FE
participant "Wallet" as Wallet
participant "Smart Contract" as SC
participant "Oracle" as Oracle
participant "Risk Manager" as Risk

User -> FE: Initiate Transaction
FE -> Wallet: Sign Transaction
Wallet -> SC: Submit Transaction
SC -> Oracle: Get Price Data
Oracle -> SC: Return Prices
SC -> Risk: Check Risk Parameters
Risk -> SC: Risk Assessment
SC -> SC: Execute Transaction
SC -> FE: Transaction Result
FE -> User: Show Result

@enduml
```

## Component Interactions

### Frontend Component Hierarchy (Mermaid)

```mermaid
graph TD
    subgraph "Application Shell"
        App[App Component]
        Layout[Layout Component]
        Router[Next.js App Router]
    end
    
    subgraph "Provider Layer"
        WalletProvider[Wallet Provider]
        QueryProvider[React Query Provider]
        ThemeProvider[Theme Provider]
        ErrorBoundary[Error Boundary]
    end
    
    subgraph "Authentication Layer"
        AuthGuard[Authentication Guard]
        KYCGuard[KYC Compliance Guard]
        RoleGuard[Role-Based Access Guard]
    end
    
    subgraph "Core Pages"
        Dashboard[Dashboard Page]
        Trading[Trading Interface]
        Pools[Liquidity Pools]
        Profile[User Profile]
        Settings[Settings Page]
    end
    
    subgraph "Feature Components"
        DIDManager[DID Profile Manager]
        KYCManager[KYC Compliance Manager]
        TradingEngine[Trading Engine]
        PoolManager[Pool Management]
        WalletConnect[Wallet Connection]
    end
    
    subgraph "UI Components"
        Charts[Trading Charts]
        Forms[Dynamic Forms]
        Tables[Data Tables]
        Modals[Modal System]
        Notifications[Notification System]
    end
    
    App --> Layout
    Layout --> Router
    App --> WalletProvider
    App --> QueryProvider
    App --> ThemeProvider
    App --> ErrorBoundary
    
    Router --> AuthGuard
    AuthGuard --> KYCGuard
    KYCGuard --> RoleGuard
    
    RoleGuard --> Dashboard
    RoleGuard --> Trading
    RoleGuard --> Pools
    RoleGuard --> Profile
    RoleGuard --> Settings
    
    Profile --> DIDManager
    Profile --> KYCManager
    Trading --> TradingEngine
    Pools --> PoolManager
    Dashboard --> WalletConnect
    
    TradingEngine --> Charts
    DIDManager --> Forms
    PoolManager --> Tables
    Trading --> Modals
    App --> Notifications
```

### Frontend Component Hierarchy (PlantUML)

```plantuml
@startuml Component_Hierarchy
!theme plain
skinparam backgroundColor #FFFFFF

package "App Router" {
  [Layout] as Layout
  [Page] as Page
}

package "Core Components" {
  [AuthenticatedLayout] as AuthLayout
  [WalletProvider] as WalletProv
  [ReactQueryProvider] as QueryProv
}

package "Feature Components" {
  [DashboardContent] as Dashboard
  [TradingContent] as Trading
  [PoolsContent] as Pools
  [ProfileContent] as Profile
}

package "Guard Components" {
  [AuthGuard] as AuthGuard
  [KYCGuard] as KYCGuard
  [ErrorBoundary] as ErrorBound
}

package "Profile Components" {
  [DIDProfileManager] as DIDManager
  [KYCComplianceManager] as KYCManager
  [ReputationBadge] as RepBadge
}

Layout --> AuthLayout
Page --> AuthLayout
AuthLayout --> WalletProv
AuthLayout --> QueryProv
AuthLayout --> ErrorBound

AuthLayout --> Dashboard
AuthLayout --> Trading
AuthLayout --> Pools
AuthLayout --> Profile

Trading --> AuthGuard
Trading --> KYCGuard
Pools --> AuthGuard
Pools --> KYCGuard

Profile --> DIDManager
Profile --> KYCManager
AuthLayout --> RepBadge

@enduml
```

## Security Architecture

### Access Control Matrix

| Component | No Profile | Basic KYC | Enhanced KYC | Institutional KYC |
|-----------|------------|-----------|--------------|-------------------|
| Wallet Functions | ✅ | ✅ | ✅ | ✅ |
| Basic Trading | ❌ | ✅ | ✅ | ✅ |
| High-Value Trading | ❌ | ❌ | ✅ | ✅ |
| Liquidity Pools | ❌ | ❌ | ✅ | ✅ |
| Lending/Borrowing | ❌ | ❌ | ✅ | ✅ |
| Cross-Chain Bridge | ❌ | ❌ | ✅ | ✅ |
| Institutional Features | ❌ | ❌ | ❌ | ✅ |

### Security Layers

```plantuml
@startuml Security_Layers
!theme plain
skinparam backgroundColor #FFFFFF

package "Frontend Security" {
  [Input Validation] as InputVal
  [XSS Protection] as XSS
  [CSRF Protection] as CSRF
  [Error Boundaries] as ErrorBound
}

package "Application Security" {
  [Authentication Guards] as AuthGuards
  [KYC Compliance Checks] as KYCChecks
  [Rate Limiting] as RateLimit
  [Session Management] as Session
}

package "Smart Contract Security" {
  [Access Control] as AccessControl
  [Reentrancy Protection] as Reentrancy
  [Integer Overflow Protection] as Overflow
  [Emergency Pause] as Pause
}

package "Infrastructure Security" {
  [Wallet Security] as WalletSec
  [Oracle Security] as OracleSec
  [IPFS Security] as IPFSSec
  [Network Security] as NetworkSec
}

InputVal --> AuthGuards
XSS --> AuthGuards
CSRF --> AuthGuards
ErrorBound --> AuthGuards

AuthGuards --> AccessControl
KYCChecks --> AccessControl
RateLimit --> AccessControl
Session --> AccessControl

AccessControl --> WalletSec
Reentrancy --> OracleSec
Overflow --> IPFSSec
Pause --> NetworkSec

@enduml
```

## Scalability Considerations

### Horizontal Scaling

- **Frontend**: CDN distribution, edge caching
- **API Layer**: Load balancing, microservices
- **Blockchain**: Aptos parallel execution
- **Storage**: IPFS distributed storage

### Performance Optimization

- **Frontend**: Code splitting, lazy loading, caching
- **Smart Contracts**: Gas optimization, batch operations
- **Data Fetching**: React Query caching, pagination
- **Network**: Connection pooling, request batching

### Future Scaling Plans

1. **Layer 2 Integration** - For high-frequency trading
2. **Multi-Chain Support** - Expand beyond Aptos
3. **Mobile Applications** - Native iOS/Android apps
4. **API Gateway** - Centralized API management
5. **Microservices** - Service decomposition for scale

## Deployment Architecture

### Development Environment

```plantuml
@startuml Development_Environment
!theme plain
skinparam backgroundColor #FFFFFF

package "Local Development" {
  [Next.js Dev Server] as DevServer
  [Hot Reload] as HotReload
  [TypeScript Compiler] as TSC
  [Tailwind CSS] as Tailwind
}

package "Aptos Testnet" {
  [Deployed Contracts] as Contracts
  [Test Accounts] as TestAccounts
  [Faucet] as Faucet
}

package "Development Tools" {
  [Aptos CLI] as CLI
  [Move Compiler] as MoveCompiler
  [Contract Tests] as Tests
}

DevServer --> Contracts
DevServer --> TestAccounts
CLI --> MoveCompiler
MoveCompiler --> Tests
Tests --> Contracts

@enduml
```

### Production Environment

```plantuml
@startuml Production_Environment
!theme plain
skinparam backgroundColor #FFFFFF

package "Frontend Deployment" {
  [Vercel/Netlify] as CDN
  [Edge Functions] as Edge
  [Global CDN] as GlobalCDN
}

package "Aptos Mainnet" {
  [Production Contracts] as ProdContracts
  [Mainnet Validators] as Validators
  [Production Accounts] as ProdAccounts
}

package "External Services" {
  [IPFS Pinning Service] as IPFSPin
  [Chainlink Oracles] as ChainlinkProd
  [KYC Provider APIs] as KYCAPIs
}

package "Monitoring & Analytics" {
  [Error Tracking] as ErrorTrack
  [Performance Monitoring] as PerfMon
  [Usage Analytics] as Analytics
}

CDN --> ProdContracts
Edge --> ProdContracts
GlobalCDN --> ProdContracts

ProdContracts --> IPFSPin
ProdContracts --> ChainlinkProd
ProdContracts --> KYCAPIs

CDN --> ErrorTrack
CDN --> PerfMon
CDN --> Analytics

@enduml
```

## Integration Points

### External Service Integration

1. **Aptos Blockchain**
   - RPC endpoints for transaction submission
   - Event streaming for real-time updates
   - Account and resource queries

2. **IPFS Network**
   - Document storage and retrieval
   - Content addressing and verification
   - Pinning services for availability

3. **Chainlink Oracles**
   - Price feed aggregation
   - External data validation
   - Decentralized oracle network

4. **KYC Providers**
   - Identity verification services
   - Document validation APIs
   - Compliance screening services

### API Specifications

#### Aptos Integration
- **SDK Version**: 5.1.0
- **Network**: Testnet/Mainnet
- **Authentication**: Wallet signatures
- **Rate Limits**: API key dependent

#### IPFS Integration
- **Protocol**: HTTP API
- **Storage**: Encrypted documents
- **Retrieval**: Content hash addressing
- **Pinning**: Persistent storage

## Monitoring & Observability

### Key Metrics

1. **User Metrics**
   - Active users (daily/monthly)
   - KYC completion rates
   - Feature adoption rates

2. **Transaction Metrics**
   - Transaction volume
   - Success/failure rates
   - Gas usage optimization

3. **System Metrics**
   - Response times
   - Error rates
   - Uptime/availability

4. **Security Metrics**
   - Failed authentication attempts
   - Compliance violations
   - Risk score distributions

### Alerting Strategy

- **Critical**: System downtime, security breaches
- **Warning**: High error rates, performance degradation
- **Info**: Feature usage, user milestones

This architecture provides a solid foundation for a scalable, secure, and compliant DeFi banking platform while maintaining flexibility for future enhancements and integrations.