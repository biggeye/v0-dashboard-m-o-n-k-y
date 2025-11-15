import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch portfolio holdings
    const { data: holdings } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("user_id", user.id)

    let totalValue = 0
    let totalCost = 0

    if (holdings && holdings.length > 0) {
      totalCost = holdings.reduce((sum, h) => sum + (h.quantity * h.average_buy_price || 0), 0)
      totalValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0)
    }

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    return NextResponse.json({
      data: {
        totalValue,
        totalCost,
        totalPnL,
        totalPnLPercent,
        holdingsCount: holdings?.length || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching portfolio value:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio value" },
      { status: 500 }
    )
  }
}
