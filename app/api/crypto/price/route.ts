import { createClient } from "@/lib/supabase/server"
import { storePriceData } from "@/lib/services/price-service"
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

    const symbol = request.nextUrl.searchParams.get("symbol")
    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter required" }, { status: 400 })
    }

    // Fetch from price_history table
    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("symbol", symbol)
      .order("timestamp", { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    return NextResponse.json({ data })
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
