// Client-side types for exchange connections
// These types match the API response from /api/v1/exchanges/connect
// This interface represents the most complex possible connection type

export type ExchangeProvider = "coinbase" | "binance" | "kraken" | "bybit" | "simulation"

export type ExchangeEnv = "prod" | "sandbox"

export type AuthType = "api_key" | "oauth" | "jwt_service" | "none" // 'none' = simulation

export interface ExchangeCapabilities {
  read: boolean
  trade_spot: boolean
  trade_derivatives: boolean
  withdraw: boolean
  onchain: boolean
}

export type ExchangeConnectionStatus = "connected" | "pending_oauth" | "error" | "disabled"

export interface ExchangeConnectionTemplate {
  provider: ExchangeProvider
  apiFamily: string
  envs: ExchangeEnv[]
  authType: AuthType
  requiredFields: string[] // form fields for api_key flow
  capabilities: ExchangeCapabilities
}

export interface ExchangeConnection {
  id: string
  provider: ExchangeProvider
  apiFamily: string
  env: ExchangeEnv
  exchangeKey: string // Maps to database id (primary key)
  authType: AuthType
  capabilities: ExchangeCapabilities
  isActive: boolean
  status: ExchangeConnectionStatus
  displayName?: string
  metadata?: Record<string, any> // debug / raw config
  // Legacy fields for backward compatibility (may be present in API responses)
  exchange_name?: string
  is_testnet?: boolean
  last_sync_at?: string
  created_at?: string
  permissions?: {
    read: boolean
    trade: boolean
    withdraw: boolean
  }
}

