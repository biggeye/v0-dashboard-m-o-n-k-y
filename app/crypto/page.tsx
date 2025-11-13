"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PriceChart } from "@/components/crypto/price-chart"
import { PriceTicker } from "@/components/crypto/price-ticker"
import { IndicatorDisplay } from "@/components/crypto/indicator-display"
import DashboardPageLayout from "@/components/dashboard/layout"
import { useChartVisualization } from "@/lib/contexts/chart-visualization-context"
import { CarIcon as ChartIcon } from "lucide-react"

export default function CryptoDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC")
  const [watchlist, setWatchlist] = useState(["BTC", "ETH", "AAPL"])
  const [priceData, setPriceData] = useState<number[]>([])
  const { getOverlaysForSymbol } = useChartVisualization()
  const overlays = getOverlaysForSymbol(selectedSymbol)

  const handleAddSymbol = (symbol: string) => {
    const upper = symbol.toUpperCase()
    if (!watchlist.includes(upper) && symbol.trim()) {
      setWatchlist([...watchlist, upper])
    }
  }

  const handleRemoveSymbol = (symbol: string) => {
    setWatchlist(watchlist.filter((s) => s !== symbol))
  }

  const handleAddFromInput = () => {
    handleAddSymbol(symbolInput)
    setSymbolInput("")
  }

  // Extract numeric prices from the fetched data for indicators
  const priceArray = prices
    ?.map((p: any) => p.price)
    .filter((p: any) => typeof p === "number" && !isNaN(p)) || []

  return (
    <DashboardPageLayout
      header={{
        title: "Crypto Trading Dashboard",
        description: "Real-time cryptocurrency analysis with technical indicators",
        icon: ChartIcon,
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <PriceChart symbol={selectedSymbol} overlays={overlays} />
        </div>

        {/* Watchlist */}
        <div className="space-y-4">
          <PriceTicker symbols={watchlist} />

          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Add to Watchlist</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="BTC"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddFromInput()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddFromInput}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  {["BTC", "ETH", "SOL", "ADA", "DOGE"].map((sym) => (
                    <Button
                      key={sym}
                      variant={selectedSymbol === sym ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSymbol(sym)}
                    >
                      {sym}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Indicators Row */}
      <div className="mt-6">
        <IndicatorDisplay 
          prices={priceArray} 
          symbol={selectedSymbol}
        />
      </div>
    </DashboardPageLayout>
  )
}
