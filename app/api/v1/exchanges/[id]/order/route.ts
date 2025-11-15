// API endpoint to create orders on connected exchanges
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

    const body = await request.json()
    const { orderType, side, symbol, quantity, price, stopPrice } = body

    if (!orderType || !side || !symbol || !quantity) {
      return NextResponse.json({ error: "Order type, side, symbol, and quantity are required" }, { status: 400 })
    }

    // Fetch exchange connection
    const { data: connection, error: connectionError } = await supabase
      .from("exchange_connections")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: "Exchange connection not found" }, { status: 404 })
    }

    if (!connection.permissions?.trade) {
      return NextResponse.json({ error: "Trading permission not enabled for this connection" }, { status: 403 })
    }

    // Create order in database first
    const { data: orderRecord, error: orderError } = await supabase
      .from("trading_orders")
      .insert({
        user_id: user.id,
        exchange_connection_id: connection.id,
        order_type: orderType,
        side,
        symbol,
        quantity,
        price,
        stop_price: stopPrice,
        status: "pending",
      })
      .select()
      .single()

    if (orderError) throw orderError

    try {
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

      // Place order on exchange
      const exchangeOrder = await client.createOrder({
        symbol,
        side: side.toUpperCase(),
        type: orderType.toUpperCase(),
        quantity,
        price,
      } as any)

      // Update order with exchange order ID
      await supabase
        .from("trading_orders")
        .update({
          exchange_order_id: exchangeOrder.orderId,
          status: "open",
        })
        .eq("id", orderRecord.id)

      return NextResponse.json({
        success: true,
        data: {
          orderId: orderRecord.id,
          exchangeOrderId: exchangeOrder.orderId,
          status: "open",
        },
      })
    } catch (exchangeError) {
      // Update order status to rejected
      await supabase.from("trading_orders").update({ status: "rejected" }).eq("id", orderRecord.id)

      throw exchangeError
    }
  } catch (error) {
    console.error("[v0] Error creating exchange order:", error)
    return NextResponse.json({ error: "Failed to create order on exchange" }, { status: 500 })
  }
}
