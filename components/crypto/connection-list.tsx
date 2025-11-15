"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertTriangle, Clock, ArrowLeft } from "lucide-react"
import type { ExchangeConnection } from "@/lib/types/exchange-client"

// Provider display info
const PROVIDER_INFO: Record<
  string,
  { name: string; icon: string }
> = {
  coinbase: { name: "Coinbase", icon: "🔵" },
  binance: { name: "Binance US", icon: "🟡" },
  kraken: { name: "Kraken", icon: "🐙" },
  bybit: { name: "Bybit", icon: "🟠" },
  simulation: { name: "Simulation", icon: "🎮" },
  metamask: { name: "MetaMask", icon: "🦊" },
  walletconnect: { name: "WalletConnect", icon: "🔗" },
  coinbase_wallet: { name: "Coinbase Wallet", icon: "🔵" },
  phantom: { name: "Phantom", icon: "👻" },
  trust_wallet: { name: "Trust Wallet", icon: "🛡️" },
}

interface WalletConnection {
  id: string
  wallet_type: string
  wallet_address: string
  chain_id: number
  chain_name: string
  is_primary: boolean
  balance_usd: number
  last_synced_at?: string
  created_at?: string
}

interface ConnectionListProps {
  sourceType: "exchange" | "wallet"
  onConnectionSelect: (connectionId: string | null) => void
  selectedConnectionId: string | null
}

export function ConnectionList({ sourceType, onConnectionSelect, selectedConnectionId }: ConnectionListProps) {
  const [connections, setConnections] = useState<(ExchangeConnection | WalletConnection)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConnections()
  }, [sourceType])

  async function fetchConnections() {
    setLoading(true)
    try {
      const endpoint = sourceType === "exchange" 
        ? "/api/v1/exchanges/connect"
        : "/api/v1/wallets/connect"
      
      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.data) {
        setConnections(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching connections:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading {sourceType === "exchange" ? "exchanges" : "wallets"}...
        </CardContent>
      </Card>
    )
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No {sourceType === "exchange" ? "exchange" : "wallet"} connections found.
        </CardContent>
      </Card>
    )
  }

  const getConnectionName = (conn: ExchangeConnection | WalletConnection): string => {
    if (sourceType === "exchange") {
      const exchange = conn as ExchangeConnection
      return exchange.displayName || 
             PROVIDER_INFO[exchange.provider]?.name || 
             exchange.provider || 
             "Unknown Exchange"
    } else {
      const wallet = conn as WalletConnection
      const walletInfo = PROVIDER_INFO[wallet.wallet_type] || { name: wallet.wallet_type, icon: "💼" }
      return `${walletInfo.name} - ${wallet.chain_name}`
    }
  }

  const getConnectionSubtitle = (conn: ExchangeConnection | WalletConnection): string => {
    if (sourceType === "exchange") {
      const exchange = conn as ExchangeConnection
      const env = exchange.env === "sandbox" ? " (Sandbox)" : ""
      return `${exchange.provider}${exchange.apiFamily ? ` - ${exchange.apiFamily}` : ""}${env}`
    } else {
      const wallet = conn as WalletConnection
      return `${wallet.wallet_address.slice(0, 6)}...${wallet.wallet_address.slice(-4)}`
    }
  }

  const getStatusBadge = (conn: ExchangeConnection | WalletConnection) => {
    if (sourceType === "exchange") {
      const exchange = conn as ExchangeConnection
      const status = exchange.status || (exchange.isActive ? "connected" : "disabled")
      
      if (status === "connected") {
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        )
      } else if (status === "error") {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Error
          </Badge>
        )
      } else {
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {status === "pending_oauth" ? "Pending" : "Disabled"}
          </Badge>
        )
      }
    } else {
      // For wallets, we can show primary badge or just connected
      const wallet = conn as WalletConnection
      if (wallet.is_primary) {
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Primary
          </Badge>
        )
      }
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </Badge>
      )
    }
  }

  const getLastSyncTime = (conn: ExchangeConnection | WalletConnection): string => {
    const lastSync = sourceType === "exchange" 
      ? (conn as ExchangeConnection).last_sync_at
      : (conn as WalletConnection).last_synced_at
    
    if (!lastSync) return "Never synced"
    
    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {selectedConnectionId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onConnectionSelect(null)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all connections
        </Button>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((conn) => {
          const isSelected = selectedConnectionId === conn.id
          const providerInfo = sourceType === "exchange"
            ? PROVIDER_INFO[(conn as ExchangeConnection).provider]
            : PROVIDER_INFO[(conn as WalletConnection).wallet_type]
          
          return (
            <Card
              key={conn.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onConnectionSelect(conn.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {providerInfo?.icon && (
                      <span className="text-2xl">{providerInfo.icon}</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-sm">
                        {getConnectionName(conn)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {getConnectionSubtitle(conn)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(conn)}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getLastSyncTime(conn)}
                  </span>
                  {sourceType === "wallet" && (conn as WalletConnection).balance_usd > 0 && (
                    <span className="font-medium">
                      ${(conn as WalletConnection).balance_usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

