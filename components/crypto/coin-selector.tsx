"use client"

import { useState } from "react"
import CoinPicker from "@/components/crypto/coin-picker"
import DashboardChart from "@/components/dashboard/chart"

export default function CoinSelector() {
  const [selectedCoin, setSelectedCoin] = useState("BTC")

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <div className="w-40">
          <CoinPicker value={selectedCoin} onChange={setSelectedCoin} />
        </div>
      </div>
      <div className="mb-6">
        <DashboardChart symbol={selectedCoin} />
      </div>
    </>
  )
}

