// Types for chart visualization overlays from LLM strategies

export type OverlayType = 
  | "line"           // Moving averages, trend lines
  | "band"           // Bollinger bands, support/resistance zones
  | "marker"         // Entry/exit points, alerts
  | "indicator"      // RSI, MACD, etc.
  | "zone"           // Support/resistance zones

export interface ChartOverlay {
  id: string
  type: OverlayType
  label: string
  color?: string
  data: OverlayData
  style?: OverlayStyle
}

export interface OverlayData {
  // For lines (SMA, EMA, etc.)
  values?: number[]
  timestamps?: string[]
  
  // For bands (Bollinger, etc.)
  upper?: number[]
  middle?: number[]
  lower?: number[]
  
  // For markers (entry/exit points)
  points?: MarkerPoint[]
  
  // For zones (support/resistance)
  zones?: Zone[]
}

export interface MarkerPoint {
  timestamp: string
  price: number
  label: string
  type: "entry" | "exit" | "alert" | "signal"
}

export interface Zone {
  startTimestamp: string
  endTimestamp: string
  upperPrice: number
  lowerPrice: number
  label: string
  type: "support" | "resistance" | "range"
}

export interface OverlayStyle {
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  fillOpacity?: number
}

export interface StrategyVisualization {
  strategyId?: string
  strategyName: string
  symbol: string
  overlays: ChartOverlay[]
  description?: string
}

