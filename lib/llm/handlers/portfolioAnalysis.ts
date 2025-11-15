// lib/llm/handlers/portfolioAnalysis.ts

import type { ExecutionContext } from "../agent/executor"

export async function handlePortfolioAnalysis(input: any, ctx: ExecutionContext) {
  const { analysisType, riskTolerance } = input

  if (!ctx.userId) {
    throw new Error("Authentication required for portfolio analysis")
  }

  // Fetch user's holdings
  const { data: holdings, error } = await ctx.supabase
    .from("portfolio_holdings")
    .select("*")
    .eq("user_id", ctx.userId)

  if (error) throw error

  const totalValue = holdings.reduce((sum: number, h: any) => sum + h.quantity * h.average_buy_price, 0)

  const allocation = holdings.map((h: any) => ({
    symbol: h.symbol,
    quantity: h.quantity,
    allocationPercent: totalValue > 0 ? ((h.quantity * h.average_buy_price) / totalValue) * 100 : 0,
  }))

  return {
    analysisType,
    riskTolerance,
    holdings: holdings.length,
    totalValue,
    allocation,
  }
}

