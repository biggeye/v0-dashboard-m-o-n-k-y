"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Play, Square } from "lucide-react"
import useSWR from "swr"

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
  const { data, mutate } = useSWR("/api/strategies", fetcher, {
    refreshInterval: 30000,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    indicators: [] as string[],
  })

  const strategies: Strategy[] = data?.data || []

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
      return
    }

    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol.toUpperCase(),
          description: formData.description,
          indicators: formData.indicators,
        }),
      })

      if (response.ok) {
        setFormData({
          name: "",
          symbol: "",
          description: "",
          indicators: [],
        })
        setIsOpen(false)
        mutate()
      }
    } catch (error) {
      console.error("Error creating strategy:", error)
    }
  }

  const handleToggleStrategy = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/strategies/${id}`, {
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
      await fetch(`/api/strategies/${id}`, { method: "DELETE" })
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategies.map((strategy) => (
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
              ))}
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
