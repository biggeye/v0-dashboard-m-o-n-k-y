// lib/llm/handlers/priceAlerts.ts

import type { ExecutionContext } from "../agent/executor"

export async function handlePriceAlertManagement(input: any, ctx: ExecutionContext) {
  const { action, symbol, condition, priceThreshold, alertId } = input

  if (!ctx.userId) {
    throw new Error("Authentication required for alert management")
  }

  if (action === "create") {
    if (!symbol || !condition || !priceThreshold) {
      throw new Error("symbol, condition, and priceThreshold required for create action")
    }
    const { data, error } = await ctx.supabase.from("price_alerts").insert({
      user_id: ctx.userId,
      symbol,
      condition,
      price_threshold: priceThreshold,
    })
    if (error) throw error
    return { action: "created", alert: data }
  }

  if (action === "list") {
    const { data, error } = await ctx.supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "list", alerts: data }
  }

  if (action === "update") {
    if (!alertId) {
      throw new Error("alertId required for update action")
    }
    const updateData: any = {}
    if (symbol) updateData.symbol = symbol
    if (condition) updateData.condition = condition
    if (priceThreshold !== undefined) updateData.price_threshold = priceThreshold

    const { data, error } = await ctx.supabase
      .from("price_alerts")
      .update(updateData)
      .eq("id", alertId)
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "updated", alert: data }
  }

  if (action === "delete") {
    if (!alertId) {
      throw new Error("alertId required for delete action")
    }
    const { error } = await ctx.supabase
      .from("price_alerts")
      .delete()
      .eq("id", alertId)
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "deleted", alertId }
  }

  return { error: "Invalid action" }
}

