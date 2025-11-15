import { createClient } from "@/lib/supabase/server"
import { fetchCryptoPrice } from "@/lib/providers/finnhub"

/**
 * Round timestamp to the nearest interval boundary
 */
function roundTimestampToInterval(
  timestamp: string | Date,
  intervalMinutes: number = 5
): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  const intervalMs = intervalMinutes * 60 * 1000
  const rounded = new Date(Math.floor(date.getTime() / intervalMs) * intervalMs)
  return rounded.toISOString()
}

/**
 * Store price data in token_price_history
 */
export async function storeTokenPriceData(
  tokenId: string,
  symbol: string,
  price: number,
  metadata: {
    marketCap?: number
    volume24h?: number
    change24h?: number
    timestamp?: string
    intervalMinutes?: number
  }
) {
  const supabase = await createClient()

  const intervalMinutes = metadata.intervalMinutes || 5
  const rawTimestamp = metadata.timestamp || new Date().toISOString()
  const roundedTimestamp = roundTimestampToInterval(rawTimestamp, intervalMinutes)

  const { data, error } = await supabase.from("token_price_history").insert({
    token_id: tokenId,
    symbol,
    price,
    market_cap: metadata.marketCap,
    volume_24h: metadata.volume24h,
    change_24h: metadata.change24h,
    timestamp: roundedTimestamp,
  })

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - already exists
      return null
    }
    console.error("Error storing token price data:", error)
    throw error
  }

  return data
}

/**
 * Collect prices for all active tokens in token_index
 * This should be run periodically (e.g., every 5 minutes)
 */
export async function collectPricesForActiveTokens() {
  const supabase = await createClient()
  const finnhubApiKey = process.env.FINNHUB_API_KEY

  if (!finnhubApiKey) {
    console.error("Finnhub API key not configured")
    return { success: false, error: "API key not configured" }
  }

  // Get all active tokens
  const { data: tokens, error } = await supabase
    .from("token_index")
    .select("*")
    .eq("is_active", true)
    .eq("is_validated", true)

  if (error) {
    console.error("Error fetching active tokens:", error)
    return { success: false, error: error.message }
  }

  if (!tokens || tokens.length === 0) {
    return { success: true, collected: 0, message: "No active tokens to collect" }
  }

  let collected = 0
  let errors = 0

  // Collect prices for each token
  for (const token of tokens) {
    try {
      const priceData = await fetchCryptoPrice(token.symbol, finnhubApiKey)

      await storeTokenPriceData(token.id, token.symbol, priceData.price, {
        marketCap: priceData.marketCap,
        volume24h: priceData.volume24h,
        change24h: priceData.change24h,
        intervalMinutes: 5,
      })

      // Update last_price_check
      await supabase
        .from("token_index")
        .update({ last_price_check: new Date().toISOString() })
        .eq("id", token.id)

      collected++
    } catch (error) {
      console.error(`Error collecting price for ${token.symbol}:`, error)
      errors++

      // Mark token as having validation issues if it fails multiple times
      // (Could implement retry logic here)
    }
  }

  return {
    success: true,
    collected,
    errors,
    total: tokens.length,
  }
}

/**
 * Get price history for a token from token_price_history
 */
export async function getTokenPriceHistory(
  symbol: string,
  limit = 100,
  offsetHours = 24
) {
  const supabase = await createClient()

  const since = new Date()
  since.setHours(since.getHours() - offsetHours)

  const { data, error } = await supabase
    .from("token_price_history")
    .select("*")
    .eq("symbol", symbol)
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching token price history:", error)
    throw error
  }

  return data || []
}

/**
 * Get latest price for a token
 */
export async function getLatestTokenPrice(symbol: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("token_price_history")
    .select("*")
    .eq("symbol", symbol)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows
    console.error("Error fetching latest token price:", error)
  }

  return data || null
}

