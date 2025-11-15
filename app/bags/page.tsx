import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DashboardPageLayout from "@/components/dashboard/layout"
import DashboardStat from "@/components/dashboard/stat"
import CoinSelector from "@/components/crypto/coin-selector"
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

export default async function BagsDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch dashboard data
  const [statsResponse, holdingsResponse, strategiesResponse] = await Promise.all([
    supabase.from("dashboard_stats").select("*").eq("user_id", user.id),
    supabase.from("portfolio_holdings").select("*").eq("user_id", user.id),
    supabase.from("trading_strategies").select("*").eq("user_id", user.id).eq("is_active", true),
  ])

  // Transform stats data
  const dashboardStats: DashboardStatType[] = statsResponse.data?.map((stat) => ({
    label: stat.stat_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    value: stat.value.toString(),
    description: stat.change_percentage
      ? `${stat.change_percentage >= 0 ? "+" : ""}${stat.change_percentage.toFixed(2)}%`
      : undefined,
    icon: "gear" as const,
    tag: stat.period,
    intent: stat.change_percentage && stat.change_percentage >= 0 ? "positive" : "negative",
    direction: stat.change_percentage && stat.change_percentage >= 0 ? "up" : "down",
  })) || []

  // Default stats if none exist
  if (dashboardStats.length === 0) {
    dashboardStats.push(
      {
        label: "Total Portfolio Value",
        value: "$0.00",
        description: "Connect exchanges or wallets",
        icon: "gear",
        tag: "current",
        intent: "neutral",
      },
      {
        label: "Active Strategies",
        value: (strategiesResponse.data?.length || 0).toString(),
        description: "Trading strategies",
        icon: "proccesor",
        tag: "active",
        intent: "positive",
        direction: "up",
      },
      {
        label: "Holdings",
        value: (holdingsResponse.data?.length || 0).toString(),
        description: "Portfolio positions",
        icon: "boom",
        tag: "positions",
        intent: "neutral",
      },
    )
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Bagman",
          description: "Welcome back!  Time to collect.",
          icon: BracketsIcon,
      }}
    >
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

      <CoinSelector />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-6 rounded-lg border bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-4">Portfolio Holdings</h3>
          <p className="text-muted-foreground mb-4">
            {holdingsResponse.data?.length || 0} holdings tracked
          </p>
          <a
            href="/bags/admin"
            className="text-primary hover:underline text-sm font-medium"
          >
            Manage Holdings →
          </a>
        </div>
        <div className="p-6 rounded-lg border bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-4">Active Strategies</h3>
          <p className="text-muted-foreground mb-4">
            {strategiesResponse.data?.length || 0} active trading strategies
          </p>
          <a
            href="/bags/admin"
            className="text-primary hover:underline text-sm font-medium"
          >
            Manage Strategies →
          </a>
        </div>
      </div>
    </DashboardPageLayout>
  )
}

