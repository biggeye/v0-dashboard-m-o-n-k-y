"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface AssetFilterProps {
  availableSymbols: string[]
  selectedSymbol: string | null
  onSymbolChange: (symbol: string | null) => void
}

export function AssetFilter({ availableSymbols, selectedSymbol, onSymbolChange }: AssetFilterProps) {
  if (availableSymbols.length === 0) {
    return null
  }

  // Sort symbols alphabetically
  const sortedSymbols = [...availableSymbols].sort()

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="asset-filter" className="text-sm font-medium whitespace-nowrap">
        Filter by Asset:
      </Label>
      <Select
        value={selectedSymbol || "all"}
        onValueChange={(value) => onSymbolChange(value === "all" ? null : value)}
      >
        <SelectTrigger id="asset-filter" className="w-[180px]">
          <SelectValue placeholder="All Assets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assets</SelectItem>
          {sortedSymbols.map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

