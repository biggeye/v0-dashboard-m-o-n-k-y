"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Order {
  id: string
  symbol: string
  side: string
  orderType: string
  quantity: number
  price?: number
  status: string
  createdAt: string
}

export function OpenOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOpenOrders()
  }, [])

  async function fetchOpenOrders() {
    try {
      const response = await fetch("/api/orders?status=open")
      const data = await response.json()

      if (data.data) {
        setOrders(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching open orders:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelOrder(orderId: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setOrders(orders.filter((o) => o.id !== orderId))
      }
    } catch (error) {
      console.error("[v0] Error cancelling order:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading orders...</CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No open orders</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{order.symbol}</p>
                  <Badge variant={order.side === "buy" ? "default" : "destructive"}>{order.side.toUpperCase()}</Badge>
                  <Badge variant="outline">{order.orderType}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Qty: {order.quantity} {order.price && `@ $${order.price}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleCancelOrder(order.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
