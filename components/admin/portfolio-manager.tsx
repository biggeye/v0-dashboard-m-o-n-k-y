"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import useSWR from "swr"

interface Holding {
  id: string
  symbol: string
  quantity: number
  averageBuyPrice: number
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PortfolioManager() {
  const { data, mutate } = useSWR("/api/v1/portfolio/holdings", fetcher, {
    refreshInterval: 30000,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    symbol: "",
    quantity: "",
    averageBuyPrice: "",
  })

  const holdings: Holding[] = data?.data || []

  const handleAddHolding = async () => {
    if (!formData.symbol || !formData.quantity || !formData.averageBuyPrice) {
      return
    }

    try {
      const response = await fetch("/api/v1/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: formData.symbol.toUpperCase(),
          quantity: Number.parseFloat(formData.quantity),
          averageBuyPrice: Number.parseFloat(formData.averageBuyPrice),
        }),
      })

      if (response.ok) {
        setFormData({ symbol: "", quantity: "", averageBuyPrice: "" })
        setIsOpen(false)
        mutate()
      }
    } catch (error) {
      console.error("Error adding holding:", error)
    }
  }

  const handleDeleteHolding = async (id: string) => {
    try {
      await fetch(`/api/v1/portfolio/holdings/${id}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("Error deleting holding:", error)
    }
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.averageBuyPrice, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Portfolio Holdings</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0.5"
                  step="0.0001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="price">Average Buy Price</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="45000"
                  step="0.01"
                  value={formData.averageBuyPrice}
                  onChange={(e) => setFormData({ ...formData, averageBuyPrice: e.target.value })}
                />
              </div>
              <Button onClick={handleAddHolding} className="w-full">
                Add Holding
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Holdings</p>
              <p className="text-2xl font-bold">{holdings.length}</p>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Symbol</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Avg Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell className="font-semibold">{holding.symbol}</TableCell>
                    <TableCell>{holding.quantity.toFixed(4)}</TableCell>
                    <TableCell>${holding.averageBuyPrice.toFixed(2)}</TableCell>
                    <TableCell>${(holding.quantity * holding.averageBuyPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteHolding(holding.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {holdings.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No holdings yet. Add your first holding to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
