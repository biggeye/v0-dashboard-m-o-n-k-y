"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OrderBookProps {
  symbol: string
}

export function OrderBook({ symbol }: OrderBookProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Book - {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-success">Bids</h4>
            <div className="space-y-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <span className="text-success">${(45000 - i * 10).toLocaleString()}</span>
                  <span className="text-muted-foreground">{(Math.random() * 2).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2 text-destructive">Asks</h4>
            <div className="space-y-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <span className="text-destructive">${(45010 + i * 10).toLocaleString()}</span>
                  <span className="text-muted-foreground">{(Math.random() * 2).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
