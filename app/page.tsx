"use client"

import { useEffect, useState } from "react"
import DashboardPageLayout from "@/components/dashboard/layout"
import DashboardStat from "@/components/dashboard/stat"
import DashboardChart from "@/components/dashboard/chart"
import CoinPicker from "@/components/crypto/coin-picker"
import BracketsIcon from "@/components/icons/brackets"
import GearIcon from "@/components/icons/gear"
import ProcessorIcon from "@/components/icons/proccesor"
import BoomIcon from "@/components/icons/boom"
import type { DashboardStat as DashboardStatType } from "@/types/dashboard"

const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
}

export default function DashboardOverview() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStatType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCoin, setSelectedCoin] = useState<string>("BTC")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const response = await fetch("/api/dashboard/stats")
      const data = await response.json()

      if (data.data) {
        setDashboardStats(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardPageLayout
        header={{
          title: "Overview",
          description: "Loading...",
          icon: BracketsIcon,
        }}
      >
        <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>
      </DashboardPageLayout>
    )
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Overview",
        description: "Last updated " + new Date().toLocaleTimeString(),
        icon: BracketsIcon,
      }}
    >
      <div className="flex items-center justify-end mb-4">
        <div className="w-40">
          <CoinPicker value={selectedCoin} onChange={setSelectedCoin} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={iconMap[stat.icon as keyof typeof iconMap]}
            tag={stat.tag}
            intent={stat.intent}
            direction={stat.direction}
          />
        ))}
      </div>

      <div className="mb-6">
        <DashboardChart symbol={selectedCoin} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-6 rounded-lg border bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-4">Portfolio Holdings</h3>
          <p className="text-muted-foreground">Connect exchanges or wallets to view holdings</p>
        </div>
        <div className="p-6 rounded-lg border bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-4">Active Strategies</h3>
          <p className="text-muted-foreground">Create trading strategies to automate your trading</p>
        </div>
      </div>
    </DashboardPageLayout>
  )
}
