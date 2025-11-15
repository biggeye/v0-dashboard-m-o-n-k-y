"use client"

import { useState } from "react"
import DashboardPageLayout from "@/components/dashboard/layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MessageSquare, X } from "lucide-react"
import { OrderEntry } from "@/components/trading/order-entry"
import { OrderBook } from "@/components/trading/order-book"
import { OpenOrders } from "@/components/trading/open-orders"
import { TradeHistory } from "@/components/trading/trade-history"
import { PriceChart } from "@/components/crypto/price-chart"
import { PriceTicker } from "@/components/crypto/price-ticker"
import { IndicatorDisplay } from "@/components/crypto/indicator-display"
import { ExchangeConnections } from "@/components/trading/exchange-connections"
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button"
import { WalletPortfolio } from "@/components/wallet/wallet-portfolio"
import { AgentChat } from "@/components/llm/agent-chat"
import { useChartVisualization } from "@/lib/visualization"
import { usePriceHistory, useCryptoPrices, usePortfolioValue } from "@/lib/hooks/use-price-data"
import type { Timeframe } from "@/lib/utils/timeframe"

export default function TradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC")
  const [watchlist, setWatchlist] = useState(["BTC", "ETH", "SOL", "ADA"])
  const [symbolInput, setSymbolInput] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1h")
  const [showAgentChat, setShowAgentChat] = useState(false)
  const [chatViewMode, setChatViewMode] = useState<"sidebar" | "fullscreen">("sidebar")
  
  const { getOverlaysForSymbol } = useChartVisualization()
  const overlays = getOverlaysForSymbol(selectedSymbol)

  // Use hooks for data fetching
  const { history: priceHistory, isLoading: isLoadingHistory } = usePriceHistory(selectedSymbol, selectedTimeframe)
  const { prices: watchlistPrices, isLoading: isLoadingWatchlist } = useCryptoPrices(watchlist)
  const { value: portfolioValue, isLoading: isLoadingPortfolio } = usePortfolioValue()

  // Extract numeric prices from price history for indicators
  const priceArray = priceHistory
    ? priceHistory
        .map((p: any) => p.price)
        .filter((p: any) => typeof p === "number" && !isNaN(p))
    : []

  const handleOrderPlaced = () => {
    // Refresh orders and history when a new order is placed
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddSymbol = (symbol: string) => {
    const upper = symbol.toUpperCase()
    if (!watchlist.includes(upper) && symbol.trim()) {
      setWatchlist([...watchlist, upper])
    }
  }

  const handleAddFromInput = () => {
    handleAddSymbol(symbolInput)
    setSymbolInput("")
  }

  const handleRemoveFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter((s) => s !== symbol))
  }

  const TIMEFRAMES: { value: Timeframe; label: string }[] = [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "30m", label: "30m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
    { value: "1w", label: "1w" },
    { value: "1mo", label: "1mo" },
  ]

  return (
    <DashboardPageLayout
      header={{
        title: "Trading Terminal",
        description: "Execute trades and analyze markets across exchanges and DeFi",
        icon: TrendingUp,
      }}
    >
      {/* Top Bar: Exchange Connections, Wallet & Portfolio Summary */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <ExchangeConnections />
          <WalletConnectButton />
        </div>
        <div className="flex items-center gap-4">
          {!isLoadingPortfolio && (
            <Card className="px-4 py-2">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Portfolio Value: </span>
                  <span className="font-semibold">${portfolioValue.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">PnL: </span>
                  <span className={`font-semibold ${portfolioValue.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {portfolioValue.totalPnL >= 0 ? "+" : ""}${portfolioValue.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({portfolioValue.totalPnLPercent >= 0 ? "+" : ""}{portfolioValue.totalPnLPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </Card>
          )}
          <Button
            variant={showAgentChat ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAgentChat(!showAgentChat)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
        </div>
      </div>

      {/* Main Trading Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Price Chart & Orders */}
        <div className="lg:col-span-8 space-y-4">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant={selectedTimeframe === tf.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className="h-8 px-2 text-xs"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>

          <PriceChart symbol={selectedSymbol} overlays={overlays} defaultTimeframe={selectedTimeframe} />

          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="orders" className="flex-1">
                Open Orders
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                Trade History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="orders">
              <OpenOrders key={`orders-${refreshKey}`} />
            </TabsContent>
            <TabsContent value="history">
              <TradeHistory key={`history-${refreshKey}`} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Order Entry, Watchlist & Market Data */}
        <div className="lg:col-span-4 space-y-4">
          <PriceTicker symbols={watchlist} />

          {/* Watchlist Management */}
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Watchlist</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div>
                <label className="text-sm font-medium">Add Symbol</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="BTC"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddFromInput()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddFromInput}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Watchlist Items */}
              {watchlist.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Active Symbols</label>
                  <div className="flex flex-wrap gap-2">
                    {watchlist.map((sym) => (
                      <div key={sym} className="flex items-center gap-1">
                        <Button
                          variant={selectedSymbol === sym ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSymbol(sym)}
                          className="h-7 px-2 text-xs"
                        >
                          {sym}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromWatchlist(sym)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  {["BTC", "ETH", "SOL", "ADA", "DOGE"].map((sym) => (
                    <Button
                      key={sym}
                      variant={selectedSymbol === sym ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedSymbol(sym)
                        if (!watchlist.includes(sym)) {
                          handleAddSymbol(sym)
                        }
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      {sym}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <OrderEntry 
            selectedSymbol={selectedSymbol}
            onOrderPlaced={handleOrderPlaced}
          />
          <WalletPortfolio />
        </div>
      </div>

      {/* Order Book */}
      <OrderBook symbol={selectedSymbol} />

      {/* Technical Indicators */}
      <div className="mt-6">
        <IndicatorDisplay 
          prices={priceArray} 
          symbol={selectedSymbol}
        />
      </div>

      {/* AI Assistant Chat - Collapsible Sidebar / Fullscreen */}
      {showAgentChat && (
        <div className={`fixed right-4 bottom-4 z-50 shadow-2xl rounded-lg overflow-hidden ${
          chatViewMode === "fullscreen" 
            ? "inset-0 w-full h-full" 
            : "w-96 h-[600px]"
        }`}>
          <div className="relative h-full">
            <AgentChat
              viewMode={chatViewMode}
              onViewModeChange={setChatViewMode}
              onClose={() => setShowAgentChat(false)}
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
            />
          </div>
        </div>
      )}
    </DashboardPageLayout>
  )
}
