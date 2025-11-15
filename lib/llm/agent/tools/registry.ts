// lib/llm/agent/tools/registry.ts

import { ToolRegistry } from "../executor"
import type { ExecutionContext } from "../executor"
import { AGENT_TOOLS } from "./index"
// Import handlers
import { handleCryptoAnalysis } from "@/lib/llm/handlers/cryptoAnalysis"
import { handleIndicatorCalculation } from "@/lib/llm/handlers/indicatorCalculation"
import { handlePortfolioAnalysis } from "@/lib/llm/handlers/portfolioAnalysis"
import { handleStrategyManagement } from "@/lib/llm/handlers/strategyManagement"
import { handlePriceAlertManagement } from "@/lib/llm/handlers/priceAlerts"
import { handleEnsurePriceContext, handleSearchPriceWindows } from "@/lib/llm/handlers/priceContext"
import { getToolByName } from "./types"

export function buildToolRegistry() {
  const registry = new ToolRegistry()

  // Helper to grab defs safely
  const def = (name: string) => {
    const t = getToolByName(AGENT_TOOLS, name)
    if (!t) throw new Error(`Tool definition not found for "${name}"`)
    return t
  }

  registry.register(def("crypto_analysis"), handleCryptoAnalysis)
  registry.register(def("calculate_indicator"), handleIndicatorCalculation)
  registry.register(def("portfolio_analysis"), handlePortfolioAnalysis)
  registry.register(def("manage_strategy"), handleStrategyManagement)
  registry.register(def("manage_alerts"), handlePriceAlertManagement)
  // new price-context tools
  registry.register(def("ensure_price_context_for_question"), handleEnsurePriceContext)
  registry.register(def("search_price_windows"), handleSearchPriceWindows)

  return registry
}

// Convenience re-export
export type { ExecutionContext }

