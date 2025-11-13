import { AVAILABLE_INDICATORS } from "@/lib/services/indicator-service"

// Tool definitions for LLM agents (compatible with OpenAI function calling, Anthropic tools, etc.)
export const cryptoAnalysisTool = {
  name: "crypto_analysis",
  description: "Analyzes cryptocurrency price data using technical indicators and trading strategies",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Cryptocurrency symbol (e.g., BTC, ETH)",
      },
      analysisType: {
        type: "string",
        enum: ["price_trend", "volatility", "momentum", "support_resistance", "comprehensive"],
        description: "Type of analysis to perform",
      },
      timeframe: {
        type: "string",
        enum: ["1h", "4h", "1d", "1w", "1m"],
        description: "Timeframe for analysis",
      },
    },
    required: ["symbol", "analysisType"],
  },
}

export const indicatorCalculationTool = {
  name: "calculate_indicator",
  description: "Calculate technical indicators on price data",
  inputSchema: {
    type: "object",
    properties: {
      indicator: {
        type: "string",
        enum: Object.keys(AVAILABLE_INDICATORS),
        description: "Technical indicator to calculate",
      },
      symbol: {
        type: "string",
        description: "Cryptocurrency symbol",
      },
      period: {
        type: "number",
        description: "Period for indicator calculation",
      },
    },
    required: ["indicator", "symbol"],
  },
}

export const portfolioAnalysisTool = {
  name: "portfolio_analysis",
  description: "Analyze user's cryptocurrency portfolio and generate insights",
  inputSchema: {
    type: "object",
    properties: {
      analysisType: {
        type: "string",
        enum: ["allocation", "performance", "risk", "rebalance"],
        description: "Type of portfolio analysis",
      },
      riskTolerance: {
        type: "string",
        enum: ["conservative", "moderate", "aggressive"],
        description: "Risk tolerance level",
      },
    },
    required: ["analysisType"],
  },
}

export const strategyManagementTool = {
  name: "manage_strategy",
  description: "Create, update, or check status of trading strategies",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "activate", "deactivate", "delete", "list"],
        description: "Action to perform on strategies",
      },
      strategyId: {
        type: "string",
        description: "ID of strategy (for update/delete operations)",
      },
      strategyConfig: {
        type: "object",
        description: "Strategy configuration",
        properties: {
          name: { type: "string" },
          symbol: { type: "string" },
          entryConditions: { type: "object" },
          exitConditions: { type: "object" },
          indicators: { type: "array", items: { type: "string" } },
        },
      },
    },
    required: ["action"],
  },
}

export const priceAlertTool = {
  name: "manage_alerts",
  description: "Create and manage price alerts for cryptocurrency",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "list", "delete", "update"],
        description: "Alert management action",
      },
      symbol: {
        type: "string",
        description: "Cryptocurrency symbol",
      },
      condition: {
        type: "string",
        enum: ["above", "below"],
        description: "Alert trigger condition",
      },
      priceThreshold: {
        type: "number",
        description: "Price threshold for alert",
      },
      alertId: {
        type: "string",
        description: "ID of alert (for update/delete)",
      },
    },
    required: ["action"],
  },
}

// Export all tools as an array for easy access
export const AGENT_TOOLS = [
  cryptoAnalysisTool,
  indicatorCalculationTool,
  portfolioAnalysisTool,
  strategyManagementTool,
  priceAlertTool,
]

// Helper function to get tool by name
export function getToolByName(toolName: string) {
  return AGENT_TOOLS.find((tool) => tool.name === toolName)
}

// Helper to convert tools to OpenAI format
export function toOpenAITools() {
  return AGENT_TOOLS.map((tool) => ({
    type: "function",
    function: tool,
  }))
}

// Helper to convert tools to Anthropic format
export function toAnthropicTools() {
  return AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
}
