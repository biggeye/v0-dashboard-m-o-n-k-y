import { NextResponse } from "next/server"
import { SUPPORTED_CHAINS } from "@/lib/data/static-metadata"

// ISR: Revalidate every 7 days (604800 seconds)
export const revalidate = 604800

/**
 * GET /api/v1/chains
 * Returns list of supported blockchain chains
 * ISR cached for 7 days
 */
export async function GET() {
  try {
    // Convert Record to array format for easier consumption
    const chains = Object.values(SUPPORTED_CHAINS).map((chain) => ({
      chainId: chain.chainId,
      name: chain.name,
      rpcUrl: chain.rpcUrl,
      nativeCurrency: chain.nativeCurrency,
      blockExplorerUrl: chain.blockExplorerUrl,
    }))

    return NextResponse.json({
      data: chains,
      count: chains.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching chains:", error)
    return NextResponse.json(
      { error: "Failed to fetch chains" },
      { status: 500 }
    )
  }
}

