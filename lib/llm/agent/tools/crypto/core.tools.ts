import { AVAILABLE_INDICATORS } from "@/lib/services/indicator-service"
import type { LLMToolDefinition } from "../types"

export const cryptoAnalysisTool: LLMToolDefinition = {
  name: "crypto_analysis",
  description: "Analyzes cryptocurrency price data using technical indicators and trading strategies.",
  category: "analysis",
  tags: ["crypto", "price", "technical", "trend", "volatility"],
  requiresAuth: false,
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Cryptocurrency symbol (e.g., BTC-USD, ETH-USD)",
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
  examples: [
    {
      description: "Analyze BTC daily trend",
      input: { symbol: "BTC-USD", analysisType: "price_trend", timeframe: "1d" },
    },
  ],
}

export const indicatorCalculationTool: LLMToolDefinition = {
  name: "calculate_indicator",
  description: "Calculate technical indicators on price data",
  category: "analysis",
  tags: ["indicator", "technical-analysis", "price"],
  requiresAuth: false,
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
  examples: [
    {
      description: "Calculate RSI for BTC",
      input: { indicator: "rsi", symbol: "BTC", period: 14 },
    },
    {
      description: "Calculate SMA for ETH",
      input: { indicator: "sma", symbol: "ETH", period: 20 },
    },
  ],
}

export const portfolioAnalysisTool: LLMToolDefinition = {
  name: "portfolio_analysis",
  description: "Analyze user's cryptocurrency portfolio and generate insights",
  category: "portfolio",
  tags: ["portfolio", "allocation", "risk", "performance"],
  requiresAuth: true,
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
  examples: [
    {
      description: "Analyze portfolio allocation",
      input: { analysisType: "allocation" },
    },
    {
      description: "Risk analysis with conservative tolerance",
      input: { analysisType: "risk", riskTolerance: "conservative" },
    },
  ],
}

export const strategyManagementTool: LLMToolDefinition = {
  name: "manage_strategy",
  description: "Create, update, or check status of trading strategies",
  category: "portfolio",
  tags: ["strategy", "trading", "automation"],
  requiresAuth: true,
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
  examples: [
    {
      description: "List all strategies",
      input: { action: "list" },
    },
    {
      description: "Create a new strategy",
      input: {
        action: "create",
        strategyConfig: {
          name: "BTC Momentum",
          symbol: "BTC",
          indicators: ["rsi", "macd"],
        },
      },
    },
  ],
}

export const priceAlertTool: LLMToolDefinition = {
  name: "manage_alerts",
  description: "Create and manage price alerts for cryptocurrency",
  category: "alerts",
  tags: ["alerts", "notifications", "price"],
  requiresAuth: true,
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
  examples: [
    {
      description: "List all alerts",
      input: { action: "list" },
    },
    {
      description: "Create alert for BTC above $50000",
      input: { action: "create", symbol: "BTC", condition: "above", priceThreshold: 50000 },
    },
  ],
}

export const CRYPTO_CORE_TOOLS: LLMToolDefinition[] = [
  cryptoAnalysisTool,
  indicatorCalculationTool,
  portfolioAnalysisTool,
  strategyManagementTool,
  priceAlertTool,
]
