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

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get("strategy_id")
    const exchangeConnectionId = searchParams.get("exchange_connection_id")

    let query = supabase
      .from("risk_limits")
      .select("*")
      .eq("user_id", user.id)

    if (strategyId) {
      query = query.eq("strategy_id", strategyId)
    }

    if (exchangeConnectionId) {
      query = query.eq("exchange_connection_id", exchangeConnectionId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error fetching risk limits:", error)
    return NextResponse.json({ error: "Failed to fetch risk limits" }, { status: 500 })
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
    const {
      strategy_id,
      exchange_connection_id,
      execution_mode,
      max_notional_per_order,
      max_daily_notional,
      allowed_symbols,
    } = body

    if (!execution_mode) {
      return NextResponse.json({ error: "execution_mode is required" }, { status: 400 })
    }

    // Validate execution_mode
    const validModes = ["manual", "auto_sandbox", "auto_prod", "disabled"]
    if (!validModes.includes(execution_mode)) {
      return NextResponse.json(
        { error: `execution_mode must be one of: ${validModes.join(", ")}` },
        { status: 400 },
      )
    }

    // Convert allowed_symbols from comma-separated string to array if needed
    let symbolsArray: string[] = []
    if (allowed_symbols) {
      if (typeof allowed_symbols === "string") {
        symbolsArray = allowed_symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      } else if (Array.isArray(allowed_symbols)) {
        symbolsArray = allowed_symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
      }
    }

    const { data, error } = await supabase
      .from("risk_limits")
      .insert({
        user_id: user.id,
        strategy_id: strategy_id || null,
        exchange_connection_id: exchange_connection_id || null,
        execution_mode,
        max_notional_per_order: max_notional_per_order ? Number(max_notional_per_order) : null,
        max_daily_notional: max_daily_notional ? Number(max_daily_notional) : null,
        allowed_symbols: symbolsArray.length > 0 ? symbolsArray : null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error creating risk limit:", error)
    return NextResponse.json({ error: "Failed to create risk limit" }, { status: 500 })
  }
}

