"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AVAILABLE_INDICATORS } from "@/lib/services/indicator-service"

interface IndicatorDisplayProps {
  prices: number[]
  symbol: string
}

export function IndicatorDisplay({ prices, symbol }: IndicatorDisplayProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<string>("sma")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    if (!prices || prices.length === 0) return

    setLoading(true)
    try {
      const response = await fetch("/api/crypto/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator: selectedIndicator,
          prices,
        }),
      })

      const data = await response.json()
      setResult(data.data)
    } catch (error) {
      console.error("Error calculating indicator:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical Indicators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
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
          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? "Calculating..." : "Calculate"}
          </Button>
        </div>

        {result && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-3">
              {AVAILABLE_INDICATORS[selectedIndicator]?.description}
            </div>
            <div className="space-y-2">
              {Object.entries(result).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{key}:</span>
                  <span className="text-sm font-mono">{typeof value === "number" ? value.toFixed(4) : "N/A"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
