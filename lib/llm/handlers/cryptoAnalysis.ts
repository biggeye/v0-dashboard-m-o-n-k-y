// lib/llm/handlers/cryptoAnalysis.ts

import type { ExecutionContext } from "../agent/executor"

async function callIndicator(indicator: string, prices: number[]) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/v1/crypto/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicator, prices }),
  })

  const result = await response.json()
  return result.data
}

export async function handleCryptoAnalysis(input: any, ctx: ExecutionContext) {
  const { symbol, analysisType } = input

  // Fetch price history - use internal API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/v1/crypto/price?symbol=${symbol}`)
  const { data: prices } = await response.json()

  if (!prices || prices.length === 0) {
    return { error: `No price data for ${symbol}` }
  }

  const priceValues = prices.map((p: any) => p.price)
  const timestamps = prices.map((p: any) => p.timestamp)

  // Based on analysis type, calculate relevant indicators
  let indicators = {}

  if (analysisType === "trend" || analysisType === "comprehensive" || analysisType === "price_trend") {
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

