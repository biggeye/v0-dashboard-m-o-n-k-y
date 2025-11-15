/**
 * Visualization Domain
 * 
 * Centralized exports for the visualization domain namespace.
 * Provides state management, generators, and transformation services.
 */

// State Management
export { ChartVisualizationProvider, useChartVisualization } from "./store/context"

// Generators
export {
  generateSMAOverlay,
  generateEMAOverlay,
  generateBollingerBandsOverlay,
  generateEntryExitMarkers,
  generateStrategyVisualization,
} from "./generators"

// Services
export {
  transformCryptoAnalysisToVisualization,
  transformIndicatorCalculationToVisualization,
  createVisualizationFromRaw,
} from "./service"

// Re-export types for convenience
export type { StrategyVisualization, ChartOverlay } from "@/lib/types/visualization"

