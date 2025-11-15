// API endpoint for managing orders
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    const status = request.nextUrl.searchParams.get("status")

    let query = supabase
      .from("trading_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (status === "open") {
      query = query.in("status", ["open", "pending", "partially_filled"])
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error fetching orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
