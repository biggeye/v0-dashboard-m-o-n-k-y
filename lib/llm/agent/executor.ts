// lib/llm/agent/executor.ts

import type { SupabaseClient } from "@supabase/supabase-js"

import type { LLMToolDefinition, ValidationResult } from "./tools/types"
import { validateToolInput } from "./tools/types"

/**
 * Execution context available to every tool.
 * Extend as needed (logger, config, redis, etc).
 */
export interface ExecutionContext {
  supabase: SupabaseClient
  userId: string | null
  // add more here as needed (e.g. requestId, logger)
}

export type ToolExecutor = (
  input: any,
  context: ExecutionContext,
) => Promise<any>

type RegisteredTool = {
  definition: LLMToolDefinition
  executor: ToolExecutor
}

export class ToolRegistry {
  private executors = new Map<string, RegisteredTool>()

  register(definition: LLMToolDefinition, executor: ToolExecutor) {
    if (this.executors.has(definition.name)) {
      throw new Error(`Tool ${definition.name} already registered`)
    }
    this.executors.set(definition.name, { definition, executor })
  }

  getDefinition(name: string): LLMToolDefinition | undefined {
    return this.executors.get(name)?.definition
  }

  listDefinitions(): LLMToolDefinition[] {
    return Array.from(this.executors.values()).map((r) => r.definition)
  }

  async execute(
    name: string,
    input: any,
    context: ExecutionContext,
  ): Promise<{ result: any; definition: LLMToolDefinition }> {
    const entry = this.executors.get(name)

    if (!entry) throw new Error(`Tool ${name} not found in registry`)

    const { definition, executor } = entry

    // 1) Validate input according to JSON schema
    const validation: ValidationResult = validateToolInput(definition, input)

    if (!validation.ok) {
      const err = new Error(`Invalid input for tool "${name}": ${validation.error}`)
      ;(err as any).details = validation.details
      throw err
    }

    // 2) TODO: rate limiting, auth checks using definition.metadata

    // 3) Execute tool
    const result = await executor(validation.value, context)

    return { result, definition }
  }
}

