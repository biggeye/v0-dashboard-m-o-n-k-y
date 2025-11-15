"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ExchangeConnection } from "@/lib/types/exchange-client"

interface OrderEntryProps {
  selectedSymbol: string
  onOrderPlaced?: () => void
}

export function OrderEntry({ selectedSymbol, onOrderPlaced }: OrderEntryProps) {
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [selectedExchange, setSelectedExchange] = useState("")
  const [loading, setLoading] = useState(false)
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>([])

  useEffect(() => {
    fetchExchanges()
  }, [])

  async function fetchExchanges() {
    try {
      const response = await fetch("/api/v1/exchanges/connect")
      const data = await response.json()
      if (data.data) {
        setExchanges(data.data)
        if (data.data.length > 0) {
          setSelectedExchange(data.data[0].id)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching exchanges:", error)
    }
  }

  async function handleSubmitOrder(side: "buy" | "sell") {
    if (!quantity || (orderType === "limit" && !price)) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedExchange) {
      toast.error("Please select an exchange connection")
      return
    }

    // Client-side env gating
    const connection = exchanges.find((ex) => ex.id === selectedExchange)
    if (connection) {
      const tradingMode = process.env.NEXT_PUBLIC_TRADING_MODE ?? "dev"
      const canUseProd = tradingMode === "live"
      
      if (connection.env === "prod" && !canUseProd) {
        toast.error("Live trading is disabled. Use a sandbox or simulation connection.")
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/exchanges/${selectedExchange}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          side,
          symbol: selectedSymbol,
          quantity: Number.parseFloat(quantity),
          price: orderType === "limit" ? Number.parseFloat(price) : undefined,
        }),
      })

      const data = await response.json()

      if (data.success || response.ok) {
        toast.success(`${side.toUpperCase()} order placed successfully!`)
        setQuantity("")
        setPrice("")
        if (onOrderPlaced) {
          onOrderPlaced()
        }
      } else {
        toast.error(`Failed to place order: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("[v0] Order submission error:", error)
      toast.error("Failed to submit order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Exchange</Label>
          <Select value={selectedExchange} onValueChange={setSelectedExchange}>
            <SelectTrigger>
              <SelectValue placeholder="Select exchange" />
            </SelectTrigger>
            <SelectContent>
              {exchanges.length > 0 ? (
                exchanges.map((exchange) => {
                  const getProviderIcon = (provider: string) => {
                    switch (provider) {
                      case "binance":
                        return "🟡"
                      case "kraken":
                        return "🐙"
                      case "coinbase":
                        return "🔵"
                      case "simulation":
                        return "🎮"
                      default:
                        return "📊"
                    }
                  }
                  const connectionName = exchange.displayName || exchange.exchangeKey || exchange.exchange_name?.replace("_", " ") || "Unknown"
                  return (
                    <SelectItem key={exchange.id} value={exchange.id}>
                      <div className="flex items-center gap-2">
                        <span>{getProviderIcon(exchange.provider)}</span>
                        <span>{connectionName}</span>
                        <Badge
                          variant={exchange.env === "prod" ? "destructive" : "secondary"}
                          className="text-xs ml-2"
                        >
                          {exchange.env === "prod" ? "PROD" : "SANDBOX"}
                        </Badge>
                      </div>
                    </SelectItem>
                  )
                })
              ) : (
                <SelectItem value="none" disabled>
                  No exchanges connected
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
          <TabsList className="w-full">
            <TabsTrigger value="market" className="flex-1">
              Market
            </TabsTrigger>
            <TabsTrigger value="limit" className="flex-1">
              Limit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input value={selectedSymbol} disabled />
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!selectedExchange}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={() => handleSubmitOrder("buy")}
                disabled={loading || !selectedExchange}
              >
                <TrendingUp className="w-4 h-4" />
                Buy {selectedSymbol}
              </Button>
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => handleSubmitOrder("sell")}
                disabled={loading || !selectedExchange}
              >
                <TrendingDown className="w-4 h-4" />
                Sell {selectedSymbol}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="limit" className="space-y-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input value={selectedSymbol} disabled />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                disabled={!selectedExchange}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!selectedExchange}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={() => handleSubmitOrder("buy")}
                disabled={loading || !selectedExchange}
              >
                <TrendingUp className="w-4 h-4" />
                Buy Limit
              </Button>
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => handleSubmitOrder("sell")}
                disabled={loading || !selectedExchange}
              >
                <TrendingDown className="w-4 h-4" />
                Sell Limit
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Risk Info Section */}
        {selectedExchange && (() => {
          const connection = exchanges.find((ex) => ex.id === selectedExchange)
          if (!connection) return null

          const connectionName = connection.displayName || connection.exchangeKey || connection.exchange_name?.replace("_", " ") || "Unknown"
          const isProd = connection.env === "prod"

          return (
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Environment:</span>
                  <Badge variant={isProd ? "destructive" : "secondary"} className="text-xs">
                    {isProd ? "PROD" : "SANDBOX"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Connection:</span>
                  <span className="font-medium">{connectionName}</span>
                </div>
              </div>
              {isProd && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Live Trading Warning</AlertTitle>
                  <AlertDescription>
                    Orders on this connection are LIVE. Ensure risk limits are configured.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
