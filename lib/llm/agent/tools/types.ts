// lib/llm/agent/tools/types.ts

import Ajv, { ErrorObject } from "ajv"

const ajv = new Ajv({ allErrors: true, coerceTypes: true })

export type RateLimitConfig = {
  requests: number
  window: string // e.g. "1m", "1h"
}

export type ToolExample = {
  description: string
  input: Record<string, any>
}

export type LLMToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, any>
  // New metadata fields
  category?: string // e.g. "analysis" | "portfolio" | "price-context"
  tags?: string[] // e.g. ["price", "indicator", "real-time"]
  examples?: ToolExample[]
  requiresAuth?: boolean
  rateLimit?: RateLimitConfig
}

// --- JSON Schema validation helpers ---

export type ValidationResult =
  | { ok: true; value: any }
  | { ok: false; error: string; details?: ErrorObject[] }

export function validateToolInput(
  tool: LLMToolDefinition,
  input: any,
): ValidationResult {
  try {
    const validate = ajv.compile(tool.inputSchema)
    const valid = validate(input)

    if (!valid) {
      return {
        ok: false,
        error: ajv.errorsText(validate.errors),
        details: validate.errors ?? undefined,
      }
    }

    return { ok: true, value: input }
  } catch (err: any) {
    return {
      ok: false,
      error: `Schema validation error for tool ${tool.name}: ${err?.message || String(err)}`,
    }
  }
}

// --- Tool format conversions ---

export function toOpenAITools(tools: LLMToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }))
}

export function toAnthropicTools(tools: LLMToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
}

export function getToolByName(tools: LLMToolDefinition[], name: string) {
  return tools.find((t) => t.name === name)
}
