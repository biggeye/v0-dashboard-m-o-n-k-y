"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import MonkeyIcon from "@/components/icons/monkey"
import MobileNotifications from "@/components/dashboard/notifications/mobile-notifications"
import BellIcon from "@/components/icons/bell"

export function MobileHeader() {
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    // Fetch notification count
    async function fetchNotificationCount() {
      try {
        const response = await fetch("/api/dashboard/notifications")
        const data = await response.json()

        if (data.data) {
          const unread = data.data.filter((n: any) => !n.read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error("[v0] Error fetching notification count:", error)
      }
    }

    fetchNotificationCount()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="lg:hidden h-header-mobile sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Sidebar Menu */}
        <SidebarTrigger />

        {/* Center: Monkey Logo + Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-primary rounded flex items-center justify-center">
              <MonkeyIcon className="size-6 text-primary-foreground" />
            </div>
          </div>
        </div>

        <Sheet>
          {/* Right: Notifications Menu */}
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="relative">
              {unreadCount > 0 && (
                <Badge className="absolute border-2 border-background -top-1 -left-2 h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
              <BellIcon className="size-4" />
            </Button>
          </SheetTrigger>

          {/* Notifications Sheet */}
          <SheetContent closeButton={false} side="right" className="w-[80%] max-w-md p-0">
            <MobileNotifications />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
