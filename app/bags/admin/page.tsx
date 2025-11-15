import DashboardPageLayout from "@/components/dashboard/layout"
import { Settings } from "lucide-react"
import { AdminOverview } from "@/components/admin/admin-overview"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminPanel() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Fetch all configuration data
  const [exchanges, wallets, strategies, holdings] = await Promise.all([
    supabase
      .from("exchange_connections")
      .select("id, exchange_name, is_active, is_testnet, last_sync_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wallet_connections")
      .select("id, wallet_type, wallet_address, chain_name, is_primary, balance_usd, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trading_strategies")
      .select("id, name, symbol, is_active, is_automated, total_trades, total_pnl, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_holdings")
      .select("id, symbol, quantity, current_value, unrealized_pnl, source, source_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  return (
    <DashboardPageLayout
      header={{
        title: "Admin Dashboard",
        description: "Centralized management of exchanges, wallets, strategies, and portfolio",
        icon: Settings,
      }}
    >
      <AdminOverview
        exchanges={exchanges.data || []}
        wallets={wallets.data || []}
        strategies={strategies.data || []}
        holdings={holdings.data || []}
      />
    </DashboardPageLayout>
  )
}
