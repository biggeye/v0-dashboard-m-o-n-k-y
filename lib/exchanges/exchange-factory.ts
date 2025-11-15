// Factory to create exchange clients based on exchange name
import { KrakenClient } from "./kraken-client"
import { BinanceUSClient } from "./binance-us-client"
import { CoinbaseClient } from "./coinbase-client"
import type {
  ExchangeName,
  ExchangeCredentials,
  ExchangeConnectionConfig,
  ExchangeProvider,
  ExchangeEnv,
} from "@/lib/types/exchange"
import { CoinbaseApiFamily, getCoinbaseConfig, CoinbaseEnvironment } from "./coinbase/schema"

export class ExchangeFactory {
  // New signature: accepts config object
  static createClient(connection: ExchangeConnectionConfig): KrakenClient | BinanceUSClient | CoinbaseClient
  // Legacy signature: accepts individual parameters
  static createClient(
    exchangeName: ExchangeName,
    credentials: ExchangeCredentials,
    isTestnet?: boolean,
    coinbaseApiFamily?: CoinbaseApiFamily
  ): KrakenClient | BinanceUSClient | CoinbaseClient
  // Implementation
  static createClient(
    arg1: ExchangeName | ExchangeConnectionConfig,
    arg2?: ExchangeCredentials,
    isTestnet = false,
    coinbaseApiFamily?: CoinbaseApiFamily
  ): KrakenClient | BinanceUSClient | CoinbaseClient {
    // New path: config object
    if (typeof arg1 === "object") {
      return this.createFromConfig(arg1)
    }

    // Legacy path: individual parameters
    return this.createFromLegacyArgs(arg1, arg2!, isTestnet, coinbaseApiFamily)
  }

  private static createFromConfig(conn: ExchangeConnectionConfig): KrakenClient | BinanceUSClient | CoinbaseClient {
    switch (conn.provider) {
      case "coinbase":
        return this.createCoinbaseClient(conn)
      case "binance":
        return this.createBinanceClient(conn)
      case "kraken":
        return this.createKrakenClient(conn)
      default:
        throw new Error(`Unsupported provider: ${conn.provider}`)
    }
  }

  private static createFromLegacyArgs(
    exchangeName: ExchangeName,
    credentials: ExchangeCredentials,
    isTestnet = false,
    coinbaseApiFamily?: CoinbaseApiFamily
  ): KrakenClient | BinanceUSClient | CoinbaseClient {
    switch (exchangeName) {
      case "kraken":
        return new KrakenClient(credentials.apiKey, credentials.apiSecret, isTestnet)

      case "binance_us":
        return new BinanceUSClient(credentials.apiKey, credentials.apiSecret, isTestnet)

      case "coinbase":
      case "coinbase_pro":
      case "coinbase_advanced_trade":
      case "coinbase_exchange":
      case "coinbase_app":
      case "coinbase_server_wallet":
      case "coinbase_trade_api": {
        // Determine which Coinbase API to use
        const family = coinbaseApiFamily || this.inferCoinbaseFamily(exchangeName)
        const env = isTestnet ? "sandbox" : "prod"
        const config = getCoinbaseConfig(family, env as any)

        // For now, use the existing CoinbaseClient
        // TODO: Implement separate clients for Advanced Trade, Exchange, etc.
        // Advanced Trade uses CDP JWT auth (name + privateKey)
        // Exchange uses legacy API key auth
        // App uses OAuth or CDP JWT

        if (family === CoinbaseApiFamily.ADVANCED_TRADE || family === CoinbaseApiFamily.EXCHANGE) {
          // Advanced Trade and Exchange support trading
          return new CoinbaseClient(
            credentials.apiKey,
            credentials.apiSecret,
            credentials.apiPassphrase || "",
            isTestnet,
            family === CoinbaseApiFamily.EXCHANGE, // Exchange uses Pro-style API
          )
        } else {
          // App, Server Wallet, Trade API - use basic client for now
          return new CoinbaseClient(
            credentials.apiKey,
            credentials.apiSecret,
            credentials.apiPassphrase || "",
            isTestnet,
            false,
          )
        }
      }

      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`)
    }
  }

  private static createCoinbaseClient(conn: ExchangeConnectionConfig): CoinbaseClient {
    const family = (conn.apiFamily as CoinbaseApiFamily) || CoinbaseApiFamily.ADVANCED_TRADE
    const isSandbox = conn.env === "sandbox"
    const env = isSandbox ? CoinbaseEnvironment.SANDBOX : CoinbaseEnvironment.PROD
    const config = getCoinbaseConfig(family, env)

    if (family === CoinbaseApiFamily.ADVANCED_TRADE || family === CoinbaseApiFamily.EXCHANGE) {
      // Advanced Trade and Exchange support trading
      return new CoinbaseClient(
        conn.credentials.apiKey,
        conn.credentials.apiSecret,
        conn.credentials.apiPassphrase || "",
        isSandbox,
        family === CoinbaseApiFamily.EXCHANGE, // Exchange uses Pro-style API
      )
    } else {
      // App, Server Wallet, Trade API - use basic client for now
      return new CoinbaseClient(
        conn.credentials.apiKey,
        conn.credentials.apiSecret,
        conn.credentials.apiPassphrase || "",
        isSandbox,
        false,
      )
    }
  }

  private static createBinanceClient(conn: ExchangeConnectionConfig): BinanceUSClient {
    const isSandbox = conn.env === "sandbox"
    return new BinanceUSClient(conn.credentials.apiKey, conn.credentials.apiSecret, isSandbox)
  }

  private static createKrakenClient(conn: ExchangeConnectionConfig): KrakenClient {
    const isSandbox = conn.env === "sandbox"
    return new KrakenClient(conn.credentials.apiKey, conn.credentials.apiSecret, isSandbox)
  }

  private static inferCoinbaseFamily(exchangeName: ExchangeName): CoinbaseApiFamily {
    switch (exchangeName) {
      case "coinbase_advanced_trade":
        return CoinbaseApiFamily.ADVANCED_TRADE
      case "coinbase_exchange":
        return CoinbaseApiFamily.EXCHANGE
      case "coinbase_app":
        return CoinbaseApiFamily.APP
      case "coinbase_server_wallet":
        return CoinbaseApiFamily.SERVER_WALLET
      case "coinbase_trade_api":
        return CoinbaseApiFamily.TRADE_API
      case "coinbase_pro":
        return CoinbaseApiFamily.ADVANCED_TRADE // Legacy Pro maps to Advanced Trade
      case "coinbase":
      default:
        return CoinbaseApiFamily.ADVANCED_TRADE // Default to Advanced Trade
    }
  }

  static async testConnection(
    exchangeName: ExchangeName,
    credentials: ExchangeCredentials,
    isTestnet = false,
    coinbaseApiFamily?: CoinbaseApiFamily
  ): Promise<boolean> {
    try {
      const client = this.createClient(exchangeName, credentials, isTestnet, coinbaseApiFamily)
      return await client.testConnection()
    } catch (error) {
      console.error(`[v0] ${exchangeName} connection test failed:`, error)
      return false
    }
  }
}

// Helper to encrypt sensitive data (placeholder - use proper encryption in production)
export function encryptApiKey(apiKey: string): string {
  // In production, use proper encryption with a secret key
  // For now, we'll use base64 encoding as a placeholder
  return Buffer.from(apiKey).toString("base64")
}

export function decryptApiKey(encryptedKey: string): string {
  // In production, use proper decryption
  return Buffer.from(encryptedKey, "base64").toString("utf-8")
}
