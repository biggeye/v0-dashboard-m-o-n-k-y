// Service to manage technical indicators and expose them to LLM agents

export interface IndicatorConfig {
  name: string
  description: string
  parameters: Record<string, number>
  category: "trend" | "momentum" | "volatility" | "support_resistance"
}

export const AVAILABLE_INDICATORS: Record<string, IndicatorConfig> = {
  sma: {
    name: "Simple Moving Average",
    description: "Average price over a period",
    parameters: { period: 20 },
    category: "trend",
  },
  ema: {
    name: "Exponential Moving Average",
    description: "Weighted average giving more weight to recent prices",
    parameters: { period: 12 },
    category: "trend",
  },
  rsi: {
    name: "Relative Strength Index",
    description: "Momentum indicator measuring overbought/oversold conditions",
    parameters: { period: 14 },
    category: "momentum",
  },
  macd: {
    name: "MACD",
    description: "Trend-following momentum indicator",
    parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    category: "trend",
  },
  bollinger: {
    name: "Bollinger Bands",
    description: "Volatility bands around a moving average",
    parameters: { period: 20, stdDev: 2 },
    category: "volatility",
  },
  atr: {
    name: "Average True Range",
    description: "Volatility indicator measuring price range",
    parameters: { period: 14 },
    category: "volatility",
  },
}

export function getIndicatorTools() {
  return Object.entries(AVAILABLE_INDICATORS).map(([key, config]) => ({
    name: `calculate_${key}`,
    description: config.description,
    parameters: config.parameters,
    category: config.category,
  }))
}

export async function callIndicatorTool(toolName: string, prices: number[], params?: Record<string, number>) {
  const response = await fetch("/api/crypto/indicators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      indicator: toolName.replace("calculate_", ""),
      prices,
      params,
    }),
  })

  const result = await response.json()
  return result.data
}
