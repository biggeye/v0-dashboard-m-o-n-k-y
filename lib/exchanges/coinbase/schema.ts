// Coinbase API family schema and configuration
// Distinguishes between App, Advanced Trade, Exchange, Server Wallet, and Trade API

// High-level product family within Coinbase
export enum CoinbaseApiFamily {
  APP = "app", // Coinbase App: track/transfer/retail account
  ADVANCED_TRADE = "advanced_trade",
  EXCHANGE = "exchange", // Institutional Coinbase Exchange
  WALLET_SDK = "wallet_sdk", // Client-side wallet connect
  SERVER_WALLET = "server_wallet",
  TRADE_API = "trade_api_onchain",
}

export enum CoinbaseEnvironment {
  PROD = "prod",
  SANDBOX = "sandbox",
}

export type AuthStrategy = "oauth" | "cdp_jwt" | "legacy_api_key" | "none"

// Capabilities matrix
export type ApiCapabilities = {
  // Trading
  spotTrading: boolean
  derivativesTrading: boolean
  marginTrading: boolean

  // Data
  restMarketData: boolean
  websocketMarketData: boolean
  userDataWebsocket: boolean

  // Wallet / custody
  custodialBalances: boolean // balances held by Coinbase
  nonCustodialWallet: boolean // user keys / smart wallets
  onchainSwaps: boolean // DEX-style swaps via Trade API or Server Wallet

  // Fiat
  fiatOnOffRamp: boolean
}

// Config object for each "flavor"
export type CoinbaseApiConfig = {
  id: string // "coinbase-advanced-prod"
  family: CoinbaseApiFamily
  env: CoinbaseEnvironment
  label: string

  restBaseUrl?: string
  websocketUrls?: string[]
  fixEndpoint?: string

  auth: AuthStrategy
  capabilities: ApiCapabilities
}

// Concrete configs for the main APIs
export const coinbaseApis: CoinbaseApiConfig[] = [
  // 1) Coinbase App (retail, track/transfer)
  {
    id: "coinbase-app-prod",
    family: CoinbaseApiFamily.APP,
    env: CoinbaseEnvironment.PROD,
    label: "Coinbase App (Retail)",
    restBaseUrl: "https://api.coinbase.com", // e.g. /v2, /v3/track, /v3/transfer
    auth: "oauth", // or 'cdp_jwt' depending on how you integrate
    capabilities: {
      spotTrading: false, // trading is via Advanced Trade, not this surface
      derivativesTrading: false,
      marginTrading: false,

      restMarketData: true,
      websocketMarketData: false,
      userDataWebsocket: false,

      custodialBalances: true,
      nonCustodialWallet: false,
      onchainSwaps: false,

      fiatOnOffRamp: true,
    },
  },

  // 2) Coinbase Advanced Trade (retail trading)
  {
    id: "coinbase-advanced-prod",
    family: CoinbaseApiFamily.ADVANCED_TRADE,
    env: CoinbaseEnvironment.PROD,
    label: "Coinbase Advanced Trade",
    restBaseUrl: "https://api.coinbase.com/api/v3/brokerage",
    websocketUrls: [
      "wss://advanced-trade-ws.coinbase.com",
      "wss://advanced-trade-ws-user.coinbase.com",
    ],
    auth: "cdp_jwt",
    capabilities: {
      spotTrading: true,
      derivativesTrading: true, // futures, depending on account region/eligibility
      marginTrading: false, // flip to true if/when supported and enabled

      restMarketData: true,
      websocketMarketData: true,
      userDataWebsocket: true,

      custodialBalances: true,
      nonCustodialWallet: false,
      onchainSwaps: false,

      fiatOnOffRamp: false, // handled via App APIs
    },
  },

  // 3) Coinbase Exchange (institutional)
  {
    id: "coinbase-exchange-prod",
    family: CoinbaseApiFamily.EXCHANGE,
    env: CoinbaseEnvironment.PROD,
    label: "Coinbase Exchange (Institutional)",
    restBaseUrl: "https://api.exchange.coinbase.com",
    websocketUrls: ["wss://ws-feed.exchange.coinbase.com"],
    fixEndpoint: "tcp+ssl://fix.exchange.coinbase.com:4198",
    auth: "legacy_api_key", // or CDP/Exchange creds depending on setup
    capabilities: {
      spotTrading: true,
      derivativesTrading: true,
      marginTrading: true, // check actual product access per account

      restMarketData: true,
      websocketMarketData: true,
      userDataWebsocket: true, // authenticated WS user channel

      custodialBalances: true,
      nonCustodialWallet: false,
      onchainSwaps: false,

      fiatOnOffRamp: false,
    },
  },

  // 4) Server Wallet (custody + onchain)
  {
    id: "coinbase-server-wallet-prod",
    family: CoinbaseApiFamily.SERVER_WALLET,
    env: CoinbaseEnvironment.PROD,
    label: "Coinbase Server Wallet v2",
    restBaseUrl: "https://api.cdp.coinbase.com/server/wallets", // check exact path in your integration
    auth: "cdp_jwt",
    capabilities: {
      spotTrading: false,
      derivativesTrading: false,
      marginTrading: false,

      restMarketData: false,
      websocketMarketData: false,
      userDataWebsocket: false,

      custodialBalances: true, // Coinbase secures keys
      nonCustodialWallet: false,
      onchainSwaps: true, // can execute swaps with Trade API integration

      fiatOnOffRamp: false,
    },
  },

  // 5) Onchain Trade API (swaps)
  {
    id: "coinbase-trade-api-prod",
    family: CoinbaseApiFamily.TRADE_API,
    env: CoinbaseEnvironment.PROD,
    label: "Coinbase Trade API (Onchain Swaps)",
    restBaseUrl: "https://api.cdp.coinbase.com/trade",
    auth: "cdp_jwt",
    capabilities: {
      spotTrading: false, // not centralized order book
      derivativesTrading: false,
      marginTrading: false,

      restMarketData: false,
      websocketMarketData: false,
      userDataWebsocket: false,

      custodialBalances: false, // usually swaps for EOAs/smart accounts
      nonCustodialWallet: true,
      onchainSwaps: true,

      fiatOnOffRamp: false,
    },
  },
]

// Sandbox variants
export const coinbaseSandboxApis: CoinbaseApiConfig[] = [
  {
    id: "coinbase-advanced-sandbox",
    family: CoinbaseApiFamily.ADVANCED_TRADE,
    env: CoinbaseEnvironment.SANDBOX,
    label: "Coinbase Advanced Trade (Sandbox)",
    restBaseUrl: "https://api-public.sandbox.pro.coinbase.com",
    websocketUrls: ["wss://advanced-trade-ws.sandbox.coinbase.com"],
    auth: "cdp_jwt",
    capabilities: {
      spotTrading: true,
      derivativesTrading: true,
      marginTrading: false,

      restMarketData: true,
      websocketMarketData: true,
      userDataWebsocket: true,

      custodialBalances: true,
      nonCustodialWallet: false,
      onchainSwaps: false,

      fiatOnOffRamp: false,
    },
  },
  {
    id: "coinbase-exchange-sandbox",
    family: CoinbaseApiFamily.EXCHANGE,
    env: CoinbaseEnvironment.SANDBOX,
    label: "Coinbase Exchange (Sandbox)",
    restBaseUrl: "https://api-public.sandbox.exchange.coinbase.com",
    websocketUrls: ["wss://ws-feed-public.sandbox.exchange.coinbase.com"],
    auth: "legacy_api_key",
    capabilities: {
      spotTrading: true,
      derivativesTrading: true,
      marginTrading: true,

      restMarketData: true,
      websocketMarketData: true,
      userDataWebsocket: true,

      custodialBalances: true,
      nonCustodialWallet: false,
      onchainSwaps: false,

      fiatOnOffRamp: false,
    },
  },
]

// Helper to resolve config
export function getCoinbaseConfig(
  family: CoinbaseApiFamily,
  env: CoinbaseEnvironment
): CoinbaseApiConfig {
  const all = [...coinbaseApis, ...coinbaseSandboxApis]
  const cfg = all.find((c) => c.family === family && c.env === env)
  if (!cfg) throw new Error(`No Coinbase config for ${family} / ${env}`)
  return cfg
}

// Helper to get all configs for a family
export function getCoinbaseConfigsByFamily(
  family: CoinbaseApiFamily
): CoinbaseApiConfig[] {
  const all = [...coinbaseApis, ...coinbaseSandboxApis]
  return all.filter((c) => c.family === family)
}

// Capability assertion helpers
export function assertCanSpotTrade(cfg: CoinbaseApiConfig): void {
  if (!cfg.capabilities.spotTrading) {
    throw new Error(`API ${cfg.label} does not support spot trading`)
  }
}

export function assertCanTradeDerivatives(cfg: CoinbaseApiConfig): void {
  if (!cfg.capabilities.derivativesTrading) {
    throw new Error(`API ${cfg.label} does not support derivatives trading`)
  }
}

export function assertHasCustodialBalances(cfg: CoinbaseApiConfig): void {
  if (!cfg.capabilities.custodialBalances) {
    throw new Error(`API ${cfg.label} does not support custodial balances`)
  }
}

// Interface definitions for different API families
export interface ISpotTradingApi {
  placeOrder(...args: any[]): Promise<any>
  cancelOrder(id: string): Promise<void>
  listOpenOrders(): Promise<any[]>
  listFills(): Promise<any[]>
}

export interface IWalletBalancesApi {
  listBalances(): Promise<any[]>
  getBalance(symbol: string): Promise<string>
}

export interface IMarketDataApi {
  getTicker(symbol: string): Promise<any>
  getOrderBook(symbol: string): Promise<any>
  subscribeToMarketData(symbols: string[]): void
}

