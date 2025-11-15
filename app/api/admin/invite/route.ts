import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { email, message } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    // Generate invitation link using Supabase Auth
    // Note: In production, you'd want to use Supabase's built-in invitation system
    // or create a custom invitation token system
    const redirectUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "http://localhost:3000"
    const inviteUrl = `${redirectUrl}/auth/signup?email=${encodeURIComponent(email)}`

    // Use Supabase Admin API to send invitation
    // Note: This requires the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Service role key not configured" },
        { status: 500 },
      )
    }

    // Create admin client for invitation
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Send invitation email via Supabase Auth
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${redirectUrl}/api/auth/login`,
        data: {
          invite_message: message || "You've been invited to join the platform!",
        },
      },
    )

    if (inviteError) {
      console.error("[v0] Invitation error:", inviteError)
      return NextResponse.json(
        { error: inviteError.message || "Failed to send invitation" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        email,
        inviteUrl,
        userId: inviteData.user?.id,
      },
    })
  } catch (error) {
    console.error("[v0] Invite user error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}

