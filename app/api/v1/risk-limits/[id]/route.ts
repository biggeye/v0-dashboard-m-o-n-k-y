import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      execution_mode,
      max_notional_per_order,
      max_daily_notional,
      allowed_symbols,
    } = body

    // Validate execution_mode if provided
    if (execution_mode) {
      const validModes = ["manual", "auto_sandbox", "auto_prod", "disabled"]
      if (!validModes.includes(execution_mode)) {
        return NextResponse.json(
          { error: `execution_mode must be one of: ${validModes.join(", ")}` },
          { status: 400 },
        )
      }
    }

    // Build update object
    const updateData: Record<string, any> = {}

    if (execution_mode !== undefined) {
      updateData.execution_mode = execution_mode
    }

    if (max_notional_per_order !== undefined) {
      updateData.max_notional_per_order = max_notional_per_order ? Number(max_notional_per_order) : null
    }

    if (max_daily_notional !== undefined) {
      updateData.max_daily_notional = max_daily_notional ? Number(max_daily_notional) : null
    }

    if (allowed_symbols !== undefined) {
      let symbolsArray: string[] = []
      if (allowed_symbols) {
        if (typeof allowed_symbols === "string") {
          symbolsArray = allowed_symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
        } else if (Array.isArray(allowed_symbols)) {
          symbolsArray = allowed_symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
        }
      }
      updateData.allowed_symbols = symbolsArray.length > 0 ? symbolsArray : null
    }

    const { data, error } = await supabase
      .from("risk_limits")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: "Risk limit not found" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] Error updating risk limit:", error)
    return NextResponse.json({ error: "Failed to update risk limit" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("risk_limits")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting risk limit:", error)
    return NextResponse.json({ error: "Failed to delete risk limit" }, { status: 500 })
  }
}

