"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useAssets } from "@/lib/web3/assets"
import { Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AssetSelectorProps {
  selectedSymbol?: string
  onSymbolChange: (symbol: string) => void
  showAddButton?: boolean
}

export function AssetSelector({ 
  selectedSymbol, 
  onSymbolChange, 
  showAddButton = true 
}: AssetSelectorProps) {
  const { assets, isLoading, refreshAssets } = useAssets()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tokenId, setTokenId] = useState("")
  const [isActivating, setIsActivating] = useState(false)

  const handleActivateAsset = async () => {
    if (!tokenId) return

    setIsActivating(true)
    try {
      const response = await fetch("/api/v1/assets/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      })

      if (!response.ok) {
        throw new Error("Failed to activate asset")
      }

      await refreshAssets()
      setIsDialogOpen(false)
      setTokenId("")
    } catch (error) {
      console.error("[v0] Error activating asset:", error)
      alert("Failed to activate asset")
    } finally {
      setIsActivating(false)
    }
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading assets..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedSymbol} onValueChange={onSymbolChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select asset" />
        </SelectTrigger>
        <SelectContent>
          {assets.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No assets selected</div>
          ) : (
            assets.map((asset) => (
              <SelectItem key={asset.tokenId} value={asset.token.symbol}>
                {asset.token.symbol} - {asset.token.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {showAddButton && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activate Asset</DialogTitle>
              <DialogDescription>
                Enter a token ID to activate for tracking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tokenId">Token ID</Label>
                <Input
                  id="tokenId"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="Enter token UUID"
                />
              </div>
              <Button 
                onClick={handleActivateAsset} 
                disabled={!tokenId || isActivating}
                className="w-full"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  "Activate Asset"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

