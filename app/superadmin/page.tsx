import DashboardPageLayout from "@/components/dashboard/layout"
import { Shield } from "lucide-react"
import { SuperAdminPanel } from "@/components/admin/superadmin-panel"
import { AssetActivationPanel } from "@/components/admin/asset-activation-panel"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SuperAdminPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Check if user is superadmin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "superadmin") {
    redirect("/admin")
  }

  // Fetch all users for management
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })

  return (
    <DashboardPageLayout
      header={{
        title: "Super Admin",
        description: "User management and platform administration",
        icon: Shield,
      }}
    >
      <div className="space-y-6">
        <SuperAdminPanel users={users || []} />
        <AssetActivationPanel />
      </div>
    </DashboardPageLayout>
  )
}

