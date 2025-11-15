import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { activateAsset } from "@/lib/web3/assets/asset-service"

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
    const { tokenId, walletConnectionId } = body

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      )
    }

    const asset = await activateAsset(user.id, tokenId, walletConnectionId)

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error("[v0] Error activating asset:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to activate asset" },
      { status: 500 }
    )
  }
}

