import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AGENT_TOOLS } from "@/lib/llm/agent-tools"

// Main endpoint for LLM to call tools
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
    const { toolName, toolInput } = body

    if (!toolName) {
      return NextResponse.json({ error: "Tool name required" }, { status: 400 })
    }

    const tool = AGENT_TOOLS.find((t) => t.name === toolName)
    if (!tool) {
      return NextResponse.json({ error: `Tool '${toolName}' not found` }, { status: 404 })
    }

    // Route to appropriate handler
    let result
    switch (toolName) {
      case "crypto_analysis":
        result = await handleCryptoAnalysis(toolInput)
        break
      case "calculate_indicator":
        result = await handleIndicatorCalculation(toolInput)
        break
      case "portfolio_analysis":
        result = await handlePortfolioAnalysis(supabase, user.id, toolInput)
        break
      case "manage_strategy":
        result = await handleStrategyManagement(supabase, user.id, toolInput)
        break
      case "manage_alerts":
        result = await handleAlertManagement(supabase, user.id, toolInput)
        break
      default:
        return NextResponse.json({ error: "Tool handler not implemented" }, { status: 501 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error("LLM analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}

async function handleCryptoAnalysis(input: any) {
  const { symbol, analysisType } = input

  // Fetch price history
  const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/crypto/price?symbol=${symbol}`)
  const { data: prices } = await response.json()

  if (!prices || prices.length === 0) {
    return { error: `No price data for ${symbol}` }
  }

  const priceValues = prices.map((p: any) => p.price)

  // Based on analysis type, calculate relevant indicators
  let indicators = {}

  if (analysisType === "trend" || analysisType === "comprehensive") {
    indicators = {
      ...indicators,
      sma: await callIndicator("sma", priceValues),
      ema: await callIndicator("ema", priceValues),
    }
  }

  if (analysisType === "momentum" || analysisType === "comprehensive") {
    indicators = {
      ...indicators,
      rsi: await callIndicator("rsi", priceValues),
      macd: await callIndicator("macd", priceValues),
    }
  }

  if (analysisType === "volatility" || analysisType === "comprehensive") {
    indicators = {
      ...indicators,
      bollinger: await callIndicator("bollinger", priceValues),
      atr: await callIndicator("atr", priceValues),
    }
  }

  return {
    symbol,
    analysisType,
    latestPrice: priceValues[priceValues.length - 1],
    priceChange: priceValues[priceValues.length - 1] - priceValues[0],
    indicators,
    dataPoints: prices.length,
  }
}

async function handleIndicatorCalculation(input: any) {
  const { indicator, symbol } = input

  // Fetch price history for symbol
  const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/crypto/price?symbol=${symbol}`)
  const { data: prices } = await response.json()

  if (!prices || prices.length === 0) {
    return { error: `No price data for ${symbol}` }
  }

  const priceValues = prices.map((p: any) => p.price)
  const result = await callIndicator(indicator, priceValues)

  return {
    symbol,
    indicator,
    result,
  }
}

async function handlePortfolioAnalysis(supabase: any, userId: string, input: any) {
  const { analysisType, riskTolerance } = input

  // Fetch user's holdings
  const { data: holdings, error } = await supabase.from("portfolio_holdings").select("*").eq("user_id", userId)

  if (error) throw error

  const totalValue = holdings.reduce((sum: number, h: any) => sum + h.quantity * h.average_buy_price, 0)

  const allocation = holdings.map((h: any) => ({
    symbol: h.symbol,
    quantity: h.quantity,
    allocationPercent: ((h.quantity * h.average_buy_price) / totalValue) * 100,
  }))

  return {
    analysisType,
    riskTolerance,
    holdings: holdings.length,
    totalValue,
    allocation,
  }
}

async function handleStrategyManagement(supabase: any, userId: string, input: any) {
  const { action, strategyId, strategyConfig } = input

  if (action === "create") {
    const { data, error } = await supabase.from("trading_strategies").insert({
      user_id: userId,
      ...strategyConfig,
    })
    if (error) throw error
    return { action: "created", strategy: data }
  }

  if (action === "list") {
    const { data, error } = await supabase.from("trading_strategies").select("*").eq("user_id", userId)
    if (error) throw error
    return { action: "list", strategies: data }
  }

  if (action === "activate" || action === "deactivate") {
    const { data, error } = await supabase
      .from("trading_strategies")
      .update({ is_active: action === "activate" })
      .eq("id", strategyId)
      .eq("user_id", userId)
    if (error) throw error
    return { action, strategyId }
  }

  return { error: "Invalid action" }
}

async function handleAlertManagement(supabase: any, userId: string, input: any) {
  const { action, symbol, condition, priceThreshold, alertId } = input

  if (action === "create") {
    const { data, error } = await supabase.from("price_alerts").insert({
      user_id: userId,
      symbol,
      condition,
      price_threshold: priceThreshold,
    })
    if (error) throw error
    return { action: "created", alert: data }
  }

  if (action === "list") {
    const { data, error } = await supabase.from("price_alerts").select("*").eq("user_id", userId)
    if (error) throw error
    return { action: "list", alerts: data }
  }

  if (action === "delete") {
    const { error } = await supabase.from("price_alerts").delete().eq("id", alertId).eq("user_id", userId)
    if (error) throw error
    return { action: "deleted", alertId }
  }

  return { error: "Invalid action" }
}

async function callIndicator(indicator: string, prices: number[]) {
  const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/crypto/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicator, prices }),
  })

  const result = await response.json()
  return result.data
}
