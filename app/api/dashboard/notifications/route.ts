// API endpoint to fetch real notifications from database
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

    // Fetch triggered price alerts as notifications
    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("id, symbol, condition, price_threshold, triggered_at")
      .eq("user_id", user.id)
      .eq("is_triggered", true)
      .order("triggered_at", { ascending: false })
      .limit(10)

    // Fetch recent orders as notifications
    const { data: orders } = await supabase
      .from("trading_orders")
      .select("id, symbol, side, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["filled", "cancelled", "rejected"])
      .order("created_at", { ascending: false })
      .limit(10)

    const notifications = [
      ...(alerts?.map((alert) => ({
        id: `alert-${alert.id}`,
        title: "PRICE ALERT TRIGGERED",
        message: `${alert.symbol} ${alert.condition} $${alert.price_threshold}`,
        timestamp: alert.triggered_at,
        type: "warning" as const,
        read: false,
        priority: "high" as const,
      })) || []),
      ...(orders?.map((order) => ({
        id: `order-${order.id}`,
        title: `ORDER ${order.status.toUpperCase()}`,
        message: `${order.side.toUpperCase()} ${order.symbol}`,
        timestamp: order.created_at,
        type: order.status === "filled" ? ("success" as const) : ("info" as const),
        read: false,
        priority: "medium" as const,
      })) || []),
    ]

    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ data: notifications.slice(0, 10) })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
