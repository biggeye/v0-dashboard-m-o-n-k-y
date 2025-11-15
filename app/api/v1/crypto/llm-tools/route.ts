import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Tools made available for LLM agents to call
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
    const { tool, params } = body

    let result

    switch (tool) {
      case "get_price_history":
        result = await getPriceHistoryTool(supabase, params)
        break
      case "calculate_indicator":
        result = await calculateIndicatorTool(params)
        break
      case "get_portfolio":
        result = await getPortfolioTool(supabase, user.id)
        break
      case "check_strategy":
        result = await checkStrategyTool(supabase, user.id, params)
        break
      case "get_alerts":
        result = await getAlertsTool(supabase, user.id)
        break
      default:
        return NextResponse.json({ error: "Unknown tool" }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("LLM tool error:", error)
    return NextResponse.json({ error: "Failed to execute tool" }, { status: 500 })
  }
}

async function getPriceHistoryTool(supabase: any, params: any) {
  const { symbol, limit = 100 } = params

  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("symbol", symbol)
    .order("timestamp", { ascending: false })
    .limit(limit)

  if (error) throw error

  return {
    symbol,
    prices: data || [],
    count: data?.length || 0,
  }
}

async function calculateIndicatorTool(params: any) {
  const { indicator, prices } = params

  // Call the indicators endpoint
  const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/v1/crypto/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicator, prices }),
  })

  const result = await response.json()
  return result.data
}

async function getPortfolioTool(supabase: any, userId: string) {
  const { data, error } = await supabase.from("portfolio_holdings").select("*").eq("user_id", userId)

  if (error) throw error

  return {
    holdings: data || [],
    count: data?.length || 0,
  }
}

async function checkStrategyTool(supabase: any, userId: string, params: any) {
  const { strategyId } = params

  const { data, error } = await supabase
    .from("trading_strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .single()

  if (error) throw error

  return {
    strategy: data,
    status: data?.is_active ? "active" : "inactive",
  }
}

async function getAlertsTool(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_triggered", false)

  if (error) throw error

  return {
    alerts: data || [],
    count: data?.length || 0,
  }
}
