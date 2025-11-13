"use client"

import { useState } from "react"
import DashboardPageLayout from "@/components/dashboard/layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp } from "lucide-react"
import { OrderEntry } from "@/components/trading/order-entry"
import { OrderBook } from "@/components/trading/order-book"
import { OpenOrders } from "@/components/trading/open-orders"
import { TradeHistory } from "@/components/trading/trade-history"
import { PriceChart } from "@/components/crypto/price-chart"
import { PriceTicker } from "@/components/crypto/price-ticker"
import { ExchangeConnections } from "@/components/trading/exchange-connections"
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button"
import { WalletPortfolio } from "@/components/wallet/wallet-portfolio"
import { useChartVisualization } from "@/lib/contexts/chart-visualization-context"

export default function TradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC")
  const [watchlist] = useState(["BTC", "ETH", "SOL", "ADA"])
  const { getOverlaysForSymbol } = useChartVisualization()
  const overlays = getOverlaysForSymbol(selectedSymbol)

  return (
    <DashboardPageLayout
      header={{
        title: "Trading Terminal",
        description: "Execute trades across exchanges and DeFi",
        icon: TrendingUp,
      }}
    >
      {/* Top Bar: Exchange Connections & Wallet */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <ExchangeConnections />
        <WalletConnectButton />
      </div>

      {/* Main Trading Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Price Chart */}
        <div className="lg:col-span-8 space-y-4">
          <PriceChart symbol={selectedSymbol} overlays={overlays} />

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
              <OpenOrders />
            </TabsContent>
            <TabsContent value="history">
              <TradeHistory />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Order Entry & Market Data */}
        <div className="lg:col-span-4 space-y-4">
          <PriceTicker symbols={watchlist} />
          <OrderEntry selectedSymbol={selectedSymbol} />
          <WalletPortfolio />
        </div>
      </div>

      {/* Order Book */}
      <OrderBook symbol={selectedSymbol} />
    </DashboardPageLayout>
  )
}
