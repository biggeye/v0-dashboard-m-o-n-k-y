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
      .from("portfolio_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Portfolio error:", error)
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 })
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
    const { symbol, quantity, averageBuyPrice } = body

    const { data, error } = await supabase.from("portfolio_holdings").upsert(
      {
        user_id: user.id,
        symbol,
        quantity,
        average_buy_price: averageBuyPrice,
      },
      { onConflict: "user_id,symbol" },
    )

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Portfolio error:", error)
    return NextResponse.json({ error: "Failed to create holding" }, { status: 500 })
  }
}
