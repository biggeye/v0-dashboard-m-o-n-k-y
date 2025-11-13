"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useCryptoPrices } from "@/lib/hooks/use-price-data"

interface PriceTickerProps {
  symbols: string[]
}

export function PriceTicker({ symbols }: PriceTickerProps) {
  const { prices, isLoading } = useCryptoPrices(symbols.length > 0 ? symbols : null)

  if (isLoading || !prices) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crypto Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading prices...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prices.map((price: any) => {
            const isPositive = price.change_24h >= 0
            return (
              <div
                key={price.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold">{price.symbol}</p>
                  <p className="text-sm text-muted-foreground">${price.price?.toFixed(2) || "N/A"}</p>
                </div>
                <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}
                  {price.change_24h?.toFixed(2)}%
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
