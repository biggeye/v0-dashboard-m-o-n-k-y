// API endpoint to fetch transaction chart data
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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"
    const symbol = searchParams.get("symbol")

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Build query
    let query = supabase
      .from("transactions")
      .select("timestamp, total_value, transaction_type, symbol")
      .eq("user_id", user.id)
      .gte("timestamp", startDate.toISOString())
      .order("timestamp", { ascending: true })

    if (symbol) {
      query = query.eq("symbol", symbol)
    }

    const { data: transactions, error } = await query

    if (error) throw error

    // Group transactions by date
    const groupedData = new Map<string, { spendings: number; sales: number; coffee: number }>()

    transactions?.forEach((tx) => {
      const date = new Date(tx.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })

      if (!groupedData.has(date)) {
        groupedData.set(date, { spendings: 0, sales: 0, coffee: 0 })
      }

      const dayData = groupedData.get(date)!
      const value = Number(tx.total_value) || 0

      // Categorize transactions
      if (tx.transaction_type === "buy" || tx.transaction_type === "withdrawal") {
        dayData.spendings += value
      } else if (tx.transaction_type === "sell" || tx.transaction_type === "deposit") {
        dayData.sales += value
      } else {
        dayData.coffee += value // fees, swaps, etc.
      }
    })

    // Convert to array format
    const chartData = Array.from(groupedData.entries()).map(([date, values]) => ({
      date,
      spendings: Math.round(values.spendings * 100) / 100,
      sales: Math.round(values.sales * 100) / 100,
      coffee: Math.round(values.coffee * 100) / 100,
    }))

    // Sort by date
    chartData.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    return NextResponse.json({ data: chartData })
  } catch (error) {
    console.error("[v0] Error fetching chart data:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}

