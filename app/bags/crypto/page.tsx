"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import DashboardPageLayout from "@/components/dashboard/layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Coins } from "lucide-react"
import { ConnectionList } from "@/components/crypto/connection-list"
import { TransactionList } from "@/components/crypto/transaction-list"
import { AssetFilter } from "@/components/crypto/asset-filter"

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

export default function CryptoPage() {
  const [activeTab, setActiveTab] = useState<"exchanges" | "wallets">("exchanges")
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!selectedConnectionId) {
      setTransactions([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "200")
      params.append("sourceType", activeTab === "exchanges" ? "exchange" : "wallet")
      params.append("connectionId", selectedConnectionId)
      
      if (selectedSymbol) {
        params.append("symbol", selectedSymbol)
      }

      const response = await fetch(`/api/v1/transactions?${params.toString()}`)
      const data = await response.json()

      if (data.data) {
        setTransactions(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedConnectionId, selectedSymbol])

  // Fetch transactions when filters change (only if connection is selected)
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Extract unique symbols from transactions for the filter
  const availableSymbols = useMemo(() => {
    const symbols = new Set<string>()
    transactions.forEach((tx) => {
      if (tx.symbol) {
        symbols.add(tx.symbol.toUpperCase())
      }
    })
    return Array.from(symbols)
  }, [transactions])

  // Reset connection selection when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value as "exchanges" | "wallets")
    setSelectedConnectionId(null)
    setSelectedSymbol(null)
  }

  const handleConnectionSelect = (connectionId: string | null) => {
    setSelectedConnectionId(connectionId)
    // Keep symbol filter when drilling down
  }

  const handleSymbolChange = (symbol: string | null) => {
    setSelectedSymbol(symbol)
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Crypto Transactions",
        description: "View historical transactions across exchanges and wallets",
        icon: Coins,
      }}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
          </TabsList>
          
          {selectedConnectionId && transactions.length > 0 && (
            <AssetFilter
              availableSymbols={availableSymbols}
              selectedSymbol={selectedSymbol}
              onSymbolChange={handleSymbolChange}
            />
          )}
        </div>

        <TabsContent value="exchanges" className="space-y-6">
          {!selectedConnectionId ? (
            <ConnectionList
              sourceType="exchange"
              onConnectionSelect={handleConnectionSelect}
              selectedConnectionId={selectedConnectionId}
            />
          ) : (
            <>
              <ConnectionList
                sourceType="exchange"
                onConnectionSelect={handleConnectionSelect}
                selectedConnectionId={selectedConnectionId}
              />
              <TransactionList transactions={transactions} loading={loading} />
            </>
          )}
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          {!selectedConnectionId ? (
            <ConnectionList
              sourceType="wallet"
              onConnectionSelect={handleConnectionSelect}
              selectedConnectionId={selectedConnectionId}
            />
          ) : (
            <>
              <ConnectionList
                sourceType="wallet"
                onConnectionSelect={handleConnectionSelect}
                selectedConnectionId={selectedConnectionId}
              />
              <TransactionList transactions={transactions} loading={loading} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  )
}
