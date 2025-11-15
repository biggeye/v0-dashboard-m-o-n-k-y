import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    // Get all tokens with discovered_pending status
    const { data, error } = await supabase
      .from("token_index")
      .select("*")
      .eq("discovery_status", "discovered_pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching pending tokens:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending tokens" },
      { status: 500 }
    )
  }
}

