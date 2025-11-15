import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getUserAssets } from "@/lib/web3/assets/asset-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assets = await getUserAssets(user.id)

    return NextResponse.json({ data: assets })
  } catch (error) {
    console.error("[v0] Error fetching user assets:", error)
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    )
  }
}

