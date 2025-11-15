import { createClient } from "@/lib/supabase/server"
import { detectGaps, backfillGaps } from "@/lib/services/price-service"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/v1/crypto/price/backfill
 * Backfill missed price intervals for a symbol
 * 
 * Body: {
 *   symbol: string (required)
 *   intervalMinutes?: number (default: 5) - Expected interval in minutes (1, 5, 15, 30, 60)
 *   lookbackHours?: number (default: 24) - How many hours to look back for gaps
 * }
 */
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
    const { symbol, intervalMinutes = 5, lookbackHours = 24 } = body

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      )
    }

    const finnhubApiKey = process.env.FINNHUB_API_KEY
    if (!finnhubApiKey) {
      return NextResponse.json(
        { error: "Finnhub API key not configured" },
        { status: 500 }
      )
    }

    // Check if subscription is enabled
    const finnhubSubscriptionEnabled = process.env.FINNHUB_SUBSCRIPTION_ENABLED === "true"
    if (!finnhubSubscriptionEnabled) {
      return NextResponse.json(
        {
          error: "Finnhub subscription required for backfilling",
          message: "Historical candle data requires a paid Finnhub subscription. Set FINNHUB_SUBSCRIPTION_ENABLED=true to enable.",
        },
        { status: 403 }
      )
    }

    // Detect gaps
    const gaps = await detectGaps(symbol, intervalMinutes, lookbackHours)

    if (gaps.length === 0) {
      return NextResponse.json({
        message: "No gaps detected",
        gaps: [],
        filled: 0,
      })
    }

    // Backfill gaps
    const filled = await backfillGaps(symbol, intervalMinutes, gaps, finnhubApiKey)

    return NextResponse.json({
      message: `Backfilled ${filled} price points`,
      gaps: gaps.length,
      filled,
      gapRanges: gaps,
    })
  } catch (error) {
    console.error("Backfill API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to backfill prices" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/crypto/price/backfill?symbol=BTC&intervalMinutes=5&lookbackHours=24
 * Check for gaps without backfilling
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
    const intervalMinutes = parseInt(
      request.nextUrl.searchParams.get("intervalMinutes") || "5"
    )
    const lookbackHours = parseInt(
      request.nextUrl.searchParams.get("lookbackHours") || "24"
    )

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      )
    }

    // Detect gaps
    const gaps = await detectGaps(symbol, intervalMinutes, lookbackHours)

    // Calculate total gap duration
    const totalGapMs = gaps.reduce((sum, gap) => {
      return sum + (new Date(gap.end).getTime() - new Date(gap.start).getTime())
    }, 0)

    const totalGapHours = totalGapMs / (1000 * 60 * 60)

    return NextResponse.json({
      symbol,
      intervalMinutes,
      lookbackHours,
      gaps: gaps.length,
      totalGapHours: Math.round(totalGapHours * 100) / 100,
      gapRanges: gaps,
    })
  } catch (error) {
    console.error("Gap detection API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to detect gaps" },
      { status: 500 }
    )
  }
}

