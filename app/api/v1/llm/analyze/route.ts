import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AGENT_TOOLS, toOpenAITools } from "@/lib/llm/agent/tools"
import { buildToolRegistry, type ExecutionContext } from "@/lib/llm/agent/tools/registry"
import {
  transformCryptoAnalysisToVisualization,
  transformIndicatorCalculationToVisualization,
} from "@/lib/visualization"

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

// Build system prompt dynamically based on available tools
function buildSystemPrompt(availableTools: any[]) {
  const toolDescriptions = availableTools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n")

  return [
    "You are a helpful cryptocurrency trading assistant. You can analyze crypto prices, calculate technical indicators, manage portfolios, create trading strategies, and set price alerts.",
    "",
    "Available tools:",
    toolDescriptions,
    "",
    "When a user asks for anything that depends on historical price structure, price regimes, or pattern similarity,",
    "first consider calling the price context tools (ensure_price_context_for_question, search_price_windows) to prepare or search context before answering.",
    "",
    "IMPORTANT: When analyzing strategies or indicators, you can return visualization data in a special JSON format. Include a 'visualization' field in your response with chart overlay instructions. The visualization should include:",
    "- overlays: array of chart overlays (lines for indicators like SMA/EMA, bands for Bollinger, markers for entry/exit points)",
    "- symbol: the cryptocurrency symbol",
    "- strategyName: name of the strategy",
    "",
    "Example visualization format:",
    JSON.stringify(
      {
        visualization: {
          strategyName: "Moving Average Crossover",
          symbol: "BTC",
          overlays: [
            {
              id: "sma-20",
              type: "line",
              label: "SMA(20)",
              color: "#3b82f6",
              data: {
                values: [45000, 45100],
                timestamps: ["2024-01-01T00:00:00Z"],
              },
            },
          ],
        },
      },
      null,
      2,
    ),
  ].join("\n")
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

  const registry = buildToolRegistry()
  const tools = toOpenAITools()

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

  const systemPrompt = buildSystemPrompt(registry.listDefinitions())

  // Call OpenAI with function calling
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: systemPrompt,
        },
        ...messages,
      ],
      tools,
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
        const context: ExecutionContext = {
          supabase,
          userId,
        }
        const { result } = await registry.execute(toolName, toolInput, context)

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolName,
          content: JSON.stringify(result),
        })
      } catch (error: any) {
        console.error(`Tool call error for ${toolName}:`, error)
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolName,
          content: JSON.stringify({
            error: error.message || "Tool execution failed",
            details: error.details,
          }),
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
            content: systemPrompt,
          },
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        tools,
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
    
    // Extract tool calls for UI display
    const toolCallsForUI = toolCalls.map((tc) => ({
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || "{}"),
    }))

    return NextResponse.json({
      result: finalMessage?.content || "I've processed your request using the available tools.",
      visualization,
      toolCalls: toolCallsForUI,
    })
  }

  // No tool calls, return direct response
  return NextResponse.json({
    result: assistantMessage.content || "I'm here to help with your crypto trading needs.",
  })
}

// Extract visualization data from tool results using visualization service
function extractVisualizationFromToolResults(toolResults: any[], messages: any[]): any {
  try {
    // Find crypto analysis or indicator calculation in tool results
    const analysisResult = toolResults.find(
      (tr) => tr.name === "crypto_analysis" || tr.name === "calculate_indicator",
    )

    if (!analysisResult) return undefined

    const toolData = JSON.parse(analysisResult.content || "{}")

    // Use service functions to transform handler responses
    let visualization = null

    if (analysisResult.name === "crypto_analysis") {
      visualization = transformCryptoAnalysisToVisualization(toolData)
    } else if (analysisResult.name === "calculate_indicator") {
      visualization = transformIndicatorCalculationToVisualization(toolData)
    }

    // Return visualization object if created, otherwise undefined
    return visualization || undefined
  } catch (error) {
    console.error("Error extracting visualization:", error)
    return undefined
  }
}

// Handle direct tool calls (for backward compatibility)
async function handleToolCall(toolName: string, toolInput: any, supabase: any, userId: string) {
  try {
    const registry = buildToolRegistry()
    const context: ExecutionContext = {
      supabase,
      userId,
    }
    const { result } = await registry.execute(toolName, toolInput, context)
    return NextResponse.json({ result })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Tool execution failed",
        details: error.details,
      },
      { status: 500 },
    )
  }
}
