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
  const response = await fetch("/api/v1/crypto/indicators", {
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

// Calculation functions
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
  return sum / period
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier)
  }

  return ema
}

export function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }

  const avgGain = gains / period
  const avgLoss = losses / period
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  return rsi
}

export function calculateMACD(prices: number[]): Record<string, number | undefined> {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macd = ema12 - ema26
  const signal = calculateEMA([macd], 9)

  return {
    macd: macd || undefined,
    signal: signal || undefined,
    histogram: macd && signal ? macd - signal : undefined,
  }
}

export function calculateBollingerBands(prices: number[], period: number, stdDev: number = 2): Record<string, number> {
  const sma = calculateSMA(prices, period)
  const slicedPrices = prices.slice(-period)

  const variance = slicedPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
  const std = Math.sqrt(variance)

  return {
    upper: sma + std * stdDev,
    middle: sma,
    lower: sma - std * stdDev,
  }
}

export function calculateATR(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 0

  let tr = 0
  const sliced = prices.slice(-period)

  for (let i = 1; i < sliced.length; i++) {
    const h = sliced[i]
    const l = sliced[i - 1]
    const c = sliced[i]

    const tr1 = h - l
    const tr2 = Math.abs(h - c)
    const tr3 = Math.abs(l - c)

    tr += Math.max(tr1, tr2, tr3)
  }

  return tr / period
}
