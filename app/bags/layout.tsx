
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { MobileHeader } from "@/components/dashboard/mobile-header"
import Widget from "@/components/dashboard/widget"
import Notifications from "@/components/dashboard/notifications"
import Chat from "@/components/chat"
import { MobileChat } from "@/components/chat/mobile-chat"
import { WalletProvider } from "@/lib/web3/wallet-provider"
import { AssetProvider } from "@/lib/web3/assets"
import { ChartVisualizationProvider } from "@/lib/visualization"
import { V0Provider } from "@/lib/v0-context"

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false

export default async function BagsLayout({
  children,
}: {
  children: React.ReactNode
}) {


  return (
    <V0Provider isV0={isV0}>
      <WalletProvider>
        <AssetProvider>
          <ChartVisualizationProvider>
          <SidebarProvider>
            {/* Mobile Header - only visible on mobile */}
            <MobileHeader />

            {/* Desktop Layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gap lg:px-sides">
              <div className="hidden lg:block col-span-2 top-0 relative">
                <DashboardSidebar />
              </div>
              <div className="col-span-1 lg:col-span-7">{children}</div>
              <div className="col-span-3 hidden lg:block">
                <div className="space-y-gap py-sides min-h-screen max-h-screen sticky top-0 overflow-clip">
                  <Widget />
                  <Notifications />
                  <Chat />
                </div>
              </div>
            </div>

            {/* Mobile Chat - floating CTA with drawer */}
            <MobileChat />
          </SidebarProvider>
          </ChartVisualizationProvider>
        </AssetProvider>
      </WalletProvider>
    </V0Provider>
  )
}

