"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        router.push("/auth/login")
        router.refresh()
      }
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  )
}

