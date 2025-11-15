"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useAssets } from "@/lib/web3/assets"

interface DiscoveredToken {
  id: string
  symbol: string
  name: string | null
  contract_address: string | null
  chain_id: number | null
  decimals: number | null
  discovery_status: string
  metadata: any
  created_at: string
}

export function DiscoveredTokensList() {
  const [tokens, setTokens] = useState<DiscoveredToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activatingIds, setActivatingIds] = useState<Set<string>>(new Set())
  const { refreshAssets } = useAssets()

  useEffect(() => {
    fetchPendingTokens()
  }, [])

  const fetchPendingTokens = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/v1/assets/pending")
      if (!response.ok) {
        throw new Error("Failed to fetch pending tokens")
      }
      const data = await response.json()
      setTokens(data.data || [])
    } catch (error) {
      console.error("[v0] Error fetching pending tokens:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (tokenId: string) => {
    setActivatingIds((prev) => new Set(prev).add(tokenId))
    try {
      const response = await fetch("/api/v1/assets/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      })

      if (!response.ok) {
        throw new Error("Failed to activate token")
      }

      // Remove from list and refresh assets
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      await refreshAssets()
    } catch (error) {
      console.error("[v0] Error activating token:", error)
      alert("Failed to activate token")
    } finally {
      setActivatingIds((prev) => {
        const next = new Set(prev)
        next.delete(tokenId)
        return next
      })
    }
  }

  const getChainName = (chainId: number | null) => {
    const chains: Record<number, string> = {
      1: "Ethereum",
      56: "BNB Chain",
      137: "Polygon",
      42161: "Arbitrum",
      10: "Optimism",
    }
    return chainId ? chains[chainId] || `Chain ${chainId}` : "Unknown"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discovered Tokens</CardTitle>
          <CardDescription>Tokens found in your connected wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discovered Tokens</CardTitle>
          <CardDescription>Tokens found in your connected wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No pending tokens discovered. Connect a wallet to discover tokens.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovered Tokens</CardTitle>
        <CardDescription>
          Activate these tokens to start tracking their prices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tokens.map((token) => {
            const isActivating = activatingIds.has(token.id)
            return (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{token.symbol}</div>
                  {token.name && (
                    <div className="text-sm text-muted-foreground">{token.name}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {token.chain_id && (
                      <Badge variant="outline">{getChainName(token.chain_id)}</Badge>
                    )}
                    {token.contract_address && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {token.contract_address.slice(0, 6)}...
                        {token.contract_address.slice(-4)}
                      </code>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleActivate(token.id)}
                  disabled={isActivating}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

