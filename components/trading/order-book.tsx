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
      // Generate mock order book data - in production, fetch from exchange API
      const baseBid = 45000
      const baseAsk = 45010

      const mockBids: OrderLevel[] = Array.from({ length: 10 }, (_, i) => ({
        price: baseBid - i * Math.random() * 100,
        quantity: Math.random() * 2,
      }))

      const mockAsks: OrderLevel[] = Array.from({ length: 10 }, (_, i) => ({
        price: baseAsk + i * Math.random() * 100,
        quantity: Math.random() * 2,
      }))

      setBids(mockBids)
      setAsks(mockAsks)

      // Calculate spread
      if (mockBids.length > 0 && mockAsks.length > 0) {
        const spread = mockAsks[0].price - mockBids[0].price
        const spreadPct = (spread / mockBids[0].price) * 100
        setSpreadPercentage(spreadPct)
      }
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-success">Bids (Buy Orders)</h4>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {bids.map((bid, i) => (
                <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <span className="text-success font-mono">${bid.price.toFixed(2)}</span>
                  <span className="text-muted-foreground font-mono">{bid.quantity.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2 text-destructive">Asks (Sell Orders)</h4>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {asks.map((ask, i) => (
                <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <span className="text-destructive font-mono">${ask.price.toFixed(2)}</span>
                  <span className="text-muted-foreground font-mono">{ask.quantity.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
