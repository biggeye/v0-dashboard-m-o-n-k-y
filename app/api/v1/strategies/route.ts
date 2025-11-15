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

    const { data, error } = await supabase
      .from("trading_strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Strategies error:", error)
    return NextResponse.json({ error: "Failed to fetch strategies" }, { status: 500 })
  }
}

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
    const { name, symbol, description, indicators } = body

    const { data, error } = await supabase.from("trading_strategies").insert({
      user_id: user.id,
      name,
      symbol,
      description,
      indicators,
      is_active: false,
    })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Create strategy error:", error)
    return NextResponse.json({ error: "Failed to create strategy" }, { status: 500 })
  }
}
