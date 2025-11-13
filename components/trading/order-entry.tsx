"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown } from "lucide-react"

interface OrderEntryProps {
  selectedSymbol: string
}

export function OrderEntry({ selectedSymbol }: OrderEntryProps) {
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [selectedExchange, setSelectedExchange] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmitOrder(side: "buy" | "sell") {
    if (!quantity || (orderType === "limit" && !price)) {
      alert("Please fill in all required fields")
      return
    }

    if (!selectedExchange) {
      alert("Please select an exchange connection")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/exchanges/${selectedExchange}/order`, {
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

      if (data.success) {
        alert(`${side.toUpperCase()} order placed successfully!`)
        setQuantity("")
        setPrice("")
      } else {
        alert(`Failed to place order: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Order submission error:", error)
      alert("Failed to submit order")
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
              <SelectItem value="exchange-1">Kraken</SelectItem>
              <SelectItem value="exchange-2">Binance US</SelectItem>
              <SelectItem value="exchange-3">Coinbase</SelectItem>
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
              <Input type="number" placeholder="0.00" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={() => handleSubmitOrder("buy")}
                disabled={loading}
              >
                <TrendingUp className="w-4 h-4" />
                Buy {selectedSymbol}
              </Button>
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => handleSubmitOrder("sell")}
                disabled={loading}
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
              <Input type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" placeholder="0.00" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={() => handleSubmitOrder("buy")}
                disabled={loading}
              >
                <TrendingUp className="w-4 h-4" />
                Buy Limit
              </Button>
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => handleSubmitOrder("sell")}
                disabled={loading}
              >
                <TrendingDown className="w-4 h-4" />
                Sell Limit
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
