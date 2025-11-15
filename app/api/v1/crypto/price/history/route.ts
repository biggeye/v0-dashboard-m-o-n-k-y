import { createClient } from "@/lib/supabase/server"
import { parseTimeframe } from "@/lib/utils/timeframe"
import { type NextRequest, NextResponse } from "next/server"

// ISR: Revalidate every 24 hours (86400 seconds)
// Cache key is based on path + searchParams (symbol, timeframe, range)
export const revalidate = 86400

/**
 * GET /api/v1/crypto/price/history
 * Returns historical OHLCV data (older than 1 hour)
 * Query params:
 *   - symbol: Token symbol (required)
 *   - timeframe: Timeframe string (e.g., "1h", "4h", "1d") (required)
 *   - range: Time range (e.g., "365d", "30d", "7d") (optional, defaults based on timeframe)
 * 
 * This route is ISR cached for 24 hours. Data end time is clamped at now - 1h
 * to ensure cacheability. For recent data (<1h), use /api/v1/crypto/price
 */
export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol")
    const timeframe = request.nextUrl.searchParams.get("timeframe")
    const rangeParam = request.nextUrl.searchParams.get("range")

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      )
    }

    if (!timeframe) {
      return NextResponse.json(
        { error: "Timeframe parameter required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Parse timeframe to get interval
    const parsed = parseTimeframe(timeframe)
    const intervalMinutes = parsed.intervalMinutes

    // Calculate end time: clamp at now - 1 hour to ensure cacheability
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const endTime = oneHourAgo

    // Calculate start time based on range or default lookback
    let startTime: Date
    if (rangeParam) {
      // Parse range (e.g., "365d", "30d", "7d")
      const rangeMatch = rangeParam.match(/^(\d+)([dwmy])$/)
      if (!rangeMatch) {
        return NextResponse.json(
          { error: "Invalid range format. Use format like '365d', '30d', '7d'" },
          { status: 400 }
        )
      }

      const value = parseInt(rangeMatch[1], 10)
      const unit = rangeMatch[2]
      
      const hoursMap: Record<string, number> = {
        d: 24,
        w: 24 * 7,
        m: 24 * 30,
        y: 24 * 365,
      }
      
      const hours = value * (hoursMap[unit] || 24)
      startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000)
    } else {
      // Use default lookback from timeframe
      const lookbackHours = parsed.lookbackHours || 24
      startTime = new Date(endTime.getTime() - lookbackHours * 60 * 60 * 1000)
    }

    // Fetch historical data from price_history table
    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("symbol", symbol)
      .gte("timestamp", startTime.toISOString())
      .lte("timestamp", endTime.toISOString())
      .order("timestamp", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching historical price data:", error)
      return NextResponse.json(
        { error: "Failed to fetch historical price data" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      symbol,
      timeframe,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      count: data?.length || 0,
      // Indicate this is historical data (no recent tail)
      isHistorical: true,
    })
  } catch (error) {
    console.error("[v0] Historical price API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch historical prices" },
      { status: 500 }
    )
  }
}

