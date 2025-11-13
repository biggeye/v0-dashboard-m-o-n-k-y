"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine, ReferenceArea } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePriceData } from "@/lib/hooks/use-price-data"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { ChartOverlay } from "@/lib/types/visualization"

interface PriceChartProps {
  symbol: string
  title?: string
  overlays?: ChartOverlay[]
}

export function PriceChart({ symbol, title, overlays = [] }: PriceChartProps) {
  const { prices, isLoading, error } = usePriceData(symbol)

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

  // Merge price data with overlay data
  const chartData = prices.map((p: any, index: number) => {
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
              </linearGradient>
              {/* Gradients for overlay bands */}
              {overlays
                .filter((o) => o.type === "band")
                .map((overlay) => (
                  <linearGradient key={`gradient-${overlay.id}`} id={`gradient-${overlay.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={overlay.color || "hsl(var(--chart-2))"} stopOpacity={overlay.style?.fillOpacity || 0.2} />
                    <stop offset="95%" stopColor={overlay.color || "hsl(var(--chart-2))"} stopOpacity={0.05} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            {/* Main price area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--chart-1))"
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
                  stroke={overlay.color || "hsl(var(--chart-2))"}
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
                    stroke={overlay.color || "hsl(var(--chart-2))"}
                    strokeWidth={overlay.style?.strokeWidth || 1}
                    fill="none"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${overlay.id}_middle`}
                    stroke={overlay.color || "hsl(var(--chart-2))"}
                    strokeWidth={overlay.style?.strokeWidth || 1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={overlay.label}
                  />
                  <Area
                    type="monotone"
                    dataKey={`${overlay.id}_lower`}
                    stroke={overlay.color || "hsl(var(--chart-2))"}
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
                    backgroundColor: overlay.color || "hsl(var(--chart-2))",
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
