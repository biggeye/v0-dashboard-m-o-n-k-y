import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AGENT_TOOLS, toOpenAITools } from "@/lib/llm/agent-tools"

// Main endpoint for LLM chat and tool calling
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
    const { message, conversationHistory, toolName, toolInput } = body

    // Handle direct tool calls (for backward compatibility)
    if (toolName) {
      return await handleToolCall(toolName, toolInput, supabase, user.id)
    }

    // Handle chat messages with OpenAI
    if (message) {
      return await handleChatMessage(message, conversationHistory || [], supabase, user.id)
    }

    return NextResponse.json({ error: "Either 'message' or 'toolName' is required" }, { status: 400 })
  } catch (error) {
    console.error("LLM analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}

// Handle chat messages with OpenAI function calling
async function handleChatMessage(
  message: string,
  conversationHistory: any[],
  supabase: any,
  userId: string,
) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  // Convert conversation history to OpenAI format
  const messages = conversationHistory.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Add current user message
  messages.push({
    role: "user",
    content: message,
  })

  // Call OpenAI with function calling
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4o
      messages: [
        {
          role: "system",
          content:
            "You are a helpful cryptocurrency trading assistant. You can analyze crypto prices, calculate technical indicators, manage portfolios, create trading strategies, and set price alerts. Use the available tools to help users with their crypto trading needs.\n\nIMPORTANT: When analyzing strategies or indicators, you can return visualization data in a special JSON format. Include a 'visualization' field in your response with chart overlay instructions. The visualization should include:\n- overlays: array of chart overlays (lines for indicators like SMA/EMA, bands for Bollinger, markers for entry/exit points)\n- symbol: the cryptocurrency symbol\n- strategyName: name of the strategy\n\nExample visualization format:\n{\n  \"visualization\": {\n    \"strategyName\": \"Moving Average Crossover\",\n    \"symbol\": \"BTC\",\n    \"overlays\": [\n      {\n        \"id\": \"sma-20\",\n        \"type\": \"line\",\n        \"label\": \"SMA(20)\",\n        \"color\": \"#3b82f6\",\n        \"data\": {\n          \"values\": [45000, 45100, ...],\n          \"timestamps\": [\"2024-01-01T00:00:00Z\", ...]\n        }\n      }\n    ]\n  }\n}",
        },
        ...messages,
      ],
      tools: toOpenAITools(),
      tool_choice: "auto",
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("OpenAI API error:", errorData)
    return NextResponse.json(
      { error: "Failed to get AI response", details: errorData },
      { status: response.status },
    )
  }

  const data = await response.json()
  const assistantMessage = data.choices[0]?.message

  if (!assistantMessage) {
    return NextResponse.json({ error: "No response from AI" }, { status: 500 })
  }

  // Handle function calls
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCalls = assistantMessage.tool_calls
    const toolResults = []

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      const toolInput = JSON.parse(toolCall.function.arguments || "{}")

      try {
        const result = await executeTool(toolName, toolInput, supabase, userId)

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolName,
          content: JSON.stringify(result),
        })
      } catch (error) {
        console.error(`Tool call error for ${toolName}:`, error)
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolName,
          content: JSON.stringify({ error: "Tool execution failed" }),
        })
      }
    }

    // Make a second call to OpenAI with tool results
    const secondResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful cryptocurrency trading assistant. You can analyze crypto prices, calculate technical indicators, manage portfolios, create trading strategies, and set price alerts. Use the available tools to help users with their crypto trading needs.\n\nIMPORTANT: When analyzing strategies or indicators, you can return visualization data in a special JSON format. Include a 'visualization' field in your response with chart overlay instructions. The visualization should include:\n- overlays: array of chart overlays (lines for indicators like SMA/EMA, bands for Bollinger, markers for entry/exit points)\n- symbol: the cryptocurrency symbol\n- strategyName: name of the strategy\n\nExample visualization format:\n{\n  \"visualization\": {\n    \"strategyName\": \"Moving Average Crossover\",\n    \"symbol\": \"BTC\",\n    \"overlays\": [\n      {\n        \"id\": \"sma-20\",\n        \"type\": \"line\",\n        \"label\": \"SMA(20)\",\n        \"color\": \"#3b82f6\",\n        \"data\": {\n          \"values\": [45000, 45100, ...],\n          \"timestamps\": [\"2024-01-01T00:00:00Z\", ...]\n        }\n      }\n    ]\n  }\n}",
          },
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        tools: toOpenAITools(),
        tool_choice: "auto",
        temperature: 0.7,
      }),
    })

    if (!secondResponse.ok) {
      const errorData = await secondResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: "Failed to get AI response after tool calls", details: errorData },
        { status: secondResponse.status },
      )
    }

    const secondData = await secondResponse.json()
    const finalMessage = secondData.choices[0]?.message

    // Try to extract visualization from tool results
    const visualization = extractVisualizationFromToolResults(toolResults, messages)

    return NextResponse.json({
      result: finalMessage?.content || "I've processed your request using the available tools.",
      visualization,
    })
  }

  // No tool calls, return direct response
  return NextResponse.json({
    result: assistantMessage.content || "I'm here to help with your crypto trading needs.",
  })
}

// Extract visualization data from tool results
function extractVisualizationFromToolResults(toolResults: any[], messages: any[]): any {
  try {
    // Find crypto analysis or indicator calculation in tool results
    const analysisResult = toolResults.find((tr) => 
      tr.name === "crypto_analysis" || tr.name === "calculate_indicator"
    )

    if (!analysisResult) return undefined

    const toolData = JSON.parse(analysisResult.content || "{}")
    
    // Get symbol from tool data or user message
    let symbol = toolData.symbol
    if (!symbol) {
      const userMessage = messages.find((m) => m.role === "user")
      const symbolMatch = userMessage?.content?.match(/\b([A-Z]{2,5})\b/) || []
      symbol = symbolMatch[1] || "BTC"
    }

    // Get price data and timestamps if available
    const priceData = toolData.priceData || []
    const timestamps = toolData.timestamps || priceData.map((p: any) => p.timestamp) || []
    const prices = priceData.map((p: any) => p.price) || []

    if (prices.length === 0) return undefined

    // Generate overlays based on indicator results
    const overlays: any[] = []

    if (toolData.indicators) {
      // Calculate full indicator arrays for visualization
      if (toolData.indicators.sma) {
        const smaValues = calculateSMAArray(prices, 20)
        overlays.push({
          id: "sma-20",
          type: "line",
          label: "SMA(20)",
          color: "#3b82f6",
          data: {
            values: smaValues,
            timestamps,
          },
        })
      }
      if (toolData.indicators.ema) {
        const emaValues = calculateEMAArray(prices, 12)
        overlays.push({
          id: "ema-12",
          type: "line",
          label: "EMA(12)",
          color: "#8b5cf6",
          data: {
            values: emaValues,
            timestamps,
          },
        })
      }
      if (toolData.indicators.bollinger) {
        const bb = calculateBollingerBandsArray(prices, 20, 2)
        overlays.push({
          id: "bollinger-20",
          type: "band",
          label: "Bollinger Bands(20)",
          color: "#f59e0b",
          data: {
            upper: bb.upper,
            middle: bb.middle,
            lower: bb.lower,
            timestamps,
          },
        })
      }
    } else if (toolData.indicator && toolData.result) {
      // Single indicator calculation
      const indicator = toolData.indicator.toLowerCase()
      if (indicator === "sma") {
        const smaValues = calculateSMAArray(prices, 20)
        overlays.push({
          id: "sma-20",
          type: "line",
          label: "SMA(20)",
          color: "#3b82f6",
          data: {
            values: smaValues,
            timestamps,
          },
        })
      } else if (indicator === "ema") {
        const emaValues = calculateEMAArray(prices, 12)
        overlays.push({
          id: "ema-12",
          type: "line",
          label: "EMA(12)",
          color: "#8b5cf6",
          data: {
            values: emaValues,
            timestamps,
          },
        })
      } else if (indicator === "bollinger") {
        const bb = calculateBollingerBandsArray(prices, 20, 2)
        overlays.push({
          id: "bollinger-20",
          type: "band",
          label: "Bollinger Bands(20)",
          color: "#f59e0b",
          data: {
            upper: bb.upper,
            middle: bb.middle,
            lower: bb.lower,
            timestamps,
          },
        })
      }
    }

    if (overlays.length > 0) {
      return {
        strategyName: `Analysis for ${symbol}`,
        symbol,
        overlays,
      }
    }

    return undefined
  } catch (error) {
    console.error("Error extracting visualization:", error)
    return undefined
  }
}

// Helper functions to calculate full indicator arrays
function calculateSMAArray(prices: number[], period: number): number[] {
  const result: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }
  // Pad beginning with nulls to match price array length
  return Array(period - 1).fill(NaN).concat(result)
}

function calculateEMAArray(prices: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)
  
  // Start with SMA
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(ema)
  
  // Calculate EMA for rest
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier)
    result.push(ema)
  }
  
  // Pad beginning
  return Array(period - 1).fill(NaN).concat(result)
}

function calculateBollingerBandsArray(prices: number[], period: number, stdDev: number): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = []
  const middle: number[] = []
  const lower: number[] = []
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1)
    const sma = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const std = Math.sqrt(variance)
    
    middle.push(sma)
    upper.push(sma + std * stdDev)
    lower.push(sma - std * stdDev)
  }
  
  // Pad beginning
  const pad = Array(period - 1).fill(NaN)
  return {
    upper: pad.concat(upper),
    middle: pad.concat(middle),
    lower: pad.concat(lower),
  }
}

// Execute tool and return raw result (for OpenAI function calling)
async function executeTool(toolName: string, toolInput: any, supabase: any, userId: string) {
  const tool = AGENT_TOOLS.find((t) => t.name === toolName)
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found`)
  }

  // Route to appropriate handler
  switch (toolName) {
    case "crypto_analysis":
      return await handleCryptoAnalysis(toolInput)
    case "calculate_indicator":
      return await handleIndicatorCalculation(toolInput)
    case "portfolio_analysis":
      return await handlePortfolioAnalysis(supabase, userId, toolInput)
    case "manage_strategy":
      return await handleStrategyManagement(supabase, userId, toolInput)
    case "manage_alerts":
      return await handleAlertManagement(supabase, userId, toolInput)
    default:
      throw new Error("Tool handler not implemented")
  }
}

// Handle direct tool calls (for backward compatibility)
async function handleToolCall(toolName: string, toolInput: any, supabase: any, userId: string) {
  try {
    const result = await executeTool(toolName, toolInput, supabase, userId)
    return NextResponse.json({ result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Tool execution failed" }, { status: 500 })
  }
}

async function handleCryptoAnalysis(input: any) {
  const { symbol, analysisType } = input

  // Fetch price history - use internal API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/crypto/price?symbol=${symbol}`)
  const { data: prices } = await response.json()

  if (!prices || prices.length === 0) {
    return { error: `No price data for ${symbol}` }
  }

  const priceValues = prices.map((p: any) => p.price)
  const timestamps = prices.map((p: any) => p.timestamp)

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
    priceData: prices, // Include full price data for visualization
    timestamps, // Include timestamps for visualization
  }
}

async function handleIndicatorCalculation(input: any) {
  const { indicator, symbol } = input

  // Fetch price history for symbol - use internal API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/crypto/price?symbol=${symbol}`)
  const { data: prices } = await response.json()

  if (!prices || prices.length === 0) {
    return { error: `No price data for ${symbol}` }
  }

  const priceValues = prices.map((p: any) => p.price)
  const timestamps = prices.map((p: any) => p.timestamp)
  const result = await callIndicator(indicator, priceValues)

  return {
    symbol,
    indicator,
    result,
    priceData: prices, // Include full price data for visualization
    timestamps, // Include timestamps for visualization
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/crypto/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicator, prices }),
  })

  const result = await response.json()
  return result.data
}
