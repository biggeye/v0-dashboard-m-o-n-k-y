// API endpoint to fetch balances from connected exchange
import { createClient } from "@/lib/supabase/server"
import { ExchangeFactory, decryptApiKey } from "@/lib/exchanges/exchange-factory"
import { type NextRequest, NextResponse } from "next/server"
import type { ExchangeName, ExchangeConnectionConfig, ExchangeProvider, ExchangeEnv } from "@/lib/types/exchange"
import { CoinbaseApiFamily } from "@/lib/exchanges/coinbase/schema"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Create exchange client using config-based factory
    const client = ExchangeFactory.createClient(connectionConfig)

    const balances = await client.getBalance()

    // Update portfolio holdings in database
    for (const balance of balances) {
      if (balance.total > 0) {
        await supabase.from("portfolio_holdings").upsert({
          user_id: user.id,
          symbol: balance.currency,
          quantity: balance.total,
          average_buy_price: 0, // Will need to calculate from transaction history
          total_invested: 0,
          source: connection.exchange_name,
          source_type: "exchange",
          exchange_connection_id: connection.id,
          last_synced_at: new Date().toISOString(),
        })
      }
    }

    // Update last sync time
    await supabase.from("exchange_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", params.id)

    return NextResponse.json({ data: balances })
  } catch (error) {
    console.error("[v0] Error fetching exchange balance:", error)
    return NextResponse.json({ error: "Failed to fetch balance from exchange" }, { status: 500 })
  }
}
