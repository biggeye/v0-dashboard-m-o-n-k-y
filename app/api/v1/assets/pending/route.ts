import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getPendingDiscoveredTokens } from "@/lib/web3/assets/asset-service"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tokens = await getPendingDiscoveredTokens(user.id)

    return NextResponse.json({ data: tokens })
  } catch (error) {
    console.error("[v0] Error fetching pending tokens:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending tokens" },
      { status: 500 }
    )
  }
}

