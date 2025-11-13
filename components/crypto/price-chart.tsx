"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePriceData } from "@/lib/hooks/use-price-data"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PriceChartProps {
  symbol: string
  title?: string
}

export function PriceChart({ symbol, title }: PriceChartProps) {
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

  const chartData = prices.map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    price: p.price,
    change: p.change_24h,
  }))

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
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--chart-1))"
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
