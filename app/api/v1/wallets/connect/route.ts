// API endpoint to save wallet connections
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { discoverAndStoreTokens } from "@/lib/web3/assets/asset-service"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { walletAddress, chainId, chainName, walletType, isPrimary } = body

    if (!walletAddress || !chainId || !chainName || !walletType) {
      return NextResponse.json(
        { error: "Wallet address, chain ID, chain name, and wallet type are required" },
        { status: 400 },
      )
    }

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from("wallet_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("wallet_address", walletAddress.toLowerCase())
      .eq("chain_id", chainId)
      .single()

    if (existing) {
      // Update existing connection
      const { data, error } = await supabase
        .from("wallet_connections")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error

      // Trigger token discovery in the background for existing connections too
      discoverAndStoreTokens(
        walletAddress.toLowerCase(),
        chainId,
        user.id,
        existing.id
      ).catch((err) => {
        console.error("[v0] Error discovering tokens for existing wallet:", err)
      })

      return NextResponse.json({ success: true, data })
    }

    // Create new wallet connection
    const { data, error } = await supabase
      .from("wallet_connections")
      .insert({
        user_id: user.id,
        wallet_type: walletType,
        wallet_address: walletAddress.toLowerCase(),
        chain_id: chainId,
        chain_name: chainName,
        is_primary: isPrimary || false,
        balance_usd: 0,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Trigger token discovery in the background (non-blocking)
    discoverAndStoreTokens(
      walletAddress.toLowerCase(),
      chainId,
      user.id,
      data.id
    ).catch((err) => {
      console.error("[v0] Error discovering tokens after wallet connection:", err)
      // Don't fail the connection if discovery fails
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error saving wallet connection:", error)
    return NextResponse.json({ error: "Failed to save wallet connection" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("wallet_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error fetching wallet connections:", error)
    return NextResponse.json({ error: "Failed to fetch wallet connections" }, { status: 500 })
  }
}
