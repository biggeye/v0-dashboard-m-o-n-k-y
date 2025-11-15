"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AVAILABLE_INDICATORS } from "@/lib/services/indicator-service"
import { TrendingUp, TrendingDown } from "lucide-react"

interface IndicatorDisplayProps {
  prices: number[]
  symbol: string
}

export function IndicatorDisplay({ prices, symbol }: IndicatorDisplayProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<string>("sma")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-calculate when prices change
  useEffect(() => {
    if (prices && prices.length > 0) {
      handleCalculate()
    }
  }, [symbol])

  const handleCalculate = async () => {
    if (!prices || prices.length === 0) {
      setError("No price data available")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/v1/crypto/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator: selectedIndicator,
          prices,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to calculate indicator")
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      console.error("[v0] Error calculating indicator:", err)
      setError(err instanceof Error ? err.message : "Failed to calculate indicator")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const indicatorConfig = AVAILABLE_INDICATORS[selectedIndicator]
  const isPositive =
    result && typeof result === "object" && "rsi" in result && result.rsi > 50
      ? true
      : result && typeof result === "object" && "sma" in result && result.sma > 0
        ? true
        : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Technical Indicators</CardTitle>
          <Badge variant="outline" className="text-xs">
            {symbol}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedIndicator} onValueChange={(value) => {
            setSelectedIndicator(value)
            // Trigger recalculation after a short delay
            setTimeout(handleCalculate, 100)
          }}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AVAILABLE_INDICATORS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCalculate} disabled={loading || !prices || prices.length === 0} size="sm">
            {loading ? "Calculating..." : "Refresh"}
          </Button>
        </div>

        {indicatorConfig && (
          <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
            {indicatorConfig.description}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {result && typeof result === "object" && Object.keys(result).length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {Object.entries(result).map(([key, value]) => {
              const numValue = typeof value === "number" ? value : null
              let signal = null

              // Provide signal interpretation for specific indicators
              if (key === "rsi" && numValue !== null) {
                if (numValue > 70) signal = "Overbought"
                else if (numValue < 30) signal = "Oversold"
                else signal = "Neutral"
              } else if (key === "macd" && numValue !== null) {
                signal = numValue > 0 ? "Bullish" : "Bearish"
              }

              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-medium capitalize">{key}:</span>
                    {signal && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({signal})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold">
                      {numValue !== null ? numValue.toFixed(4) : "N/A"}
                    </span>
                    {signal === "Overbought" && (
                      <TrendingUp className="w-3 h-3 text-destructive inline-block ml-2" />
                    )}
                    {signal === "Oversold" && (
                      <TrendingDown className="w-3 h-3 text-success inline-block ml-2" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && (!result || Object.keys(result || {}).length === 0) && (
          <div className="bg-muted/50 rounded-lg p-4 text-center text-muted-foreground text-sm">
            {prices && prices.length > 0
              ? "Click Refresh to calculate indicators"
              : "Waiting for price data..."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
