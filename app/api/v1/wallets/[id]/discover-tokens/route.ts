import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { discoverAndStoreTokens } from "@/lib/web3/assets/asset-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const walletId = params.id

    // Get wallet connection
    const { data: wallet, error: walletError } = await supabase
      .from("wallet_connections")
      .select("*")
      .eq("id", walletId)
      .eq("user_id", user.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Discover tokens
    const result = await discoverAndStoreTokens(
      wallet.wallet_address,
      wallet.chain_id,
      user.id,
      wallet.id
    )

    // Update last_synced_at
    await supabase
      .from("wallet_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", walletId)

    return NextResponse.json({
      success: true,
      discovered: result.discovered,
      errors: result.errors,
    })
  } catch (error) {
    console.error("[v0] Error discovering tokens:", error)
    return NextResponse.json(
      { error: "Failed to discover tokens" },
      { status: 500 }
    )
  }
}

