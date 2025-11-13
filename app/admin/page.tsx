"use client"

import DashboardPageLayout from "@/components/dashboard/layout"
import { PortfolioManager } from "@/components/admin/portfolio-manager"
import { StrategyBuilder } from "@/components/admin/strategy-builder"
import { Briefcase } from "lucide-react"

export default function AdminPanel() {
  return (
    <DashboardPageLayout
      header={{
        title: "Portfolio & Strategy Management",
        description: "Manage your crypto holdings and create trading strategies",
        icon: Briefcase,
      }}
    >
      <div className="space-y-6">
        <PortfolioManager />
        <StrategyBuilder />
      </div>
    </DashboardPageLayout>
  )
}
