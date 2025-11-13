// Factory to create exchange clients based on exchange name
import { KrakenClient } from "./kraken-client"
import { BinanceUSClient } from "./binance-us-client"
import { CoinbaseClient } from "./coinbase-client"
import type { ExchangeName, ExchangeCredentials } from "@/lib/types/exchange"

export class ExchangeFactory {
  static createClient(exchangeName: ExchangeName, credentials: ExchangeCredentials, isTestnet = false) {
    switch (exchangeName) {
      case "kraken":
        return new KrakenClient(credentials.apiKey, credentials.apiSecret, isTestnet)

      case "binance_us":
        return new BinanceUSClient(credentials.apiKey, credentials.apiSecret, isTestnet)

      case "coinbase":
        return new CoinbaseClient(
          credentials.apiKey,
          credentials.apiSecret,
          credentials.apiPassphrase || "",
          isTestnet,
          false, // Use regular Coinbase API
        )

      case "coinbase_pro":
        return new CoinbaseClient(
          credentials.apiKey,
          credentials.apiSecret,
          credentials.apiPassphrase || "",
          isTestnet,
          true, // Use Coinbase Pro API
        )

      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`)
    }
  }

  static async testConnection(
    exchangeName: ExchangeName,
    credentials: ExchangeCredentials,
    isTestnet = false,
  ): Promise<boolean> {
    try {
      const client = this.createClient(exchangeName, credentials, isTestnet)
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
