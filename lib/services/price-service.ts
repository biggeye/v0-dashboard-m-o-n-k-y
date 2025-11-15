import { createClient } from "@/lib/supabase/server"

/**
 * Round timestamp to the nearest interval boundary
 * @param timestamp - ISO timestamp string or Date
 * @param intervalMinutes - Interval in minutes (e.g., 1, 5, 15, 60)
 * @returns ISO timestamp string rounded to interval boundary
 */
function roundTimestampToInterval(
  timestamp: string | Date,
  intervalMinutes: number = 5
): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  const intervalMs = intervalMinutes * 60 * 1000
  
  // Round down to the nearest interval boundary
  const rounded = new Date(Math.floor(date.getTime() / intervalMs) * intervalMs)
  
  return rounded.toISOString()
}

export async function storePriceData(
  symbol: string,
  price: number,
  metadata: {
    marketCap?: number
    volume24h?: number
    change24h?: number
    timestamp?: string
    intervalMinutes?: number // Optional: interval to round timestamp to (default: 5)
  },
) {
  const supabase = await createClient()
  
  // Round timestamp to interval boundary to prevent duplicates and irregular intervals
  const intervalMinutes = metadata.intervalMinutes || 5
  const rawTimestamp = metadata.timestamp || new Date().toISOString()
  const roundedTimestamp = roundTimestampToInterval(rawTimestamp, intervalMinutes)

  const { data, error } = await supabase.from("price_history").insert({
    symbol,
    price,
    market_cap: metadata.marketCap,
    volume_24h: metadata.volume24h,
    change_24h: metadata.change24h,
    timestamp: roundedTimestamp,
  })

  if (error) {
    // If it's a unique constraint violation, that's okay - we already have this timestamp
    if (error.code === "23505") {
      return null
    }
    console.error("Error storing price data:", error)
    throw error
  }

  return data
}

/**
 * Store multiple price data points (for backfilling)
 */
export async function storePriceDataBatch(
  priceData: Array<{
    symbol: string
    price: number
    timestamp: string
    marketCap?: number
    volume24h?: number
    change24h?: number
    intervalMinutes?: number
  }>,
  defaultIntervalMinutes: number = 5
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("price_history")
    .insert(
      priceData.map((p) => {
        const intervalMinutes = p.intervalMinutes || defaultIntervalMinutes
        const roundedTimestamp = roundTimestampToInterval(p.timestamp, intervalMinutes)
        return {
          symbol: p.symbol,
          price: p.price,
          market_cap: p.marketCap,
          volume_24h: p.volume24h,
          change_24h: p.change24h,
          timestamp: roundedTimestamp,
        }
      })
    )
    .select()

  if (error) {
    // If it's a unique constraint violation, try inserting one by one to skip duplicates
    if (error.code === "23505") {
      const results: any[] = []
      for (const p of priceData) {
        try {
          const result = await storePriceData(p.symbol, p.price, {
            marketCap: p.marketCap,
            volume24h: p.volume24h,
            change24h: p.change24h,
            timestamp: p.timestamp,
            intervalMinutes: p.intervalMinutes || defaultIntervalMinutes,
          })
          if (result) results.push(result)
        } catch (e) {
          // Skip duplicates
        }
      }
      return results
    }
    console.error("Error storing price data batch:", error)
    throw error
  }

  return data || []
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

/**
 * Detect gaps in price history for a symbol
 * @param symbol - Crypto symbol
 * @param intervalMinutes - Expected interval in minutes (e.g., 1, 5, 15, 60)
 * @param lookbackHours - How many hours to look back (default: 24)
 * @returns Array of gap ranges { start, end } in ISO timestamps
 */
export async function detectGaps(
  symbol: string,
  intervalMinutes: number = 5,
  lookbackHours: number = 24
): Promise<Array<{ start: string; end: string }>> {
  const supabase = await createClient()

  const since = new Date()
  since.setHours(since.getHours() - lookbackHours)

  // Get all price points for this symbol in the lookback period
  const { data, error } = await supabase
    .from("price_history")
    .select("timestamp")
    .eq("symbol", symbol)
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true })

  if (error) {
    console.error("Error detecting gaps:", error)
    throw error
  }

  if (!data || data.length === 0) {
    // No data at all - entire period is a gap
    return [
      {
        start: since.toISOString(),
        end: new Date().toISOString(),
      },
    ]
  }

  const gaps: Array<{ start: string; end: string }> = []
  const intervalMs = intervalMinutes * 60 * 1000

  // Check for gap at the beginning
  const firstTimestamp = new Date(data[0].timestamp).getTime()
  const expectedStart = Math.floor(since.getTime() / intervalMs) * intervalMs
  if (firstTimestamp - expectedStart > intervalMs * 1.5) {
    // More than 1.5 intervals before first data point
    gaps.push({
      start: new Date(expectedStart).toISOString(),
      end: data[0].timestamp,
    })
  }

  // Check for gaps between data points
  for (let i = 0; i < data.length - 1; i++) {
    const currentTime = new Date(data[i].timestamp).getTime()
    const nextTime = new Date(data[i + 1].timestamp).getTime()
    const gap = nextTime - currentTime

    if (gap > intervalMs * 1.5) {
      // Gap detected - more than 1.5x the expected interval
      const gapStart = new Date(currentTime + intervalMs)
      const gapEnd = new Date(nextTime - intervalMs)
      gaps.push({
        start: gapStart.toISOString(),
        end: gapEnd.toISOString(),
      })
    }
  }

  // Check for gap at the end (if latest data is more than 1.5 intervals old)
  const lastTimestamp = new Date(data[data.length - 1].timestamp).getTime()
  const now = Date.now()
  if (now - lastTimestamp > intervalMs * 1.5) {
    gaps.push({
      start: new Date(lastTimestamp + intervalMs).toISOString(),
      end: new Date().toISOString(),
    })
  }

  return gaps
}

/**
 * Backfill gaps in price history using Finnhub candle data
 * @param symbol - Crypto symbol
 * @param intervalMinutes - Interval to backfill (must match Finnhub resolution: 1, 5, 15, 30, 60)
 * @param gaps - Array of gap ranges to fill
 * @param apiKey - Finnhub API key
 */
export async function backfillGaps(
  symbol: string,
  intervalMinutes: number,
  gaps: Array<{ start: string; end: string }>,
  apiKey: string
): Promise<number> {
  if (gaps.length === 0) {
    return 0
  }

  // Check if Finnhub subscription/candle endpoint is enabled
  // Candle endpoint requires paid subscription - disable by default
  const finnhubSubscriptionEnabled = process.env.FINNHUB_SUBSCRIPTION_ENABLED === "true"
  
  if (!finnhubSubscriptionEnabled) {
    console.log(
      `Skipping backfill for ${symbol}: Finnhub candle endpoint requires subscription. ` +
      `Set FINNHUB_SUBSCRIPTION_ENABLED=true to enable.`
    )
    return 0
  }

  // Map interval minutes to Finnhub resolution
  const resolutionMap: Record<number, "1" | "5" | "15" | "30" | "60"> = {
    1: "1",
    5: "5",
    15: "15",
    30: "30",
    60: "60",
  }

  const resolution = resolutionMap[intervalMinutes]
  if (!resolution) {
    throw new Error(
      `Unsupported interval: ${intervalMinutes} minutes. Supported: 1, 5, 15, 30, 60`
    )
  }

  const { fetchCryptoCandles } = await import("@/lib/providers/finnhub")
  let totalFilled = 0

  for (const gap of gaps) {
    try {
      const from = Math.floor(new Date(gap.start).getTime() / 1000)
      const to = Math.floor(new Date(gap.end).getTime() / 1000)
      const gapDurationHours = (to - from) / 3600

      // Finnhub has limits - for free tier: max 1 year of data, but we'll chunk large gaps
      // Chunk gaps larger than 24 hours into smaller pieces
      const maxChunkHours = 24
      let allCandles: Array<{ symbol: string; timestamp: string; price: number }> = []

      if (gapDurationHours > maxChunkHours) {
        // Chunk large gaps
        const chunkDuration = maxChunkHours * 3600 // seconds
        let currentFrom = from
        
        while (currentFrom < to) {
          const currentTo = Math.min(currentFrom + chunkDuration, to)
          
          try {
            const candles = await fetchCryptoCandles(symbol, resolution, currentFrom, currentTo, apiKey)
            allCandles.push(...candles)
            console.log(
              `Fetched ${candles.length} candles for ${symbol} chunk: ${new Date(currentFrom * 1000).toISOString()} to ${new Date(currentTo * 1000).toISOString()}`
            )
          } catch (chunkError) {
            // If it's a rate limit error, stop processing this gap and log it
            if (chunkError instanceof Error && chunkError.message.includes("rate limit")) {
              console.error(`Rate limit hit while backfilling ${symbol}. Stopping gap fill for this symbol.`)
              throw chunkError // Re-throw to stop processing this gap
            }
            console.error(`Error fetching chunk for ${symbol}:`, chunkError)
            // Continue with next chunk for other errors
          }
          
          currentFrom = currentTo
          
          // Longer delay between chunks to avoid rate limiting
          // Finnhub free tier: 60 calls/minute = 1 call/second max
          if (currentFrom < to) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay between chunks
          }
        }
      } else {
        // Small gap - fetch all at once (with retry logic built into fetchCryptoCandles)
        try {
          const candles = await fetchCryptoCandles(symbol, resolution, from, to, apiKey)
          allCandles = candles
        } catch (error) {
          // If rate limited, skip this gap
          if (error instanceof Error && error.message.includes("rate limit")) {
            console.error(`Rate limit hit for ${symbol}. Skipping gap fill.`)
            continue // Skip to next gap
          }
          throw error // Re-throw other errors
        }
      }

      if (allCandles.length > 0) {
        const priceData = allCandles.map((candle) => ({
          symbol: candle.symbol,
          price: candle.price,
          timestamp: candle.timestamp,
          intervalMinutes: intervalMinutes,
          // Note: candle data doesn't include marketCap, volume24h, change24h
          // We'll leave those null for backfilled data
        }))

        await storePriceDataBatch(priceData, intervalMinutes)
        totalFilled += allCandles.length
        console.log(
          `Backfilled ${allCandles.length} price points for ${symbol} from ${gap.start} to ${gap.end}`
        )
      }
    } catch (error) {
      console.error(`Error backfilling gap for ${symbol}:`, error)
      // Continue with other gaps
    }
  }

  return totalFilled
}
