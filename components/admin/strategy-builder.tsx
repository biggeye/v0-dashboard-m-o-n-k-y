"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Play, Square, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import useSWR from "swr"
import type { ExchangeConnection } from "@/lib/types/exchange-client"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Strategy {
  id: string
  name: string
  symbol: string
  description?: string
  indicators: string[]
  isActive: boolean
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())
const AVAILABLE_INDICATORS = ["SMA", "EMA", "RSI", "MACD", "Bollinger Bands", "ATR"]

export function StrategyBuilder() {
  const { data, mutate } = useSWR("/api/v1/strategies", fetcher, {
    refreshInterval: 30000,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>([])
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    indicators: [] as string[],
    execution_mode: "manual" as "manual" | "auto_sandbox" | "auto_prod" | "disabled",
    exchange_connection_id: "",
    max_notional_per_order: "",
    max_daily_notional: "",
    allowed_symbols: "",
  })

  useEffect(() => {
    fetchExchanges()
  }, [])

  async function fetchExchanges() {
    try {
      const response = await fetch("/api/v1/exchanges/connect")
      const data = await response.json()
      if (data.data) {
        setExchanges(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching exchanges:", error)
    }
  }

  const strategies: Strategy[] = data?.data || []

  // Fetch risk limits for all strategies
  const { data: riskLimitsData } = useSWR("/api/v1/risk-limits", fetcher)
  const riskLimits = riskLimitsData?.data || []

  // Helper to get risk limit for a strategy
  const getRiskLimitForStrategy = (strategyId: string) => {
    return riskLimits.find((rl: any) => rl.strategy_id === strategyId)
  }

  // Helper to get connection for a risk limit
  const getConnectionForRiskLimit = (exchangeConnectionId: string | null) => {
    if (!exchangeConnectionId) return null
    return exchanges.find((ex) => ex.id === exchangeConnectionId)
  }

  const handleToggleIndicator = (indicator: string) => {
    setFormData((prev) => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter((i) => i !== indicator)
        : [...prev.indicators, indicator],
    }))
  }

  const handleCreateStrategy = async () => {
    if (!formData.name || !formData.symbol || formData.indicators.length === 0) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      // Create strategy first
      const strategyResponse = await fetch("/api/v1/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol.toUpperCase(),
          description: formData.description,
          indicators: formData.indicators,
        }),
      })

      if (!strategyResponse.ok) {
        const errorData = await strategyResponse.json()
        toast.error(errorData.error || "Failed to create strategy")
        return
      }

      const strategyData = await strategyResponse.json()
      const strategyId = strategyData.data?.id || strategyData.data?.[0]?.id

      // Create risk limits if execution mode is set or risk limits are provided
      if (
        strategyId &&
        (formData.execution_mode !== "manual" ||
          formData.exchange_connection_id ||
          formData.max_notional_per_order ||
          formData.max_daily_notional ||
          formData.allowed_symbols)
      ) {
        try {
          await fetch("/api/v1/risk-limits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategy_id: strategyId,
              exchange_connection_id: formData.exchange_connection_id || null,
              execution_mode: formData.execution_mode,
              max_notional_per_order: formData.max_notional_per_order || null,
              max_daily_notional: formData.max_daily_notional || null,
              allowed_symbols: formData.allowed_symbols || null,
            }),
          })
        } catch (riskError) {
          console.error("Error creating risk limits:", riskError)
          toast.error("Strategy created but risk limits failed to save")
        }
      }

      setFormData({
        name: "",
        symbol: "",
        description: "",
        indicators: [],
        execution_mode: "manual",
        exchange_connection_id: "",
        max_notional_per_order: "",
        max_daily_notional: "",
        allowed_symbols: "",
      })
      setIsOpen(false)
      mutate()
      toast.success("Strategy created successfully")
    } catch (error) {
      console.error("Error creating strategy:", error)
      toast.error("Failed to create strategy")
    }
  }

  // Filter exchanges based on execution mode
  const getAvailableExchanges = () => {
    if (formData.execution_mode === "auto_sandbox") {
      return exchanges.filter((ex) => ex.env === "sandbox" || ex.provider === "simulation")
    } else if (formData.execution_mode === "auto_prod") {
      return exchanges.filter((ex) => ex.env === "prod")
    }
    return exchanges
  }

  const handleToggleStrategy = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/v1/strategies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !active }),
      })
      mutate()
    } catch (error) {
      console.error("Error toggling strategy:", error)
    }
  }

  const handleDeleteStrategy = async (id: string) => {
    try {
      await fetch(`/api/v1/strategies/${id}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("Error deleting strategy:", error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Trading Strategies</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Trading Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  placeholder="My Moving Average Strategy"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="BTC"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief strategy description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Indicators</Label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_INDICATORS.map((indicator) => (
                    <div key={indicator} className="flex items-center gap-2">
                      <Checkbox
                        id={indicator}
                        checked={formData.indicators.includes(indicator)}
                        onCheckedChange={() => handleToggleIndicator(indicator)}
                      />
                      <label htmlFor={indicator} className="text-sm cursor-pointer">
                        {indicator}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="execution_mode">Execution Mode</Label>
                <Select
                  value={formData.execution_mode}
                  onValueChange={(value: "manual" | "auto_sandbox" | "auto_prod" | "disabled") =>
                    setFormData({ ...formData, execution_mode: value, exchange_connection_id: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto_sandbox">Auto (Sandbox)</SelectItem>
                    <SelectItem value="auto_prod">Auto (Production)</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.execution_mode !== "manual" && formData.execution_mode !== "disabled" && (
                <div>
                  <Label htmlFor="exchange_connection">Exchange Connection</Label>
                  <Select
                    value={formData.exchange_connection_id}
                    onValueChange={(value) => setFormData({ ...formData, exchange_connection_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exchange connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableExchanges().length > 0 ? (
                        getAvailableExchanges().map((exchange) => {
                          const connectionName =
                            exchange.displayName || exchange.exchangeKey || exchange.exchange_name?.replace("_", " ") || "Unknown"
                          return (
                            <SelectItem key={exchange.id} value={exchange.id}>
                              {connectionName} ({exchange.env === "prod" ? "PROD" : "SANDBOX"})
                            </SelectItem>
                          )
                        })
                      ) : (
                        <SelectItem value="none" disabled>
                          No compatible exchanges available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-semibold">Risk Limits</Label>

                <div>
                  <Label htmlFor="max_notional_per_order">Max Notional Per Order</Label>
                  <Input
                    id="max_notional_per_order"
                    type="number"
                    placeholder="1000"
                    value={formData.max_notional_per_order}
                    onChange={(e) => setFormData({ ...formData, max_notional_per_order: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="max_daily_notional">Max Daily Notional</Label>
                  <Input
                    id="max_daily_notional"
                    type="number"
                    placeholder="10000"
                    value={formData.max_daily_notional}
                    onChange={(e) => setFormData({ ...formData, max_daily_notional: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="allowed_symbols">Allowed Symbols (comma-separated)</Label>
                  <Input
                    id="allowed_symbols"
                    placeholder="BTC, ETH, SOL"
                    value={formData.allowed_symbols}
                    onChange={(e) => setFormData({ ...formData, allowed_symbols: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to allow all symbols
                  </p>
                </div>
              </div>

              <Button onClick={handleCreateStrategy} className="w-full">
                Create Strategy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Indicators</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategies.map((strategy) => {
                const riskLimit = getRiskLimitForStrategy(strategy.id)
                const connection = riskLimit ? getConnectionForRiskLimit(riskLimit.exchange_connection_id) : null
                const executionMode = riskLimit?.execution_mode || "manual"
                const isAgentDriven = executionMode === "auto_sandbox" || executionMode === "auto_prod"
                const riskEngineReady = !!riskLimit

                return (
                  <TableRow key={strategy.id}>
                    <TableCell className="font-semibold">{strategy.name}</TableCell>
                    <TableCell>{strategy.symbol}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {strategy.indicators.map((ind) => (
                          <Badge key={ind} variant="secondary" className="text-xs">
                            {ind}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={strategy.isActive ? "default" : "outline"}>
                        {strategy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={isAgentDriven ? "default" : "secondary"} className="text-xs">
                            {executionMode === "auto_sandbox" && "Auto (Sandbox)"}
                            {executionMode === "auto_prod" && "Auto (Prod)"}
                            {executionMode === "manual" && "Manual"}
                            {executionMode === "disabled" && "Disabled"}
                          </Badge>
                          {connection && (
                            <Badge
                              variant={connection.env === "prod" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {connection.env === "prod" ? "PROD" : "SANDBOX"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {riskEngineReady ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span>Risk engine ready</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-yellow-600" />
                              <span>No risk limits</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleStrategy(strategy.id, strategy.isActive)}
                        >
                          {strategy.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteStrategy(strategy.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {strategies.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No strategies yet. Create your first strategy to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
