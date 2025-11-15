"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { StrategyVisualization, ChartOverlay } from "@/lib/types/visualization"

interface ChartVisualizationContextType {
  visualizations: StrategyVisualization[]
  activeOverlays: ChartOverlay[]
  addVisualization: (visualization: StrategyVisualization) => void
  removeVisualization: (strategyId: string) => void
  clearVisualizations: () => void
  getOverlaysForSymbol: (symbol: string) => ChartOverlay[]
}

const ChartVisualizationContext = createContext<ChartVisualizationContextType | undefined>(undefined)

export function ChartVisualizationProvider({ children }: { children: React.ReactNode }) {
  const [visualizations, setVisualizations] = useState<StrategyVisualization[]>([])

  const addVisualization = useCallback((visualization: StrategyVisualization) => {
    setVisualizations((prev) => {
      // Remove existing visualization for same strategy if exists
      const filtered = prev.filter((v) => v.strategyId !== visualization.strategyId)
      return [...filtered, visualization]
    })
  }, [])

  const removeVisualization = useCallback((strategyId: string) => {
    setVisualizations((prev) => prev.filter((v) => v.strategyId !== strategyId))
  }, [])

  const clearVisualizations = useCallback(() => {
    setVisualizations([])
  }, [])

  const getOverlaysForSymbol = useCallback(
    (symbol: string): ChartOverlay[] => {
      return visualizations
        .filter((v) => v.symbol.toUpperCase() === symbol.toUpperCase())
        .flatMap((v) => v.overlays)
    },
    [visualizations],
  )

  // Flatten all overlays from all visualizations
  const activeOverlays = visualizations.flatMap((v) => v.overlays)

  return (
    <ChartVisualizationContext.Provider
      value={{
        visualizations,
        activeOverlays,
        addVisualization,
        removeVisualization,
        clearVisualizations,
        getOverlaysForSymbol,
      }}
    >
      {children}
    </ChartVisualizationContext.Provider>
  )
}

export function useChartVisualization() {
  const context = useContext(ChartVisualizationContext)
  if (!context) {
    throw new Error("useChartVisualization must be used within ChartVisualizationProvider")
  }
  return context
}

