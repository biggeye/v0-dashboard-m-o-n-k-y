/**
 * Visualization Service
 * 
 * Transforms raw handler responses into structured visualizations
 * using the generator functions.
 */

import {
  generateSMAOverlay,
  generateEMAOverlay,
  generateBollingerBandsOverlay,
  generateEntryExitMarkers,
  generateStrategyVisualization,
} from "./generators"
import type { StrategyVisualization, ChartOverlay } from "@/lib/types/visualization"

interface IndicatorData {
  sma?: number | number[]
  ema?: number | number[]
  bollinger?: {
    upper: number | number[]
    middle: number | number[]
    lower: number | number[]
  }
  [key: string]: any
}

interface HandlerResponse {
  symbol: string
  indicators?: IndicatorData
  priceData?: Array<{ price: number; timestamp: string }>
  timestamps?: string[]
  analysisType?: string
  [key: string]: any
}

/**
 * Calculate full SMA array from price data
 */
function calculateSMAArray(prices: number[], period: number): number[] {
  const result: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }
  // Pad beginning with NaN to match price array length
  return Array(period - 1).fill(NaN).concat(result)
}

/**
 * Calculate full EMA array from price data
 */
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

/**
 * Calculate full Bollinger Bands arrays from price data
 */
function calculateBollingerBandsArray(
  prices: number[],
  period: number,
  stdDev: number,
): { upper: number[]; middle: number[]; lower: number[] } {
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

/**
 * Transform crypto analysis handler response into visualization
 */
export function transformCryptoAnalysisToVisualization(
  response: HandlerResponse,
  strategyName?: string,
): StrategyVisualization | null {
  const { symbol, indicators, timestamps, priceData } = response

  if (!indicators || !timestamps || timestamps.length === 0) {
    return null
  }

  // Extract price values from priceData if available
  const priceValues = priceData ? priceData.map((p) => p.price) : []

  if (priceValues.length === 0) {
    return null
  }

  const overlays: ChartOverlay[] = []
  const period = 20 // Default period

  // Generate SMA overlay if available
  if (indicators.sma !== undefined) {
    const smaValues = Array.isArray(indicators.sma)
      ? indicators.sma
      : calculateSMAArray(priceValues, period)
    overlays.push(generateSMAOverlay(smaValues, timestamps, period))
  }

  // Generate EMA overlay if available
  if (indicators.ema !== undefined) {
    const emaValues = Array.isArray(indicators.ema)
      ? indicators.ema
      : calculateEMAArray(priceValues, period)
    overlays.push(generateEMAOverlay(emaValues, timestamps, period))
  }

  // Generate Bollinger Bands overlay if available
  if (indicators.bollinger) {
    const bb = indicators.bollinger
    const upper = Array.isArray(bb.upper) ? bb.upper : calculateBollingerBandsArray(priceValues, period, 2).upper
    const middle = Array.isArray(bb.middle) ? bb.middle : calculateBollingerBandsArray(priceValues, period, 2).middle
    const lower = Array.isArray(bb.lower) ? bb.lower : calculateBollingerBandsArray(priceValues, period, 2).lower

    overlays.push(generateBollingerBandsOverlay(upper, middle, lower, timestamps, period))
  }

  if (overlays.length === 0) {
    return null
  }

  return generateStrategyVisualization(
    strategyName || `${symbol} Analysis`,
    symbol,
    overlays,
    undefined,
    `Technical analysis for ${symbol}`,
  )
}

/**
 * Transform indicator calculation handler response into visualization
 */
export function transformIndicatorCalculationToVisualization(
  response: HandlerResponse,
  strategyName?: string,
): StrategyVisualization | null {
  const { symbol, indicator, result, timestamps, priceData } = response

  if (!result || !timestamps || timestamps.length === 0) {
    return null
  }

  // Extract price values from priceData if available
  const priceValues = priceData ? priceData.map((p) => p.price) : []

  if (priceValues.length === 0) {
    return null
  }

  const overlays: ChartOverlay[] = []
  const period = 20 // Default period

  // Handle different indicator types
  const indicatorName = indicator?.toLowerCase()

  if (indicatorName === "sma") {
    const smaValue = typeof result === "object" && "sma" in result ? result.sma : result
    const smaValues = Array.isArray(smaValue) ? smaValue : calculateSMAArray(priceValues, period)
    overlays.push(generateSMAOverlay(smaValues, timestamps, period))
  } else if (indicatorName === "ema") {
    const emaValue = typeof result === "object" && "ema" in result ? result.ema : result
    const emaValues = Array.isArray(emaValue) ? emaValue : calculateEMAArray(priceValues, period)
    overlays.push(generateEMAOverlay(emaValues, timestamps, period))
  } else if (indicatorName === "bollinger") {
    const bb = typeof result === "object" && "upper" in result ? result : { upper: 0, middle: 0, lower: 0 }
    const upper = Array.isArray(bb.upper) ? bb.upper : calculateBollingerBandsArray(priceValues, period, 2).upper
    const middle = Array.isArray(bb.middle) ? bb.middle : calculateBollingerBandsArray(priceValues, period, 2).middle
    const lower = Array.isArray(bb.lower) ? bb.lower : calculateBollingerBandsArray(priceValues, period, 2).lower

    overlays.push(generateBollingerBandsOverlay(upper, middle, lower, timestamps, period))
  }

  if (overlays.length === 0) {
    return null
  }

  return generateStrategyVisualization(
    strategyName || `${symbol} ${indicator?.toUpperCase() || "Indicator"}`,
    symbol,
    overlays,
    undefined,
    `${indicator?.toUpperCase() || "Indicator"} calculation for ${symbol}`,
  )
}

/**
 * Create visualization from raw overlay data (for LLM-generated JSON)
 */
export function createVisualizationFromRaw(
  raw: Partial<StrategyVisualization>,
): StrategyVisualization | null {
  if (!raw.strategyName || !raw.symbol || !raw.overlays || raw.overlays.length === 0) {
    return null
  }

  return generateStrategyVisualization(
    raw.strategyName,
    raw.symbol,
    raw.overlays,
    raw.strategyId,
    raw.description,
  )
}

