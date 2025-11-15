// API endpoint for fetching transaction history
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

    const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "50")
    const connectionId = request.nextUrl.searchParams.get("connectionId")
    const sourceType = request.nextUrl.searchParams.get("sourceType") // "exchange" | "wallet"
    const symbol = request.nextUrl.searchParams.get("symbol")

    // Start building the query
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)

    // Filter by source type (exchange or wallet)
    if (sourceType === "exchange") {
      query = query.eq("source_type", "exchange")
    } else if (sourceType === "wallet") {
      query = query.eq("source_type", "wallet")
    }

    // Filter by connection ID
    if (connectionId) {
      if (sourceType === "exchange") {
        query = query.eq("exchange_connection_id", connectionId)
      } else if (sourceType === "wallet") {
        query = query.eq("wallet_connection_id", connectionId)
      } else {
        // If no sourceType specified, check both
        query = query.or(`exchange_connection_id.eq.${connectionId},wallet_connection_id.eq.${connectionId}`)
      }
    }

    // Filter by symbol/asset type
    if (symbol) {
      query = query.eq("symbol", symbol.toUpperCase())
    }

    // Apply ordering and limit
    const { data, error } = await query
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
