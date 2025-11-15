import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: "User ID and role are required" }, { status: 400 })
    }

    if (!["user", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Prevent removing the last superadmin
    if (role !== "superadmin") {
      const { data: targetUser } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (targetUser?.role === "superadmin") {
        const { count } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "superadmin")

        if ((count || 0) <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last superadmin" },
            { status: 400 },
          )
        }
      }
    }

    // Update user role
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Update user role error:", error)
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
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

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error("[v0] Fetch users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

