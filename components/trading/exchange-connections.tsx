"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Link2 } from "lucide-react"

const EXCHANGES = [
  { id: "kraken", name: "Kraken", icon: "🐙" },
  { id: "binance_us", name: "Binance US", icon: "🟡" },
  { id: "coinbase", name: "Coinbase", icon: "🔵" },
  { id: "coinbase_pro", name: "Coinbase Pro", icon: "🔷" },
]

export function ExchangeConnections() {
  const [connections, setConnections] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [selectedExchange, setSelectedExchange] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [apiPassphrase, setApiPassphrase] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    try {
      const response = await fetch("/api/exchanges/connect")
      const data = await response.json()

      if (data.data) {
        setConnections(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching exchange connections:", error)
    }
  }

  async function handleConnect() {
    if (!selectedExchange || !apiKey || !apiSecret) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/exchanges/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchangeName: selectedExchange,
          apiKey,
          apiSecret,
          apiPassphrase: apiPassphrase || undefined,
          isTestnet: false,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("Exchange connected successfully!")
        setOpen(false)
        setApiKey("")
        setApiSecret("")
        setApiPassphrase("")
        setSelectedExchange("")
        fetchConnections()
      } else {
        alert(`Failed to connect: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error connecting exchange:", error)
      alert("Failed to connect exchange")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Link2 className="w-4 h-4" />
            Exchanges ({connections.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect Exchange</DialogTitle>
            <DialogDescription>Add API credentials to trade on centralized exchanges</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedExchange ? (
              <div className="grid grid-cols-2 gap-3">
                {EXCHANGES.map((exchange) => (
                  <Card
                    key={exchange.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedExchange(exchange.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{exchange.icon}</span>
                      <span className="font-semibold">{exchange.name}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Exchange</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>{selectedExchange}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedExchange("")}>
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                  />
                </div>

                {selectedExchange === "coinbase_pro" && (
                  <div className="space-y-2">
                    <Label>API Passphrase</Label>
                    <Input
                      type="password"
                      value={apiPassphrase}
                      onChange={(e) => setApiPassphrase(e.target.value)}
                      placeholder="Enter your API passphrase"
                    />
                  </div>
                )}

                <Button className="w-full" onClick={handleConnect} disabled={loading}>
                  {loading ? "Connecting..." : "Connect Exchange"}
                </Button>
              </div>
            )}
          </div>

          {connections.length > 0 && (
            <div className="space-y-2">
              <Label>Connected Exchanges</Label>
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{conn.exchange_name}</span>
                    <Badge variant={conn.is_active ? "default" : "secondary"}>
                      {conn.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
