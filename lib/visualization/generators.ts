/**
 * Visualization Generators
 * 
 * Factory functions for creating chart overlays and strategy visualizations
 * from raw indicator data and trading signals.
 */

import type { ChartOverlay, StrategyVisualization } from "@/lib/types/visualization"

/**
 * Generate a Simple Moving Average (SMA) overlay
 */
export function generateSMAOverlay(
  values: number[],
  timestamps: string[],
  period: number,
  color = "#3b82f6",
): ChartOverlay {
  return {
    id: `sma-${period}`,
    type: "line",
    label: `SMA(${period})`,
    color,
    data: {
      values,
      timestamps,
    },
    style: {
      strokeWidth: 2,
      strokeDasharray: "5 5",
    },
  }
}

/**
 * Generate an Exponential Moving Average (EMA) overlay
 */
export function generateEMAOverlay(
  values: number[],
  timestamps: string[],
  period: number,
  color = "#8b5cf6",
): ChartOverlay {
  return {
    id: `ema-${period}`,
    type: "line",
    label: `EMA(${period})`,
    color,
    data: {
      values,
      timestamps,
    },
    style: {
      strokeWidth: 2,
    },
  }
}

/**
 * Generate a Bollinger Bands overlay
 */
export function generateBollingerBandsOverlay(
  upper: number[],
  middle: number[],
  lower: number[],
  timestamps: string[],
  period: number,
  color = "#f59e0b",
): ChartOverlay {
  return {
    id: `bollinger-${period}`,
    type: "band",
    label: `Bollinger Bands(${period})`,
    color,
    data: {
      upper,
      middle,
      lower,
      timestamps,
    },
    style: {
      strokeWidth: 1,
      fillOpacity: 0.1,
    },
  }
}

/**
 * Generate entry/exit point markers overlay
 */
export function generateEntryExitMarkers(
  entryPoints: Array<{ timestamp: string; price: number }>,
  exitPoints: Array<{ timestamp: string; price: number }>,
): ChartOverlay {
  return {
    id: "strategy-markers",
    type: "marker",
    label: "Entry/Exit Points",
    color: "#10b981",
    data: {
      points: [
        ...entryPoints.map((p) => ({
          ...p,
          label: "Entry",
          type: "entry" as const,
        })),
        ...exitPoints.map((p) => ({
          ...p,
          label: "Exit",
          type: "exit" as const,
        })),
      ],
    },
  }
}

/**
 * Generate a complete strategy visualization from overlays
 */
export function generateStrategyVisualization(
  strategyName: string,
  symbol: string,
  overlays: ChartOverlay[],
  strategyId?: string,
  description?: string,
): StrategyVisualization {
  return {
    strategyId,
    strategyName,
    symbol,
    overlays,
    description,
  }
}

