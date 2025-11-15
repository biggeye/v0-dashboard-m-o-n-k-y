// API endpoint to connect and test exchange credentials
// POST /api/v1/exchanges/connect
// GET /api/v1/exchanges/connect

import { createClient } from "@/lib/supabase/server"
import { ExchangeFactory, encryptApiKey } from "@/lib/exchanges/exchange-factory"
import { type NextRequest, NextResponse } from "next/server"
import type { ExchangeName } from "@/lib/types/exchange"
import type {
  ExchangeConnection,
  ExchangeProvider,
  ExchangeEnv,
  AuthType,
  ExchangeCapabilities,
  ExchangeConnectionStatus,
} from "@/lib/types/exchange-client"
import { validateApiKeyFormat, sanitizeApiKey, sanitizePrivateKey } from "@/lib/utils/api-key-validation"
import { CoinbaseApiFamily } from "@/lib/exchanges/coinbase/schema"
import { getCoinbaseConfig, CoinbaseEnvironment } from "@/lib/exchanges/coinbase/schema"

// Request types
export interface CreateExchangeConnectionRequest {
  provider: ExchangeProvider
  apiFamily: string
  env: ExchangeEnv
  authType: AuthType // must match template for that provider/family
  label?: string // user-facing name for the connection

  auth: {
    // api key flow
    apiKey?: string
    apiSecret?: string
    apiPassphrase?: string

    // oauth flow (later)
    oauthRedirectUri?: string
    oauthScopes?: string[]

    // jwt service (Coinbase CDP style)
    jwtKeyName?: string
    jwtPrivateKey?: string
  }
}

export interface CreateExchangeConnectionResponse {
  connection: ExchangeConnection
  // For oauth flows:
  oauthUrl?: string
}

// Helper to get capabilities from provider template
// In a real implementation, you'd fetch from /api/v1/exchanges/providers
// For now, we'll derive them based on provider/apiFamily
function getCapabilitiesForProvider(
  provider: ExchangeProvider,
  apiFamily: string,
): ExchangeCapabilities {
  // Default capabilities
  const defaultCaps: ExchangeCapabilities = {
    read: true,
    trade_spot: false,
    trade_derivatives: false,
    withdraw: false,
    onchain: false,
  }

  if (provider === "simulation") {
    return {
      read: true,
      trade_spot: true,
      trade_derivatives: true,
      withdraw: false,
      onchain: false,
    }
  }

  if (provider === "coinbase") {
    try {
      const env = CoinbaseEnvironment.PROD // Use prod for capability lookup
      const family = apiFamily as CoinbaseApiFamily
      const config = getCoinbaseConfig(family, env)
      return {
        read: config.capabilities.restMarketData || config.capabilities.custodialBalances,
        trade_spot: config.capabilities.spotTrading,
        trade_derivatives: config.capabilities.derivativesTrading,
        withdraw: config.capabilities.fiatOnOffRamp || config.capabilities.onchainSwaps,
        onchain: config.capabilities.onchainSwaps || config.capabilities.nonCustodialWallet,
      }
    } catch {
      // Fallback to defaults if config not found
      return defaultCaps
    }
  }

  if (provider === "binance") {
    return {
      read: true,
      trade_spot: true,
      trade_derivatives: false, // Binance US doesn't support futures
      withdraw: true,
      onchain: false,
    }
  }

  if (provider === "kraken") {
    return {
      read: true,
      trade_spot: true,
      trade_derivatives: true,
      withdraw: true,
      onchain: false,
    }
  }

  if (provider === "bybit") {
    return {
      read: true,
      trade_spot: true,
      trade_derivatives: true,
      withdraw: true,
      onchain: false,
    }
  }

  return defaultCaps
}

// Helper to generate OAuth URL (placeholder - implement based on provider)
function generateOAuthUrl(
  provider: ExchangeProvider,
  redirectUri: string,
  scopes?: string[],
): string {
  // TODO: Implement actual OAuth URL generation per provider
  // For Coinbase: https://www.coinbase.com/oauth/authorize?client_id=...&redirect_uri=...&scope=...
  // For now, return a placeholder
  const baseUrl =
    provider === "coinbase"
      ? "https://www.coinbase.com/oauth/authorize"
      : `https://${provider}.com/oauth/authorize`

  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes?.join(" ") || "wallet:accounts:read",
  })

  return `${baseUrl}?${params.toString()}`
}

// Helper to convert legacy exchange_name to provider/apiFamily
function getLegacyExchangeName(provider: ExchangeProvider, apiFamily: string): string {
  if (provider === "coinbase") {
    if (apiFamily === "advanced_trade") return "coinbase_advanced_trade"
    if (apiFamily === "exchange") return "coinbase_exchange"
    if (apiFamily === "app") return "coinbase_app"
    if (apiFamily === "server_wallet") return "coinbase_server_wallet"
    if (apiFamily === "trade_api") return "coinbase_trade_api"
    return "coinbase_advanced_trade" // default
  }
  if (provider === "binance") return "binance_us"
  if (provider === "kraken") return "kraken"
  return provider
}

// Helper to map database row to ExchangeConnection
function mapDbRowToConnection(row: any): ExchangeConnection {
  return {
    id: row.id,
    provider: row.provider,
    apiFamily: row.api_family || "",
    env: row.env,
    exchangeKey: row.id, // Maps to database id
    authType: row.auth_type || "api_key",
    capabilities: row.capabilities || {
      read: true,
      trade_spot: false,
      trade_derivatives: false,
      withdraw: false,
      onchain: false,
    },
    isActive: row.is_active,
    status: row.status || (row.is_active ? "connected" : "disabled"),
    displayName: row.display_name || undefined,
    metadata: row.metadata || {},
    // Legacy fields for backward compatibility
    exchange_name: row.exchange_name,
    is_testnet: row.is_testnet,
    last_sync_at: row.last_sync_at,
    created_at: row.created_at,
    permissions: row.permissions,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateExchangeConnectionRequest = await request.json()
    const { provider, apiFamily, env, authType, label, auth } = body

    // Validate required fields
    if (!provider || !apiFamily || !env || !authType) {
      return NextResponse.json(
        { error: "Provider, apiFamily, env, and authType are required" },
        { status: 400 },
      )
    }

    // Get capabilities for this provider/apiFamily
    const capabilities = getCapabilitiesForProvider(provider, apiFamily)

    // Handle different auth types
    let status: ExchangeConnectionStatus = "connected"
    let apiKeyEncrypted: string | null = null
    let apiSecretEncrypted: string | null = null
    let apiPassphraseEncrypted: string | null = null
    let connectionSuccess = true
    let oauthUrl: string | undefined

    if (authType === "api_key") {
      // Require apiKey + apiSecret
      if (!auth.apiKey || !auth.apiSecret) {
        return NextResponse.json(
          { error: "API key and API secret are required for api_key auth type" },
          { status: 400 },
        )
      }

      // Sanitize and validate credentials
      let apiKey = sanitizeApiKey(auth.apiKey)
      const isPemKey = auth.apiSecret.includes("BEGIN") && auth.apiSecret.includes("PRIVATE KEY")
      let apiSecret = isPemKey ? sanitizePrivateKey(auth.apiSecret) : sanitizeApiKey(auth.apiSecret)
      let apiPassphrase = auth.apiPassphrase ? sanitizeApiKey(auth.apiPassphrase) : undefined

      // Get legacy exchange name for validation
      const exchangeName = getLegacyExchangeName(provider, apiFamily)

      // Validate format
      const validation = validateApiKeyFormat(exchangeName, apiKey, apiSecret, apiPassphrase)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error || "Invalid API key format" },
          { status: 400 },
        )
      }

      // Use sanitized values
      apiKey = validation.sanitized.apiKey
      apiSecret = validation.sanitized.apiSecret
      apiPassphrase = validation.sanitized.apiPassphrase

      // Test connection before saving
      const coinbaseApiFamily =
        provider === "coinbase" ? (apiFamily as CoinbaseApiFamily) : undefined
      const isTestnet = env === "sandbox"

      connectionSuccess = await ExchangeFactory.testConnection(
        exchangeName as ExchangeName,
        { apiKey, apiSecret, apiPassphrase },
        isTestnet,
        coinbaseApiFamily,
      )

      if (!connectionSuccess) {
        status = "error"
        return NextResponse.json(
          {
            error: "Failed to connect to exchange. Please check your credentials.",
            connection: {
              id: "", // Will be set after creation
              provider,
              apiFamily,
              env,
              exchangeKey: "",
              authType,
              capabilities,
              isActive: false,
              status: "error",
              displayName: label,
            } as ExchangeConnection,
          },
          { status: 400 },
        )
      }

      // Encrypt credentials
      apiKeyEncrypted = encryptApiKey(apiKey)
      apiSecretEncrypted = encryptApiKey(apiSecret)
      apiPassphraseEncrypted = apiPassphrase ? encryptApiKey(apiPassphrase) : null
    } else if (authType === "jwt_service") {
      // JWT service (Coinbase CDP) - handle jwtKeyName and jwtPrivateKey
      if (!auth.jwtKeyName || !auth.jwtPrivateKey) {
        return NextResponse.json(
          { error: "jwtKeyName and jwtPrivateKey are required for jwt_service auth type" },
          { status: 400 },
        )
      }

      // JWT service uses name as apiKey and privateKey as apiSecret
      let apiKey = sanitizeApiKey(auth.jwtKeyName)
      let apiSecret = sanitizePrivateKey(auth.jwtPrivateKey)

      // Validate format
      const exchangeName = getLegacyExchangeName(provider, apiFamily)
      const validation = validateApiKeyFormat(exchangeName, apiKey, apiSecret)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error || "Invalid JWT key format" },
          { status: 400 },
        )
      }

      apiKey = validation.sanitized.apiKey
      apiSecret = validation.sanitized.apiSecret

      // Test connection
      const coinbaseApiFamily =
        provider === "coinbase" ? (apiFamily as CoinbaseApiFamily) : undefined
      const isTestnet = env === "sandbox"

      connectionSuccess = await ExchangeFactory.testConnection(
        exchangeName as ExchangeName,
        { apiKey, apiSecret },
        isTestnet,
        coinbaseApiFamily,
      )

      if (!connectionSuccess) {
        status = "error"
        return NextResponse.json(
          {
            error: "Failed to connect to exchange. Please check your credentials.",
            connection: {
              id: "",
              provider,
              apiFamily,
              env,
              exchangeKey: "",
              authType,
              capabilities,
              isActive: false,
              status: "error",
              displayName: label,
            } as ExchangeConnection,
          },
          { status: 400 },
        )
      }

      // Encrypt credentials
      apiKeyEncrypted = encryptApiKey(apiKey)
      apiSecretEncrypted = encryptApiKey(apiSecret)
    } else if (authType === "oauth") {
      // OAuth flow - create pending connection
      status = "pending_oauth"

      if (!auth.oauthRedirectUri) {
        return NextResponse.json(
          { error: "oauthRedirectUri is required for oauth auth type" },
          { status: 400 },
        )
      }

      // Generate OAuth URL
      oauthUrl = generateOAuthUrl(provider, auth.oauthRedirectUri, auth.oauthScopes)

      // Store OAuth metadata for callback
      // Credentials will be set after OAuth callback completes
    } else if (authType === "none") {
      // Simulation - no credentials needed
      if (provider !== "simulation") {
        return NextResponse.json(
          { error: "authType 'none' is only valid for simulation provider" },
          { status: 400 },
        )
      }
      // No credentials to encrypt
    } else {
      return NextResponse.json({ error: `Unsupported auth type: ${authType}` }, { status: 400 })
    }

    // Get legacy exchange name for database
    const exchangeName = getLegacyExchangeName(provider, apiFamily)

    // Save to database
    const { data, error } = await supabase
      .from("exchange_connections")
      .upsert({
        user_id: user.id,
        exchange_name: exchangeName, // Legacy field
        provider,
        api_family: apiFamily,
        env,
        auth_type: authType,
        status,
        display_name: label || null,
        api_key_encrypted: apiKeyEncrypted,
        api_secret_encrypted: apiSecretEncrypted,
        api_passphrase_encrypted: apiPassphraseEncrypted,
        is_active: status === "connected",
        is_testnet: env === "sandbox", // Legacy field
        last_sync_at: status === "connected" ? new Date().toISOString() : null,
        capabilities,
        permissions: {
          // Legacy permissions derived from capabilities
          read: capabilities.read,
          trade: capabilities.trade_spot || capabilities.trade_derivatives,
          withdraw: capabilities.withdraw,
        },
        metadata: {
          // Store OAuth info if applicable
          ...(authType === "oauth" && {
            oauthRedirectUri: auth.oauthRedirectUri,
            oauthScopes: auth.oauthScopes,
          }),
        },
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error saving exchange connection:", error)
      throw error
    }

    const connection = mapDbRowToConnection(data)

    const response: CreateExchangeConnectionResponse = {
      connection,
    }

    if (oauthUrl) {
      response.oauthUrl = oauthUrl
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Exchange connection error:", error)
    return NextResponse.json({ error: "Failed to connect exchange" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("exchange_connections")
      .select(
        "id, exchange_name, is_active, is_testnet, last_sync_at, permissions, created_at, provider, api_family, env, auth_type, status, display_name, capabilities, metadata",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    const connections: ExchangeConnection[] = data.map(mapDbRowToConnection)

    return NextResponse.json({ data: connections })
  } catch (error) {
    console.error("[v0] Error fetching exchange connections:", error)
    return NextResponse.json({ error: "Failed to fetch exchange connections" }, { status: 500 })
  }
}
