"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Trade {
  id: string
  symbol: string
  transactionType: string
  quantity: number
  price: number
  totalValue: number
  fees: number
  timestamp: string
}

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTradeHistory()
  }, [])

  async function fetchTradeHistory() {
    try {
      const response = await fetch("/api/transactions?limit=50")
      const data = await response.json()

      if (data.data) {
        setTrades(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching trade history:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading trade history...</CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No trade history</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {trades.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{trade.symbol}</p>
                  <Badge variant={trade.transactionType === "buy" ? "default" : "destructive"}>
                    {trade.transactionType.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trade.quantity} @ ${trade.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(trade.timestamp).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${trade.totalValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Fee: ${trade.fees.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
