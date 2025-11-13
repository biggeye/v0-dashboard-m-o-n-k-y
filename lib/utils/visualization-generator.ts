// Utility to generate chart overlays from strategy data and indicator calculations
import type { ChartOverlay, StrategyVisualization } from "@/lib/types/visualization"

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

