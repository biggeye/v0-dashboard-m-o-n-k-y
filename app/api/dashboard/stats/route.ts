// API endpoint to fetch real dashboard stats from database
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch portfolio holdings total value
    const { data: holdings } = await supabase
      .from("portfolio_holdings")
      .select("current_value, unrealized_pnl")
      .eq("user_id", user.id)

    const totalPortfolioValue = holdings?.reduce((sum, h) => sum + (h.current_value || 0), 0) || 0
    const totalUnrealizedPnL = holdings?.reduce((sum, h) => sum + (h.unrealized_pnl || 0), 0) || 0
    const pnlPercentage =
      totalPortfolioValue > 0 ? (totalUnrealizedPnL / (totalPortfolioValue - totalUnrealizedPnL)) * 100 : 0

    // Fetch trading strategies
    const { data: strategies } = await supabase
      .from("trading_strategies")
      .select("total_trades, winning_trades, is_active")
      .eq("user_id", user.id)

    const activeStrategies = strategies?.filter((s) => s.is_active).length || 0
    const totalTrades = strategies?.reduce((sum, s) => sum + (s.total_trades || 0), 0) || 0
    const winningTrades = strategies?.reduce((sum, s) => sum + (s.winning_trades || 0), 0) || 0
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    // Fetch active orders count
    const { data: orders } = await supabase
      .from("trading_orders")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["open", "pending", "partially_filled"])

    const activeOrders = orders?.length || 0

    const stats = [
      {
        label: "PORTFOLIO VALUE",
        value: `$${totalPortfolioValue.toLocaleString()}`,
        description: `${pnlPercentage >= 0 ? "+" : ""}${pnlPercentage.toFixed(2)}% UNREALIZED`,
        intent: pnlPercentage >= 0 ? "positive" : "negative",
        icon: "gear",
        direction: pnlPercentage >= 0 ? "up" : "down",
      },
      {
        label: "ACTIVE STRATEGIES",
        value: activeStrategies.toString(),
        description: `${totalTrades} TOTAL TRADES`,
        intent: "neutral",
        icon: "proccesor",
      },
      {
        label: "WIN RATE",
        value: `${winRate.toFixed(1)}%`,
        description: `${winningTrades}/${totalTrades} WINNING TRADES`,
        intent: winRate >= 50 ? "positive" : "negative",
        icon: "boom",
        direction: winRate >= 50 ? "up" : "down",
      },
    ]

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
