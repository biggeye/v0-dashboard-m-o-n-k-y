import { createClient } from "@/lib/supabase/server"
import { storePriceData, detectGaps, backfillGaps } from "@/lib/services/price-service"
import { fetchCryptoPrice } from "@/lib/providers/finnhub"
import { parseTimeframe } from "@/lib/utils/timeframe"
import { type NextRequest, NextResponse } from "next/server"

/**
 * GET /api/v1/crypto/price
 * Returns recent price data (<1 hour old) with real-time updates
 * 
 * For historical data (>1 hour old), use /api/v1/crypto/price/history
 * which is ISR cached for better performance.
 * 
 * This route remains dynamic to handle real-time price updates and gap detection.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get("symbol")
    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter required" }, { status: 400 })
    }

    // Check if we only need the latest price (for market overview)
    const latestOnly = request.nextUrl.searchParams.get("latest") === "true"
    const timeframe = request.nextUrl.searchParams.get("timeframe") || null
    const beforeTimestamp = request.nextUrl.searchParams.get("before") || null // For pagination
    
    // If timeframe is specified, parse it to get interval and lookback
    let intervalMinutes: number | null = null
    let lookbackHours: number | null = null
    
    if (timeframe) {
      const parsed = parseTimeframe(timeframe)
      intervalMinutes = parsed.intervalMinutes
      lookbackHours = parsed.lookbackHours
    }

    // Calculate optimal limit based on timeframe to prevent data bottlenecks
    // For longer timeframes, we need more data points to fill the view
    const getOptimalLimit = (tf: string | null, lookback: number | null): number => {
      if (latestOnly) return 1
      if (!tf || !lookback) return 100
      
      // Calculate expected data points based on interval and lookback
      const parsed = parseTimeframe(tf)
      const expectedPoints = parsed.expectedPoints
      
      // Add 20% buffer and cap at reasonable limits to prevent bottlenecks
      const calculated = Math.ceil(expectedPoints * 1.2)
      
      // Cap limits based on timeframe to prevent excessive data transfer
      const maxLimits: Record<string, number> = {
        "1m": 500,   // 1-minute view: max 500 points (~8 hours)
        "5m": 500,   // 5-minute view: max 500 points (~42 hours)
        "15m": 1000, // 15-minute view: max 1000 points (~10 days)
        "30m": 1000, // 30-minute view: max 1000 points (~21 days)
        "1h": 2000,  // 1-hour view: max 2000 points (~83 days)
        "4h": 2000,  // 4-hour view: max 2000 points (~333 days)
        "1d": 2000,  // 1-day view: max 2000 points (~5.5 years)
        "1w": 2000,  // 1-week view: max 2000 points (~38 years)
        "1mo": 2000, // 1-month view: max 2000 points (~166 years)
      }
      
      const maxLimit = maxLimits[tf.toLowerCase()] || 2000
      return Math.min(calculated, maxLimit)
    }

    const limit = getOptimalLimit(timeframe, lookbackHours)

    // Fetch from price_history table
    let query = supabase
      .from("price_history")
      .select("*")
      .eq("symbol", symbol)
      .order("timestamp", { ascending: false })

    // If timeframe is specified, filter by lookback period
    if (timeframe && lookbackHours) {
      const since = new Date()
      since.setHours(since.getHours() - lookbackHours)
      query = query.gte("timestamp", since.toISOString())
    }

    // For pagination: if "before" timestamp is provided, fetch older data
    if (beforeTimestamp) {
      query = query.lt("timestamp", beforeTimestamp)
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      throw error
    }

    // If timeframe is specified, check for gaps and backfill if needed
    // Also check for gaps even without timeframe if we have data (for general gap filling)
    const shouldCheckGaps = (timeframe && intervalMinutes && lookbackHours) || (!timeframe && data && data.length > 0)
    
    let isBackfilling = false
    
    if (shouldCheckGaps) {
      const finnhubApiKey = process.env.FINNHUB_API_KEY
      if (finnhubApiKey) {
        try {
          // Use timeframe interval if available, otherwise default to 5 minutes
          const checkInterval = intervalMinutes || 5
          const checkLookback = lookbackHours || 24
          
          // Detect gaps for the current timeframe or default
          const gaps = await detectGaps(symbol, checkInterval, checkLookback)
          
          // If gaps are detected, backfill them (only if subscription enabled)
          if (gaps.length > 0) {
            const finnhubSubscriptionEnabled = process.env.FINNHUB_SUBSCRIPTION_ENABLED === "true"
            
            if (!finnhubSubscriptionEnabled) {
              // Log that gaps were detected but backfill is disabled
              console.log(
                `Detected ${gaps.length} gap(s) for ${symbol}, but backfill is disabled. ` +
                `Set FINNHUB_SUBSCRIPTION_ENABLED=true to enable historical data backfilling.`
              )
            } else {
              // Calculate total gap duration to decide sync vs async backfill
              const totalGapMs = gaps.reduce((sum, gap) => {
                return sum + (new Date(gap.end).getTime() - new Date(gap.start).getTime())
              }, 0)
              const totalGapHours = totalGapMs / (1000 * 60 * 60)
              
              // Determine threshold based on timeframe - shorter timeframes can handle smaller sync backfills
              // because they have smaller intervals and less data to fetch
              const syncThresholdHours = checkInterval <= 5 ? 6 : checkInterval <= 15 ? 12 : 24
              
              if (totalGapHours <= syncThresholdHours) {
                // Small gaps: backfill synchronously with the appropriate interval
                isBackfilling = true
                await backfillGaps(symbol, checkInterval, gaps, finnhubApiKey)
                console.log(`Synchronously backfilled ${gaps.length} gap(s) for ${symbol} at ${checkInterval}min interval`)
                
                // Refetch data after backfill
                const { data: refreshedData } = await supabase
                  .from("price_history")
                  .select("*")
                  .eq("symbol", symbol)
                  .order("timestamp", { ascending: false })
                  .limit(limit)
                
                if (refreshedData && refreshedData.length > 0) {
                  return NextResponse.json({ 
                    data: refreshedData,
                    backfilling: false, // Done backfilling
                  })
                }
              } else {
                // Large gaps: backfill in background with appropriate interval
                isBackfilling = true
                backfillGaps(symbol, checkInterval, gaps, finnhubApiKey).catch((err) => {
                  console.error(`Background backfill failed for ${symbol}:`, err)
                })
                console.log(
                  `Detected ${gaps.length} large gap(s) for ${symbol}, backfilling in background at ${checkInterval}min interval...`
                )
              }
            }
          }
        } catch (gapError) {
          // Don't fail the request if gap detection/backfill fails
          console.error(`Gap detection/backfill error for ${symbol}:`, gapError)
        }
      }
    }

    // If no data in DB, fetch from Finnhub and store it
    if (!data || data.length === 0) {
      const finnhubApiKey = process.env.FINNHUB_API_KEY
      if (finnhubApiKey) {
        try {
          const finnhubData = await fetchCryptoPrice(symbol, finnhubApiKey)
          
          // Store the fetched price with interval rounding
          await storePriceData(symbol, finnhubData.price, {
            marketCap: finnhubData.marketCap,
            volume24h: finnhubData.volume24h,
            change24h: finnhubData.change24h,
            intervalMinutes: intervalMinutes || 5, // Use timeframe interval if available, default to 5
          })

          // Return the newly stored data
          const { data: newData } = await supabase
            .from("price_history")
            .select("*")
            .eq("symbol", symbol)
            .order("timestamp", { ascending: false })
            .limit(limit)

          return NextResponse.json({ data: newData || [] })
        } catch (finnhubError) {
          console.error("Finnhub fetch error:", finnhubError)
          // Continue to return empty array if Finnhub fails
        }
      }
    } else {
      // Check if latest price is stale (older than 5 minutes) and refresh from Finnhub
      const latestPrice = data[0]
      const latestTimestamp = new Date(latestPrice.timestamp)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

      if (latestTimestamp < fiveMinutesAgo) {
        const finnhubApiKey = process.env.FINNHUB_API_KEY
        if (finnhubApiKey) {
          try {
            const finnhubData = await fetchCryptoPrice(symbol, finnhubApiKey)
            
            // Store the fresh price with interval rounding
            await storePriceData(symbol, finnhubData.price, {
              marketCap: finnhubData.marketCap,
              volume24h: finnhubData.volume24h,
              change24h: finnhubData.change24h,
              intervalMinutes: intervalMinutes || 5, // Use timeframe interval if available, default to 5
            })

            // Fetch the updated data after storing
            const { data: updatedData } = await supabase
              .from("price_history")
              .select("*")
              .eq("symbol", symbol)
              .order("timestamp", { ascending: false })
              .limit(limit)

            if (updatedData && updatedData.length > 0) {
              return NextResponse.json({ data: updatedData })
            }
          } catch (finnhubError) {
            console.error("Finnhub refresh error:", finnhubError)
            // Continue with existing data if refresh fails
          }
        }
      }
    }

    return NextResponse.json({ 
      data: data || [],
      backfilling: isBackfilling,
    })
  } catch (error) {
    console.error("Price API error:", error)
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 })
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

    const body = await request.json()
    const { symbol, price, marketCap, volume24h, change24h } = body

    if (!symbol || price === undefined) {
      return NextResponse.json({ error: "Symbol and price are required" }, { status: 400 })
    }

    const result = await storePriceData(symbol, price, {
      marketCap,
      volume24h,
      change24h,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Price API error:", error)
    return NextResponse.json({ error: "Failed to store price" }, { status: 500 })
  }
}
