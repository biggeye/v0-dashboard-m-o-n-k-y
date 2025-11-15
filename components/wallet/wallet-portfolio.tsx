"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/lib/web3/wallet-provider"
import { Wallet, TrendingUp, TrendingDown } from "lucide-react"

interface WalletHolding {
  symbol: string
  quantity: number
  value: number
  change24h: number
  chainName: string
}

export function WalletPortfolio() {
  const { address, chainId, isConnected } = useWallet()
  const [holdings, setHoldings] = useState<WalletHolding[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      fetchWalletHoldings()
    }
  }, [address, chainId, isConnected])

  async function fetchWalletHoldings() {
    setLoading(true)
    try {
      // TODO: Fetch actual token balances using a service like Alchemy or Moralis
      // For now, return empty state
      setHoldings([])
    } catch (error) {
      console.error("[v0] Error fetching wallet holdings:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Connect your wallet to view your DeFi portfolio</div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading portfolio...</div>
        </CardContent>
      </Card>
    )
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Portfolio
        </CardTitle>
        <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {holdings.map((holding) => {
            const isPositive = holding.change24h >= 0
            return (
              <div key={holding.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{holding.symbol}</p>
                    <Badge variant="outline" className="text-xs">
                      {holding.chainName}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{holding.quantity.toFixed(4)} tokens</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${holding.value.toLocaleString()}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}
                      {holding.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
