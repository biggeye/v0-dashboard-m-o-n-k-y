"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Transaction {
  id: string
  symbol: string
  transaction_type: string
  quantity: number | string
  price: number | string | null
  total_value: number | string
  fees: number | string
  timestamp: string
  source?: string
  source_type?: string
  transaction_hash?: string
  notes?: string
}

interface TransactionListProps {
  transactions: Transaction[]
  loading?: boolean
}

export function TransactionList({ transactions, loading }: TransactionListProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading transactions...
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No transactions found
        </CardContent>
      </Card>
    )
  }

  // Group transactions by symbol
  const groupedBySymbol = transactions.reduce((acc, tx) => {
    const symbol = tx.symbol.toUpperCase()
    if (!acc[symbol]) {
      acc[symbol] = []
    }
    acc[symbol].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  // Sort symbols alphabetically
  const sortedSymbols = Object.keys(groupedBySymbol).sort()

  const toggleSymbol = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols)
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol)
    } else {
      newExpanded.add(symbol)
    }
    setExpandedSymbols(newExpanded)
  }

  const getTransactionTypeBadge = (type: string) => {
    const typeLower = type.toLowerCase()
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      buy: "default",
      sell: "destructive",
      deposit: "default",
      withdrawal: "destructive",
      transfer: "secondary",
      swap: "outline",
      fee: "secondary",
    }

    return (
      <Badge variant={variants[typeLower] || "secondary"}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return "N/A"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "N/A"
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })
  }

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return "$0.00"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "$0.00"
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const getTotalForSymbol = (txs: Transaction[]): number => {
    return txs.reduce((sum, tx) => {
      const val = typeof tx.total_value === "string" ? parseFloat(tx.total_value) : tx.total_value
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }

  return (
    <div className="space-y-4">
      {sortedSymbols.map((symbol) => {
        const symbolTransactions = groupedBySymbol[symbol]
        const isExpanded = expandedSymbols.has(symbol)
        const totalValue = getTotalForSymbol(symbolTransactions)

        return (
          <Card key={symbol}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSymbol(symbol)}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <CardTitle className="text-lg">{symbol}</CardTitle>
                  <Badge variant="secondary">{symbolTransactions.length} transaction{symbolTransactions.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-2">
                  {symbolTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTransactionTypeBadge(tx.transaction_type)}
                          {tx.source && (
                            <span className="text-xs text-muted-foreground">
                              {tx.source_type === "wallet" 
                                ? `Wallet: ${tx.source.slice(0, 6)}...${tx.source.slice(-4)}`
                                : `Exchange: ${tx.source}`
                              }
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Quantity: <span className="font-medium text-foreground">{formatNumber(tx.quantity)}</span>
                          </span>
                          {tx.price && (
                            <span className="text-muted-foreground">
                              Price: <span className="font-medium text-foreground">{formatCurrency(tx.price)}</span>
                            </span>
                          )}
                        </div>
                        {tx.transaction_hash && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Hash:</span>
                            <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                              {tx.transaction_hash.slice(0, 10)}...{tx.transaction_hash.slice(-8)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => {
                                // Open blockchain explorer (would need chain info to determine URL)
                                window.open(`https://etherscan.io/tx/${tx.transaction_hash}`, "_blank")
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground italic">{tx.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1 ml-4">
                        <p className="font-semibold">{formatCurrency(tx.total_value)}</p>
                        {tx.fees && parseFloat(String(tx.fees)) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(tx.fees)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

