// API endpoint to test exchange connection
import { createClient } from "@/lib/supabase/server"
import { ExchangeFactory, decryptApiKey } from "@/lib/exchanges/exchange-factory"
import { type NextRequest, NextResponse } from "next/server"
import type { ExchangeName, ExchangeConnectionConfig, ExchangeProvider, ExchangeEnv } from "@/lib/types/exchange"
import { CoinbaseApiFamily } from "@/lib/exchanges/coinbase/schema"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch exchange connection
    const { data: connection, error } = await supabase
      .from("exchange_connections")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error || !connection) {
      return NextResponse.json({ error: "Exchange connection not found" }, { status: 404 })
    }

    // Decrypt credentials
    const apiKey = decryptApiKey(connection.api_key_encrypted)
    const apiSecret = decryptApiKey(connection.api_secret_encrypted)
    const apiPassphrase = connection.api_passphrase_encrypted
      ? decryptApiKey(connection.api_passphrase_encrypted)
      : undefined

    // Build ExchangeConnectionConfig from database row
    // Use new columns if available, fall back to inference for backward compatibility
    const provider = (connection.provider as ExchangeProvider) || 
      (connection.exchange_name?.startsWith('coinbase') ? 'coinbase' :
       connection.exchange_name === 'binance_us' ? 'binance' :
       connection.exchange_name === 'kraken' ? 'kraken' : 'coinbase')
    
    const apiFamily = connection.api_family || 
      ((connection.metadata as any)?.coinbaseApiFamily as string | undefined)
    
    const env = (connection.env as ExchangeEnv) || 
      (connection.is_testnet ? 'sandbox' : 'prod')

    const connectionConfig: ExchangeConnectionConfig = {
      id: connection.id,
      provider,
      apiFamily: provider === 'coinbase' ? (apiFamily as CoinbaseApiFamily) : apiFamily,
      env,
      name: connection.exchange_name as ExchangeName,
      credentials: {
        apiKey,
        apiSecret,
        apiPassphrase,
      },
      metadata: connection.metadata ?? {},
    }

    // Test connection using config-based factory
    const client = ExchangeFactory.createClient(connectionConfig)
    const isConnected = await client.testConnection()

    if (!isConnected) {
      // Update connection status if test fails
      await supabase
        .from("exchange_connections")
        .update({ is_active: false })
        .eq("id", params.id)

      return NextResponse.json(
        { success: false, error: "Connection test failed. Credentials may be invalid." },
        { status: 400 },
      )
    }

    // Update connection status and last sync time on success
    await supabase
      .from("exchange_connections")
      .update({
        is_active: true,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", params.id)

    return NextResponse.json({
      success: true,
      message: "Connection test successful",
    })
  } catch (error: any) {
    console.error("[v0] Error testing exchange connection:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to test exchange connection" },
      { status: 500 },
    )
  }
}

