import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { removeAssetFromUser } from "@/lib/web3/assets/asset-service"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tokenId = params.tokenId

    await removeAssetFromUser(user.id, tokenId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing asset:", error)
    return NextResponse.json(
      { error: "Failed to remove asset" },
      { status: 500 }
    )
  }
}

