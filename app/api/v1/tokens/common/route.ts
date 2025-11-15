import { NextResponse } from "next/server"
import { COMMON_TOKENS } from "@/lib/data/static-metadata"

// ISR: Revalidate every 7 days (604800 seconds)
export const revalidate = 604800

/**
 * GET /api/v1/tokens/common
 * Returns common ERC20 tokens grouped by chain
 * Query param: ?chainId=<number> to filter by chain
 * ISR cached for 7 days
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chainIdParam = searchParams.get("chainId")

    if (chainIdParam) {
      // Return tokens for specific chain
      const chainId = parseInt(chainIdParam, 10)
      const tokens = COMMON_TOKENS[chainId] || []

      return NextResponse.json({
        data: tokens,
        chainId,
        count: tokens.length,
      })
    }

    // Return all tokens grouped by chain
    const tokensByChain = Object.entries(COMMON_TOKENS).map(([chainId, tokens]) => ({
      chainId: parseInt(chainId, 10),
      tokens,
      count: tokens.length,
    }))

    return NextResponse.json({
      data: tokensByChain,
      totalChains: tokensByChain.length,
      totalTokens: tokensByChain.reduce((sum, chain) => sum + chain.count, 0),
    })
  } catch (error) {
    console.error("[v0] Error fetching common tokens:", error)
    return NextResponse.json(
      { error: "Failed to fetch common tokens" },
      { status: 500 }
    )
  }
}

