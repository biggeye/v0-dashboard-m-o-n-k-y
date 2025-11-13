// API endpoint to connect and test exchange credentials
import { createClient } from "@/lib/supabase/server"
import { ExchangeFactory, encryptApiKey } from "@/lib/exchanges/exchange-factory"
import { type NextRequest, NextResponse } from "next/server"
import type { ExchangeName } from "@/lib/types/exchange"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { exchangeName, apiKey, apiSecret, apiPassphrase, isTestnet } = body

    if (!exchangeName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Exchange name, API key, and API secret are required" }, { status: 400 })
    }

    // Test connection before saving
    const connectionSuccess = await ExchangeFactory.testConnection(
      exchangeName as ExchangeName,
      { apiKey, apiSecret, apiPassphrase },
      isTestnet || false,
    )

    if (!connectionSuccess) {
      return NextResponse.json(
        { error: "Failed to connect to exchange. Please check your credentials." },
        { status: 400 },
      )
    }

    // Encrypt credentials
    const apiKeyEncrypted = encryptApiKey(apiKey)
    const apiSecretEncrypted = encryptApiKey(apiSecret)
    const apiPassphraseEncrypted = apiPassphrase ? encryptApiKey(apiPassphrase) : null

    // Save to database
    const { data, error } = await supabase
      .from("exchange_connections")
      .upsert({
        user_id: user.id,
        exchange_name: exchangeName,
        api_key_encrypted: apiKeyEncrypted,
        api_secret_encrypted: apiSecretEncrypted,
        api_passphrase_encrypted: apiPassphraseEncrypted,
        is_active: true,
        is_testnet: isTestnet || false,
        last_sync_at: new Date().toISOString(),
        permissions: { read: true, trade: true, withdraw: false },
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error saving exchange connection:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        exchangeName: data.exchange_name,
        isActive: data.is_active,
        isTestnet: data.is_testnet,
      },
    })
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
      .select("id, exchange_name, is_active, is_testnet, last_sync_at, permissions, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error fetching exchange connections:", error)
    return NextResponse.json({ error: "Failed to fetch exchange connections" }, { status: 500 })
  }
}
