import { createClient } from "@/lib/supabase/server"

export async function storePriceData(
  symbol: string,
  price: number,
  metadata: {
    marketCap?: number
    volume24h?: number
    change24h?: number
  },
) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("price_history").insert({
    symbol,
    price,
    market_cap: metadata.marketCap,
    volume_24h: metadata.volume24h,
    change_24h: metadata.change24h,
  })

  if (error) {
    console.error("Error storing price data:", error)
    throw error
  }

  return data
}

export async function getPriceHistory(symbol: string, limit = 100, offsetHours = 24) {
  const supabase = await createClient()

  const since = new Date()
  since.setHours(since.getHours() - offsetHours)

  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("symbol", symbol)
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching price history:", error)
    throw error
  }

  return data || []
}

export async function getLatestPrice(symbol: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("symbol", symbol)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows
    console.error("Error fetching latest price:", error)
  }

  return data || null
}
