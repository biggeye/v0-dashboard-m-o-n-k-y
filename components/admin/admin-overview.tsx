"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ExternalLink,
  Link2,
  Wallet,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  TestTube,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Exchange {
  id: string
  exchange_name: string
  is_active: boolean
  is_testnet: boolean
  last_sync_at: string | null
  created_at: string
}

interface Wallet {
  id: string
  wallet_type: string
  wallet_address: string
  chain_name: string
  is_primary: boolean
  balance_usd: number
  created_at: string
}

interface Strategy {
  id: string
  name: string
  symbol: string
  is_active: boolean
  is_automated: boolean
  total_trades: number
  total_pnl: number
  created_at: string
}

interface Holding {
  id: string
  symbol: string
  quantity: number
  current_value: number
  unrealized_pnl: number
  source: string
  source_type: string
}

interface AdminOverviewProps {
  exchanges: Exchange[]
  wallets: Wallet[]
  strategies: Strategy[]
  holdings: Holding[]
}

export function AdminOverview({ exchanges, wallets, strategies, holdings }: AdminOverviewProps) {
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set())
  const [syncingBalances, setSyncingBalances] = useState<Set<string>>(new Set())

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0)
  const totalUnrealizedPnl = holdings.reduce((sum, h) => sum + (h.unrealized_pnl || 0), 0)
  const activeStrategies = strategies.filter((s) => s.is_active).length
  const activeExchanges = exchanges.filter((e) => e.is_active).length

  async function handleTestConnection(exchangeId: string) {
    setTestingConnections((prev) => new Set(prev).add(exchangeId))
    try {
      const response = await fetch(`/api/v1/exchanges/${exchangeId}/test`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        alert("Connection test successful!")
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        alert(`Connection test failed: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error testing connection:", error)
      alert("Failed to test connection")
    } finally {
      setTestingConnections((prev) => {
        const next = new Set(prev)
        next.delete(exchangeId)
        return next
      })
    }
  }

  async function handleSyncBalance(exchangeId: string) {
    setSyncingBalances((prev) => new Set(prev).add(exchangeId))
    try {
      const response = await fetch(`/api/v1/exchanges/${exchangeId}/balance`)
      const data = await response.json()

      if (data.data) {
        alert(`Balance sync successful! Synced ${data.data.length} assets.`)
        // Refresh the page to show updated holdings
        window.location.reload()
      } else {
        alert(`Balance sync failed: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("[v0] Error syncing balance:", error)
      alert("Failed to sync balance")
    } finally {
      setSyncingBalances((prev) => {
        const next = new Set(prev)
        next.delete(exchangeId)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exchange Connections</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exchanges.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeExchanges} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wallet Connections</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.length}</div>
            <p className="text-xs text-muted-foreground">
              {wallets.filter((w) => w.is_primary).length} primary
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trading Strategies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeStrategies} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</div>
            <p className={`text-xs ${totalUnrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)} P&L
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exchange Connections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exchange Connections</CardTitle>
            <CardDescription>Manage your centralized exchange API connections</CardDescription>
          </div>
          <Link href="/bags/trading">
            <Button variant="outline" size="sm" className="gap-2">
              Manage Exchanges
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {exchanges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exchange</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map((exchange) => (
                  <TableRow key={exchange.id}>
                    <TableCell className="font-semibold capitalize">
                      {exchange.exchange_name.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      {exchange.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exchange.is_testnet ? "outline" : "default"}>
                        {exchange.is_testnet ? "Testnet" : "Production"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exchange.last_sync_at
                        ? formatDistanceToNow(new Date(exchange.last_sync_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(exchange.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(exchange.id)}
                          disabled={testingConnections.has(exchange.id)}
                          className="gap-1"
                        >
                          <TestTube className="h-3 w-3" />
                          {testingConnections.has(exchange.id) ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncBalance(exchange.id)}
                          disabled={syncingBalances.has(exchange.id)}
                          className="gap-1"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${syncingBalances.has(exchange.id) ? "animate-spin" : ""}`}
                          />
                          {syncingBalances.has(exchange.id) ? "Syncing..." : "Sync"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No exchange connections yet.</p>
              <Link href="/bags/trading">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  Connect Exchange
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Connections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>DeFi Wallet Connections</CardTitle>
            <CardDescription>Manage your Web3 wallet connections</CardDescription>
          </div>
          <Link href="/bags/trading">
            <Button variant="outline" size="sm" className="gap-2">
              Manage Wallets
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {wallets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-semibold capitalize">
                      {wallet.wallet_type.replace("_", " ")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatAddress(wallet.wallet_address)}
                    </TableCell>
                    <TableCell>{wallet.chain_name}</TableCell>
                    <TableCell>${wallet.balance_usd.toFixed(2)}</TableCell>
                    <TableCell>
                      {wallet.is_primary ? (
                        <Badge variant="default">Primary</Badge>
                      ) : (
                        <Badge variant="secondary">Connected</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No wallet connections yet.</p>
              <Link href="/bags/trading">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  Connect Wallet
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Strategies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Trading Strategies</CardTitle>
            <CardDescription>Manage your automated trading strategies</CardDescription>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              Manage Strategies
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {strategies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Automated</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.map((strategy) => (
                  <TableRow key={strategy.id}>
                    <TableCell className="font-semibold">{strategy.name}</TableCell>
                    <TableCell>{strategy.symbol}</TableCell>
                    <TableCell>
                      {strategy.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {strategy.is_automated ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {strategy.total_trades} trades
                        </span>
                        <span
                          className={`text-xs ${
                            strategy.total_pnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {strategy.total_pnl >= 0 ? "+" : ""}${strategy.total_pnl.toFixed(2)} P&L
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No strategies created yet.</p>
              <Link href="/admin">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  Create Strategy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Holdings Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>Overview of your cryptocurrency holdings</CardDescription>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              Manage Portfolio
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {holdings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Unrealized P&L</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell className="font-semibold">{holding.symbol}</TableCell>
                    <TableCell>{holding.quantity.toFixed(4)}</TableCell>
                    <TableCell>${holding.current_value.toFixed(2)}</TableCell>
                    <TableCell
                      className={
                        holding.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {holding.unrealized_pnl >= 0 ? "+" : ""}${holding.unrealized_pnl.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {holding.source_type}: {holding.source}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No holdings tracked yet.</p>
              <Link href="/admin">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  Add Holding
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

