import { createClient } from "@/lib/supabase/server"
import { collectPricesForActiveTokens } from "@/lib/services/token-price-service"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/v1/tokens/collect-prices
 * Manually trigger price collection for all active tokens
 * This can also be called by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow service role or authenticated users
    // In production, you might want to restrict this to service role only
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await collectPricesForActiveTokens()

    return NextResponse.json({
      message: "Price collection completed",
      ...result,
    })
  } catch (error) {
    console.error("Error collecting prices:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to collect prices" },
      { status: 500 }
    )
  }
}

