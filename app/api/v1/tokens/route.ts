import { createClient } from "@/lib/supabase/server"
import {
  addTokenToIndex,
  getActiveTokens,
  getUserTokens,
  removeUserToken,
} from "@/lib/services/token-service"
import { type NextRequest, NextResponse } from "next/server"

/**
 * GET /api/v1/tokens
 * Get all active tokens or user's tokens
 * Query params: ?userOnly=true to get only user-added tokens
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userOnly = request.nextUrl.searchParams.get("userOnly") === "true"

    if (userOnly) {
      const tokens = await getUserTokens(user.id)
      return NextResponse.json({ data: tokens })
    }

    const tokens = await getActiveTokens()
    return NextResponse.json({ data: tokens })
  } catch (error) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tokens" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/tokens
 * Add a new token to the index
 * Body: { symbol: string }
 */
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
    const { symbol } = body

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      )
    }

    const finnhubApiKey = process.env.FINNHUB_API_KEY
    if (!finnhubApiKey) {
      return NextResponse.json(
        { error: "Finnhub API key not configured" },
        { status: 500 }
      )
    }

    const result = await addTokenToIndex(symbol, user.id, finnhubApiKey)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add token" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Token ${symbol} added successfully`,
      data: result.token,
    })
  } catch (error) {
    console.error("Error adding token:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add token" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/tokens?symbol=BTC
 * Remove/deactivate a user-added token
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get("symbol")
    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      )
    }

    const result = await removeUserToken(symbol, user.id)

    return NextResponse.json({
      message: `Token ${symbol} removed successfully`,
      data: result,
    })
  } catch (error) {
    console.error("Error removing token:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove token" },
      { status: 500 }
    )
  }
}

