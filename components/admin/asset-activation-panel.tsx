"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DiscoveredToken {
  id: string
  symbol: string
  name: string | null
  contract_address: string | null
  chain_id: number | null
  decimals: number | null
  discovery_status: string
  added_by_user_id: string
  metadata: any
  created_at: string
}

export function AssetActivationPanel() {
  const [tokens, setTokens] = useState<DiscoveredToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const fetchPendingTokens = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/v1/admin/tokens/pending")
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

  useEffect(() => {
    fetchPendingTokens()
  }, [])

  const updateTokenStatus = async (tokenId: string, status: "discovered_approved" | "manual") => {
    setProcessingIds((prev) => new Set(prev).add(tokenId))
    try {
      const response = await fetch(`/api/v1/admin/tokens/${tokenId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update token status")
      }

      // Remove token from list if approved
      if (status === "discovered_approved") {
        setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      } else {
        // Refresh to get updated status
        await fetchPendingTokens()
      }
    } catch (error) {
      console.error("[v0] Error updating token status:", error)
      alert("Failed to update token status")
    } finally {
      setProcessingIds((prev) => {
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
          <CardTitle>Asset Activation</CardTitle>
          <CardDescription>Approve discovered tokens for tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asset Activation</CardTitle>
            <CardDescription>
              Review and approve discovered tokens for price tracking
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPendingTokens}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending tokens to review
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => {
                  const isProcessing = processingIds.has(token.id)
                  return (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div className="font-medium">{token.symbol}</div>
                      </TableCell>
                      <TableCell>{token.name || "—"}</TableCell>
                      <TableCell>
                        {token.contract_address ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {token.contract_address.slice(0, 6)}...
                            {token.contract_address.slice(-4)}
                          </code>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getChainName(token.chain_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>{token.decimals ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateTokenStatus(token.id, "discovered_approved")}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTokenStatus(token.id, "manual")}
                            disabled={isProcessing}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

