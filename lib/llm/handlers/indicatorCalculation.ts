// lib/llm/handlers/indicatorCalculation.ts

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

export async function handleIndicatorCalculation(input: any, ctx: ExecutionContext) {
  const { indicator, symbol } = input

  // Fetch price history for symbol - use internal API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/v1/crypto/price?symbol=${symbol}`)
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

