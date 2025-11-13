"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bullet } from "@/components/ui/bullet"
import NotificationItem from "./notification-item"
import type { Notification } from "@/types/dashboard"
import { AnimatePresence, motion } from "framer-motion"

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/dashboard/notifications")
      const data = await response.json()

      if (data.data) {
        setNotifications(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayedNotifications = showAll ? notifications : notifications.slice(0, 3)

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between pl-3 pr-1">
        <CardTitle className="flex items-center gap-2.5 text-sm font-medium uppercase">
          {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : <Bullet />}
          Notifications
        </CardTitle>
        {notifications.length > 0 && (
          <Button className="opacity-50 hover:opacity-100 uppercase" size="sm" variant="ghost" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </CardHeader>

      <CardContent className="bg-accent p-1.5 overflow-hidden">
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {displayedNotifications.map((notification) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  key={notification.id}
                >
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                </motion.div>
              ))}

              {notifications.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              )}

              {notifications.length > 3 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full"
                >
                  <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
                    {showAll ? "Show Less" : `Show All (${notifications.length})`}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
