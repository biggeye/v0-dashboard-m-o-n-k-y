// Central export point for all LLM agent tools
export * from "./types"
export * from "./crypto/core.tools"
export * from "./crypto/price-context.tools"

import { CRYPTO_CORE_TOOLS } from "./crypto/core.tools"
import { PRICE_CONTEXT_TOOLS } from "./crypto/price-context.tools"
import type { LLMToolDefinition } from "./types"
import { toOpenAITools as toOpenAIToolsBase, toAnthropicTools as toAnthropicToolsBase, getToolByName as getToolByNameBase } from "./types"

// Aggregate all available tools
export const AGENT_TOOLS: LLMToolDefinition[] = [
  ...CRYPTO_CORE_TOOLS,
  ...PRICE_CONTEXT_TOOLS,
]

// Re-export helper functions with convenience wrappers
export { getToolByNameBase as getToolByName }

// Convenience functions that work with the aggregated AGENT_TOOLS
export function toOpenAITools() {
  return toOpenAIToolsBase(AGENT_TOOLS)
}

export function toAnthropicTools() {
  return toAnthropicToolsBase(AGENT_TOOLS)
}

// Convenience function to get tool by name from the aggregated list
export function getToolByNameFromAll(toolName: string): LLMToolDefinition | undefined {
  return getToolByNameBase(AGENT_TOOLS, toolName)
}

