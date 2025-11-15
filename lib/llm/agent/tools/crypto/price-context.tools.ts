import type { LLMToolDefinition } from "../types"

export const ensurePriceContextTool: LLMToolDefinition = {
  name: "ensure_price_context_for_question",
  description:
    "Prepare summarized price-history context (features, regimes, summaries, embeddings) for the given asset/timeframe/horizon so that further analysis tools can use it.",
  category: "price-context",
  tags: ["price-context", "embeddings", "regimes", "advanced"],
  requiresAuth: false,
  inputSchema: {
    type: "object",
    properties: {
      asset: {
        type: "string",
        description: "Symbol like BTC-USD, ETH-USD, SOL-USDT",
      },
      timeframe: {
        type: "string",
        enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
        description: "Candle timeframe to analyze",
      },
      horizon: {
        type: "string",
        description: "Lookback horizon (e.g. '7d', '30d', '365d')",
      },
      detailLevel: {
        type: "string",
        enum: ["coarse", "normal", "fine"],
        description: "Controls density of windows and features",
        default: "normal",
      },
      focusPeriod: {
        type: "object",
        description: "Optional focal period the question is about",
        properties: {
          start: { type: "string", description: "ISO timestamp" },
          end: { type: "string", description: "ISO timestamp" },
        },
        required: ["start", "end"],
      },
    },
    required: ["asset", "timeframe", "horizon"],
  },
  examples: [
    {
      description: "Prepare context for BTC daily data over 30 days",
      input: { asset: "BTC-USD", timeframe: "1d", horizon: "30d", detailLevel: "normal" },
    },
  ],
}

export const searchPriceWindowsTool: LLMToolDefinition = {
  name: "search_price_windows",
  description:
    "Search within a prepared price context for regimes, patterns, or specific windows (e.g., capitulations, strong uptrends).",
  category: "price-context",
  tags: ["price-context", "search", "patterns", "regimes", "advanced"],
  requiresAuth: false,
  inputSchema: {
    type: "object",
    properties: {
      contextId: {
        type: "string",
        description: "Context identifier returned by ensure_price_context_for_question",
      },
      similarityToWindowId: {
        type: "string",
        description:
          "Optional: window_id to find similar windows to, based on embeddings or features",
      },
      filters: {
        type: "object",
        description:
          "Optional filters for narrowing search (e.g., regime, minReturnPct, volatilityBucket)",
        properties: {
          regime: { type: "string" },
          minReturnPct: { type: "number" },
          maxReturnPct: { type: "number" },
          volatilityBucket: {
            type: "string",
            enum: ["low", "normal", "high", "insane"],
          },
          limit: { type: "integer", default: 10 },
        },
      },
    },
    required: ["contextId"],
  },
  examples: [
    {
      description: "Search for high volatility windows",
      input: {
        contextId: "ctx_BTC-USD_1d_1234567890",
        filters: { volatilityBucket: "high", limit: 10 },
      },
    },
  ],
}

export const PRICE_CONTEXT_TOOLS: LLMToolDefinition[] = [
  ensurePriceContextTool,
  searchPriceWindowsTool,
]
