// API endpoint to fetch chart data from transactions
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

    const period = request.nextUrl.searchParams.get("period") || "week"

    // Calculate date range based on period
    const now = new Date()
    const startDate = new Date()
    let groupByFormat = "%Y-%m-%d"

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7)
        groupByFormat = "%m/%d"
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        groupByFormat = "%m/%d"
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        groupByFormat = "%Y-%m"
        break
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select("transaction_type, total_value, fees, timestamp")
      .eq("user_id", user.id)
      .gte("timestamp", startDate.toISOString())
      .order("timestamp", { ascending: true })

    // Group transactions by date
    const groupedData = new Map<string, { sales: number; spendings: number; coffee: number }>()

    transactions?.forEach((tx) => {
      const date = new Date(tx.timestamp).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      })

      if (!groupedData.has(date)) {
        groupedData.set(date, { sales: 0, spendings: 0, coffee: 0 })
      }

      const data = groupedData.get(date)!
      if (tx.transaction_type === "sell") {
        data.sales += tx.total_value
      } else if (tx.transaction_type === "buy") {
        data.spendings += tx.total_value
      }
      data.coffee += tx.fees // Using fees as "coffee" (trading costs)
    })

    const chartData = Array.from(groupedData.entries()).map(([date, values]) => ({
      date,
      ...values,
    }))

    return NextResponse.json({ data: chartData })
  } catch (error) {
    console.error("[v0] Error fetching chart data:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
