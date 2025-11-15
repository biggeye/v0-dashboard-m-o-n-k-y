import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// ISR: Revalidate every 24 hours (86400 seconds)
export const revalidate = 86400

/**
 * GET /api/v1/tokens/metadata
 * Returns public token metadata from token_index
 * No authentication required - this is public metadata
 * ISR cached for 24 hours
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Query public token metadata (no user-specific data)
    const { data: tokens, error } = await supabase
      .from("token_index")
      .select("id, symbol, name, finnhub_symbol, contract_address, chain_id, decimals, description, is_active")
      .eq("is_active", true)
      .order("symbol", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching token metadata:", error)
      return NextResponse.json(
        { error: "Failed to fetch token metadata" },
        { status: 500 }
      )
    }

    // Format response with only public fields
    const metadata = (tokens || []).map((token) => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      finnhubSymbol: token.finnhub_symbol,
      contractAddress: token.contract_address,
      chainId: token.chain_id,
      decimals: token.decimals,
      description: token.description,
    }))

    return NextResponse.json({
      data: metadata,
      count: metadata.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching token metadata:", error)
    return NextResponse.json(
      { error: "Failed to fetch token metadata" },
      { status: 500 }
    )
  }
}

