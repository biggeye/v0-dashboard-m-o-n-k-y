// Type definitions for exchange integrations
import { CoinbaseApiFamily } from "@/lib/exchanges/coinbase/schema"

export type ExchangeProvider = "binance" | "kraken" | "bybit" | "coinbase"

export type ExchangeEnv = "prod" | "sandbox"

// Legacy exchange names - these are maintained for backward compatibility
// New code should use provider + api_family + env instead
// TODO: Deprecate these when all connections have been migrated to new schema
export const LEGACY_EXCHANGE_NAMES = {
  KRAKEN: "kraken",
  BINANCE_US: "binance_us",
  COINBASE: "coinbase", // Legacy - maps to coinbase + advanced_trade
  COINBASE_PRO: "coinbase_pro", // Legacy - maps to coinbase + advanced_trade
  COINBASE_ADVANCED_TRADE: "coinbase_advanced_trade",
  COINBASE_EXCHANGE: "coinbase_exchange",
  COINBASE_APP: "coinbase_app",
  COINBASE_SERVER_WALLET: "coinbase_server_wallet",
  COINBASE_TRADE_API: "coinbase_trade_api",
} as const

export type ExchangeName =
  | "kraken"
  | "binance_us"
  | "coinbase"
  | "coinbase_pro"
  | "coinbase_advanced_trade"
  | "coinbase_exchange"
  | "coinbase_app"
  | "coinbase_server_wallet"
  | "coinbase_trade_api"

export type OrderType = "market" | "limit" | "stop_loss" | "stop_limit" | "trailing_stop"
export type OrderSide = "buy" | "sell"
export type OrderStatus = "pending" | "open" | "partially_filled" | "filled" | "cancelled" | "rejected" | "expired"

export interface ExchangeConnection {
  id: string
  userId: string
  exchangeName: ExchangeName
  apiKeyEncrypted: string
  apiSecretEncrypted: string
  apiPassphraseEncrypted?: string
  isActive: boolean
  isTestnet: boolean
  lastSyncAt?: string
  permissions: {
    read: boolean
    trade: boolean
    withdraw: boolean
  }
  metadata: Record<string, unknown>
  // Coinbase-specific: which API family this connection uses
  coinbaseApiFamily?: CoinbaseApiFamily
  createdAt: string
  updatedAt: string
}

export interface ExchangeCredentials {
  apiKey: string
  apiSecret: string
  apiPassphrase?: string // For Coinbase Pro
}

export type ExchangeConnectionConfig = {
  id: string
  provider: ExchangeProvider
  apiFamily?: CoinbaseApiFamily | string // optional for non-Coinbase
  env: ExchangeEnv
  name: ExchangeName
  credentials: {
    apiKey: string
    apiSecret: string
    apiPassphrase?: string
  }
  metadata?: Record<string, any>
}

export interface ExchangeBalance {
  currency: string
  available: number
  locked: number
  total: number
}

export interface ExchangeTicker {
  symbol: string
  lastPrice: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: string
}

export interface TradingOrder {
  id: string
  userId: string
  exchangeConnectionId?: string
  orderType: OrderType
  side: OrderSide
  symbol: string
  quantity: number
  price?: number
  stopPrice?: number
  filledQuantity: number
  status: OrderStatus
  exchangeOrderId?: string
  totalCost?: number
  fees: number
  averageFillPrice?: number
  executedAt?: string
  cancelledAt?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateOrderParams {
  exchangeConnectionId: string
  orderType: OrderType
  side: OrderSide
  symbol: string
  quantity: number
  price?: number
  stopPrice?: number
}

export interface ExchangeAPIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  exchangeError?: string
}

// Kraken specific types
export interface KrakenOrderRequest {
  pair: string
  type: OrderSide
  ordertype: string // market, limit, stop-loss, etc.
  volume: string
  price?: string
  price2?: string // For stop orders
}

export interface KrakenBalanceResponse {
  [currency: string]: string
}

// Binance US specific types
export interface BinanceUSOrderRequest {
  symbol: string
  side: "BUY" | "SELL"
  type: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_LIMIT"
  quantity: string
  price?: string
  stopPrice?: string
  timeInForce?: "GTC" | "IOC" | "FOK"
}

export interface BinanceUSBalanceResponse {
  asset: string
  free: string
  locked: string
}

// Coinbase specific types
export interface CoinbaseOrderRequest {
  product_id: string
  side: "buy" | "sell"
  type: "market" | "limit"
  size: string
  price?: string
  stop?: "loss" | "entry"
  stop_price?: string
}

export interface CoinbaseBalance {
  currency: string
  available: string
  hold: string
}

export type WalletType = "metamask" | "walletconnect" | "coinbase_wallet" | "phantom" | "trust_wallet"

export interface WalletConnection {
  id: string
  userId: string
  walletType: WalletType
  walletAddress: string
  chainId: number
  chainName: string
  isPrimary: boolean
  balanceUsd: number
  lastSyncedAt?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrl: string
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://etherscan.io",
  },
  56: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorerUrl: "https://bscscan.com",
  },
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrl: "https://polygonscan.com",
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://arbiscan.io",
  },
  10: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
}
