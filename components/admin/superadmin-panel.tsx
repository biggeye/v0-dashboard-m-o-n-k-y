"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus, Mail, Shield, User, Crown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface User {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
}

interface SuperAdminPanelProps {
  users: User[]
}

export function SuperAdminPanel({ users: initialUsers }: SuperAdminPanelProps) {
  const [users, setUsers] = useState(initialUsers)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      alert("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          message: inviteMessage,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`Invitation sent successfully to ${inviteEmail}`)
        setInviteEmail("")
        setInviteMessage("")
        setIsInviteOpen(false)
      } else {
        alert(data.error || "Failed to send invitation")
      }
    } catch (error) {
      console.error("Invite error:", error)
      alert("Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      } else {
        alert(data.error || "Failed to update role")
      }
    } catch (error) {
      console.error("Update role error:", error)
      alert("Failed to update role")
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" />
            Super Admin
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            User
          </Badge>
        )
    }
  }

  const superadmins = users.filter((u) => u.role === "superadmin")
  const admins = users.filter((u) => u.role === "admin")
  const regularUsers = users.filter((u) => u.role === "user" || !u.role)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superadmins.length}</div>
            <p className="text-xs text-muted-foreground">Platform administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">Elevated privileges</p>
          </CardContent>
        </Card>
      </div>

      {/* Invite User */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New User</CardTitle>
          <CardDescription>Send an invitation email to create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to allow a new user to create an account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="message">Optional Message</Label>
                  <Input
                    id="message"
                    placeholder="Welcome to the platform!"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>
                <Button onClick={handleInviteUser} disabled={isLoading} className="w-full">
                  {isLoading ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email || "No email"}</TableCell>
                  <TableCell>{user.full_name || "—"}</TableCell>
                  <TableCell>{getRoleBadge(user.role || "user")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.role !== "superadmin" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(user.id, "admin")}
                            disabled={user.role === "admin"}
                          >
                            Make Admin
                          </Button>
                          {user.role === "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateRole(user.id, "user")}
                            >
                              Remove Admin
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

