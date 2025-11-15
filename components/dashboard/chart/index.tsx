"use client"

import * as React from "react"
import { XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bullet } from "@/components/ui/bullet"
import type { TimePeriod } from "@/types/dashboard"

type ChartDataPoint = {
  date: string
  spendings: number
  sales: number
  coffee: number
}

const chartConfig = {
  spendings: {
    label: "Spendings",
    color: "var(--chart-1)",
  },
  sales: {
    label: "Sales",
    color: "var(--chart-2)",
  },
  coffee: {
    label: "Coffee",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export default function DashboardChart({ symbol }: { symbol?: string }) {
  const [activeTab, setActiveTab] = React.useState<TimePeriod>("week")
  const [chartData, setChartData] = React.useState<Record<TimePeriod, ChartDataPoint[]>>({
    week: [],
    month: [],
    year: [],
  })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchChartData(activeTab)
  }, [activeTab, symbol])

  async function fetchChartData(period: TimePeriod) {
    try {
      setLoading(true)
      const qs = new URLSearchParams({ period })
      if (symbol) qs.set("symbol", symbol)
      const response = await fetch(`/api/v1/dashboard/chart?${qs.toString()}`)
      const data = await response.json()

      if (data.data) {
        setChartData((prev) => ({
          ...prev,
          [period]: data.data,
        }))
      }
    } catch (error) {
      console.error("[v0] Error fetching chart data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    if (value === "week" || value === "month" || value === "year") {
      setActiveTab(value as TimePeriod)
    }
  }

  const formatYAxisValue = (value: number) => {
    if (value === 0) return ""
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  const renderChart = (data: ChartDataPoint[]) => {
    if (loading) {
      return (
        <div className="bg-accent rounded-lg p-3 h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="bg-accent rounded-lg p-3 h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No transaction data available</p>
        </div>
      )
    }

    return (
      <div className="bg-accent rounded-lg p-3">
        <ChartContainer className="md:aspect-[3/1] w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: -12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <defs>
              <linearGradient id="fillSpendings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-spendings)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-spendings)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCoffee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-coffee)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-coffee)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal={false}
              strokeDasharray="8 8"
              strokeWidth={2}
              stroke="var(--muted-foreground)"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={12}
              strokeWidth={1.5}
              className="uppercase text-sm fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={0}
              tickCount={6}
              className="text-sm fill-muted-foreground"
              tickFormatter={formatYAxisValue}
              domain={[0, "dataMax"]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" className="min-w-[200px] px-4 py-3" />}
            />
            <Area
              dataKey="spendings"
              type="linear"
              fill="url(#fillSpendings)"
              fillOpacity={0.4}
              stroke="var(--color-spendings)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              dataKey="sales"
              type="linear"
              fill="url(#fillSales)"
              fillOpacity={0.4}
              stroke="var(--color-sales)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              dataKey="coffee"
              type="linear"
              fill="url(#fillCoffee)"
              fillOpacity={0.4}
              stroke="var(--color-coffee)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="max-md:gap-4">
      <div className="flex items-center justify-between mb-4 max-md:contents">
        <TabsList className="max-md:w-full">
          <TabsTrigger value="week">WEEK</TabsTrigger>
          <TabsTrigger value="month">MONTH</TabsTrigger>
          <TabsTrigger value="year">YEAR</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-6 max-md:order-1">
          {Object.entries(chartConfig).map(([key, value]) => (
            <ChartLegend key={key} label={value.label} color={value.color} />
          ))}
        </div>
      </div>
      <TabsContent value="week" className="space-y-4">
        {renderChart(chartData.week)}
      </TabsContent>
      <TabsContent value="month" className="space-y-4">
        {renderChart(chartData.month)}
      </TabsContent>
      <TabsContent value="year" className="space-y-4">
        {renderChart(chartData.year)}
      </TabsContent>
    </Tabs>
  )
}

export const ChartLegend = ({
  label,
  color,
}: {
  label: string
  color: string
}) => {
  return (
    <div className="flex items-center gap-2 uppercase">
      <Bullet style={{ backgroundColor: color }} className="rotate-45" />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
