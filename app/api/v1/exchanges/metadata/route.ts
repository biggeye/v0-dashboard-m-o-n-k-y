import { NextResponse } from "next/server"
import type {
  ExchangeProvider,
  ExchangeEnv,
  AuthType,
  ExchangeCapabilities,
} from "@/lib/types/exchange-client"
import {
  CoinbaseApiFamily,
  coinbaseApis,
  coinbaseSandboxApis,
  type CoinbaseApiConfig,
} from "@/lib/exchanges/coinbase/schema"

// ISR: Revalidate every 1 hour (3600 seconds)
export const revalidate = 3600

export interface ExchangeConnectionTemplate {
  provider: ExchangeProvider
  apiFamily: string
  envs: ExchangeEnv[]
  authType: AuthType
  requiredFields: string[]
  capabilities: ExchangeCapabilities
}

export interface ExchangeMetadataResponse {
  templates: ExchangeConnectionTemplate[]
}

// Map CoinbaseApiConfig capabilities to ExchangeCapabilities
function mapCoinbaseCapabilities(cfg: CoinbaseApiConfig): ExchangeCapabilities {
  return {
    read: cfg.capabilities.restMarketData || cfg.capabilities.custodialBalances,
    trade_spot: cfg.capabilities.spotTrading,
    trade_derivatives: cfg.capabilities.derivativesTrading,
    withdraw: cfg.capabilities.fiatOnOffRamp || cfg.capabilities.onchainSwaps,
    onchain: cfg.capabilities.onchainSwaps || cfg.capabilities.nonCustodialWallet,
  }
}

// Map Coinbase auth strategy to AuthType
function mapCoinbaseAuthType(auth: string): AuthType {
  switch (auth) {
    case "cdp_jwt":
      return "jwt_service"
    case "oauth":
      return "oauth"
    case "legacy_api_key":
      return "api_key"
    default:
      return "api_key"
  }
}

// Get required fields based on auth type and provider
function getRequiredFields(provider: ExchangeProvider, authType: AuthType, apiFamily?: string): string[] {
  if (authType === "none") {
    return []
  }

  if (authType === "oauth") {
    return []
  }

  // JWT service (Coinbase CDP format)
  if (authType === "jwt_service") {
    return ["jwtKeyName", "jwtPrivateKey"]
  }

  // API key auth
  const baseFields = ["apiKey", "apiSecret"]
  
  // Coinbase Exchange (legacy) requires passphrase
  if (provider === "coinbase" && apiFamily === "exchange") {
    return [...baseFields, "apiPassphrase"]
  }

  return baseFields
}

/**
 * GET /api/v1/exchanges/metadata
 * Returns exchange provider templates and capabilities
 * ISR cached for 1 hour
 */
export async function GET() {
  try {
    const templates: ExchangeConnectionTemplate[] = []

    // Coinbase providers - group by family and aggregate environments
    const coinbaseFamilies = new Map<string, { prod?: CoinbaseApiConfig; sandbox?: CoinbaseApiConfig }>()

    // Process prod configs
    for (const cfg of coinbaseApis) {
      const family = cfg.family
      if (!coinbaseFamilies.has(family)) {
        coinbaseFamilies.set(family, {})
      }
      coinbaseFamilies.get(family)!.prod = cfg
    }

    // Process sandbox configs
    for (const cfg of coinbaseSandboxApis) {
      const family = cfg.family
      if (!coinbaseFamilies.has(family)) {
        coinbaseFamilies.set(family, {})
      }
      coinbaseFamilies.get(family)!.sandbox = cfg
    }

    // Create templates for each Coinbase family
    for (const [family, configs] of coinbaseFamilies.entries()) {
      const prod = configs.prod
      const sandbox = configs.sandbox
      
      // Use prod config as base, fallback to sandbox if no prod
      const baseConfig = prod || sandbox
      if (!baseConfig) continue

      const envs: ExchangeEnv[] = []
      if (prod) envs.push("prod")
      if (sandbox) envs.push("sandbox")
      if (envs.length === 0) continue

      templates.push({
        provider: "coinbase",
        apiFamily: family,
        envs,
        authType: mapCoinbaseAuthType(baseConfig.auth),
        requiredFields: getRequiredFields("coinbase", mapCoinbaseAuthType(baseConfig.auth), family),
        capabilities: mapCoinbaseCapabilities(baseConfig),
      })
    }

    // Binance US
    templates.push({
      provider: "binance",
      apiFamily: "us",
      envs: ["prod", "sandbox"],
      authType: "api_key",
      requiredFields: getRequiredFields("binance", "api_key"),
      capabilities: {
        read: true,
        trade_spot: true,
        trade_derivatives: false,
        withdraw: true,
        onchain: false,
      },
    })

    // Kraken
    templates.push({
      provider: "kraken",
      apiFamily: "standard",
      envs: ["prod", "sandbox"],
      authType: "api_key",
      requiredFields: getRequiredFields("kraken", "api_key"),
      capabilities: {
        read: true,
        trade_spot: true,
        trade_derivatives: true,
        withdraw: true,
        onchain: false,
      },
    })

    // Bybit
    templates.push({
      provider: "bybit",
      apiFamily: "standard",
      envs: ["prod", "sandbox"],
      authType: "api_key",
      requiredFields: getRequiredFields("bybit", "api_key"),
      capabilities: {
        read: true,
        trade_spot: true,
        trade_derivatives: true,
        withdraw: true,
        onchain: false,
      },
    })

    // Simulation / Paper Trading
    templates.push({
      provider: "simulation",
      apiFamily: "paper",
      envs: ["sandbox"],
      authType: "none",
      requiredFields: getRequiredFields("simulation", "none"),
      capabilities: {
        read: true,
        trade_spot: true,
        trade_derivatives: true,
        withdraw: false,
        onchain: false,
      },
    })

    return NextResponse.json({ templates } satisfies ExchangeMetadataResponse)
  } catch (error) {
    console.error("[v0] Error fetching exchange metadata:", error)
    return NextResponse.json(
      { error: "Failed to fetch exchange metadata" },
      { status: 500 }
    )
  }
}

