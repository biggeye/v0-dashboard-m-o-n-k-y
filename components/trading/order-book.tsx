"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OrderBookProps {
  symbol: string
}

interface OrderLevel {
  price: number
  quantity: number
}

export function OrderBook({ symbol }: OrderBookProps) {
  const [bids, setBids] = useState<OrderLevel[]>([])
  const [asks, setAsks] = useState<OrderLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [spreadPercentage, setSpreadPercentage] = useState(0)

  useEffect(() => {
    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [symbol])

  async function fetchOrderBook() {
    try {
      setLoading(true)
      // TODO: Fetch order book data from exchange API
      // For now, return empty state
      setBids([])
      setAsks([])
      setSpreadPercentage(0)
    } catch (error) {
      console.error("[v0] Error fetching order book:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && bids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Book - {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading order book...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order Book - {symbol}</CardTitle>
          <div className="text-sm text-muted-foreground">
            Spread: <span className="text-foreground font-semibold">{spreadPercentage.toFixed(4)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bids.length === 0 && asks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No order book data available. Connect an exchange to view live order book data.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-success">Bids (Buy Orders)</h4>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {bids.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-4">No bids</div>
                ) : (
                  bids.map((bid, i) => (
                    <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                      <span className="text-success font-mono">${bid.price.toFixed(2)}</span>
                      <span className="text-muted-foreground font-mono">{bid.quantity.toFixed(4)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-destructive">Asks (Sell Orders)</h4>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {asks.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-4">No asks</div>
                ) : (
                  asks.map((ask, i) => (
                    <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                      <span className="text-destructive font-mono">${ask.price.toFixed(2)}</span>
                      <span className="text-muted-foreground font-mono">{ask.quantity.toFixed(4)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
