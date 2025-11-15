// lib/llm/handlers/strategyManagement.ts

import type { ExecutionContext } from "../agent/executor"

export async function handleStrategyManagement(input: any, ctx: ExecutionContext) {
  const { action, strategyId, strategyConfig } = input

  if (!ctx.userId) {
    throw new Error("Authentication required for strategy management")
  }

  if (action === "create") {
    const { data, error } = await ctx.supabase.from("trading_strategies").insert({
      user_id: ctx.userId,
      ...strategyConfig,
    })
    if (error) throw error
    return { action: "created", strategy: data }
  }

  if (action === "list") {
    const { data, error } = await ctx.supabase
      .from("trading_strategies")
      .select("*")
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "list", strategies: data }
  }

  if (action === "update") {
    if (!strategyId) {
      throw new Error("strategyId required for update action")
    }
    const { data, error } = await ctx.supabase
      .from("trading_strategies")
      .update(strategyConfig)
      .eq("id", strategyId)
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "updated", strategy: data }
  }

  if (action === "activate" || action === "deactivate") {
    if (!strategyId) {
      throw new Error("strategyId required for activate/deactivate action")
    }
    const { data, error } = await ctx.supabase
      .from("trading_strategies")
      .update({ is_active: action === "activate" })
      .eq("id", strategyId)
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action, strategyId }
  }

  if (action === "delete") {
    if (!strategyId) {
      throw new Error("strategyId required for delete action")
    }
    const { error } = await ctx.supabase
      .from("trading_strategies")
      .delete()
      .eq("id", strategyId)
      .eq("user_id", ctx.userId)
    if (error) throw error
    return { action: "deleted", strategyId }
  }

  return { error: "Invalid action" }
}

