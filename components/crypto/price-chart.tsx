"use client"

import { useState, useRef, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine, ReferenceArea } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { usePriceHistory } from "@/lib/hooks/use-price-data"
import { useProgressivePriceHistory } from "@/lib/hooks/use-progressive-price-history"
import { TrendingUp, TrendingDown, RefreshCw, ChevronLeft } from "lucide-react"
import type { ChartOverlay } from "@/lib/types/visualization"
import type { Timeframe } from "@/lib/utils/timeframe"
import { useAssets } from "@/lib/web3/assets"

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1mo", label: "1 Month" },
]

interface PriceChartProps {
  symbol?: string // Optional if using user assets
  title?: string
  overlays?: ChartOverlay[]
  defaultTimeframe?: Timeframe // Default timeframe (e.g., "1h", "1d", "1w")
  useUserAssets?: boolean // If true, fetch and use user's active assets
}

export function PriceChart({ 
  symbol: initialSymbol, 
  title, 
  overlays = [], 
  defaultTimeframe = "1h",
  useUserAssets = false 
}: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(defaultTimeframe)
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol || "")
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  // Conditionally use assets hook - but we need to always call it to follow React rules
  const assetsContext = useAssets()
  const { assets, isLoading: assetsLoading } = useUserAssets 
    ? assetsContext 
    : { assets: [], isLoading: false }
  
  // Initialize symbol from props or first asset
  useEffect(() => {
    if (useUserAssets && assets.length > 0 && !selectedSymbol) {
      setSelectedSymbol(assets[0].token.symbol)
    } else if (initialSymbol && !selectedSymbol) {
      setSelectedSymbol(initialSymbol)
    }
  }, [useUserAssets, assets, initialSymbol, selectedSymbol])
  
  const symbol = selectedSymbol || initialSymbol || ""
  
  // Determine if we should use progressive loading based on timeframe
  // For daily/weekly/monthly views, use progressive loading
  const longTimeframes: Timeframe[] = ["1d", "1w", "1mo"]
  const shouldUseProgressive = longTimeframes.includes(selectedTimeframe)
  
  // Use progressive loading for large datasets, regular loading for smaller ones
  const progressiveResult = useProgressivePriceHistory({
    symbol,
    timeframe: selectedTimeframe,
    enabled: shouldUseProgressive,
  })
  
  const regularResult = usePriceHistory(
    symbol,
    selectedTimeframe
  )
  
  // Select the appropriate result based on whether we're using progressive loading
  const activeResult = shouldUseProgressive ? progressiveResult : regularResult
  
  const {
    history: prices,
    isLoading,
    error,
    mutate,
    isBackfilling,
  } = activeResult
  
  const isLoadingMore = shouldUseProgressive ? (progressiveResult.isLoadingMore || false) : false
  const hasMore = shouldUseProgressive ? (progressiveResult.hasMore || false) : false
  const loadMore = shouldUseProgressive ? progressiveResult.loadMore : undefined

  if (!symbol) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title || "Price Chart"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            {useUserAssets && assetsLoading
              ? "Loading assets..."
              : useUserAssets && assets.length === 0
              ? "No assets selected. Activate assets to view charts."
              : "Please select a symbol"}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !prices || prices.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-destructive">Unable to load price data</div>
        </CardContent>
      </Card>
    )
  }

  // Sort prices by timestamp ascending (oldest first) for proper chronological display
  const sortedPrices = [...prices].sort((a: any, b: any) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeA - timeB
  })

  // Merge price data with overlay data
  const chartData = sortedPrices.map((p: any, index: number) => {
    const dataPoint: any = {
      time: new Date(p.timestamp).toLocaleTimeString(),
      timestamp: p.timestamp,
      price: p.price,
      change: p.change_24h,
    }

    // Add overlay values to each data point
    overlays.forEach((overlay) => {
      if (overlay.type === "line" && overlay.data.values && overlay.data.values[index] !== undefined) {
        dataPoint[overlay.id] = overlay.data.values[index]
      }
      if (overlay.type === "band") {
        if (overlay.data.upper && overlay.data.upper[index] !== undefined) {
          dataPoint[`${overlay.id}_upper`] = overlay.data.upper[index]
        }
        if (overlay.data.middle && overlay.data.middle[index] !== undefined) {
          dataPoint[`${overlay.id}_middle`] = overlay.data.middle[index]
        }
        if (overlay.data.lower && overlay.data.lower[index] !== undefined) {
          dataPoint[`${overlay.id}_lower`] = overlay.data.lower[index]
        }
      }
    })

    return dataPoint
  })

  const latestPrice = chartData[chartData.length - 1]?.price || 0
  const previousPrice = chartData[0]?.price || 0
  const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100
  const isPositive = priceChange >= 0

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setSelectedTimeframe(newTimeframe)
  }

  const handleRefresh = () => {
    mutate()
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
            {useUserAssets && assets.length > 0 && (
              <div className="mt-2">
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.tokenId} value={asset.token.symbol}>
                        {asset.token.symbol} - {asset.token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold">${latestPrice.toFixed(2)}</span>
              <div className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || isBackfilling}
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isBackfilling ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        {isBackfilling && (
          <div className="mt-2 text-xs text-muted-foreground">
            Backfilling historical data...
          </div>
        )}
        {shouldUseProgressive && hasMore && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="text-xs"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Loading older data...
                </>
              ) : (
                <>
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Load older data ({prices.length} points)
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent ref={chartContainerRef}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
              </linearGradient>
              {/* Gradients for overlay bands */}
              {overlays
                .filter((o) => o.type === "band")
                .map((overlay) => (
                  <linearGradient key={`gradient-${overlay.id}`} id={`gradient-${overlay.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={overlay.color || "var(--chart-2)"} stopOpacity={overlay.style?.fillOpacity || 0.2} />
                    <stop offset="95%" stopColor={overlay.color || "var(--chart-2)"} stopOpacity={0.05} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="time" 
              stroke="var(--muted-foreground)"
              tickFormatter={(value) => {
                // Find the corresponding data point for this time value
                const dataPoint = chartData.find((d: any) => d.time === value)
                if (!dataPoint) return value
                
                const timestamp = new Date(dataPoint.timestamp)
                // Format based on timeframe - show more detail for shorter timeframes
                if (selectedTimeframe === "1m" || selectedTimeframe === "5m") {
                  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } else if (selectedTimeframe === "15m" || selectedTimeframe === "30m" || selectedTimeframe === "1h") {
                  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } else if (selectedTimeframe === "4h" || selectedTimeframe === "1d") {
                  return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' })
                } else {
                  return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })
                }
              }}
            />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
            {/* Main price area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--chart-1)"
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
            
            {/* Render overlay lines */}
            {overlays
              .filter((o) => o.type === "line")
              .map((overlay) => (
                <Line
                  key={overlay.id}
                  type="monotone"
                  dataKey={overlay.id}
                  stroke={overlay.color || "var(--chart-2)"}
                  strokeWidth={overlay.style?.strokeWidth || 2}
                  strokeDasharray={overlay.style?.strokeDasharray}
                  dot={false}
                  name={overlay.label}
                />
              ))}
            
            {/* Render overlay bands */}
            {overlays
              .filter((o) => o.type === "band")
              .map((overlay) => (
                <g key={`band-${overlay.id}`}>
                  <Area
                    type="monotone"
                    dataKey={`${overlay.id}_upper`}
                    stroke={overlay.color || "var(--chart-2)"}
                    strokeWidth={overlay.style?.strokeWidth || 1}
                    fill="none"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${overlay.id}_middle`}
                    stroke={overlay.color || "var(--chart-2)"}
                    strokeWidth={overlay.style?.strokeWidth || 1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={overlay.label}
                  />
                  <Area
                    type="monotone"
                    dataKey={`${overlay.id}_lower`}
                    stroke={overlay.color || "var(--chart-2)"}
                    strokeWidth={overlay.style?.strokeWidth || 1}
                    fill={`url(#gradient-${overlay.id})`}
                    dot={false}
                  />
                </g>
              ))}
            
            {/* Render marker points (entry/exit) */}
            {overlays
              .filter((o) => o.type === "marker" && o.data.points)
              .flatMap((overlay) =>
                overlay.data.points?.map((point) => (
                  <ReferenceLine
                    key={`marker-${overlay.id}-${point.timestamp}`}
                    x={new Date(point.timestamp).toLocaleTimeString()}
                    stroke={point.type === "entry" ? "#10b981" : point.type === "exit" ? "#ef4444" : "#f59e0b"}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: point.label, position: "top" }}
                  />
                )),
              )}
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Overlay legend */}
        {overlays.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {overlays.map((overlay) => (
              <div key={`legend-${overlay.id}`} className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5"
                  style={{
                    backgroundColor: overlay.color || "var(--chart-2)",
                    borderStyle: overlay.style?.strokeDasharray ? "dashed" : "solid",
                  }}
                />
                <span className="text-muted-foreground">{overlay.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
