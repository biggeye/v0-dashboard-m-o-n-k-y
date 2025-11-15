import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
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

    // Check if user is admin or superadmin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (status !== "discovered_approved" && status !== "manual") {
      return NextResponse.json(
        { error: "Invalid status. Must be 'discovered_approved' or 'manual'" },
        { status: 400 }
      )
    }

    const tokenId = params.tokenId

    // Update token status
    const { data, error } = await supabase
      .from("token_index")
      .update({
        discovery_status: status,
        is_active: status === "discovered_approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error approving token:", error)
    return NextResponse.json(
      { error: "Failed to approve token" },
      { status: 500 }
    )
  }
}

