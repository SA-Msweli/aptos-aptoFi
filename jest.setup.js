import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Aptos SDK
jest.mock('@aptos-labs/ts-sdk', () => ({
  Aptos: jest.fn().mockImplementation(() => ({
    view: jest.fn(),
    getTransactionByHash: jest.fn(),
    getAccountTransactions: jest.fn(),
    waitForTransaction: jest.fn(),
  })),
  AptosConfig: jest.fn(),
  Network: {
    TESTNET: 'testnet',
    MAINNET: 'mainnet',
  },
}))

// Mock wallet adapter
jest.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: jest.fn(() => ({
    connected: false,
    account: null,
    signAndSubmitTransaction: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  WalletProvider: ({ children }) => children,
}))

// Global test utilities
global.mockAptos = {
  view: jest.fn(),
  getTransactionByHash: jest.fn(),
  getAccountTransactions: jest.fn(),
  waitForTransaction: jest.fn(),
}

global.mockWallet = {
  connected: false,
  account: null,
  signAndSubmitTransaction: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})