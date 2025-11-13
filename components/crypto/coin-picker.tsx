"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CoinPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const COINS = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "USDC", name: "USDC" },
    { symbol: "USDT", name: "USDT" },
    { symbol: "MATIC", name: "Polygon" },
    { symbol: "ARB", name: "Arbitrum" },
    { symbol: "OP", name: "Optimism" },
    { symbol: "ADA", name: "Cardano" },
  ]

  return (
    <div>
      <Select value={value} onValueChange={(v) => onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select coin" />
        </SelectTrigger>
        <SelectContent>
          {COINS.map((c) => (
            <SelectItem key={c.symbol} value={c.symbol}>
              {c.symbol} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
